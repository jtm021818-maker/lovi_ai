'use client';

/**
 * 🌟 v104: WishGrant — star_dust 월간 소원 if-then
 *
 * 두 단계:
 *   1) 유저가 소원 1줄 입력 → "✨ 소원 빌게" → /api/spirits/wish/transform 호출 → if-then 변환
 *   2) 변환된 if-then 보여주고 "약속할게" → spirit_wishes commit
 *
 * 카드 진입 시점에 ifPhrase 가 이미 있으면 1단계 건너뜀.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { WishGrantData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function WishGrant({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as WishGrantData;
  const [wish, setWish] = useState('');
  const [ifPhrase, setIfPhrase] = useState(data.ifPhrase ?? '');
  const [thenPhrase, setThenPhrase] = useState(data.thenPhrase ?? '');
  const [comment, setComment] = useState(data.starDustComment ?? '');
  const [transforming, setTransforming] = useState(false);
  const [committed, setCommitted] = useState(false);

  const transformWish = async () => {
    if (!wish.trim() || disabled) return;
    setTransforming(true);
    try {
      const r = await fetch('/api/spirits/wish/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wish }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { ifPhrase?: string; thenPhrase?: string; starDustComment?: string };
      setIfPhrase(j.ifPhrase ?? 'if 내일 저녁 8시,');
      setThenPhrase(j.thenPhrase ?? 'then 한 줄만 보낸다.');
      setComment(j.starDustComment ?? '약속 ✨');
    } catch {
      // fallback
      setIfPhrase('if 내일 저녁 8시');
      setThenPhrase('then 한 줄만 보낸다.');
      setComment('약속 ✨');
    } finally {
      setTransforming(false);
    }
  };

  const handle = (value: 'commit' | 'reroll' | 'skip') => {
    if (disabled) return;
    if (value === 'commit') {
      setCommitted(true);
      onChoose(`🌟 약속할게: ${ifPhrase} ${thenPhrase}`, {
        source: 'spirit_event',
        context: {
          spiritId: 'star_dust',
          eventType: 'SPIRIT_WISH_GRANT',
          choice: 'commit',
          originalWish: wish,
          ifPhrase,
          thenPhrase,
        },
      });
      return;
    }
    if (value === 'reroll') {
      // reroll: ifPhrase 초기화하고 다시 입력
      setIfPhrase('');
      setThenPhrase('');
      setComment('');
      return;
    }
    onChoose('🌟 다음에', {
      source: 'spirit_event',
      context: { spiritId: 'star_dust', eventType: 'SPIRIT_WISH_GRANT', choice: 'skip' },
    });
  };

  if (committed) {
    return (
      <SpiritEventCard
        spiritId="star_dust"
        showSkip={false}
        className="!bg-gradient-to-br !from-violet-950 !to-indigo-950 !border-yellow-300/40"
      >
        <div className="relative py-8 text-center">
          <motion.div
            initial={{ x: -100, y: -50, opacity: 0 }}
            animate={{ x: 100, y: 50, opacity: [0, 1, 0] }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 flex items-center justify-center text-3xl"
          >
            ⭐
          </motion.div>
          <p className="text-yellow-200 font-medium relative z-10">{comment || '약속 ✨'}</p>
        </div>
      </SpiritEventCard>
    );
  }

  return (
    <SpiritEventCard
      spiritId="star_dust"
      onSkip={() => handle('skip')}
      disabled={disabled}
      headerBadge="UR ✨ 월 1회"
      className="!bg-gradient-to-br !from-violet-950/95 !to-purple-950/95 !border-yellow-300/40"
    >
      {/* 별 파티클 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {[...Array(10)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-yellow-100/60 text-[10px]"
            style={{ left: `${i * 10}%`, top: `${(i * 7) % 90}%` }}
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.2 }}
          >
            ✦
          </motion.span>
        ))}
      </div>

      <div className="relative z-10">
        <p className="text-sm text-yellow-100 mb-3 italic">{data.openerMsg}</p>

        {!ifPhrase && (
          <>
            <label className="block mb-3">
              <span className="text-xs text-yellow-200/80 mb-1 block">✨ 너의 소원 한 줄</span>
              <input
                type="text"
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                disabled={disabled || transforming}
                maxLength={120}
                placeholder="예: 걔한테 진짜 마음 한 번 말하고 싶어"
                className="w-full px-3 py-2 text-sm bg-violet-900/40 border border-yellow-300/40 text-yellow-50 placeholder-yellow-300/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-300 font-serif italic"
                style={{ fontFamily: 'var(--font-gaegu, serif)' }}
              />
            </label>
            <button
              type="button"
              disabled={disabled || transforming || wish.trim().length < 3}
              onClick={transformWish}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-300 to-amber-200 text-violet-950 shadow-lg active:scale-[0.98] disabled:opacity-50 transition"
            >
              {transforming ? '✨ 별똥이 변환 중…' : '✨ 소원 빌게'}
            </button>
          </>
        )}

        {ifPhrase && (
          <>
            <div className="bg-violet-900/40 border border-yellow-300/30 rounded-lg p-3 mb-3 space-y-1.5">
              <p className="text-yellow-100 text-sm font-mono">🌟 별똥이의 마법:</p>
              <p className="text-yellow-200 text-sm pl-3">{ifPhrase}</p>
              <p className="text-yellow-100 text-sm font-bold pl-3">{thenPhrase}</p>
              <p className="text-[11px] italic text-yellow-300/80 pt-1">📌 한 가지 행동, 시간 정해놓고.</p>
            </div>
            {comment && <p className="text-xs italic text-yellow-200/80 mb-3">💫 {comment}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => handle('commit')}
                className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-300 to-amber-200 text-violet-950 shadow-lg active:scale-[0.98] transition"
              >
                ✨ 약속할게
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handle('reroll')}
                className="py-2.5 px-3 rounded-xl text-sm font-medium border border-yellow-300/50 text-yellow-200 hover:bg-yellow-300/10 transition"
              >
                ✏️ 다른 걸로
              </button>
            </div>
          </>
        )}
      </div>
    </SpiritEventCard>
  );
}
