'use client';

/**
 * 📖 v104.2: ThinkFrame — book_worm 3관점 재해석 + 책장 펼침 의식
 *
 * 책 형태로 3페이지를 좌우 넘김. 각 페이지 = 한 관점(나/상대/제3자).
 * 선택한 프레임이 책의 마지막 펼친 페이지에 잉크로 새겨짐.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { ThinkFrameData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const FRAME_BG: Record<string, string> = {
  self:  'from-amber-50 to-orange-50',
  other: 'from-blue-50 to-sky-50',
  third: 'from-violet-50 to-purple-50',
};

const FRAME_ACCENT: Record<string, string> = {
  self:  '#92400E',
  other: '#1E40AF',
  third: '#6D28D9',
};

const FRAME_NAME: Record<string, string> = {
  self:  '제1장 — 내 눈으로',
  other: '제2장 — 상대 입장에서',
  third: '제3장 — 제3자 시점',
};

export default function ThinkFrame({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as ThinkFrameData;
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const isClosed = page === data.frames.length;

  const handle = (value: 'helpful' | 'reroll' | 'skip') => {
    if (disabled) return;
    const f = picked != null ? data.frames[picked] : null;
    onChoose(
      value === 'helpful'
        ? `📖 이 프레임 도움됐어 — ${f?.label ?? ''}`
        : value === 'reroll'
        ? '📖 다른 프레임도 보고 싶어'
        : '📖 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'book_worm',
          eventType: 'SPIRIT_THINK_FRAME',
          choice: value,
          pickedAngle: f?.angle,
          pickedInterpretation: f?.interpretation,
        },
      },
    );
  };

  const goNext = () => setPage((p) => Math.min(p + 1, data.frames.length));
  const goPrev = () => setPage((p) => Math.max(p - 1, 0));

  return (
    <SpiritEventCard spiritId="book_worm" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm font-serif text-amber-900 mb-3">{data.openerMsg}</p>

      {/* 책 영역 */}
      <div
        className="relative mb-3 rounded-lg shadow-inner"
        style={{
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #D4A574 100%)',
          minHeight: 240,
          perspective: '1000px',
        }}
      >
        {/* 책 가운데 접힘 */}
        <div className="absolute inset-y-2 left-1/2 w-px bg-amber-700/30 pointer-events-none" />

        <AnimatePresence mode="wait">
          {isClosed ? (
            // 마지막 페이지 (선택한 프레임 잉크로 새겨짐)
            <motion.div
              key="final"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-3 flex flex-col items-center justify-center text-center px-4"
            >
              {picked != null ? (
                <>
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 180, delay: 0.2 }}
                    className="text-4xl mb-2 select-none"
                  >
                    {data.frames[picked].icon}
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-[11px] text-amber-700 mb-2"
                  >
                    {FRAME_NAME[data.frames[picked].angle] ?? data.frames[picked].label}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="text-sm font-serif italic text-amber-900 leading-relaxed"
                    style={{ fontFamily: 'var(--font-gaegu, serif)' }}
                  >
                    &ldquo;{data.frames[picked].interpretation}&rdquo;
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="mt-3 text-[11px] italic text-amber-600"
                  >
                    이 페이지로 살아볼게
                  </motion.p>
                </>
              ) : (
                <p className="text-sm italic text-amber-800">📖 한 페이지 골라 봐</p>
              )}
            </motion.div>
          ) : (
            // 페이지 (frame)
            <motion.div
              key={`page-${page}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-3"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {(() => {
                const f = data.frames[page];
                if (!f) return null;
                return (
                  <div
                    className={`h-full bg-gradient-to-br ${FRAME_BG[f.angle] ?? 'from-gray-50 to-gray-100'} border-2 rounded p-4 flex flex-col`}
                    style={{ borderColor: FRAME_ACCENT[f.angle] }}
                  >
                    <p
                      className="text-[10px] tracking-widest font-bold"
                      style={{ color: FRAME_ACCENT[f.angle] }}
                    >
                      {FRAME_NAME[f.angle] ?? f.label}
                    </p>
                    <div className="flex items-center justify-center my-2">
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="text-5xl select-none"
                      >
                        {f.icon}
                      </motion.span>
                    </div>
                    <p
                      className="text-sm leading-relaxed text-gray-800 flex-1 px-1"
                      style={{ fontFamily: 'var(--font-gaegu, serif)' }}
                    >
                      {f.interpretation}
                    </p>

                    {/* 선택 버튼 */}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setPicked(page)}
                      className={[
                        'mt-2 py-1.5 px-2 rounded-lg text-xs font-bold transition',
                        picked === page
                          ? 'bg-amber-700 text-amber-50 shadow'
                          : 'bg-white/70 border border-amber-300 text-amber-800 hover:bg-amber-50',
                      ].join(' ')}
                    >
                      {picked === page ? '✓ 이 프레임' : '+ 이 프레임 고르기'}
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-[11px] italic text-amber-700 mb-3">{data.noriQuiet}</p>

      {/* 네비/액션 */}
      {!isClosed ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={disabled || page === 0}
            onClick={goPrev}
            className="px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 rounded disabled:opacity-30"
          >
            ← 이전
          </button>
          <div className="flex gap-1.5">
            {data.frames.map((_, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                animate={{
                  backgroundColor:
                    picked === i ? '#7C2D12' : i === page ? '#92400E' : '#FDE68A',
                  scale: i === page ? 1.4 : 1,
                }}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={goNext}
            className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded transition"
          >
            {page < data.frames.length - 1 ? '다음 →' : '책 덮기 ▶'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handle('helpful')}
            className="col-span-2 py-2.5 rounded-xl text-sm font-bold bg-amber-700 text-amber-50 shadow active:scale-[0.98] transition"
          >
            🎯 이거 도움됐어
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => { setPage(0); setPicked(null); }}
            className="py-2.5 rounded-xl text-xs font-medium border border-amber-300 text-amber-800 hover:bg-amber-50 transition"
          >
            🔄 다시
          </button>
        </div>
      )}
    </SpiritEventCard>
  );
}
