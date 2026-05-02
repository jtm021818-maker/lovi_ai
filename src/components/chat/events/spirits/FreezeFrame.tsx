'use client';

/**
 * ❄️ v104: FreezeFrame — ice_prince 60초 강제 침묵
 *
 * 격앙 + 행동 즉시성 직전 60초 STOP.
 * 60초 동안 카드 옵션 비활성. 60초 후에야 "알았어, 멈출게" 버튼 활성.
 * (입력창 자체 잠금은 useChat 의 spiritFreezeUntil 로 처리 — Sprint 4)
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { FreezeFrameData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function FreezeFrame({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as FreezeFrameData;
  const total = data.durationSec ?? 60;
  const [remaining, setRemaining] = useState(total);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (remaining <= 0) { setUnlocked(true); return; }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const handle = () => {
    if (disabled || !unlocked) return;
    onChoose('❄️ 한 번 호흡하고 다시 얘기하자', {
      source: 'spirit_event',
      context: { spiritId: 'ice_prince', eventType: 'SPIRIT_FREEZE_FRAME', choice: 'understood' },
    });
  };

  return (
    <SpiritEventCard
      spiritId="ice_prince"
      showSkip={false}
      className="!bg-gradient-to-br !from-blue-950 !to-indigo-900"
    >
      <div className="relative py-6">
        {/* 얼음 결정 파티클 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-cyan-200/40 text-xl"
              style={{ left: `${10 + i * 20}%`, top: `${(i % 2) * 60}%` }}
              animate={{ rotate: [0, 360], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 8 + i, repeat: Infinity, ease: 'linear' }}
            >
              ❄
            </motion.span>
          ))}
        </div>

        <div className="relative z-10 text-center">
          <p className="text-cyan-100 text-sm whitespace-pre tracking-wider mb-4">{data.opener}</p>
          <p className="text-5xl font-mono tabular-nums text-white mb-4">
            0:{remaining.toString().padStart(2, '0')}
          </p>
          <div className="text-xs text-cyan-200/80 italic mb-1">💭 60초 동안 떠올려:</div>
          <ul className="text-sm text-cyan-100 space-y-1">
            {data.prompts.map((p, i) => (
              <li key={i}>{i + 1}. {p}</li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled || !unlocked}
        onClick={handle}
        className={[
          'w-full py-2.5 rounded-xl text-sm font-medium transition',
          unlocked
            ? 'bg-cyan-300 text-blue-950 shadow-md active:scale-[0.98]'
            : 'bg-cyan-900/50 text-cyan-200/40 cursor-not-allowed',
        ].join(' ')}
      >
        {unlocked ? '❄️ 알았어, 멈출게' : `❄️ ${remaining}초 후`}
      </button>
    </SpiritEventCard>
  );
}
