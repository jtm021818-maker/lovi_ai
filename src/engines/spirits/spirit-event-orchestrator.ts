/**
 * 🧚 v104: Spirit Event Orchestrator
 *
 * Pipeline 에서 한 번 호출하면:
 *   1) LLM 본문에서 [SPIRIT_*] 태그 파싱
 *   2) 게이트 6단 검사
 *   3) 합성기 호출 (Type A 정적 / Type B LLM / BoltCard 메타)
 *   4) PhaseEvent 빌드 + DB 로그
 *
 * 반환: PhaseEvent 1개 또는 null + cleanedText (태그 제거)
 */

import { parseSpiritTags, stripSpiritTags } from './spirit-event-signal';
import { selectSpiritEvent } from './spirit-event-gate';
import { synthesizeSpiritEvent } from './spirit-event-synthesizer';
import { getActiveSpirits } from './spirit-abilities';
import {
  fetchFiredThisSession,
  hasUsedMonthlyWish,
  getUserAgeDays,
  logSpiritFire,
} from './spirit-event-repo';
import { buildSpiritPhaseEvent } from './spirit-event-types';
import type { ConversationPhaseV2, RiskLevel, RelationshipScenario, ClientIntent, PhaseEvent } from '@/types/engine.types';

export interface SpiritOrchestratorInput {
  userId: string;
  sessionId: string;
  responseText: string;
  phase: ConversationPhaseV2;
  turn: number;
  riskLevel: RiskLevel;
  scenario?: RelationshipScenario;
  emotionScore: number;
  cognitiveDistortions: string[];
  intent?: ClientIntent | string;
  recentTurns: string[];
  consecutiveLowMoodTurns?: number;
  /** 미리 조회된 firedThisSession (option) */
  firedThisSession?: string[];
}

export interface SpiritOrchestratorOutput {
  /** 태그 제거된 본문 (yield 시 사용) */
  cleanedText: string;
  /** 발동된 카드 PhaseEvent (없으면 null) */
  phaseEvent: PhaseEvent | null;
  /** 디버그/로그용 */
  debug: {
    parsedTagCount: number;
    rejectReason?: string;
    source?: 'llm_tag' | 'heuristic';
    spiritId?: string;
    eventType?: string;
  };
}

export async function runSpiritOrchestrator(
  input: SpiritOrchestratorInput,
): Promise<SpiritOrchestratorOutput> {
  const cleanedText = stripSpiritTags(input.responseText ?? '');
  const tags = parseSpiritTags(input.responseText ?? '');

  const debug: SpiritOrchestratorOutput['debug'] = { parsedTagCount: tags.length };

  try {
    const now = new Date();
    const [active, fired, ageDays, wishUsed] = await Promise.all([
      getActiveSpirits(input.userId),
      input.firedThisSession
        ? Promise.resolve(input.firedThisSession)
        : fetchFiredThisSession(input.userId, input.sessionId),
      getUserAgeDays(input.userId, now),
      hasUsedMonthlyWish(input.userId, now),
    ]);

    if (active.length === 0) {
      return { cleanedText, phaseEvent: null, debug: { ...debug, rejectReason: 'no_active_spirit' } };
    }

    const gateResult = await selectSpiritEvent({
      userId: input.userId,
      sessionId: input.sessionId,
      phase: input.phase,
      turn: input.turn,
      riskLevel: input.riskLevel,
      scenario: input.scenario,
      emotionScore: input.emotionScore,
      cognitiveDistortions: input.cognitiveDistortions,
      intent: input.intent,
      now,
      parsedTags: tags,
      firedThisSession: fired as never,
      consecutiveLowMoodTurns: input.consecutiveLowMoodTurns ?? 0,
      monthlyWishUsedAt: wishUsed ? now.toISOString() : null,
      userAgeDays: ageDays,
      preloadedActiveSpirits: active,
    });

    if (!gateResult.ok || !gateResult.spiritId || !gateResult.eventType) {
      return {
        cleanedText,
        phaseEvent: null,
        debug: { ...debug, rejectReason: gateResult.rejectReason },
      };
    }

    debug.spiritId = gateResult.spiritId;
    debug.eventType = gateResult.eventType;
    debug.source = gateResult.source;

    // 합성
    const tagParams = tags.find((t) => t.eventType === gateResult.eventType)?.params ?? {};
    const data = await synthesizeSpiritEvent(gateResult.spiritId, gateResult.eventType, {
      userId: input.userId,
      sessionId: input.sessionId,
      phase: input.phase,
      turn: input.turn,
      recentTurns: input.recentTurns,
      emotionScore: input.emotionScore,
      scenario: input.scenario,
      cognitiveDistortions: input.cognitiveDistortions,
      tagParams,
      now,
      activeSpirits: active,
    });

    const phaseEvent = buildSpiritPhaseEvent(gateResult.eventType, input.phase, data);

    // DB 로그 (fire-and-forget — 실패해도 응답에는 영향 없음)
    logSpiritFire({
      userId: input.userId,
      sessionId: input.sessionId,
      spiritId: gateResult.spiritId,
      eventType: gateResult.eventType,
      phase: input.phase,
      turnNo: input.turn,
      result: data,
    }).catch((e) => console.warn('[spirit-orchestrator] log fail', e));

    return { cleanedText, phaseEvent, debug };
  } catch (e) {
    console.warn('[spirit-orchestrator] error', (e as Error).message);
    return { cleanedText, phaseEvent: null, debug: { ...debug, rejectReason: 'context_mismatch' } };
  }
}
