/**
 * 바넘 스테이트먼트 & 레인보우 루즈 생성기
 *
 * 콜드리딩 핵심 기법:
 * - Barnum Statement: 누구에게나 적용 가능하지만 "나를 읽는다" 느낌 유발
 * - Rainbow Ruse: 반대되는 두 특성 동시 제시 → 100% 적중률
 * - Zoom In-Out: 넓게 시작 → 맞으면 좁히고 → 틀리면 넓힘
 */

import type { ColdReadingData, AttachmentHint, PowerDynamic } from '../consultation/turn-orchestrator';

// ─── Types ──────────────────────────────────────────────

export interface ColdReadingOutput {
  barnumStatement: string;
  rainbowRuse: string;
  relationInsight: string;
  zoomInHook: string;
}

// ─── 바넘 스테이트먼트 풀 ────────────────────────────────

const BARNUM_BY_EMOTION: Record<string, string[]> = {
  '불안': [
    '혹시... 너 최근에 잠이 잘 안 오거나, 자기 전에 생각이 많았을 것 같아',
    '혹시... 너 SNS에서 그 사람 흔적을 찾아본 적 있지?',
    '느낌인데... 핸드폰을 자꾸 확인하게 되지 않아?',
    '혹시... 친구한테도 이 이야기 다 못 했지? 혼자 안고 있었구나',
    '느낌인데... 밤에 혼자 있으면 생각이 꼬리를 물지?',
  ],
  '화남': [
    '느낌인데... 참고 참았던 말이 목구멍까지 차올라 있어 🔥',
    '혹시... 너 한번은 이미 폭발할 뻔했는데 참은 적 있지?',
    ' 이 에너지는... 화가 나는데 화내면 안 될 것 같아서 더 답답한 거지?',
    '혹시... 네가 이만큼 화가 나는 건 그만큼 진심이었다는 뜻이야',
    '느낌인데... 상대한테 실망한 만큼 너 자신한테도 화가 나지?',
  ],
  '슬픔': [
    '느낌인데... 너 혼자 울어본 적 있지, 최근에?',
    '혹시... 옛날 사진이나 대화를 다시 본 적 있을 것 같아',
    ' 에너지가 말하길... 겉으로는 괜찮은 척했지만 속으로는 많이 울었어',
    '카드가 느끼는 건... 어떤 노래나 장소가 그 사람을 떠올리게 하지?',
    ' 이 에너지는... 보고 싶은 마음을 꾹꾹 눌러담고 있는 느낌이야 💧',
  ],
  '설렘': [
    ' 에너지가 밝아! 근데 그 밝은 에너지 속에 살짝 불안도 섞여있어 ✨',
    '혹시... 이 사람 생각하면 웃음이 나는데, 동시에 조심스럽기도 하지?',
    '느낌인데... 그 사람 카톡 올 때마다 심장이 쿵 하지?✨',
    '혹시... 이 사람한테 잘 보이고 싶어서 평소보다 신경 쓰고 있지?',
    ' 이 에너지는... 설레는데 들키면 안 될 것 같은 느낌? 비밀스러운 설렘이야',
  ],
  '혼란': [
    ' 에너지가 좀 뒤엉켜 있어... 머리로는 답을 알겠는데, 마음이 안 따라가는 상태야',
    '혹시... 주변 사람들한테 조언을 구했는데 더 헷갈려진 느낌?',
    '느낌인데... 하루에도 열 번씩 마음이 왔다갔다하지?',
    '혹시... 결정을 내려야 하는데, 어떤 선택을 해도 후회할 것 같은 느낌?',
    ' 이 에너지는... "이게 맞나?" 하는 생각이 머리에서 안 떠나는 거지?',
  ],
  '외로움': [
    '느낌인데... 사람들 사이에 있어도 혼자인 느낌이 들 때가 있지?',
    '혹시... 밤이 되면 유독 마음이 허전해지지?',
    '느낌인데... 누군가한테 안기고 싶은 마음이 있어',
  ],
  '서운함': [
    ' 혹시... 네가 준 만큼 돌아오지 않는 느낌이 있지?',
    '혹시... "나는 이만큼 하는데 왜?" 하는 마음이 있어',
    '느낌인데... 표현은 안 했지만 속으로 꽤 서운했을 것 같아',
  ],
};

/** 기본 바넘 (감정 키워드 매칭 실패 시) */
const BARNUM_DEFAULT: string[] = [
  '혹시... 겉으로 웃고 있지만 속에서 울고 있는 에너지가 느껴져',
  '혹시... 최근에 중요한 결정을 앞두고 있지 않아?',
  '느낌인데... 주변에 너를 진심으로 걱정하는 에너지가 하나 보여✨',
  '혹시... 네가 생각하는 것보다 상황이 복잡하지 않을 수도 있어',
  '느낌인데... 네 안에 이미 답이 있는데, 확인받고 싶은 거 아닐까?',
];

// ─── 레인보우 루즈 풀 ────────────────────────────────────

