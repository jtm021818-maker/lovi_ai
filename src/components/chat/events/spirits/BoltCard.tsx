'use client';

/**
 * ⚡ v104: BoltCard — lightning_bird 메타 (다른 정령 카드 픽 래퍼)
 *
 * 0.8초 핏치 입장 토스트 → children(부모가 inner picked 카드를 재귀 렌더)
 *
 * ChatContainer 라우팅 패턴:
 *   case 'SPIRIT_BOLT_CARD': {
 *     const d = event.data as BoltCardData;
 *     const inner = { type: d.pickedEventType, phase: event.phase, data: d.pickedEventData };
 *     return <BoltCard event={event}>{renderSpiritEvent(inner)}</BoltCard>;
 *   }
 */

import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent } from '@/types/engine.types';
import type { BoltCardData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  children: ReactNode;
}

export default function BoltCard({ event, children }: Props) {
  const data = event.data as unknown as BoltCardData;
  const [showInner, setShowInner] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowInner(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative">
      <AnimatePresence>
        {!showInner && (
          <motion.div
            key="entrance"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28 }}
            className="mx-4 my-3 px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100 border border-yellow-300 shadow-sm flex items-center gap-2"
          >
            <motion.span
              animate={{ rotate: [-15, 15, -15] }}
              transition={{ duration: 0.4, repeat: 1 }}
              className="text-2xl"
              aria-hidden
            >
              ⚡
            </motion.span>
            <span className="text-sm font-semibold text-amber-800">
              {data.openerMsg ?? '핏치 등장!'}
            </span>
            <span className="ml-auto text-[10px] text-amber-600/80">⚡ 핏치 보너스</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 0.8초 후 inner 카드 등장 (부모가 재귀 렌더) */}
      <AnimatePresence>
        {showInner && (
          <motion.div
            key="inner"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
