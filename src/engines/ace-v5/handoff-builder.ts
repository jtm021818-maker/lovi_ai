/**
 * 🤝 좌뇌 → 우뇌 핸드오프 빌더 (v75)
 *
 * 철학:
 *   좌뇌 분석 = 루나의 무의식 인지. 우뇌가 이걸 **자기 내면 독백** 으로 읽음.
 *   분석 보고서 X, 친구의 순간 사고 ○.
 *   모든 좌뇌 필드를 전달. 우뇌 LLM 이 취사선택.
 */

import type { LeftBrainAnalysis } from '@/engines/left-brain';
import { signalsToHints, signalsToAvoidances } from '@/engines/left-brain';
import type { LeftToRightHandoff } from './types';

// ============================================================
// 메인 빌더 — 좌뇌 전체 필드 pass-through
// ============================================================

/**
 * 🆕 v76: 시간 차이 → 자연어 변환 ("며칠 전", "저번주")
 */
export function timeAgoNatural(createdAt: string | Date): string {
  const then = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const diffMs = Date.now() - then.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  const diffD = diffH / 24;
  if (diffH < 2) return '방금 전';
  if (diffH < 12) return '오늘 아까';
  if (diffD < 1.5) return '어제';
  if (diffD < 3) return '그저께';
  if (diffD < 7) return '며칠 전';
  if (diffD < 14) return '저번주';
  if (diffD < 30) return '지난달쯤';
  if (diffD < 60) return '몇 주 전';
  return '오래 전에';
}

export function buildHandoff(analysis: LeftBrainAnalysis): LeftToRightHandoff {
  const stateSummary = describeStateInWords(analysis.state_vector);

  const activeSignals = Object.entries(analysis.derived_signals)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  const signalHints = signalsToHints(analysis.derived_signals);
  const avoidances = signalsToAvoidances(analysis.derived_signals);

  return {
    state_summary: stateSummary,
    state_vector_raw: analysis.state_vector,

    somatic: {
      gut_reaction: describeGutReactionInKorean(analysis.somatic_marker.gut_reaction),
      intensity: analysis.somatic_marker.intensity,
      triggered_by: analysis.somatic_marker.triggered_by,
      meaning: analysis.somatic_marker.meaning,
    },

    user_expectation: {
      surface: analysis.second_order_tom.expected_from_luna.surface,
      deep: analysis.second_order_tom.expected_from_luna.deep,
      mismatch: analysis.second_order_tom.expected_from_luna.mismatch,
      hidden_fear: analysis.second_order_tom.hidden_fear,
      pattern: describePatternInKorean(analysis.second_order_tom.pattern),
      conversational_goal: analysis.second_order_tom.conversational_goal,
      avoided_topics: analysis.second_order_tom.avoided_topics ?? [],
    },

    active_signals: activeSignals,
    signal_hints: signalHints,
    avoidances,

    perceived_emotion: analysis.perceived_emotion ?? '',
    actual_need: analysis.actual_need ?? '',
    luna_thought: analysis.tags?.LUNA_THOUGHT ?? '',
    situation_read: analysis.tags?.SITUATION_READ ?? '',

    emotion_blend: analysis.emotion_blend,
    hormonal_impact: analysis.hormonal_impact,
    memory_connections: analysis.memory_connections,

    draft: analysis.draft_utterances,
    recommended_tone: analysis.tone_to_use,
    recommended_length: analysis.response_length,

    tags: analysis.tags,

    complexity: analysis.complexity,
    confidence: analysis.confidence,
    ambiguity_signals: analysis.ambiguity_signals ?? [],

    event_recommendation: analysis.event_recommendation,
    strategic_shift: analysis.strategic_shift,
    pacing_meta: analysis.pacing_meta,
    meta_awareness: analysis.meta_awareness,
    self_expression: (analysis as any).self_expression,
    cards_filled_this_turn: analysis.cards_filled_this_turn ?? [],
    // 🆕 v76: memory_recalls / long_term_impression 은 pipeline 에서 주입 (이 함수 밖)
  };
}

/**
 * 🆕 v76: 기존 handoff 에 memory 정보 병합
 * pipeline 에서 loadWorkingMemory 결과를 받아 handoff 에 주입.
 */
