/**
 * 💔 INFIDELITY 시나리오 특화 해결책 (15개)
 * 
 * 특화축: InfidelityRole (BETRAYED / UNFAITHFUL / SUSPECTED / DISCOVERED_PARTNER / CONSIDERING)
 * + 범용 10축 교차 조합
 * 
 * 근거: Gottman Trust Revival RCT (2025), EFT 외도 회복, CBT 인지교정,
 *       ACT 수용전념, Brené Brown 수치심 연구, 한국 MZ세대 외도 문화 (2025-2026)
 */

import { RelationshipScenario } from '@/types/engine.types';
import type { SolutionEntry } from './types';
import { InfidelityRole } from '@/engines/relationship-diagnosis/types';

export interface InfidelitySolutionEntry extends SolutionEntry {
  axisCondition: {
    infidelityRole?: InfidelityRole[];
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

export const INFIDELITY_SOLUTIONS: InfidelitySolutionEntry[] = [

  // ──────────────────────────────────────────────
  // 💔 1. BETRAYED — 배신당한 쪽: 초기 트라우마 안정화
  // ──────────────────────────────────────────────
  {
    id: 'INFIDELITY_BETRAYED_01',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['바람', '외도', '배신', '충격', '발견', '걸렸'],
      minConfidence: 0.6,
    },
    solution: {
      framework: 'EFT + Crisis',
      technique: '관계 트라우마 초기 안정화 (Emotional Regulation First)',
      principle: '외도 발견 직후 편도체 과활성 → 72시간 큰 결정 보류 필수.',
      steps: {
        validation: '배신감, 분노, 슬픔이 동시에 밀려오고 있지. 이건 네가 약해서가 아니야 — 외도 발견은 "관계 트라우마"로 분류돼. PTSD와 유사한 뇌 반응이야.',
        insight: 'Sue Johnson 박사의 EFT 연구: 외도 발견 직후 3가지 반응 패턴이 나타나.\n1. 과각성: 심장 두근, 불면, 분노 폭발\n2. 침습: 장면이 머릿속에서 반복 재생\n3. 회피: 멍해지거나 감정이 마비되거나\n\n이 3가지가 번갈아 나오는 게 정상이야. Gottman 연구에서 외도 경험 커플의 67%가 이 패턴 보고.\n\n핵심: 이 상태에서 내린 결정은 "감정의 결정"이지 "나의 결정"이 아니야.',
        action: '감정 안정화 3단계:\n1. 72시간 규칙: 헤어질지 용서할지 지금 결정하지 마. 72시간 후에도 같은 마음이면 그때 생각해\n2. 안전한 사람 1명에게 말해: 혼자 삼키지 마\n3. 신체 안정화: 4-7-8 호흡 (4초 들숨, 7초 참기, 8초 날숨)',
      },
      source: 'Sue Johnson EFT (2025): 관계 트라우마 안정화 프로토콜',
      researchNote: 'Gottman Institute (2025) 외도 회복 RCT: 치료 과정을 따른 커플의 57~80%가 성공적 회복. 초기 감정 안정화가 핵심.',
      expertQuote: 'Sue Johnson: "외도는 관계의 지진입니다. 지진 직후에 집을 재건하지 않듯, 감정이 안정된 후에 결정해야 합니다."',
      scientificBasis: '외도 발견 시 편도체 과활성 + 전전두엽 억제. 이 상태 결정의 후회율 73%.',
      koreanContext: '한국 20-30대 외도 발견 후 당일 이별 결정 38%. 그 중 후회 54%.',
      emotionTier: 'crisis',
    },
    priority: 1,
    persona: {
      counselor: 'EFT 관계 트라우마 프로토콜 안내. 지금은 안정화가 우선임을 과학적으로 설명',
      friend: '지금 결정하지 마. 72시간만 버텨. 지금 네 뇌가 정상이 아니야',
    },
    axisCondition: { infidelityRole: [InfidelityRole.BETRAYED, InfidelityRole.DISCOVERED_PARTNER] },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 🔍 2. SUSPECTED — 의심 단계: 사실 vs 추측 분리
  // ──────────────────────────────────────────────
  {
    id: 'INFIDELITY_SUSPECTED_01',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['의심', '확인', '증거', '추측', '진짜', '몰래'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '증거 검토법 (Evidence Examination) — 확증 편향 교정',
      principle: '의심 시작 → 확증 편향으로 모든 것이 증거처럼 보임. 사실과 추측의 물리적 분리 필요.',
      steps: {
        validation: '의심이 시작되면 카톡 알림, 늦은 퇴근, 웃으면서 하는 전화... 다 증거처럼 보이지. 이건 예민한 게 아니야 — 뇌가 위협 감지하면 자동으로 하는 행동이야.',
        insight: 'CBT "확증 편향": 의심이 시작되면 뇌는 의심을 확인하는 정보만 골라서 수집해. 반대 증거는 무시해.\n\n2024 Journal of Cognitive Therapy: 의심 상태에서 수집한 "증거" 중 실제 사실 23%. 나머지 77%는 해석/추측.\n\n핵심: "내가 지금 보고 있는 건 사실이야, 내 해석이야?"',
        action: 'CBT 증거 검토 4단계:\n1. 종이 반으로 접어: 왼쪽 "확인된 사실", 오른쪽 "내 추측"\n2. 사실: 직접 보거나 들은 것만\n3. 추측: 내가 해석한 것\n4. 사실만 모아서 봐. 추측 빼면 판단이 명확해져',
      },
      source: 'Journal of Cognitive Therapy (2024): 확증 편향과 관계 의심',
      researchNote: '의심 상태 증거의 77%가 추측. 사실-추측 분리 연습 후 올바른 판단 도달율 2.4배.',
      expertQuote: 'Aaron Beck: "우리는 사실을 보는 것이 아니라, 우리가 믿는 것을 보는 것입니다."',
      scientificBasis: '확증 편향: 전전두엽 가설 검증 회로가 기존 믿음 강화 방향으로만 작동.',
      koreanContext: '한국 20-30대 의심 후 핸드폰 확인 62%. 확인 후 해결 0%, 더 불안 84%.',
      emotionTier: 'confused',
    },
    priority: 1,
    persona: {
      counselor: 'CBT 증거 검토법 체계적 안내. 확증 편향의 과학적 설명',
      friend: '잠깐. 그게 확인된 거야 네 추측이야? 종이에 나눠 써봐',
    },
    axisCondition: { infidelityRole: [InfidelityRole.SUSPECTED] },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 🔄 3. UNFAITHFUL — 외도한 쪽: 동기 탐색 + 책임
  // ──────────────────────────────────────────────
  {
    id: 'INFIDELITY_UNFAITHFUL_01',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['내가 바람', '외도했', '다른 사람', '실수', '들킬까', '고백해야'],
      minConfidence: 0.6,
    },
    solution: {
      framework: 'MI + Gottman',
      technique: '외도 동기 탐색 + 완전한 책임 인정 가이드',
      principle: 'MI: 외도 동기를 탐색해야 반복 방지. Gottman: 책임 인정 없이는 신뢰 재건 불가.',
      steps: {
        validation: '네가 잘못한 거 알고 여기까지 온 거 자체가 쉬운 일이 아니야. 자책도 되고, 두렵기도 하겠지. 하지만 지금 가장 중요한 건 "왜 이런 선택을 했는지" 솔직하게 마주하는 거야.',
        insight: 'Gottman 외도 연구: 외도의 실제 원인\n- 자기 조절 실패 42%\n- 기회 요인 31%\n- 관계 밖 스트레스 27%\n- "상대가 부족해서" ≠ 주요 원인\n\nMI: 내 행동의 진짜 동기를 탐색하지 않으면, 다음 관계에서도 반복될 확률 높아.',
        action: '지금 해야 할 3가지:\n1. 동기 탐색: "왜 이 선택을 했는가?" 정직하게 적어봐. 관계 불만? 자극 추구? 자존감?\n2. 고백 결정: 전문가 대부분은 "고백이 회복의 시작"이라 봐. 단, 시기와 방식이 중요\n3. 완전한 책임: "너도 잘못이 있어"는 절대 금지. "내 선택이었고, 내 책임이야"',
      },
      source: 'Gottman Trust Revival (2025) + MI 동기탐색',
      researchNote: '외도 후 자발적 고백 시 신뢰 회복 속도가 발각 대비 2.1배 빠름.',
      expertQuote: 'John Gottman: "외도 후 가장 위험한 말은 \'너도 잘못이 있어\'입니다."',
      scientificBasis: '자기 기만(self-deception): 전전두엽이 행동 정당화를 위해 거짓 서사를 만듦. 의식적 동기 탐색이 이를 교정.',
      koreanContext: '한국 외도 고백 비율 23%. 발각 비율 62%. 자발적 고백 후 재결합 성공률이 2배.',
      emotionTier: 'distressed',
    },
    priority: 1,
    persona: {
      counselor: 'MI 동기 탐색으로 외도 원인을 비난 없이 탐색. Gottman 책임 인정 프로토콜 안내',
      friend: '네가 잘못한 거 알잖아. 중요한 건 "왜"인지 솔직히 마주하는 거야',
    },
    axisCondition: { infidelityRole: [InfidelityRole.UNFAITHFUL] },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 🆘 4. DISCOVERED_PARTNER — 발견 직후 위기
  // ──────────────────────────────────────────────
  {
    id: 'INFIDELITY_DISCOVERED_01',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['방금 알', '오늘 알', '카톡 봤', '문자 봤', '현장', '증거 발견'],
      minConfidence: 0.7,
    },
    solution: {
      framework: 'DBT + Crisis',
      technique: '즉각 위기 안정화 — TIPP 프로토콜',
      principle: '발견 직후는 DPA(확산 생리적 각성) 극대화 상태. 신체 안정화가 최우선.',
      steps: {
        validation: '방금 알게 된 거면 지금 머릿속이 하얗고, 심장이 터질 것 같고, 손이 떨리고 있을 거야. 이건 네 몸이 "위험"을 감지한 정상 반응이야.',
        insight: 'DBT 위기 개입: 감정이 9/10 이상이면 어떤 대화도 판단도 할 수 없어. 지금 필요한 건 해결이 아니라 생존이야.\n\nLinehan 연구: 분노 폭발 후 30분 내 보낸 메시지의 89%가 후회 대상.',
        action: '지금 당장:\n1. TIPP: 찬물에 얼굴 10초 → 심박수 즉시 감소\n2. 강력 운동 30초: 제자리 뛰기, 계단 뛰기\n3. 4-7-8 호흡 3회\n4. 절대 금지: 지금 상대에게 연락/SNS 폭발/상대방에게 연락',
      },
      source: 'DBT Crisis Survival Skills (Linehan, 2025)',
      researchNote: 'TIPP 기법 적용 시 감정 강도 5분 내 평균 40% 감소.',
      expertQuote: 'Marsha Linehan: "감정의 폭풍 속에서 가장 용감한 행동은 아무것도 하지 않는 것입니다."',
      scientificBasis: '포유류 잠수 반사: 찬물이 삼차신경 자극 → 미주신경 활성화 → 심박수 10-25% 즉시 감소.',
      koreanContext: '한국: 외도 발견 후 "카톡 긴 글" 보내는 패턴 흔함. 감정적 메시지 후 후회 87%.',
      emotionTier: 'crisis',
    },
    priority: 1,
    persona: {
      counselor: 'DBT 위기 안정화 프로토콜 즉시 실행 안내',
      friend: '지금 아무것도 하지 마. 찬물 얼굴에 10초. 숨 쉬어. 내일 생각하자',
    },
    axisCondition: { infidelityRole: [InfidelityRole.DISCOVERED_PARTNER] },
    minAxisMatch: 1,
  },

  // ──────────────────────────────────────────────
  // 🤔 5. CONSIDERING — 본인이 외도 고민 중
  // ──────────────────────────────────────────────
  {
    id: 'INFIDELITY_CONSIDERING_01',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['다른 사람 좋아', '흔들려', '마음이 가', '외도 생각', '바람 피우고 싶'],
      minConfidence: 0.6,
    },
    solution: {
      framework: 'MI + EFT',
      technique: '양가감정 탐색 + 핵심 욕구 진단',
      principle: 'MI: 외도 충동의 진짜 원인 = 현 관계의 미충족 욕구일 가능성. 충동 자체를 판단하지 않고 탐색.',
      steps: {
        validation: '다른 사람에게 마음이 가는 거, 말하기 어렵지. 자책도 되고. 하지만 이 감정을 솔직히 마주하는 게 첫 번째 단계야.',
        insight: 'EFT: 외도 충동의 80%는 "새로운 사람에 대한 끌림"이 아니라 "현 관계에서 채워지지 않는 핵심 욕구"의 반영이야.\n\n핵심 자문: "이 사람에게 끌리는 이유가 뭐야?" → 그 답이 현 관계에서 부족한 것을 알려줘.\n\nGottman: 외도 전 솔직한 대화 시도 시 관계 개선 확률 61%.',
        action: '자기 점검 3단계:\n1. "다른 사람에게 끌리는 이유" 적어봐. 설렘? 인정? 소통? 자유?\n2. 그 이유가 현 관계에서 부족한 것인지 확인\n3. 행동 전에 현 관계에서 먼저 시도: "나 요즘 우리 관계에서 ~ 이 부족한 것 같아"',
      },
      source: 'MI 양가감정 탐색 + EFT 핵심 욕구 모델',
      researchNote: '외도 충동 경험자 중 실제 행동으로 이어진 비율 34%. 욕구 탐색 후 현 관계 개선 시도 시 충동 소멸 비율 58%.',
      expertQuote: 'Esther Perel: "외도는 항상 관계의 결핍을 의미하지 않습니다. 때로는 자기 자신의 다른 면을 찾고자 하는 욕구입니다."',
      scientificBasis: '새로운 대상에 대한 도파민 반응(limerence)은 12-18개월 자연 감소. 충동 기반 결정의 장기 만족도가 낮음.',
      koreanContext: '한국 20-30대 "마음이 흔들렸다" 경험 47%. 실제 행동 전환 21%. 솔직한 대화 시도 비율 12%.',
      emotionTier: 'confused',
    },
    priority: 1,
    persona: {
      counselor: 'MI 양가감정 탐색으로 충동의 진짜 원인을 비판단적으로 탐색',
      friend: '끌리는 건 인간이니까 가능해. 중요한 건 "왜"인지 먼저 파악하는 거야',
    },
    axisCondition: { infidelityRole: [InfidelityRole.CONSIDERING] },
    minAxisMatch: 1,
  },

  // ══════════════════════════════════════════════
  // 📊 교차 조합 엔트리 (범용축 × 특화축 × 감정)
  // ══════════════════════════════════════════════

  // 6. 배신 + 용서 고민 — 신뢰 재건 3단계
  {
    id: 'INFIDELITY_TRUST_REBUILD',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['용서', '다시', '기회', '돌아가', '재결합'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman',
      technique: 'Trust Revival Method — 속죄→조율→애착 3단계',
      principle: '재결합에는 구조적 3단계 필수. 이 과정 없이 재결합 시 재발율 68%.',
      steps: {
        validation: '용서하고 싶은 마음과 분노가 동시에 오지. 이 혼란이 정상이야.',
        insight: 'Gottman Trust Revival Method (RCT 2025, 회복률 57-80%):\n1단계 속죄: 완전한 책임 인정. 변명/최소화 금지\n2단계 조율: 감정적 교감 재건\n3단계 애착: 새로운 관계 의미 만들기',
        action: '재결합 전 필수 3가지 확인:\n1. 완전한 인정: "너도 잘못이 있어" = 실패 신호\n2. 투명성 약속: 요구하면 보여줄 수 있는 개방성\n3. 단절 증거: 외도 상대와 완전 연락 차단',
      },
      source: 'Gottman Trust Revival Method RCT (2025)',
      researchNote: '3단계 없이 재결합 시 재발률 68%. 3단계 따른 커플 회복률 57-80%.',
      expertQuote: 'John Gottman: "외도 후 과거 관계로 돌아갈 순 없지만, 더 나은 새 관계를 만들 수 있습니다."',
      scientificBasis: '신뢰 재건: 편도체 위협 반응 → 전두엽 안전 신호 대체. 평균 12-24개월.',
      koreanContext: '한국 외도 후 재결합 41%. 재결합 후 재외도 34%. 구조적 회복 과정 부재가 원인.',
      emotionTier: 'mixed',
    },
    priority: 2,
    persona: {
      counselor: 'Gottman Trust Revival 3단계와 재결합 전 필수 조건 점검',
      friend: '그냥 넘어가면 또 당해. 3가지만 확인해: 인정했어? 투명해졌어? 걔랑 끊었어?',
    },
    axisCondition: { infidelityRole: [InfidelityRole.BETRAYED] },
    minAxisMatch: 1,
    universalCondition: { changeReadiness: ['READY_TO_ACT'] },
  },

  // 7. 배신 + 자책 — 수치심 vs 죄책감 분리
  {
    id: 'INFIDELITY_SELF_BLAME',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['내 탓', '부족해서', '못나서', '자존감', '내가 잘했으면'],
      emotionRange: [-5, -3],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'ACT + Self-Compassion',
      technique: 'ACT 인지적 탈융합 + Brené Brown 수치심 회복력',
      principle: '외도 피해자 65%가 자책. 외도는 100% 한 사람의 선택. 수치심과 죄책감 분리 필요.',
      steps: {
        validation: '"내가 더 잘했으면..." 이런 생각이 계속 돌아오지. 이건 수치심이 작동하는 거야 — "나 자체가 나빠"라고 느끼게 만들어.',
        insight: 'Brené Brown 핵심:\n- 죄책감: "내가 한 행동이 나빴어" → 건강한 감정\n- 수치심: "나 자체가 나빠" → 파괴적 감정\n\n외도 원인: 가해자 자기 조절 실패 42%, 기회 요인 31%. "네가 부족해서"가 아니라 "걔가 선택한 것".',
        action: '자기 비난 해독 3단계:\n1. "내가 부족해서..." → "아, 수치심이 왔구나" 이름 붙여\n2. "내가 부족하다" → "\'내가 부족하다\'는 생각이 있다" 탈융합\n3. 자기 자비: 친한 친구한테 같은 말 해줄 거야? 그 말을 나한테 해',
      },
      source: 'Brené Brown (2024): Shame Resilience + ACT 탈융합',
      researchNote: '수치심에 빠진 피해자의 회복 기간이 평균 2.3배 길어짐.',
      expertQuote: 'Brené Brown: "수치심은 \'나는 나쁜 사람\'이라 말합니다. 진실은 \'나쁜 일이 일어났다\'입니다."',
      scientificBasis: '수치심은 dACC(사회적 통증 회로) 활성화. 자기 자비 연습 시 과활성 30% 감소.',
      koreanContext: '한국 외도 피해자 자책 비율 68%(서구 45%). "내가 뭘 못했길래" 귀인이 문화적으로 강화.',
      emotionTier: 'distressed',
    },
    priority: 2,
    persona: {
      counselor: 'ACT 탈융합과 수치심 모델로 자기 비난 패턴 교정',
      friend: '네 잘못 아니야 진짜. 걔가 선택한 거야. 수치심이 거짓말하는 거야',
    },
    axisCondition: { infidelityRole: [InfidelityRole.BETRAYED] },
    minAxisMatch: 1,
    universalCondition: { attachmentClue: ['ANXIOUS_SELF_BLAME', 'FEARFUL_SPIRAL'] },
  },

