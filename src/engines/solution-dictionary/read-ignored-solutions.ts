/**
 * 🆕 v7: 읽씹 세분화 해결책 데이터 (25개)
 * 
 * 5축 진단 기반 정밀 매칭용 데이터.
 * 기존 READ_IGNORED_01~05 → 삭제됨 (이 파일로 대체)
 * 
 * 근거: Gottman Method, EFT, SFBT, CBT, MI, ACT (2025~2026)
 * + 한국 MZ세대 연애 특화 + Computers in Human Behavior (2025)
 */

import { RelationshipScenario, AttachmentType } from '@/types/engine.types';
import type { SolutionEntry } from './types';
import {
  ReadIgnoredDuration,
  ReadIgnoredStage,
  ReadIgnoredReadType,
  ReadIgnoredAttachmentClue,
  ReadIgnoredPattern,
} from './read-ignored-axes';

// ============================================================
// 확장 타입: 축 조건 포함 해결책 엔트리
// ============================================================

export interface ReadIgnoredSolutionEntry extends SolutionEntry {
  /** 이 해결책이 매칭되는 축 조건 */
  axisCondition: {
    duration?: ReadIgnoredDuration[];
    stage?: ReadIgnoredStage[];
    readType?: ReadIgnoredReadType[];
    pattern?: ReadIgnoredPattern[];
    attachmentClue?: ReadIgnoredAttachmentClue[];
  };
  /** 축 매칭 최소 개수 (이 수 이상 일치해야 후보) */
  minAxisMatch: number;
}

// ============================================================
// 25개 세분화 해결책
// ============================================================

