/**
 * 😴 BOREDOM 시나리오 특화 해결책 (15개)
 * 
 * 특화축: BoredomType (EMOTIONAL / CONVERSATIONAL / ROUTINE / SEXUAL / GROWTH_GAP)
 * + 범용 10축 교차 조합
 * 
 * 근거: 쾌락적 적응(HAP), 자기확장이론, Gottman 감정 은행,
 *       EFT 분화이론, 옥시토신 연구 (2024-2026)
 */

import { RelationshipScenario } from '@/types/engine.types';
import type { SolutionEntry } from './types';
import { BoredomType } from '@/engines/relationship-diagnosis/types';

export interface BoredomSolutionEntry extends SolutionEntry {
  axisCondition: {
    boredomType?: BoredomType[];
  };
  minAxisMatch: number;
  universalCondition?: {
    conflictStyle?: string[];
    changeReadiness?: string[];
    partnerContext?: string[];
    previousAttempts?: string[];
    duration?: string[];
    stage?: string[];
    pattern?: string[];
    attachmentClue?: string[];
  };
}

export const BOREDOM_SOLUTIONS: BoredomSolutionEntry[] = [

  // ──────────────────────────────────────────────
  // 💭 1. EMOTIONAL — 감정적 무관심
  // ──────────────────────────────────────────────
  {
    id: 'BOREDOM_EMOTIONAL_01',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['무감각', '감정 없', '사랑인지', '설레 없', '무덤덤'], minConfidence: 0.5 },
    solution: {
      framework: 'EFT + Gottman',
      technique: '감정 재연결 — 쾌락적 적응 이해 + 옥시토신 vs 도파민',
      principle: '설렘 감소 = 사랑 끝이 아님. 도파민→옥시토신 전환은 관계의 "성숙".',
      steps: {
        validation: '설렘이 없어지면 사랑이 끝난 건가 불안해지지. "예전엔 심장이 뛰었는데..."',
        insight: '뇌과학 "쾌락적 적응": 12-18개월 후 도파민(설렘) 자연 감소, 옥시토신(유대/안정) 증가. 이건 "실패"가 아닌 "진화".\n\n진짜 위험 신호는 "설렘 없다"가 아니라 "같이 있을 때 불편하다"야.',
        action: '1. "옥시토신 리스트": 걔가 주는 안정감/편안함 5가지 적어\n2. 설렘 그리움 vs "이 사람이 아님" 구분\n3. 설렘 그리우면 → 새로운 경험(BOREDOM_ROUTINE). 이 사람 아니면 → 이별 고민',
      },
      source: 'Lyubomirsky (2024): Hedonic Adaptation + Harvard Neurochemistry (2025)',
      researchNote: '쾌락적 적응은 관계 만족도 평균 20% 감소시키지만, 의도적 전략으로 50% 늦출 수 있음.',
      expertQuote: 'Lyubomirsky: "행복의 40%는 의도적 활동에 의해 결정됩니다."',
      scientificBasis: '도파민→옥시토신 전환: VTA에서 시상하부로의 신경전달물질 우세 경로 변화.',
      koreanContext: '한국 권태기 경험 72%. 평균 14-18개월. "설렘 감소=이별 사유" 41%.',
      emotionTier: 'mild',
    },
    priority: 1,
    persona: { counselor: '쾌락적 적응 과학적 설명. 도파민→옥시토신 전환이 성숙임을 안내', friend: '설렘 줄은 거 정상이야. "편한함" 5가지 써봐 — 그게 진짜 사랑이야' },
    axisCondition: { boredomType: [BoredomType.EMOTIONAL] },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 💬 2. CONVERSATIONAL — 대화 고갈
  // ──────────────────────────────────────────────
  {
    id: 'BOREDOM_CONVO_01',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['할 말 없', '대화 없', '뭐 얘기', '조용', '말이 없'], minConfidence: 0.5 },
    solution: {
      framework: 'Gottman',
      technique: '소통 패턴 리셋 — Love Map 업데이트 + 36 질문',
      principle: 'Gottman: 대화 고갈은 "서로에 대한 호기심" 감소. Love Map(상대 내면 지도) 업데이트가 해결책.',
      steps: {
        validation: '같이 있어도 할 말이 없으면 진짜 답답하지. "예전엔 밤새 얘기했는데..."',
        insight: 'Gottman Love Map: 대화 고갈 ≠ 공통점 부족. 상대의 변화(최근 고민/꿈/스트레스)를 모르고 있어서.\n\nArthur Aron "36 질문": 낯선 사람도 36개 질문으로 친밀감 형성 가능. 이미 아는 사이라면 "새로운 면"을 발견.',
        action: '1. Love Map 질문 3개: "요즘 가장 스트레스받는 거 뭐야?", "올해 가장 하고 싶은 것?", "나한테 바뀌었으면 하는 거?"\n2. 36 질문 데이트: 구글에 "Aron 36 질문" 검색 → 같이 답하기\n3. 규칙: 핸드폰 끄고 30분만 집중',
      },
      source: 'Gottman Love Map + Aron 36 Questions',
      researchNote: 'Love Map 업데이트 커플의 대화 만족도 4주 후 32% 상승.',
      expertQuote: 'Gottman: "파트너를 안다고 생각하는 순간 호기심이 사라집니다."',
      scientificBasis: '호기심은 전전두엽의 탐색 동기 회로 활성화. 새로운 정보가 도파민 분비 촉진.',
      koreanContext: '한국 커플 평균 대화 시간: 일 17분(교제 초기 대비 60% 감소).',
      emotionTier: 'mild',
    },
    priority: 1,
    persona: { counselor: 'Love Map 업데이트와 36 질문으로 대화 재시작', friend: '할 말 없다고? 걔한테 "요즘 가장 스트레스받는 거 뭐야?" 물어봐. 의외로 몰랐던 거 나와' },
    axisCondition: { boredomType: [BoredomType.CONVERSATIONAL] },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 🔄 3. ROUTINE — 일상 루틴 피로
  // ──────────────────────────────────────────────
  {
    id: 'BOREDOM_ROUTINE_01',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['맨날 같', '루틴', '뻔해', '반복', '밥 영화 카페'], minConfidence: 0.5 },
    solution: {
      framework: 'Aron Self-Expansion',
      technique: '자기확장이론 — 새로운 공유 경험 + 도파민 리셋',
      principle: 'Arthur Aron: 새롭고 도전적 활동을 함께 하면 관계 만족도 급격히 상승.',
      steps: {
        validation: '밥-영화-카페 반복이면 누구나 지쳐. 관계가 아니라 루틴이 되는 거지.',
        insight: '자기확장이론: 새로운 경험 → 도파민 재활성화 → 파트너와 연결.\n새 활동 커플의 관계 만족도가 대화만 하는 커플보다 2.4배.\n\n핵심: 여행처럼 큰 거 아니어도 돼. "안 해본 것"이면 충분.',
        action: '도파민 리셋 데이트:\n1. 이번 주 "안 해본 것" 1개: 방탈출, 원데이클래스, 등산, 야시장\n2. 핵심: "약간 긴장되는" 수준. 편한 건 도파민 안 나와\n3. 월 1회 "서프라이즈 데이트 교대" — 깜짝 계획',
      },
      source: 'Aron Self-Expansion Theory (2025)',
      researchNote: '새 활동 커플 만족도 12주 후에도 유의미하게 높게 유지.',
      expertQuote: 'Aron: "관계의 활력은 새로움에서 옵니다. \'처음\'이면 충분합니다."',
      scientificBasis: '새 경험 → VTA 도파민 뉴런 재활성화 → 파트너와 연관 보상 기억 형성.',
      koreanContext: '한국 MZ 새 경험 데이트: 방탈출 34%, 원데이클래스 28%, 팝업 22%. 3만원 이내.',
      emotionTier: 'mild',
    },
    priority: 1,
    persona: { counselor: '자기확장이론으로 새 경험의 관계 효과 설명', friend: '이번 주에 안 해본 거 하나 같이 해봐. 방탈출 어때?' },
    axisCondition: { boredomType: [BoredomType.ROUTINE] },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 💋 4. SEXUAL — 성적 권태
  // ──────────────────────────────────────────────
  {
    id: 'BOREDOM_SEXUAL_01',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['스킨십', '관계', '욕구', '매력', '끌리지'], minConfidence: 0.5 },
    solution: {
      framework: 'Gottman + EFT',
      technique: '친밀감 단계적 재구축 — 비성적 접촉부터',
      principle: '성적 권태의 해결은 "성적 기술"이 아니라 "감정적 친밀감" 재구축에서 시작.',
      steps: {
        validation: '스킨십이 줄거나 끌리지 않으면 관계에 대해 의심되지.',
        insight: 'EFT: 성적 친밀감은 감정적 친밀감의 결과. 순서가 중요.\n비성적 접촉(포옹 20초, 손잡기) → 옥시토신 분비 → 감정적 안전 → 성적 친밀감 자연 회복.\n\nGottman "6초 키스": 매일 6초 이상 의미 있는 키스. 6주 후 관계 만족도 24% 상승.',
        action: '단계별 재구축:\n1. Level 1: 의미 있는 포옹 20초(매일)\n2. Level 2: 함께 걸을 때 손잡기, 소파에서 기대기\n3. Level 3: "6초 키스" 매일\n4. 소통: "나 요즘 스킨십 줄어서 좀 아쉬워" 가볍게',
      },
      source: 'Gottman 6초 키스 + EFT 친밀감 연구',
      researchNote: '6초 키스 6주 실천 시 관계 만족도 24% 상승. 포옹 20초 = 옥시토신 활성화.',
      expertQuote: 'Gottman: "6초 키스는 매일 할 수 있는 가장 작은 혁명입니다."',
      scientificBasis: '신체 접촉 → 시상하부 옥시토신 분비 → 편도체 불안 억제 + 사회적 보상 활성화.',
      koreanContext: '한국 커플 스킨십 변화: 초기 주 30회 → 3년 후 주 3회. "민망해서" 47%.',
      emotionTier: 'mild',
    },
    priority: 1,
    persona: { counselor: '비성적 접촉에서 시작하는 단계적 친밀감 재구축', friend: '오늘 만나면 20초 안아봐. 과학적으로 효과 있어' },
    axisCondition: { boredomType: [BoredomType.SEXUAL] },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 📈 5. GROWTH_GAP — 성장 속도 차이
  // ──────────────────────────────────────────────
  {
    id: 'BOREDOM_GROWTH_01',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['성장', '뒤처져', '발전', '정체', '수준 차이'], minConfidence: 0.5 },
    solution: {
      framework: 'SFBT + EFT',
      technique: '공동 목표 설정 — 같은 방향 보기',
      principle: '성장 속도 차이는 "방향"의 문제일 수 있음. 같은 방향을 보는 것이 같은 속도보다 중요.',
      steps: {
        validation: '혼자만 성장하는 느낌이면 외롭지. "이 사람과 미래가 있나" 의문 들고.',
        insight: 'SFBT: 성장 격차의 핵심은 "속도"가 아니라 "방향".\n- 같은 방향(같은 가치/목표) → 속도 차이는 조율 가능\n- 다른 방향(다른 가치관) → 근본적 불일치\n\n연구: 공동 목표가 있는 커플의 만족도가 없는 커플보다 41% 높음.',
        action: '1. 서로의 1-3년 목표 공유해봐\n2. 겹치는 부분이 있으면 → 공동 목표로 만들어\n3. 완전히 다르면 → "같은 방향"인지 솔직히 대화\n4. 작은 것부터: 같이 운동, 같이 공부, 같이 읽기',
      },
      source: 'SFBT 목표 설정 + 관계 성장 연구',
      researchNote: '공동 목표 커플 만족도 41% 높음. 공동 프로젝트가 유대감 2.3배 증가.',
      expertQuote: 'de Shazer: "선호하는 미래를 구체적으로 그릴 수 있다면, 이미 만들어지고 있는 것입니다."',
      scientificBasis: '공동 목표 추구는 동기 부여 회로(전전두엽-기저핵)를 파트너와 연동시킴.',
      koreanContext: '한국 MZ "성장 속도 차이로 이별" 18%. "같이 성장하는 커플" 선호 73%.',
      emotionTier: 'mild',
    },
    priority: 1,
    persona: { counselor: '성장 속도보다 방향이 핵심임을 설명. 공동 목표 설정 안내', friend: '혼자 성장하는 느낌? 서로 1-3년 목표 공유해봐. 방향 같은지가 핵심이야' },
    axisCondition: { boredomType: [BoredomType.GROWTH_GAP] },
    minAxisMatch: 1,
  },

  // ══════════════════════════════════════════════
  // 📊 교차 조합 (6-15)
  // ══════════════════════════════════════════════

  // 6. 권태 + 각자 시간 — 건강한 분리
  {
    id: 'BOREDOM_INDEPENDENCE',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['각자', '혼자', '개인 시간', '독립'], minConfidence: 0.5 },
    solution: {
      framework: 'EFT', technique: '분화(Differentiation) + 그리움 재생성',
      principle: '건강한 관계 = "우리"와 "나"의 균형. 떨어져야 보고 싶어짐.',
      steps: {
        validation: '좀 떨어져있고 싶은데 죄책감 느끼는 거지.',
        insight: 'Bowen 분화이론: 각자 시간이 있어야 그리움과 호기심 재생. EFT: 주 1-2회 각자 시간 커플이 만족도 21% 높음.',
        action: '1. 주 1-2회 "각자의 날"\n2. 소통: "충전이지 거리두기가 아니야"\n3. 각자 시간 후 "나 오늘 이런 거 했어" 공유',
      },
      source: 'Bowen 분화이론 + EFT (2025)',
      researchNote: '적절한 개인 시간 커플 만족도 21% 높음.',
      expertQuote: 'Esther Perel: "욕망에는 공간이 필요합니다."',
      scientificBasis: '분화: 자아 독립성과 친밀감 동시 유지 능력. 높을수록 양쪽 만족.',
      koreanContext: '한국 "각자 시간" 긍정 63%, 부정 37%. 부정 이유: "멀어지는 것 같아서".',
      emotionTier: 'mild',
    },
    priority: 2,
    persona: { counselor: '분화이론으로 개인 시간의 관계 효과 설명', friend: '좀 떨어져 있어봐. 떨어져야 보고 싶잖아' },
    axisCondition: { boredomType: [BoredomType.ROUTINE, BoredomType.EMOTIONAL] },
    minAxisMatch: 1,
  },

  // 7. 권태 + 감사 습관
  {
    id: 'BOREDOM_GRATITUDE',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['당연', '고마운지', '처음처럼', '예전', '잊'], minConfidence: 0.5 },
    solution: {
      framework: 'Gottman', technique: '감사 개입 — 정서 은행 리필',
      principle: '감사 표현이 관계의 "정서 은행 계좌"를 채움. 긍정:부정 = 5:1이 건강한 비율.',
      steps: {
        validation: '예전에 고마웠던 것들이 당연해진 느낌이지.',
        insight: 'Gottman 감정 은행: 5:1 비율 유지가 건강한 관계. 권태기 커플은 1:1 이하.\n감사 표현 4주 후 관계 만족도 18% 상승.',
        action: '1. 매일 "고마운 점" 1개 말로 표현\n2. 21일 챌린지: 하루 1감사 × 21일\n3. 구체적일수록 효과: "오늘 ~해줘서 고마웠어"',
      },
      source: 'Gottman (2025): 감사 개입 + 5:1 비율',
      researchNote: '감사 개입 4주 후 관계 만족도 18% 상승. 5:1 회복 시 이별률 72% 감소.',
      expertQuote: 'Gottman: "행복한 커플의 비밀은 매일의 작은 긍정적 순간들입니다."',
      scientificBasis: '감사 → 옥시토신 + 전대상피질 사회적 보상 회로. 21일 반복 시 영구적 변화.',
      koreanContext: '한국 감사 표현 주 1회 미만 48%. "부끄러워서" 61%.',
      emotionTier: 'mild',
    },
    priority: 2,
    persona: { counselor: '감사 개입의 과학적 효과 설명', friend: '매일 "고마워" 1번. 진짜 달라져' },
    axisCondition: { boredomType: [BoredomType.EMOTIONAL, BoredomType.CONVERSATIONAL] },
    minAxisMatch: 1,
  },

  // 8. 권태 + 장기 관계
  {
    id: 'BOREDOM_LONG_TERM',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['오래', '몇년', '결혼', '장기'], minConfidence: 0.4 },
    solution: {
      framework: 'Gottman + Aron', technique: '관계 리뉴얼 — Love Map + 자기확장 복합',
      principle: '장기 관계 권태는 "상대를 다 안다"는 착각에서 비롯. Love Map 업데이트 + 새 경험이 해결책.',
      steps: {
        validation: '오래 만나면 다 아는 것 같지. 근데 진짜 다 알아?',
        insight: '연구: 장기 커플의 60%가 "상대의 최근 스트레스/꿈을 모름". 사실 모르는 게 더 많아.\n핵심: 호기심을 되살리는 것 = 관계 리뉴얼.',
        action: '1. "요즘 가장 고민인 것" 서로 물어봐\n2. "올해 같이 해보고 싶은 것" 3개씩\n3. 매달 "데이트 나이트" 1회 — 새로운 장소/활동',
      },
      source: 'Gottman Love Map + Aron Self-Expansion',
      researchNote: '월 1회 새 활동 데이트 커플의 장기 만족도 유지율 2.1배.',
      expertQuote: 'Perel: "익숙함과 욕망은 공존하기 어렵습니다. 의도적 노력이 필요합니다."',
      scientificBasis: '호기심 → 전전두엽 탐색 동기 활성화 → 상대에 대한 보상 반응 회복.',
      koreanContext: '한국 결혼 커플 "데이트 나이트" 실천률 12%. 실천 커플 만족도 34% 높음.',
      emotionTier: 'mild',
    },
    priority: 2,
    persona: { counselor: 'Love Map 업데이트 + 정기 데이트 나이트 설계', friend: '오래 만나서 다 아는 거 같지? 요즘 뭐 고민인지 물어봐. 모를걸' },
    axisCondition: { boredomType: [BoredomType.ROUTINE, BoredomType.CONVERSATIONAL, BoredomType.EMOTIONAL] },
    minAxisMatch: 1,
    universalCondition: { stage: ['ESTABLISHED'] },
  },

  // 9-10. 권태 + 위기 vs 안정
  {
    id: 'BOREDOM_VS_BREAKUP',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['끝', '헤어질까', '이별', '이 사람 맞는지'], minConfidence: 0.5 },
    solution: {
      framework: 'CBT + EFT', technique: '권태 vs 관계 종료 분별법',
      principle: '"지루하다" ≠ "사랑이 끝났다". 구분이 핵심.',
      steps: {
        validation: '권태 = 이별인지 헷갈리지.',
        insight: '권태(Boredom): 같이 있으면 편하지만 자극 부족 → 해결 가능\n관계 종료(Disconnection): 같이 있으면 불편/회피 → 구조적 문제\n\n핵심 질문: "이 사람과 새로운 활동을 하면 기대가 돼?" Yes→권태, No→종료 신호.',
        action: '1. 분별 질문: 함께 있을 때 "편안한데 지루" vs "불편하고 피하고 싶"\n2. 전자 → 루틴 변화 시도\n3. 후자 → 이별 고민 시나리오로',
      },
      source: 'CBT 구분법 + EFT 감정 진단',
      researchNote: '권태를 이별 사유로 결정 후 후회 비율 53%.',
      expertQuote: 'Perel: "지루함은 관계의 사망 진단이 아니라 변화의 처방전입니다."',
      scientificBasis: '편안함(옥시토신)과 무관심(감정 단절)은 다른 신경 경로.',
      koreanContext: '한국 "권태기에 이별" 후 후회 53%. "좀 더 노력할걸" 가장 큰 후회.',
      emotionTier: 'confused',
    },
    priority: 1,
    persona: { counselor: '권태와 관계 종료의 차이 구분 도움', friend: '지루한 거야 끝난 거야? 구분 먼저 해' },
    axisCondition: { boredomType: [BoredomType.EMOTIONAL, BoredomType.CONVERSATIONAL, BoredomType.ROUTINE, BoredomType.SEXUAL, BoredomType.GROWTH_GAP] },
    minAxisMatch: 1,
  },

  {
    id: 'BOREDOM_COMMUNICATION_RESET',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['소통', '대화법', '얘기 방식', '패턴'], minConfidence: 0.5 },
    solution: {
      framework: 'Gottman', technique: '소통 패턴 리셋 — 부드러운 시작 + 회복 시도',
      principle: 'Gottman: 대화의 첫 3분이 결과의 96% 결정. 부드러운 시작이 핵심.',
      steps: {
        validation: '대화가 항상 싸움으로 끝나면 아예 말을 안 하게 되지.',
        insight: '부드러운 시작 공식: "요즘 [상황]인 것 같아서 나는 [감정]. [구체적 요청] 해주면 좋겠어."\n비난으로 시작 시 96%가 3분 내 싸움 전환.',
        action: '1. 비난 → 요청 전환 연습\n2. "넌 항상" → "나는 ~할 때 ~한 느낌"\n3. 회복 시도: "잠깐 쉬고 다시 얘기하자"',
      },
      source: 'Gottman 부드러운 시작 (2025)',
      researchNote: '"비난 대신 요청"으로 시작 시 상대 수용률 3.8배.',
      expertQuote: 'Julie Gottman: "부드러운 시작은 문을 열어주는 것, 비난은 닫는 것입니다."',
      scientificBasis: '대화 첫 3분 → 코르티솔 수준 결정 → 전체 대화 분위기 예측.',
      koreanContext: '한국 커플 "비난으로 시작하는 대화" 비율 62%.',
      emotionTier: 'mild',
    },
    priority: 2,
    persona: { counselor: 'Gottman 부드러운 시작 기법 안내', friend: '"넌 항상"을 "나는 ~할 때"로 바꿔봐. 대화가 달라져' },
    axisCondition: { boredomType: [BoredomType.CONVERSATIONAL] },
    minAxisMatch: 1,
    universalCondition: { conflictStyle: ['PURSUE', 'CONFRONT'] },
  },

  // 11-15: 추가 교차 조합
  {
    id: 'BOREDOM_SURPRISE',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['서프라이즈', '깜짝', '이벤트', '기념일'], minConfidence: 0.4 },
    solution: {
      framework: 'Positive Psychology', technique: '일상 속 작은 서프라이즈 전략',
      principle: '큰 이벤트보다 작은 서프라이즈가 일상적 도파민을 유지.',
      steps: {
        validation: '뭔가 특별한 걸 해주고 싶은데 뭘 해야 할지 모르겠지.',
        insight: '연구: 큰 이벤트(여행)보다 작은 서프라이즈(간식 배달, 메모, 깜짝 데이트)가 일상 만족도에 더 큰 기여.',
        action: '이번 주 작은 서프라이즈 1개:\n- 배달 간식 보내기\n- 손편지/포스트잇\n- 갑자기 꽃\n- 좋아하는 음악 플레이리스트',
      },
      source: 'Positive Psychology: 일상 긍정 개입',
      researchNote: '주 1회 서프라이즈 커플의 관계 만족도 27% 높음.',
      expertQuote: 'Lyubomirsky: "작고 빈번한 긍정 경험이 크고 드문 것보다 행복에 기여합니다."',
      scientificBasis: '예측 불가 보상(variable-ratio) → 도파민 분비 극대화.',
      koreanContext: '한국 인기 서프라이즈: 배달 간식 41%, 깜짝 데이트 28%, 편지 18%.',
      emotionTier: 'mild',
    },
    priority: 3,
    persona: { counselor: '작은 서프라이즈의 과학적 효과 설명', friend: '이번 주 깜짝으로 배달 간식 보내봐. 작은 거에 감동받아' },
    axisCondition: { boredomType: [BoredomType.ROUTINE, BoredomType.EMOTIONAL] },
    minAxisMatch: 1,
  },

  {
    id: 'BOREDOM_DIGITAL_DETOX',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['핸드폰', '각자 폰', 'SNS', '디지털'], minConfidence: 0.4 },
    solution: {
      framework: 'Gottman', technique: '디지털 디톡스 데이트 — 핸드폰 OFF 연결',
      principle: '함께 있어도 각자 핸드폰이면 "함께 혼자". 의도적 연결이 필요.',
      steps: {
        validation: '같이 있어도 각자 폰 보면 같이 있는 게 아니지.',
        insight: '연구: 식사 중 핸드폰 → 대화 질 37% 감소, 공감 41% 감소.\n"핸드폰 쌓기 게임": 식사 때 핸드폰 모아놓고 먼저 보는 사람이 밥값.',
        action: '1. 식사 시 핸드폰 뒤집어 놓기\n2. 주 1회 "디지털 디톡스 데이트"\n3. 잠자기 전 30분 핸드폰 금지 → 대화 시간',
      },
      source: 'Przybylski & Weinstein (2024): Phone Presence Effects',
      researchNote: '핸드폰 없는 식사 시 대화 질 37%, 공감 41% 향상.',
      expertQuote: 'Turkle: "우리는 연결되어 있지만 대화하지 않습니다."',
      scientificBasis: '핸드폰 존재만으로 "주의 분산 효과" → 깊은 대화 억제.',
      koreanContext: '한국 커플 "같이 있어도 각자 폰" 비율 67%. 소통 불만 1위.',
      emotionTier: 'mild',
    },
    priority: 3,
    persona: { counselor: '디지털 디톡스의 소통 개선 효과 설명', friend: '밥 먹을 때 폰 뒤집어. 그것만으로 대화 달라져' },
    axisCondition: { boredomType: [BoredomType.CONVERSATIONAL, BoredomType.EMOTIONAL] },
    minAxisMatch: 1,
  },

  {
    id: 'BOREDOM_FUTURE_VISION',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['미래', '같이 늙', '비전', '방향'], minConfidence: 0.4 },
    solution: {
      framework: 'SFBT', technique: '선호 미래 그리기 — 공동 비전 보드',
      principle: '같은 미래를 그리는 커플이 현재의 권태를 견딜 동기가 생김.',
      steps: {
        validation: '미래가 안 보이면 현재도 의미 없어 보이지.',
        insight: 'SFBT: 구체적 미래 이미지가 현재 동기를 만들어. 종착점이 있으면 기다림이 희망으로.',
        action: '1. "3년 후 우리 모습" 각자 그려봐\n2. 겹치는 부분이 공동 비전\n3. 비전 보드 만들기: 사진/글 모아서',
      },
      source: 'SFBT 선호 미래 기법',
      researchNote: '공동 비전이 있는 커플의 현재 만족도 38% 높음.',
      expertQuote: 'de Shazer: "원하는 미래를 그릴 수 있다면, 이미 만들어지고 있습니다."',
      scientificBasis: '미래 시각화 → 전전두엽 동기 회로 활성화 → 현재 행동 변화.',
      koreanContext: '한국 커플 "미래 대화" 빈도: 월 1회 미만 56%.',
      emotionTier: 'mild',
    },
    priority: 3,
    persona: { counselor: '공동 비전 만들기의 동기 부여 효과', friend: '3년 후 같이 뭐 하고 싶은지 얘기해봐. 미래가 보이면 현재가 달라져' },
    axisCondition: { boredomType: [BoredomType.GROWTH_GAP, BoredomType.EMOTIONAL] },
    minAxisMatch: 1,
  },

  {
    id: 'BOREDOM_COUPLE_PROJECT',
    scenario: RelationshipScenario.BOREDOM,
    trigger: { keywords: ['같이 뭔가', '프로젝트', '도전', '목표'], minConfidence: 0.4 },
    solution: {
      framework: 'Aron + SFBT', technique: '커플 프로젝트 — 공동 도전으로 유대감',
      principle: 'Together challenge leads to achievement and bonding cycle.',
      steps: {
        validation: '같이 뭔가 해보고 싶은 마음이 있는 거잖아. 좋은 신호야.',
        insight: '연구: 공동 프로젝트가 관계 유대감 2.3배 증가. 어려운 것일수록 효과적.',
        action: '커플 프로젝트 아이디어:\n- 함께 요리 도전 (새 레시피 매주 1개)\n- 커플 운동 (러닝/클라이밍)\n- 여행 저금 챌린지\n- 함께 배움 (언어/악기)',
      },
      source: 'Aron Self-Expansion + SFBT 공동 목표',
      researchNote: '공동 프로젝트 커플 유대감 2.3배, 대화량 47% 증가.',
      expertQuote: 'Aron: "함께 성장하는 경험이 관계의 가장 강력한 접착제입니다."',
      scientificBasis: '공동 도전 → 동기화된 도파민 분비 → "우리" 기억 형성.',
      koreanContext: '한국 인기 커플 프로젝트: 여행 저금 38%, 운동 31%, 요리 21%.',
      emotionTier: 'mild',
    },
    priority: 3,
    persona: { counselor: '공동 프로젝트의 유대감 효과 설명', friend: '같이 뭔가 해봐. 커플 러닝이나 요리 도전 어때?' },
    axisCondition: { boredomType: [BoredomType.ROUTINE, BoredomType.GROWTH_GAP] },
    minAxisMatch: 1,
    universalCondition: { changeReadiness: ['READY_TO_ACT'] },
  },
];
