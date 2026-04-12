/**
 * 🌿 v43: Ambient Life System
 *
 * 라운지를 "살아있는 단톡방"으로 만드는 엔진.
 * LLM 호출 0회 — 클라이언트 사이드 타이머 + 템플릿 기반.
 *
 * 3가지 핵심:
 * 1. Ambient Actions — 대화 없어도 캐릭터가 자동으로 행동 표시
 * 2. Proactive Nudge — 유저 2~3분 방치 시 먼저 말걸기
 * 3. Message Reactions — 유저 메시지에 이모지 리액션
 */

// ─── Types ──────────────────────────────────────────────

type TimeSlot = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'lateNight';

export interface AmbientAction {
  speaker: 'luna' | 'tarot';
  text: string;
  emoji: string;
}

export interface NudgeMessage {
  speaker: 'luna' | 'tarot';
  text: string;
}

export interface ReactionResult {
  emoji: string;
  speaker: 'luna' | 'tarot';
}

// ─── 시간대 판정 ────────────────────────────────────────

function getTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h < 6) return 'lateNight';
  if (h < 9) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  if (h < 23) return 'night';
  return 'lateNight';
}

// ─── 1. Ambient Actions Pool ────────────────────────────

const LUNA_ACTIONS: Record<TimeSlot, AmbientAction[]> = {
  dawn: [
    { speaker: 'luna', text: '*기지개를 편다*', emoji: '🌅' },
    { speaker: 'luna', text: '*커피를 내리는 중*', emoji: '☕' },
    { speaker: 'luna', text: '*창문을 열고 아침 공기를 마신다*', emoji: '🌤️' },
    { speaker: 'luna', text: '*노트를 꺼내서 뭔가 적는다*', emoji: '📝' },
  ],
  morning: [
    { speaker: 'luna', text: '*커피를 한 모금 마신다*', emoji: '☕' },
    { speaker: 'luna', text: '*책장을 넘기는 중*', emoji: '📖' },
    { speaker: 'luna', text: '*콧노래를 흥얼거린다*', emoji: '🎵' },
    { speaker: 'luna', text: '*쿠키 반죽을 만들고 있다*', emoji: '🍪' },
    { speaker: 'luna', text: '*화분에 물을 주는 중*', emoji: '🌱' },
  ],
  afternoon: [
    { speaker: 'luna', text: '*차를 우려내는 중*', emoji: '🍵' },
    { speaker: 'luna', text: '*상담 노트를 정리하는 중*', emoji: '📋' },
    { speaker: 'luna', text: '*타로냥 쪽을 힐끗 본다*', emoji: '👀' },
    { speaker: 'luna', text: '*간식을 꺼내 먹는다*', emoji: '🍰' },
    { speaker: 'luna', text: '*창밖 하늘을 올려다본다*', emoji: '☁️' },
  ],
  evening: [
    { speaker: 'luna', text: '*저녁 노을을 바라본다*', emoji: '🌇' },
    { speaker: 'luna', text: '*따뜻한 차를 양손으로 감싸 든다*', emoji: '🍵' },
    { speaker: 'luna', text: '*일기장을 꺼내든다*', emoji: '📔' },
    { speaker: 'luna', text: '*오늘의 상담을 떠올리며 미소 짓는다*', emoji: '😊' },
  ],
  night: [
    { speaker: 'luna', text: '*달을 올려다본다*', emoji: '🌙' },
    { speaker: 'luna', text: '*담요를 끌어당긴다*', emoji: '🛋️' },
    { speaker: 'luna', text: '*조용히 음악을 튼다*', emoji: '🎶' },
    { speaker: 'luna', text: '*눈이 살짝 감긴다*', emoji: '😌' },
  ],
  lateNight: [
    { speaker: 'luna', text: '*졸린 눈으로 폰을 본다*', emoji: '📱' },
    { speaker: 'luna', text: '*하품을 크게 한다*', emoji: '🥱' },
    { speaker: 'luna', text: '*... zzz*', emoji: '💤' },
  ],
};