export const READ_IGNORED_SOLUTIONS: ReadIgnoredSolutionEntry[] = [

  // ──────────────────────────────────────────────
  // 🟢 단기 읽씹 (HOURS ~ SAME_DAY) — 3개
  // ──────────────────────────────────────────────

  {
    id: 'RI_SHORT_01',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['읽씹', '답장없', '답없'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '과해석 방지 (사실 vs 추측 분리)',
      principle: '6시간 이내 미응답은 정상 범위. 증거 없는 해석은 불안만 키움',
      steps: {
        validation: '답 안 오면 신경 쓰이는 거 당연해',
        insight: '근데 아직 6시간도 안 됐잖아. 회의 중이거나 바쁠 수 있어. 사실과 추측을 분리해봐',
        action: '지금 확인된 사실만 써봐: "메시지를 보냈고, 아직 답이 없다" — 이게 전부야. 나머지는 추측이야',
      },
      source: 'Computers in Human Behavior (2025): Response Delay Tolerance 연구',
    },
    priority: 1,
    persona: {
      counselor: '과해석 경향을 부드럽게 인지시키고, 사실-추측 분리 안내',
      friend: '야 아직 몇시간이잖아. 바쁠 수 있어. 일단 기다려',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.HOURS, ReadIgnoredDuration.SAME_DAY],
      pattern: [ReadIgnoredPattern.FIRST_TIME, ReadIgnoredPattern.OCCASIONAL],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_SHORT_02',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['읽씹', '불안', '확인'],
      attachmentStyles: [AttachmentType.ANXIOUS],
      emotionRange: [-5, -2],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT',
      technique: '자기진정 (Self-Soothing)',
      principle: '불안할 때 보내는 메시지는 대부분 후회. 신체적 자기진정이 먼저',
      steps: {
        validation: '답 없으면 불안해지는 건 네가 걔를 소중하게 여기는 거야',
        insight: '근데 불안할 때 보내는 메시지는 보통 후회하게 돼. 감정이 앞서거든',
        action: '폰 3시간만 내려놓고, 좋아하는 거 해봐. 산책이든 음악이든. 그 후에 다시 확인해',
      },
      source: 'EFT 애착 활성화 시스템 + Gottman 자기진정 기법 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '불안한 마음을 충분히 인정한 뒤, 자기 돌봄과 신체적 진정 안내',
      friend: '야 폰 좀 내려놔. 3시간만. 네가 좋아하는 거 해',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.HOURS, ReadIgnoredDuration.SAME_DAY],
      attachmentClue: [ReadIgnoredAttachmentClue.ANXIOUS_CHECKING, ReadIgnoredAttachmentClue.ANXIOUS_SELF_BLAME],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_SHORT_03',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['읽씹', '밀당', '관심'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'MI',
      technique: '양면 탐색 (밀당 vs 무관심)',
      principle: '1회 읽씹으로 밀당/무관심 판단 불가. 행동 패턴 3회 이상 관찰 필요',
      steps: {
        validation: '밀당인지 진짜 관심 없는 건지 헷갈리지...',
        insight: '한 번으로는 알 수 없어. 밀당이든 아니든 판단하려면 최소 3회 행동 패턴을 봐야 해',
        action: '이번엔 기다려. 그리고 다음에 또 이러면 그때 패턴으로 판단해. 지금은 정보가 부족해',
      },
      source: '2025 MI 양가감정 탐색 + 행동 패턴 분석',
    },
    priority: 2,
    persona: {
      counselor: '성급한 판단을 방지하고, 패턴 관찰의 중요성 안내',
      friend: '한 번으로 밀당인지 모르지. 3번은 봐야 해. 일단 기다려',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.HOURS, ReadIgnoredDuration.SAME_DAY],
      stage: [ReadIgnoredStage.SOME, ReadIgnoredStage.EARLY_DATING],
    },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 🟡 중기 읽씹 (DAYS_2_3) — 5개
  // ──────────────────────────────────────────────

  {
    id: 'RI_MID_01',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['읽씹', '답장', '뭐라고', '어떻게 말'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: 'I-message + 부드러운 시작 (Gentle Start-Up)',
      principle: '비난 없이 감정 전달. 요청을 구체적으로',
      steps: {
        validation: '2~3일 답 없으면 진짜 힘들지. 뭐라고 해야 할지도 모르겠고',
        insight: '여기서 비난하면 걔가 더 닫혀. 네 감정 중심으로 요청해봐',
        action: 'I-message로 보내봐: "답 없으면 나 불안해져. 바쁘면 바쁘다고만 해줄 수 있어?"',
      },
      messageDrafts: [
        '답 없으면 나 혼자 불안해지더라. 바쁘면 바쁘다고만 해줄 수 있어?',
        '연락 없으면 걱정돼. 괜찮은지만 알려줘',
      ],
      iMessageTemplate: '답 없으면 나 {감정}해져. {요청}할 수 있어?',
      source: 'Gottman Gentle Start-Up (2025)',
    },
    priority: 1,
    persona: {
      counselor: 'I-message 구조를 설명하며 자연스럽게 안내',
      friend: '야 이렇게 보내봐. 비난 말고 네 감정으로',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.DAYS_2_3],
      stage: [ReadIgnoredStage.ESTABLISHED, ReadIgnoredStage.EARLY_DATING],
      readType: [ReadIgnoredReadType.READ_NO_REPLY],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_MID_02',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['안읽씹', '안 읽', '1 그대로', '읽지도'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'SFBT',
      technique: '방향 전환 + 가벼운 1회 시도',
      principle: '안읽씹은 읽씹보다 강한 경계. 다른 주제로 부담 없는 1회 시도',
      steps: {
        validation: '아예 안 읽는 건 더 답답하지...',
        insight: '안읽씹은 의도적 경계일 수 있어. 같은 주제로 재촉하면 더 닫혀',
        action: '1~2일 후에 완전 다른 주제로 1회만 보내봐. "이거 봤어? 재밌더라" 이런 식으로',
      },
      messageDrafts: [
        '갑자기 생각났는데, 전에 얘기한 그거 해봤어?',
        '오늘 길가다 재밌는 거 봤는데 갑자기 네 생각났어!',
      ],
      source: '2025 MZ세대 소통 전략 + SFBT 예외 질문',
    },
    priority: 1,
    persona: {
      counselor: '안읽씹의 심리적 의미를 설명하고, 방향 전환 제안',
      friend: '안읽씹이면 같은 주제 재촉 X. 완전 다른 거로 1번만 보내봐',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.DAYS_2_3],
      stage: [ReadIgnoredStage.SOME, ReadIgnoredStage.EARLY_DATING],
      readType: [ReadIgnoredReadType.UNREAD_IGNORED],
    },
    minAxisMatch: 2,
  },

  {
    id: 'RI_MID_03',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['맨날', '반복', '항상', '또 이래'],
      minConfidence: 0.6,
    },
    solution: {
      framework: 'CBT',
      technique: '패턴 인식 + 경계 설정',
      principle: '반복 패턴이면 관계 소통 구조 자체를 재평가',
      steps: {
        validation: '맨날 이러면 진짜 지치지...',
        insight: '한두 번은 바쁠 수 있지만, 반복이면 소통 방식 자체의 문제야',
        action: '다음에 만나면 솔직하게 말해: "이 패턴이 반복되면 나 힘들어. 같이 방법 찾자"',
      },
      source: 'CBT 관계 패턴 분석 + Gottman 대화 규칙 협상 (2025)',
    },
    priority: 2,
    persona: {
      counselor: '반복 패턴의 의미를 탐색하고 오프라인 대화 안내',
      friend: '야 맨날 이러면 한 번 제대로 얘기해야지',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.DAYS_2_3, ReadIgnoredDuration.DAYS_4_7],
      stage: [ReadIgnoredStage.ESTABLISHED, ReadIgnoredStage.EARLY_DATING],
      pattern: [ReadIgnoredPattern.FREQUENT, ReadIgnoredPattern.ALWAYS],
    },
    minAxisMatch: 2,
  },

  {
    id: 'RI_MID_04',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['자존감', '나만', '매달', '내가 부족'],
      emotionRange: [-5, -3],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'ACT',
      technique: '자기 가치 인정 (수용전념)',
      principle: '상대 반응에 자존감을 의탁하지 않기. 내 가치는 내가 결정',
      steps: {
        validation: '나만 노력하는 것 같으면 진짜 허무하지',
        insight: '근데 네 가치가 걔의 답장 속도로 정해지는 건 아니야. 절대로',
        action: '오늘 5분만 네가 잘하는 것 1가지 해봐. 네 세계를 넓히는 거야. 걔 답장과 상관없이',
      },
      source: 'ACT 수용전념치료 + 자기 가치 재인식 (2025)',
    },
    priority: 3,
    persona: {
      counselor: '자기 가치에 대한 재인식을 부드럽게 안내',
      friend: '야 네 가치가 걔 답장에 달린 게 아니야. 진짜야',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.DAYS_2_3, ReadIgnoredDuration.DAYS_4_7],
      attachmentClue: [ReadIgnoredAttachmentClue.ANXIOUS_SELF_BLAME],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_MID_05',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['전 남친', '전 여친', '이별', '헤어진'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT',
      technique: '감정적 방패 이해',
      principle: '이별 후 읽씹은 감정을 감추려는 보호 행동. 상대도 힘들 수 있음',
      steps: {
        validation: '이별 후에 연락하는 거 진짜 용기 필요했을 텐데...',
        insight: '이별 후 읽씹은 "싫어서"보다 "흔들리는 마음 감추려는 방패"일 확률이 높아',
        action: '추가 연락 대신 기다려. 걔가 정리되면 반응할 수도 있어. 지금은 네 감정 돌봄이 먼저야',
      },
      source: 'EFT 이별 후 애착 반응 + 감정적 방패 연구 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '이별 후 읽씹의 심리적 의미를 부드럽게 설명',
      friend: '이별 후 읽씹은 걔도 흔들리는 거일 수 있어. 일단 기다려',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.DAYS_2_3, ReadIgnoredDuration.DAYS_4_7],
      stage: [ReadIgnoredStage.POST_BREAKUP, ReadIgnoredStage.RECONCILIATION],
    },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 🔴 장기 읽씹 (DAYS_4_7 ~ OVER_WEEK) — 5개
  // ──────────────────────────────────────────────

  {
    id: 'RI_LONG_01',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['읽씹', '일주일', '4일', '5일', '거의'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '마지막 메시지 + 기다림',
      principle: '4~7일이면 마지막 1회 연락 후 상대 반응 기다림. 추가 재촉은 역효과',
      steps: {
        validation: '4일 넘으면 진짜 마음 고생 심하지',
        insight: '여기서 재촉하면 부담만 커져. 마지막 1번만 보내고 기다리는 게 가장 효과적이야',
        action: '"괜찮아? 답 안 해도 되는데 걱정돼서" 이런 식으로 1번만 보내. 그리고 기다려',
      },
      messageDrafts: [
        '너 괜찮아? 답 안 해도 되는데 걱정돼서 한 번 보내봤어',
        '연락 없어서 좀 걱정됐어. 네 시간 존중할게, 편할 때 답해줘',
      ],
      source: 'Gottman 복구 시도 + Response Delay Tolerance (2025)',
    },
    priority: 1,
    persona: {
      counselor: '마지막 메시지의 전략적 중요성 설명',
      friend: '야 한 번만 보내고 기다려. 그래도 없으면 네가 생각해봐야 해',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.DAYS_4_7],
      stage: [ReadIgnoredStage.ESTABLISHED, ReadIgnoredStage.EARLY_DATING],
      readType: [ReadIgnoredReadType.READ_NO_REPLY],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_LONG_02',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['얼마나 기다려', '기한', '언제까지'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'SFBT',
      technique: '기한 설정 원칙',
      principle: '무한정 기다림은 자해적. 기한을 정하고, 이후 재평가',
      steps: {
        validation: '얼마나 기다려야 하는지 모르겠으면 더 불안하지',
        insight: '기한이 없으면 끝없이 기다리게 돼. 그건 너만 지치게 해',
        action: '기한을 정해: "1주일 더 기다리고, 그래도 없으면 내가 결정하자." 이게 네 에너지를 지키는 거야',
      },
      source: 'SFBT 기한 설정 + 하버드 관계 연구 (2025)',
    },
    priority: 2,
    persona: {
      counselor: '기한 설정의 심리적 효과와 구체적 방법 안내',
      friend: '기한 정해. 무한정 기다리면 너만 힘들어',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.DAYS_4_7, ReadIgnoredDuration.OVER_WEEK],
      stage: [ReadIgnoredStage.SOME, ReadIgnoredStage.EARLY_DATING],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_LONG_03',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['일주일', '1주일', '점점', '심해'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '위기 대화 요청 — 오프라인 만남',
      principle: '1주 이상 + 악화 추세면 텍스트가 아닌 직접 만남이 필요',
      steps: {
        validation: '일주일 넘으면 정말 불안하고 화도 나지',
        insight: '이건 카톡으로 해결될 문제가 아니야. 만나서 얘기해야 해',
        action: '마지막 메시지로 만남 요청해: "중요한 얘기가 있어. 잠깐 만나자." 거절하면 그때 관계 재평가',
      },
      messageDrafts: [
        '얘기하고 싶은 게 있어. 잠깐 만날 수 있어?',
      ],
      source: 'Gottman 건설적 갈등 해결 + 4 Horsemen 체크 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '오프라인 대화의 필요성과 만남 요청 방법 안내',
      friend: '카톡으로 안 돼. 만나자고 해. 안 만나면 그때 생각해',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.OVER_WEEK],
      stage: [ReadIgnoredStage.ESTABLISHED],
      pattern: [ReadIgnoredPattern.WORSENING, ReadIgnoredPattern.ALWAYS],
    },
    minAxisMatch: 2,
  },

  {
    id: 'RI_LONG_04',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['전 남친', '전 여친', '이별', '재회', '일주일'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT',
      technique: '냉각기 원칙 + 부담없는 재연락',
      principle: '이별 후 냉각기는 연애기간 대비 10~20%. 이후 부담없는 주제로 접근',
      steps: {
        validation: '이별 후 답 없으면 포기해야 하나 싶지...',
        insight: '이별 후에는 충분한 냉각기가 필요해. 추가 연락은 역효과야',
        action: '연애기간의 10~20%만큼 기다려 (1년 = 1~2개월). 그 후 부담없는 주제로 1회 시도',
      },
      messageDrafts: [
        '아, 그때 말했던 그 카페 갔는데 너무 좋더라',
        '오랜만이야. 잘 지내고 있어?',
      ],
      source: 'EFT 이별 후 재회 전략 + 냉각기 연구 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '냉각기의 구조와 재연락 타이밍 안내',
      friend: '지금 보내면 역효과. 냉각기 지키고 시간 좀 줘',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.DAYS_4_7, ReadIgnoredDuration.OVER_WEEK],
      stage: [ReadIgnoredStage.POST_BREAKUP, ReadIgnoredStage.RECONCILIATION],
    },
    minAxisMatch: 2,
  },

  {
    id: 'RI_LONG_05',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['끝', '정리', '포기', '항상'],
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
      source: 'ACT 수용 + 가치 기반 행동 (2025)',
    },
    priority: 3,
    persona: {
      counselor: '정리의 의미를 재정의하며 새 방향 안내',
      friend: '정리하는 거 포기 아니야. 네 삶 챙기는 거야',
    },
    axisCondition: {
      duration: [ReadIgnoredDuration.OVER_WEEK],
      pattern: [ReadIgnoredPattern.ALWAYS, ReadIgnoredPattern.WORSENING],
    },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 📱 유형별 특수 해결책 — 4개
  // ──────────────────────────────────────────────

  {
    id: 'RI_TYPE_01',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['안읽씹', '안 읽', '1 그대로'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT',
      technique: '감정적 단절 이해',
      principle: '안읽씹은 읽씹보다 강한 경계. 메시지 외 채널(전화 등) 시도 검토',
      steps: {
        validation: '아예 안 읽는 건 읽씹보다 더 답답하지...',
        insight: '안읽씹은 감정적으로 더 강한 단절 신호야. 카톡이 아닌 다른 방법이 필요할 수 있어',
        action: '카톡 대신 전화를 걸어보거나, 만약 그것도 안 되면 며칠 기다린 후 다시 판단해',
      },
      source: '안읽씹 vs 읽씹 심리 차이 연구 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '안읽씹의 심리적 의미와 대안 소통 방법 안내',
      friend: '안읽씹이면 카톡으론 안 통해. 전화해봐',
    },
    axisCondition: {
      readType: [ReadIgnoredReadType.UNREAD_IGNORED],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_TYPE_02',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['짧게', '성의없', 'ㅇㅇ', '대충', '한글자'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '소통 방식 대화 — 부드러운 시작',
      principle: '부분 답장은 관심 하락 초기 신호. 직접적이지만 비난 없이 표현',
      steps: {
        validation: '짧게만 답하면 나한테 관심 없나 싶지',
        insight: '성의없는 답은 관심이 줄고 있다는 초기 신호일 수 있어. 지금 물어보는 게 나아',
        action: '부드럽게 물어봐: "요즘 나한테 답장 짧은 것 같은데, 내가 뭔가 불편하게 한 거 있어?"',
      },
      messageDrafts: [
        '요즘 답장 좀 짧은 것 같아서 혹시 내가 뭔가 불편하게 한 건 아닌지 궁금했어',
      ],
      source: 'Gottman 비판 vs 불만 구분 + 부드러운 시작 (2025)',
    },
    priority: 2,
    persona: {
      counselor: '부분 답장의 의미를 탐색하고, 비난 없는 소통 안내',
      friend: '대충 답하면 한 번 물어봐. 비난 말고 궁금한 척으로',
    },
    axisCondition: {
      readType: [ReadIgnoredReadType.PARTIAL_REPLY],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_TYPE_03',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['그 얘기만', '무시', '특정', '그 주제만'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '불편 주제 파악 — 안전한 대화 환경',
      principle: '선택적 읽씹은 특정 주제에 대한 갈등 회피. 안전한 환경에서 꺼내기',
      steps: {
        validation: '특정 얘기만 무시하면 왜 그런지 궁금하지',
        insight: '선택적 읽씹은 그 주제가 불편하다는 확실한 신호야. 피하고 싶은 거지',
        action: '만나서 편한 분위기에서: "이 얘기하면 답 안 하더라. 불편한 거야? 솔직하게 말해줘"',
      },
      source: 'CBT 갈등 회피 패턴 + Gottman Stonewalling (2025)',
    },
    priority: 2,
    persona: {
      counselor: '선택적 읽씹의 패턴을 인식하고, 안전한 대화 환경 안내',
      friend: '걔는 그 주제가 불편한 거야. 만나서 편하게 물어봐',
    },
    axisCondition: {
      readType: [ReadIgnoredReadType.SELECTIVE],
      stage: [ReadIgnoredStage.ESTABLISHED, ReadIgnoredStage.EARLY_DATING],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_TYPE_04',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['늦게 읽', '한참 뒤', '몇시간 뒤에'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'MI',
      technique: '관계 가치 탐색 — 자기 결정',
      principle: '일상적 패턴인지 의도적 무시인지 상대 행동 패턴으로 판단',
      steps: {
        validation: '늦게 읽는 게 습관인지 의도인지 헷갈리지',
        insight: '원래 핸드폰 잘 안 보는 사람이면 습관이야. 근데 SNS는 활발한데 카톡만 늦으면 다른 이유가 있을 수 있어',
        action: '걔의 전반적 패턴을 봐: SNS 활동은? 다른 사람에게도 이래? 그걸 보면 판단할 수 있어',
      },
      source: 'MI 양가감정 탐색 + 행동 패턴 분석 (2025)',
    },
    priority: 3,
    persona: {
      counselor: '습관 vs 의도적 무시를 구분하는 방법 안내',
      friend: 'SNS는 활발한데 카톡만 늦으면 좀 수상하긴 해',
    },
    axisCondition: {
      readType: [ReadIgnoredReadType.DELAYED_READ],
    },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 😰 애착유형 특수 해결책 — 4개
  // ──────────────────────────────────────────────

  {
    id: 'RI_ATT_01',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['계속 확인', '또 보내', '폰 확인', '추가 연락'],
      attachmentStyles: [AttachmentType.ANXIOUS],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT',
      technique: '애착 활성화 시스템 이해 + 10분 호흡',
      principle: '불안형은 위협 감지 시 과반응. 10분 호흡으로 신경계 진정 후 재판단',
      steps: {
        validation: '계속 폰 확인하게 되는 거 충분히 이해해. 불안하니까 당연해',
        insight: '이건 불안형 애착의 "활성화 시스템"이야. 위협 감지하면 자동으로 반응해. 네 잘못이 아니야',
        action: '지금 10분만 호흡에 집중해봐. 4초 들이쉬고 6초 내쉬기. 그 다음에 다시 상황 보자',
      },
      source: 'EFT 애착 활성화 시스템 + Gottman 자기진정 호흡법 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '애착 활성화 시스템을 이해시키고, 신체적 진정법 안내',
      friend: '야 폰 내려놔. 10분만 호흡해. 4초 들이쉬고 6초 내쉬고',
    },
    axisCondition: {
      attachmentClue: [ReadIgnoredAttachmentClue.ANXIOUS_CHECKING],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_ATT_02',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['내가 뭘', '내 잘못', '내 탓', '자책'],
      emotionRange: [-5, -2],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '자기 귀인 편향 교정',
      principle: '상대의 행동은 상대의 선택. 99% 네 잘못이 아닐 확률이 높음',
      steps: {
        validation: '내가 뭘 잘못했나 계속 생각하면 진짜 힘들지',
        insight: '걔가 안 읽는 건 99% 걔 사정이야. 네가 마지막으로 한 말 생각해봐 — 진짜 문제될 게 있었어?',
        action: '자책하는 생각 1개 써보고 "이게 진짜 확인된 사실이야?" 물어봐. 대부분 아니거든',
      },
      source: 'CBT 자기 귀인 편향(Self-Attribution Bias) 교정 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '자기 비난 패턴을 인지시키고 사실-추측 분리 안내',
      friend: '야 네 잘못 아닐 확률 99%야. 걔 사정일 가능성이 훨씬 높아',
    },
    axisCondition: {
      attachmentClue: [ReadIgnoredAttachmentClue.ANXIOUS_SELF_BLAME],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_ATT_03',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['나도 읽씹', '나도 안 읽', '보복', '똑같이'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '부드러운 시작 — 보복 대신 표현',
      principle: '보복 읽씹은 갈등 에스컬레이션. 감정을 솔직히 표현하는 게 더 강한 행동',
      steps: {
        validation: '나도 똑같이 해주고 싶은 마음 이해해',
        insight: '근데 보복하면 둘 다 지는 게임이야. 네 감정을 솔직히 말하는 게 실제로 더 강해',
        action: '읽씹 대신 이렇게 말해봐: "답 없으면 나 서운해지더라. 솔직히 말하는 게 나은 것 같아서"',
      },
      messageDrafts: [
        '나도 무시하려다가 그냥 솔직하게 말할게. 답 없으면 서운해져',
      ],
      source: 'Gottman 4 Horsemen 해독제 + 부드러운 시작 (2025)',
    },
    priority: 2,
    persona: {
      counselor: '보복의 역효과를 설명하고, 감정 표현 방식 안내',
      friend: '보복하면 둘 다 지는 거야. 차라리 솔직하게 말해',
    },
    axisCondition: {
      attachmentClue: [ReadIgnoredAttachmentClue.AVOIDANT_MIRRORING],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_ATT_04',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['바람', '다른 사람', '최악', '끝난건', '싫어져'],
      emotionRange: [-5, -3],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '재앙화(Catastrophizing) 교정',
      principle: '최악의 시나리오 상상은 불안의 자기실현. 증거 기반 사고로 전환',
      steps: {
        validation: '최악의 상상이 머릿속에서 돌아가면 정말 고통스럽지',
        insight: '지금 그 생각들은 "확인된 사실"이 아니라 "불안이 만든 시나리오"야',
        action: '종이에 써봐: "확인된 사실" vs "내 상상". 사실에 집중해. 상상은 접어둬',
      },
      source: 'CBT 재앙화 인지왜곡 교정 + 증거 기반 사고 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '재앙화 패턴을 부드럽게 인지시키고 사실-상상 분리 안내',
      friend: '야 잠깐. 그건 네 상상이야. 확인된 사실만 봐. 뭐가 있어?',
    },
    axisCondition: {
      attachmentClue: [ReadIgnoredAttachmentClue.FEARFUL_SPIRAL],
    },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 🔄 패턴별 특수 해결책 — 4개
  // ──────────────────────────────────────────────

  {
    id: 'RI_PAT_01',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['자주', '종종', '여러 번'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '소통 규칙 협상 — 답장 기대치 합의',
      principle: '반복 읽씹은 소통 기대치 불일치. 규칙 합의가 근본 해결',
      steps: {
        validation: '자주 이러면 짜증과 서운함이 쌓이지',
        insight: '이건 감정 문제가 아니라 소통 기대치가 다른 거야. 규칙이 필요해',
        action: '만나서 이렇게 제안해: "바쁘면 \'바빠\' 한마디만 해줘. 그것만으로 나 괜찮아"',
      },
      source: 'Gottman 소통 규칙 협상 + 관계 기대치 조율 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '소통 기대치 불일치를 설명하고 규칙 합의 방법 안내',
      friend: '야 만나서 규칙 정해. "바빠" 한마디 규칙',
    },
    axisCondition: {
      pattern: [ReadIgnoredPattern.FREQUENT],
      stage: [ReadIgnoredStage.ESTABLISHED, ReadIgnoredStage.EARLY_DATING],
    },
    minAxisMatch: 2,
  },

  {
    id: 'RI_PAT_02',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['항상', '맨날', '매번', '늘'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'ACT',
      technique: '관계 재평가 — 가치 기반 결정',
      principle: '항상 이러면 패턴. 이 관계가 네 핵심 가치에 부합하는지 물어봐',
      steps: {
        validation: '매번 이러면... 진짜 지친다',
        insight: '항상 이러면 이건 그냥 그 사람의 방식이야. 바뀔 가능성은 낮아',
        action: '네가 연애에서 가장 중요한 것 3가지 써봐. 이 관계가 그걸 줘? 안 줘? 그게 답이야',
      },
      source: 'ACT 가치 기반 행동 + 관계 재평가 (2025)',
    },
    priority: 2,
    persona: {
      counselor: '가치 기반 관계 재평가를 부드럽게 안내',
      friend: '매번이면 걔 원래 이래. 바뀔까? 네 기준으로 판단해',
    },
    axisCondition: {
      pattern: [ReadIgnoredPattern.ALWAYS],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_PAT_03',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['점점', '갈수록', '더 심해', '악화'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: '위기 면담 — 4 Horsemen 체크',
      principle: '악화 추세는 관계 위기 신호. Source of Conflict가 아닌 Source of Connection 찾기',
      steps: {
        validation: '점점 심해지면 진짜 무서운 거 맞아',
        insight: '악화는 그냥 넘어가면 안 되는 위험 신호야. 관계의 근본 문제를 봐야 해',
        action: '만나서 이렇게 시작해: "요즘 우리 소통이 점점 줄어드는 것 같아서 걱정이야. 같이 방법 찾고 싶어"',
      },
      messageDrafts: [
        '요즘 우리 좀 달라진 것 같아서... 만나서 얘기하고 싶어. 시간 돼?',
      ],
      source: 'Gottman 4 Horsemen + 위기 대화 가이드라인 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '악화 추세의 심각성을 인지시키고, 건설적 대화 시작법 안내',
      friend: '점점 심해지면 그냥 넘어가면 안 돼. 만나서 진지하게 얘기해',
    },
    axisCondition: {
      pattern: [ReadIgnoredPattern.WORSENING],
      stage: [ReadIgnoredStage.ESTABLISHED],
    },
    minAxisMatch: 1,
  },

  {
    id: 'RI_PAT_04',
    scenario: RelationshipScenario.READ_AND_IGNORED,
    trigger: {
      keywords: ['처음', '갑자기', '원래 안 이랬'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'SFBT',
      technique: '상황 관찰 — 과해석 방지',
      principle: '처음 발생한 읽씹은 과해석 위험. 상대 상황 관찰이 먼저',
      steps: {
        validation: '원래 안 이랬는데 갑자기 이러면 당황스럽지',
        insight: '처음이면 갑자기 사정이 생겼을 가능성이 높아. 바쁘거나 힘든 일이 있을 수 있어',
        action: '2~3일 기다렸다가, "요즘 바빠? 괜찮아?" 이런 식으로 가볍게 안부 물어봐',
      },
      messageDrafts: [
        '요즘 좀 바빠 보여서. 괜찮아? 무리하지 마~',
      ],
      source: 'SFBT 예외 질문 + 상황 관찰 원칙 (2025)',
    },
    priority: 1,
    persona: {
      counselor: '처음 발생한 읽씹의 다양한 원인 가능성을 탐색',
      friend: '처음이면 걔한테 무슨 일 있을 수도 있어. 며칠 기다려봐',
    },
    axisCondition: {
      pattern: [ReadIgnoredPattern.FIRST_TIME],
    },
    minAxisMatch: 1,
  },
];
