/**
 * 🧠 좌뇌 오케스트레이터
 *
 * Gemini 2.5 Flash Lite 호출 → JSON 파싱 → 검증 → 라우팅 결정
 *
 * 흐름:
 *   1. 컨텍스트 조립 (Phase, 친밀도, 궤적, 에피소드)
 *   2. Gemini 호출 (좌뇌 시스템 프롬프트 + 컨텍스트 + 유저 발화)
 *   3. JSON 파싱 + 필드 보정
 *   4. 상태 벡터 업데이트 (이전 + 새 신호 가중평균)
 *   5. 유도 신호 자동 계산 (vector → signals)
 *   6. SSR 모순 체크 (VAD 추론과 비교)
 *   7. 라우팅 점수 계산 (Gemini 자기 판단 + 점수 공식 검증)
 */

import { generateWithProvider, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { detectHighStakes } from '@/engines/dual-brain/high-stakes-detector';
import { logEnginePrompt, logEnginePromptResult } from '@/lib/utils/engine-prompt-logger';
import { LogCollector } from '@/lib/utils/logger';

import { LEFT_BRAIN_SYSTEM_PROMPT, buildContextBlock, deriveTimeContext } from './left-brain-prompt';
import { updateStateVector, calculateVelocity, analyzeTrajectory, NEUTRAL_STATE } from './state-vector';
import { detectSSRConflict } from './somatic-marker';
import { deriveSignals } from './derived-signals';
import { calculateRoutingScore } from './routing-scorer';
import type {
  LeftBrainAnalysis,
  LeftBrainInput,
  StateVector,
  SomaticMarker,
  SecondOrderToM,
  RoutingDecision,
} from './types';

// ============================================================
// 메인 함수
// ============================================================

export async function analyzeLeftBrain(
  input: LeftBrainInput,
  logCollector?: LogCollector,
): Promise<{ analysis: LeftBrainAnalysis | null; latencyMs: number; error?: string }> {
  const t0 = Date.now();

  try {
    // Step 1: 컨텍스트 블록 조립
    const contextBlock = buildContextBlock({
      phase: input.phase,
      intimacyLevel: input.intimacyLevel,
      recentTrajectory: input.recentTrajectory,
      relevantEpisodes: input.relevantEpisodes,
      userProfile: input.userProfile,
      personalProfile: input.personalProfile,   // 🆕 v56: 사적 페르소나
      timeContext: input.timeContext ?? deriveTimeContext(),   // 🆕 v58: 시간대 자동 감지
      pacingContext: input.pacing_context,       // 🆕 v60: Phase 페이싱
    });

    // 🆕 v56: ACC 재귀 피드백 — 2차 분석 시 모순 컨텍스트 주입
    let reanalysisBlock = '';
    if (input.is_reanalysis && input.detected_conflicts && input.detected_conflicts.length > 0) {
      const conflictsText = input.detected_conflicts
        .map((c, i) =>
          `  ${i + 1}. [${c.conflict_type}] 이전: "${c.previous_statement}" / 지금: "${c.current_statement}"\n` +
          `     — ${c.description} (심각도 ${(c.severity * 100).toFixed(0)}%)`
        )
        .join('\n');

      reanalysisBlock = `

## ⚠️ 재분석 모드 (ACC 모순 감지)
이전 분석 직후 ACC 가 모순을 감지했어. 이 정보를 반영해서 **strategic_shift 를 진지하게 판단**해.

감지된 모순:
${conflictsText}

판단 지침:
- 단순한 감정 변화가 아닌 **명확한 태도/결정 변화** 라면 requires_shift=true, shift_to='questioning' 으로
- 유저가 이미 모순을 인지한 신호면 shift_to='explore' 로
- 사실 관계 불일치면 shift_to='confrontation' (조심스럽게)
- 단순 감정 변화면 requires_shift=false 그대로

이번 분석은 ACC 피드백 반영한 **최종 판단**.`;
    }

    // Step 2: Gemini 호출 (좌뇌 시스템 프롬프트 + 컨텍스트 + 재분석 블록)
    const fullSystemPrompt = `${LEFT_BRAIN_SYSTEM_PROMPT}\n\n## 현재 컨텍스트\n${contextBlock}${reanalysisBlock}`;

    if (logCollector) {
      logCollector.log(`\n================ [🧠 좌뇌 (Left-Brain) 프로세스 시작] ================`);
      logCollector.log(`[USER INPUT]: ${input.userUtterance}`);
      logCollector.log(`[FULL PROMPT DUMP]:\n${fullSystemPrompt}`);
      logCollector.log(`======================================================================\n`);
    } else {
      console.log(`\n================ [🧠 좌뇌 (Left-Brain) 프로세스 시작] ================`);
      console.log(`[USER INPUT]: ${input.userUtterance}`);
      console.log(`[FULL PROMPT DUMP]:\n${fullSystemPrompt}`);
      console.log(`======================================================================\n`);
    }

    // 🆕 v63.1: 좌뇌는 큰 JSON (10+ 필드) 출력해야 해서 안정성 우선
    //   1순위: 2.5 Flash Lite ($0.10) — 검증된 안정 JSON 출력 (가장 가성비)
    //   2순위: 2.5 Flash ($0.30) — 안정 폴백
    //   3순위: 3.1 Flash Lite ($0.25) — 최후 시도 (가끔 큰 JSON 깨짐)
    //
    //   각 시도: 호출 → JSON parseAndValidate 검증 → 실패면 다음 모델
    //   타임아웃: 모델당 8초
    const LEFT_BRAIN_CASCADE = [
      { name: '2.5-flash-lite', id: GEMINI_MODELS.FLASH_LITE_25 },
      { name: '2.5-flash',      id: GEMINI_MODELS.FLASH_25 },
      { name: '3.1-flash-lite', id: GEMINI_MODELS.FLASH_LITE_31 },
    ];

    let parsed: LeftBrainAnalysis | null = null;
    let lastError: string | undefined;
    let lastRaw: string | undefined;

    for (const model of LEFT_BRAIN_CASCADE) {
      const attemptStart = Date.now();

      // 🆕 v64: 호출 직전 프롬프트+모델 로깅 (각 시도마다)
      logEnginePrompt({
        engine: 'LEFT_BRAIN',
        turnIdx: input.turnIdx,
        model: model.id,
        provider: 'gemini',
        systemPrompt: fullSystemPrompt,
        userMessage: input.userUtterance,
        extra: { cascadeModel: model.name, phase: input.phase, intimacyLevel: input.intimacyLevel },
      });

      try {
        // 🆕 v69: maxTokens 3000 → 8000 (절대 잘리지 않도록 여유 확보)
        //        + 프롬프트에 "간결 출력" 규칙 명시 → LLM 이 자진해서 짧게 출력
        //        timeout 15초 유지
        //        3모델 모두 실패하던 증상 완전 차단
        const rawOutput = await Promise.race([
          generateWithProvider(
            'gemini',
            fullSystemPrompt,
            [{ role: 'user' as const, content: input.userUtterance }],
            'haiku',
            4000, // v71: 8000 → 4000 (충분 + 응답 시간 단축)
            model.id,
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`left_brain_timeout:${model.name}`)), 15000),
          ),
        ]);

        lastRaw = rawOutput;
        const attemptMs = Date.now() - attemptStart;
        console.log(`[LeftBrain:try] ${model.name} success ${attemptMs}ms, rawLen=${rawOutput?.length ?? 0}`);

        const candidate = parseAndValidate(rawOutput, logCollector);
        logEnginePromptResult({
          engine: 'LEFT_BRAIN',
          turnIdx: input.turnIdx,
          rawOutput,
          parsedOK: !!candidate,
          latencyMs: attemptMs,
        });

        if (candidate) {
          parsed = candidate;
          console.log(`[LeftBrain:parseOK] model=${model.name}, draftLen=${candidate.draft_utterances?.length ?? 0}, tone=${candidate.tone_to_use}`);
          break;
        }
        // 파싱 실패 → 다음 모델 시도
        lastError = `parse_failed_${model.name}`;
        console.warn(`[LeftBrain:parseFail] model=${model.name}, raw 첫 200자:\n${rawOutput?.slice(0, 200)}`);
      } catch (err: any) {
        lastError = err?.message ?? `unknown_${model.name}`;
        console.warn(`[LeftBrain:attemptError] model=${model.name}, err=${lastError}`);
      }
    }

    if (!parsed) {
      console.error(`[LeftBrain:allFailed] turnIdx=${input.turnIdx}, lastError=${lastError}, lastRawLen=${lastRaw?.length ?? 0}`);
      return {
        analysis: null,
        latencyMs: Date.now() - t0,
        error: lastError ?? 'left_brain_all_models_failed',
      };
    }

    // Step 4: 이전 상태와 가중 평균 (관성 적용)
    const prevState = input.recentTrajectory.length > 0
      ? input.recentTrajectory[input.recentTrajectory.length - 1]
      : NEUTRAL_STATE;
    const updatedState = updateStateVector(
      prevState,
      parsed.state_vector,
      input.turnIdx,
    );
    parsed.state_vector = updatedState;

    // Step 5: 유도 신호 자동 계산 (Gemini가 부정확하게 출력하면 보정)
    const velocity = calculateVelocity(prevState, updatedState);
    const trajectory = analyzeTrajectory([
      ...input.recentTrajectory.slice(-2),
      updatedState,
    ]);
    const computedSignals = deriveSignals({
      current: updatedState,
      velocity,
      trajectory,
      history: input.recentTrajectory,
    });
    // Gemini 신호와 계산 신호를 OR 결합 (둘 다 잡혀야 안전)
    parsed.derived_signals = mergeSignals(parsed.derived_signals, computedSignals);

    // Step 6: SSR 모순 체크
    const ssrConflict = detectSSRConflict(parsed.somatic_marker, updatedState);
    if (ssrConflict.conflict) {
      parsed.ambiguity_signals.push(ssrConflict.reason);
      parsed.confidence = Math.min(parsed.confidence, 0.5);
    }

    // Step 7: 라우팅 점수 재계산 (Gemini 자체 판단 검증)
    const highStakes = detectHighStakes(input.userUtterance);
    const recalculatedRouting = calculateRoutingScore({
      state: updatedState,
      somatic: parsed.somatic_marker,
      tom: parsed.second_order_tom,
      signals: parsed.derived_signals,
      complexity: parsed.complexity,
      confidence: parsed.confidence,
      ambiguity_signals_count: parsed.ambiguity_signals.length,
      high_stakes_detected: highStakes.type !== null,
      high_stakes_type: highStakes.type,
      session_turn_count: input.turnIdx,
      recent_claude_calls: 0,           // TODO: 실제 세션 추적
      intimacy_level: input.intimacyLevel,
    });

    // Gemini 자체 판단 vs 계산된 점수 — 둘 중 더 보수적 (claude 쪽으로) 채택
    const finalRouting = mergeRoutingDecisions(parsed.routing_decision, recalculatedRouting);
    parsed.routing_decision = finalRouting;

    return {
      analysis: parsed,
      latencyMs: Date.now() - t0,
    };
  } catch (err: any) {
    return {
      analysis: null,
      latencyMs: Date.now() - t0,
      error: err?.message ?? 'unknown',
    };
  }
}

