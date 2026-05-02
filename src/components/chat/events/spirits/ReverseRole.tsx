'use client';

/**
 * 🎭 v104: ReverseRole — clown_harley 입장 바꿔 5턴
 *
 * 시작 카드만 정령 카드. 실제 5턴 롤플은 BRIDGE 모드 내 일반 chat flow.
 * "시작" → 다음 턴부터 유저=상대 역, 할리=유저 역으로 5턴 자동 진행.
 */

import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { ReverseRoleData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const TONE_LABEL: Record<string, string> = {
  anxious: '불안한',
  angry: '화난',
  sad: '슬픈',
  cold: '차가운',
  caring: '걱정하는',
};

export default function ReverseRole({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as ReverseRoleData;

  const handle = (value: 'start' | 'later') => {
    if (disabled) return;
    onChoose(
      value === 'start' ? '🎭 좋아 시작해보자' : '🎭 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'clown_harley',
          eventType: 'SPIRIT_REVERSE_ROLE',
          choice: value,
          partnerName: data.partnerName,
          tone: data.harleyAsUser.tone,
          openingLine: data.harleyAsUser.openingLine,
          rounds: data.rounds,
        },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="clown_harley" onSkip={() => handle('later')} disabled={disabled}>
      <motion.div
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="absolute top-2 right-12 text-xl"
        aria-hidden
      >
        🎭
      </motion.div>

      <p className="text-sm text-rose-700 mb-3">{data.openerMsg}</p>

      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-3">
        <p className="text-xs text-gray-500 mb-1">🎬 5턴 롤플레이</p>
        <p className="text-sm text-gray-800">
          너 → <span className="font-semibold text-rose-700">{data.partnerName}</span> 역할
        </p>
        <p className="text-sm text-gray-800">
          할리 → <span className="font-semibold text-rose-700">너</span> ({TONE_LABEL[data.harleyAsUser.tone] ?? data.harleyAsUser.tone})
        </p>
      </div>

      <div className="bg-white/80 border border-rose-100 rounded-lg p-3 mb-4">
        <p className="text-[11px] text-gray-500 mb-1">📜 할리의 첫 라인</p>
        <p className="text-sm text-gray-800 italic">"{data.harleyAsUser.openingLine}"</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('start')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-rose-500 text-white shadow active:scale-[0.98] transition"
        >
          ▶️ 시작
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('later')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
        >
          ⏭️ 다음에
        </button>
      </div>
    </SpiritEventCard>
  );
}
