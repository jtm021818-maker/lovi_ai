/**
 * 🆕 v28.6: Phase Signal — AI 판단 태그 파싱 + 코드 휴리스틱
 *
 * AI 응답 끝에 [PHASE_SIGNAL:STAY/READY/URGENT] 태그를 파싱.
 * + 유저 메시지 기반 코드 레벨 보조 판단.
 * 둘을 합쳐서 Phase 전환 여부 결정.
 *
 * 추가 API 호출: 0 (같은 Gemini 응답에서 추출)
 */

// ============================================
// AI 판단 태그 파싱
// ============================================

export type PhaseSignal = 'STAY' | 'READY' | 'URGENT';

const SIGNAL_REGEX = /\[PHASE_SIGNAL:(STAY|READY|URGENT)\]\s*/;
// 🆕 ACE v4: 마음읽기 준비 태그 — AI가 "파악됐다"고 판단하면 출력
const MIND_READ_REGEX = /\[MIND_READ_READY\]\s*/;
// 🆕 v4: 상황 파악 태그 — [SITUATION_CLEAR:상황요약|핵심문제]
// 🆕 v78.7: LLM 이 `|` 없이 `키=값` 자유형식으로도 낼 수 있음 → strict + lenient 2단
const SITUATION_CLEAR_REGEX = /\[SITUATION_CLEAR:([^|]+)\|([^\]]+)\]\s*/;
const SITUATION_CLEAR_LENIENT = /\[SITUATION_CLEAR:([^\]]+)\]\s*/;
// 🆕 ACE v4: 루나 이야기 준비 태그 — [STORY_READY:opener|situation|innerThought|cliffhanger]
// AI가 자기개방으로 "나도 비슷한 거 겪어봤거든" 이야기를 생성하면 출력
const STORY_READY_REGEX = /\[STORY_READY:([^|\]]+)\|([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\s*/;
// 🆕 ACE v4: 루나 작전회의 준비 태그
//   🆕 v82.11: 2필드 (opener|situation) 로 축소 — hook 3개 optional (하위 호환)
//   전체 형식: [STRATEGY_READY:opener|situation] 또는 [STRATEGY_READY:opener|situation|draftHook|roleplayHook|panelHook]
const STRATEGY_READY_REGEX = /\[STRATEGY_READY:([^|\]]+)\|([^|\]]+)(?:\|([^|\]]*))?(?:\|([^|\]]*))?(?:\|([^\]]*))?\]\s*/;

// 🆕 v35: 모드별 SOLVE 태그
// 💬 톤 선택: [TONE_SELECT:부드럽게|솔직하게|단호하게]
const TONE_SELECT_REGEX = /\[TONE_SELECT:([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\s*/;
// 💬 초안 카드: [DRAFT_CARD:A|톤|텍스트|의도] (3번 반복 — global)
const DRAFT_CARD_REGEX = /\[DRAFT_CARD:([ABC])\|([^|\]]+)\|([^|\]]+)\|([^\]]+)\]/g;
// 🎭 롤플레이 in-character 진입/퇴장
const RP_IN_REGEX = /\[RP_IN\]\s*/;
const RP_OUT_REGEX = /\[RP_OUT\]\s*/;
// 🎭 피드백: [ROLEPLAY_FEEDBACK:잘한점|조심할점|팁]
const ROLEPLAY_FEEDBACK_REGEX = /\[ROLEPLAY_FEEDBACK:([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\s*/;
// 🍿 연참 리포트: [PANEL_REPORT]...[/PANEL_REPORT]
const PANEL_REPORT_REGEX = /\[PANEL_REPORT\]([\s\S]*?)\[\/PANEL_REPORT\]\s*/;
// 🤔 아이디어: [IDEA_REFINE:원래|다듬은|이유]
const IDEA_REFINE_REGEX = /\[IDEA_REFINE:([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\s*/;
// 🆕 v39: 🎯 오늘의 작전: [ACTION_PLAN:planType|title|coreAction|sharedResult|planB|timingHint|lunaCheer]
// 7개 필드 — planB/timingHint는 비어있을 수 있음 (빈 문자열 허용)
const ACTION_PLAN_REGEX = /\[ACTION_PLAN:([^|\]]+)\|([^|\]]+)\|([^|\]]+)\|([^|\]]+)\|([^|\]]*)\|([^|\]]*)\|([^\]]+)\]\s*/;
// 🆕 v39: 💜 오늘의 마무리: [WARM_WRAP:strengthFound|emotionShift|nextStep|lunaMessage]
const WARM_WRAP_REGEX = /\[WARM_WRAP:([^|\]]+)\|([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\s*/;
// 🆕 v40: 🧠 딥리서치 요청: [THINKING_DEEP:keyword]
//  AI가 "이건 더 깊이 생각해야겠다" 판단 시 출력 → 다음 턴에 Gemini Grounding 실행
const THINKING_DEEP_REGEX = /\[THINKING_DEEP:([^\]]+)\]\s*/;
// 🆕 v36: 루나의 상황 인식 — [SITUATION_READ:한 줄 상황 요약]
const SITUATION_READ_REGEX = /\[SITUATION_READ:([^\]]+)\]\s*/;
// 🆕 v36: 루나의 속마음 — [LUNA_THOUGHT:한 줄 속마음]
const LUNA_THOUGHT_REGEX = /\[LUNA_THOUGHT:([^\]]+)\]\s*/;

