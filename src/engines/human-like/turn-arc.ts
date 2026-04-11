/**
 * 🆕 v28.9: Turn Arc Tracker — 기승전결 대화 흐름
 *
 * 매 턴이 이전 턴 위에 쌓아가는 자연스러운 대화 흐름 강제.
 * - 이전 턴 요약 추적
 * - 유저 핵심 단어 풀 (echo용)
 * - 아크 위치 자동 계산 (기/승/전/결)
 * - 빌드 프롬프트 생성
 *
 * API 호출: 0 (프롬프트에 ~80토큰 추가)
 */

// ============================================
// 아크 위치
// ============================================

export type ArcPosition = 'INTRO' | 'BUILD' | 'CLIMAX' | 'RESOLVE';

const ARC_LABELS: Record<ArcPosition, string> = {
  INTRO:   '기(起) — 시작, 첫 반응',
  BUILD:   '승(承) — 깊어지는 중, 이전 턴 위에 쌓기',
  CLIMAX:  '전(轉) — 전환점, 핵심 발견',
  RESOLVE: '결(結) — 정리, 다음으로 연결',
};

// ============================================
// 턴 기록
// ============================================

interface TurnRecord {
  turnNumber: number;
  turnType: string;
  phase: string;
  lunaSummary: string;       // 루나가 한 말 요약 (30자)
  userKeywords: string[];    // 유저 핵심 단어
  emotionDepth: number;      // 감정 깊이 (1=겉, 4=핵심)
}

// ============================================
// TurnArc State
// ============================================

export interface TurnArcState {
  previousTurns: TurnRecord[];
  userKeywordPool: string[];   // 전체 세션 키워드 풀
  currentArc: ArcPosition;
  eventBridgeReady: boolean;
}

export function createTurnArcState(): TurnArcState {
  return {
    previousTurns: [],
    userKeywordPool: [],
    currentArc: 'INTRO',
    eventBridgeReady: false,
  };
}

// ============================================
// 아크 위치 계산
// ============================================

export function getArcPosition(turnInPhase: number, maxTurn: number): ArcPosition {
  if (maxTurn <= 1) return 'RESOLVE';
  const ratio = turnInPhase / maxTurn;

  if (ratio <= 0.25) return 'INTRO';
  if (ratio <= 0.6)  return 'BUILD';
  if (ratio <= 0.85) return 'CLIMAX';
  return 'RESOLVE';
}

// ============================================
// 유저 핵심 단어 추출 (코드 레벨, API 0)
// ============================================

export function extractUserKeywords(message: string): string[] {
  const keywords: string[] = [];
  const m = message;

  // 감정어 (가장 중요)
  const emotions = m.match(/화[가나]|짜증|읽씹|잠수|버려|무서|불안|외로|서운|속상|힘[들드]|미치겠|지겹|지침|답답|억울|실망|걱정|두려|슬[퍼프]|분[하한]|열받/g);
  if (emotions) keywords.push(...emotions);

  // 관계 키워드
  const relations = m.match(/남친|여친|남편|와이프|남자친구|여자친구|걔|그[녀놈]|사귀|이별|헤어|바람|외도/g);
  if (relations) keywords.push(...relations);

  // 상대방 행동 (동사구)
  const actions = m.match(/연락.*안|답장.*안|읽씹|잠수|무시|거짓말|소리.*질[렀러]|때[렸리]|욕|명[청칭]|쓰레기/g);
  if (actions) keywords.push(...actions);

  // 시간 표현 ("3일째", "1년")
  const time = m.match(/\d+[일주개월년]|며칠|몇달|오래/g);
  if (time) keywords.push(...time);

  return [...new Set(keywords)].slice(0, 5);
}

// ============================================
// 루나 응답 요약 (30자)
// ============================================

export function summarizeLunaResponse(response: string): string {
  // ||| 로 나뉜 첫 2개 말풍선만
  const bubbles = response.split('|||').map(b => b.trim()).filter(b => b);
  const combined = bubbles.slice(0, 2).join(' ');
  if (combined.length <= 30) return combined;
  return combined.slice(0, 27) + '...';
}

// ============================================
// TurnArc 업데이트
// ============================================

