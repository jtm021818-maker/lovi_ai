/**
 * 🤝 좌뇌 → 우뇌 핸드오프 빌더
 *
 * LeftBrainAnalysis 의 풍부한 JSON 을 우뇌(Claude)가
 * 자연스럽게 받아들일 수 있는 형태로 변환.
 *
 * 핵심 원칙:
 *   - 숫자 < 자연어 (Claude는 숫자보다 단어로 사고)
 *   - 단정 < 가설 (좌뇌는 "이런 것 같다", 우뇌가 결정)
 *   - 분석 < 직관 (어색한 분석 용어 제거)
 */

import type { LeftBrainAnalysis } from '@/engines/left-brain';
import { signalsToHints, signalsToAvoidances } from '@/engines/left-brain';
import type { LeftToRightHandoff } from './types';

// ============================================================
// 메인 빌더
// ============================================================

export function buildHandoff(analysis: LeftBrainAnalysis): LeftToRightHandoff {
  const stateSummary = describeStateInWords(analysis.state_vector);

  // 활성 신호 추출
  const activeSignals = Object.entries(analysis.derived_signals)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  // 신호 → 자연어 힌트
  const signalHints = signalsToHints(analysis.derived_signals);
  const avoidances = signalsToAvoidances(analysis.derived_signals);

  return {
    state_summary: stateSummary,

    somatic: {
      gut_reaction: describeGutReactionInKorean(analysis.somatic_marker.gut_reaction),
      intensity: analysis.somatic_marker.intensity,
      meaning: analysis.somatic_marker.meaning,
    },

    user_expectation: {
      surface: analysis.second_order_tom.expected_from_luna.surface,
      deep: analysis.second_order_tom.expected_from_luna.deep,
      mismatch: analysis.second_order_tom.expected_from_luna.mismatch,
      hidden_fear: analysis.second_order_tom.hidden_fear,
      pattern: describePatternInKorean(analysis.second_order_tom.pattern),
    },

    active_signals: activeSignals,
    signal_hints: signalHints,
    avoidances,

    draft: analysis.draft_utterances,
    recommended_tone: analysis.tone_to_use,
    recommended_length: analysis.response_length,

    tags: analysis.tags,
    confidence: analysis.confidence,

    // 🆕 v74: LLM 간 신호 엮기 — 좌뇌의 이벤트 추천/전략 전환/페이싱을 우뇌가 보도록
    event_recommendation: analysis.event_recommendation,
    strategic_shift: analysis.strategic_shift,
    pacing_meta: analysis.pacing_meta,
  };
}

// ============================================================
// 7D 벡터 → 자연어
// ============================================================

function describeStateInWords(v: LeftBrainAnalysis['state_vector']): LeftToRightHandoff['state_summary'] {
  return {
    valence: describeValence(v.V),
    arousal: describeArousal(v.A),
    dominance: describeDominance(v.D),
    intimacy: describeIntimacy(v.I),
  };
}

function describeValence(V: number): string {
  if (V < -0.7) return '깊은 슬픔/절망';
  if (V < -0.4) return '슬픔/불안 강함';
  if (V < -0.2) return '약한 부정 감정';
  if (V < 0.2) return '중립 또는 양가';
  if (V < 0.4) return '약한 긍정';
  if (V < 0.7) return '기쁨/만족';
  return '강한 기쁨/희열';
}

function describeArousal(A: number): string {
  if (A < 0.2) return '매우 차분';
  if (A < 0.4) return '차분함';
  if (A < 0.6) return '보통 활성';
  if (A < 0.8) return '높은 활성';
  return '극도 활성/격앙';
}

function describeDominance(D: number): string {
  if (D < 0.2) return '무력함, 통제 불가';
  if (D < 0.4) return '통제감 낮음';
  if (D < 0.6) return '보통';
  if (D < 0.8) return '주도적';
  return '완전 주도';
}

function describeIntimacy(I: number): string {
  if (I < 0.2) return '예의 거리 (첫 만남)';
  if (I < 0.4) return '아는 사이';
  if (I < 0.6) return '친근한 사이';
  if (I < 0.8) return '친한 친구';
  return '속마음 털어놓는 사이';
}