// ============================================================
// JSON 파싱 + 보정
// ============================================================

function parseAndValidate(raw: string, logCollector?: LogCollector): LeftBrainAnalysis | null {
  if (!raw) return null;

  try {
    let jsonStr = '';
    const text = raw.trim();

    // 1. ```json ... ``` 코드블록 추출 시도
    const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      // 🆕 v68: 닫히지 않은 ```json 도 처리 (토큰 잘림으로 백틱 3개 안 나온 경우)
      const openMatch = text.match(/```json\s*([\s\S]*)$/i);
      if (openMatch && openMatch[1]) {
        jsonStr = openMatch[1].trim();
      } else {
        // 2. 코드블록이 없으면 첫 '{' 와 마지막 '}' 사이 추출
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = text.slice(firstBrace, lastBrace + 1);
        } else if (firstBrace !== -1) {
          // 🆕 v68: 닫는 } 없음 = 토큰 잘림 → 첫 { 부터 전체 가져와서 복구 시도
          jsonStr = text.slice(firstBrace);
        } else {
          jsonStr = text; // 최후의 수단
        }
      }
    }

    // 3. 제어 문자 제거 (Gemini 3.1 특성 대응)
    jsonStr = jsonStr.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');

    // 🆕 v68: JSON 잘림 자동 복구 — 열린 괄호/배열 만큼 닫기
    let p: any;
    try {
      p = JSON.parse(jsonStr);
    } catch (e: any) {
      // 잘린 JSON 복구 시도
      const repaired = repairTruncatedJSON(jsonStr);
      if (repaired) {
        try {
          p = JSON.parse(repaired);
          console.warn('[LeftBrain] 🔧 JSON 잘림 자동 복구 성공');
        } catch (_) {
          throw e; // 복구 실패 → 원래 에러
        }
      } else {
        throw e;
      }
    }

    // 필드별 보정 (안전망)
    const valid: LeftBrainAnalysis = {
      state_vector: validateStateVector(p.state_vector),
      somatic_marker: validateSomaticMarker(p.somatic_marker),
      second_order_tom: validateSecondOrderTom(p.second_order_tom),
      derived_signals: validateDerivedSignals(p.derived_signals),
      memory_connections: Array.isArray(p.memory_connections) ? p.memory_connections : [],
      hormonal_impact: validateHormonalImpact(p.hormonal_impact),
      emotion_blend: validateEmotionBlend(p.emotion_blend),
      strategic_shift: validateStrategicShift(p.strategic_shift),
      event_recommendation: validateEventRecommendation(p.event_recommendation),
      pacing_meta: validatePacingMeta(p.pacing_meta),
      cards_filled_this_turn: validateFilledCards(p.cards_filled_this_turn),
      perceived_emotion: String(p.perceived_emotion ?? '').slice(0, 40),
      actual_need: String(p.actual_need ?? '').slice(0, 40),
      tone_to_use: String(p.tone_to_use ?? '따뜻함'),
      response_length: validateLength(p.response_length),
      draft_utterances: String(p.draft_utterances ?? ''),
      tags: {
        SITUATION_READ: String(p.tags?.SITUATION_READ ?? '').slice(0, 30),
        LUNA_THOUGHT: String(p.tags?.LUNA_THOUGHT ?? '').slice(0, 40),
        PHASE_SIGNAL: validatePhaseSignal(p.tags?.PHASE_SIGNAL),
        SITUATION_CLEAR: p.tags?.SITUATION_CLEAR ?? null,
      },
      complexity: clamp(Math.round(Number(p.complexity ?? 3)), 1, 5) as 1 | 2 | 3 | 4 | 5,
      confidence: clamp(Number(p.confidence ?? 0.5), 0, 1),
      ambiguity_signals: Array.isArray(p.ambiguity_signals) ? p.ambiguity_signals.map(String) : [],
      routing_decision: validateRoutingDecision(p.routing_decision),
    };

    return valid;
  } catch (e: any) {
    console.error('[LeftBrain] ❌ JSON 파싱 실패:', e.message);
    logCollector?.record('ENGINE_ERROR', `좌뇌 파싱 실패: ${e.message}`, {
      raw_output: raw.slice(0, 500),
      error: e.stack,
    });
    return null;
  }
}

/**
 * 🆕 v68: 토큰 잘림으로 불완전한 JSON 복구
 * - 따옴표 안에서 잘렸는지 판단 → 닫기
 * - 열린 배열/객체만큼 ] } 추가
 * - 마지막 콤마/키-미완성-value 제거
 */
function repairTruncatedJSON(input: string): string | null {
  if (!input || input.length < 10) return null;
  let s = input.trim();

  // 1. 열려있는 문자열 닫기 (홀수 개 따옴표)
  //    — escape 된 따옴표 제외 카운트
  let quoteCount = 0;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (c === '"') quoteCount++;
  }
  if (quoteCount % 2 === 1) {
    // 마지막 열린 따옴표 찾아서 거기서부터 잘라내고 null 로 대체
    // 간단히: 문자열 끝에 " 추가 → 불완전한 value 를 마감
    s += '"';
  }

  // 2. 마지막 토큰이 키:value 미완성 인 경우 제거
  //    예: `"key": "value` 또는 `"key":` → 마지막 콤마 이후 제거
  //    `,\s*"[^"]*"\s*:\s*(?:"[^"]*)?$` 같은 패턴
  // 간단 버전: 마지막 } 또는 ] 가 나올 때까지의 찌꺼기가 문제일 수 있음
  // 일단 trailing 콤마 제거
  s = s.replace(/,\s*$/, '');

  // 3. 객체/배열 스택 추적하여 닫아주기
  const stack: string[] = [];
  let inString = false;
  escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
  }

  // 남은 스택 역순으로 닫기
  while (stack.length > 0) {
    const open = stack.pop();
    // 닫기 전에 불완전한 key-value 패턴 제거 시도
    s = s.replace(/,\s*$/, '');   // 매번 trailing comma 제거
    // 객체 내부에 key 뒤 value 없으면 제거
    s = s.replace(/,?\s*"[^"]*"\s*:\s*$/, '');
    s = s.replace(/,?\s*"[^"]*"\s*:\s*"[^"]*$/, ''); // 잘린 문자열 value
    s = s.replace(/,?\s*"[^"]*"\s*:\s*\{[^}]*$/, ''); // 잘린 객체 value
    s = s.replace(/,?\s*\{[^}]*$/, ''); // 배열의 잘린 객체 요소
    s = s.replace(/,\s*$/, '');

    s += open === '{' ? '}' : ']';
  }

  return s;
}

function validateStateVector(v: any): StateVector {
  return {
    V: clamp(Number(v?.V ?? 0), -1, 1),
    A: clamp(Number(v?.A ?? 0.3), 0, 1),
    D: clamp(Number(v?.D ?? 0.5), 0, 1),
    I: clamp(Number(v?.I ?? 0.2), 0, 1),
    T: clamp(Number(v?.T ?? 0.3), 0, 1),
    U: clamp(Number(v?.U ?? 0.1), 0, 1),
    M: clamp(Number(v?.M ?? 0.5), 0, 1),
  };
}

function validateSomaticMarker(s: any): SomaticMarker {
  const validReactions = ['warm', 'heavy', 'sharp', 'flat', 'electric', 'cold', 'tight', 'open'];
  const reaction = validReactions.includes(s?.gut_reaction) ? s.gut_reaction : 'flat';
  return {
    gut_reaction: reaction,
    intensity: clamp(Number(s?.intensity ?? 0.3), 0, 1),
    triggered_by: String(s?.triggered_by ?? ''),
    meaning: String(s?.meaning ?? ''),
  };
}

function validateSecondOrderTom(t: any): SecondOrderToM {
  return {
    expected_from_luna: {
      surface: String(t?.expected_from_luna?.surface ?? ''),
      deep: String(t?.expected_from_luna?.deep ?? ''),
      mismatch: Boolean(t?.expected_from_luna?.mismatch),
    },
    conversational_goal: {
      type: t?.conversational_goal?.type ?? 'connection',
      strength: clamp(Number(t?.conversational_goal?.strength ?? 0.5), 0, 1),
    },
    pattern: t?.pattern ?? 'none',
    avoided_topics: Array.isArray(t?.avoided_topics) ? t.avoided_topics.map(String) : [],
    hidden_fear: t?.hidden_fear ? String(t.hidden_fear) : null,
  };
}

function validateDerivedSignals(s: any): import('./types').DerivedSignals {
  const fields = [
    'escalating', 'helplessness', 'suppression', 'ambivalence',
    'meta_collapse', 'trust_gain', 'crisis_risk', 'insight_moment', 'withdrawal',
  ];
  const result: any = {};
  for (const f of fields) result[f] = Boolean(s?.[f]);
  return result;
}

function validateLength(l: any): '침묵' | '한마디' | '짧음' | '보통' {
  const valid = ['침묵', '한마디', '짧음', '보통'];
  return valid.includes(l) ? l : '짧음';
}

function validatePhaseSignal(s: any): 'STAY' | 'READY' | 'URGENT' {
  const valid = ['STAY', 'READY', 'URGENT'];
  return valid.includes(s) ? s : 'STAY';
}

// 🆕 v56: LLM 판단 기반 호르몬 변화 검증
function validateHormonalImpact(h: any): import('./types').LeftBrainAnalysis['hormonal_impact'] {
  return {
    cortisol_delta: clamp(Number(h?.cortisol_delta ?? 0), -1, 1),
    oxytocin_delta: clamp(Number(h?.oxytocin_delta ?? 0), -1, 1),
    dopamine_delta: clamp(Number(h?.dopamine_delta ?? 0), -1, 1),
    threat_delta: clamp(Number(h?.threat_delta ?? 0), -1, 1),
    reasoning: String(h?.reasoning ?? '').slice(0, 150),
  };
}

// 🆕 v57: 파생 감정 검증
function validateEmotionBlend(eb: any): import('./types').LeftBrainAnalysis['emotion_blend'] {
  if (!eb || typeof eb !== 'object') return null;

  const derived = String(eb.derived_emotion ?? '').trim();
  if (!derived || derived.length < 2) return null;   // 이름 없으면 null

  const components = Array.isArray(eb.component_emotions)
    ? eb.component_emotions.map(String).filter(Boolean).slice(0, 4)
    : [];

  const intensity = clamp(Number(eb.intensity ?? 0), 0, 1);

  // 강도 너무 약하면 null
  if (intensity < 0.3) return null;

  return {
    derived_emotion: derived.slice(0, 20),
    component_emotions: components,
    intensity,
    reasoning: String(eb.reasoning ?? '').slice(0, 150),
  };
}

// 🆕 v60: Phase 페이싱 메타인지 검증
function validatePacingMeta(p: any): import('./types').LeftBrainAnalysis['pacing_meta'] {
  const validStates = ['EARLY', 'MID', 'READY', 'STRETCHED', 'FRUSTRATED'] as const;
  const validRecs = ['STAY', 'PUSH', 'JUMP', 'WRAP'] as const;

  const pacingState = validStates.includes(p?.pacing_state)
    ? p.pacing_state as typeof validStates[number]
    : 'EARLY';

  const transitionRec = validRecs.includes(p?.phase_transition_recommendation)
    ? p.phase_transition_recommendation as typeof validRecs[number]
    : 'STAY';

  const directQ = typeof p?.direct_question_suggested === 'string' && p.direct_question_suggested.trim().length > 0
    ? String(p.direct_question_suggested).slice(0, 200)
    : null;

  const naturalFu = typeof p?.natural_followup === 'string' && p.natural_followup.trim().length > 0
    ? String(p.natural_followup).slice(0, 200)
    : null;

  return {
    pacing_state: pacingState,
    turns_in_phase: Math.max(0, Math.round(Number(p?.turns_in_phase ?? 0))),
    estimated_remaining_turns: Math.max(0, Math.round(Number(p?.estimated_remaining_turns ?? 0))),
    card_completion_rate: clamp(Number(p?.card_completion_rate ?? 0), 0, 1),
    missing_required_cards: Array.isArray(p?.missing_required_cards)
      ? p.missing_required_cards.map(String).slice(0, 10)
      : [],
    user_avoidance_signals: Array.isArray(p?.user_avoidance_signals)
      ? p.user_avoidance_signals.map(String).slice(0, 8)
      : [],
    consecutive_short_replies: Math.max(0, Math.round(Number(p?.consecutive_short_replies ?? 0))),
    luna_meta_thought: String(p?.luna_meta_thought ?? '').slice(0, 200),
    phase_transition_recommendation: transitionRec,
    direct_question_suggested: directQ,
    curiosity_intensity: clamp(Number(p?.curiosity_intensity ?? 0), 0, 1),
    natural_followup: naturalFu,
  };
}

// 🆕 v60: 이번 턴 채워진 카드 검증 (화이트리스트)
const VALID_CARD_KEYS = new Set([
  'W1_who', 'W2_what', 'W3_when', 'W4_surface_emotion',
  'M1_emotion_intensity', 'M2_deep_hypothesis', 'M3_pattern_history', 'M4_acknowledgment',
  'B1_help_mode', 'B2_decision_point', 'B3_constraints',
  'S1_next_action', 'S2_trigger_time', 'S3_backup',
  'E1_summary_accepted', 'E2_next_meeting',
]);

function validateFilledCards(cards: any): import('./types').FilledCard[] {
  if (!Array.isArray(cards)) return [];
  return cards
    .filter((c: any) => c && typeof c === 'object' && VALID_CARD_KEYS.has(c.key))
    .slice(0, 8)
    .map((c: any) => ({
      key: String(c.key),
      value: String(c.value ?? '').slice(0, 100),
      confidence: clamp(Number(c.confidence ?? 0.5), 0, 1),
      source_quote: c.source_quote ? String(c.source_quote).slice(0, 150) : undefined,
    }));
}

// 🆕 v58: 이벤트 공동 판단 — 좌뇌 이벤트 추천 검증
function validateEventRecommendation(e: any): import('./types').LeftBrainAnalysis['event_recommendation'] {
  if (!e || typeof e !== 'object') return null;

  const validEvents = [
    'VN_THEATER', 'LUNA_STORY', 'TAROT', 'ACTION_PLAN',
    'WARM_WRAP', 'EMOTION_MIRROR', 'PATTERN_MIRROR',
  ] as const;
  type EventKey = typeof validEvents[number];

  const suggested = validEvents.includes(e.suggested) ? (e.suggested as EventKey) : undefined;
  const confidence = clamp(Number(e.confidence ?? 0), 0, 1);

  // 추천이 없거나 신뢰도가 너무 낮으면 null
  if (!suggested || confidence < 0.4) return null;

  return {
    suggested,
    confidence,
    reasoning: String(e.reasoning ?? '').slice(0, 150),
  };
}

// 🆕 v56: 전략적 전환 판단 검증
function validateStrategicShift(s: any): import('./types').LeftBrainAnalysis['strategic_shift'] {
  const validStrategies = ['empathy', 'questioning', 'confrontation', 'reassurance', 'explore', 'pace_back'] as const;
  type Strategy = typeof validStrategies[number];
  const currentStrategy: Strategy = validStrategies.includes(s?.current_strategy) ? s.current_strategy : 'empathy';
  const shiftTo = validStrategies.includes(s?.shift_to) ? (s.shift_to as Strategy) : undefined;

  return {
    current_strategy: currentStrategy,
    requires_shift: Boolean(s?.requires_shift),
    shift_to: shiftTo,
    reasoning: String(s?.reasoning ?? '').slice(0, 150),
  };
}

function validateRoutingDecision(r: any): RoutingDecision {
  return {
    recommended: r?.recommended === 'claude' ? 'claude' : 'gemini',
    score: clamp(Number(r?.score ?? 5), 0, 20),
    primary_reason: String(r?.primary_reason ?? ''),
    score_breakdown: {
      high_stakes: 0, complexity: 0, low_confidence: 0,
      ambiguity: 0, urgency: 0, low_meta: 0,
      tom_mismatch: 0, somatic_alert: 0,
    },
  };
}

// ============================================================
// 신호/라우팅 결정 병합 (Gemini 출력 + 계산된 값)
// ============================================================

function mergeSignals(
  geminiSignals: import('./types').DerivedSignals,
  computedSignals: import('./types').DerivedSignals,
): import('./types').DerivedSignals {
  // OR 결합 — 어느 쪽이라도 감지하면 활성
  // 단, 위기 신호는 더 보수적 (둘 다 감지해야 활성)
  return {
    escalating: geminiSignals.escalating || computedSignals.escalating,
    helplessness: geminiSignals.helplessness || computedSignals.helplessness,
    suppression: geminiSignals.suppression || computedSignals.suppression,
    ambivalence: geminiSignals.ambivalence || computedSignals.ambivalence,
    meta_collapse: geminiSignals.meta_collapse || computedSignals.meta_collapse,
    trust_gain: geminiSignals.trust_gain || computedSignals.trust_gain,
    crisis_risk: geminiSignals.crisis_risk,  // Gemini 판단 신뢰
    insight_moment: geminiSignals.insight_moment || computedSignals.insight_moment,
    withdrawal: geminiSignals.withdrawal || computedSignals.withdrawal,
  };
}

function mergeRoutingDecisions(
  geminiDecision: RoutingDecision,
  computedDecision: RoutingDecision,
): RoutingDecision {
  // 더 보수적 (claude 쪽) 선택
  if (geminiDecision.recommended === 'claude' || computedDecision.recommended === 'claude') {
    // 계산된 점수와 breakdown 사용 (더 신뢰)
    return {
      recommended: 'claude',
      score: Math.max(geminiDecision.score, computedDecision.score),
      primary_reason: computedDecision.primary_reason || geminiDecision.primary_reason,
      score_breakdown: computedDecision.score_breakdown,
    };
  }
  return {
    recommended: 'gemini',
    score: computedDecision.score,
    primary_reason: computedDecision.primary_reason,
    score_breakdown: computedDecision.score_breakdown,
  };
}

// ============================================================
// 헬퍼
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