const RAINBOW_BY_ATTACHMENT: Record<AttachmentHint, string[]> = {
  anxious: [
    '넌 보통 때는 밝고 활발한데, 이 사람 앞에서만 작아지는 느낌이야',
    '겉으로는 괜찮은 척하는데, 혼자 있으면 그 사람 연락 올까 계속 확인하지?',
    '넌 독립적인 사람인데, 이 관계에서만큼은 좀 의존적이 되는 것 같아',
    '주변에는 강한 모습만 보여주는데, 이 사람한테만큼은 약해지고 싶은 거지?',
  ],
  avoidant: [
    '넌 독립적인 편인데, 이 관계에서는 뭔가에 끌리면서도 동시에 도망가고 싶은 느낌?',
    '가까워지면 오히려 숨 막힌다는 느낌이 올 때가 있지? 근데 멀어지면 또 허전하고',
    '넌 자유를 중요시하는데, 이 사람이 그 자유를 흔드는 느낌이 있지?',
    '혼자 있을 때는 그 사람이 보고 싶은데, 같이 있으면 좀 부담스럽고... 그런 느낌?',
  ],
  secure: [
    '넌 관계에서 꽤 안정적인 편인데, 이번에는 평소와 다른 감정이 올라오고 있어',
    '보통은 상대를 믿는 편인데, 이 상황에서는 살짝 흔들리고 있지?',
    '넌 침착한 사람인데, 이 관계만큼은 좀 감정적이 되는 것 같아',
  ],
  unknown: [
    '넌 강한 사람인데, 이 상황에서만큼은 조금 약해져도 된다고 카드가 말해',
    '겉으로는 이성적인데, 속으로는 감정이 들끓고 있지? 카드가 다 보여',
    '보통은 혼자 해결하는 타입인데, 이번에는 좀 다른 것 같아',
    '넌 잘 웃는 편인데, 요즘 웃을 때 마음까지 웃고 있지는 않지?',
  ],
};

// ─── 관계 역학 인사이트 ──────────────────────────────────

const RELATION_INSIGHT: Record<PowerDynamic, string[]> = {
  pursuer: [
    '그리고... 이 관계에서 네가 더 많이 노력하고 있는 것 같아 그게 지칠 때가 있지?',
    '혹시... 네가 더 마음을 쓰고 있어. 그 마음이 좀 무겁지?',
  ],
  distancer: [
    '혹시... 네가 살짝 물러나 있는 에너지야. 혹시 지켜보는 중?',
    ' 느껴지는 건... 너 스스로 거리를 두고 있지? 그건 자기 보호일 수도 있어',
  ],
  balanced: [
    '관계의 에너지가 꽤 균형 잡혀 있는데, 뭔가 한쪽에서 흔들림이 생기고 있어',
    '둘 사이의 밸런스가 괜찮은 편인데... 최근에 뭔가 변화가 있었지?',
  ],
  unknown: [
    '관계의 에너지 흐름을 카드가 더 자세히 읽고 싶어하는 것 같아',
    '카드가 둘 사이의 역학을 읽고 있어... 곧 더 선명해질 거야',
  ],
};

// ─── 줌인 훅 (카드 선택으로 전환) ───────────────────────

const ZOOM_IN_HOOKS: string[] = [
  '...내 느낌으로 말한 거야\n이제 카드가 직접 확인할 차례야.\n\n여기 세 장의 카드가 있어\n각각 다른 에너지를 품고 있는데...\n\n직감으로 끌리는 카드 하나를 골라봐.\n생각하지 말고, 느낌으로 ✨',
  '내 직감이 맞는지... 카드가 직접 확인해줄 거야\n\n세 장의 에너지 카드를 펼쳤어\n하나를 골라봐. 끌리는 대로',
  '이건 내 감이고...\n이제 카드한테 진짜를 물어볼 시간이야\n\n세 장의 카드가 기다리고 있어.\n직감으로! 골라봐 ✨',
];

// ─── Public API ─────────────────────────────────────────

/** 콜드리딩 생성 */
export function generateColdReading(data: Partial<ColdReadingData>): ColdReadingOutput {
  const emotion = data.surfaceEmotion ?? '';
  const attachment = data.attachmentHint ?? 'unknown';
  const dynamic = data.powerDynamic ?? 'unknown';

  // 1. 바넘 스테이트먼트
  const barnumPool = findBarnumPool(emotion);
  const barnumStatement = barnumPool[Math.floor(Math.random() * barnumPool.length)];

  // 2. 레인보우 루즈
  const rainbowPool = RAINBOW_BY_ATTACHMENT[attachment];
  const rainbowRuse = rainbowPool[Math.floor(Math.random() * rainbowPool.length)];

  // 3. 관계 역학 인사이트
  const insightPool = RELATION_INSIGHT[dynamic];
  const relationInsight = insightPool[Math.floor(Math.random() * insightPool.length)];

  // 4. 줌인 훅
  const zoomInHook = ZOOM_IN_HOOKS[Math.floor(Math.random() * ZOOM_IN_HOOKS.length)];

  return { barnumStatement, rainbowRuse, relationInsight, zoomInHook };
}

/** 콜드리딩 멘트 조합 */
export function composeColdReadingMessage(output: ColdReadingOutput): string {
  return [
    output.barnumStatement,
    '',
    output.rainbowRuse,
    '',
    output.relationInsight,
    '',
    output.zoomInHook,
  ].join('\n');
}

// ─── Internal ───────────────────────────────────────────

function findBarnumPool(emotion: string): string[] {
  for (const [key, pool] of Object.entries(BARNUM_BY_EMOTION)) {
    if (emotion.includes(key)) return pool;
  }
  return BARNUM_DEFAULT;
}