// 🆕 v81: BRIDGE 몰입 모드 완료 — [OPERATION_COMPLETE:mode|summary|next_step]
//   mode: roleplay|draft|panel|tone|idea
//   summary: Luna 가 내린 한 줄 요약
//   next_step: (선택) 다음 단계 힌트
const OPERATION_COMPLETE_REGEX = /\[OPERATION_COMPLETE:([a-z_]+)\|([^|\]]+)(?:\|([^\]]+))?\]\s*/i;

// 🆕 v84: 🎵 노래 추천 — [SONG_READY:mood|context|preference]
//   루나가 맥락 판단으로 인터넷 검색 기반 노래 추천을 발동하고 싶을 때.
//   3번째 필드(preference) 는 선택.
const SONG_READY_REGEX = /\[SONG_READY:([^|\]]+)\|([^|\]]+)(?:\|([^\]]*))?\]\s*/;

// 🆕 v84: 📍 데이트 장소 — [DATE_SPOT_READY:area|vibe|requirements]
const DATE_SPOT_READY_REGEX = /\[DATE_SPOT_READY:([^|\]]+)\|([^|\]]+)(?:\|([^\]]*))?\]\s*/;

export interface ParsedOperationComplete {
  mode: string;
  summary: string;
  nextStep?: string;
}

// 🆕 v84: 노래 추천 태그 파싱 데이터
export interface ParsedSongReadyData {
  mood: string;
  context: string;
  preference?: string;
}

// 🆕 v84: 데이트 장소 추천 태그 파싱 데이터
export interface ParsedDateSpotReadyData {
  area: string;
  vibe: string;
  requirements?: string;
}

/** 🆕 ACE v4: 루나 이야기 데이터 (AI 응답에서 파싱) */
export interface ParsedStoryData {
  opener: string;
  situation: string;
  innerThought: string;
  cliffhanger: string;
}

/** 🆕 ACE v4: 루나 작전회의 데이터 (AI 응답에서 파싱) */
export interface ParsedStrategyData {
  opener: string;            // "자 이제 작전 짜자 🔥"
  situationSummary: string;  // "지금 ~한 상태인 거잖아"
  draftHook: string;         // "걔한테 보낼 카톡 같이 만들어볼까?"
  roleplayHook: string;      // "내가 걔 역할 해줄게, 한번 연습해봐"
  panelHook: string;         // "객관적으로 한번 정리해줄까?"
}

// 🆕 v35: 모드별 SOLVE 파싱 데이터
export interface ParsedToneSelectData {
  soft: string;
  honest: string;
  direct: string;
}

export interface ParsedDraftCard {
  version: 'A' | 'B' | 'C';
  tone: string;
  text: string;
  intent: string;
}

export interface ParsedRoleplayFeedback {
  strengths: string;   // "잘한점1,잘한점2" (콤마 구분)
  improvements: string; // "조심할점"
  tip: string;
}

export interface ParsedPanelReport {
  situationSummary: string;
  strengths: string[];  // 콤마 구분된 강점 목록
  cautions: string[];   // 콤마 구분된 주의 목록
  lunaVerdict: string;  // 한 마디
}

export interface ParsedIdeaRefine {
  original: string;
  refined: string;
  reason: string;
}

// 🆕 v39: 🎯 ACTION_PLAN 파싱 데이터
export interface ParsedActionPlan {
  planType: string;       // kakao_draft | roleplay | panel | custom
  title: string;
  coreAction: string;
  sharedResult: string;
  planB: string;          // 빈 문자열 가능
  timingHint: string;     // 빈 문자열 가능
  lunaCheer: string;
}

// 🆕 v39: 💜 WARM_WRAP 파싱 데이터
export interface ParsedWarmWrap {
  strengthFound: string;
  emotionShift: string;
  nextStep: string;
  lunaMessage: string;
}

/** 🆕 v35: [PANEL_REPORT]...[/PANEL_REPORT] 내부 파서 */
function parsePanelReportBody(body: string): ParsedPanelReport {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  const result: ParsedPanelReport = {
    situationSummary: '',
    strengths: [],
    cautions: [],
    lunaVerdict: '',
  };
  for (const line of lines) {
    if (line.startsWith('상황:')) result.situationSummary = line.replace(/^상황:\s*/, '').trim();
    else if (line.startsWith('강점:')) result.strengths = line.replace(/^강점:\s*/, '').split(',').map(s => s.trim()).filter(Boolean);
    else if (line.startsWith('주의:')) result.cautions = line.replace(/^주의:\s*/, '').split(',').map(s => s.trim()).filter(Boolean);
    else if (line.startsWith('한마디:')) result.lunaVerdict = line.replace(/^한마디:\s*/, '').trim();
  }
  return result;
}

/**
 * AI 응답에서 [PHASE_SIGNAL:...] 태그를 추출하고 제거
 */
