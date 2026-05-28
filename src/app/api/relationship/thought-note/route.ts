/**
 * v120 GET /api/relationship/thought-note
 *
 * 루나의 생각 노트 UI 가 호출.
 * 응답:
 *   {
 *     impression: LunaImpressionState | null,
 *     active: NicknameRecord[] (candidate + trying + accepted),
 *     rejected: string[],
 *     gate: { allowProposal, reason }
 *   }
 *
 * 인상 갱신/별명 후보 등록은 세션 종료 잡 (complete/route.ts) 이 담당.
 * 이 라우트는 read-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loadNicknameSnapshot } from '@/engines/relationship/nickname-state';
import { evaluateNicknameGate } from '@/engines/relationship/nickname-gate';
import { applyDecay, createDefaultIntimacyState, type IntimacyState } from '@/engines/intimacy';
import { EMPTY_IMPRESSION_STATE, type LunaImpressionState } from '@/engines/luna-impression/types';

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
    // 1) 별명 스냅샷 + 게이트 (기존 v115.7 인프라 재활용)
    const snap = await loadNicknameSnapshot(supabase, user.id);

    let intimacyState: IntimacyState = createDefaultIntimacyState();
    let impression: LunaImpressionState = EMPTY_IMPRESSION_STATE;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_model, luna_impression_state')
        .eq('id', user.id)
        .maybeSingle();
      intimacyState = applyDecay(extractLunaIntimacy(profile?.user_model)).state;
      if (profile?.luna_impression_state && typeof profile.luna_impression_state === 'object') {
        const raw = profile.luna_impression_state as Partial<LunaImpressionState>;
        impression = {
          impression_text: typeof raw.impression_text === 'string' ? raw.impression_text : '',
          impression_facets: Array.isArray(raw.impression_facets) ? raw.impression_facets : [],
          updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : '',
          session_count_at_update: Number(raw.session_count_at_update ?? 0),
          pondering: {
            is_pondering: !!raw.pondering?.is_pondering,
            candidates: Array.isArray(raw.pondering?.candidates) ? raw.pondering!.candidates : [],
            why_now: typeof raw.pondering?.why_now === 'string' ? raw.pondering!.why_now : '',
          },
        };
      }
    } catch {
      /* graceful */
    }

    const gate = await evaluateNicknameGate({
      supabase,
      userId: user.id,
      intimacyState,
      currentPhase: 'BANTER', // UI 조회는 phase 무관
      activeNicknameCount: snap.activeCount,
    });

    // 2) v120 확장 필드 (use_context_tags / hint) 별도 로드 — snapshot 은 아직 모름
    const nicknameNames = snap.history.map((h) => h.nickname);
    let extensionMap = new Map<string, { tags: string[]; hint: string | null }>();
    if (nicknameNames.length > 0) {
      const { data: ext } = await supabase
        .from('luna_nickname_state')
        .select('nickname, use_context_tags, use_context_hint')
        .eq('user_id', user.id)
        .in('nickname', nicknameNames);
      for (const row of ext ?? []) {
        extensionMap.set(row.nickname, {
          tags: (row.use_context_tags as string[]) ?? [],
          hint: (row.use_context_hint as string | null) ?? null,
        });
      }
    }

    const active = snap.history.map((h) => {
      const ext = extensionMap.get(h.nickname);
      return {
        nickname: h.nickname,
        status: h.status,
        useCount: h.useCount,
        lastUsedAt: h.lastUsedAt,
        userReaction: h.userReaction,
        anchorQuote: h.anchorQuote ?? null,
        originContext: h.originContext,
        daysSinceFirstUse: h.daysSinceFirstUse,
        useContextTags: ext?.tags ?? [],
        useContextHint: ext?.hint ?? null,
        // recentUseCount: 현재는 useCount 그대로 (sliding-window 추후 추가)
        recentUseCount: h.useCount,
      };
    });

    return NextResponse.json({
      impression,
      active,
      rejected: snap.rejectedNames,
      gate: {
        allowProposal: gate.allowProposal,
        reason: gate.reason,
      },
    });
  } catch (e) {
    return NextResponse.json({
      impression: EMPTY_IMPRESSION_STATE,
      active: [],
      rejected: [],
      gate: { allowProposal: false, reason: 'load error' },
      error: (e as Error).message,
    });
  }
}