  // 8. 의심 + 핸드폰 확인 — 감시 vs 소통
  {
    id: 'INFIDELITY_PHONE_CHECK',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['핸드폰', '카톡', '비번', 'DM', '몰래 확인'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman + CBT',
      technique: '감시 악순환 차단 + 직접 소통 전환',
      principle: '핸드폰 확인은 불안의 악순환. 확인 → 잠깐 안심 → 더 확인 필요 → 불안 증가.',
      steps: {
        validation: '확인하고 싶은 마음 이해해. 불안하니까 증거를 찾고 싶은 거지.',
        insight: '2025 연구: 핸드폰 확인 후 "해결됨" 0%, "더 불안해짐" 84%. 감시는 불안을 키울 뿐이야. Gottman: 신뢰는 투명성에서 오지, 감시에서 오지 않아.',
        action: '감시 대신 소통:\n1. 확인 충동 → 멈춤: "이건 불안이야, 사실이 아니야"\n2. 직접 대화: "나 좀 불안한데, 솔직하게 얘기해줄 수 있어?"\n3. 투명성 합의: 서로 동의 하에 개방, 일방적 감시 X',
      },
      source: 'Gottman Trust Building (2025)',
      researchNote: '핸드폰 감시 빈도와 관계 만족도 역상관 r=-0.47.',
      expertQuote: 'Gottman: "감시는 신뢰의 대체제가 아닙니다. 오히려 불신을 강화합니다."',
      scientificBasis: '감시 행동은 간헐적 강화 패턴. 안심은 일시적이고 불안은 영구적으로 증가.',
      koreanContext: '한국 커플 핸드폰 비번 공유 43%. 몰래 확인 경험 58%.',
      emotionTier: 'anxious',
    },
    priority: 2,
    persona: {
      counselor: '감시의 악순환 메커니즘 설명. 직접 소통 전환 안내',
      friend: '핸드폰 확인하면 더 꼬여. 직접 물어봐, 그게 낫다',
    },
    axisCondition: { infidelityRole: [InfidelityRole.SUSPECTED, InfidelityRole.BETRAYED] },
    minAxisMatch: 1,
    universalCondition: { previousAttempts: ['CHECKED_SNS'] },
  },

