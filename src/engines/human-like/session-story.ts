/**
 * 🆕 v30: Session Story Tracker
 *
 * 세션 전체가 하나의 이야기가 되도록.
 * 매 턴 끝에 "이번에 뭐가 있었는지" 1줄 비트를 코드로 생성.
 * 누적해서 AI에게 "이 대화의 이야기" 컨텍스트로 주입.
 *
 * 이건 규칙이 아니라 정보 — AI가 "여기까지 왔구나"를 알고 자연스럽게 이어감.
 *
 * API 호출: 0 (코드 레벨 키워드 추출)
 * 프롬프트: ~60-80 토큰 (비트 수에 비례)
 */

// ============================================
// Story Beat — 이야기의 한 장면
// ============================================

interface StoryBeat {
  turn: number;
  summary: string;       // "읽씹 때문에 화나서 옴" (20자 이내)
  emotionShift?: string; // "화남 → 불안" (감정 변화 있을 때만)
  isKeyMoment: boolean;  // 중요 순간 (발견, 전환점)
}

// ============================================
// Session Story State
// ============================================

/**
 * 🆕 v30: 상담사 내부 이해 — "이 사람에 대해 지금 이해한 것"
 * 상담사가 머릿속에 갖고 있는 running model. 유저에게 안 보임.
 * AI가 이걸 보고 "다음에 뭘 해야 하는지" 자연스럽게 판단.
 */
interface WorkingFormulation {
  hurtBecause: string;   // 아픈 이유 ("연락 없음이 거절로 느껴짐")
  fears: string;         // 두려워하는 것 ("버려지는 것")
  wants: string;         // 진짜 원하는 것 ("괜찮다는 확인")
  journeyPhase: 'pain' | 'understanding' | 'relief' | 'empowerment';
}

export interface SessionStoryState {
  beats: StoryBeat[];
  currentNarrative: string;
  sessionTheme: string | null;
  formulation: WorkingFormulation; // 🆕 상담사 이해 모델
}

export function createSessionStory(): SessionStoryState {
  return {
    beats: [],
    currentNarrative: '',
    sessionTheme: null,
    formulation: {
      hurtBecause: '',
      fears: '',
      wants: '',
      journeyPhase: 'pain',
    },
  };
}

// ============================================
// 스토리 비트 생성 (코드 레벨, API 0)
// ============================================

/**
 * 유저 메시지 + AI 응답에서 이번 턴의 "스토리 비트"를 추출
 */
export function extractStoryBeat(
  turn: number,
  userMessage: string,
  aiResponse: string,
  prevEmotion: string | null,
  currentEmotion: string,
): StoryBeat {
  const summary = extractBeatSummary(userMessage, aiResponse, turn);

  // 감정 변화 감지
  const emotionShift = prevEmotion && prevEmotion !== currentEmotion
    ? `${EMOTION_KR[prevEmotion] ?? prevEmotion} → ${EMOTION_KR[currentEmotion] ?? currentEmotion}`
    : undefined;

  // 핵심 순간 판단
  const isKeyMoment = detectKeyMoment(userMessage, aiResponse);

  return { turn, summary, emotionShift, isKeyMoment };
}

const EMOTION_KR: Record<string, string> = {
  angry: '화남', sad: '슬픔', happy: '기쁨', anxious: '불안',
  calm: '차분', excited: '신남', affection: '따뜻', worried: '걱정',
  loneliness: '외로움', confusion: '혼란', neutral: '평온',
};

/**
 * 유저 메시지에서 핵심 요약 추출 (20자 이내)
 */
function extractBeatSummary(userMsg: string, aiMsg: string, turn: number): string {
  const u = userMsg;

  // 첫 턴: 유저가 왜 왔는지
  if (turn <= 2) {
    // 핵심 키워드 기반
    if (/헤어|이별/.test(u)) return '이별 고민으로 옴';
    if (/읽씹|잠수/.test(u)) return '연락 문제로 힘들어함';
    if (/바람|외도/.test(u)) return '배신 문제로 상처받음';
    if (/싸[웠움]|다[퉜툼]/.test(u)) return '싸움 후 힘들어함';
    if (/질투|집착/.test(u)) return '질투/집착 문제';
    if (/권태|지겹/.test(u)) return '권태기 고민';
    if (/짝사랑/.test(u)) return '짝사랑 고민';
    return u.slice(0, 15) + (u.length > 15 ? '...' : '');
  }

  // 감정 발견 순간
  if (/맞아|그래|그거야|진짜/.test(u) && /버려|무서|불안|외로|두려/.test(aiMsg)) {
    const emotion = aiMsg.match(/버려|무서|불안|외로|두려|서운|속상/)?.[0];
    return emotion ? `'${emotion}' 감정 인정함` : '핵심 감정 발견';
  }

  // 유저가 질문형 → 조언 요청
  if (/어떡|어떻게|뭐.*해야|해줘/.test(u)) return '조언/도움 요청';

  // 유저 단답 (짧은 동의)
  if (u.length < 8 && /ㅇㅇ|그래|맞아|응/.test(u)) return '동의/수긍';

  // 새 정보 공개
  if (u.length > 40) return '상황 자세히 설명 중';

  // 기본
  return u.slice(0, 15) + (u.length > 15 ? '...' : '');
}