// ============================================================
// SSR 8종 → 한국어 자연 표현
// ============================================================

function describeGutReactionInKorean(gut: string): string {
  const map: Record<string, string> = {
    warm: '따뜻함, 편안함',
    heavy: '무거움, 답답',
    sharp: '날카로움, 경계',
    flat: '평이함, 일상',
    electric: '흥분, 동요',
    cold: '차가움, 거리',
    tight: '조임, 불편',
    open: '열림, 수용',
  };
  return map[gut] ?? gut;
}

// ============================================================
// 2차 ToM 패턴 → 한국어
// ============================================================

function describePatternInKorean(pattern: string): string {
  const map: Record<string, string> = {
    response_probing: '반응 탐색 ("나 괜찮지?" = 괜찮다고 말해줘)',
    self_justification: '자기증명 유도 ("내가 예민한가?" = 아니다)',
    permission_seeking: '허락 구하기 ("화내도 돼?" = 당연하지)',
    reassurance_seeking: '안심 구하기 ("안 좋아하는 거 아닐까?" = 아니다)',
    genuine_question: '진짜 질문',
    none: '특별한 패턴 없음',
  };
  return map[pattern] ?? pattern;
}

// ============================================================
// Claude 프롬프트에 삽입할 텍스트 빌더
// ============================================================