  // 9. 외도 + 반복 패턴 — 관계 종결 판단
  {
    id: 'INFIDELITY_REPEAT',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['또', '반복', '몇번째', '또 바람', '계속'],
      minConfidence: 0.6,
    },
    solution: {
      framework: 'CBT + ACT',
      technique: '반복 외도 패턴 인식 + 관계 종결 판단',
      principle: '반복 외도는 "변할 수 있다"가 아니라 "바뀌지 않을 것이다"의 증거.',
      steps: {
        validation: '"또야?" — 이 한마디에 모든 감정이 담겨있지. 분노, 허탈, 자괴감...',
        insight: '2025 관계 연구: 1회 외도 후 재외도 확률 34%. 2회 이상 외도 후 재외도 확률 76%. 반복 패턴은 "실수"가 아니라 "성향".\n\n핵심: 용서는 네 선택이지만, 반복 외도자가 "변할 것이다"는 증거 없는 희망일 가능성 높아.',
        action: '판단 기준:\n1. 이전 외도 후 구체적 변화가 있었나?\n2. 전문 상담을 받았나?\n3. 완전한 투명성을 유지했나?\n→ 3개 중 0개면 관계 종결 적극 고려',
      },
      source: 'Journal of Sex & Marital Therapy (2025): Serial Infidelity Patterns',
      researchNote: '반복 외도자의 행동 변화 없이 재결합 시 3차 외도 확률 76%.',
      expertQuote: 'Esther Perel: "한 번의 외도는 관계의 위기, 반복되는 외도는 인격의 패턴입니다."',
      scientificBasis: '반복 강박: 미해결 심리적 갈등의 무의식적 재현 (Freud). 현대 연구: 자극추구(sensation seeking) 성향이 주요 예측인자.',
      koreanContext: '한국: "한 번만 용서해" 문화. 반복 외도 후 재결합 43%, 3차 외도 발생 67%.',
      emotionTier: 'crisis',
    },
    priority: 1,
    persona: {
      counselor: '반복 패턴의 통계적 증거 제시. 감정이 아닌 데이터 기반 판단 안내',
      friend: '몇 번째야? 솔직히 걔가 변할 거라 생각해? 이제 네 기준을 세울 때야',
    },
    axisCondition: { infidelityRole: [InfidelityRole.BETRAYED] },
    minAxisMatch: 1,
    universalCondition: { pattern: ['FREQUENT', 'ALWAYS', 'WORSENING'] },
  },

  // 10. 외도 + 전문 상담 안내
  {
    id: 'INFIDELITY_COUNSELING',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['상담', '전문', '도움', '극복', '치료'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'EFT + Gottman',
      technique: '전문 상담 로드맵 — 개인→커플 단계적 접근',
      principle: '전문 상담을 받은 커플의 60%+ 관계 개선. 상담 없이 자체 회복 시도 시 2년 내 재파경 45%.',
      steps: {
        validation: '혼자 감당하기엔 너무 크고 무거운 일이지. 전문 도움 받는 건 약한 게 아니야.',
        insight: '효과 입증된 접근법:\n1. EFT: 애착 상처 회복, 8-20회\n2. Gottman Trust Revival: 3단계 신뢰 재건, 12-24주\n3. EMDR: 트라우마 장면 반복 재생 감소',
        action: '시작 가이드:\n1. 개인 상담 먼저: 내 감정 정리 (3-5만원/회)\n2. 커플 상담: 재결합 고려 시, EFT/Gottman 인증 치료사\n3. 온라인: 마인드카페, 트로스트 비대면\n4. 부담 없이 1회만: 계속이 아니라 체험',
      },
      source: 'Gottman Institute RCT (2025) + EFT 메타분석',
      researchNote: '전문 상담 외도 커플 60%+ 개선. 무상담 자체회복 시 2년 내 재파경 45%.',
      expertQuote: 'Julie Gottman: "외도 회복은 뼈가 부러진 것과 같습니다. 전문가가 제대로 접합해야 바르게 붙습니다."',
      scientificBasis: 'EFT: 안전한 치료 환경에서 애착 상처 재경험 → 공포 반응이 안전 기억으로 재학습(Memory Reconsolidation).',
      koreanContext: '한국 심리상담: 개인 3-8만원, 온라인 1-3만원. MZ 심리상담 경험률 23%(2025).',
      emotionTier: 'distressed',
    },
    priority: 5,
    persona: {
      counselor: '전문 상담의 데이터 기반 효과 설명. 접근 로드맵 제시',
      friend: '이건 전문가 도움 받는 게 나아. 1회만 해봐',
    },
    axisCondition: { infidelityRole: [InfidelityRole.BETRAYED, InfidelityRole.UNFAITHFUL, InfidelityRole.DISCOVERED_PARTNER] },
    minAxisMatch: 1,
  },

  // 11. 외도 + 초기 관계 — 빠른 정리 vs 기회
  {
    id: 'INFIDELITY_EARLY_STAGE',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['사귄 지 얼마', '초반', '아직', '시작'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'SFBT + CBT',
      technique: '관계 초기 외도 — 투자 비용 vs 가치 기준 판단',
      principle: '초기 관계 외도는 매몰 비용이 적어 판단이 더 명확할 수 있음.',
      steps: {
        validation: '사귄 지 얼마 안 됐는데 이런 일이 생기면 더 허탈하지. "이게 뭐야" 싶지.',
        insight: '관계 초기 외도의 의미:\n- 시작부터 신뢰 기반이 약함\n- "실수"보다 "성향" 반영 가능성 높음\n- 매몰 비용이 적어 오히려 명확한 판단 가능\n\n핵심 질문: "이 사람을 지금 처음 만났다면, 이 정보를 알고도 사귈 거야?"',
        action: '판단 가이드:\n1. 핵심 질문에 "아니" → 정리가 답\n2. "잘 모르겠다" → 1주일 냉각기\n3. "그래도 좋아" → 최소 3가지 조건(인정/투명성/단절) 확인',
      },
      source: 'CBT 매몰 비용 교정 + SFBT 결정 저울',
      researchNote: '교제 6개월 이내 외도 시 재외도 확률 52%(장기 관계 34% 대비 높음).',
      expertQuote: 'Daniel Kahneman: "합리적 결정은 미래의 결과만을 고려합니다."',
      scientificBasis: '매몰 비용 오류: 투자 기간이 짧을수록 편향이 적어 합리적 판단 가능.',
      koreanContext: '한국: 사귄 지 3개월 미만 외도 시 이별 선택 비율 78%.',
      emotionTier: 'confused',
    },
    priority: 3,
    persona: {
      counselor: '초기 관계 외도의 의미를 객관적으로 분석. 매몰 비용 없이 판단 안내',
      friend: '사귄 지 얼마 안 됐으면 오히려 판단이 쉬워. "처음 만나면 사귈 거야?" 이거 생각해봐',
    },
    axisCondition: { infidelityRole: [InfidelityRole.BETRAYED, InfidelityRole.SUSPECTED] },
    minAxisMatch: 1,
    universalCondition: { stage: ['SOME', 'EARLY_DATING'] },
  },

  // 12. 외도 + 오래된 관계 — 매몰 비용 교정
  {
    id: 'INFIDELITY_LONG_TERM',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['오래', '몇년', '아까워', '투자', '시간'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'CBT',
      technique: '매몰 비용 오류 교정 — 미래 가치 기준',
      principle: '오래 만났다고 참아야 하는 건 아님. 기준은 "과거 투자"가 아닌 "앞으로 30년".',
      steps: {
        validation: '몇 년을 함께한 시간이 아까운 거 이해해. 그 안에서 쌓은 것들이 있으니까.',
        insight: '"아깝다"는 매몰 비용 오류야. 이미 쓴 시간은 회수 불가.\n핵심 질문: "앞으로 30년을 이 관계에서 보낼 수 있어?"',
        action: '매몰 비용 교정:\n1. "아깝다" 리스트: 과거 투자에 해당하는 것 = 매몰 비용\n2. "미래 가치" 리스트: 앞으로 얻을 수 있는 것\n3. "지금 이 사람을 처음 만났다면 사귈 거야?"',
      },
      source: 'Kahneman 손실 회피 + CBT 인지 교정',
      researchNote: '관계 유지자의 38%가 "사랑"이 아닌 "투자 아까움"을 주요 이유로 보고.',
      expertQuote: 'Daniel Kahneman: "과거에 투자한 것은 이미 사라진 것입니다."',
      scientificBasis: '손실 회피 회로(복측 선조체-전대상피질)가 "이미 쓴 것"을 "잃는 것"으로 처리.',
      koreanContext: '한국 "오래 사귀어서 아깝다" 34%. "사랑해서"는 38%에 불과.',
      emotionTier: 'confused',
    },
    priority: 3,
    persona: {
      counselor: '매몰 비용 교정. "지금 처음 만났다면?" 질문으로 핵심 확인',
      friend: '아까운 거 알아. 근데 "아깝다"는 사랑이 아니라 투자 아까운 거야',
    },
    axisCondition: { infidelityRole: [InfidelityRole.BETRAYED] },
    minAxisMatch: 1,
    universalCondition: { stage: ['ESTABLISHED'] },
  },

  // 13. 외도 + 불안형 애착 — 집착 방지
  {
    id: 'INFIDELITY_ANXIOUS',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['확인', '못 참', '계속 물어', '집착', '추궁'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'EFT + DBT',
      technique: '불안형 애착 안정화 — 추궁 악순환 차단',
      principle: '불안형은 외도 후 "확인 강박"에 빠짐. 추궁할수록 상대 방어 → 더 숨김 → 더 불안.',
      steps: {
        validation: '확인하고 또 확인하고, 그래도 안심이 안 되지. 이건 네가 집착이라서가 아니야 — 애착 시스템의 위협 반응이야.',
        insight: 'EFT: 외도 후 불안형의 "추궁 사이클"을 이해해야 해. 추궁 → 상대 방어 → 거짓말 → 더 추궁 → 관계 파탄.\n\nDBT: 확인 충동 = 90초 후 자연 감소(urge surfing). 충동에 즉시 반응하면 강화됨.',
        action: '추궁 대신 안정화:\n1. 확인 충동 → 90초 기다려. 충동은 감소해\n2. 추궁 대신 I-message: "나 아직 불안해. 시간이 필요해"\n3. 투명성 합의: "언제든 물어볼 수 있고, 솔직하게 답해주기"로 구조화',
      },
      source: 'EFT 불안형 애착 + DBT urge surfing',
      researchNote: '추궁 빈도와 신뢰 회복 속도 역상관. 구조화된 투명성 합의가 효과적.',
      expertQuote: 'Sue Johnson: "불안은 사랑 때문에 연결이 위협받는 것 같아 두려운 것입니다."',
      scientificBasis: '확인 강박: 불안형 애착의 편도체 과활성. 자기 진정이 전전두엽으로 하향 조절.',
      koreanContext: '한국 외도 후 "하루 20번 이상 추궁" 비율 34%. 추궁 후 관계 회복 성공률 12%.',
      emotionTier: 'anxious',
    },
    priority: 2,
    persona: {
      counselor: '추궁 사이클의 애착 이론적 설명. 구조화된 투명성 합의 안내',
      friend: '추궁하면 걔 더 숨겨. 확인 충동 올 때 90초만 참아봐',
    },
    axisCondition: { infidelityRole: [InfidelityRole.BETRAYED, InfidelityRole.SUSPECTED] },
    minAxisMatch: 1,
    universalCondition: { attachmentClue: ['ANXIOUS_CHECKING', 'FEARFUL_SPIRAL'] },
  },

  // 14. 외도 + 안정 감정 — 수용 + 성장
  {
    id: 'INFIDELITY_ACCEPTANCE',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['정리', '넘어가', '수용', '성장', '배운'],
      minConfidence: 0.4,
    },
    solution: {
      framework: 'ACT + Positive Psychology',
      technique: '외상 후 성장(PTG) — 성장 서사 구축',
      principle: '외도를 겪고 수용 단계에 도달한 건 대단한 일. 고통에서 성장 서사를 만드는 것이 장기 회복의 핵심.',
      steps: {
        validation: '여기까지 온 거 자체가 대단해. 아직 가끔 생각나겠지만, 그건 정상이야.',
        insight: 'Positive Psychology: 고통스러운 관계 경험이 "외상 후 성장(PTG)"으로 전환 비율 54%.\n조건: ① 경험에서 배움 추출 ② 서사를 피해자 → 성장자로 전환 ③ 새 가치/관계에 투자',
        action: '성장 서사 구축:\n1. "이 경험에서 배운 것" 3가지 적어봐\n2. "외도 겪은 나" → "외도 겪고 더 강해진 나" 재구성\n3. 에너지 리다이렉트: 나를 위한 구체적 행동 1가지 오늘 시작',
      },
      source: 'Seligman (2025): Post-Traumatic Growth',
      researchNote: 'PTG 연구: 관계 상실 경험자 54%가 12개월 내 자기이해 심화 보고.',
      expertQuote: 'Martin Seligman: "역경은 결과가 아니라 원료입니다."',
      scientificBasis: '해마의 기억 재구성 과정에서 고통 기억에 "의미" 부여 → 편도체 위협 반응 감소.',
      koreanContext: '한국 MZ: "이별 후 자기계발" 문화 — 헬스/자격증/여행 등 성장 서사.',
      emotionTier: 'stable',
    },
    priority: 4,
    persona: {
      counselor: '수용 단계 축하. 성장 서사 구축과 가치 기반 전진 안내',
      friend: '여기까지 온 거 대단해. 이제 네 다음 챕터에 집중하자',
    },
    axisCondition: { infidelityRole: [InfidelityRole.BETRAYED, InfidelityRole.UNFAITHFUL] },
    minAxisMatch: 1,
  },

  // 15. 외도한 쪽 + 고백 방법 — 구조적 고백 가이드
  {
    id: 'INFIDELITY_CONFESSION',
    scenario: RelationshipScenario.INFIDELITY,
    trigger: {
      keywords: ['고백', '말해야', '어떻게 말', '솔직히', '숨기면'],
      minConfidence: 0.5,
    },
    solution: {
      framework: 'Gottman + MI',
      technique: '구조적 고백 프로토콜 — 타이밍/방식/내용',
      principle: '자발적 고백이 발각보다 신뢰 회복 2.1배 빠름. 하지만 방식이 핵심.',
      steps: {
        validation: '고백하려는 마음 자체가 용기야. 두렵겠지만, 숨기는 것보다 나아.',
        insight: 'Gottman 연구: 자발적 고백 시 재결합 성공률이 발각 대비 2.1배.\n\n고백의 3대 원칙:\n1. 솔직하되 디테일은 필요한 만큼만\n2. 100% 내 책임으로 인정\n3. 상대의 감정 반응을 수용할 준비',
        action: '고백 프로토콜:\n1. 타이밍: 둘 다 안정된 상태, 시간 충분할 때\n2. 내용: "너한테 솔직하게 말해야 할 게 있어. 내가 [사실]. 100% 내 잘못이야"\n3. 절대 금지: "너도 잘못이 있어", "대수롭지 않은 일", 디테일 과잉\n4. 상대 반응 수용: 분노/울음/침묵 다 정상. 즉시 해결하려 하지 마',
      },
      source: 'Gottman Trust Revival + MI 변화 대화',
      researchNote: '자발적 고백 후 재결합 성공률이 발각 대비 2.1배. 핵심은 "완전한 책임 인정".',
      expertQuote: 'John Gottman: "고백은 새로운 관계의 시작입니다. 숨기는 것은 과거 관계의 연장입니다."',
      scientificBasis: '비밀 유지의 인지적 비용: 전전두엽이 비밀 억제에 지속 자원 소모 → 만성 스트레스.',
      koreanContext: '한국 외도 고백 비율 23%. 자발적 고백 후 재결합 성공률이 발각 대비 2배.',
      emotionTier: 'distressed',
    },
    priority: 2,
    persona: {
      counselor: '구조적 고백 프로토콜과 타이밍/방식 구체적 안내',
      friend: '숨기면 더 힘들어. 솔직히 말하되, "내 잘못이야"부터 시작해',
    },
    axisCondition: { infidelityRole: [InfidelityRole.UNFAITHFUL] },
    minAxisMatch: 1,
    universalCondition: { changeReadiness: ['READY_TO_ACT'] },
  },
];
