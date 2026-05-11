'use client';

/**
 * 🧚 v104.2: SpiritEventWithCutIn — 컷인 + 카드 wrapper
 *
 * 모든 SPIRIT_* 이벤트 렌더 시 한 번 감싸면 컷인 자동 등장.
 * ChatContainer.renderPhaseEvent 에서 각 case 마다 사용.
 *
 * 흐름:
 *   1) 마운트 → SpiritCutIn 열림 (등급별 600/1000/1600/2400 ms)
 *   2) 컷인 종료 → 자식 카드 페이드인
 *   3) 카드는 그 후 평소대로 동작
 */

import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { SpiritCutIn } from './SpiritCutIn';
import type { SpiritId } from '@/types/spirit.types';

interface Props {
  spiritId: SpiritId;
  children: ReactNode;
  /** UR 전용 부제 (예: queen_elena "너의 왕관") */
  subtitle?: string;
  /** 이미 본 컷인 횟수 — 3회 이상이면 컷인 스킵 (피로 방지) */
  seenCount?: number;
}

export function SpiritEventWithCutIn({ spiritId, children, subtitle, seenCount = 0 }: Props) {
  // 3회 이상 본 컷인은 즉시 카드 렌더
  const [cutinDone, setCutinDone] = useState(seenCount >= 3);

  return (
    <>
      <SpiritCutIn
        spiritId={spiritId}
        open={!cutinDone}
        onDone={() => setCutinDone(true)}
        subtitle={subtitle}
      />
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: cutinDone ? 1 : 0.15, y: cutinDone ? 0 : 6 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </>
  );
}
