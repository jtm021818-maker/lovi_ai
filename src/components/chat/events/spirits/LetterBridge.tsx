'use client';

/**
 * 💌 v104: LetterBridge — letter_fairy 부치지 않을 편지
 *
 * 유저 입력 → 보관함(spirit_keepsakes) 또는 태우기.
 * "보관"/"태우기" 모두 다음 턴 루나 톤에 영향.
 */

import { useState } from 'react';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { LetterBridgeData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function LetterBridge({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as LetterBridgeData;
  const [recipient, setRecipient] = useState(data.recipient ?? '');
  const [body, setBody] = useState('');
  const [burning, setBurning] = useState(false);

  const handle = (value: 'archive' | 'burn' | 'continue' | 'skip') => {
    if (disabled) return;
    if (value === 'burn') {
      setBurning(true);
      setTimeout(() => {
        onChoose('💌 편지 한 장 태웠어. 가벼워.', {
          source: 'spirit_event',
          context: {
            spiritId: 'letter_fairy',
            eventType: 'SPIRIT_LETTER_BRIDGE',
            choice: 'burn',
            recipient,
            wroteLength: body.length,
          },
        });
      }, 700);
      return;
    }
    onChoose(
      value === 'archive'
        ? '💌 보관함에 넣었어'
        : value === 'continue'
        ? '💌 더 쓰고 올게'
        : '💌 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'letter_fairy',
          eventType: 'SPIRIT_LETTER_BRIDGE',
          choice: value,
          recipient,
          body, // 보관함 저장은 useChat → API route 에서 처리
        },
      },
    );
  };

  if (burning) {
    return (
      <SpiritEventCard spiritId="letter_fairy" showSkip={false}>
        <div className="text-center py-8 text-pink-700">
          <div className="text-5xl mb-2 animate-pulse">🔥</div>
          <p className="text-sm">편지가 위로 떠올라 사라졌어요…</p>
        </div>
      </SpiritEventCard>
    );
  }

  return (
    <SpiritEventCard spiritId="letter_fairy" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm text-pink-700 mb-3">{data.openerMsg}</p>

      <div className="space-y-2 mb-3">
        <label className="block">
          <span className="text-xs text-gray-500 mb-1 block">받는 이</span>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="비워둬도 괜찮아요"
            disabled={disabled}
            className="w-full px-3 py-1.5 text-sm border border-pink-200 rounded-lg bg-white/70 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </label>

        <div className="text-xs text-pink-700 italic px-1">💡 {data.guide}</div>
        <div className="text-[11px] text-gray-500 px-1">{data.unblockExample}</div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          disabled={disabled}
          placeholder="여기에 적어 봐요…"
          className="w-full px-3 py-2 text-sm border border-pink-200 rounded-lg bg-white/70 font-serif leading-relaxed focus:outline-none focus:ring-2 focus:ring-pink-300 resize-y"
          style={{ fontFamily: 'var(--font-gaegu, serif)' }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={disabled || body.length < 1}
          onClick={() => handle('archive')}
          className="py-2 rounded-xl text-xs font-medium bg-pink-400 text-white shadow active:scale-[0.98] disabled:opacity-50 transition"
        >
          📦 보관
        </button>
        <button
          type="button"
          disabled={disabled || body.length < 1}
          onClick={() => handle('burn')}
          className="py-2 rounded-xl text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50 transition"
        >
          🔥 태우기
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('continue')}
          className="py-2 rounded-xl text-xs font-medium border border-pink-200 text-pink-700 hover:bg-pink-50 transition"
        >
          ✏️ 더 쓸래
        </button>
      </div>
    </SpiritEventCard>
  );
}