export function updateTurnArc(
  state: TurnArcState,
  turnNumber: number,
  turnType: string,
  phase: string,
  userMessage: string,
  lunaResponse: string | null,
  maxTurnInPhase: number,
  isLastTurn: boolean,
): TurnArcState {
  // 유저 키워드 추출 + 풀에 추가
  const newKeywords = extractUserKeywords(userMessage);
  const updatedPool = [...new Set([...state.userKeywordPool, ...newKeywords])].slice(-10);

  // 감정 깊이 추정
  const depth = estimateEmotionDepth(userMessage, state.previousTurns);

  // 턴 기록 추가
  const record: TurnRecord = {
    turnNumber,
    turnType,
    phase,
    lunaSummary: lunaResponse ? summarizeLunaResponse(lunaResponse) : '',
    userKeywords: newKeywords,
    emotionDepth: depth,
  };

  const updatedTurns = [...state.previousTurns, record].slice(-8); // 최근 8턴만 유지

  // 아크 위치 계산
  const arcPosition = getArcPosition(turnNumber, maxTurnInPhase);

  return {
    previousTurns: updatedTurns,
    userKeywordPool: updatedPool,
    currentArc: arcPosition,
    eventBridgeReady: isLastTurn,
  };
}

// ============================================
// 감정 깊이 추정
// ============================================

function estimateEmotionDepth(message: string, prevTurns: TurnRecord[]): number {
  // 1=겉감정, 2=인정, 3=속감정, 4=핵심
  const m = message;

  // 핵심 감정 표현 (깊이 4)
  if (/버려|무서|두려|외로|수치|부끄|인정.*받|중요.*않|사랑.*않/.test(m)) return 4;

  // 속감정 인정 (깊이 3)
  if (/솔직히|사실|진짜는|맞아|그게.*맞/.test(m)) return 3;

  // 감정 표현 (깊이 2)
  if (/화[가나]|짜증|속상|서운|힘[들드]|불안/.test(m)) return 2;

  // 이전 턴보다 최소 같거나 깊게
  const prevMax = prevTurns.length > 0
    ? Math.max(...prevTurns.map(t => t.emotionDepth))
    : 1;
  return Math.max(1, prevMax);
}

// ============================================
// 빌드 프롬프트 생성 (핵심!)
// ============================================

export function buildArcPrompt(state: TurnArcState): string {
  const parts: string[] = [];

  // 1. 아크 위치
  parts.push(`[대화 흐름: ${ARC_LABELS[state.currentArc]}]`);

  // 2. 이전 턴 요약 (최근 2턴) — AI가 흐름을 이어가도록
  const recent = state.previousTurns.slice(-2);
  if (recent.length > 0) {
    const flow = recent
      .map(t => `Turn${t.turnNumber}(${t.turnType}): "${t.lunaSummary}"`)
      .join(' → ');
    parts.push(`[이전 흐름: ${flow}]`);
  }

  // 3. 유저 핵심 단어 echo 지시
  if (state.userKeywordPool.length > 0) {
    const words = state.userKeywordPool.slice(-3).join(', ');
    parts.push(`[유저가 쓴 핵심 단어: ${words} — 이 단어를 그대로 써. 동의어로 바꾸지 마.]`);
  }

  // 4. 빌드 방향 (아크 위치별)
  parts.push(getBuildDirective(state));

  // 5. 이벤트 브릿지
  if (state.eventBridgeReady) {
    parts.push(`[🎯 이번 턴 마지막에 자연스럽게 이벤트 UI로 연결. "같이 봐볼까?" "한번 확인해볼래?" 느낌. 뜬금없으면 안 됨 — 이전 대화의 자연스러운 결론이어야 해.]`);
  }

  return parts.join('\n');
}

// ============================================
// 아크 위치별 빌드 지시
// ============================================

function getBuildDirective(state: TurnArcState): string {
  const recent = state.previousTurns.slice(-1)[0];
  const prevType = recent?.turnType ?? 'none';

  switch (state.currentArc) {
    case 'INTRO':
      return `[빌드: 첫 반응. 짧고 강하게. 이전 맥락 없으니 리액션에 집중.]`;

    case 'BUILD':
      return `[빌드: 이전 턴(${prevType})에서 한 단계 더 깊이 들어가.
"그래서" "근데" "아 그러니까" 로 시작해서 이전 턴과 연결해.
같은 레벨에서 반복하면 안 됨 — 반드시 한 단계 깊어져야 해.
이전에 루나가 "${recent?.lunaSummary ?? ''}"라고 했으니 거기서 이어가.]`;

    case 'CLIMAX':
      if (state.previousTurns.length >= 2) {
        const first = state.previousTurns[0];
        return `[빌드: 여기가 이 Phase의 감정적 정점.
유저가 처음에 "${first.lunaSummary}"에서 시작했고 지금 여기까지 왔어.
처음과 지금을 연결하는 핵심을 짚어줘.
"여기까지 들어보니까" "아 그래서 진짜" 로 시작.]`;
      }
      return `[빌드: 감정적 정점. 핵심을 짚어줘.]`;

    case 'RESOLVE':
      return `[빌드: 이 Phase의 마무리.
지금까지 대화를 한 문장으로 정리하고, 자연스럽게 다음으로 연결.
새로운 화제 금지 — 이미 나온 얘기만 정리.]`;
  }
}