/**
 * 핵심 순간 감지 (감정 발견, 전환점, "아 맞아" 순간)
 */
function detectKeyMoment(userMsg: string, aiMsg: string): boolean {
  // 유저가 핵심 감정을 인정하는 순간
  if (/맞아|그거야|진짜 그래|솔직히/.test(userMsg) &&
      /버려|무서|불안|외로|두려|서운|속상|인정/.test(aiMsg)) {
    return true;
  }
  // 유저가 패턴을 인식하는 순간
  if (/전에도|맨날|또|항상|매번/.test(userMsg)) return true;
  // 유저가 변화 의지를 보이는 순간
  if (/해볼게|해봐야|바꿔|노력/.test(userMsg)) return true;
  return false;
}

// ============================================
// 스토리 업데이트
// ============================================

export function updateSessionStory(
  state: SessionStoryState,
  beat: StoryBeat,
  userMessage?: string,
  aiResponse?: string,
): SessionStoryState {
  const beats = [...state.beats, beat];
  const sessionTheme = state.sessionTheme ?? (beat.turn <= 2 ? beat.summary : null);
  const currentNarrative = generateCurrentNarrative(beats);

  // 🆕 상담사 이해 모델 업데이트 (코드 레벨, API 0)
  const formulation = updateFormulation(state.formulation, userMessage ?? '', aiResponse ?? '', beat);

  return { beats, currentNarrative, sessionTheme, formulation };
}

/**
 * 상담사 이해 모델 업데이트 (키워드 기반, API 0)
 */
function updateFormulation(
  prev: WorkingFormulation,
  userMsg: string,
  aiMsg: string,
  beat: StoryBeat,
): WorkingFormulation {
  const f = { ...prev };

  // hurtBecause — 유저가 아픈 이유 추출
  if (!f.hurtBecause && userMsg.length > 10) {
    if (/읽씹|잠수|연락.*안/.test(userMsg)) f.hurtBecause = '연락 없음이 무시로 느껴짐';
    else if (/헤어|이별/.test(userMsg)) f.hurtBecause = '이별의 아픔';
    else if (/바람|외도/.test(userMsg)) f.hurtBecause = '배신당한 상처';
    else if (/싸[웠움]/.test(userMsg)) f.hurtBecause = '싸움 후 서로에 대한 서운함';
    else if (/지겹|권태/.test(userMsg)) f.hurtBecause = '관계의 무기력함';
    else if (userMsg.length > 20) f.hurtBecause = userMsg.slice(0, 20) + '...';
  }

  // fears — 두려움 감지
  if (/버려|무서|불안|두려|끝날|떠날/.test(userMsg)) {
    const fear = userMsg.match(/버려|무서|불안|두려|끝날|떠날/)?.[0];
    f.fears = fear === '버려' ? '버려지는 것' : fear === '끝날' ? '관계가 끝나는 것' : `${fear}운 감정`;
  }

  // wants — 원하는 것 감지
  if (/어떡|어떻게|해줘|도와/.test(userMsg)) f.wants = f.wants || '도움/방향';
  if (/확인|안심|괜찮/.test(userMsg)) f.wants = '괜찮다는 확인';
  if (/화해|다시|돌아/.test(userMsg)) f.wants = '관계 회복';

  // journeyPhase 자동 전환
  if (beat.isKeyMoment && f.journeyPhase === 'pain') {
    f.journeyPhase = 'understanding';
  }
  if (f.journeyPhase === 'understanding' && /맞아|그거야|솔직히/.test(userMsg)) {
    f.journeyPhase = 'relief';
  }
  if (f.journeyPhase === 'relief' && /해볼게|해봐야|바꿔|노력/.test(userMsg)) {
    f.journeyPhase = 'empowerment';
  }

  return f;
}

/**
 * "→ 지금: ..." 현재 위치 생성
 */
function generateCurrentNarrative(beats: StoryBeat[]): string {
  if (beats.length === 0) return '';
  const last = beats[beats.length - 1];

  // 핵심 순간 이후
  const keyMoments = beats.filter(b => b.isKeyMoment);
  if (keyMoments.length > 0) {
    const lastKey = keyMoments[keyMoments.length - 1];
    return `${lastKey.summary} 이후, 대화 이어가는 중`;
  }

  // 조언 요청 감지
  if (last.summary.includes('조언')) return '해결 방향 같이 찾는 중';

  // 감정 발견 단계
  if (beats.some(b => b.summary.includes('감정'))) return '감정 탐색하면서 대화 이어가는 중';

  // 초반
  if (beats.length <= 3) return '이야기 듣고 있는 중';

  return '대화 이어가는 중';
}

