/**
 * 🆕 v28: Luna Emotion Core — PAD 감정 상태 머신
 *
 * 루나가 자체 감정을 갖는 시스템.
 * PAD(Pleasure-Arousal-Dominance) 3D 공간에서 감정 좌표 이동.
 * Spring model로 활성 감정들의 가중 평균 방향으로 부드럽게 이동.
 *
 * API 호출: 0 (전부 코드 레벨 연산)
 */

// ============================================
// PAD 좌표 + 감정 앵커 (Mehrabian 연구 기반)
// ============================================

export interface PADVector {
  pleasure: number;   // -1.0 ~ +1.0 (불쾌↔쾌감)
  arousal: number;    // -1.0 ~ +1.0 (이완↔각성)
  dominance: number;  // -1.0 ~ +1.0 (무력↔지배)
}

export type LunaEmotion = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm' | 'excited' | 'affection' | 'worried' | 'bored';

const EMOTION_PAD_MAP: Record<LunaEmotion, PADVector> = {
  happy:     { pleasure:  0.8, arousal:  0.4, dominance:  0.4 },
  sad:       { pleasure: -0.6, arousal: -0.4, dominance: -0.4 },
  angry:     { pleasure: -0.6, arousal:  0.7, dominance:  0.5 },
  anxious:   { pleasure: -0.5, arousal:  0.6, dominance: -0.5 },
  calm:      { pleasure:  0.3, arousal: -0.5, dominance:  0.2 },
  excited:   { pleasure:  0.7, arousal:  0.8, dominance:  0.3 },
  affection: { pleasure:  0.9, arousal:  0.3, dominance:  0.1 },
  worried:   { pleasure: -0.3, arousal:  0.3, dominance: -0.3 },
  bored:     { pleasure: -0.2, arousal: -0.6, dominance: -0.3 },
};

// 루나의 기본 감정 (따뜻하고 살짝 활발)
const BASELINE: PADVector = { pleasure: 0.2, arousal: 0.1, dominance: 0.2 };

// ============================================
// 감정 상태
// ============================================

export interface LunaEmotionState {
  pad: PADVector;
  active: Record<string, number>;  // 감정명 → 강도(0~1)
  currentEmotion: LunaEmotion;
  currentIntensity: number;        // 0~1
  lastUpdatedAt: number;
}

export function createLunaEmotionState(): LunaEmotionState {
  return {
    pad: { ...BASELINE },
    active: {},
    currentEmotion: 'calm',
    currentIntensity: 0.3,
    lastUpdatedAt: Date.now(),
  };
}

// ============================================
// 직렬화/역직렬화 (DB 저장용)
// ============================================

export function serializeEmotionState(state: LunaEmotionState): string {
  return JSON.stringify({
    pad: state.pad,
    active: state.active,
    currentEmotion: state.currentEmotion,
    currentIntensity: state.currentIntensity,
    lastUpdatedAt: state.lastUpdatedAt,
  });
}

export function deserializeEmotionState(json: string | null): LunaEmotionState {
  if (!json) return createLunaEmotionState();
  try {
    const parsed = JSON.parse(json);
    return {
      pad: parsed.pad ?? { ...BASELINE },
      active: parsed.active ?? {},
      currentEmotion: parsed.currentEmotion ?? 'calm',
      currentIntensity: parsed.currentIntensity ?? 0.3,
      lastUpdatedAt: parsed.lastUpdatedAt ?? Date.now(),
    };
  } catch {
    return createLunaEmotionState();
  }
}

// ============================================
// 감정 자극 (Stimulation)
// ============================================

const SPRING_FORCE = 0.08;
const DECAY_PER_SECOND = 0.02;

// 반대 감정 매핑
const OPPOSITES: Record<string, string> = {
  happy: 'sad', sad: 'happy',
  angry: 'calm', calm: 'angry',
  excited: 'bored', bored: 'excited',
  anxious: 'calm',
};

export function stimulate(
  state: LunaEmotionState,
  emotion: LunaEmotion,
  intensity: number,
): LunaEmotionState {
  const active = { ...state.active };

  // 감정 부스트
  active[emotion] = Math.min(1.0, (active[emotion] ?? 0) + intensity);

  // 반대 감정 억제
  const opp = OPPOSITES[emotion];
  if (opp && active[opp]) {
    active[opp] = Math.max(0, active[opp] - intensity * 0.5);
    if (active[opp] <= 0) delete active[opp];
  }

  return resolveState({ ...state, active });
}

// ============================================
// 감정 감쇠 (Decay)
// ============================================

