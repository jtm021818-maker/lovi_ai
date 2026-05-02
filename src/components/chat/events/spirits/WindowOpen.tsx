'use client';

/**
 * 🍃 v104: WindowOpen — wind_sprite 5분 환기
 *
 * 5턴+ 무거움 누적 시 5분 휴식 권유. 시작하면 카운트다운 + 작업 체크리스트.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { WindowOpenData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function WindowOpen({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as WindowOpenData;
  const totalSec = (data.durationMin ?? 5) * 60;
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(totalSec);
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!running || done) return;
    if (remaining <= 0) { setDone(true); return; }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, remaining, done]);

  const handle = (value: 'start' | 'skip' | 'done') => {
    if (disabled) return;
    if (value === 'start') { setRunning(true); return; }
    if (value === 'skip') {
      onChoose('🍃 지금은 됐어', {
        source: 'spirit_event',
        context: { spiritId: 'wind_sprite', eventType: 'SPIRIT_WINDOW_OPEN', choice: 'skip' },
      });
      return;
    }
    onChoose(
      done ? '🍃 5분 환기하고 왔어' : '🍃 일찍 돌아왔어',
      {
        source: 'spirit_event',
        context: { spiritId: 'wind_sprite', eventType: 'SPIRIT_WINDOW_OPEN', choice: 'done', secLeft: remaining },
      },
    );
  };

  const mm = Math.floor(remaining / 60);
  const ss = (remaining % 60).toString().padStart(2, '0');

  return (
    <SpiritEventCard spiritId="wind_sprite" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm text-emerald-700 mb-3">{data.openerMsg}</p>

      {!running && (
        <>
          <ul className="space-y-1.5 text-sm text-gray-700 mb-4">
            {data.tasks.map((t, i) => (
              <li key={i} className="flex items-center gap-2">
                <span aria-hidden>•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs italic text-gray-500 mb-4">💨 {data.closing}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handle('start')}
              className="py-2 px-3 rounded-xl text-sm font-medium bg-emerald-500 text-white shadow active:scale-[0.98] transition"
            >
              ⏰ {data.durationMin}분 시작
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handle('skip')}
              className="py-2 px-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
            >
              ⏭️ 지금은 됐어
            </button>
          </div>
        </>
      )}

      {running && !done && (
        <div className="flex flex-col items-center gap-3 py-4">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-4xl"
            aria-hidden
          >
            🍃
          </motion.div>
          <p className="text-3xl font-mono tabular-nums text-emerald-700">{mm}:{ss}</p>
          <ul className="space-y-1.5 text-sm w-full">
            {data.tasks.map((t, i) => (
              <li key={i}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                    className="accent-emerald-500"
                  />
                  <span className={checked[i] ? 'line-through text-gray-400' : 'text-gray-700'}>
                    {t}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => handle('done')}
            className="text-xs text-emerald-700 underline mt-2"
          >
            ⏭️ 일찍 돌아왔어
          </button>
        </div>
      )}

      {done && (
        <div className="flex flex-col items-center gap-2 py-4">
          <motion.div
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            className="text-4xl"
          >
            🌿
          </motion.div>
          <p className="text-sm font-medium text-emerald-700">어서 와 ㅎ 돌아왔다</p>
          <button
            type="button"
            onClick={() => handle('done')}
            className="mt-2 py-2 px-5 rounded-xl bg-emerald-500 text-white text-sm shadow active:scale-[0.98]"
          >
            계속 얘기하자
          </button>
        </div>
      )}
    </SpiritEventCard>
  );
}
