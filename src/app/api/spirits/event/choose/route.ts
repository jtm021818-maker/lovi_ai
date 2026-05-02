/**
 * 🧚 v104: POST /api/spirits/event/choose
 *
 * 유저가 정령 카드 옵션 선택 시 호출.
 *   - spirit_event_fires.user_choice/user_input 갱신
 *   - 'archive'/'release'/'unseal' 등은 spirit_keepsakes 영구 저장
 *   - 'commit' (별똥이) 은 spirit_wishes 영구 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  updateUserChoice,
  saveKeepsake,
  commitWish,
  type KeepsakeKind,
} from '@/engines/spirits/spirit-event-repo';
import type { SpiritEventType } from '@/engines/spirits/spirit-event-types';
import type { SpiritId } from '@/types/spirit.types';

interface ChooseBody {
  sessionId?: string;
  spiritId: SpiritId;
  eventType: SpiritEventType;
  choice: string;
  input?: Record<string, unknown>;
}

const KEEPSAKE_MAP: Partial<Record<string, { kind: KeepsakeKind; spiritId: SpiritId }>> = {
  // letter_fairy
  letter_fairy_archive: { kind: 'letter', spiritId: 'letter_fairy' },
  letter_fairy_burn: { kind: 'letter', spiritId: 'letter_fairy' }, // burn 도 보관 (재 = 비활성 플래그)
  // moon_rabbit
  moon_rabbit_send_to_moon: { kind: 'confession', spiritId: 'moon_rabbit' },
  // cherry_leaf
  cherry_leaf_release: { kind: 'release', spiritId: 'cherry_leaf' },
  // queen_elena
  queen_elena_unseal: { kind: 'value', spiritId: 'queen_elena' },
  // rose_fairy
  rose_fairy_logged: { kind: 'value', spiritId: 'rose_fairy' },
};

export async function POST(req: NextRequest) {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  let body: ChooseBody;
  try {
    body = (await req.json()) as ChooseBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body.spiritId || !body.eventType || !body.choice) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const userId = user.id;

  // 1) user_choice 업데이트
  await updateUserChoice({
    userId,
    sessionId: body.sessionId ?? null,
    eventType: body.eventType,
    userChoice: body.choice,
    userInput: body.input ?? null,
  });

  // 2) Keepsake 저장 분기
  const ksKey = `${body.spiritId}_${body.choice}`;
  const ks = KEEPSAKE_MAP[ksKey];
  let keepsakeId: string | null = null;
  if (ks && body.input) {
    // body.input.body 또는 items / values 등에서 본문 추출
    const text = pickKeepsakeBody(body.input);
    if (text) {
      const saved = await saveKeepsake({
        userId,
        spiritId: ks.spiritId,
        kind: ks.kind,
        body: text,
        meta: { ...body.input, action: body.choice },
      });
      keepsakeId = saved?.id ?? null;
    }
  }

  // 3) 별똥이 commit
  let wishId: string | null = null;
  if (body.spiritId === 'star_dust' && body.choice === 'commit' && body.input) {
    const ifPhrase = String((body.input as Record<string, unknown>).ifPhrase ?? '');
    const thenPhrase = String((body.input as Record<string, unknown>).thenPhrase ?? '');
    const originalWish = String((body.input as Record<string, unknown>).originalWish ?? '');
    if (ifPhrase && thenPhrase) {
      const saved = await commitWish({
        userId,
        originalWish,
        ifPhrase,
        thenPhrase,
        triggerAt: parseTriggerFromIf(ifPhrase),
      });
      wishId = saved?.id ?? null;
    }
  }

  return NextResponse.json({ ok: true, keepsakeId, wishId });
}

function pickKeepsakeBody(input: Record<string, unknown>): string | null {
  if (typeof input.body === 'string' && input.body.trim().length > 0) return input.body.trim();
  if (Array.isArray(input.items) && (input.items as unknown[]).length > 0) {
    return (input.items as unknown[]).map((s) => String(s)).filter(Boolean).join(' / ');
  }
  if (Array.isArray(input.values) && (input.values as unknown[]).length > 0) {
    return (input.values as unknown[]).map((s) => String(s)).filter(Boolean).join(' / ');
  }
  if (typeof input.confession === 'string') return input.confession;
  return null;
}

/** if 절에서 시간 파싱 (단순 휴리스틱: "오후 N시", "내일 N시"). 실패 시 null. */
function parseTriggerFromIf(ifPhrase: string): Date | null {
  const m = ifPhrase.match(/(?:내일\s*)?(?:오전|오후|저녁|아침)?\s*(\d{1,2})\s*시/);
  if (!m) return null;
  const hour = Number(m[1]);
  if (Number.isNaN(hour) || hour > 23 || hour < 0) return null;
  const isAfternoon = /오후|저녁/.test(ifPhrase);
  const trueHour = isAfternoon && hour < 12 ? hour + 12 : hour;
  const isTomorrow = /내일/.test(ifPhrase);
  const target = new Date();
  target.setHours(trueHour, 0, 0, 0);
  if (isTomorrow || target.getTime() < Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}
