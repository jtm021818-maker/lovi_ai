/**
 * 🆕 HLRE v3: Journey Tracker — 감정 여정 자동 추적
 *
 * Phase(HOOK/MIRROR/BRIDGE...) 대신 감정 여정 기반으로 전환.
 * pain → understanding → relief → empowerment
 *
 * 전환 조건은 유저의 실제 반응에 기반 (턴 수가 아님!)
 *
 * API 호출: 0
 */

// ACE: luna-action 의존성 제거
type LunaAction = string | null;

// ============================================
// 감정 여정 단계
// ============================================

export type JourneyPhase = 'pain' | 'understanding' | 'relief' | 'empowerment';

export interface JourneyState {
  phase: JourneyPhase;
  phaseStartTurn: number;
  turnsInPhase: number;
  transitionReason: string | null;
  keyMoments: string[];           // 핵심 발견 순간 기록
  isReady: Record<JourneyPhase, boolean>;  // 각 단계 진입 준비 상태
}

export function createJourneyState(): JourneyState {
  return {
    phase: 'pain',
    phaseStartTurn: 1,
    turnsInPhase: 0,
    transitionReason: null,
    keyMoments: [],
    isReady: {
      pain: true,
      understanding: false,
      relief: false,
      empowerment: false,
    },
  };
}

// ============================================
// 여정 업데이트 — 매 턴 호출
// ============================================

export function updateJourney(
  state: JourneyState,
  turnInSession: number,
  userMessage: string,
  lastLunaAction: LunaAction | null,
): JourneyState {
  const next = { ...state, turnsInPhase: state.turnsInPhase + 1 };

  // 전환 감지
  const transition = detectTransition(next, userMessage, lastLunaAction, turnInSession);
  if (transition) {
    next.phase = transition.to;
    next.phaseStartTurn = turnInSession;
    next.turnsInPhase = 1;
    next.transitionReason = transition.reason;
    next.isReady[transition.to] = true;
  }

  // 핵심 순간 기록
  const keyMoment = detectKeyMoment(userMessage, lastLunaAction);
  if (keyMoment) {
    next.keyMoments = [...state.keyMoments, keyMoment].slice(-5);
  }

  return next;
}

// ============================================
// 전환 조건 감지
// ============================================

interface Transition {
  to: JourneyPhase;
  reason: string;
}

function detectTransition(
  state: JourneyState,
  userMsg: string,
  lastAction: LunaAction | null,
  turn: number,
): Transition | null {
  const phase = state.phase;
  const msg = userMsg.trim();

  // pain → understanding
  if (phase === 'pain') {
    // 유저가 핵심 감정 인정 ("맞아" + 루나가 DIG/NAME 했을 때)
    if (/맞아|그래|그거야|진짜 그래|솔직히/.test(msg)
      && (lastAction === 'DIG_DEEPER' || lastAction === 'NAME_IT' || lastAction === 'REFLECT')) {
      return { to: 'understanding', reason: '유저가 핵심 감정 인정' };
    }
    // 유저가 스스로 속감정 표현 (깊은 감정어)
    if (/솔직히|사실.*은|진짜[는]?.*무서|버려질|외로|두려|수치/.test(msg)) {
      return { to: 'understanding', reason: '유저가 속감정 자발적 표현' };
    }
    // 5턴 이상 pain에서 → 자연스럽게 넘어감
    if (state.turnsInPhase >= 5 && turn >= 5) {
      return { to: 'understanding', reason: '충분히 들었음 (5턴+)' };
    }
  }

  // understanding → relief
  if (phase === 'understanding') {
    // 유저가 깨달음 순간 ("아 그래서 그랬구나")
    if (/아.*그래서|그래서.*그런|그거였[구어]?나|이제.*알겠|그랬구나/.test(msg)) {
      return { to: 'relief', reason: '유저가 깨달음 순간' };
    }
    // 유저가 편해진 신호
    if (/좀.*편[해하]|나아[졌진]|덜.*힘[들드]|말하니까.*나[아은]/.test(msg)) {
      return { to: 'relief', reason: '유저가 편해진 신호' };
    }
    // 4턴 이상 understanding → 넘어감
    if (state.turnsInPhase >= 4) {
      return { to: 'relief', reason: '이해 충분 (4턴+)' };
    }
  }

  // relief → empowerment
  if (phase === 'relief') {
    // 유저가 행동 의지 ("해볼게" "바꿔야지")
    if (/해볼[게래]|해봐야|바꿔[야볼]|노력|방법.*있|어떻게.*하[면자]/.test(msg)) {
      return { to: 'empowerment', reason: '유저가 행동 의지 표현' };
    }
    // 유저가 조언 요청
    if (/어떡|어떻게|뭐.*해야|알려줘|도와줘/.test(msg)) {
      return { to: 'empowerment', reason: '유저가 조언 요청' };
    }
    // 3턴 이상 relief → 넘어감
    if (state.turnsInPhase >= 3) {
      return { to: 'empowerment', reason: 'relief 충분 (3턴+)' };
    }
  }

  return null;
}

// ============================================
// 핵심 순간 감지
// ============================================

function detectKeyMoment(userMsg: string, lastAction: LunaAction | null): string | null {
  // 유저가 핵심 감정 인정
  if (/맞아|그거야|진짜 그래|솔직히/.test(userMsg)
    && (lastAction === 'DIG_DEEPER' || lastAction === 'NAME_IT')) {
    return `감정 인정: "${userMsg.slice(0, 15)}..."`;
  }
  // 유저가 패턴 인식
  if (/전에도|맨날|또|항상|매번|again/.test(userMsg)) {
    return `패턴 인식: "${userMsg.slice(0, 15)}..."`;
  }
  // 유저가 변화 의지
  if (/해볼게|해봐야|바꿔|노력|시도/.test(userMsg)) {
    return `변화 의지: "${userMsg.slice(0, 15)}..."`;
  }
  return null;
}

// ============================================
// 여정 프롬프트 생성
// ============================================

const JOURNEY_HINTS: Record<JourneyPhase, string> = {
  pain: '지금은 충분히 듣기. 해결책은 절대 말하지 마. 감정을 받아줘.',
  understanding: '겉감정 아래를 탐색하는 중. 유저가 스스로 발견하도록.',
  relief: '이해가 생기면서 좀 가벼워지는 중. 이 이해를 확고히 해줘.',
  empowerment: '뭘 할 수 있는지 같이 찾기. 유저가 답을 찾게 도와.',
};

export function buildJourneyPrompt(state: JourneyState): string {
  const parts: string[] = [];
  parts.push(`[감정 여정: ${state.phase}] ${JOURNEY_HINTS[state.phase]}`);

  if (state.keyMoments.length > 0) {
    const recent = state.keyMoments.slice(-2).join(', ');
    parts.push(`[핵심 순간] ${recent}`);
  }

  return parts.join('\n');
}