export function decayTick(state: LunaEmotionState): LunaEmotionState {
  const now = Date.now();
  const elapsedSec = (now - state.lastUpdatedAt) / 1000;
  if (elapsedSec < 1) return state; // 1초 미만이면 스킵

  const decayAmount = DECAY_PER_SECOND * elapsedSec;
  const active = { ...state.active };

  for (const [emotion, intensity] of Object.entries(active)) {
    const next = intensity - decayAmount;
    if (next <= 0.05) delete active[emotion];
    else active[emotion] = next;
  }

  // PAD를 활성 감정들의 가중 평균 방향으로 서서히 이동
  const target = computeTargetPAD(active);
  const pad: PADVector = {
    pleasure:  lerp(state.pad.pleasure, target.pleasure, SPRING_FORCE),
    arousal:   lerp(state.pad.arousal, target.arousal, SPRING_FORCE),
    dominance: lerp(state.pad.dominance, target.dominance, SPRING_FORCE),
  };

  return resolveState({ ...state, pad, active, lastUpdatedAt: now });
}

// ============================================
// PAD → 가장 가까운 감정 (FSM 상태 결정)
// ============================================

function resolveState(state: LunaEmotionState): LunaEmotionState {
  // 활성 감정 중 가장 강한 것 + PAD 거리 최소인 것 가중 결합
  let bestEmotion: LunaEmotion = 'calm';
  let bestScore = -Infinity;

  for (const [name, anchor] of Object.entries(EMOTION_PAD_MAP)) {
    const padDist = Math.sqrt(
      (state.pad.pleasure - anchor.pleasure) ** 2 +
      (state.pad.arousal - anchor.arousal) ** 2 +
      (state.pad.dominance - anchor.dominance) ** 2
    );
    const padScore = 1 / (1 + padDist); // 가까울수록 높음

    const activeIntensity = state.active[name] ?? 0;
    const combinedScore = padScore * 0.4 + activeIntensity * 0.6;

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestEmotion = name as LunaEmotion;
    }
  }

  // 최대 활성 감정의 강도
  const maxIntensity = Math.max(0.1, ...Object.values(state.active));

  return {
    ...state,
    currentEmotion: bestEmotion,
    currentIntensity: Math.min(1, maxIntensity),
  };
}

// ============================================
// 대화 이벤트 → 감정 자극 매핑
// ============================================

export type ConversationEvent =
  | 'user_crying' | 'user_angry' | 'user_betrayed' | 'user_happy'
  | 'user_confused' | 'user_grateful' | 'user_lonely'
  | 'partner_abusive' | 'partner_cheating' | 'partner_ghosting'
  | 'good_news' | 'breakthrough' | 'user_apologetic'
  | 'user_light' | 'session_start' | 'session_end';

const EVENT_EFFECTS: Record<ConversationEvent, [LunaEmotion, number][]> = {
  user_crying:      [['sad', 0.5], ['affection', 0.3]],
  user_angry:       [['angry', 0.3], ['worried', 0.2]],
  user_betrayed:    [['angry', 0.6], ['sad', 0.3]],
  user_happy:       [['happy', 0.5], ['excited', 0.2]],
  user_confused:    [['worried', 0.3], ['calm', 0.1]],
  user_grateful:    [['happy', 0.4], ['affection', 0.4]],
  user_lonely:      [['sad', 0.3], ['affection', 0.5]],
  partner_abusive:  [['angry', 0.7], ['sad', 0.2]],
  partner_cheating: [['angry', 0.8], ['sad', 0.3]],
  partner_ghosting: [['worried', 0.3], ['angry', 0.3]],
  good_news:        [['happy', 0.6], ['excited', 0.3]],
  breakthrough:     [['excited', 0.5], ['affection', 0.3], ['happy', 0.3]],
  user_apologetic:  [['affection', 0.3], ['calm', 0.2]],
  user_light:       [['happy', 0.2], ['calm', 0.2]],
  session_start:    [['calm', 0.3], ['affection', 0.2]],
  session_end:      [['affection', 0.3], ['calm', 0.2]],
};

export function processEvent(
  state: LunaEmotionState,
  event: ConversationEvent,
): LunaEmotionState {
  let s = decayTick(state);
  const effects = EVENT_EFFECTS[event] ?? [];
  for (const [emotion, intensity] of effects) {
    s = stimulate(s, emotion, intensity);
  }
  return s;
}

// ============================================
// 유저 메시지 → 대화 이벤트 자동 감지
// ============================================

