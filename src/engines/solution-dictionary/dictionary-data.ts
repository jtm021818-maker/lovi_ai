/**
 * 🆕 v7: 해결책 사전 데이터 (6종 시나리오 × 5개 = 30개)
 * 
 * 읽씹(READ_AND_IGNORED)은 read-ignored-solutions.ts로 이동 (25개 세분화)
 * 
 * 근거: Gottman Method, EFT, SFBT, CBT, MI (2025~2026 자료)
 * 한국 MZ세대 연애 특화
 */

import { RelationshipScenario, AttachmentType } from '@/types/engine.types';
import type { SolutionEntry } from './types';

export const SOLUTION_DICTIONARY: SolutionEntry[] = [

  // ============================================================
  // 📱 READ_AND_IGNORED (읽씹) — read-ignored-solutions.ts로 이동
  // → 5축 진단 기반 25개 세분화 해결책으로 대체됨
  // ============================================================

  // ============================================================
  // 👻 GHOSTING (잠수)
  // ============================================================
  {
    id: 'GHOSTING_01',
    scenario: RelationshipScenario.GHOSTING,
    trigger: {
      keywords: ['잠수', '연락두절', '차단', '고스팅', '연락 끊', '사라져'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT',
      technique: '갈등 회피 심리 이해',
      principle: '잠수 = 갈등 처리 능력 부족. 상대를 이해하되 자신을 보호',
      steps: {
        validation: '연락 끊기면 머릿속에서 온갖 상상 다 하게 되지...',
        insight: '잠수 타는 사람은 대부분 갈등이 무서운 타입이야. 너를 싫어해서가 아닐 수 있어',
        action: '마지막 메시지 1번만 보내. "괜찮아? 답 안 해도 되는데 걱정돼서". 그리고 기다려',
      },
      messageDrafts: [
        '너 괜찮아? 답 안 해도 되는데 걱정돼서 한 번 보내봤어',
        '연락 없어서 좀 걱정되긴 하는데, 네 시간 존중할게',
      ],
      source: '2025 EFT 갈등 회피형 개입',
    },
    priority: 1,
    persona: {
      counselor: '상대 심리를 부드럽게 설명하고, 최후 메시지 제안',
      friend: '야 한 번만 보내고 기다려. 그래도 없으면 네가 생각해봐야 해',
    },
  },
  {
    id: 'GHOSTING_02',
    scenario: RelationshipScenario.GHOSTING,
    trigger: {
      keywords: ['잠수', '냉각기', '얼마나 기다려', '시간'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'SFBT',
      technique: '냉각기 설정 원칙',
      principle: '연애 기간 대비 적절한 냉각기. 무한정 기다림 X',
      steps: {
        validation: '얼마나 기다려야 하는지 모르겠으면 더 불안하지',
        insight: '보통 연애 기간의 10~20% 정도가 적당한 냉각기야',
        action: '기한을 정해. 예: 1년 사귈 경우 2~3주. 그 후에도 없으면 관계를 재평가해',
      },
      source: '2025 연애 심리 냉각기 가이드',
    },
    priority: 2,
    persona: {
      counselor: '냉각기의 구조를 제안하며 기다림의 기한을 설정',
      friend: '기한 정해. 무한정 기다리면 너만 힘들어',
    },
  },
  {
    id: 'GHOSTING_03',
    scenario: RelationshipScenario.GHOSTING,
    trigger: {
      keywords: ['잠수', '다시 연락', '재연락', '돌아옴'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: 'I-message + 경계 재설정',
      principle: '재연락 시 비난 대신 감정 표현, 경계 재설정',
      steps: {
        validation: '다시 연락 오면 반갑기도 하고 화나기도 하지',
        insight: '여기서 그냥 넘어가면 또 반복돼. 경계를 다시 잡아야 해',
        action: '이렇게 말해봐: "돌아와서 다행인데, 연락 없으면 나 불안해져. 힘들면 힘들다고만 말해줘"',
      },
      messageDrafts: [
        '연락 와서 좋긴 한데, 앞으로는 힘드면 힘들다고만 말해줘. 잠수는 나한테 진짜 힘들어',
      ],
      iMessageTemplate: '연락 없으면 나 {감정}해져. 앞으로는 {요청}해줘',
      source: '2025 Gottman 복구 시도',
    },
    priority: 2,
    persona: {
      counselor: '재연락 시 비난 없이 경계를 재설정하는 방법 안내',
      friend: '야 그냥 넘어가지 마. 이번에 확실히 얘기해',
    },
  },
  {
    id: 'GHOSTING_04',
    scenario: RelationshipScenario.GHOSTING,
    trigger: {
      keywords: ['잠수', '내 잘못', '내가 뭘', '뭘 잘못'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '자기 귀인 편향 교정',
      principle: '상대의 행동은 상대의 선택. 내 탓이 아닐 수 있음',
      steps: {
        validation: '내가 뭘 잘못했나 계속 생각하면 진짜 힘들지',
        insight: '잠수는 걔의 감정 처리 방식이야. 네가 뭘 잘못해서가 아닐 확률이 높아',
        action: '네가 마지막으로 한 행동을 떠올려봐. 진짜 문제될 게 있었어? 대부분 없거든',
      },
      source: '2025 CBT 귀인 편향 교정',
    },
    priority: 3,
    persona: {
      counselor: '자기 비난 패턴을 인지하도록 부드럽게 안내',
      friend: '야 네 잘못이 아닐 수 있어. 걔 문제야',
    },
  },
  {
    id: 'GHOSTING_05',
    scenario: RelationshipScenario.GHOSTING,
    trigger: {
      keywords: ['잠수', '끝', '정리', '포기'],
      emotionRange: [-3, 1],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'ACT',
      technique: '수용 + 새 방향 설정',
      principle: '변할 수 없는 것 수용. 내 에너지를 내 삶에 투자',
      steps: {
        validation: '정리하려는 마음이 든 거면, 네가 많이 생각한 거지',
        insight: '정리가 포기가 아니야. 네 에너지를 네 삶에 쓰겠다는 거야',
        action: '마지막 인사 한 번 보내고, SNS 알림 끄고, 네 루틴 1가지 새로 시작해봐',
      },
      source: '2025 ACT 수용 + 가치 기반 행동',
    },
    priority: 4,
    persona: {
      counselor: '정리의 의미를 재정의하며 새 방향을 안내',
      friend: '정리하는 거 포기 아니야. 네 삶 챙기는 거야',
    },
  },

  // ============================================================
  // 🌐 LONG_DISTANCE (장거리)
  // ============================================================
  {
    id: 'LONG_DISTANCE_01',
    scenario: RelationshipScenario.LONG_DISTANCE,
    trigger: {
      keywords: ['장거리', '멀리', '자주 못 만', '못만나', '보고싶'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '소통 루틴 구축',
      principle: '예측 가능한 소통 = 안정감. 루틴이 신뢰를 만듦',
      steps: {
        validation: '보고 싶을 때 못 보면 진짜 외로운 거 당연해',
        insight: '장거리는 루틴이 핵심이야. 랜덤 연락보다 정해진 시간이 안정감을 줘',
        action: '매일 밤 10분 전화 같은 루틴 만들어봐. 작아도 꾸준한 게 중요해',
      },
      source: '2025 Gottman 원격 관계 가이드',
    },
    priority: 1,
    persona: {
      counselor: '소통 루틴의 중요성과 구체적 방법 안내',
      friend: '야 루틴 만들어. 매일 밤 10분 전화 이런 거',
    },
  },
  {
    id: 'LONG_DISTANCE_02',
    scenario: RelationshipScenario.LONG_DISTANCE,
    trigger: {
      keywords: ['장거리', '불안', '의심', '뭐하나'],
      attachmentStyles: [AttachmentType.ANXIOUS],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT',
      technique: '불안형 애착 + 장거리',
      principle: '불안감을 숨기지 말고 표현. 단, I-message로',
      steps: {
        validation: '멀리 있으니까 뭐하나 궁금하고 불안한 거 당연해',
        insight: '근데 확인 연락이 많아지면 걔한테도 부담이 돼',
        action: '보고 싶을 때 그 감정 그대로 말해봐: "오늘 좀 보고 싶더라~" 이렇게',
      },
      messageDrafts: [
        '오늘 좀 보고 싶어지더라 ㅎㅎ',
        '뭐하나 궁금했어. 좋은 하루 보내고 있어?',
      ],
      source: '2025 EFT 장거리 불안 관리',
    },
    priority: 2,
    persona: {
      counselor: '불안 표현을 I-message로 전환하는 방법 안내',
      friend: '확인 연락 대신 보고 싶다고 말해. 가볍게',
    },
  },
  {
    id: 'LONG_DISTANCE_03',
    scenario: RelationshipScenario.LONG_DISTANCE,
    trigger: {
      keywords: ['장거리', '언제 끝', '끝점', '목표', '미래'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'SFBT',
      technique: '목표 설정 (끝점)',
      principle: '장거리의 종료 시점을 함께 정하면 불안 감소',
      steps: {
        validation: '끝이 안 보이면 진짜 지치지...',
        insight: '장거리는 "끝점"이 있어야 버틸 수 있어. 무기한은 관계를 갉아먹어',
        action: '같이 얘기해봐: "우리 언제까지 장거리야? 같은 도시에 살려면 뭘 해야 해?"',
      },
      source: '2025 SFBT 목표 설정 기법',
    },
    priority: 2,
    persona: {
      counselor: '장거리 종료 시점 설정의 중요성 안내',
      friend: '끝점 정해. "언제까지 장거리야?" 이거 진지하게 얘기해봐',
    },
  },
  {
    id: 'LONG_DISTANCE_04',
    scenario: RelationshipScenario.LONG_DISTANCE,
    trigger: {
      keywords: ['장거리', '데이트', '뭐 해', '같이 할'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'Gottman',
      technique: '공유 경험 증가',
      principle: '함께 할 수 있는 활동이 유대감을 유지',
      steps: {
        validation: '같이 뭔가 하고 싶은데 방법이 없는 것 같지',
        insight: '물리적으로 안 만나도 같이 할 수 있는 게 꽤 많아',
        action: '같은 영화 동시에 보면서 통화, 온라인 게임, 같은 책 읽기 같은 거 해봐',
      },
      source: '2025 장거리 연애 활동 가이드',
    },
    priority: 3,
    persona: {
      counselor: '원격 공유 활동 예시 제안',
      friend: '넷플릭스 같이 보면서 통화해봐. 의외로 재밌어',
    },
  },
  {
    id: 'LONG_DISTANCE_05',
    scenario: RelationshipScenario.LONG_DISTANCE,
    trigger: {
      keywords: ['장거리', '만남', '만날 때', '얼마만에'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'Gottman',
      technique: '다음 만남 날짜 확정',
      principle: '다음 만남이 확정되면 기다림이 기대로 전환',
      steps: {
        validation: '다음에 언제 볼지 모르면 기다림이 더 길게 느껴지지',
        insight: '다음 만남 날짜가 정해져 있으면 기다림이 기대로 바뀌어',
        action: '항상 다음 만남 날짜를 확정해놔. "이번 달 마지막 주말 어때?" 이런 식으로',
      },
      source: '2025 Gottman 긍정 정서 은행 이론',
    },
    priority: 3,
    persona: {
      counselor: '다음 만남 확정의 심리적 효과 설명',
      friend: '무조건 다음에 언제 볼지 정해놔. 그래야 기다릴 맛이 나',
    },
  },

  // ============================================================
  // 💚 JEALOUSY (질투)
  // ============================================================
  {
    id: 'JEALOUSY_01',
    scenario: RelationshipScenario.JEALOUSY,
    trigger: {
      keywords: ['질투', '집착', '의심', '누구랑', '여자친구', '남자친구', '이성'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '인지 왜곡 식별 (독심술)',
      principle: '증거 없이 상대 행동 해석 → 사실과 추측 분리',
      steps: {
        validation: '의심되면 머릿속에서 계속 돌아가지... 힘들지',
        insight: '근데 지금 그 생각이 "확인된 사실"이야, "내 추측"이야? 이걸 구분하는 게 중요해',
        action: '확인된 사실만 적어봐. 추측은 따로 적고. 사실만 보면 생각보다 별거 아닌 경우 많아',
      },
      source: '2025 CBT 독심술(Mind Reading) 교정',
    },
    priority: 1,
    persona: {
      counselor: '인지 왜곡을 부드럽게 식별하도록 안내',
      friend: '야 잠깐. 그거 확인된 거야 네 상상이야? 구분해봐',
    },
  },
  {
    id: 'JEALOUSY_02',
    scenario: RelationshipScenario.JEALOUSY,
    trigger: {
      keywords: ['질투', '핸드폰', '확인', '카톡', 'DM', '팔로우'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '신뢰 구축 vs 감시',
      principle: '핸드폰 확인은 불안을 키울 뿐. 직접 소통이 답',
      steps: {
        validation: '확인하고 싶은 마음은 충분히 이해해',
        insight: '근데 확인하면 잠깐 안심되다가 더 확인하고 싶어지거든. 불안의 악순환이야',
        action: '확인 대신 직접 물어봐: "나 좀 불안한데, 솔직하게 얘기해줘"',
      },
      iMessageTemplate: '나 {상황} 보니까 좀 불안해졌어. 솔직하게 얘기해줄 수 있어?',
      source: '2025 Gottman 신뢰 구축',
    },
    priority: 1,
    persona: {
      counselor: '감시와 소통의 차이를 부드럽게 설명',
      friend: '핸드폰 확인하면 더 꼬여. 직접 물어봐',
    },
  },
  {
    id: 'JEALOUSY_03',
    scenario: RelationshipScenario.JEALOUSY,
    trigger: {
      keywords: ['질투', '자존감', '비교', '못나', '부족'],
      emotionRange: [-5, -2],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'ACT',
      technique: '자기 가치 인정 (수용)',
      principle: '질투의 뿌리 = 열등감. 자존감 회복이 핵심',
      steps: {
        validation: '비교하게 되면 자존감이 바닥나지...',
        insight: '질투는 상대 문제가 아니라 내 자존감 문제인 경우가 많아',
        action: '걔의 좋은 점 3개 쓰는 대신, 네가 잘하는 것 3개 먼저 써봐',
      },
      source: '2025 ACT 자존감 회복',
    },
    priority: 3,
    persona: {
      counselor: '질투 뒤에 숨은 열등감을 부드럽게 탐색',
      friend: '비교하지 마. 네가 잘하는 거 3개 써봐',
    },
  },
  {
    id: 'JEALOUSY_04',
    scenario: RelationshipScenario.JEALOUSY,
    trigger: {
      keywords: ['질투', '솔직히', '말해야', '어떻게 말'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: 'I-message 질투 표현',
      principle: '질투를 비난 없이 표현하는 방법',
      steps: {
        validation: '질투하는 거 말하기 부끄럽지...',
        insight: '근데 숨기면 더 꼬여. 솔직하게 말하되, 비난이 아니라 네 감정으로',
        action: '이렇게 말해봐: "걔랑 있을 때 나 좀 불안했어. 질투하는 것 같아서 말하기 부끄럽지만"',
      },
      messageDrafts: [
        '걔랑 얘기하는 거 보면 나 좀 불안하더라. 내가 질투하는 건 알겠는데 솔직하게 말하고 싶었어',
      ],
      source: '2025 Gottman 감정 표현 기법',
    },
    priority: 2,
    persona: {
      counselor: '질투 표현의 올바른 방식을 I-message로 안내',
      friend: '솔직하게 말해. "나 질투나" 이게 오히려 매력이야',
    },
  },
  {
    id: 'JEALOUSY_05',
    scenario: RelationshipScenario.JEALOUSY,
    trigger: {
      keywords: ['질투', '감사', '좋은 점', '칭찬'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'Gottman',
      technique: '감사 문화 구축',
      principle: '감사 표현이 질투를 줄이고 관계를 강화',
      steps: {
        validation: '질투가 나는 건 걔가 소중하니까 그런 거야',
        insight: '질투 대신 감사로 에너지를 돌리면 관계가 완전히 달라져',
        action: '매일 걔의 좋은 점 1개씩 말해봐. "오늘 네가 ~해줘서 고마웠어"',
      },
      source: '2025 Gottman 감사 문화',
    },
    priority: 4,
    persona: {
      counselor: '감사 표현 습관의 관계 개선 효과 설명',
      friend: '걔 좋은 점 1개씩 매일 말해봐. 진짜 달라져',
    },
  },

  // ============================================================
  // 💔 INFIDELITY (외도/바람)
  // ============================================================
  {
    id: 'INFIDELITY_01',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['바람', '외도', '양다리', '다른 사람', '몰래 만'],
      minConfidence: 0.6,
    },
    solution: {
      framework: 'EFT',
      technique: '감정 처리 우선',
      principle: '외도 후 결정 전에 감정 처리가 먼저. 격앙 시 결정 자제',
      steps: {
        validation: '배신감, 분노, 슬픔... 지금 엄청 복잡하지',
        insight: '지금 이 감정으로 큰 결정 내리면 후회할 수 있어',
        action: '최소 1주는 큰 결정 보류해. 지금은 네 감정 처리가 먼저야. 믿을 수 있는 사람한테 얘기해',
      },
      source: '2025 EFT 외도 트라우마 케어',
    },
    priority: 1,
    persona: {
      counselor: '감정 처리 우선 원칙을 부드럽게 안내, 즉각적 결정 자제 권유',
      friend: '지금 결정하지마. 1주만 버티고 감정 정리부터',
    },
  },
  {
    id: 'INFIDELITY_02',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['바람', '확인', '증거', '진짜', '추측'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '사실 vs 추측 분리',
      principle: '확인된 사실과 추측을 명확히 구분',
      steps: {
        validation: '의심되면 모든 게 증거처럼 보이지',
        insight: '근데 확인된 사실이 뭐고, 네 추측이 뭔지 분리하는 게 지금 가장 중요해',
        action: '종이에 두 칸 만들어봐: "확인된 사실" / "내 추측". 이걸 분리하면 머릿속이 정리돼',
      },
      source: '2025 CBT 인지 재구성',
    },
    priority: 1,
    persona: {
      counselor: '사실-추측 분리법을 체계적으로 안내',
      friend: '야 잠깐. 확인된 거 뭐야? 추측 뭐야? 분리해봐',
    },
  },
  {
    id: 'INFIDELITY_03',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['바람', '용서', '다시', '기회'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '경계선 재설정',
      principle: '용서와 재결합은 다름. 재결합하려면 새로운 경계선 필수',
      steps: {
        validation: '용서하고 싶은 마음과 화난 마음이 동시에 들지',
        insight: '용서는 할 수 있지만, 재결합은 새로운 규칙이 필요해. 그냥 넘어가면 또 반복돼',
        action: '재결합한다면: (1) 상대가 완전히 인정, (2) 투명성 약속, (3) 새 경계선 설정. 이 3개 없으면 위험해',
      },
      source: '2025 Gottman 신뢰 재구축',
    },
    priority: 2,
    persona: {
      counselor: '용서와 재결합의 차이, 경계선 재설정 과정 안내',
      friend: '그냥 넘어가면 또 당해. 새 규칙 3개 정해',
    },
  },
  {
    id: 'INFIDELITY_04',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['바람', '내 잘못', '내가 부족', '자존감'],
      emotionRange: [-5, -3],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'ACT',
      technique: '자기 비난 교정',
      principle: '외도는 상대의 선택. 내 부족함 때문이 아님',
      steps: {
        validation: '내가 부족해서 그런 건 아닌가 자책하겠지',
        insight: '외도는 100% 한 사람의 선택이야. 네가 뭘 못해서가 절대 아니야',
        action: '지금 자책하는 생각 1개 써보고, "이게 진짜야?" 물어봐. 대부분 아니거든',
      },
      source: '2025 ACT + CBT 자기 비난 교정',
    },
    priority: 2,
    persona: {
      counselor: '자기 비난을 부드럽게 교정하고 자존감 회복 안내',
      friend: '야야야 네 잘못 아니야. 걔가 선택한 거야',
    },
  },
  {
    id: 'INFIDELITY_05',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['바람', '상담', '전문', '도움'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'EFT',
      technique: '전문 상담 안내',
      principle: '외도 후 회복은 전문가 도움이 효과적',
      steps: {
        validation: '혼자서 감당하기엔 너무 큰 일이지',
        insight: '외도 후 회복은 혼자/친구만으로 한계가 있어. 전문가가 구조적으로 도와줄 수 있어',
        action: '커플 상담 또는 개인 심리상담 추천. 온라인 상담도 가능하고, 부담 없이 1회만 해봐',
      },
      source: '2025 EFT 커플 상담 가이드',
    },
    priority: 5,
    persona: {
      counselor: '전문 상담의 필요성과 접근 방법 안내',
      friend: '이건 전문가 도움 받는 게 나을 수 있어. 1회만 해봐',
    },
  },

  // ============================================================
  // 🔄 BREAKUP_CONTEMPLATION (이별 고민)
  // ============================================================
  {
    id: 'BREAKUP_01',
    scenario: RelationshipScenario.BREAKUP_CONTEMPLATION,
    trigger: {
      keywords: ['헤어질까', '이별', '그만두', '끝내', '관두'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'MI',
      technique: '양면 반영 (양가감정 탐색)',
      principle: '떠나고 싶은 마음과 머물고 싶은 마음 모두 인정',
      steps: {
        validation: '떠나고 싶으면서도 두려운 거, 둘 다 진짜 네 마음이야',
        insight: '이건 어느 쪽이 맞다가 아니야. 양쪽 마음을 다 들여다보는 게 먼저야',
        action: '종이에 두 칸 써봐: "떠나야 하는 이유" / "남아야 하는 이유". 어느 쪽이 더 무겁니?',
      },
      source: '2025 MI 양가감정 탐색',
    },
    priority: 1,
    persona: {
      counselor: '양가감정을 모두 수용하며 균형 잡힌 탐색 안내',
      friend: '둘 다 진짜 네 마음이야. 떠나야 할 이유 vs 남을 이유 써봐',
    },
  },
  {
    id: 'BREAKUP_02',
    scenario: RelationshipScenario.BREAKUP_CONTEMPLATION,
    trigger: {
      keywords: ['헤어질까', '이별', '미래', '기적', '달라'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'SFBT',
      technique: '기적 질문',
      principle: '이상적 미래를 떠올리면 진짜 원하는 것이 드러남',
      steps: {
        validation: '이별 고민할 때 미래가 안 보이는 것 같지',
        insight: '이 질문 해볼래? 좀 신기하거든',
        action: '"내일 기적이 일어나서 다 해결되면 뭐가 달라질까?" 그게 "걔가 변하는 것"이면 위험 신호야',
      },
      source: '2025 SFBT 기적 질문',
    },
    priority: 2,
    persona: {
      counselor: '기적 질문으로 핵심 욕구 탐색',
      friend: '기적이 일어나면 뭐가 달라질까? 진지하게 생각해봐',
    },
  },
  {
    id: 'BREAKUP_03',
    scenario: RelationshipScenario.BREAKUP_CONTEMPLATION,
    trigger: {
      keywords: ['헤어질까', '안 맞아', '가치관', '성격'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT',
      technique: '핵심 니즈 파악',
      principle: '무엇이 충족되지 않아 떠나고 싶은지 명확화',
      steps: {
        validation: '안 맞는다는 느낌이 들면 진짜 에너지가 빠지지',
        insight: '안 맞는 게 뭔지 구체화해봐. "존중이 부족해" vs "취미가 달라"는 완전히 다른 문제거든',
        action: '이 관계에서 네가 가장 필요한 것 1가지만 꼽아봐. 그게 채워질 수 있는 건지 판단해',
      },
      source: '2025 EFT 핵심 욕구 탐색',
    },
    priority: 2,
    persona: {
      counselor: '충족되지 않는 핵심 니즈를 탐색',
      friend: '뭐가 안 맞는 건지 구체적으로 써봐. 진짜 중요한 건 뭔지',
    },
  },
  {
    id: 'BREAKUP_04',
    scenario: RelationshipScenario.BREAKUP_CONTEMPLATION,
    trigger: {
      keywords: ['헤어지', '아까', '시간', '투자'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '매몰 비용 오류 교정',
      principle: '과거 투자가 미래 결정을 좌우해선 안 됨',
      steps: {
        validation: '오래 만났으니까 아깝다는 거 충분히 이해해',
        insight: '근데 "아깝다"는 건 매몰 비용이야. 과거에 투자한 시간 때문에 미래를 결정하면 안 돼',
        action: '"지금부터 1년 뒤 나는 어떤 관계에 있고 싶어?" 이걸 기준으로 생각해봐',
      },
      source: '2025 CBT 매몰 비용 오류 교정',
    },
    priority: 3,
    persona: {
      counselor: '매몰 비용 오류를 부드럽게 설명하며 미래 지향 사고 안내',
      friend: '아까운 거 알아. 근데 아깝다고 계속 있는 건 더 아까운 거야',
    },
  },
  {
    id: 'BREAKUP_05',
    scenario: RelationshipScenario.BREAKUP_CONTEMPLATION,
    trigger: {
      keywords: ['헤어질까', '변화', '노력', '기한'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'SFBT',
      technique: '변화 시도 기한 설정',
      principle: '결정 전에 구체적 변화 시도 + 기한. 무기한 희망 X',
      steps: {
        validation: '아직 포기하고 싶진 않은 거지',
        insight: '그럼 기한을 정해서 시도해봐. 무기한 희망은 너만 지치게 해',
        action: '"한 달 동안 이것만 바꿔보자" 제안해. 그래도 변화 없으면 그때 판단해',
      },
      source: '2025 SFBT 척도 + 기한 설정',
    },
    priority: 3,
    persona: {
      counselor: '변화 시도 기한 설정 방법 안내',
      friend: '한 달만 진지하게 해보고, 그래도 같으면 그때 결정해',
    },
  },

  // ============================================================
  // 😐 BOREDOM (권태기)
  // ============================================================
  {
    id: 'BOREDOM_01',
    scenario: RelationshipScenario.BOREDOM,
    trigger: {
      keywords: ['권태기', '설레임없', '지루', '재미없', '심심'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '기대치 재조정',
      principle: '설렘 감소=정상. 안정감으로의 전환을 인식',
      steps: {
        validation: '설렘이 없어지면 사랑이 식은 건가 싶지',
        insight: '설렘이 줄어든 건 정상이야. 도파민이 옥시토신으로 바뀌는 거거든. 설렘→안정감',
        action: '지금 걔가 주는 안정감을 3가지 써봐. 그게 설렘보다 훨씬 귀한 거야',
      },
      source: '2025 Gottman 관계 만족도 연구',
    },
    priority: 1,
    persona: {
      counselor: '설렘과 안정감의 차이를 과학적으로 설명',
      friend: '설렘 줄어든 건 정상. 안정감 3가지 써봐',
    },
  },
  {
    id: 'BOREDOM_02',
    scenario: RelationshipScenario.BOREDOM,
    trigger: {
      keywords: ['권태기', '새로운', '경험', '데이트', '뭐 하'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '새로운 공유 경험 (도파민 리셋)',
      principle: '새로운 활동이 관계의 도파민을 리셋',
      steps: {
        validation: '맨날 같은 패턴이면 누구나 지치지',
        insight: '새로운 경험을 같이 하면 도파민이 다시 나와. 여행 안 가도 돼',
        action: '이번 주에 안 해본 거 1가지 같이 해봐. 방탈출, 원데이클래스, 새로운 동네 산책',
      },
      source: '2025 도파민 리셋 연구',
    },
    priority: 1,
    persona: {
      counselor: '새로운 경험의 효과와 구체적 예시 안내',
      friend: '이번 주에 새로운 거 하나 같이 해봐. 방탈출 어때?',
    },
  },
  {
    id: 'BOREDOM_03',
    scenario: RelationshipScenario.BOREDOM,
    trigger: {
      keywords: ['권태기', '각자', '혼자', '시간', '독립'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT',
      technique: '독립성 유지 (각자 시간)',
      principle: '떨어져 있는 시간이 보고 싶은 감정을 되살림',
      steps: {
        validation: '맨날 붙어있으면 오히려 질릴 수 있어',
        insight: '각자 시간은 부정적인 게 아니야. 떨어져 있으면 "보고 싶다"가 다시 생겨',
        action: '이번 주에 각자 취미 하루씩 만들어봐. 그리고 그 경험 공유해',
      },
      source: '2025 EFT 독립성과 친밀감 균형',
    },
    priority: 2,
    persona: {
      counselor: '독립적 시간의 관계 개선 효과 설명',
      friend: '각자 시간 만들어. 떨어져야 보고 싶어지잖아',
    },
  },
  {
    id: 'BOREDOM_04',
    scenario: RelationshipScenario.BOREDOM,
    trigger: {
      keywords: ['권태기', '설레', '처음', '예전에'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'SFBT',
      technique: '예외 질문',
      principle: '과거 성공 경험에서 해결 단서를 찾음',
      steps: {
        validation: '예전의 설렘이 그립지...',
        insight: '완전히 없어진 게 아니라 숨어있는 거야. 언제 마지막으로 설렜어?',
        action: '"최근에 걔 때문에 기분 좋았던 순간" 1가지만 떠올려봐. 뭐가 달랐어? 그 조건을 재현해봐',
      },
      source: '2025 SFBT 예외 질문',
    },
    priority: 2,
    persona: {
      counselor: '예외 질문으로 과거 성공 경험을 탐색',
      friend: '마지막으로 설렜던 거 언제야? 그때 뭐가 달랐어?',
    },
  },
  {
    id: 'BOREDOM_05',
    scenario: RelationshipScenario.BOREDOM,
    trigger: {
      keywords: ['권태기', '스킨십', '손잡', '뽀뽀', '안아'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'Gottman',
      technique: '신체 접촉 재시작 (옥시토신 효과)',
      principle: '스킨십이 옥시토신을 분비시켜 유대감 회복',
      steps: {
        validation: '권태기 오면 스킨십도 자연스럽게 줄어들지',
        insight: '말보다 손잡기, 안아주기가 관계 회복에 더 빠를 수 있어. 옥시토신 효과거든',
        action: '오늘 걔 만나면 뭔가 하나만 해봐. 손잡기, 팔짱끼기, 안아주기. 부담 없는 것부터',
      },
      source: '2025 Gottman 신체 접촉 + 옥시토신 연구',
    },
    priority: 3,
    persona: {
      counselor: '스킨십의 과학적 효과를 설명하며 작은 시작 제안',
      friend: '오늘 만나면 손잡아봐. 진짜 달라진다니까',
    },
  },
];