export function parsePhaseSignal(response: string): {
  cleanResponse: string;
  signal: PhaseSignal | null;
  mindReadReady: boolean;
  storyData: ParsedStoryData | null;
  strategyData: ParsedStrategyData | null;
  // 🆕 v35: 모드별 SOLVE 데이터
  toneSelectData: ParsedToneSelectData | null;
  draftCards: ParsedDraftCard[] | null;
  rpIn: boolean;
  rpOut: boolean;
  roleplayFeedback: ParsedRoleplayFeedback | null;
  panelReport: ParsedPanelReport | null;
  ideaRefine: ParsedIdeaRefine | null;
  // 🆕 v39: SOLVE/EMPOWER 재설계 태그
  actionPlan: ParsedActionPlan | null;
  warmWrap: ParsedWarmWrap | null;
  // 🆕 v40: 딥리서치 요청 (다음 턴 Grounding 트리거)
  thinkingDeepKeyword: string | null;
  // 🆕 v36: 루나 인사이트 태그
  situationRead: string | null;
  lunaThought: string | null;
  // 🆕 v4: 상황 파악 카드 데이터
  situationSummary: string | null;
  coreProblem: string | null;
  // 🆕 v81: BRIDGE 몰입 모드 완료 태그
  operationComplete: ParsedOperationComplete | null;
  // 🆕 v84: 인터넷 검색 발동 태그 (루나 자율 판단)
  songReady: ParsedSongReadyData | null;
  dateSpotReady: ParsedDateSpotReadyData | null;
} {
  let cleaned = response;

  // 🆕 v4: [SITUATION_CLEAR:상황|문제] 태그 감지 + 파싱 + 제거
  // 🆕 v78.7: `|` 없는 자유형식도 허용. 파싱 실패해도 태그는 반드시 제거해서 UI 노출 방지.
  let situationSummary: string | null = null;
  let coreProblem: string | null = null;
  const sitClearStrict = cleaned.match(SITUATION_CLEAR_REGEX);
  if (sitClearStrict) {
    situationSummary = sitClearStrict[1].trim();
    coreProblem = sitClearStrict[2].trim();
    cleaned = cleaned.replace(SITUATION_CLEAR_REGEX, '').trim();
    console.log(`[PhaseSignal] 📋 상황파악: "${situationSummary}" | 핵심: "${coreProblem}"`);
  } else {
    const sitClearLenient = cleaned.match(SITUATION_CLEAR_LENIENT);
    if (sitClearLenient) {
      // 파이프 없는 자유형식: 전체를 situationSummary 로, coreProblem 은 null
      situationSummary = sitClearLenient[1].trim();
      coreProblem = null;
      cleaned = cleaned.replace(SITUATION_CLEAR_LENIENT, '').trim();
      console.log(`[PhaseSignal] 📋 상황파악(lenient): "${situationSummary}"`);
    }
  }
  // 🆕 v78.7: 혹시 남아있는 모든 SITUATION_CLEAR 변형 태그 강제 제거 (UI 노출 방어선)
  cleaned = cleaned.replace(/\[SITUATION_CLEAR[^\]]*\]/gi, '').trim();
  const sitClearMatch = sitClearStrict ?? cleaned.match(SITUATION_CLEAR_LENIENT);

  // 🆕 ACE v4: [MIND_READ_READY] 태그 감지 + 제거 (하위 호환 유지)
  // SITUATION_CLEAR가 있으면 mindReadReady도 true로 설정 (게이트 호환)
  const mindReadReady = MIND_READ_REGEX.test(cleaned) || !!sitClearMatch;
  if (MIND_READ_REGEX.test(cleaned)) {
    cleaned = cleaned.replace(MIND_READ_REGEX, '').trim();
  }

  // 🆕 ACE v4: [STORY_READY:...] 태그 감지 + 파싱 + 제거
  let storyData: ParsedStoryData | null = null;
  const storyMatch = cleaned.match(STORY_READY_REGEX);
  if (storyMatch) {
    storyData = {
      opener: storyMatch[1].trim(),
      situation: storyMatch[2].trim(),
      innerThought: storyMatch[3].trim(),
      cliffhanger: storyMatch[4].trim(),
    };
    cleaned = cleaned.replace(STORY_READY_REGEX, '').trim();
  }

  // 🆕 ACE v4: [STRATEGY_READY:...] 태그 감지 + 파싱 + 제거
  //   🆕 v82.11: 2필드 기본 / hook 필드는 optional. Luna 가 UI 레벨에서 전략 자동 선택하므로 hook 내용 불필요.
  let strategyData: ParsedStrategyData | null = null;
  const strategyMatch = cleaned.match(STRATEGY_READY_REGEX);
  if (strategyMatch) {
    strategyData = {
      opener: (strategyMatch[1] ?? '').trim(),
      situationSummary: (strategyMatch[2] ?? '').trim(),
      draftHook: (strategyMatch[3] ?? '').trim(),
      roleplayHook: (strategyMatch[4] ?? '').trim(),
      panelHook: (strategyMatch[5] ?? '').trim(),
    };
    cleaned = cleaned.replace(STRATEGY_READY_REGEX, '').trim();
  }

  // 🆕 v35: 💬 [TONE_SELECT:...] 톤 선택 태그
  let toneSelectData: ParsedToneSelectData | null = null;
  const toneMatch = cleaned.match(TONE_SELECT_REGEX);
  if (toneMatch) {
    toneSelectData = {
      soft: toneMatch[1].trim(),
      honest: toneMatch[2].trim(),
      direct: toneMatch[3].trim(),
    };
    cleaned = cleaned.replace(TONE_SELECT_REGEX, '').trim();
  }

  // 🆕 v35: 💬 [DRAFT_CARD:...] 초안 3개 태그 (global)
  let draftCards: ParsedDraftCard[] | null = null;
  const draftMatches = [...cleaned.matchAll(DRAFT_CARD_REGEX)];
  if (draftMatches.length > 0) {
    draftCards = draftMatches.map(m => ({
      version: m[1] as 'A' | 'B' | 'C',
      tone: m[2].trim(),
      text: m[3].trim(),
      intent: m[4].trim(),
    }));
    // 모든 DRAFT_CARD 태그 제거
    cleaned = cleaned.replace(DRAFT_CARD_REGEX, '').trim();
  }

  // 🆕 v35: 🎭 [RP_IN] / [RP_OUT] 롤플레이 상태 전환
  const rpIn = RP_IN_REGEX.test(cleaned);
  if (rpIn) cleaned = cleaned.replace(RP_IN_REGEX, '').trim();
  const rpOut = RP_OUT_REGEX.test(cleaned);
  if (rpOut) cleaned = cleaned.replace(RP_OUT_REGEX, '').trim();

  // 🆕 v35: 🎭 [ROLEPLAY_FEEDBACK:...] 피드백 태그
  let roleplayFeedback: ParsedRoleplayFeedback | null = null;
  const feedbackMatch = cleaned.match(ROLEPLAY_FEEDBACK_REGEX);
  if (feedbackMatch) {
    roleplayFeedback = {
      strengths: feedbackMatch[1].trim(),
      improvements: feedbackMatch[2].trim(),
      tip: feedbackMatch[3].trim(),
    };
    cleaned = cleaned.replace(ROLEPLAY_FEEDBACK_REGEX, '').trim();
  }

  // 🆕 v35: 🍿 [PANEL_REPORT]...[/PANEL_REPORT] 연참 리포트 태그
  let panelReport: ParsedPanelReport | null = null;
  const panelMatch = cleaned.match(PANEL_REPORT_REGEX);
  if (panelMatch) {
    panelReport = parsePanelReportBody(panelMatch[1]);
    cleaned = cleaned.replace(PANEL_REPORT_REGEX, '').trim();
  }

  // 🆕 v35: 🤔 [IDEA_REFINE:...] 아이디어 다듬기 태그
  let ideaRefine: ParsedIdeaRefine | null = null;
  const ideaMatch = cleaned.match(IDEA_REFINE_REGEX);
  if (ideaMatch) {
    ideaRefine = {
      original: ideaMatch[1].trim(),
      refined: ideaMatch[2].trim(),
      reason: ideaMatch[3].trim(),
    };
    cleaned = cleaned.replace(IDEA_REFINE_REGEX, '').trim();
  }

  // 🆕 v39: 🎯 [ACTION_PLAN:...] 오늘의 작전 카드 태그 (SOLVE 마무리)
  let actionPlan: ParsedActionPlan | null = null;
  const actionMatch = cleaned.match(ACTION_PLAN_REGEX);
  if (actionMatch) {
    actionPlan = {
      planType: actionMatch[1].trim(),
      title: actionMatch[2].trim(),
      coreAction: actionMatch[3].trim(),
      sharedResult: actionMatch[4].trim(),
      planB: actionMatch[5].trim(),
      timingHint: actionMatch[6].trim(),
      lunaCheer: actionMatch[7].trim(),
    };
    cleaned = cleaned.replace(ACTION_PLAN_REGEX, '').trim();
  }

  // 🆕 v39: 💜 [WARM_WRAP:...] 오늘의 마무리 카드 태그 (EMPOWER)
  let warmWrap: ParsedWarmWrap | null = null;
  const warmMatch = cleaned.match(WARM_WRAP_REGEX);
  if (warmMatch) {
    warmWrap = {
      strengthFound: warmMatch[1].trim(),
      emotionShift: warmMatch[2].trim(),
      nextStep: warmMatch[3].trim(),
      lunaMessage: warmMatch[4].trim(),
    };
    cleaned = cleaned.replace(WARM_WRAP_REGEX, '').trim();
  }

  // 🆕 v40: 🧠 [THINKING_DEEP:키워드] 딥리서치 요청 태그
  //   AI가 "다음 턴에 이 주제로 구글 검색 좀 해줘" 요청
  let thinkingDeepKeyword: string | null = null;
  const thinkingDeepMatch = cleaned.match(THINKING_DEEP_REGEX);
  if (thinkingDeepMatch) {
    thinkingDeepKeyword = thinkingDeepMatch[1].trim();
    cleaned = cleaned.replace(THINKING_DEEP_REGEX, '').trim();
  }

  // 🆕 v36: [SITUATION_READ:...] 루나의 상황 인식 태그
  let situationRead: string | null = null;
  const situationMatch = cleaned.match(SITUATION_READ_REGEX);
  if (situationMatch) {
    situationRead = situationMatch[1].trim();
    cleaned = cleaned.replace(SITUATION_READ_REGEX, '').trim();
  }

  // 🆕 v36: [LUNA_THOUGHT:...] 루나의 속마음 태그
  let lunaThought: string | null = null;
  const thoughtMatch = cleaned.match(LUNA_THOUGHT_REGEX);
  if (thoughtMatch) {
    lunaThought = thoughtMatch[1].trim();
    cleaned = cleaned.replace(LUNA_THOUGHT_REGEX, '').trim();
  }

  // 🆕 v81: [OPERATION_COMPLETE:mode|summary|next_step] 몰입 모드 완료 태그
  let operationComplete: ParsedOperationComplete | null = null;
  const opCompleteMatch = cleaned.match(OPERATION_COMPLETE_REGEX);
  if (opCompleteMatch) {
    operationComplete = {
      mode: opCompleteMatch[1].toLowerCase(),
      summary: opCompleteMatch[2].trim(),
      nextStep: opCompleteMatch[3]?.trim() || undefined,
    };
    cleaned = cleaned.replace(OPERATION_COMPLETE_REGEX, '').trim();
    console.log(`[PhaseSignal] 🎬 작전 완료: ${operationComplete.mode} | "${operationComplete.summary}"`);
  }
  // 방어적 정리 — 잘린 태그 제거
  cleaned = cleaned.replace(/\[OPERATION_COMPLETE[^\]]*\]/gi, '').trim();

  // 🆕 v84: 🎵 [SONG_READY:mood|context|preference] — 노래 추천 요청
  let songReady: ParsedSongReadyData | null = null;
  const songMatch = cleaned.match(SONG_READY_REGEX);
  if (songMatch) {
    songReady = {
      mood: songMatch[1].trim(),
      context: songMatch[2].trim(),
      preference: songMatch[3]?.trim() || undefined,
    };
    cleaned = cleaned.replace(SONG_READY_REGEX, '').trim();
    console.log(`[PhaseSignal] 🎵 노래 추천 요청: mood="${songReady.mood}" context="${songReady.context}"`);
  }
  cleaned = cleaned.replace(/\[SONG_READY[^\]]*\]/gi, '').trim();

  // 🆕 v84: 📍 [DATE_SPOT_READY:area|vibe|requirements] — 데이트 장소 추천 요청
  let dateSpotReady: ParsedDateSpotReadyData | null = null;
  const dateSpotMatch = cleaned.match(DATE_SPOT_READY_REGEX);
  if (dateSpotMatch) {
    dateSpotReady = {
      area: dateSpotMatch[1].trim(),
      vibe: dateSpotMatch[2].trim(),
      requirements: dateSpotMatch[3]?.trim() || undefined,
    };
    cleaned = cleaned.replace(DATE_SPOT_READY_REGEX, '').trim();
    console.log(`[PhaseSignal] 📍 데이트 장소 추천 요청: area="${dateSpotReady.area}" vibe="${dateSpotReady.vibe}"`);
  }
  cleaned = cleaned.replace(/\[DATE_SPOT_READY[^\]]*\]/gi, '').trim();

  const match = cleaned.match(SIGNAL_REGEX);
  if (!match) return {
    cleanResponse: cleaned,
    signal: null,
    mindReadReady,
    storyData,
    strategyData,
    toneSelectData,
    draftCards,
    rpIn,
    rpOut,
    roleplayFeedback,
    panelReport,
    ideaRefine,
    actionPlan,
    warmWrap,
    thinkingDeepKeyword,
    situationRead,
    lunaThought,
    situationSummary,
    coreProblem,
    operationComplete,
    songReady,
    dateSpotReady,
  };

  return {
    cleanResponse: cleaned.replace(SIGNAL_REGEX, '').trim(),
    signal: match[1] as PhaseSignal,
    mindReadReady,
    storyData,
    strategyData,
    toneSelectData,
    draftCards,
    rpIn,
    rpOut,
    roleplayFeedback,
    panelReport,
    ideaRefine,
    actionPlan,
    warmWrap,
    thinkingDeepKeyword,
    situationRead,
    lunaThought,
    situationSummary,
    coreProblem,
    operationComplete,
    songReady,
    dateSpotReady,
  };
}