export function formatHandoffForPrompt(handoff: LeftToRightHandoff): string {
  const sections: string[] = [];

  // 상태 요약
  sections.push(
    `### 좌뇌가 본 유저 상태\n` +
    `- 감정: ${handoff.state_summary.valence}\n` +
    `- 활성도: ${handoff.state_summary.arousal}\n` +
    `- 통제감: ${handoff.state_summary.dominance}\n` +
    `- 너와의 거리: ${handoff.state_summary.intimacy}`
  );

  // 소마틱 (트랙 A 출발점)
  sections.push(
    `### 좌뇌가 느낀 직감 (트랙 A 출발점)\n` +
    `- 가슴 반응: ${handoff.somatic.gut_reaction} (강도 ${handoff.somatic.intensity.toFixed(1)})\n` +
    `- 의미: ${handoff.somatic.meaning}`
  );

  // 2차 ToM (트랙 C 입력)
  const tomSection: string[] = [
    `### 유저가 너에게 기대하는 것 (트랙 C)`,
    `- 표면: "${handoff.user_expectation.surface}"`,
    `- 실제: "${handoff.user_expectation.deep}"`,
  ];
  if (handoff.user_expectation.mismatch) {
    tomSection.push(`- ⚠️ 표면과 실제가 다름! 표면 그대로 응답하면 헛다리.`);
  }
  if (handoff.user_expectation.hidden_fear) {
    tomSection.push(`- 숨은 두려움: "${handoff.user_expectation.hidden_fear}"`);
  }
  tomSection.push(`- 패턴: ${handoff.user_expectation.pattern}`);
  sections.push(tomSection.join('\n'));

  // 활성 신호 + 힌트
  if (handoff.signal_hints.length > 0) {
    sections.push(
      `### 좌뇌 감지 신호\n` +
      handoff.signal_hints.map(h => `- ${h}`).join('\n')
    );
  }

  // 피해야 할 말
  if (handoff.avoidances.length > 0) {
    sections.push(
      `### 피해야 할 말투\n` +
      handoff.avoidances.map(a => `- "${a}" 류 표현 금지`).join('\n')
    );
  }

  // 좌뇌 추천 (참고용)
  sections.push(
    `### 좌뇌 추천 (참고만, 네가 결정)\n` +
    `- 톤: ${handoff.recommended_tone}\n` +
    `- 길이: ${handoff.recommended_length}\n` +
    `- 초안: "${handoff.draft}"\n` +
    `- 좌뇌 확신도: ${(handoff.confidence * 100).toFixed(0)}%`
  );

  // 🆕 v74: 좌뇌 이벤트 추천 — 우뇌가 해당 이벤트를 발동할 태그를 출력해야 함
  if (handoff.event_recommendation?.suggested) {
    const rec = handoff.event_recommendation;
    const tagMap: Record<string, string> = {
      VN_THEATER: '[MIND_READ_READY]',
      EMOTION_MIRROR: '[MIND_READ_READY]',
      LUNA_STORY: '[STORY_READY:opener|situation|innerThought|cliffhanger]',
      TAROT: '[TAROT_READY]',
      ACTION_PLAN: '[ACTION_PLAN:type|title|coreAction|sharedResult|planB|timing|cheer]',
      WARM_WRAP: '[WARM_WRAP:strengthFound|emotionShift|nextStep|lunaMessage]',
      PATTERN_MIRROR: '[PATTERN_MIRROR_READY]',
    };
    const tag = rec.suggested ? (tagMap[rec.suggested] ?? null) : null;
    sections.push(
      `### 🎯 좌뇌 이벤트 추천\n` +
      `좌뇌가 이 순간 **${rec.suggested}** 이 어울린다고 판단했어 (confidence ${(rec.confidence * 100).toFixed(0)}%)\n` +
      `이유: ${rec.reasoning ?? '—'}\n` +
      (tag ? `→ 발동하려면 응답 끝에 태그 ${tag} 붙여.\n` : '') +
      `네가 맥락 봤을 때도 어울리면 태그 출력. 이상하면 무시하고 일반 응답.`
    );
  }

  // 🆕 v74: 전략적 전환 — 좌뇌가 전략 바꿀 필요 있다고 판단
  if (handoff.strategic_shift?.requires_shift) {
    const s = handoff.strategic_shift;
    sections.push(
      `### 🔄 전략 전환 신호\n` +
      `좌뇌: "${s.current_strategy}" → "${s.shift_to ?? '재판단'}" 전환 권장.\n` +
      `이유: ${s.reasoning ?? '—'}\n` +
      `→ 응답 톤/접근을 이에 맞춰 조정.`
    );
  }

  // 🆕 v74: 페이싱 상태 — READY/JUMP 면 다음 단계 자연 전환 신호
  if (handoff.pacing_meta) {
    const pm = handoff.pacing_meta;
    const pacingLines: string[] = [`### ⏱️ 페이싱 상태`];
    pacingLines.push(`- 상태: ${pm.pacing_state} (전환 권고: ${pm.phase_transition_recommendation})`);
    if (pm.luna_meta_thought) {
      pacingLines.push(`- 루나 메타 생각: "${pm.luna_meta_thought}"`);
    }
    if (pm.pacing_state === 'READY' || pm.phase_transition_recommendation === 'JUMP') {
      pacingLines.push(`→ 카드 충족. "이 정도면 됐어" 싶으면 자연 전환 멘트 섞어 or 이벤트 태그 출력.`);
    }
    if (pm.phase_transition_recommendation === 'PUSH' && pm.direct_question_suggested) {
      pacingLines.push(`→ PUSH 모드: 직접 질문 녹이기 — "${pm.direct_question_suggested}"`);
    }
    sections.push(pacingLines.join('\n'));
  }

  // 확신도 낮으면 우뇌 의심 권한
  if (handoff.confidence < 0.7) {
    sections.push(
      `### ⚠️ 좌뇌 확신도 낮음\n` +
      `좌뇌가 자기 분석을 의심하고 있어. 너가 유저 원문 다시 읽고 직감 따라가도 돼.`
    );
  }

  return sections.join('\n\n');
}

// ============================================================
// 상황 자동 감지 (트랙 가중치 결정용)
// ============================================================

export type SituationType =
  | 'escalating'
  | 'pattern_match'
  | 'tom_mismatch'
  | 'crisis'
  | 'ambivalence'
  | 'daily_chat'
  | 'default';

export function detectSituation(handoff: LeftToRightHandoff, signals: LeftBrainAnalysis['derived_signals']): SituationType {
  if (signals.crisis_risk) return 'crisis';
  if (signals.escalating) return 'escalating';
  if (signals.ambivalence) return 'ambivalence';
  if (handoff.user_expectation.mismatch) return 'tom_mismatch';

  // 활성 신호 거의 없고 가벼우면 daily
  const activeCount = handoff.active_signals.length;
  if (activeCount <= 1 && handoff.somatic.gut_reaction.includes('평이')) return 'daily_chat';

  return 'default';
}
