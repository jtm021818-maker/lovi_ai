/**
 * 🪞 미러링 엔진 — 유저의 말/감정/패턴을 카드에 비춰 반사
 *
 * 기법:
 * - 감정 미러링: 유저가 말한 감정 → 카드가 "그걸 보여주고 있어"
 * - 패턴 미러링: 반복되는 행동/사고 → 카드 조합으로 비추기
 * - 무의식 미러링: 겉 vs 속 감정 차이 → "진짜 마음"
 * - 강점 미러링: 유저의 강점을 카드에서 발견
 */

// ─── Types ──────────────────────────────────────────────

export type MirrorType = 'emotion' | 'pattern' | 'unconscious' | 'strength';

export interface MirrorInput {
  userEmotion: string;
  deepEmotion?: string;
  cardName: string;
  cardEmoji?: string;
  surfaceDesire?: string;
  deepDesire?: string;
  hasRepetitionPattern: boolean;
}

export interface MirrorOutput {
  type: MirrorType;
  message: string;
}

// ─── 미러링 템플릿 ──────────────────────────────────────

const EMOTION_MIRROR_TEMPLATES: string[] = [
  '네가 아까 "{userEmotion}"이라고 했잖아.\n이 {cardName} 카드가 정확히 그걸 비추고 있어\n카드가 "알고 있다"고 말하는 거야.',
  '아까 네가 느낀 "{userEmotion}"...\n이 카드가 그 감정의 정체를 보여주고 있어',
  '"{userEmotion}"이라고 했지?\n카드가 고개를 끄덕이고 있어 {cardEmoji}\n네 감정을 인정해주는 거야',
  '이 {cardName}가 네 "{userEmotion}"을 비추고 있어\n카드는 거짓말 안 해. 네 감정이 맞아.',
];

const PATTERN_MIRROR_TEMPLATES: string[] = [
  '혹시 이거 느꼈어?\n이 카드 조합이 말하는 건...\n너한테 비슷한 패턴이 반복되고 있다는 거야\n\n이전에도 이런 적 있지 않았어?',
  '카드가 흥미로운 걸 보여주고 있어...\n이 패턴이 처음이 아닌 것 같은데\n혹시... 인정하기 싫은 부분이 있어?',
  '카드가 자꾸 같은 이야기를 해\n이건 너한테 반복되는 패턴이라는 뜻이야.\n카드가 "이번에는 다르게 해봐"라고 말하는 것 같아',
  '이 카드 조합... 익숙한 느낌이 들지 않아?\n카드가 비추는 건 "네가 이미 알고 있는 패턴"이야',
];

const UNCONSCIOUS_MIRROR_TEMPLATES: string[] = [
  '카드가 재밌는 걸 말해줬어\n\n너는 "{surfaceDesire}"을 원한다고 했는데...\n카드가 보여주는 네 진짜 마음은 좀 달라\n\n혹시... 사실은 "{deepDesire}"이 더 필요한 건 아닐까?',
  '겉으로는 "{surfaceDesire}"이라고 하는데...\n카드가 들여다본 속마음은 "{deepDesire}"이야\n\n솔직히... 맞지?',
  '네가 말한 것과 카드가 보여주는 게 좀 달라\n\n말로는 "{surfaceDesire}"인데\n마음은 "{deepDesire}"을 향하고 있어',
];

const STRENGTH_MIRROR_TEMPLATES: string[] = [
  '근데 카드가 하나 더 말하고 싶은 게 있나봐\n\n너... 이 상황에서 꽤 잘 버티고 있어.\n이 {cardName}가 네 안의 힘을 보여주고 있거든\n\n그 힘을 믿어도 돼',
  '잠깐, 카드가 중요한 걸 보여주고 있어\n\n이 {cardName}는 네 안에 강한 에너지가 있다고 말해.\n네가 생각하는 것보다 넌 훨씬 강해🔮',
  '이건 꼭 말해줘야 해\n\n카드가 보여주는 건... 넌 이 상황을 버틸 수 있는 사람이야.\n이 {cardName}가 네 강점을 비추고 있어\n\n스스로 과소평가하지 마',
];

// ─── Public API ─────────────────────────────────────────

/** 미러링 타입 결정 */
export function decideMirrorType(input: MirrorInput): MirrorType {
  // 겉 vs 속 감정 차이가 있으면 → 무의식 미러링
  if (input.surfaceDesire && input.deepDesire && input.surfaceDesire !== input.deepDesire) {
    return 'unconscious';
  }
  // 반복 패턴 있으면 → 패턴 미러링
  if (input.hasRepetitionPattern) {
    return 'pattern';
  }
  // 기본은 감정 미러링, 20% 확률로 강점 미러링
  return Math.random() < 0.2 ? 'strength' : 'emotion';
}

/** 미러링 메시지 생성 */
export function generateMirror(input: MirrorInput): MirrorOutput {
  const type = decideMirrorType(input);
  let templates: string[];

  switch (type) {
    case 'emotion':
      templates = EMOTION_MIRROR_TEMPLATES;
      break;
    case 'pattern':
      templates = PATTERN_MIRROR_TEMPLATES;
      break;
    case 'unconscious':
      templates = UNCONSCIOUS_MIRROR_TEMPLATES;
      break;
    case 'strength':
      templates = STRENGTH_MIRROR_TEMPLATES;
      break;
  }

  const template = templates[Math.floor(Math.random() * templates.length)];
  const message = fillTemplate(template, input);

  return { type, message };
}

/** 특정 타입의 미러링 강제 생성 */
export function generateMirrorByType(type: MirrorType, input: MirrorInput): MirrorOutput {
  let templates: string[];

  switch (type) {
    case 'emotion':
      templates = EMOTION_MIRROR_TEMPLATES;
      break;
    case 'pattern':
      templates = PATTERN_MIRROR_TEMPLATES;
      break;
    case 'unconscious':
      templates = UNCONSCIOUS_MIRROR_TEMPLATES;
      break;
    case 'strength':
      templates = STRENGTH_MIRROR_TEMPLATES;
      break;
  }

  const template = templates[Math.floor(Math.random() * templates.length)];
  const message = fillTemplate(template, input);

  return { type, message };
}

// ─── Internal ───────────────────────────────────────────

function fillTemplate(template: string, input: MirrorInput): string {
  return template
    .replace(/\{userEmotion\}/g, input.userEmotion)
    .replace(/\{deepEmotion\}/g, input.deepEmotion ?? input.userEmotion)
    .replace(/\{cardName\}/g, input.cardName)
    .replace(/\{cardEmoji\}/g, input.cardEmoji ?? '🃏')
    .replace(/\{surfaceDesire\}/g, input.surfaceDesire ?? '')
    .replace(/\{deepDesire\}/g, input.deepDesire ?? '');
}