// ============================================
// 프롬프트 생성 (~60-80 토큰)
// ============================================

/**
 * 세션 스토리를 AI 프롬프트에 주입할 텍스트로 변환
 */
/**
 * 🆕 ACE v4: 아직 탐색되지 않은 주제 — 루나가 아직 안 물어본 것
 * journeyPhase와 formulation 기반으로 코드 레벨에서 생성 (API 호출 0)
 */
function buildUnexploredTopics(state: SessionStoryState): string | null {
  const f = state.formulation;
  const topics: string[] = [];

  // 감정 여정 단계에 따라 아직 안 한 것 추정
  if (f.journeyPhase === 'pain') {
    if (!f.hurtBecause) topics.push('아직 핵심 원인을 파악 못함 — 더 들어봐');
    if (!f.fears) topics.push('이 상황에서 두려운 게 뭔지 아직 안 나옴');
  } else if (f.journeyPhase === 'understanding') {
    if (!f.wants) topics.push('유저가 진짜 원하는 게 뭔지 아직 안 물어봄');
    topics.push('상대방 입장은 아직 안 다룸 (필요하면 조심스럽게)');
  } else if (f.journeyPhase === 'relief') {
    topics.push('이런 패턴이 반복되는지 확인 안 함');
    topics.push('유저가 실제로 어떻게 하고 싶은지 아직 안 물어봄');
  }

  // beats에서 등장한 주제를 분석해 빠진 것 추정
  const allSummaries = state.beats.map(b => b.summary).join(' ');
  if (!/상대|걔|남친|여친|파트너/.test(allSummaries) && state.beats.length >= 3) {
    topics.push('상대방에 대한 구체적 정보가 아직 부족');
  }

  if (topics.length === 0) return null;
  return `[아직 탐색 안 된 것]\n${topics.map(t => `- ${t}`).join('\n')}`;
}

export function buildStoryPrompt(state: SessionStoryState): string {
  if (state.beats.length === 0) return '';

  const parts: string[] = ['[이 대화의 흐름]'];

  // 주요 비트만 표시 (최대 5개 — 핵심 순간 우선)
  const keyBeats = state.beats.filter(b => b.isKeyMoment);
  const recentBeats = state.beats.slice(-3);
  const displayBeats = [...new Set([...keyBeats, ...recentBeats])]
    .sort((a, b) => a.turn - b.turn)
    .slice(-5);

  for (const beat of displayBeats) {
    let line = `· ${beat.summary}`;
    if (beat.emotionShift) line += ` (${beat.emotionShift})`;
    if (beat.isKeyMoment) line += ' ★';
    parts.push(line);
  }

  // 현재 위치
  if (state.currentNarrative) {
    parts.push(`→ 지금: ${state.currentNarrative}`);
  }

  // 🆕 ACE v4: 루나의 이해 모델 — 더 풍부하게
  const f = state.formulation;
  if (f.hurtBecause || f.fears || f.wants) {
    parts.push('');
    parts.push('[루나가 이해한 것]');
    if (f.hurtBecause) parts.push(`이 사람이 아픈 이유: ${f.hurtBecause}`);
    if (f.fears) parts.push(`두려워하는 것: ${f.fears}`);
    if (f.wants) parts.push(`진짜 원하는 것: ${f.wants}`);
    if (f.journeyPhase) {
      const journeyDesc: Record<string, string> = {
        pain: '아직 감정을 쏟아내는 중 — 충분히 들어주기',
        understanding: '핵심 감정이 드러나는 중 — 이름 붙여주기',
        relief: '정리가 되면서 안정 찾는 중 — 확인해주기',
        empowerment: '스스로 방향을 잡는 중 — 응원하기',
      };
      parts.push(`감정 여정: ${journeyDesc[f.journeyPhase] ?? f.journeyPhase}`);
    }
  }

  // 🆕 ACE v4: 아직 탐색 안 된 것 — 루나가 아직 안 물어본 것
  const unexplored = buildUnexploredTopics(state);
  if (unexplored) {
    parts.push('');
    parts.push(unexplored);
  }

  // Therefore/But — 매 턴 이전 턴과 인과 연결
  parts.push('');
  parts.push('이번 응답은 반드시 유저가 방금 한 말의 "그래서" 또는 "근데"로 이어져야 해. 뜬금없이 새 주제 꺼내지 마.');

  return parts.join('\n');
}

// ============================================
// 직렬화/역직렬화 (DB 저장용)
// ============================================

export function serializeStory(state: SessionStoryState): string {
  return JSON.stringify(state);
}

export function deserializeStory(json: string | null): SessionStoryState {
  if (!json) return createSessionStory();
  try {
    return JSON.parse(json);
  } catch {
    return createSessionStory();
  }
}
