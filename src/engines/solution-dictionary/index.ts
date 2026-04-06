/**
 * 🆕 v7+v12+v13: 해결책 사전 매칭 엔진
 * 
 * 전 시나리오: 시나리오별 특화축 + 범용 10축 기반 정밀 매칭
 * 읽씹: 5축 진단 + 범용 6축 기반 정밀 매칭
 * 나머지 6개 시나리오: 확장 솔루션 파일 × 특화축 × 범용축
 */

import { RelationshipScenario, AttachmentType } from '@/types/engine.types';
import type { SolutionEntry, SolutionMatch } from './types';
import { SOLUTION_DICTIONARY } from './dictionary-data';
import { READ_IGNORED_SOLUTIONS, type ReadIgnoredSolutionEntry } from './read-ignored-solutions';
import { GHOSTING_SOLUTIONS, type GhostingSolutionEntry } from './ghosting-solutions';
import { JEALOUSY_SOLUTIONS, type JealousySolutionEntry } from './jealousy-solutions';
import { INFIDELITY_SOLUTIONS, type InfidelitySolutionEntry } from './infidelity-solutions';
import { BREAKUP_SOLUTIONS, type BreakupSolutionEntry } from './breakup-solutions';
import { BOREDOM_SOLUTIONS, type BoredomSolutionEntry } from './boredom-solutions';
import { LONG_DISTANCE_SOLUTIONS, type LongDistanceSolutionEntry } from './long-distance-solutions';
import { GENERAL_SOLUTIONS, type GeneralSolutionEntry } from './general-solutions';
import type { AxesCollectionState, ReadIgnoredAxes } from './read-ignored-axes';
import type { DiagnosisResult, ScenarioAxes } from '@/engines/relationship-diagnosis/types';

export { calculateReadiness } from './readiness';
export type { SolutionMatch, SolutionEntry, ReadinessContext } from './types';
export type { ReadIgnoredAxes, AxesCollectionState, AxisChoice } from './read-ignored-axes';
export {
  parseAxesFromMessage,
  analyzeAxesState,
  generateDiagnosticPrompt,
  mergeLLMAxes,
  markAxisAsked,
  generateAxisChoices,
  setAxisFromChoice,
} from './read-ignored-axes';

/**
 * 해결책 사전에서 최적 매칭 찾기
 * 
 * @returns 매칭된 해결책 (최대 3개, matchScore 내림차순)
 */
export function matchSolutions(
  scenario: RelationshipScenario,
  userMessage: string,
  attachmentStyle: AttachmentType | null,
  emotionScore: number,
  diagnosticAxes?: Partial<ReadIgnoredAxes> | null,
  diagnosisResult?: DiagnosisResult | null,
): SolutionMatch[] {
  // 읽씹 시나리오 → 5축 + 범용 6축 기반 정밀 매칭 (기존 로직 유지)
  if (scenario === RelationshipScenario.READ_AND_IGNORED) {
    return matchReadIgnoredSolutions(
      userMessage, attachmentStyle, emotionScore, diagnosticAxes, diagnosisResult,
    );
  }

  // 🆕 v13: 확장 솔루션이 있는 시나리오 → 축 기반 정밀 매칭
  const extendedResult = matchExtendedSolutions(
    scenario, userMessage, attachmentStyle, emotionScore, diagnosisResult,
  );
  if (extendedResult.length > 0) return extendedResult;

  // 폴백: 기존 키워드 기반 매칭 (dictionary-data.ts)
  return matchGeneralSolutions(scenario, userMessage, attachmentStyle, emotionScore);
}

/**
 * 🆕 v13: 확장 솔루션 범용 매칭 함수
 *
 * 시나리오별 확장 파일(15개씩)의 특화축 + universalCondition + 키워드 + 감정 + 애착
 * → 정밀 스코어링으로 최적 해결책 매칭
 */
