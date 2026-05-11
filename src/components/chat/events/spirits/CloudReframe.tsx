'use client';

/**
 * ☁️ v104.2: CloudReframe — cloud_bunny 영화 4컷 메타 거리두기
 *
 * 흐름:
 *   - 사용자 발언이 영화 시나리오 4컷으로 재해석됨
 *   - 4컷 = ①주인공 ②사건 ③결과(과장) ④감독 노트
 *   - 만화책 페이지처럼 한 컷씩 넘김 (좌우 스와이프 또는 탭)
 *   - 마지막에 별점 강등 평가 (★★☆☆☆) + cloud_bunny 결말
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [page, setPage] = useState(0);   // 0~3 = 4컷, 4 = 평가

  const FRAMES = [
    { emoji: '🐰', label: '주인공', text: t.main, bg: 'from-sky-100 to-sky-200' },
    { emoji: '⚡', label: '사건', text: t.incident, bg: 'from-yellow-100 to-amber-100' },
    { emoji: '💥', label: '결과', text: t.result, bg: 'from-red-100 to-orange-100' },
    { emoji: '🎬', label: '감독 노트', text: t.directorNote, bg: 'from-purple-100 to-pink-100' },
  ];

  const isLast = page === FRAMES.length;
  const goNext = () => setPage((p) => Math.min(p + 1, FRAMES.length));
  const goPrev = () => setPage((p) => Math.max(p - 1, 0));

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
        <div className="text-[11px] text-gray-500 mb-2 px-2 py-1.5 bg-gray-50 rounded">
          📜 네 말: <span className="italic">&ldquo;{data.userQuote}&rdquo;</span>
        </div>
      )}

      {/* 만화책 페이지 영역 */}
      <div className="relative min-h-[200px] mb-3 perspective-[1000px]">
        <AnimatePresence mode="wait">
          {!isLast ? (
            <motion.div
              key={`page-${page}`}
              initial={{ rotateY: 90, opacity: 0, x: 30 }}
              animate={{ rotateY: 0, opacity: 1, x: 0 }}
              exit={{ rotateY: -90, opacity: 0, x: -30 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className={`bg-gradient-to-br ${FRAMES[page].bg} border-2 border-sky-300 rounded-xl p-4 shadow-lg`}
              style={{ minHeight: 200 }}
            >
              {/* 페이지 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-widest font-bold text-sky-700">
                  ▶ FRAME {page + 1} / 4
                </span>
                <span className="text-xs font-bold text-sky-800">
                  {FRAMES[page].emoji} {FRAMES[page].label}
                </span>
              </div>
              {/* 큰 이모지 */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-5xl text-center mb-3 select-none"
              >
                {FRAMES[page].emoji}
              </motion.div>
              {/* 대사/장면 */}
              <p
                className="text-base text-gray-800 text-center leading-relaxed px-2"
                style={{ fontFamily: 'var(--font-gaegu, serif)' }}
              >
                {FRAMES[page].text}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="rating"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-sky-50 to-purple-50 border-2 border-sky-300 rounded-xl p-4 shadow-lg"
              style={{ minHeight: 200 }}
            >
              <div className="text-center mb-3">
                <p className="text-[10px] tracking-widest font-bold text-sky-700 mb-2">
                  🎬 영화 평가
                </p>
                {/* 별점 - 과장 → 강등 */}
                <div className="flex justify-center gap-1 mb-2">
                  {/* 처음 */}
                  <div className="flex flex-col items-center">
                    <p className="text-[9px] text-gray-500">너의 평가</p>
                    <div className="text-2xl text-red-400">★★★★★</div>
                  </div>
                  <span className="self-end mx-2 text-gray-400">→</span>
                  {/* 강등 */}
                  <div className="flex flex-col items-center">
                    <p className="text-[9px] text-sky-700">cloud_bunny 평가</p>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: 'spring' }}
                      className="text-2xl"
                    >
                      <span className="text-amber-500">★★</span>
                      <span className="text-gray-300">☆☆☆</span>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* cloud_bunny 결말 */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white/80 border border-sky-200 rounded-lg p-3 mb-2"
              >
                <p
                  className="text-sm text-sky-900 text-center"
                  style={{ fontFamily: 'var(--font-gaegu, serif)' }}
                >
                  💭 {data.miMiClosing}
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-[11px] italic text-sky-600/70 text-center"
              >
                5년 후에 보면 졸귀 짤 같지 않아? ㅋㅋㅋㅋ
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 페이지 네비 */}
      {!isLast ? (
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            disabled={disabled || page === 0}
            onClick={goPrev}
            className="px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50 rounded disabled:opacity-30"
          >
            ← 이전
          </button>
          {/* 도트 */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                animate={{
                  backgroundColor: i <= page ? '#0EA5E9' : '#CBD5E1',
                  scale: i === page ? 1.4 : 1,
                }}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={goNext}
            className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded transition"
          >
            {page < FRAMES.length - 1 ? '다음 →' : '평가 보기 ▶'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handle('lighter')}
            className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-400 to-cyan-400 text-white shadow active:scale-[0.98] transition"
          >
            😂 좀 가벼워졌어
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handle('still_hurt')}
            className="py-2.5 px-3 rounded-xl text-sm font-medium border border-sky-200 text-sky-700 hover:bg-sky-50 transition"
          >
            🥺 그래도 힘들어
          </button>
        </div>
      )}
    </SpiritEventCard>
  );
}
