/**
 * 🆕 v12: 관계진단 프롬프트 생성기
 *
 * 진단 결과 → AI 프롬프트 주입
 * - MIRROR 구간: 진단 질문 프롬프트
 * - ACTION 구간: 진단 근거 기반 솔루션 프롬프트
 */

import type { DiagnosisResult, DiagnosisAxesState, UniversalAxes } from './types';
import { ConflictStyle, ChangeReadiness, PartnerContext, PreviousAttempt } from './types';

// ============================================================
// 진단 질문 프롬프트 (MIRROR 구간)
// ============================================================

interface DiagnosticQuestionSet {
  counselor: string;
  friend: string;
}

/** 범용 축별 진단 질문 */
const DIAGNOSTIC_QUESTIONS: Record<string, DiagnosticQuestionSet> = {
  duration: {
    counselor: '이런 상황이 된 지 대략 얼마나 됐는지 알 수 있을까요?',
    friend: '이거 언제부터야? 몇 시간 전? 며칠째?',
  },
  stage: {
    counselor: '두 분의 현재 관계는 어떤 단계인지 궁금해요. 사귀시는 건가요?',
    friend: '걔랑 사귀는 사이야? 아니면 썸?',
  },
  changeReadiness: {
    counselor: '지금 어떤 도움이 필요하신지 궁금해요. 감정을 정리하고 싶으신 건지, 구체적으로 어떻게 해야 할지 알고 싶으신 건지요?',
    friend: '지금 뭐가 제일 필요해? 마음 정리? 아니면 뭐라 보내야 할지?',
  },
  conflictStyle: {
    counselor: '이런 상황에서 보통 어떻게 반응하시나요? 먼저 연락을 더 하시는 편인지, 기다리시는 편인지 궁금해요.',
    friend: '너는 보통 연락 더 하는 편이야? 아니면 기다려?',
  },
  pattern: {
    counselor: '이런 일이 이전에도 있었나요? 처음인지, 반복되는 건지 궁금해요.',
    friend: '이번이 처음이야? 아니면 맨날 이래?',
  },
  readType: {
    counselor: '메시지를 읽기는 하셨는지, 아예 확인도 안 한 건지 알 수 있을까요?',
    friend: '읽기는 한 거야? 아니면 아예 안 읽은 거야?',
  },

  // ── 시나리오 특화축 진단 질문 ──

  ghostType: {
    counselor: '연락이 완전히 끊긴 건지, 아니면 점점 줄어드는 건지, 혹시 SNS는 확인하시는 건지 궁금해요.',
    friend: '완전 잠수야? 아니면 점점 연락이 줄어든 거야? 혹시 인스타는 봐?',
  },
  ldrEndpoint: {
    counselor: '장거리가 언제쯤 끝날 것 같으신지, 계획이 있으신지 궁금해요.',
    friend: '장거리 언제까지야? 끝이 정해져 있어? 아니면 아직 모르는 거야?',
  },
  jealousyType: {
    counselor: '지금 느끼시는 게 머릿속으로 걱정이 계속 되는 건지, 감정이 올라오는 건지, 아니면 확인하고 싶은 충동이 드시는 건지 궁금해요.',
    friend: '지금 그냥 머릿속에서 의심이 드는 거야? 화가 나는 거야? 아니면 핸드폰 확인하고 싶은 거야?',
  },
  infidelityRole: {
    counselor: '혹시 이 상황에서 지금 어떤 입장이신지 여쭤봐도 될까요? 상대의 외도를 발견하신 건지, 아니면 다른 상황인지요.',
    friend: '걔가 바람핀 거야? 아니면 네가 마음이 흔들린 거야? 아직 확실한 건 아닌 거야?',
  },
  breakupAmbivalence: {
    counselor: '지금 마음이 어느 쪽에 더 기울어 있으신지 궁금해요. 관계를 유지하고 싶은 쪽인지, 정리하고 싶은 쪽인지요.',
    friend: '솔직히 지금 남고 싶은 마음이 더 커? 떠나고 싶은 마음이 더 커? 아니면 진짜 모르겠어?',
  },
  boredomType: {
    counselor: '권태감이 어떤 부분에서 느껴지시는지 궁금해요. 감정적으로 시들해진 건지, 대화가 줄어든 건지, 함께 할 게 없다고 느끼시는 건지요.',
    friend: '뭐가 지루한 거야? 감정이 식은 거야? 할 말이 없는 거야? 매일 똑같아서?',
  },
  generalConcernType: {
    counselor: '지금 고민이 소통 문제인지, 미래 계획에 대한 것인지, 아니면 관계 속에서의 자존감 문제인지 궁금해요.',
    friend: '고민이 뭐야? 대화 문제? 미래 얘기? 아니면 네 자존감 문제?',
  },
};


/**
 * 진단 질문 프롬프트 생성
 */
export function generateDiagnosticPrompt(
  missingAxis: string,
  persona: 'counselor' | 'friend' | 'panel',
): string {
  if (persona === 'panel') return '';

  const question = DIAGNOSTIC_QUESTIONS[missingAxis];
  if (!question) return '';
  const q = persona === 'friend' ? question.friend : question.counselor;

  return `\n## 🔍 진단 질문 (자연스럽게 녹여주세요)
이 사용자의 상황을 더 정확히 이해하기 위해 아래 질문을 응답 끝에 자연스럽게 포함해주세요.

질문 의도: ${missingAxis}
참고 문장: "${q}"

⚠️ 위 문장을 그대로 쓰지 말고, 대화 흐름에 맞게 자연스럽게 변형하세요.
⚠️ 공감이 먼저! 질문은 마지막 1줄에 짧게.`;
}

