/**
 * 🆕 v117: 데일리 일기 cron — 매일 자정 KST 호출.
 *
 * Vercel cron 설정 (vercel.json):
 *   { "path": "/api/cron/daily-log", "schedule": "0 15 * * *" }  // UTC 15:00 = KST 00:00
 *
 * 동작:
 *   1. 최근 24시간 내 채팅 활동이 있는 유저 조회 (counseling_sessions.last_message_at)
 *   2. 각 유저별로 오늘 대화 발췌 → Gemini Flash-Lite 로 1줄 일기 생성
 *   3. relationship_daily_logs 에 upsert (이미 오늘자 있으면 skip)
 *
 * 보호:
 *   - CRON_SECRET header 검증 (외부 호출 방지)
 *   - 유저당 1일 1개만 (UNIQUE 제약)
 *   - 실패해도 다른 유저 처리 계속
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { synthesizeDailyLog } from '@/lib/ai/daily-log-synthesizer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5분 — 유저 많을 때 안전망

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 개발 환경 — 시크릿 미설정이면 통과
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

interface ActiveUser {
  user_id: string;
  last_session_id: string;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // service-role 클라이언트 (RLS bypass — cron 작업)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date();
  const todayKst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // KST
  const today = todayKst.toISOString().slice(0, 10); // YYYY-MM-DD
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 1. 최근 24시간 활동 유저 + 가장 최근 세션 조회
  const { data: sessions, error: sessErr } = await supabase
    .from('counseling_sessions')
    .select('id, user_id, last_message_at')
    .gte('last_message_at', since)
    .order('last_message_at', { ascending: false })
    .limit(500); // 안전망

  if (sessErr) {
    return NextResponse.json({ error: sessErr.message }, { status: 500 });
  }

  // 유저별 가장 최근 세션 1개로 줄이기
  const byUser = new Map<string, ActiveUser>();
  for (const s of sessions ?? []) {
    if (!s.user_id) continue;
    if (!byUser.has(s.user_id)) {
      byUser.set(s.user_id, { user_id: s.user_id, last_session_id: s.id });
    }
  }

  const results: Array<{ user_id: string; status: 'created' | 'skipped' | 'failed'; reason?: string }> = [];

  // 2. 각 유저 처리 (병렬 X — gemini rate 안전)
  for (const u of byUser.values()) {
    try {
      // 이미 오늘자 일기 있으면 skip
      const { data: existing } = await supabase
        .from('relationship_daily_logs')
        .select('id')
        .eq('user_id', u.user_id)
        .eq('persona', 'luna')
        .eq('log_date', today)
        .maybeSingle();

      if (existing) {
        results.push({ user_id: u.user_id, status: 'skipped', reason: 'already_logged' });
        continue;
      }

      // 오늘 대화 발췌 — 최근 세션의 메시지 마지막 20개
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('session_id', u.last_session_id)
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(40);

      if (!msgs || msgs.length === 0) {
        results.push({ user_id: u.user_id, status: 'skipped', reason: 'no_messages' });
        continue;
      }

      const turns = msgs
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: String(m.content ?? ''),
        }));

      const synthesized = await synthesizeDailyLog({ turns });

      const { error: insErr } = await supabase
        .from('relationship_daily_logs')
        .insert({
          user_id: u.user_id,
          persona: 'luna',
          log_date: today,
          content: synthesized.content,
        });

      if (insErr) {
        results.push({ user_id: u.user_id, status: 'failed', reason: insErr.message });
      } else {
        results.push({ user_id: u.user_id, status: 'created' });
      }
    } catch (e) {
      results.push({
        user_id: u.user_id,
        status: 'failed',
        reason: (e as Error).message,
      });
    }
  }

  const created = results.filter(r => r.status === 'created').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log(`[Cron:DailyLog] ✅ created=${created} skipped=${skipped} failed=${failed}`);

  return NextResponse.json({
    ok: true,
    date: today,
    total: results.length,
    created,
    skipped,
    failed,
    results: results.slice(0, 50), // 처음 50개만 응답 (로그용)
  });
}
