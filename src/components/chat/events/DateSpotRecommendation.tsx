'use client';

/**
 * 📍 v84: DateSpotRecommendation — 루나의 데이트 장소 추천 이벤트 UI
 *
 * 두 상태:
 *   1. DATE_SPOT_SEARCHING — 지도 ping 애니메이션 + 4단계 진행 타이머
 *   2. DATE_SPOT_RECOMMENDATION — 장소 2~3개 카드 + 네이버지도/리뷰 링크
 *
 * 디자인: 크림~오렌지 gradient, 장소 타입별 borderLeft 컬러
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, DateSpotRecommendationData, DateSpotSearchingData, DateSpot } from '@/types/engine.types';

interface Props {
  event: PhaseEvent;
  disabled?: boolean;
}

const SEARCH_STEPS = [
  { at: 0, text: '🔍 쪽 찾는 중…' },
  { at: 700, text: '📖 리뷰 읽는 중…' },
  { at: 1500, text: '⭐ 평점 체크 중…' },
  { at: 2200, text: '💭 너한테 맞는 거 고르는 중…' },
];

export default function DateSpotRecommendation({ event }: Props) {
  const isSearching = event.type === 'DATE_SPOT_SEARCHING';

  if (isSearching) {
    const data = event.data as unknown as DateSpotSearchingData;
    return <SearchingCard area={data.area} vibe={data.vibe} />;
  }

  const data = event.data as unknown as DateSpotRecommendationData;
  return <ResultCard data={data} />;
}

// ============================================================
// 검색 중 카드
// ============================================================

function SearchingCard({ area, vibe }: { area: string; vibe: string }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timers = SEARCH_STEPS.slice(1).map((step, i) =>
      window.setTimeout(() => setStepIdx(i + 1), step.at),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 max-w-[88%] ml-auto mr-2 p-4 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 60%, #fef3c7 100%)',
        border: '1px solid rgba(251,146,60,0.3)',
        boxShadow: '0 8px 28px rgba(251,146,60,0.15)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative w-9 h-9 rounded-full flex items-center justify-center text-lg bg-gradient-to-br from-orange-300 to-amber-400">
          <span>📍</span>
          {/* ping 링 */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-orange-400"
            animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-orange-700 tracking-wide">LUNA 가 장소 찾는 중</div>
          <div className="text-[10px] text-orange-600/80 truncate">{area} · {vibe}</div>
        </div>
      </div>

      {/* 진행 단계 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.25 }}
          className="text-[13px] text-orange-900/85 font-medium"
        >
          {area} {SEARCH_STEPS[stepIdx].text}
        </motion.div>
      </AnimatePresence>

      {/* 진행 바 */}
      <div className="mt-3 h-1 rounded-full bg-orange-200/50 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-400 to-amber-400"
          initial={{ width: '0%' }}
          animate={{ width: `${((stepIdx + 1) / SEARCH_STEPS.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* 푸터 */}
      <div className="mt-3 text-[10px] text-orange-500/80 flex items-center gap-1">
        <span>✨</span>
        <span>최신 리뷰 확인 중</span>
      </div>
    </motion.div>
  );
}

// ============================================================
// 결과 카드
// ============================================================

const TYPE_COLORS: Record<string, string> = {
  '카페': '#fb923c',
  '식당': '#ef4444',
  '전시관': '#a855f7',
  '바': '#6366f1',
  '공원': '#10b981',
  '기타': '#f59e0b',
};

function getTypeColor(type: string): string {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (type.includes(key)) return color;
  }
  return TYPE_COLORS['기타'];
}

function ResultCard({ data }: { data: DateSpotRecommendationData }) {
  const [showSources, setShowSources] = useState(false);
  const hasSpots = data.spots && data.spots.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="my-3 max-w-[92%] ml-auto mr-2 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fffbf5 0%, #fff0e0 60%, #fef3c7 100%)',
        border: '1px solid rgba(251,146,60,0.28)',
        boxShadow: '0 10px 30px rgba(251,146,60,0.18)',
      }}
    >
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📍</span>
          <span className="text-[11px] font-bold text-orange-700 tracking-wider">LUNA&apos;S PICKS</span>
        </div>
        <p className="text-[13px] text-orange-900/90 font-medium">{data.openerMsg}</p>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-200/60 text-orange-700 font-semibold">
            {data.area}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200/60 text-amber-800 font-semibold">
            {data.vibe}
          </span>
        </div>
      </div>

      {/* 장소 카드들 */}
      {hasSpots ? (
        <div className="px-3 pb-1 flex flex-col gap-2.5">
          {data.spots.map((spot, idx) => (
            <SpotCard key={`${spot.name}-${idx}`} spot={spot} idx={idx} />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-2 text-[11.5px] text-orange-600/80 italic">
          지금은 결과가 잘 안 나왔어 ㅠ
        </div>
      )}

      {/* 루나 코멘트 */}
      {data.lunaComment && (
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-orange-50/70 text-[11.5px] text-orange-800/90 italic text-center">
          &ldquo;{data.lunaComment}&rdquo;
        </div>
      )}

      {/* 출처 */}
      {data.sources && data.sources.length > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="text-[10px] text-orange-600/80 hover:text-orange-700 transition-colors"
          >
            {showSources ? '▼' : '▶'} 출처 {data.sources.length}개
          </button>
          {showSources && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-1 flex flex-col gap-0.5"
            >
              {data.sources.slice(0, 5).map((uri, i) => (
                <a
                  key={i}
                  href={uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-orange-600/80 hover:text-orange-800 truncate"
                >
                  · {uri.replace(/^https?:\/\//, '').slice(0, 50)}
                </a>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Google Search Suggestions (ToS 필수) */}
      {data.renderedContent && (
        <div
          className="px-4 pb-3 text-[10px]"
          dangerouslySetInnerHTML={{ __html: data.renderedContent }}
        />
      )}
    </motion.div>
  );
}

function SpotCard({ spot, idx }: { spot: DateSpot; idx: number }) {
  const color = getTypeColor(spot.type);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.15, type: 'spring', stiffness: 260, damping: 22 }}
      className="p-3 rounded-xl bg-white/70"
      style={{ borderLeft: `4px solid ${color}`, border: '1px solid rgba(251,146,60,0.1)' }}
    >
      {/* 타이틀 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14px] font-bold text-orange-900">{spot.name}</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white"
              style={{ background: color }}
            >
              {spot.type}
            </span>
          </div>
          {spot.address && (
            <div className="mt-0.5 text-[10.5px] text-orange-600/80">📍 {spot.address}</div>
          )}
          {spot.priceHint && (
            <div className="mt-0.5 text-[10.5px] text-orange-600/80">💰 {spot.priceHint}</div>
          )}
        </div>
      </div>

      {/* 분위기 + 리뷰 */}
      {spot.vibe && (
        <div className="mt-2 text-[12px] text-orange-900/90 font-medium">
          &ldquo;{spot.vibe}&rdquo;
        </div>
      )}
      {spot.reviewSummary && (
        <div className="mt-1.5 text-[11px] text-orange-700/85 leading-snug line-clamp-3">
          {spot.reviewSummary}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="mt-2.5 flex items-center gap-1.5">
        <a
          href={spot.mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-[11px] py-1.5 rounded-lg bg-green-500/90 hover:bg-green-600 active:bg-green-700 text-white font-semibold transition-colors"
        >
          🗺️ 지도
        </a>
        {spot.sourceUri && (
          <a
            href={spot.sourceUri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-[11px] py-1.5 rounded-lg bg-orange-200/80 hover:bg-orange-300 text-orange-900 font-semibold transition-colors"
          >
            📖 리뷰
          </a>
        )}
      </div>
    </motion.div>
  );
}
