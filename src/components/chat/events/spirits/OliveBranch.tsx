'use client';

/**
 * 🕊️ v104: OliveBranch — peace_dove 화해 첫마디 3안
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { OliveBranchData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const TONE_BG: Record<string, string> = {
  soft: 'border-rose-200 bg-rose-50/50',
  responsibility: 'border-amber-200 bg-amber-50/50',
  humor: 'border-pink-200 bg-pink-50/50',
};

export default function OliveBranch({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as OliveBranchData;
  const [picked, setPicked] = useState<string | null>(null);

  const handle = (value: 'send' | 'tweak' | 'skip') => {
    if (disabled) return;
    const draft = data.drafts.find((d) => d.tone === picked);
    onChoose(
      value === 'send'
        ? `🕊️ 이거 보내볼래: ${draft?.text ?? ''}`
        : value === 'tweak'
        ? '🕊️ 한 번 다듬을래'
        : '🕊️ 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'peace_dove',
          eventType: 'SPIRIT_OLIVE_BRANCH',
          choice: value,
          selectedTone: picked,
          selectedText: draft?.text,
        },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="peace_dove" onSkip={() => handle('skip')} disabled={disabled}>
      <motion.div
        animate={{ x: [0, 8, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 4 }}
        className="absolute top-2 right-12 text-xl"
        aria-hidden
      >
        🕊️
      </motion.div>

      <p className="text-sm text-rose-700 mb-3">{data.openerMsg}</p>

      <div className="space-y-2">
        {data.drafts.map((d, i) => (
          <motion.button
            key={d.tone}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            disabled={disabled}
            onClick={() => setPicked(d.tone)}
            className={[
              'w-full text-left p-3 rounded-lg border transition',
              TONE_BG[d.tone] ?? 'border-gray-200',
              picked === d.tone ? 'ring-2 ring-rose-400' : 'hover:bg-rose-50',
            ].join(' ')}
          >
            <div className="text-xs font-bold mb-1">
              {d.emoji} {d.label}
            </div>
            <div className="text-sm text-gray-800 mb-1">{d.text}</div>
            <div className="text-[11px] italic text-gray-500">→ {d.intent}</div>
          </motion.button>
        ))}
      </div>

      <p className="mt-3 text-xs italic text-rose-700/80">💡 {data.doveGuide}</p>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          disabled={disabled || !picked}
          onClick={() => handle('send')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-rose-400 text-white shadow active:scale-[0.98] disabled:opacity-50 transition"
        >
          ✉️ 이거 보내볼래
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('tweak')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
        >
          ✏️ 다듬을래
        </button>
      </div>
    </SpiritEventCard>
  );
}