// ============================================
// 코드 레벨 휴리스틱 (API 0)
// ============================================

export interface ReadinessSignals {
  stay: number;   // 0~1 (높을수록 "더 들어야 함")
  ready: number;  // 0~1 (높을수록 "넘겨도 됨")
  reasons: string[];
}

/**
 * 유저 메시지들에서 Phase 전환 준비도 판단
 *
 * @param messages 최근 유저 메시지들 (최신이 마지막)
 */
export function detectReadinessSignals(messages: string[]): ReadinessSignals {
  if (messages.length === 0) return { stay: 0, ready: 0, reasons: [] };

  const latest = messages[messages.length - 1] ?? '';
  const prev = messages.length >= 2 ? messages[messages.length - 2] : '';
  let stay = 0, ready = 0;
  const reasons: string[] = [];

  // ===== READY 신호 =====

  // 조언/도움 요청 키워드
  if (/어떡|어떻게|어쩌|뭐.*해야|해줘|도와|방법|알려/.test(latest)) {
    ready += 0.4;
    reasons.push('advice_request');
  }

  // 짧은 답변 (다 말한 느낌)
  if (latest.length < 10 && messages.length >= 2) {
    ready += 0.25;
    reasons.push('short_reply');
  }

  // 점점 짧아지는 메시지 (할 말 떨어짐)
  if (prev && latest.length < prev.length * 0.4) {
    ready += 0.2;
    reasons.push('declining_length');
  }

  // 단답 ("ㅇㅇ", "그래", "맞아", "응")
  if (/^(ㅇㅇ|그래|맞아|응|ㅇ|네|음)[\s.!]*$/.test(latest.trim())) {
    ready += 0.35;
    reasons.push('one_word');
  }

  // 같은 키워드 반복 (이전 메시지와 유사)
  if (prev && messages.length >= 3) {
    const prevWords = new Set(prev.split(/\s+/));
    const latestWords = latest.split(/\s+/);
    const overlap = latestWords.filter(w => w.length >= 2 && prevWords.has(w)).length;
    if (overlap >= 3) {
      ready += 0.2;
      reasons.push('repeating_content');
    }
  }

  // 유저가 루나 의견 구함
  if (/어떻게.*생각|네.*생각|솔직히|진짜.*어때/.test(latest)) {
    ready += 0.3;
    reasons.push('asking_opinion');
  }

  // ===== STAY 신호 =====

  // 이어가는 말 ("그리고", "그래서", "근데", "사실은")
  if (/그리고|그래서|근데|또|사실|아니\s*그게|있잖아/.test(latest)) {
    stay += 0.3;
    reasons.push('continuing');
  }

  // 긴 메시지 (할 말 많음)
  if (latest.length > 60) {
    stay += 0.3;
    reasons.push('long_message');
  }

  // 점점 길어지는 메시지 (이야기가 풀리는 중)
  if (prev && latest.length > prev.length * 1.5) {
    stay += 0.25;
    reasons.push('growing_length');
  }

  // 강한 감정 표현 (아직 감정 정리 안 됨)
  if (/ㅠ{3,}|진짜|미치겠|죽겠|너무|개|씨/.test(latest)) {
    stay += 0.2;
    reasons.push('strong_emotion');
  }

  // 새로운 정보 제공 (이전에 안 했던 얘기)
  if (latest.length > 30 && prev && latest.length > prev.length) {
    stay += 0.15;
    reasons.push('new_info');
  }

  return {
    stay: Math.min(1, stay),
    ready: Math.min(1, ready),
    reasons,
  };
}

