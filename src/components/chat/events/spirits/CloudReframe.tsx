'use client';

/**
 * ☁️ v104: CloudReframe — cloud_bunny 코미디 거리두기 4줄
 */

import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { CloudReframeData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function CloudReframe({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as CloudReframeData;
  const t = data.miMiTranslation;

  const handle = (value: 'lighter' | 'still_hurt' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'lighter'
        ? '☁️ ㅋㅋㅋ 좀 가벼워졌어'
        : value === 'still_hurt'
        ? '☁️ 그래도 진짜 힘들어'
        : '☁️ 다음에',
      {
        source: 'spirit_event',
        context: { spiritId: 'cloud_bunny', eventType: 'SPIRIT_CLOUD_REFRAME', choice: value },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="cloud_bunny" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm text-sky-700 mb-3">{data.openerMsg}</p>

      {data.userQuote && (
        <div className="text-xs text-gray-500 mb-2">
          네 말: <span className="italic">"{data.userQuote}"</span>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-1.5 text-sm font-handwriting"
        style={{ fontFamily: 'var(--font-gaegu, system-ui)' }}
      >
        <p className="text-sky-900">{t.main}</p>
        <p className="text-sky-900">{t.incident}</p>
        <p className="text-sky-900">{t.result}</p>
        <p className="italic text-sky-700">{t.directorNote}</p>
      </motion.div>

      <p className="mt-3 text-sm font-medium text-sky-800">💭 {data.miMiClosing}</p>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('lighter')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-sky-400 text-white shadow active:scale-[0.98] transition"
        >
          😂 좀 가벼워졌어
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('still_hurt')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-sky-200 text-sky-700 hover:bg-sky-50 transition"
        >
          🥺 그래도 힘들어
        </button>
      </div>
    </SpiritEventCard>
  );
}
