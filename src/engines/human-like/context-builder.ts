/**
 * 🆕 ACE Layer 2: 대화의 맥락 (Context Layer)
 *
 * 코드가 하는 유일한 역할: AI가 판단하기 위한 재료를 모은다.
 * 판단 자체는 하지 않는다.
 *
 * "지금 상황이 이런데, 루나라면 어떻게 할까?"만 전달한다.
 * "지금 이렇게 해"라고 지시하지 않는다.
 */

import type { LunaEmotionState } from './luna-emotion-core';
import type { UserPattern } from './luna-growth';

// ============================================
// 세션 맥락 인터페이스
// ============================================

export interface SessionContext {
  // === 유저의 지금 이 순간 ===
  userMessage: string;
  userEmotionHint: string;           // 감정 분석 결과 (참고용, 판단 아님)
  emotionScore: number;              // 감정 점수 (raw)

  // === 루나의 지금 상태 ===
  lunaEmotion: LunaEmotionState;
  lunaRecentActions: string[];       // 지금까지 루나가 한 것 요약

  // === 대화 흐름 ===
  turnInSession: number;
  recentExchange: string;            // 최근 2-3턴 요약
  sessionSummary: string;            // 이 세션 전체 흐름

  // === 유저와의 관계 ===
  relationshipSummary: string;       // "n번째 만남, 꽤 편해진 사이"
  intimacyScore: number;

  // === 기억 ===
  relevantMemories: string;          // 관련된 과거 기억
  workingMemoryPrompt: string;       // 세션 시작 시 로드된 기억

  // === 감정 여정 ===
  journeyPhase: string;              // "아직 듣는 단계" / "핵심 감정 파악 됨"

  // === 유저 이해 ===
  userModelSummary: string;          // 유저 성격/패턴 요약
  userPatterns: UserPattern[];       // 반복 패턴 (있으면)

  // === 세션 스토리 ===
  storyPrompt: string;               // 이 대화의 서사

  // === 관계 정보 ===
  relationshipsPrompt: string;       // 유저 주변 인물 관계도
  sharedLanguagePrompt: string;      // 유저와 루나만의 언어

  // === 메모리 트리거 ===
  triggeredMemory: string | null;    // 트리거된 기억 injection
}

// ============================================
// 맥락 프롬프트 빌더
// ============================================

/**
 * 수집된 맥락을 하나의 프롬프트로 조합.
 * 판단이나 지시는 포함하지 않는다 — 순수 정보만.
 */
export function buildContextPrompt(ctx: SessionContext): string {
  const parts: string[] = [];

  // 1. Working Memory (세션 시작 시 — 유저에 대해 기억된 것)
  if (ctx.workingMemoryPrompt) {
    parts.push(ctx.workingMemoryPrompt);
  }

  // 2. 트리거된 기억 ("아 맞다 전에도...")
  if (ctx.triggeredMemory) {
    parts.push(ctx.triggeredMemory);
  }

  // 3. 🆕 ACE v4: 루나 감정 — 더 풍부한 서사적 표현
  const emo = ctx.lunaEmotion;
  if (emo.currentIntensity > 0.2) {
    const LABELS: Record<string, string> = {
      angry: '화남', sad: '슬픔', happy: '기분 좋음',
      anxious: '걱정됨', affection: '따뜻함', worried: '걱정됨',
      excited: '신남', calm: '차분', bored: '평온',
    };
    const label = LABELS[emo.currentEmotion] ?? '차분';
    const intensity = Math.round(emo.currentIntensity * 100);
    if (intensity > 50) {
      parts.push(`[루나의 내면]\n지금 기분: ${label} (${intensity}%) — 유저 상태에 꽤 영향받는 중`);
    } else {
      parts.push(`[루나 지금 기분: ${label}]`);
    }
  }

  // 4. 유저의 지금 이 순간
  if (ctx.userEmotionHint && ctx.userEmotionHint !== 'neutral') {
    parts.push(`[유저 감정 (추정): ${ctx.userEmotionHint}]`);
  }

  // 5. 대화 흐름 — 이 대화가 어디까지 왔는지
  if (ctx.storyPrompt) {
    parts.push(ctx.storyPrompt);
  }

  // 6. 유저 모델 — 이 유저는 이런 사람이야
  if (ctx.userModelSummary) {
    parts.push(ctx.userModelSummary);
  }

  // 7. 감정 여정 — 지금 어디쯤인지 (힌트, 지시 아님)
  if (ctx.journeyPhase) {
    parts.push(`[대화 흐름 참고: ${ctx.journeyPhase}]`);
  }

  // 8. 루나가 직전까지 한 것 — 반복 방지 참고
  if (ctx.lunaRecentActions.length > 0) {
    const recent = ctx.lunaRecentActions.slice(-3).join(', ');
    parts.push(`[루나가 최근 한 것: ${recent}]`);
  }

  // 9. 유저 반복 패턴 (감지되었으면 — 판단은 루나가)
  if (ctx.userPatterns.length > 0) {
    const patternHints = ctx.userPatterns
      .filter(p => p.confidence > 0.5)
      .map(p => p.description)
      .join('; ');
    if (patternHints) {
      parts.push(`[참고: 유저 패턴이 보여 — ${patternHints}]`);
    }
  }

  // 10. 관계 그래프 — 유저 주변 인물들
  if (ctx.relationshipsPrompt) {
    parts.push(ctx.relationshipsPrompt);
  }

  // 11. 우리만의 언어 — 루나와 유저 사이에 생긴 공유어
  if (ctx.sharedLanguagePrompt) {
    parts.push(ctx.sharedLanguagePrompt);
  }

  // 12. 친밀도 맥락 — 얼마나 편한 사이인지
  if (ctx.intimacyScore > 50) {
    parts.push(`[유저와의 친밀도: 꽤 편한 사이 (${ctx.intimacyScore}점)]`);
  } else if (ctx.intimacyScore > 25) {
    parts.push(`[유저와의 친밀도: 조금씩 편해지는 중]`);
  }

  // 13. 세션 내 위치
  if (ctx.turnInSession <= 2) {
    parts.push(`[세션 초반 — ${ctx.turnInSession}번째 대화]`);
  }

  return parts.filter(Boolean).join('\n');
}