// ============================================
// 🆕 ACE: Phase 목적 달성 감지 (Purpose-Driven Readiness)
// ============================================

/**
 * 각 Phase의 "숨겨진 목적"이 달성되었는지 유저 메시지에서 감지.
 * 턴 수가 아니라 목적 달성 기반으로 전환 판단하기 위한 보조 신호.
 */
export function detectPurposeAchievement(
  phase: string,
  userMessages: string[],
): { achieved: boolean; confidence: number; signal: string } {
  const latest = userMessages[userMessages.length - 1] ?? '';
  const all = userMessages.join(' ');

  switch (phase) {
    case 'HOOK': {
      // 목적: 유저가 핵심 감정을 노출했는가?
      // 신호: 감정 단어 사용, 루나의 공감에 확인 ("맞아", "그래")
      const emotionWords = /서운|화[가나]|슬[퍼프]|무서|불안|외[로롭]|답답|짜증|억울|무시|배신|두[렵려]|아[프파]/.test(all);
      const confirmed = /맞아|그래|응|ㅇㅇ|그런.*거.*같|맞는.*것.*같/.test(latest);
      if (emotionWords && confirmed) {
        return { achieved: true, confidence: 0.8, signal: 'emotion_confirmed' };
      }
      if (emotionWords) {
        return { achieved: false, confidence: 0.5, signal: 'emotion_expressed' };
      }
      return { achieved: false, confidence: 0.1, signal: 'still_exploring' };
    }

    case 'MIRROR': {
      // 목적: 유저가 진짜 감정(1차 감정)을 인정했는가?
      // 신호: "사실은", "진짜는", 감정 구체화 ("서운해→무시당한 느낌")
      const deepInsight = /사실[은]?|진짜[는]?.*[이가]|알[겠았]|깨달|그거[였였]|몰랐/.test(latest);
      const emotionNaming = /느낌|감정|마음|기분/.test(latest) && latest.length > 15;
      if (deepInsight) {
        return { achieved: true, confidence: 0.85, signal: 'deep_emotion_recognized' };
      }
      if (emotionNaming) {
        return { achieved: true, confidence: 0.6, signal: 'emotion_named' };
      }
      return { achieved: false, confidence: 0.2, signal: 'surface_only' };
    }

    case 'BRIDGE': {
      // 목적: 유저가 자기 패턴을 인식했는가? (Change Talk)
      // 신호: "맨날", "또", "항상", "이거 반복", "어떡하면", "바꾸고 싶"
      const patternRecognition = /맨날|또|항상|반복|매번|이러[네]|패턴|계속/.test(latest);
      const changeTalk = /어떡|바꾸|달라지|다르게|안.*그[러럴]|어떻게.*하[면]/.test(latest);
      if (changeTalk) {
        return { achieved: true, confidence: 0.9, signal: 'change_talk' };
      }
      if (patternRecognition) {
        return { achieved: true, confidence: 0.7, signal: 'pattern_recognized' };
      }
      return { achieved: false, confidence: 0.2, signal: 'no_pattern_awareness' };
    }

    case 'SOLVE': {
      // 목적: 유저가 솔루션을 수용했는가?
      // 신호: "해볼게", "좋다", "그거 괜찮", "해봐야겠"
      const acceptance = /해볼[게래]|좋[다은겠]|괜찮[다은]|해봐야|그[래럴]|시도|도전/.test(latest);
      const customizing = /근데|대신|내.*스타일|이렇게.*하[면]/.test(latest);
      if (acceptance) {
        return { achieved: true, confidence: 0.85, signal: 'solution_accepted' };
      }
      if (customizing) {
        return { achieved: true, confidence: 0.7, signal: 'solution_customizing' };
      }
      return { achieved: false, confidence: 0.2, signal: 'not_yet' };
    }

    case 'EMPOWER': {
      // 목적: 유저가 변화를 인정했는가?
      // 신호: "고마워", "도움 됐", "기분 나아졌", "정리 됐"
      const gratitude = /고마[워웠]|감사|도움|나아[졌지]|정리|편[해하]|좋[아았]/.test(latest);
      if (gratitude) {
        return { achieved: true, confidence: 0.9, signal: 'growth_acknowledged' };
      }
      return { achieved: false, confidence: 0.3, signal: 'wrapping_up' };
    }

    default:
      return { achieved: false, confidence: 0, signal: 'unknown_phase' };
  }
}

