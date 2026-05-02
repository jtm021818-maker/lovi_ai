'use client';

/**
 * 🥁 v104: RhythmCheck — drum_imp 답장 리듬 진단
 */

import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { RhythmCheckData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const PATTERN_LABEL: Record<string, string> = {
  chase: '추격형',
  avoid: '회피형',
  offbeat: '엇박자형',
  sync: '동조형',
};

export default function RhythmCheck({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as RhythmCheckData;

  const handle = (value: 'tryslow' | 'detail' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'tryslow'
        ? `🥁 두 박자 늦춰볼게: ${data.drumAdvice}`
        : value === 'detail'
        ? '🥁 더 자세히 보고 싶어'
        : '🥁 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'drum_imp',
          eventType: 'SPIRIT_RHYTHM_CHECK',
          choice: value,
          pattern: data.pattern,
          drumAdvice: data.drumAdvice,
        },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="drum_imp" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm font-semibold text-amber-800 mb-3">🥁 {data.openerMsg}</p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">📈 너의 답장</p>
          <p className="text-sm font-semibold text-amber-700">{data.myAvg}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">📉 걔의 답장</p>
          <p className="text-sm font-semibold text-orange-700">{data.partnerAvg}</p>
        </div>
      </div>

      <div className="bg-white/60 border border-amber-100 rounded-lg p-2.5 mb-3">
        <p className="text-[10px] text-gray-500 mb-1.5">📊 시각화</p>
        <div className="space-y-1">
          {data.visualBars.map((b, i) => (
            <motion.div
              key={i}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: i * 0.05 }}
              style={{ originX: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-[10px] w-8 text-gray-500">{b.who === 'me' ? '너' : '걔'}</span>
              <div
                className={`h-2 rounded ${b.who === 'me' ? 'bg-amber-400' : 'bg-orange-400'}`}
                style={{ width: `${b.length * 9}%` }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bg-amber-100/70 border border-amber-300 rounded-lg p-2.5 mb-3">
        <p className="text-xs font-semibold text-amber-800 mb-1">
          🎼 패턴: {data.patternEmoji} {PATTERN_LABEL[data.pattern] ?? data.pattern}
        </p>
        <p className="text-xs text-gray-700">{data.patternDescription}</p>
      </div>

      <p className="text-sm text-amber-900 mb-3">💡 <span className="italic">{data.drumAdvice}</span></p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('tryslow')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-amber-600 text-white shadow active:scale-[0.98] transition"
        >
          ⏱️ 두 박자 늦춰볼게
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('detail')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-amber-300 text-amber-800 hover:bg-amber-50 transition"
        >
          📊 더 자세히
        </button>
      </div>
    </SpiritEventCard>
  );
}