// ============================================================
// 진단 근거 프롬프트 (ACTION 구간)
// ============================================================

/**
 * 진단 결과를 솔루션 프롬프트에 주입
 *
 * ACTION 구간에서 AI가 진단 근거를 참고하여 맞춤 조언 제공
 */
export function generateDiagnosisPrompt(
  diagnosis: DiagnosisResult,
): string {
  if (diagnosis.diagnosisQuality === 'insufficient') return '';

  const u = diagnosis.universal;
  const parts: string[] = [];

  parts.push(`\n## 📊 관계진단 결과 (솔루션 맞춤 참고)`);
  parts.push(`진단 품질: ${diagnosis.diagnosisQuality} (${diagnosis.totalFilledCount}개 축 수집)`);

  // 갈등 스타일 기반 조언 방향
  if (u.conflictStyle) {
    const advice: Record<ConflictStyle, string> = {
      PURSUE: '이 유저는 매달리는 편입니다. "지금은 멈추고 기다리기"를 강조하되, 기다리는 것이 무관심이 아님을 설명하세요.',
      WITHDRAW: '이 유저는 움츠리는 편입니다. "용기 내서 먼저 다가가기"를 격려하되, 부담 없는 가벼운 연락 방법을 제안하세요.',
      CONFRONT: '이 유저는 직면하는 스타일입니다. 대화 기법(I-message, 부드러운 시작)을 구체적으로 안내하세요.',
      AVOID: '이 유저는 회피 성향입니다. 문제를 직면하는 것의 중요성을 부드럽게 설명하되, 작은 첫걸음을 제안하세요.',
    };
    parts.push(`\n⚡ 갈등 스타일: ${u.conflictStyle}\n→ ${advice[u.conflictStyle]}`);
  }

  // 변화 준비도 기반 조언 깊이
  if (u.changeReadiness) {
    const advice: Record<ChangeReadiness, string> = {
      READY_TO_ACT: '유저가 행동 준비됨 → 구체적 카톡 초안/행동 단계를 제시하세요.',
      NEEDS_PROCESSING: '유저가 아직 감정 정리 중 → 행동 제안보다 감정 인정/정리를 먼저 하세요.',
      WANTS_VALIDATION: '유저가 확인을 원함 → "네 감정은 자연스러운 거야"라는 안심을 먼저 주세요.',
      CONSIDERING_EXIT: '유저가 관계 자체를 고민 중 → 급한 결론보다 감정 정리 + 자기가치 회복을 안내하세요.',
    };
    parts.push(`\n🎯 변화 준비도: ${u.changeReadiness}\n→ ${advice[u.changeReadiness]}`);
  }

  // 이미 시도한 것 기반 중복 방지
  if (u.previousAttempts) {
    const advice: Record<PreviousAttempt, string> = {
      SENT_MORE: '⚠️ 이미 추가 연락을 보냈음 → "더 보내지 마세요" 방향. 기다림의 전략적 가치를 설명하세요.',
      WAITED: '이미 기다리고 있음 → 기다림을 인정하고, 기한(예: 3일)을 정하는 전략을 제안하세요.',
      CHECKED_SNS: 'SNS를 확인함 → SNS 확인이 불안을 키울 수 있음을 부드럽게 알려주세요.',
      ASKED_FRIENDS: '주변에 물어봄 → 다양한 의견이 혼란을 줄 수 있음. 자신의 감정에 집중하도록 안내하세요.',
      NOTHING: '아직 아무것도 안 함 → 가볍게 시작할 수 있는 첫 행동을 제안하세요.',
    };
    parts.push(`\n📱 이전 시도: ${u.previousAttempts}\n→ ${advice[u.previousAttempts]}`);
  }

  // 상대 맥락
  if (u.partnerContext && u.partnerContext !== 'UNKNOWN') {
    const advice: Record<string, string> = {
      LIKELY_BUSY: '상대가 바쁜 것으로 추정 → 기다려도 괜찮다는 안심을 주되, 적절한 시점에 가볍게 연락하는 방법 제안.',
      LIKELY_UPSET: '싸운 후 상대가 화난 것으로 추정 → 상대의 감정이 가라앉을 시간이 필요함을 설명하세요.',
      LIKELY_DISTANCING: '상대가 의도적 거리두기 → 더 매달리면 역효과. 자기진정 + 공간 주기의 중요성을 설명하세요.',
    };
    if (advice[u.partnerContext]) {
      parts.push(`\n🧩 상대 맥락: ${u.partnerContext}\n→ ${advice[u.partnerContext]}`);
    }
  }

  // Gottman 4기수
  if (u.horsemenDetected && u.horsemenDetected.length > 0) {
    const antidotes: Record<string, string> = {
      CRITICISM: '해독제: 불만을 "나는 ~할 때 ~한 감정이 들어"(I-message)로 표현하도록 안내',
      CONTEMPT: '해독제: 감사와 존경 표현 연습. 상대의 긍정적 측면 떠올리기',
      DEFENSIVENESS: '해독제: 방어 대신 상대 말에 5%라도 맞는 부분 인정하기',
      STONEWALLING: '해독제: 자기진정(20분 휴식) 후 대화 재개. 감정 범람 관리',
    };
    const horsemenAdvice = u.horsemenDetected
      .map(h => antidotes[h] || h)
      .join('\n');
    parts.push(`\n🛡️ Gottman 감지: ${u.horsemenDetected.join(', ')}\n${horsemenAdvice}`);
  }

  parts.push(`\n⚠️ 위 진단 정보를 참고하되, 자연스럽게 녹여서 설명하세요. 기계적 나열 금지!`);

  return parts.join('\n');
}
