'use client';

/**
 * 💌 v104.2: LetterBridge — letter_fairy 부치지 않을 편지 + 봉랍 인장 의식
 *
 * 흐름:
 *   1) compose — 빈티지 양피지 UI에서 편지 작성
 *   2) archive — 봉투에 글이 빨려들어가 봉랍 인장 → 영구 보관
 *   3) burn — 풀스크린 편지가 위로 떠올라 불에 타는 의식
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { LetterBridgeData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'compose' | 'archive' | 'burn';

export default function LetterBridge({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as LetterBridgeData;
  const [recipient, setRecipient] = useState(data.recipient ?? '');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<Mode>('compose');

  const handleArchive = () => setMode('archive');
  const handleBurn = () => setMode('burn');

  const finishArchive = () => {
    if (disabled) return;
    onChoose('💌 보관함에 봉인했어', {
      source: 'spirit_event',
      context: {
        spiritId: 'letter_fairy',
        eventType: 'SPIRIT_LETTER_BRIDGE',
        choice: 'archive',
        recipient,
        body,
      },
    });
  };

  const finishBurn = () => {
    if (disabled) return;
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
  };

  const handleSkip = () => {
    if (disabled) return;
    onChoose('💌 다음에', {
      source: 'spirit_event',
      context: { spiritId: 'letter_fairy', eventType: 'SPIRIT_LETTER_BRIDGE', choice: 'skip' },
    });
  };

  // ─── ARCHIVE — 풀스크린 봉랍 봉인 ───
  if (mode === 'archive') {
    return (
      <AnimatePresence>
        <motion.div
          key="archive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #FEF3C7 0%, #FDE68A 60%, #D4A574 100%)',
          }}
        >
          {/* 양피지 텍스처 배경 (점선) */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            {Array.from({ length: 50 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-amber-700 text-xs"
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 23) % 100}%`,
                }}
              >
                ·
              </span>
            ))}
          </div>

          {/* 봉투 */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 14 }}
            className="relative"
          >
            <div className="relative w-64 h-44 rounded-md shadow-2xl"
                 style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A 50%, #D4A574)' }}>
              {/* 봉투 플랩 */}
              <div
                className="absolute inset-x-0 top-0 h-24 opacity-80"
                style={{
                  background: 'linear-gradient(180deg, #FDE68A, #D4A574)',
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                }}
              />
              {/* 봉투 외곽 그림자 */}
              <div className="absolute inset-0 rounded-md ring-2 ring-amber-700/30" />
            </div>

            {/* 편지가 봉투로 빨려들어감 */}
            <motion.div
              initial={{ y: -140, opacity: 1, scale: 1 }}
              animate={{ y: -10, opacity: 0, scale: 0.3 }}
              transition={{ delay: 0.6, duration: 1.0, ease: 'easeIn' }}
              className="absolute -top-40 left-1/2 -translate-x-1/2 w-56 px-3 py-2 bg-amber-50/95 border border-amber-300 rounded shadow text-center"
            >
              <p
                className="text-amber-900 text-xs italic"
                style={{ fontFamily: 'var(--font-gaegu, serif)' }}
              >
                To. <b>{recipient || '비밀'}</b>
              </p>
              <p
                className="text-amber-800 text-xs leading-snug max-w-full overflow-hidden whitespace-nowrap mt-1"
                style={{ fontFamily: 'var(--font-gaegu, serif)' }}
              >
                {body.slice(0, 28)}{body.length > 28 ? '…' : ''}
              </p>
            </motion.div>

            {/* 봉랍 인장 */}
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -45 }}
              animate={{ scale: [0, 1.4, 1], opacity: 1, rotate: 0 }}
              transition={{ delay: 1.8, duration: 0.6, type: 'spring' }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex items-center justify-center text-3xl"
              style={{
                background: 'radial-gradient(circle, #DC2626 30%, #991B1B 70%, #7F1D1D)',
                boxShadow: '0 6px 24px rgba(220,38,38,0.7), inset 0 -4px 8px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.3)',
              }}
            >
              💌
            </motion.div>

            {/* 봉랍 폭발 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2.5, opacity: [0, 0.6, 0] }}
              transition={{ delay: 1.8, duration: 0.8 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(220,38,38,0.5), transparent 70%)',
              }}
            />
          </motion.div>

          {/* 메시지 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.6 }}
            className="mt-12 text-center px-6"
          >
            <p className="text-amber-900 font-bold text-xl mb-1">봉인됨</p>
            <p className="text-amber-700 text-sm italic">
              부치지 않을 약속, 보관함에 영원히
            </p>
          </motion.div>

          <motion.button
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 3.0 }}
            onClick={finishArchive}
            className="mt-8 px-8 py-3 rounded-full bg-amber-700 text-amber-50 font-bold text-base shadow-2xl active:scale-95"
            style={{ boxShadow: '0 8px 30px rgba(146,64,14,0.5)' }}
          >
            📦 보관함으로
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── BURN — 풀스크린 편지 태우기 ───
  if (mode === 'burn') {
    return (
      <AnimatePresence>
        <motion.div
          key="burn"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(circle at 50% 70%, #FEF3C7 0%, #92400E 60%, #1C1917 100%)' }}
        >
          {/* 불씨 입자 */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute select-none"
              style={{
                left: `${(i * 37) % 100}%`,
                bottom: '-5%',
                color: i % 3 === 0 ? '#FFD23F' : i % 3 === 1 ? '#FF7A2F' : '#FF3B1F',
                fontSize: 8 + (i % 4) * 5,
              }}
              animate={{
                y: ['0vh', '-110vh'],
                x: [0, (i % 2 === 0 ? 40 : -40)],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 3 + (i % 3),
                delay: (i % 10) * 0.18,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            >
              ✦
            </motion.span>
          ))}

          {/* 편지 떠올라 타기 */}
          <motion.div
            initial={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
            animate={{
              y: ['0px', '-120px', '-300px'],
              scale: [1, 1.1, 0.6],
              opacity: [1, 0.9, 0],
              rotate: [0, -8, 12],
            }}
            transition={{ duration: 3.0, ease: 'easeOut' }}
            className="relative w-64 max-w-xs px-4 py-4 rounded shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #FEF3C7, #FDE68A 50%, #D4A574)',
              filter: 'sepia(0.3)',
            }}
          >
            <p
              className="text-amber-900 text-xs italic mb-2"
              style={{ fontFamily: 'var(--font-gaegu, serif)' }}
            >
              To. <b>{recipient || '아무도'}</b>
            </p>
            <p
              className="text-amber-800 text-sm leading-relaxed whitespace-pre-line"
              style={{ fontFamily: 'var(--font-gaegu, serif)' }}
            >
              {body.length > 60 ? body.slice(0, 60) + '…' : body}
            </p>
          </motion.div>

          {/* 메시지 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 3.0 }}
            className="absolute bottom-32 text-center px-6"
          >
            <p className="text-amber-100 font-bold text-xl mb-1">
              가벼워졌어
            </p>
            <p className="text-amber-300 text-sm italic">
              연기처럼 떠올라 사라졌어
            </p>
          </motion.div>

          <motion.button
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 3.4 }}
            onClick={finishBurn}
            className="absolute bottom-12 px-8 py-3 rounded-full bg-orange-600 text-amber-50 font-bold text-base shadow-2xl active:scale-95"
            style={{ boxShadow: '0 8px 30px rgba(234,88,12,0.6)' }}
          >
            🔥 더 가벼워졌어
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── COMPOSE — 양피지 작성 ───
  return (
    <SpiritEventCard
      spiritId="letter_fairy"
      onSkip={handleSkip}
      disabled={disabled}
      className="!bg-gradient-to-br !from-amber-50 !to-amber-100 !border-amber-400/50"
    >
      <p className="text-sm text-amber-900 mb-3 italic font-serif">{data.openerMsg}</p>

      {/* 양피지 카드 */}
      <div
        className="relative rounded-lg p-3 border-2 mb-3"
        style={{
          background: 'linear-gradient(135deg, #FEF8E7 0%, #FDF1D7 50%, #F4E4B8 100%)',
          borderColor: '#D4A574',
          boxShadow: 'inset 0 0 30px rgba(212,165,116,0.2)',
        }}
      >
        {/* 양피지 가장자리 점 장식 */}
        <div className="absolute top-1 right-2 text-amber-400/40 text-xs">✦</div>
        <div className="absolute bottom-1 left-2 text-amber-400/40 text-xs">✦</div>

        <label className="block mb-2">
          <span className="text-[11px] text-amber-700 mb-0.5 block">받는 이</span>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="비워둬도 괜찮아"
            disabled={disabled}
            className="w-full px-2.5 py-1.5 text-sm bg-amber-50/70 border border-amber-300 rounded text-amber-900 placeholder-amber-400/60 italic focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ fontFamily: 'var(--font-gaegu, serif)' }}
          />
        </label>

        <p className="text-[11px] text-amber-700 italic mb-1">💡 {data.guide}</p>
        <p className="text-[11px] text-amber-600/80 italic mb-2">{data.unblockExample}</p>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          disabled={disabled}
          placeholder="여기에 적어 봐…"
          className="w-full px-2.5 py-2 text-sm bg-amber-50/70 border border-amber-300 rounded text-amber-900 placeholder-amber-400/60 italic leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
          style={{ fontFamily: 'var(--font-gaegu, serif)' }}
        />

        {/* 깃펜 아이콘 */}
        <motion.div
          animate={{ y: [0, -3, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute -top-3 right-3 text-2xl select-none"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        >
          🪶
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={disabled || body.length < 1}
          onClick={handleArchive}
          className="py-2.5 rounded-xl text-xs font-bold bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow active:scale-[0.98] disabled:opacity-40 transition"
        >
          📦 봉인
        </button>
        <button
          type="button"
          disabled={disabled || body.length < 1}
          onClick={handleBurn}
          className="py-2.5 rounded-xl text-xs font-bold bg-gradient-to-br from-orange-500 to-red-500 text-white shadow active:scale-[0.98] disabled:opacity-40 transition"
        >
          🔥 태우기
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleSkip}
          className="py-2.5 rounded-xl text-xs font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 transition"
        >
          ⏭️ 다음에
        </button>
      </div>
    </SpiritEventCard>
  );
}