const TAROT_ACTIONS: Record<TimeSlot, AmbientAction[]> = {
  dawn: [
    { speaker: 'tarot', text: '*아직 잠들어 있다*', emoji: '😺💤' },
    { speaker: 'tarot', text: '*꼬리를 살랑살랑 흔들며 꿈꾸는 중*', emoji: '💭' },
  ],
  morning: [
    { speaker: 'tarot', text: '*카드를 한 장 뒤집어본다*', emoji: '🃏' },
    { speaker: 'tarot', text: '*기지개를 켜고 발톱을 세운다*', emoji: '🐱' },
    { speaker: 'tarot', text: '*그루밍 중*', emoji: '✨' },
    { speaker: 'tarot', text: '*창가에서 햇볕을 쬔다*', emoji: '☀️' },
  ],
  afternoon: [
    { speaker: 'tarot', text: '*카드 덱을 셔플하는 중*', emoji: '🃏' },
    { speaker: 'tarot', text: '*낮잠 자세를 잡는다*', emoji: '😴' },
    { speaker: 'tarot', text: '*루나 옆에서 길게 하품한다*', emoji: '🐱' },
    { speaker: 'tarot', text: '*오늘의 카드 에너지를 확인하는 중*', emoji: '🔮' },
    { speaker: 'tarot', text: '*꼬리로 탁자를 통통 친다*', emoji: '😼' },
  ],
  evening: [
    { speaker: 'tarot', text: '*카드 위에서 몸을 둥글게 만다*', emoji: '🐈' },
    { speaker: 'tarot', text: '*달을 올려다보며 수염을 씰룩인다*', emoji: '🌙' },
    { speaker: 'tarot', text: '*카드 한 장을 앞발로 밀어본다*', emoji: '🃏' },
  ],
  night: [
    { speaker: 'tarot', text: '*달빛 아래서 카드 명상 중*', emoji: '🌙' },
    { speaker: 'tarot', text: '*눈이 반짝인다*', emoji: '✨' },
    { speaker: 'tarot', text: '*조용히 카드를 한 장 뽑았다*', emoji: '🔮' },
    { speaker: 'tarot', text: '*루나가 자는지 살짝 확인한다*', emoji: '👀' },
  ],
  lateNight: [
    { speaker: 'tarot', text: '*카드 위에서 뭉쳐 잔다*', emoji: '😺💤' },
    { speaker: 'tarot', text: '*Dream... 카드가 꿈속에서 빛난다*', emoji: '✨' },
    { speaker: 'tarot', text: '*꼬리만 살짝 움직인다*', emoji: '🐱' },
  ],
};

/**
 * 랜덤 ambient action 반환.
 * usedActions Set으로 중복 방지 — 같은 행동이 연속으로 나오지 않도록.
 */
