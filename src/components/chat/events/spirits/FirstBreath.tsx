'use client';

/**
 * 🌱 v104: FirstBreath — seed_spirit 4-7-8 호흡
 *
 * 첫 세션 첫 턴 부드러운 진입 의식.
 * 원이 커짐(들숨 4초) → 멈춤(7초) → 작아짐(날숨 8초). 1 라운드 = 19초.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { FirstBreathData } from '@/engines/spirits/spirit-event-types';

type Phase = 'in' | 'hold' | 'out';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const PHASE_LABEL: Record<Phase, string> = {
  in: '들숨',
  hold: '참기',
  out: '날숨',
};

export default function FirstBreath({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as FirstBreathData;
  const cycle = data.cycle ?? { in: 4, hold: 7, out: 8 };
  const totalRounds = data.rounds ?? 1;

  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>('in');
  const [secLeft, setSecLeft] = useState(cycle.in);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (secLeft <= 0) {
      // phase 진행
      if (phase === 'in') { setPhase('hold'); setSecLeft(cycle.hold); return; }
      if (phase === 'hold') { setPhase('out'); setSecLeft(cycle.out); return; }
      // phase === 'out' 끝
      if (round < totalRounds) {
        setRound((r) => r + 1);
        setPhase('in');
        setSecLeft(cycle.in);
      } else {
        setDone(true);
      }
      return;
    }
    const t = setTimeout(() => setSecLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secLeft, phase, round, totalRounds, cycle.in, cycle.hold, cycle.out, done]);

  const handle = (value: 'done' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'done' ? '🌱 호흡 한 번 같이 했어' : '🌱 다음에',
      {
        source: 'spirit_event',
        context: { spiritId: 'seed_spirit', eventType: 'SPIRIT_FIRST_BREATH', choice: value },
      },
    );
  };

  // 원 크기: in→커짐, hold→유지, out→작아짐
  const scale = phase === 'in' ? 1.4 : phase === 'hold' ? 1.4 : 0.7;

  return (
    <SpiritEventCard spiritId="seed_spirit" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm text-emerald-700 mb-4">
        {done ? data.closeMsg : data.openMsg}
      </p>

      <div className="flex flex-col items-center justify-center min-h-[160px] gap-3">
        <motion.div
          animate={{ scale }}
          transition={{
            duration: phase === 'in' ? cycle.in : phase === 'hold' ? 0 : cycle.out,
            ease: 'easeInOut',
          }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 shadow-md flex items-center justify-center text-3xl"
          aria-hidden
        >
          🌱
        </motion.div>
        {!done && (
          <div className="text-center">
            <p className="text-sm font-semibold text-emerald-700">{PHASE_LABEL[phase]} {phase === 'in' ? cycle.in : phase === 'hold' ? cycle.hold : cycle.out}초</p>
            <p className="text-xs text-gray-500 tabular-nums mt-1">{secLeft}초 남음 · {round}/{totalRounds} 라운드</p>
          </div>
        )}
        {done && (
          <p className="text-xs text-emerald-600">🌬️ 잘 했어</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('done')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-emerald-500 text-white shadow active:scale-[0.98] disabled:opacity-50 transition"
        >
          🌬️ 했어
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('skip')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
        >
          ⏭️ skip
        </button>
      </div>
    </SpiritEventCard>
  );
}
