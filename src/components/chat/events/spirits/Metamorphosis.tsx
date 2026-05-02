'use client';

/**
 * 🦋 v104: Metamorphosis — butterfly_meta 90일 비교 거울
 */

import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { MetamorphosisData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

function StatCard({
  emoji, label, stats,
}: { emoji: string; label: string; stats: { avgEmotionScore: number; topWords: string[]; signature: string } }) {
  return (
    <div className="bg-white/70 border border-purple-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-purple-700 mb-2">{emoji} {label}</p>
      <p className="text-[11px] text-gray-500">평균 감정 점수</p>
      <p className="text-lg font-mono text-purple-900 mb-1.5">{stats.avgEmotionScore.toFixed(1)}</p>
      <p className="text-[11px] text-gray-500">자주 쓴 단어</p>
      <p className="text-xs text-gray-800 mb-1.5">{stats.topWords.length > 0 ? stats.topWords.join(', ') : '—'}</p>
      <p className="text-[11px] text-gray-500">{stats.signature}</p>
    </div>
  );
}

export default function Metamorphosis({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as MetamorphosisData;
  const delta = data.delta?.emotionScore ?? 0;
  const direction = delta >= 0 ? '+' : '';

  const handle = (value: 'seen' | 'more' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'seen'
        ? `🦋 보였어 (${direction}${delta.toFixed(1)} 변화)`
        : value === 'more'
        ? '🦋 더 보고 싶어'
        : '🦋 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'butterfly_meta',
          eventType: 'SPIRIT_METAMORPHOSIS',
          choice: value,
          delta: data.delta,
        },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="butterfly_meta" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm font-medium text-purple-700 mb-3">{data.openerMsg}</p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCard emoji="🐛" label={data.beforeLabel} stats={data.before} />
        <StatCard emoji="🦋" label={data.afterLabel} stats={data.after} />
      </div>

      {/* 나비 */}
      <div className="flex justify-center my-2">
        <motion.span
          className="text-3xl"
          animate={{ x: [0, 20, 0, -20, 0], y: [0, -4, 0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          🦋
        </motion.span>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
        <p className="text-sm font-serif italic text-purple-900 whitespace-pre-line">{data.metaPoetic}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('seen')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-purple-500 text-white shadow active:scale-[0.98] transition"
        >
          🦋 보였어
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('more')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-purple-200 text-purple-700 hover:bg-purple-50 transition"
        >
          📜 더 보고 싶어
        </button>
      </div>
    </SpiritEventCard>
  );
}
