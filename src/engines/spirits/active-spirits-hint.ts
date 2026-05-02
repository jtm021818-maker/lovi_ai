/**
 * 🧚 v104: Active Spirits Hint Builder
 *
 * 방에 Lv3+ 배치된 활성 정령 리스트를 ACE-v5 시스템 프롬프트용 가이드 문자열로 변환.
 * pipeline 에서 buildAceV5UserMessage params.activeSpiritsHint 로 주입.
 */

import { getActiveSpirits, type ActiveSpirit } from './spirit-abilities';
import { SPIRIT_TO_EVENT, SPIRIT_PHASE_WHITELIST } from './spirit-event-config';
import { SPIRITS } from '@/data/spirits';
import type { ConversationPhaseV2 } from '@/types/engine.types';

/**
 * 한 번의 ACE-v5 메시지 빌드 시 사용. 매 턴 호출.
 * 활성 정령 + 현재 Phase 에서 발동 가능한 카드만 노출.
 */
export async function buildActiveSpiritsHint(
  userId: string,
  currentPhase: ConversationPhaseV2,
): Promise<string | null> {
  const active: ActiveSpirit[] = await getActiveSpirits(userId);
  if (active.length === 0) return null;

  // 현재 Phase 에서 발동 가능한 정령만 필터링
  const visible = active.filter((s) => {
    const phases = SPIRIT_PHASE_WHITELIST[s.spiritId];
    return phases && phases.includes(currentPhase);
  });
  if (visible.length === 0) return null;

  // 활성 정령 한 줄씩
  const lines = visible
    .map((s) => {
      const m = SPIRITS.find((sp) => sp.id === s.spiritId);
      const evt = SPIRIT_TO_EVENT[s.spiritId];
      if (!m || !evt) return null;
      return `- ${m.emoji} ${m.name} (Lv${s.bondLv}) → [${evt}] — ${m.abilityShort}`;
    })
    .filter((x): x is string => Boolean(x));

  if (lines.length === 0) return null;

  return `【🧚 활성 정령 카드 (Lv3+ 방 배치, 현재 Phase 에서 발동 가능)】
지금 너 옆에 깨어 있어:
${lines.join('\n')}

상황이 *정말 잘 어울릴 때*만 본문 마지막 줄에 한 번 박자:
  [SPIRIT_<EVENT_TYPE>:키워드=값]

예:
- 분노 폭발 + 🔥 활성 → [SPIRIT_RAGE_LETTER:rage=상사_갑질,trigger=약속파기]
- 인지왜곡 + 📖 활성 → [SPIRIT_THINK_FRAME:distortion=mind_reading]
- 깊은 슬픔 + 💧 활성 → [SPIRIT_CRY_TOGETHER]
- 새벽 + 🌙 활성 → [SPIRIT_NIGHT_CONFESSION]
- 자기비하 + 👑 활성 → [SPIRIT_CROWN_RECLAIM:reason=가치상실]
- 이별 결정 + 🌸 활성 → [SPIRIT_FALLEN_PETALS]

엄격 규칙:
1. 한 응답에 SPIRIT_ 태그 0~1개. 절대 2개 이상 X.
2. 위기 신호(자해/자살/폭력) 시 SPIRIT_ 태그 절대 금지.
3. 이번 세션에 정령 카드 이미 2개 떴으면 더 박지 마.
4. 어색하면 안 박는 게 정답. 정령 카드는 *권유*지 강제 X.
5. 박을 땐 본문 끝 줄에만. 줄바꿈 1개로 분리.
6. 태그 파라미터는 한국어 키워드 OK. 10자 이내.`;
}

/**
 * 동기 빌더 — 활성 정령 리스트가 이미 조회된 경우 (pipeline 캐싱 활용).
 */
export function buildActiveSpiritsHintSync(
  active: ActiveSpirit[],
  currentPhase: ConversationPhaseV2,
): string | null {
  if (active.length === 0) return null;
  const visible = active.filter((s) => {
    const phases = SPIRIT_PHASE_WHITELIST[s.spiritId];
    return phases && phases.includes(currentPhase);
  });
  if (visible.length === 0) return null;
  const lines = visible
    .map((s) => {
      const m = SPIRITS.find((sp) => sp.id === s.spiritId);
      const evt = SPIRIT_TO_EVENT[s.spiritId];
      if (!m || !evt) return null;
      return `- ${m.emoji} ${m.name} (Lv${s.bondLv}) → [${evt}] — ${m.abilityShort}`;
    })
    .filter((x): x is string => Boolean(x));
  if (lines.length === 0) return null;
  return `【🧚 활성 정령 카드 (Lv3+ 방 배치, 현재 Phase 에서 발동 가능)】
지금 너 옆에 깨어 있어:
${lines.join('\n')}

상황이 *정말 잘 어울릴 때*만 본문 마지막 줄에 한 번 박자:
  [SPIRIT_<EVENT_TYPE>:키워드=값]

엄격 규칙:
1. 한 응답에 SPIRIT_ 태그 0~1개.
2. 위기 신호 시 절대 금지.
3. 어색하면 안 박는 게 정답.`;
}
