/**
 * 🎬 v79: Bubble FX 훅
 *
 * MessageBubble 에서 사용. 특정 메시지에 해당하는 effectBus 이벤트 받으면
 * CSS 클래스 일시 추가 → 애니 발동 → 자동 제거.
 */

import { useEffect, useState } from 'react';
import { effectBus, isFxEnabled } from './effect-bus';
import { getFxDefinition } from './fx-catalog';

export interface BubbleFxState {
  classes: string[];
}

/**
 * 메시지별 bubble fx 구독.
 * 메시지 ID 매칭 OR 메시지 ID 없는 글로벌 bubble fx (마지막 메시지 대상) 을 받음.
 * @param messageId 현재 메시지 ID
 * @param isLast 마지막 AI 메시지인가 (글로벌 bubble fx 매칭용)
 */
export function useBubbleFx(messageId: string, isLast: boolean): BubbleFxState {
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    const unsub = effectBus.subscribe((fx) => {
      if (!isFxEnabled()) return;
      if (fx.target !== 'bubble') return;
      // 메시지 ID 매칭 OR (ID 없고 마지막 메시지)
      const matches = fx.messageId === messageId || (!fx.messageId && isLast);
      if (!matches) return;

      const def = getFxDefinition(fx.id);
      if (!def) return;

      const cssClass = idToClass(fx.id);
      setClasses((prev) => prev.includes(cssClass) ? prev : [...prev, cssClass]);

      const duration = fx.duration ?? def.duration;
      window.setTimeout(() => {
        setClasses((prev) => prev.filter((c) => c !== cssClass));
      }, duration);
    });
    return unsub;
  }, [messageId, isLast]);

  return { classes };
}

function idToClass(id: string): string {
  // 'bubble.wobble' → 'fx-bubble-wobble'
  return `fx-${id.replace(/\./g, '-')}`;
}