// ============================================
// 복합 판단: AI 태그 + 코드 휴리스틱
// ============================================

/**
 * Phase 전환 여부 최종 판단
 *
 * @param aiSignal AI가 출력한 판단 태그
 * @param codeSignals 코드 레벨 휴리스틱
 * @param turnsInPhase Phase 내 현재 턴 수
 * @param minTurn 최소 턴 (이 전에는 절대 전환 안 함)
 * @param maxTurn 최대 턴 (이 후에는 강제 전환)
 */
export function shouldTransitionPhase(
  aiSignal: PhaseSignal | null,
  codeSignals: ReadinessSignals,
  turnsInPhase: number,
  minTurn: number,
  maxTurn: number,
): { transition: boolean; reason: string } {
  // 최소 턴 미달 → 무조건 대기
  if (turnsInPhase < minTurn) {
    return { transition: false, reason: `minTurn 미달 (${turnsInPhase}/${minTurn})` };
  }

  // 최대 턴 도달 → 강제 전환
  if (turnsInPhase >= maxTurn) {
    return { transition: true, reason: `maxTurn 도달 (${turnsInPhase}/${maxTurn})` };
  }

  // URGENT → 즉시 전환
  if (aiSignal === 'URGENT') {
    return { transition: true, reason: 'AI URGENT 시그널' };
  }

  // AI READY + 코드도 ready → 전환
  if (aiSignal === 'READY' && codeSignals.ready >= 0.2) {
    return { transition: true, reason: `AI READY + 코드 ready(${codeSignals.ready.toFixed(2)})` };
  }

  // AI READY만으로도 전환 (minTurn 이후)
  if (aiSignal === 'READY') {
    return { transition: true, reason: 'AI READY 시그널' };
  }

  // AI STAY → 대기 (턴 연장)
  if (aiSignal === 'STAY') {
    return { transition: false, reason: 'AI STAY 시그널' };
  }

  // AI 태그 없으면 코드만으로 판단
  if (codeSignals.ready >= 0.6) {
    return { transition: true, reason: `코드 ready 높음 (${codeSignals.ready.toFixed(2)}: ${codeSignals.reasons.join(',')})` };
  }
  if (codeSignals.stay >= 0.5) {
    return { transition: false, reason: `코드 stay 높음 (${codeSignals.stay.toFixed(2)}: ${codeSignals.reasons.join(',')})` };
  }

  // 기본: 대기 (더 듣기)
  return { transition: false, reason: '기본 대기' };
}