export function mergeMemoryIntoHandoff(
  handoff: LeftToRightHandoff,
  wm: { facts: any[]; recent: any[]; topSalient: any[] } | null,
  longTermImpression?: string | null,
  intimacyState?: LeftToRightHandoff['intimacy_state'],
): LeftToRightHandoff {
  if (!wm) {
    return {
      ...handoff,
      long_term_impression: longTermImpression ?? null,
      intimacy_state: intimacyState,
    };
  }

  // 추억 카드 3-5개 선별: topSalient + recent
  const raw = [...(wm.topSalient ?? []), ...(wm.recent ?? [])];
  // 중복 제거 (id 기준)
  const seen = new Set<string>();
  const unique = raw.filter((m) => {
    const id = m?.id ?? m?.content?.slice(0, 30);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const recalls = unique.slice(0, 5).map((m) => ({
    content: m.content as string,
    summary: (m.summary as string | null) ?? null,
    luna_feeling: (m.luna_feeling as string | null) ?? null,
    time_ago: m.created_at ? timeAgoNatural(m.created_at) : undefined,
    emotional_weight: (m.emotional_weight as number | undefined) ?? 0.5,
  }));

  return {
    ...handoff,
    memory_recalls: recalls.length > 0 ? recalls : undefined,
    long_term_impression: longTermImpression ?? null,
    intimacy_state: intimacyState,
  };
}

// ============================================================
// 🆕 v75: "루나의 3단계 순간 사고" 포맷 — 내면 독백 스타일
// ============================================================

export function formatHandoffForPrompt(handoff: LeftToRightHandoff): string {
  const lines: string[] = [];

  // ── 1단계: 몸이 느낀 것 (감각)
  lines.push(`## 🫀 방금 카톡 읽고 네 안에서 일어난 일`);
  lines.push('');
  lines.push(`가슴에 **${handoff.somatic.gut_reaction}** 이 올라와. (강도 ${(handoff.somatic.intensity * 10).toFixed(0)}/10)`);
  if (handoff.somatic.triggered_by) {
    lines.push(`그게 일어난 건 — ${handoff.somatic.triggered_by}`);
  }
  if (handoff.somatic.meaning) {
    lines.push(`의미: ${handoff.somatic.meaning}`);
  }
  lines.push('');

  // 루나 자신의 감정 (호르몬)
  if (handoff.hormonal_impact) {
    const h = handoff.hormonal_impact;
    const shifts: string[] = [];
    if (Math.abs(h.cortisol_delta) >= 0.2) shifts.push(`스트레스 ${h.cortisol_delta > 0 ? '↑' : '↓'}${Math.abs(h.cortisol_delta).toFixed(1)}`);
    if (Math.abs(h.oxytocin_delta) >= 0.2) shifts.push(`친밀감 ${h.oxytocin_delta > 0 ? '↑' : '↓'}${Math.abs(h.oxytocin_delta).toFixed(1)}`);
    if (Math.abs(h.dopamine_delta) >= 0.2) shifts.push(`기쁨 ${h.dopamine_delta > 0 ? '↑' : '↓'}${Math.abs(h.dopamine_delta).toFixed(1)}`);
    if (Math.abs(h.threat_delta) >= 0.2) shifts.push(`경계 ${h.threat_delta > 0 ? '↑' : '↓'}${Math.abs(h.threat_delta).toFixed(1)}`);
    if (shifts.length > 0) {
      lines.push(`네 내면의 변화: ${shifts.join(' · ')}`);
      if (h.reasoning) lines.push(`(${h.reasoning})`);
      lines.push('');
    }
  }

  // ── 2단계: 얘 진짜 뭐 원하지? (직관)
  lines.push(`## 🔍 얘 진짜 뭐 원하는 거지`);
  lines.push('');
  lines.push(`감정: 전반적으로 **${handoff.state_summary.valence}**, ${handoff.state_summary.arousal}, ${handoff.state_summary.dominance}.`);
  lines.push(`너와의 거리: ${handoff.state_summary.intimacy}.`);

  if (handoff.perceived_emotion) {
    lines.push(`표면 감정: **${handoff.perceived_emotion}**`);
  }
  if (handoff.emotion_blend) {
    const eb = handoff.emotion_blend;
    lines.push(`근데 단순한 감정 아냐 — "${eb.derived_emotion}" 같은 복합 감정 느껴짐 (${eb.component_emotions.join(' + ')}).`);
    if (eb.reasoning) lines.push(`  → ${eb.reasoning}`);
  }

  lines.push('');
  lines.push(`얘가 표면적으로 원하는 건: "${handoff.user_expectation.surface}"`);
  lines.push(`근데 실제로 필요한 건: **"${handoff.user_expectation.deep}"**`);
  if (handoff.user_expectation.mismatch) {
    lines.push(`⚠️ 둘이 달라. 표면 그대로 받으면 헛다리야.`);
  }
  if (handoff.user_expectation.hidden_fear) {
    lines.push(`숨은 두려움: "${handoff.user_expectation.hidden_fear}"`);
  }
  if (handoff.user_expectation.pattern && handoff.user_expectation.pattern !== '특별한 패턴 없음') {
    lines.push(`패턴: ${handoff.user_expectation.pattern}`);
  }
  if (handoff.user_expectation.conversational_goal?.type) {
    const gm: Record<string, string> = {
      venting: '쏟아내기', advice: '조언 원함', validation: '인정/공감 원함',
      confrontation: '직면 원함', distraction: '주의 돌리고 싶음', connection: '그냥 연결 원함',
    };
    lines.push(`얘 대화 목적: ${gm[handoff.user_expectation.conversational_goal.type] ?? handoff.user_expectation.conversational_goal.type}`);
  }
  if (handoff.actual_need) {
    lines.push(`→ **얘한테 지금 필요한 건 "${handoff.actual_need}"**`);
  }
  if (handoff.user_expectation.avoided_topics?.length > 0) {
    lines.push(`건드리지 말 것: ${handoff.user_expectation.avoided_topics.join(', ')}`);
  }
  lines.push('');

  // 감지된 신호 (자연어)
  if (handoff.signal_hints.length > 0) {
    lines.push(`네가 감지한 것:`);
    handoff.signal_hints.forEach((h) => lines.push(`- ${h}`));
    lines.push('');
  }

  // 기억 연결
  if (handoff.memory_connections && handoff.memory_connections.length > 0) {
    lines.push(`떠오르는 과거 에피:`);
    handoff.memory_connections.slice(0, 3).forEach((m) => {
      lines.push(`- ${m.hint} (관련도 ${(m.relevance * 10).toFixed(0)}/10)`);
      if (m.suggestion) lines.push(`  → ${m.suggestion}`);
    });
    lines.push('');
  }

  // 🆕 v76: 루나가 떠올린 기억 — 1인칭 독백 스타일
  // DB 에서 가져왔다는 티 X. "방금 문득 떠올랐다" 처럼 자연스럽게.
  if (handoff.memory_recalls && handoff.memory_recalls.length > 0) {
    lines.push(`## 📖 문득 떠오른 기억`);
    lines.push('');
    lines.push(`얘 얘기 듣다보니 내 머릿속에 이게 떠올랐어 —`);
    lines.push('');
    handoff.memory_recalls.slice(0, 3).forEach((m, i) => {
      const when = m.time_ago ? `**${m.time_ago}** — ` : '';
      const content = m.summary ?? m.content;
      lines.push(`${i + 1}. ${when}${content}`);
      if (m.luna_feeling) {
        lines.push(`   내 그때 느낌: ${m.luna_feeling}`);
      }
    });
    lines.push('');
    lines.push(`→ 지금 대화 흐름에 자연스러우면 "아 맞다 그때..." 식으로 꺼내.`);
    lines.push(`   억지로 쓰지 마. 흐름 안 맞으면 마음에만 두고 패스.`);
    lines.push('');
  }

  // 🆕 v76: 이 유저에 대한 루나의 장기 인상
  if (handoff.long_term_impression) {
    lines.push(`### 이 친구에 대해 내가 아는 것`);
    lines.push(`${handoff.long_term_impression}`);
    lines.push('');
  }

  // 🆕 v77: 친밀도 상태 — 관계 깊이 + 해제 행동 힌트
  if (handoff.intimacy_state) {
    const it = handoff.intimacy_state;
    lines.push(`## 🧬 지금 이 친구와의 관계`);
    lines.push('');
    lines.push(`**Lv.${it.level} — ${it.name}** (score ${it.score}/100)`);
    lines.push(`${it.description}`);
    if (it.days_since_last !== undefined && it.days_since_last >= 2) {
      lines.push(`${Math.round(it.days_since_last)}일 만에 다시 봄${it.reunion ? ' — 반가움 🎁' : ''}`);
    }
    lines.push('');
    if (it.unlocked_behaviors.length > 0) {
      lines.push(`이 단계에서 자연스럽게 할 수 있는 것:`);
      it.unlocked_behaviors.forEach((b) => lines.push(`- ${b}`));
    }
    if (it.locked_behaviors.length > 0) {
      lines.push('');
      lines.push(`아직 이르거나 부담될 수 있는 것:`);
      it.locked_behaviors.forEach((b) => lines.push(`- ${b}`));
    }
    if (it.level_up_moment) {
      lines.push('');
      lines.push(`🎉 **지금 막 Lv.${it.level} 로 올라감!**`);
      lines.push(`원하면 자연스럽게 인지해도 OK ("야 우리 이제 좀 친한 듯 ㅋㅋ" 류). 억지로 X.`);
    }
    lines.push('');
    lines.push(`→ 강제 규칙 아냐. 맥락 맞으면 해제 행동 활용, 아니면 무시.`);
    lines.push('');
  }

  // 메타-항의
  if (handoff.meta_awareness?.user_meta_complaint) {
    lines.push(`🚨 **얘 지금 네 직전 응답에 불만 표시함** (유형: ${handoff.meta_awareness.complaint_type})`);
    if (handoff.meta_awareness.last_user_substance_quote) {
      lines.push(`얘 마지막 실질 발화: "${handoff.meta_awareness.last_user_substance_quote}"`);
    }
    lines.push(`→ 새 주제/조언 꺼내지 말고, 방금 네가 한 말 되짚고 유저 맥락으로 복귀.`);
    lines.push('');
  }

  // 애매함 있으면 인정
  if (handoff.ambiguity_signals && handoff.ambiguity_signals.length > 0) {
    lines.push(`근데 너도 100% 확신은 아냐:`);
    handoff.ambiguity_signals.forEach((a) => lines.push(`- ${a}`));
    lines.push(`→ 확신 없으면 너도 "잠깐, ~맞아?" 식으로 물어봐도 돼.`);
    lines.push('');
  }

  if (handoff.confidence < 0.7) {
    lines.push(`(좌뇌 자기 확신 ${(handoff.confidence * 100).toFixed(0)}% — 낮음. 네 직감 우선해도 됨)`);
    lines.push('');
  }

  // ── 3단계: 뭘 해줄까? (표현 욕구)
  lines.push(`## 💬 뭘 말해줄까`);
  lines.push('');

  // 페이싱 상태 (지금 어디쯤인지)
  if (handoff.pacing_meta) {
    const pm = handoff.pacing_meta;
    const stateDesc: Record<string, string> = {
      EARLY: '이제 막 듣기 시작. 자연스럽게 더 들어봐.',
      MID: '정보 모이는 중. 좁은 질문 OK.',
      READY: '**카드 충족. 다음 단계 자연 전환 타이밍.**',
      STRETCHED: '약간 길어짐. 부족한 거 직접 물어봐도 됨.',
      FRUSTRATED: '얘 답답해하는 중. 직접 짚어줘.',
    };
    lines.push(`페이싱 감: ${stateDesc[pm.pacing_state] ?? pm.pacing_state}`);
    if (pm.luna_meta_thought) {
      lines.push(`네 메타 생각: "${pm.luna_meta_thought}"`);
    }
    if (pm.phase_transition_recommendation === 'JUMP') {
      lines.push(`→ "그럼 이제 ~얘기해보자" 식 전환 멘트 자연스럽게.`);
    } else if (pm.phase_transition_recommendation === 'WRAP') {
      lines.push(`→ "오늘 여기까지 정리하자" 마무리 톤.`);
    } else if (pm.phase_transition_recommendation === 'PUSH' && pm.direct_question_suggested) {
      lines.push(`→ 직접 질문 녹이기: "${pm.direct_question_suggested}"`);
    }
    lines.push('');
  }

  // 자아 표현 / 질문 과잉
  if (handoff.self_expression) {
    const se = handoff.self_expression;
    if (se.must_avoid_question) {
      lines.push(`⚠️ 너 최근 ${se.consecutive_questions_last3}턴 연속 질문으로 끝냈어. 이번엔 물음표 금지.`);
      if (se.projection_seed) {
        lines.push(`대신 이 장면 그려봐: "${se.projection_seed}"`);
        lines.push(`→ "아 그림 그려진다" 식으로 재연하든, "사실 네가 ~한 건..." 추측형으로 짚든.`);
      } else {
        lines.push(`→ 질문 대신 짚어주기, 공감, 또는 네 생각 한 줄.`);
      }
    } else if (se.should_express_thought && se.projection_seed) {
      lines.push(`장면 시드: "${se.projection_seed}" — 원하면 재연.`);
    }
    if (se.self_disclosure_opportunity) {
      lines.push(`자기 경험 꺼낼 타이밍: "${se.self_disclosure_opportunity}"`);
    }
    lines.push('');
  }

  // 전략적 전환
  if (handoff.strategic_shift?.requires_shift) {
    const s = handoff.strategic_shift;
    lines.push(`전략 바꿔야 함: ${s.current_strategy} → **${s.shift_to ?? '재판단'}**`);
    if (s.reasoning) lines.push(`이유: ${s.reasoning}`);
    lines.push('');
  }

  // 이벤트 추천 (VN 극장 등)
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
    lines.push(`💡 **${rec.suggested}** 이벤트 어울릴 것 같아 (네 확신 ${(rec.confidence * 10).toFixed(0)}/10)`);
    if (rec.reasoning) lines.push(`이유: ${rec.reasoning}`);
    if (tag) lines.push(`발동하려면 응답 끝에 ${tag} 태그.`);
    lines.push(`→ 네가 맥락 봤을 때 어울리면 태그 출력. 이상하면 무시.`);
    lines.push('');
  }

  // 좌뇌의 초안 (참고만)
  lines.push(`## 📝 좌뇌가 떠올린 초안 (참고, 바꿔도 됨)`);
  lines.push(`톤: ${handoff.recommended_tone} · 길이: ${handoff.recommended_length}`);
  lines.push(`초안: "${handoff.draft}"`);
  if (handoff.situation_read) {
    lines.push(`상황 한줄: "${handoff.situation_read}"`);
  }
  if (handoff.luna_thought) {
    lines.push(`네 속마음: "${handoff.luna_thought}"`);
  }
  lines.push('');

  // 피해야 할 말
  if (handoff.avoidances.length > 0) {
    lines.push(`금지: ${handoff.avoidances.map((a) => `"${a}"`).join(', ')} 류 표현`);
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================
// 유틸 (기존 유지)
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
// 🆕 v76: Phase / 친밀도 자연어 설명 (우뇌 프롬프트 자연 주입용)
// ============================================================

/** Phase 코드 → 루나 관점 설명 */
export function describePhaseForLuna(phase: string): string {
  const map: Record<string, string> = {
    HOOK: '방금 얘기 듣기 시작한 상태. 얘가 뭔 상황인지 편하게 들어봐. 너무 깊이 파고들면 부담.',
    MIRROR: '얘 표면 감정 너머의 진짜 마음 같이 들여다보는 중. 깊은 공감 + 자기 관찰 유도.',
    BRIDGE: '얘 상황 충분히 알았어. 같이 뭘 할지 방향 고민하는 중. 해결책 아직 X, 얘 원하는 도움 형태 확인.',
    SOLVE: '구체적 행동 같이 짜는 중. 실행 가능한 것 제안하고 같이 다듬기.',
    EMPOWER: '대화 마무리하는 중. 얘가 오늘 꺼낸 용기 인정하고 다음 만남 여지 남기기.',
  };
  return map[phase] ?? phase;
}

/** 친밀도 Lv.1~5 → 루나 관점 설명 */
export function describeIntimacyForLuna(level: number): string {
  const map: Record<number, string> = {
    1: '아직 거리감 있는 사이. 반말은 쓰지만 자기 개방은 조심. 언니 포지션 유지.',
    2: '조금 편해진 사이. 가끔 농담 던짐. 공감 범위 넓어짐.',
    3: '친한 친구 같은 사이. 자기 경험 자연스럽게 꺼냄. 직설적 조언 OK.',
    4: '속 깊은 얘기 나누는 사이. 침묵도 편함. 얘 패턴 직면해줘도 됨.',
    5: '거의 가족 같은 사이. 반말 + 혼잣말 수준. 뭐든 함께.',
  };
  return map[level] ?? '미확인';
}

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

function describePatternInKorean(pattern: string): string {
  const map: Record<string, string> = {
    response_probing: '반응 탐색 ("나 괜찮지?" = 괜찮다고 말해줘)',
    self_justification: '자기증명 유도 ("내가 예민한가?" = 아니다)',
    permission_seeking: '허락 구하기 ("화내도 돼?" = 당연하지)',
    reassurance_seeking: '안심 구하기 ("안 좋아하는 거 아닐까?" = 아니다)',
    genuine_question: '진짜 질문',
    suppression: '감정 억누름 (말하려다 멈춤)',
    none: '특별한 패턴 없음',
  };
  return map[pattern] ?? pattern;
}

// ============================================================
// 상황 자동 감지 (기존 유지)
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

  const activeCount = handoff.active_signals.length;
  if (activeCount <= 1 && handoff.somatic.gut_reaction.includes('평이')) return 'daily_chat';

  return 'default';
}
