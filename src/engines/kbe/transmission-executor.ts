/**
 * 📡 전송 스케줄러
 *
 * KakaoActionPlan 을 받아서 시간 순서대로 chunk 들을 yield.
 *
 * 동작:
 *   1. 각 burst 전 delay_before_ms 대기
 *   2. typing 인디케이터 on/off (show_typing 이면)
 *   3. 버스트 text yield
 *   4. 스티커 (있으면) placement 에 따라 삽입
 *   5. 이벤트 (있으면) 마지막에 transition_line + event yield
 *
 * 규칙 없음 — 순수 plan 실행기.
 */

import type { KakaoActionPlan, KbeStreamChunk } from './types';

// ============================================================
// 메인 executor (제너레이터)
// ============================================================

export async function* executeKakaoAction(
  plan: KakaoActionPlan,
): AsyncGenerator<KbeStreamChunk> {
  // 1. 침묵이면 아무것도 안 보냄
  if (plan.silence) {
    yield { type: 'meta', data: plan };
    return;
  }

  // 2. 스티커가 before_bursts 면 먼저 전송
  if (plan.sticker && plan.sticker.placement === 'before_bursts') {
    if (plan.sticker.delay_ms > 0) {
      await sleep(plan.sticker.delay_ms);
    }
    yield { type: 'sticker', data: plan.sticker.sticker_id };
  }

  // 3. 스티커가 standalone 이면 스티커만 보내고 끝
  if (plan.sticker && plan.sticker.placement === 'standalone') {
    if (plan.sticker.delay_ms > 0) {
      await sleep(plan.sticker.delay_ms);
    }
    yield { type: 'sticker', data: plan.sticker.sticker_id };
    yield { type: 'meta', data: plan };
    return;
  }

  // 4. 버스트 순차 전송
  for (let i = 0; i < plan.bursts.length; i++) {
    const burst = plan.bursts[i];

    // 4-1. 지연 대기
    if (burst.delay_before_ms > 0) {
      // 긴 지연이면 타이핑 인디케이터 표시
      if (burst.show_typing && burst.delay_before_ms > 1500) {
        // 지연 일부는 "조용함", 나머지는 "타이핑 중"
        const quietMs = Math.min(burst.delay_before_ms * 0.4, 2000);
        const typingMs = burst.delay_before_ms - quietMs;

        if (quietMs > 100) {
          await sleep(quietMs);
        }

        yield { type: 'typing', data: { active: true } };
        await sleep(typingMs);
        yield { type: 'typing', data: { active: false } };
      } else {
        // 짧은 지연은 그냥 대기 (타이핑 표시 X)
        await sleep(burst.delay_before_ms);
      }
    }

    // 4-2. 텍스트 전송
    // 🆕 v78.9: 버스트 사이 `|||` 구분자 — 프론트(useChat.ts) 가 이걸로 말풍선 분리.
    //   이전: 버스트만 yield → 프론트에서 concatenate → 하나의 긴 풍선
    //   지금: 버스트 + ||| → 프론트 split 으로 카톡 스타일 복원
    if (i > 0) {
      yield { type: 'text', data: '|||' };
    }
    yield { type: 'text', data: burst.text };
  }

  // 5. 스티커가 after_bursts 면 마지막에
  if (plan.sticker && plan.sticker.placement === 'after_bursts') {
    if (plan.sticker.delay_ms > 0) {
      await sleep(plan.sticker.delay_ms);
    }
    yield { type: 'sticker', data: plan.sticker.sticker_id };
  }

  // 6. 이벤트 트리거 (있으면 transition_line 먼저, 그 다음 event)
  if (plan.event) {
    if (plan.event.delay_ms > 0) {
      await sleep(plan.event.delay_ms);
    }

    // transition_line 전송 (타이핑 포함)
    if (plan.event.transition_line) {
      yield { type: 'typing', data: { active: true } };
      await sleep(800);
      yield { type: 'typing', data: { active: false } };
      // 🆕 v78.9: transition_line 도 버스트와 분리되도록 |||
      if (plan.bursts.length > 0) {
        yield { type: 'text', data: '|||' };
      }
      yield { type: 'text', data: plan.event.transition_line };
      await sleep(500);
    }

    // 이벤트 발동
    yield { type: 'event', data: plan.event.event_type };
  }

  // 7. 메타 정보 (로깅/모니터링용, 마지막)
  yield { type: 'meta', data: plan };
}

// ============================================================
// 텍스트 전용 모드 (스트리밍 UI 가 sticker/typing/event 미지원 시)
// ============================================================

/**
 * sticker/typing/event 없이 text 만 보내는 간이 모드.
 * 하위 호환이나 디버깅용.
 */
export async function* executeKakaoActionTextOnly(
  plan: KakaoActionPlan,
): AsyncGenerator<{ type: 'text'; data: string }> {
  if (plan.silence) return;

  for (let i = 0; i < plan.bursts.length; i++) {
    const burst = plan.bursts[i];
    if (burst.delay_before_ms > 0) {
      await sleep(burst.delay_before_ms);
    }
    // 🆕 v78.9: 버스트 간 ||| (프론트 말풍선 분리)
    if (i > 0) {
      yield { type: 'text', data: '|||' };
    }
    yield { type: 'text', data: burst.text };
  }

  if (plan.event && plan.event.transition_line) {
    await sleep(plan.event.delay_ms);
    yield { type: 'text', data: plan.event.transition_line };
  }
}

// ============================================================
// 예상 총 소요 시간 (로깅/UI 용)
// ============================================================

export function estimatePlanDuration(plan: KakaoActionPlan): number {
  if (plan.silence) return 0;

  let total = 0;

  // 스티커 before
  if (plan.sticker && plan.sticker.placement === 'before_bursts') {
    total += plan.sticker.delay_ms;
  }

  // standalone 스티커
  if (plan.sticker && plan.sticker.placement === 'standalone') {
    return plan.sticker.delay_ms;
  }

  // 버스트
  for (const burst of plan.bursts) {
    total += burst.delay_before_ms;
  }

  // 스티커 after
  if (plan.sticker && plan.sticker.placement === 'after_bursts') {
    total += plan.sticker.delay_ms;
  }

  // 이벤트
  if (plan.event) {
    total += plan.event.delay_ms + (plan.event.transition_line ? 1300 : 0);
  }

  return total;
}

// ============================================================
// 헬퍼
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