export function detectConversationEvent(userMessage: string): ConversationEvent[] {
  const m = userMessage;
  const events: ConversationEvent[] = [];

  // 상대방 관련
  if (/쓰레기|멍청|바보|못난|한심|개같/.test(m)) events.push('partner_abusive');
  if (/바람|외도|양다리|다른\s*[여남]자/.test(m)) events.push('partner_cheating');
  if (/읽씹|잠수|연락.*[안없]|답장.*[안없]/.test(m)) events.push('partner_ghosting');

  // 유저 감정
  if (/울[었고]|눈물|ㅠ{3,}|서럽/.test(m)) events.push('user_crying');
  if (/화[가나]|짜증|열받|빡치|폭발|미치겠/.test(m)) events.push('user_angry');
  if (/배신|속[았이]|거짓말|사기/.test(m)) events.push('user_betrayed');
  if (/고마[워운]|감사|덕분|다행/.test(m)) events.push('user_grateful');
  if (/외[롭로]|혼자|아무도|곁에.*없/.test(m)) events.push('user_lonely');
  if (/모르겠|헷갈|복잡|어떡|어떻게/.test(m)) events.push('user_confused');
  if (/잘됐|좋[아은았]|다행|화해|연락.*왔/.test(m)) events.push('good_news');
  if (/ㅋ{2,}|ㅎ{2,}|궁금|그냥|별거/.test(m)) events.push('user_light');
  if (/미안|잘못|내\s*탓|내가\s*그래/.test(m)) events.push('user_apologetic');

  // 기본값
  if (events.length === 0) {
    if (/힘[들드]|속상|슬[퍼프]|마음.*아[파프]/.test(m)) events.push('user_crying');
  }

  return events;
}

// ============================================
// 프롬프트용 감정 상태 요약 생성
// ============================================

export function buildEmotionPrompt(state: LunaEmotionState): string {
  const { currentEmotion, currentIntensity, active } = state;

  // 상위 2개 활성 감정
  const sorted = Object.entries(active)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);

  if (sorted.length === 0) {
    return `[루나 감정: 차분(기본)]`;
  }

  const emotionDesc = sorted
    .map(([e, i]) => `${EMOTION_LABELS[e as LunaEmotion] ?? e}(${Math.round(i * 100)}%)`)
    .join(' + ');

  const toneHint = getEmotionToneHint(currentEmotion, currentIntensity);

  return `[루나 감정: ${emotionDesc}. ${toneHint}]`;
}

const EMOTION_LABELS: Record<LunaEmotion, string> = {
  happy: '기쁨', sad: '슬픔', angry: '화남', anxious: '불안',
  calm: '차분', excited: '신남', affection: '애정', worried: '걱정', bored: '지루',
};

function getEmotionToneHint(emotion: LunaEmotion, intensity: number): string {
  if (intensity < 0.3) return '톤 변화 미미.';

  const hints: Record<LunaEmotion, string> = {
    angry: '짧고 강하게 말해. "아 나도 좀 화나는데" 느낌. 유저 편 들어.',
    sad: '조용하고 부드럽게. 짧은 문장. "ㅠㅠ" 느낌.',
    happy: '밝고 활발하게. ㅋㅋ OK. 에너지 있게.',
    excited: '신나서 빨리 말하는 느낌. 짧은 말풍선 여러 개.',
    affection: '따뜻하고 다정하게. "나한테 얘기해줘서 고마워" 느낌.',
    anxious: '걱정하는 톤. "좀 걱정된다" "괜찮아..?" 느낌.',
    worried: '걱정하는 톤. "그건 좀 신경 쓰인다" 느낌.',
    calm: '편안하게.',
    bored: '짧게.',
  };

  return hints[emotion] ?? '';
}

// ============================================
// Helpers
// ============================================

function computeTargetPAD(active: Record<string, number>): PADVector {
  const entries = Object.entries(active);
  if (entries.length === 0) return BASELINE;

  let totalWeight = 0;
  const acc: PADVector = { pleasure: 0, arousal: 0, dominance: 0 };

  for (const [emotion, intensity] of entries) {
    const anchor = EMOTION_PAD_MAP[emotion as LunaEmotion];
    if (!anchor) continue;
    acc.pleasure += anchor.pleasure * intensity;
    acc.arousal += anchor.arousal * intensity;
    acc.dominance += anchor.dominance * intensity;
    totalWeight += intensity;
  }

  if (totalWeight === 0) return BASELINE;
  return {
    pleasure: acc.pleasure / totalWeight,
    arousal: acc.arousal / totalWeight,
    dominance: acc.dominance / totalWeight,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