export function getRandomAmbientAction(usedActions: Set<string>): AmbientAction | null {
  const slot = getTimeSlot();
  const hour = new Date().getHours();

  // 캐릭터 선택 (번갈아가며)
  const pickLuna = Math.random() > 0.45; // 루나가 약간 더 자주
  const pool = pickLuna ? LUNA_ACTIONS[slot] : TAROT_ACTIONS[slot];

  // 자는 시간이면 확률 낮추기
  const isSleeping = (pickLuna && (hour >= 2 && hour < 7)) || (!pickLuna && (hour >= 4 && hour < 9));
  if (isSleeping && Math.random() > 0.3) return null; // 70% 확률로 스킵

  // 미사용 행동 필터
  const available = pool.filter(a => !usedActions.has(a.text));
  if (available.length === 0) {
    usedActions.clear(); // 풀 소진 시 리셋
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const action = available[Math.floor(Math.random() * available.length)];
  usedActions.add(action.text);
  return action;
}

// ─── 2. Proactive Nudge (먼저 말걸기) ──────────────────

const NUDGE_TEMPLATES: Record<TimeSlot, NudgeMessage[]> = {
  dawn: [
    { speaker: 'luna', text: '일찍 일어났구나~ 잠은 잘 잤어?' },
    { speaker: 'luna', text: '아침 공기 좋다... 오늘 기분은 어때?' },
  ],
  morning: [
    { speaker: 'luna', text: '뭐 하고 있어? 심심하면 이야기하자~' },
    { speaker: 'tarot', text: '...뭐 봐. 할 말 있으면 해.' },
    { speaker: 'luna', text: '아 맞다, 어제 잘 잤어?' },
    { speaker: 'luna', text: '오늘 뭐 할 거야?' },
  ],
  afternoon: [
    { speaker: 'luna', text: '점심은 먹었어?' },
    { speaker: 'tarot', text: '조용하네... 다들 바쁜가.' },
    { speaker: 'luna', text: '졸리지? 나도 좀 졸려 ㅎㅎ' },
    { speaker: 'luna', text: '간식 먹을래? 쿠키 구웠는데~' },
  ],
  evening: [
    { speaker: 'luna', text: '오늘 하루 어땠어?' },
    { speaker: 'luna', text: '저녁은 뭐 먹었어?' },
    { speaker: 'tarot', text: '...오늘 카드가 좀 신경 쓰여.' },
    { speaker: 'luna', text: '수고한 하루였지? 좀 쉬어~' },
  ],
  night: [
    { speaker: 'luna', text: '밤이다... 오늘 기분 정리 좀 됐어?' },
    { speaker: 'tarot', text: '잠 안 와? 카드 한 장 뽑아볼까.' },
    { speaker: 'luna', text: '무슨 생각해? 같이 이야기하자.' },
  ],
  lateNight: [
    { speaker: 'luna', text: '이 시간에... 잠이 안 와?' },
    { speaker: 'tarot', text: '늦었는데 아직 안 자?' },
    { speaker: 'luna', text: '괜찮아? 말 걸어줘서 고마워.' },
  ],
};

/** 유저 방치 시 먼저 말걸기 메시지 */
export function getProactiveNudge(usedNudges: Set<string>): NudgeMessage | null {
  const slot = getTimeSlot();
  const pool = NUDGE_TEMPLATES[slot];
  const available = pool.filter(n => !usedNudges.has(n.text));

  if (available.length === 0) return null; // 이번 세션에서 다 씀

  const nudge = available[Math.floor(Math.random() * available.length)];
  usedNudges.add(nudge.text);
  return nudge;
}

// ─── 3. Message Reactions ───────────────────────────────

interface ReactionRule {
  keywords: RegExp;
  emoji: string;
  /** 누가 리액션? undefined = 랜덤 */
  speaker?: 'luna' | 'tarot';
}

const REACTION_RULES: ReactionRule[] = [
  // 감정
  { keywords: /힘들|지친|피곤|우울|슬프|눈물/i, emoji: '🫂', speaker: 'luna' },
  { keywords: /무서|불안|걱정|긴장/i, emoji: '🤗', speaker: 'luna' },
  { keywords: /화나|짜증|열받|빡/i, emoji: '😤' },
  { keywords: /외로|혼자|심심/i, emoji: '💗', speaker: 'luna' },

  // 긍정
  { keywords: /고마|감사|사랑|최고|좋아/i, emoji: '💕' },
  { keywords: /행복|기쁘|좋은|신나/i, emoji: '😊', speaker: 'luna' },
  { keywords: /잘했|대단|멋지|짱/i, emoji: '👏' },

  // 웃음
  { keywords: /ㅋㅋ|ㅎㅎ|웃기|재밌/i, emoji: '😂' },
  { keywords: /ㅠㅠ|ㅜㅜ|앙|응응/i, emoji: '🥺', speaker: 'luna' },

  // 일상
  { keywords: /밥|먹|식사|점심|저녁/i, emoji: '🍚' },
  { keywords: /잠|자고|졸|피곤/i, emoji: '😴' },
  { keywords: /산책|운동|걷/i, emoji: '🏃' },
  { keywords: /커피|카페/i, emoji: '☕' },

  // 타로 관련
  { keywords: /카드|타로|운세|점/i, emoji: '🔮', speaker: 'tarot' },

  // 인사
  { keywords: /안녕|하이|왔어|들어왔/i, emoji: '👋' },
  { keywords: /잘 자|굿나잇|자러|잘게/i, emoji: '🌙' },
];

/**
 * 유저 메시지에 대한 캐릭터 리액션 결정.
 * 매칭 안 되면 15% 확률로 기본 리액션.
 */
export function getMessageReaction(userText: string): ReactionResult | null {
  for (const rule of REACTION_RULES) {
    if (rule.keywords.test(userText)) {
      return {
        emoji: rule.emoji,
        speaker: rule.speaker ?? (Math.random() > 0.5 ? 'luna' : 'tarot'),
      };
    }
  }

  // 매칭 안 되면 15% 확률로 기본 리액션
  if (Math.random() < 0.15) {
    const defaults = ['👍', '😊', '💬', '✨'];
    return {
      emoji: defaults[Math.floor(Math.random() * defaults.length)],
      speaker: Math.random() > 0.5 ? 'luna' : 'tarot',
    };
  }

  return null;
}

// ─── 4. Enhanced Typing Delay ───────────────────────────

/**
 * 글자수 비례 + 자연스러운 변동의 타이핑 딜레이(ms) 반환.
 * - base: 500ms
 * - per char: 35ms
 * - max: 2500ms
 * - 10% 확률로 "멈칫" 딜레이 추가 (+800ms)
 */
export function calcTypingDelay(text: string): { typingMs: number; hesitate: boolean } {
  const baseMs = 500;
  const perChar = 35;
  const maxMs = 2500;
  const raw = Math.min(baseMs + text.length * perChar, maxMs);
  // ±20% jitter
  const jitter = raw * (0.8 + Math.random() * 0.4);
  const hesitate = Math.random() < 0.1; // 10% 멈칫
  const typingMs = Math.round(hesitate ? jitter + 800 : jitter);
  return { typingMs, hesitate };
}

// ─── 5. Live Status Helpers ─────────────────────────────

export interface CharacterPresence {
  name: string;
  isOnline: boolean;
  isSleeping: boolean;
  isTyping: boolean;
  statusText: string;
  statusEmoji: string;
}

export function getCharacterPresence(character: 'luna' | 'tarot'): CharacterPresence {
  const h = new Date().getHours();
  const name = character === 'luna' ? '루나' : '타로냥';

  // 수면 시간 판정
  const isSleeping = character === 'luna'
    ? (h >= 2 && h < 7)   // 루나: 2시~7시
    : (h >= 4 && h < 9);  // 타로냥: 4시~9시

  const slot = getTimeSlot();

  // 활동 상태 텍스트
  const statusMap: Record<string, Record<TimeSlot, string>> = {
    luna: {
      dawn: '일어나는 중',
      morning: '커피 타임',
      afternoon: '노트 정리',
      evening: '차 마시는 중',
      night: '음악 듣는 중',
      lateNight: '잠들었어요',
    },
    tarot: {
      dawn: '자는 중',
      morning: '그루밍 중',
      afternoon: '카드 셔플',
      evening: '카드 명상',
      night: '별 구경',
      lateNight: '꿈 꾸는 중',
    },
  };

  const emojiMap: Record<string, Record<TimeSlot, string>> = {
    luna: { dawn: '🌅', morning: '☕', afternoon: '📋', evening: '🍵', night: '🎶', lateNight: '💤' },
    tarot: { dawn: '😺💤', morning: '✨', afternoon: '🃏', evening: '🔮', night: '🌙', lateNight: '💤' },
  };

  return {
    name,
    isOnline: !isSleeping,
    isSleeping,
    isTyping: false,
    statusText: isSleeping ? '잠들었어요' : statusMap[character][slot],
    statusEmoji: isSleeping ? '💤' : emojiMap[character][slot],
  };
}

// ─── Ambient Interval Helper ────────────────────────────

/** 랜덤 간격 (ms): 45초~150초 */
export function nextAmbientInterval(): number {
  return 45000 + Math.floor(Math.random() * 105000); // 45s ~ 150s
}

/** 먼저 말걸기 대기 시간 (ms): 2~3분 */
export function nudgeTimeout(): number {
  return 120000 + Math.floor(Math.random() * 60000); // 2min ~ 3min
}