type ExtendedEntry = SolutionEntry & {
  axisCondition: Record<string, any>;
  minAxisMatch: number;
  universalCondition?: Record<string, any>;
};

function matchExtendedSolutions(
  scenario: RelationshipScenario,
  userMessage: string,
  attachmentStyle: AttachmentType | null,
  emotionScore: number,
  diagnosisResult?: DiagnosisResult | null,
): SolutionMatch[] {
  // 시나리오별 확장 솔루션 + 특화축 키 매핑
  const scenarioMap: Record<string, { solutions: ExtendedEntry[]; axisKeys: string[] }> = {
    [RelationshipScenario.GHOSTING]: {
      solutions: GHOSTING_SOLUTIONS as ExtendedEntry[],
      axisKeys: ['ghostType'],
    },
    [RelationshipScenario.JEALOUSY]: {
      solutions: JEALOUSY_SOLUTIONS as ExtendedEntry[],
      axisKeys: ['jealousyType'],
    },
    [RelationshipScenario.INFIDELITY]: {
      solutions: INFIDELITY_SOLUTIONS as ExtendedEntry[],
      axisKeys: ['infidelityRole'],
    },
    [RelationshipScenario.BREAKUP_CONTEMPLATION]: {
      solutions: BREAKUP_SOLUTIONS as ExtendedEntry[],
      axisKeys: ['breakupAmbivalence'],
    },
    [RelationshipScenario.BOREDOM]: {
      solutions: BOREDOM_SOLUTIONS as ExtendedEntry[],
      axisKeys: ['boredomType'],
    },
    [RelationshipScenario.LONG_DISTANCE]: {
      solutions: LONG_DISTANCE_SOLUTIONS as ExtendedEntry[],
      axisKeys: ['ldrEndpoint'],
    },
    [RelationshipScenario.GENERAL]: {
      solutions: GENERAL_SOLUTIONS as ExtendedEntry[],
      axisKeys: ['generalConcernType'],
    },
  };

  const config = scenarioMap[scenario];
  if (!config || config.solutions.length === 0) return [];

  const msgLower = userMessage.toLowerCase();
  const sAxes = diagnosisResult?.scenario || {};
  const uAxes = diagnosisResult?.universal;

  const scored: SolutionMatch[] = config.solutions.map(entry => {
    let score = 0.2; // 시나리오 기본점수
    const reasons: string[] = [`시나리오:${scenario}`];

    // ── 특화축 매칭 ──
    let axisHits = 0;
    for (const axisKey of config.axisKeys) {
      const condValues = entry.axisCondition?.[axisKey];
      const userValue = (sAxes as any)?.[axisKey];
      if (condValues && userValue && condValues.includes(userValue)) {
        axisHits++;
        reasons.push(`${axisKey}:${userValue}`);
      }
    }
    score += axisHits * 0.2;

    // 최소 축 일치 미달 시 감점
    if (axisHits < entry.minAxisMatch) {
      score -= 0.05;
    }

    // ── 범용 축 매칭(universalCondition) ──
    if (uAxes && entry.universalCondition) {
      const uc = entry.universalCondition;
      if (uc.conflictStyle && uAxes.conflictStyle && uc.conflictStyle.includes(uAxes.conflictStyle)) {
        score += 0.12; reasons.push(`갈등스타일:${uAxes.conflictStyle}`);
      }
      if (uc.changeReadiness && uAxes.changeReadiness && uc.changeReadiness.includes(uAxes.changeReadiness)) {
        score += 0.12; reasons.push(`변화준비:${uAxes.changeReadiness}`);
      }
      if (uc.partnerContext && uAxes.partnerContext && uc.partnerContext.includes(uAxes.partnerContext)) {
        score += 0.08; reasons.push(`상대맥락:${uAxes.partnerContext}`);
      }
      if (uc.previousAttempts && uAxes.previousAttempts && uc.previousAttempts.includes(uAxes.previousAttempts)) {
        score += 0.08; reasons.push(`이전시도:${uAxes.previousAttempts}`);
      }
      if (uc.stage && uAxes.stage && uc.stage.includes(uAxes.stage)) {
        score += 0.08; reasons.push(`관계단계:${uAxes.stage}`);
      }
      if (uc.pattern && uAxes.pattern && uc.pattern.includes(uAxes.pattern)) {
        score += 0.08; reasons.push(`빈도:${uAxes.pattern}`);
      }
      if (uc.attachmentClue && uAxes.attachmentClue && uc.attachmentClue.includes(uAxes.attachmentClue)) {
        score += 0.1; reasons.push(`애착단서:${uAxes.attachmentClue}`);
      }
      if (uc.duration && uAxes.duration && uc.duration.includes(uAxes.duration)) {
        score += 0.08; reasons.push(`기간:${uAxes.duration}`);
      }
    }

    // ── 키워드 매칭 (0 ~ 0.2) ──
    const keywordHits = entry.trigger.keywords.filter(kw => msgLower.includes(kw));
    if (keywordHits.length > 0) {
      score += Math.min(keywordHits.length * 0.05, 0.2);
      reasons.push(`키워드:${keywordHits.join(',')}`);
    }

    // ── 감정 범위 매칭 (+0.15) ──
    if (entry.trigger.emotionRange) {
      const [min, max] = entry.trigger.emotionRange;
      if (emotionScore >= min && emotionScore <= max) {
        score += 0.15;
        reasons.push('감정범위적합');
      }
    }

    // ── 감정 구간(emotionTier) 매칭 (+0.1) ──
    if (entry.solution.emotionTier) {
      const tier = emotionScore <= -3 ? 'crisis' : emotionScore <= 0 ? 'confused' : 'stable';
      if (entry.solution.emotionTier === tier) {
        score += 0.1;
        reasons.push(`감정구간:${tier}`);
      }
    }

    // ── 애착 유형 매칭 (+0.1) ──
    if (entry.trigger.attachmentStyles && attachmentStyle) {
      if (entry.trigger.attachmentStyles.includes(attachmentStyle)) {
        score += 0.1;
        reasons.push(`애착:${attachmentStyle}`);
      }
    }

    // priority 보정
    score += (6 - entry.priority) * 0.02;

    return {
      entry: entry as SolutionEntry,
      matchScore: Math.min(score, 1),
      reason: reasons.join(' + '),
    };
  });

  // 축 정보 유무에 따라 최소 점수 조정
  const hasScenarioAxes = config.axisKeys.some(k => (sAxes as any)?.[k]);
  const minScore = hasScenarioAxes ? 0.3 : 0.2;

  return scored
    .filter(s => s.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

/**
 * 일반 시나리오 매칭 (기존 로직 — 폴백)
 */
function matchGeneralSolutions(
  scenario: RelationshipScenario,
  userMessage: string,
  attachmentStyle: AttachmentType | null,
  emotionScore: number,
): SolutionMatch[] {
  // 1. 시나리오 필터
  const candidates = SOLUTION_DICTIONARY.filter(e => e.scenario === scenario);
  if (candidates.length === 0) return [];

  const msgLower = userMessage.toLowerCase();

  // 2. 각 후보의 매칭 점수 계산
  const scored: SolutionMatch[] = candidates.map(entry => {
    let score = 0.3; // 시나리오 일치 기본 점수
    const reasons: string[] = [`시나리오:${scenario}`];

    // 키워드 매칭 (0 ~ 0.3)
    const keywordHits = entry.trigger.keywords.filter(kw => msgLower.includes(kw));
    if (keywordHits.length > 0) {
      score += Math.min(keywordHits.length * 0.1, 0.3);
      reasons.push(`키워드:${keywordHits.join(',')}`);
    }

    // 감정 범위 매칭 (+0.1)
    if (entry.trigger.emotionRange) {
      const [min, max] = entry.trigger.emotionRange;
      if (emotionScore >= min && emotionScore <= max) {
        score += 0.1;
        reasons.push(`감정범위적합`);
      }
    }

    // 애착 유형 매칭 (+0.15)
    if (entry.trigger.attachmentStyles && attachmentStyle) {
      if (entry.trigger.attachmentStyles.includes(attachmentStyle)) {
        score += 0.15;
        reasons.push(`애착:${attachmentStyle}`);
      }
    }

    // priority 보정 (우선순위 높을수록 약간 가산)
    score += (6 - entry.priority) * 0.02;

    return {
      entry,
      matchScore: Math.min(score, 1),
      reason: reasons.join(' + '),
    };
  });

  // 3. 점수 순 정렬 → 상위 3개
  return scored
    .filter(s => s.matchScore >= 0.3)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

/**
 * 🆕 읽씹 전용 5축 기반 정밀 매칭
 * 
 * 축 일치 + 키워드 + 감정 + 애착 → 정밀 해결책 매칭
 */
function matchReadIgnoredSolutions(
  userMessage: string,
  attachmentStyle: AttachmentType | null,
  emotionScore: number,
  diagnosticAxes?: Partial<ReadIgnoredAxes> | null,
  diagnosisResult?: DiagnosisResult | null,
): SolutionMatch[] {
  const msgLower = userMessage.toLowerCase();
  const axes = diagnosticAxes || {};
  const uAxes = diagnosisResult?.universal;

  const scored: SolutionMatch[] = READ_IGNORED_SOLUTIONS.map(entry => {
    let score = 0.2; // 읽씹 시나리오 기본점수
    const reasons: string[] = ['읽씹'];

    // ── 축 매칭 점수 (핵심) ──
    let axisHits = 0;
    const cond = entry.axisCondition;

    if (cond.duration && axes.duration && cond.duration.includes(axes.duration)) {
      axisHits++;
      reasons.push(`기간:${axes.duration}`);
    }
    if (cond.stage && axes.stage && cond.stage.includes(axes.stage)) {
      axisHits++;
      reasons.push(`관계단계:${axes.stage}`);
    }
    if (cond.readType && axes.readType && cond.readType.includes(axes.readType)) {
      axisHits++;
      reasons.push(`유형:${axes.readType}`);
    }
    if (cond.pattern && axes.pattern && cond.pattern.includes(axes.pattern)) {
      axisHits++;
      reasons.push(`패턴:${axes.pattern}`);
    }
    if (cond.attachmentClue && axes.attachmentClue && cond.attachmentClue.includes(axes.attachmentClue)) {
      axisHits++;
      reasons.push(`애착단서:${axes.attachmentClue}`);
    }

    // 축 매칭 보너스 (최대 +0.5)
    score += axisHits * 0.15;

    // 최소 축 일치 미달 시 감점
    if (axisHits < entry.minAxisMatch) {
      score -= 0.1;
    }

    // ── 키워드 매칭 (기존 + 0~0.2) ──
    const keywordHits = entry.trigger.keywords.filter(kw => msgLower.includes(kw));
    if (keywordHits.length > 0) {
      score += Math.min(keywordHits.length * 0.05, 0.2);
      reasons.push(`키워드:${keywordHits.join(',')}`);
    }

    // ── 감정 범위 매칭 (+0.2, 강화) ──
    if (entry.trigger.emotionRange) {
      const [min, max] = entry.trigger.emotionRange;
      if (emotionScore >= min && emotionScore <= max) {
        score += 0.2;
        reasons.push('감정범위적합');
      }
    }

    // 🆕 v11: 감정 구간(emotionTier) 매칭 (+0.15)
    if (entry.solution.emotionTier) {
      const tier = emotionScore <= -3 ? 'crisis' : emotionScore <= 0 ? 'confused' : 'stable';
      if (entry.solution.emotionTier === tier) {
        score += 0.15;
        reasons.push(`감정구간:${tier}`);
      }
    }

    // ── 애착 유형 매칭 (+0.1) ──
    if (entry.trigger.attachmentStyles && attachmentStyle) {
      if (entry.trigger.attachmentStyles.includes(attachmentStyle)) {
        score += 0.1;
        reasons.push(`애착:${attachmentStyle}`);
      }
    }

    // 🆕 v12: 범용 축 매칭 가중치
    if (uAxes && entry.universalCondition) {
      const uc = entry.universalCondition;
      if (uc.conflictStyle && uAxes.conflictStyle && uc.conflictStyle.includes(uAxes.conflictStyle)) {
        score += 0.15;
        reasons.push(`갈등스타일:${uAxes.conflictStyle}`);
      }
      if (uc.changeReadiness && uAxes.changeReadiness && uc.changeReadiness.includes(uAxes.changeReadiness)) {
        score += 0.15;
        reasons.push(`변화준비:${uAxes.changeReadiness}`);
      }
      if (uc.partnerContext && uAxes.partnerContext && uc.partnerContext.includes(uAxes.partnerContext)) {
        score += 0.1;
        reasons.push(`상대맥락:${uAxes.partnerContext}`);
      }
      if (uc.previousAttempts && uAxes.previousAttempts && uc.previousAttempts.includes(uAxes.previousAttempts)) {
        score += 0.1;
        reasons.push(`이전시도:${uAxes.previousAttempts}`);
      }
      if (uc.horsemen && uAxes.horsemenDetected) {
        const horsemenMatch = uAxes.horsemenDetected.some(h => uc.horsemen!.includes(h));
        if (horsemenMatch) {
          score += 0.15;
          reasons.push(`4기수:${uAxes.horsemenDetected.join(',')}`);
        }
      }
    }

    // priority 보정
    score += (6 - entry.priority) * 0.02;

    return {
      entry: entry as SolutionEntry,
      matchScore: Math.min(score, 1),
      reason: reasons.join(' + '),
    };
  });

  // 축 정보 없으면 키워드만으로도 매칭 (최소 0.2)
  const hasAxes = Object.values(axes).some(v => v !== null && v !== undefined);
  const minScore = hasAxes ? 0.3 : 0.2;

  return scored
    .filter(s => s.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

/**
 * 🆕 v10: Phase별 맞춤 솔루션 프롬프트
 * 
 * EXPLORATION → 패턴 힌트만 (해결책 직접 제시 금지)
 * COMFORTING → 프레임워크 권위 설명 (인사이트 수준)
 * ACTION → 전체 해결책 (3줄 공식)
 */
export function getSolutionDictionaryPrompt(
  matches: SolutionMatch[],
  phase: 'EXPLORATION' | 'COMFORTING' | 'ACTION',
  persona: 'counselor' | 'friend' | 'panel',
  diagnosisResult?: { universal: any; diagnosisQuality: string; keyFindings: { label: string }[] } | null,
): string {
  if (matches.length === 0 || persona === 'panel') return '';

  const best = matches[0];
  const s = best.entry.solution;
  const tone = persona === 'friend'
    ? best.entry.persona.friend
    : best.entry.persona.counselor;

  // Phase별 프롬프트 분기
  if (phase === 'EXPLORATION') {
    // MIRROR 구간: 패턴 힌트만  
    return `\n## 📊 패턴 참고 (내부 분석용 — 직접 언급 금지!)
이 사용자의 상황은 "${s.framework}" 프레임워크의 "${s.technique}" 패턴과 관련이 있을 수 있습니다.
하지만 지금은 탐색 단계입니다. 해결책을 직접 제시하지 마세요.
대신 사용자의 이야기를 반영하고 패턴을 자연스럽게 탐색하세요.
힌트: ${s.steps.insight}
⚠️ 이 정보는 내부 참고용. 사용자에게 프레임워크명이나 해결책을 직접 말하지 마세요.`;
  }

  if (phase === 'COMFORTING') {
    // BRIDGE 구간: 프레임워크 권위 설명
    return `\n## 🌉 전문 인사이트 가이드 (${s.framework})
이 사용자의 상황에 관련된 전문 연구가 있습니다:
- 프레임워크: ${s.framework}
- 기법: ${s.technique}
- 핵심 인사이트: ${s.steps.insight}

사용자에게 프레임워크 이름을 자연스럽게 언급하며 전문성을 보여주세요.
예: "가트맨 연구에 의하면..." / "EFT(감정중심치료)에서는..."
하지만 구체적 행동 지시는 아직 하지 마세요. 인사이트 수준까지만.
톤: ${tone}`;
  }

  // ACTION 단계: 전체 해결책 (5단계 확장형)
  let prompt = `\n## 🎯 해결책 가이드 (${s.framework} — ${s.technique})

이 사용자의 상황에 대해 검증된 해결책이 있습니다. 아래 5단계 구조로 충분히 설명하세요:

1️⃣ 공감과 인정 (2~3줄): 감정을 구체적으로 반영하세요.
${s.steps.validation}

2️⃣ 전문적 인사이트 (3~4줄): 연구 근거를 포함한 설명.
${s.steps.insight}`;

  // 전문가 인용 추가
  if (s.expertQuote) {
    prompt += `\n💬 전문가: ${s.expertQuote}`;
  }

  prompt += `\n\n3️⃣ 구체적 행동 가이드 (3~5줄): 단계별 실천 방법.
${s.steps.action}`;

  // 연구 근거 노트
  if (s.researchNote) {
    prompt += `\n\n4️⃣ 전문가 한마디 (1~2줄): 이 정보를 자연스럽게 응답에 녹여주세요.
📚 ${s.researchNote}`;
  }

  // 과학적 원리
  if (s.scientificBasis) {
    prompt += `\n🧪 과학적 배경: ${s.scientificBasis}`;
  }

  // 한국 콘텍스트
  if (s.koreanContext) {
    prompt += `\n🇰🇷 한국 맥락: ${s.koreanContext}`;
  }

  // 카톡 초안 (기존)
  if (s.messageDrafts && s.messageDrafts.length > 0) {
    prompt += `\n\n5️⃣ 카톡 초안 제안:\n${s.messageDrafts.map(d => `   - "${d}"`).join('\n')}`;
  }

  // 확장 초안 (formal/casual/minimal)
  if (s.additionalDrafts) {
    prompt += `\n   📝 정중한 버전: "${s.additionalDrafts.formal}"
   💬 캐주얼 버전: "${s.additionalDrafts.casual}"
   ✏️ 최소한 버전: "${s.additionalDrafts.minimal}"`;
  }

  if (s.iMessageTemplate) {
    prompt += `\n💬 I-message 템플릿: ${s.iMessageTemplate}`;
  }

  prompt += `\n\n톤 지시: ${tone}`;
  prompt += `\n⚠️ 위 가이드를 참고하되, 사용자의 구체적 상황에 맞게 자연스럽게 변형하세요. 기계적 복사 금지!`;
  prompt += `\n⚠️ 반드시 전문적 근거를 자연스럽게 녹여서 전문성이 느껴지게 하세요. (예: "~연구에 따르면", "~박사는 이런 상황에서...")` ;

  // 🆕 v12: 진단 결과 기반 맞춤 조언 방향 주입
  if (diagnosisResult && diagnosisResult.diagnosisQuality !== 'insufficient') {
    const { generateDiagnosisPrompt: genDiagPrompt } = require('@/engines/relationship-diagnosis/diagnosis-prompts');
    const diagPrompt = genDiagPrompt(diagnosisResult);
    if (diagPrompt) {
      prompt += diagPrompt;
    }
  }

  return prompt;
}
