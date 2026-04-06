/**
 * 🔮 v23: 타로 메타포 솔루션 사전
 *
 * 심리학 기반 해결책을 타로 카드 메타포로 감싸서 전달
 * 카드 ID × 시나리오 매핑으로 개인화된 조언 제공
 *
 * 구조: 각 솔루션은 특정 카드가 나왔을 때 + 특정 시나리오일 때 활성화
 * 근거: EFT, CBT, Gottman, SFBT를 타로 언어로 변환
 */

import { RelationshipScenario } from '@/types/engine.types';

export interface TarotSolution {
  /** 이 솔루션의 메타포가 되는 카드 ID */
  cardId: string;
  /** 적용 시나리오 (여러 개 가능) */
  scenarios: RelationshipScenario[];
  /** 심리학 프레임워크 */
  framework: string;
  /** 카드 메타포 인사이트 (2문장) */
  metaphor: string;
  /** 구체적 행동 조언 (1문장) */
  action: string;
  /** 카톡/메시지 초안 */
  script?: string;
}

// ============================================
// Major Arcana 솔루션 (22장)
// ============================================

export const TAROT_SOLUTIONS: TarotSolution[] = [
  // 0. The Fool (바보) — 새로운 시작, 용기
  {
    cardId: 'major_0',
    scenarios: [RelationshipScenario.FIRST_MEETING, RelationshipScenario.UNREQUITED_LOVE, RelationshipScenario.RECONNECTION],
    framework: 'SFBT_exception_finding',
    metaphor: '바보 카드가 말해. 완벽한 준비는 없어, 그냥 한 발 내딛는 거야. 이 카드는 "시작할 용기"를 주고 있어.',
    action: '이번 주에 상대에게 먼저 연락하거나, 새로운 모임에 한 번 나가봐.',
    script: '요즘 좀 용기 내보려고 해. 같이 밥 한번 먹을래?',
  },

  // 1. The Magician (마법사) — 의지, 능력
  {
    cardId: 'major_1',
    scenarios: [RelationshipScenario.BREAKUP_CONTEMPLATION, RelationshipScenario.RELATIONSHIP_PACE],
    framework: 'CBT_cognitive_restructuring',
    metaphor: '마법사 카드는 네가 이미 필요한 도구를 다 가지고 있다고 말해. 부족한 게 아니라, 쓸 줄 모르고 있을 뿐이야.',
    action: '관계에서 내가 잘하는 것 3가지를 적어보고, 이번 주에 하나 실천해봐.',
  },

  // 2. The High Priestess (여교황) — 직관, 내면의 목소리
  {
    cardId: 'major_2',
    scenarios: [RelationshipScenario.JEALOUSY, RelationshipScenario.COMMITMENT_FEAR],
    framework: 'EFT_primary_emotion',
    metaphor: '여교황은 네 직관이 뭔가를 말하고 있다고 해. 머리로 분석하기 전에, 몸이 보내는 신호를 먼저 들어봐.',
    action: '다음에 불안할 때 3분만 눈 감고 "진짜 두려운 게 뭐지?" 스스로에게 물어봐.',
  },

  // 3. The Empress (여황제) — 풍요, 자기 사랑
  {
    cardId: 'major_3',
    scenarios: [RelationshipScenario.BOREDOM, RelationshipScenario.BREAKUP_CONTEMPLATION, RelationshipScenario.GENERAL],
    framework: 'ACT_values_exploration',
    metaphor: '여황제 카드는 "먼저 나를 채워"라고 말해. 관계에서 받으려고만 하면 바닥나지만, 내가 풍요로우면 자연스럽게 흘러.',
    action: '이번 주에 나만을 위한 시간 1시간 만들어. 상대 생각 없이, 오직 나.',
  },

  // 5. The Hierophant (교황) — 전통, 약속
  {
    cardId: 'major_5',
    scenarios: [RelationshipScenario.COMMITMENT_FEAR, RelationshipScenario.RELATIONSHIP_PACE],
    framework: 'Gottman_shared_meaning',
    metaphor: '교황 카드는 "약속"의 에너지야. 관계에도 합의된 규칙이 필요해. 서로의 기대를 맞춰본 적 있어?',
    action: '상대와 "우리 관계에서 가장 중요한 것" 하나씩 말해보는 시간을 가져봐.',
    script: '우리 사이에서 제일 중요한 게 뭔지 한번 얘기해볼까?',
  },

  // 6. The Lovers (연인) — 선택, 조화
  {
    cardId: 'major_6',
    scenarios: [RelationshipScenario.UNREQUITED_LOVE, RelationshipScenario.FIRST_MEETING, RelationshipScenario.BREAKUP_CONTEMPLATION],
    framework: 'EFT_attachment_bond',
    metaphor: '연인 카드는 "선택"의 카드야. 사랑은 감정이기도 하지만, 매일의 선택이기도 해. 지금 네가 선택해야 할 건 뭘까?',
    action: '오늘 상대에게 솔직한 감정을 한 문장으로 전달해봐. 결과보다 표현 자체가 중요해.',
    script: '너한테 솔직하게 말하고 싶은 게 있어. 잠깐 시간 돼?',
  },

  // 8. Strength (힘) — 내면의 힘, 인내
  {
    cardId: 'major_8',
    scenarios: [RelationshipScenario.INFIDELITY, RelationshipScenario.GHOSTING, RelationshipScenario.LONG_DISTANCE],
    framework: 'ACT_acceptance',
    metaphor: '힘 카드는 근육의 힘이 아니라 "부드러운 인내"야. 지금 이 고통을 견딜 수 있는 건, 네가 생각보다 강하기 때문이야.',
    action: '힘들 때 "지금 이 감정은 지나간다"를 3번 반복해봐. 감정은 파도야, 영원하지 않아.',
  },

  // 9. The Hermit (은둔자) — 내면 탐색, 고독
  {
    cardId: 'major_9',
    scenarios: [RelationshipScenario.COMMITMENT_FEAR, RelationshipScenario.BREAKUP_CONTEMPLATION, RelationshipScenario.BOREDOM],
    framework: 'EFT_self_soothing',
    metaphor: '은둔자 카드는 "혼자만의 시간이 필요해"라고 말해. 관계가 복잡할수록, 조용히 나를 만나는 시간이 답을 줘.',
    action: '이번 주에 30분 혼자 산책하면서 "나는 이 관계에서 뭘 원하지?" 물어봐.',
  },

  // 10. Wheel of Fortune (운명의 수레바퀴) — 변화, 전환점
  {
    cardId: 'major_10',
    scenarios: [RelationshipScenario.RECONNECTION, RelationshipScenario.BREAKUP_CONTEMPLATION, RelationshipScenario.GENERAL],
    framework: 'MI_change_talk',
    metaphor: '수레바퀴 카드가 말해. 지금은 전환점이야. 바퀴는 항상 돌아. 좋은 시기도, 힘든 시기도 영원하지 않아.',
    action: '변화를 두려워하지 말고, "이 변화가 나를 어디로 데려갈까?" 적어봐.',
  },

  // 12. The Hanged Man (매달린 남자) — 새로운 시각, 기다림
  {
    cardId: 'major_12',
    scenarios: [RelationshipScenario.READ_AND_IGNORED, RelationshipScenario.GHOSTING, RelationshipScenario.RELATIONSHIP_PACE],
    framework: 'CBT_perspective_shift',
    metaphor: '매달린 남자는 "거꾸로 보면 다르게 보여"라고 말해. 지금 상황을 상대 입장에서 보면 어떨까?',
    action: '읽씹/잠수가 "나를 싫어해서"인지 "지금 여유가 없어서"인지, 두 가지 가능성을 적어봐.',
    script: '요즘 바빠 보여서 연락 조심스러웠는데, 괜찮아?',
  },

  // 13. Death (죽음) — 끝과 새 시작
  {
    cardId: 'major_13',
    scenarios: [RelationshipScenario.BREAKUP_CONTEMPLATION, RelationshipScenario.INFIDELITY, RelationshipScenario.RECONNECTION],
    framework: 'ACT_letting_go',
    metaphor: '죽음 카드는 "끝"이 아니라 "탈피"야. 뱀이 허물을 벗듯이, 낡은 패턴을 벗어야 새로운 관계가 시작돼.',
    action: '이 관계에서 "더 이상 반복하지 않을 것" 하나를 정해서 적어봐.',
  },

  // 14. Temperance (절제) — 균형, 인내
  {
    cardId: 'major_14',
    scenarios: [RelationshipScenario.JEALOUSY, RelationshipScenario.RELATIONSHIP_PACE, RelationshipScenario.LONG_DISTANCE],
    framework: 'Gottman_repair_attempt',
    metaphor: '절제 카드는 "급하지 않아"라고 말해. 관계는 카페인이 아니라 허브티야. 천천히 우려내야 맛있어.',
    action: '확인하고 싶은 충동이 올 때, 5분만 기다려봐. 5분 후에도 확인하고 싶으면 그때 해.',
  },

  // 15. The Devil (악마) — 집착, 의존
  {
    cardId: 'major_15',
    scenarios: [RelationshipScenario.JEALOUSY, RelationshipScenario.INFIDELITY, RelationshipScenario.READ_AND_IGNORED],
    framework: 'CBT_thought_record',
    metaphor: '악마 카드가 보여주는 건 "쇠사슬은 네가 풀 수 있다"는 거야. 집착처럼 보이지만, 사실 불안에서 오는 거야.',
    action: '확인/의심 충동이 올 때 "지금 내가 원하는 건 확인인가, 안심인가?" 스스로에게 물어봐.',
  },

  // 16. The Tower (탑) — 갑작스러운 변화, 충격
  {
    cardId: 'major_16',
    scenarios: [RelationshipScenario.INFIDELITY, RelationshipScenario.BREAKUP_CONTEMPLATION, RelationshipScenario.GHOSTING],
    framework: 'trauma_processing',
    metaphor: '탑 카드가 무너지는 건... 낡은 구조가 무너져야 새로운 걸 지을 수 있다는 뜻이야. 지금 아프지만, 이건 재건의 시작이야.',
    action: '지금은 무너지는 감정을 그냥 느껴도 돼. "무너진 자리에 뭘 세울지"는 나중에 결정해.',
    script: '솔직히 지금 많이 힘들어. 바로 답 안 나와도 괜찮으니, 마음 정리할 시간이 필요해.',
  },

  // 17. The Star (별) — 희망, 치유
  {
    cardId: 'major_17',
    scenarios: [RelationshipScenario.GHOSTING, RelationshipScenario.INFIDELITY, RelationshipScenario.BREAKUP_CONTEMPLATION, RelationshipScenario.GENERAL],
    framework: 'SFBT_miracle_question',
    metaphor: '별 카드는 가장 어두운 밤에 빛나는 카드야. 지금 힘들지만, 이 아픔 뒤에 치유가 기다리고 있어.',
    action: '"내일 아침 기적처럼 모든 게 해결되면, 가장 먼저 뭘 할까?" 적어봐. 그게 네가 원하는 방향이야.',
  },

  // 18. The Moon (달) — 불안, 혼란, 무의식
  {
    cardId: 'major_18',
    scenarios: [RelationshipScenario.READ_AND_IGNORED, RelationshipScenario.GHOSTING, RelationshipScenario.JEALOUSY, RelationshipScenario.COMMITMENT_FEAR],
    framework: 'EFT_attachment_anxiety',
    metaphor: '달 카드가 말해. 지금 네가 느끼는 불안은 진짜 위험이 아니라, 마음의 밀물이야. 밀물은 반드시 빠져.',
    action: '불안할 때 3분만 멈추고 "이건 사실인가, 내 상상인가?" 물어봐.',
    script: '답장 없어서 좀 불안했어. 바쁜 거 알지만, 짧게라도 답해주면 안심돼.',
  },

  // 19. The Sun (태양) — 기쁨, 성공, 명확함
  {
    cardId: 'major_19',
    scenarios: [RelationshipScenario.FIRST_MEETING, RelationshipScenario.UNREQUITED_LOVE, RelationshipScenario.GENERAL],
    framework: 'positive_psychology',
    metaphor: '태양 카드가 빛나고 있어! 지금 네 에너지는 밝고 따뜻해. 이 에너지를 그대로 상대에게 보여줘.',
    action: '오늘 상대에게 밝은 에너지로 연락해봐. 무거운 고민 대신, 가벼운 한마디.',
    script: '오늘 날씨 좋다! 뭐해? ㅎㅎ',
  },

  // 20. Judgement (심판) — 재평가, 결단
  {
    cardId: 'major_20',
    scenarios: [RelationshipScenario.RECONNECTION, RelationshipScenario.BREAKUP_CONTEMPLATION],
    framework: 'MI_decisional_balance',
    metaphor: '심판 카드는 "결단의 시간"이 왔다고 말해. 과거를 돌아보되, 과거에 갇히지는 마.',
    action: '종이 한가운데에 선을 긋고, 왼쪽에 "남으면 좋은 점", 오른쪽에 "떠나면 좋은 점" 적어봐.',
  },

  // 21. The World (세계) — 완성, 한 사이클의 끝
  {
    cardId: 'major_21',
    scenarios: [RelationshipScenario.BREAKUP_CONTEMPLATION, RelationshipScenario.BOREDOM, RelationshipScenario.GENERAL],
    framework: 'narrative_therapy',
    metaphor: '세계 카드는 "한 챕터가 끝났다"고 말해. 끝은 실패가 아니라, 다음 이야기의 시작이야.',
    action: '이 관계에서 배운 것 3가지를 적어봐. 그게 다음 관계의 자산이 돼.',
  },

  // ============================================
  // Minor Arcana 핵심 카드 솔루션 (연애 빈도 높은 카드)
  // ============================================

  // Ace of Cups — 새로운 사랑/감정
  {
    cardId: 'minor_cups_1',
    scenarios: [RelationshipScenario.FIRST_MEETING, RelationshipScenario.UNREQUITED_LOVE, RelationshipScenario.RECONNECTION],
    framework: 'EFT_emotional_opening',
    metaphor: '컵 에이스! 새로운 감정의 물결이 시작되고 있어. 이 감정을 억누르지 말고, 천천히 흘려보내.',
    action: '이번 주에 상대에게 "좋아하는 마음"을 한 가지 방식으로 표현해봐. 말이든, 행동이든.',
  },

  // 2 of Cups — 상호 끌림
  {
    cardId: 'minor_cups_2',
    scenarios: [RelationshipScenario.FIRST_MEETING, RelationshipScenario.UNREQUITED_LOVE, RelationshipScenario.RELATIONSHIP_PACE],
    framework: 'Gottman_love_map',
    metaphor: '컵 2는 "두 마음이 만나고 있다"는 신호야. 완벽할 필요 없어, 진심이 통하면 돼.',
    action: '상대에게 "고마워" 또는 "네 덕분에" 한마디 전해봐. 작은 표현이 큰 연결을 만들어.',
    script: '오늘 네 덕분에 좋은 하루였어 ㅎㅎ 고마워.',
  },

  // 3 of Swords — 상처, 이별의 아픔
  {
    cardId: 'minor_swords_3',
    scenarios: [RelationshipScenario.INFIDELITY, RelationshipScenario.BREAKUP_CONTEMPLATION, RelationshipScenario.GHOSTING],
    framework: 'EFT_grief_processing',
    metaphor: '검 3의 세 개의 검은 지금 네 마음에 꽂혀 있어. 하지만 검을 뽑아야 상처가 낫기 시작해. 아파도 느끼는 게 치유의 첫걸음이야.',
    action: '아픈 감정을 3문장으로 적어봐. "나는 ~해서 아프다. 왜냐하면 ~이니까." 적으면 빠져나가기 시작해.',
  },

  // 4 of Cups — 권태, 무관심
  {
    cardId: 'minor_cups_4',
    scenarios: [RelationshipScenario.BOREDOM, RelationshipScenario.COMMITMENT_FEAR],
    framework: 'Gottman_fondness_admiration',
    metaphor: '컵 4는 "눈앞에 있는 걸 못 보고 있다"는 카드야. 지루함의 반대는 설렘이 아니라, "관심"이야.',
    action: '이번 주에 상대의 새로운 면 하나를 발견해봐. 매일 보는 사람도 모르는 면이 있어.',
  },

  // 8 of Swords — 갇힌 느낌, 자기 제한
  {
    cardId: 'minor_swords_8',
    scenarios: [RelationshipScenario.COMMITMENT_FEAR, RelationshipScenario.READ_AND_IGNORED, RelationshipScenario.JEALOUSY],
    framework: 'CBT_cognitive_distortion',
    metaphor: '검 8은 "눈가리개를 벗으면 빠져나갈 수 있다"는 카드야. 갇혀있다고 느끼지만, 사실 문은 열려있어.',
    action: '"나는 ~할 수 없어"를 "나는 ~을 선택할 수 있어"로 바꿔봐. 한 문장만.',
  },

  // 10 of Cups — 행복한 결말, 가족
  {
    cardId: 'minor_cups_10',
    scenarios: [RelationshipScenario.FIRST_MEETING, RelationshipScenario.RELATIONSHIP_PACE, RelationshipScenario.GENERAL],
    framework: 'positive_psychology',
    metaphor: '컵 10은 "행복한 결말"의 카드야. 하지만 행복은 도착지가 아니라, 매일의 선택이라는 걸 기억해.',
    action: '오늘 관계에서 행복했던 순간 하나를 떠올리고, 그 느낌을 일기에 적어봐.',
  },

  // Knight of Cups — 로맨스, 감정적 접근
  {
    cardId: 'minor_cups_12',
    scenarios: [RelationshipScenario.UNREQUITED_LOVE, RelationshipScenario.FIRST_MEETING, RelationshipScenario.ONLINE_LOVE],
    framework: 'SFBT_scaling',
    metaphor: '컵 기사는 "마음을 들고 다가가는 용기"의 카드야. 고백이든 표현이든, 용기를 낸 순간 이미 반은 성공이야.',
    action: '1-10점으로, 지금 고백/표현할 용기가 몇 점이야? 1점이라도 올릴 방법을 하나 적어봐.',
  },

  // Page of Swords — 호기심, 탐색
  {
    cardId: 'minor_swords_11',
    scenarios: [RelationshipScenario.ONLINE_LOVE, RelationshipScenario.FIRST_MEETING],
    framework: 'curiosity_approach',
    metaphor: '검 페이지는 "호기심으로 다가가"라고 말해. 상대를 판단하지 말고, 진짜 궁금해하면 연결이 시작돼.',
    action: '상대에게 "진짜 궁금한 질문" 하나를 해봐. "넌 행복할 때 뭐 해?" 같은 깊은 질문.',
    script: '갑자기 궁금한데, 넌 진짜 행복할 때 뭐 해?',
  },
];

