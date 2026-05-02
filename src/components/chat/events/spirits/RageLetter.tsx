'use client';

/**
 * 🔥 v104: RageLetter — fire_goblin 분노 폭발 편지 3안
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { RageLetterData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const INTENSITY_COLORS: Record<string, string> = {
  fire: 'border-red-400 bg-red-50/60',
  honest: 'border-orange-300 bg-orange-50/60',
  cool: 'border-slate-300 bg-slate-50/60',
};

export default function RageLetter({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as RageLetterData;
  const [picked, setPicked] = useState<string | null>(null);

  const handle = (value: 'burn' | 'rewrite' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'burn'
        ? '🔥 다 태웠어'
        : value === 'rewrite'
        ? '🔥 직접 써볼게'
        : '🔥 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'fire_goblin',
          eventType: 'SPIRIT_RAGE_LETTER',
          choice: value,
          selectedIntensity: picked,
        },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="fire_goblin" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm font-semibold text-red-700 mb-1">{data.openerMsg}</p>
      <p className="text-xs text-gray-600 mb-3">{data.context}</p>

      <div className="space-y-2">
        {data.drafts.map((d, i) => (
          <motion.button
            key={d.intensity}
            type="button"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            disabled={disabled}
            onClick={() => setPicked(d.intensity)}
            className={[
              'w-full text-left p-3 rounded-lg border transition',
              INTENSITY_COLORS[d.intensity] ?? 'border-gray-200',
              picked === d.intensity ? 'ring-2 ring-red-400' : 'hover:bg-red-100/30',
            ].join(' ')}
          >
            <div className="text-[11px] font-bold text-red-700 mb-1">{d.label}</div>
            <div className="text-sm whitespace-pre-wrap text-gray-800">{d.text}</div>
          </motion.button>
        ))}
      </div>

      <p className="mt-3 text-xs italic text-gray-500">{data.lunaCutIn}</p>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('burn')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-red-500 text-white shadow active:scale-[0.98] transition"
        >
          💥 다 태워버려
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('rewrite')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
        >
          ✏️ 직접 써볼게
        </button>
      </div>
    </SpiritEventCard>
  );
}
