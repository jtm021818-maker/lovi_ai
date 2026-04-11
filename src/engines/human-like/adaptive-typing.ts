/**
 * 🆕 v28: Adaptive Typing — 감정/상황별 타이핑 속도 변형
 *
 * 루나의 감정에 따라 타이핑 속도가 변함:
 * - 화남/신남 → 빠르게 (짧은 딜레이)
 * - 슬픔/차분 → 천천히 (긴 딜레이)
 * - 말풍선 간 간격도 동적
 *
 * API 호출: 0 (클라이언트 사이드)
 */

import type { LunaEmotion } from './luna-emotion-core';

// ============================================
// 타이핑 속도 계산
// ============================================

const BASE_WPM = 110; // 기본 타이핑 속도 (110 WPM)
const CHARS_PER_MS = (BASE_WPM * 5) / 60000;

// 감정별 속도 배율 (1.0 = 기본)
const EMOTION_SPEED: Record<LunaEmotion, number> = {
  angry: 1.5,      // 화남 → 빠르게
  excited: 1.4,    // 신남 → 빠르게
  anxious: 1.2,    // 불안 → 약간 빠르게
  happy: 1.1,      // 기쁨 → 약간 빠르게
  calm: 1.0,       // 기본
  affection: 0.9,  // 다정 → 약간 느리게
  worried: 0.85,   // 걱정 → 느리게
  sad: 0.7,        // 슬픔 → 천천히
  bored: 0.8,      // 지루 → 느리게
};

/**
 * 메시지 하나의 타이핑 딜레이 계산
 *
 * @param message 보낼 메시지
 * @param lunaEmotion 루나의 현재 감정
 * @param incomingLength 유저 메시지 길이 (읽기 시간 반영)
 * @returns 밀리초 단위 딜레이
 */
export function calcTypingDelay(
  message: string,
  lunaEmotion: LunaEmotion = 'calm',
  incomingLength: number = 30,
): number {
  const speed = EMOTION_SPEED[lunaEmotion] ?? 1.0;

  // 타이핑 시간 (감정 속도 반영)
  const typingTime = message.length / (CHARS_PER_MS * speed);

  // 읽기 시간 (유저 메시지가 길면 더 오래 읽음)
  const readTime = Math.min(800, incomingLength * 6);

  // 지터 추가 (완벽한 타이밍 = 로봇)
  const jitter = (Math.random() - 0.5) * typingTime * 0.25;

  // 최소 500ms, 최대 3500ms
  return Math.min(Math.max(typingTime + readTime + jitter, 500), 3500);
}

// ============================================
// 말풍선 간 딜레이 계산
// ============================================

/**
 * 여러 말풍선(|||) 사이의 딜레이 계산
 *
 * 패턴:
 * - 첫→둘: 짧은 딜레이 (연속 타이핑 느낌)
 * - 둘→셋: 좀 더 긴 딜레이 (생각 후 추가)
 * - 감정 전환 시: 긴 딜레이 (멈칫)
 */
export function calcBubbleGapDelay(
  bubbleIndex: number,  // 0-based (첫 말풍선 = 0)
  lunaEmotion: LunaEmotion = 'calm',
  hasSelfCorrection: boolean = false,
): number {
  // 기본 간격
  let baseGap: number;
  if (bubbleIndex === 0) {
    baseGap = 0; // 첫 말풍선은 즉시
  } else if (bubbleIndex === 1) {
    baseGap = 350; // 첫→둘: 빠르게
  } else {
    baseGap = 600; // 둘→셋: 약간 느리게
  }

  // 자기 수정 패턴 ("아 아니 그게 아니라...") 앞에는 더 긴 멈춤
  if (hasSelfCorrection && bubbleIndex >= 1) {
    baseGap += 400;
  }

  // 감정별 조정
  if (lunaEmotion === 'excited' || lunaEmotion === 'angry') {
    baseGap *= 0.6; // 흥분/화남 → 빠르게 연타
  }
  if (lunaEmotion === 'sad') {
    baseGap *= 1.5; // 슬픔 → 천천히
  }

  // 지터
  const jitter = (Math.random() - 0.5) * baseGap * 0.3;

  return Math.max(200, Math.round(baseGap + jitter));
}

// ============================================
// 타이핑 스케줄 생성 (useChat에서 사용)
// ============================================

export interface TypingSchedule {
  bubbles: string[];
  delays: number[];      // 각 말풍선 표시 전 딜레이 (ms)
  totalDuration: number; // 전체 소요 시간 (ms)
}

/**
 * 응답 텍스트 + 감정 → 타이핑 스케줄 생성
 */
export function createTypingSchedule(
  response: string,
  lunaEmotion: LunaEmotion,
  userMsgLength: number,
  hasSelfCorrection: boolean = false,
): TypingSchedule {
  const bubbles = response.split('|||').map(b => b.trim()).filter(b => b);
  const delays: number[] = [];

  for (let i = 0; i < bubbles.length; i++) {
    const typingDelay = i === 0
      ? calcTypingDelay(bubbles[i], lunaEmotion, userMsgLength)
      : calcTypingDelay(bubbles[i], lunaEmotion, 0);
    const gapDelay = calcBubbleGapDelay(i, lunaEmotion, hasSelfCorrection);

    delays.push(typingDelay + gapDelay);
  }

  return {
    bubbles,
    delays,
    totalDuration: delays.reduce((sum, d) => sum + d, 0),
  };
}