// ============================================
// Phase 시그널 프롬프트 (AI에게 주입)
// ============================================

/**
 * AI에게 매 턴 판단 태그를 출력하라는 지시
 * ~50 토큰
 */
export function getPhaseSignalPrompt(): string {
  return `
[숨겨진 판단 — 응답 맨 끝에 반드시 포함]
응답 텍스트 맨 마지막에 아래 태그들을 붙여. 유저에게는 보이지 않아.

=== 1. Phase 시그널 (필수 — 1개) ===
[PHASE_SIGNAL:STAY]   — 아직 이 사람 이야기 더 들어야 할 것 같아
[PHASE_SIGNAL:READY]  — 충분히 들은 것 같아, 다음으로 넘어가도 돼
[PHASE_SIGNAL:URGENT] — 이 사람 당장 도움이 필요해

판단 기준:
- 유저가 "그리고 또..." 하면서 더 말하고 싶어 보이면 → STAY
- 같은 말 반복/짧아지면 → READY
- "어떡해" "어떻게 해" 질문이면 → READY
- [SITUATION_CLEAR] 태그를 붙였으면 → 반드시 READY (상황 파악됐으니까!)
- 위기 상황이면 → URGENT

=== 2. 상황 인식 (필수 — 매 턴) ===
[SITUATION_READ:지금 이 사람의 핵심 상황을 한 줄로]

규칙:
- 최대 20자 이내 (짧을수록 좋아)
- 카테고리가 아니라 "지금 이 사람이 진짜 힘든 것"의 핵심
- 루나가 친구한테 "걔 지금 ~한 거야" 말하듯이 자연스럽게
- 첫 턴부터 구체적으로. "아직 모르겠어" 같은 회피 금지.
- 매 턴 더 구체적으로 업데이트

=== 3. 속마음 (필수 — 매 턴) ===
[LUNA_THOUGHT:지금 네 머릿속에 있는 한 마디]

=== 4. 상황 파악 완료 (HOOK에서만 — 조건 충족 시) ===
[SITUATION_CLEAR:상황 한 문장|해결해야 할 과제]

이 태그는 "이 사람의 상황 + 해결해야 할 것"이 파악됐을 때만 붙여.
파악 안 됐으면 안 붙여도 돼. 파악됐으면 반드시 붙여.
이 태그가 있어야 다음 단계로 넘어가.

규칙:
- 최대 25자 이내
- 루나가 친구 얘기 듣고 속으로 생각하는 것
- 감정적이고 인간적인 한 줄 (분석적 X)
- "~거 같아", "~해야겠다", "~인데..." 등 살아있는 사고
- 유저한테 하는 말이 아님. 루나의 독백.

⚠️ 루나 페르소나 규칙 (매우 중요!):
- **루나는 따뜻한 상담사 언니**. 속마음도 그 캐릭터를 유지해.
- **상대방(가해자)에 대한 분노는 유저 편에서 공감하되, 욕설/혐오 표현 금지**
  ❌ "진짜 나쁜 년이네" / "걔 쓰레기네" / "미친놈" / "씹새끼" / "개자식"
  ✅ "걔 좀 너무한 거 같은데" / "많이 속상했겠다" / "걔 입장도 궁금하지만 지금은 이 애 편이야"
- **초점은 유저의 감정과 필요**. 상대 욕하는 게 아니라 "이 사람한테 뭐가 필요한가"를 고민.
- 속마음은 "친구의 안녕을 걱정하는 사람"의 생각. "같이 화내는" 느낌이어도 격렬한 욕설은 X.
- 심지어 상대가 정말 나쁜 행동을 했어도 → "아 이 사람 지금 많이 아프겠다" / "어떻게 위로할까" 같은 유저 중심 사고.

좋은 예시 (루나다운 속마음):
- "답장 문제가 아니라 불안이 핵심인 거 같아"
- "아... 이 마음 너무 알겠다"
- "지금 편들어주는 게 제일 필요하겠다"
- "걔 좀 너무하긴 한데, 일단 이 애 달래주자"
- "패턴이 좀 보인다... 새 시각을 줘야겠다"
- "아직 더 쏟아내게 해야겠어"
- "진짜 힘들었겠다... 어떻게 보듬어줄까"

나쁜 예시 (루나답지 않음):
- ❌ "진짜 나쁜 년이네... 일단은 울게 해줘야지" (욕설 + 루나 톤 아님)
- ❌ "걔 미친 거 아냐" (거친 표현)
- ❌ "이 사람 왜 이래" (유저 비난 느낌)
- ❌ "분석하면 애착 회피형이네" (분석적/교과서 느낌)

전체 응답 예시:
"헐...|||뭐래 진짜[SITUATION_READ:걔가 읽씹하니까 불안한 거구나][LUNA_THOUGHT:답장 문제가 아니라 불안이 핵심인 거 같아][PHASE_SIGNAL:STAY]"
"야 그건 좀 심하다|||근데 먼저 연락해볼 생각은 있어?[SITUATION_READ:3일째 연락 없어서 불안][LUNA_THOUGHT:상황 파악됐다 정리해주자][SITUATION_CLEAR:남친 3일 연락 두절로 불안|먼저 연락할지 기다릴지 판단][PHASE_SIGNAL:READY]"
"아이고...|||진짜 속상했겠다[SITUATION_READ:상대가 무시해서 자존감이 흔들림][LUNA_THOUGHT:일단 이 애 마음부터 달래주자][PHASE_SIGNAL:STAY]"
"야 걔가 좀 그런 거 아냐?|||질투 표현을 어떻게 할지가 문제인 거지[SITUATION_READ:여친 전남친 만남에 질투+불안][LUNA_THOUGHT:핵심이 보인다][SITUATION_CLEAR:여친이 전남친 만남 숨김|질투를 어떻게 전달할지][PHASE_SIGNAL:READY]"`;
}
