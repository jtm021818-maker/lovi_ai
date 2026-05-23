/**
 * v115.7: 별명 관리 API.
 *
 * GET    /api/relationship/nicknames
 *   응답: {
 *     gate: { allowProposal, reason, diagnostics },
 *     active: NicknameRecord[]   // candidate/trying/accepted
 *     rejected: string[]          // 봉인 목록
 *   }
 *
 * POST   /api/relationship/nicknames
 *   body:  { action: 'reject' | 'restore', nickname: string }
 *   reject: 활성 별명을 영구 봉인
 *   restore: 봉인된 별명을 다시 candidate 로 (실수로 거부한 경우)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loadNicknameSnapshot, rejectNickname } from '@/engines/relationship/nickname-state';
import { evaluateNicknameGate } from '@/engines/relationship/nickname-gate';
import { applyDecay, createDefaultIntimacyState, type IntimacyState } from '@/engines/intimacy';

function extractLunaIntimacy(userModel: any): IntimacyState {
  if (!userModel || typeof userModel !== 'object') return createDefaultIntimacyState();
  const intimacy = (userModel as any).intimacy;
  if (intimacy && typeof intimacy === 'object') {
    if ('luna' in intimacy && intimacy.luna) return intimacy.luna as IntimacyState;
    if ('dimensions' in intimacy) return intimacy as IntimacyState;
  }
  return createDefaultIntimacyState();
}

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snap = await loadNicknameSnapshot(supabase, user.id);

    // intimacy 상태 조회 — user_profiles.user_model 에서 추출 + 감쇠 적용
    let intimacyState: IntimacyState = createDefaultIntimacyState();
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_model')
        .eq('id', user.id)
        .maybeSingle();
      const raw = extractLunaIntimacy(profile?.user_model);
      intimacyState = applyDecay(raw).state;
    } catch {
      /* graceful — default state */
    }

    const gate = await evaluateNicknameGate({
      supabase,
      userId: user.id,
      intimacyState,
      currentPhase: 'BANTER', // UI 조회는 phase 무관 — 일상 톤으로 평가
      activeNicknameCount: snap.activeCount,
    });

    return NextResponse.json({
      gate: {
        allowProposal: gate.allowProposal,
        reason: gate.reason,
        diagnostics: gate.diagnostics,
      },
      active: snap.history,
      rejected: snap.rejectedNames,
    });
  } catch (e) {
    return NextResponse.json({
      gate: { allowProposal: false, reason: 'load error', diagnostics: {} },
      active: [],
      rejected: [],
      error: (e as Error).message,
    });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const action = body?.action as 'reject' | 'restore';
    const nickname = String(body?.nickname ?? '').trim();
    if (!nickname || nickname.length > 30) {
      return NextResponse.json({ error: 'invalid nickname' }, { status: 400 });
    }

    if (action === 'reject') {
      await rejectNickname(supabase, { userId: user.id, nickname });
      return NextResponse.json({ ok: true, action: 'reject' });
    }

    if (action === 'restore') {
      // 봉인 해제 — candidate 로 되돌리고 use_count 유지
      const { error } = await supabase
        .from('luna_nickname_state')
        .update({
          status: 'candidate',
          user_reaction: null,
          reaction_observed_at: null,
        })
        .eq('user_id', user.id)
        .eq('nickname', nickname);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: 'restore' });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