// ============================================
// 솔루션 매칭 함수
// ============================================

/**
 * 뽑힌 카드 + 시나리오로 가장 적합한 솔루션 검색
 */
export function matchTarotSolutions(
  cardIds: string[],
  scenario: RelationshipScenario,
  limit: number = 3,
): TarotSolution[] {
  const matched: { solution: TarotSolution; score: number }[] = [];

  for (const solution of TAROT_SOLUTIONS) {
    // 카드 ID 매칭
    const cardMatch = cardIds.includes(solution.cardId);
    if (!cardMatch) continue;

    // 시나리오 매칭
    const scenarioMatch = solution.scenarios.includes(scenario)
      || solution.scenarios.includes(RelationshipScenario.GENERAL);

    const score = (cardMatch ? 1.0 : 0) + (scenarioMatch ? 0.5 : 0.1);
    matched.push({ solution, score });
  }

  return matched
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((m) => m.solution);
}

/**
 * 카드 메타포 솔루션을 프롬프트용 텍스트로 변환
 */
export function getTarotSolutionPrompt(
  solutions: TarotSolution[],
): string {
  if (solutions.length === 0) return '';

  const lines = solutions.map((s, i) => (
    `${i + 1}. [${s.framework}] ${s.metaphor}\n   행동: ${s.action}${s.script ? `\n   카톡 초안: "${s.script}"` : ''}`
  ));

  return `\n\n## 카드 기반 솔루션 (타로 메타포로 전달해)\n${lines.join('\n\n')}`;
}
