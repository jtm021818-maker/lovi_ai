'use client';

/**
 * 📍 v85: DateSpotRecommendation — 루나가 골라준 데이트 장소 2~3곳
 *
 * v84 대비 변경:
 *   - SearchingCard → 공통 <LunaSearching topic="date-spot" />
 *   - 헤더 라벨("LUNA'S PICKS") → openerMsg 중심 재배치
 *   - sources 항상 하단 + 접힌 상태
 */

import { motion } from 'framer-motion';
import type { PhaseEvent, DateSpotRecommendationData, DateSpotSearchingData, DateSpot } from '@/types/engine.types';
import LunaSearching from './LunaSearching';

interface Props {
  event: PhaseEvent;
  disabled?: boolean;
}

export default function DateSpotRecommendation({ event }: Props) {
  if (event.type === 'DATE_SPOT_SEARCHING') {
    const data = event.data as unknown as DateSpotSearchingData;
    return (
      <LunaSearching
        topic="date-spot"
        label="언니가 좋은 데 찾는 중"
        subtitle={`${data.area} · ${data.vibe}`}
      />
    );
  }

  const data = event.data as unknown as DateSpotRecommendationData;
  return <ResultCard data={data} />;
}

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
      {/* 헤더 — openerMsg 중심 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">📍</span>
          <span className="text-[10px] font-semibold text-orange-600/80 tracking-wide">언니가 골라둔 데</span>
        </div>
        <p className="text-[14px] text-orange-900 font-semibold leading-snug">{data.openerMsg}</p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
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
          지금은 잘 안 떠오르네 ㅠ
        </div>
      )}

      {/* 루나 코멘트 */}
      {data.lunaComment && (
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-orange-50/70 text-[11.5px] text-orange-800/90 italic text-center">
          &ldquo;{data.lunaComment}&rdquo;
        </div>
      )}


      {/* Google Search Suggestions (하위 호환 — Brave 는 필요 없음) */}
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

      {spot.vibe && (
        <div className="mt-2 text-[12px] text-orange-900/90 font-medium italic">
          &ldquo;{spot.vibe}&rdquo;
        </div>
      )}
      {spot.reviewSummary && (
        <div className="mt-1.5 text-[11px] text-orange-700/85 leading-snug line-clamp-3">
          {spot.reviewSummary}
        </div>
      )}

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
            📖 후기
          </a>
        )}
      </div>
    </motion.div>
  );
}
