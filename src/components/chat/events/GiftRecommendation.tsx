'use client';

/**
 * 🎁 v85: GiftRecommendation — 루나가 골라준 선물 3개
 *
 * 두 상태:
 *   1. GIFT_SEARCHING — LunaSearching 공통 UI
 *   2. GIFT_RECOMMENDATION — 3개 선물 카드 + 쇼핑몰 검색 딥링크
 *
 * 디자인: 체리~핑크 gradient, 카테고리 배지, 2026 트렌드 배지
 */

import { motion } from 'framer-motion';
import type { PhaseEvent, GiftRecommendationData, GiftSearchingData, GiftCard } from '@/types/engine.types';
import LunaSearching from './LunaSearching';

interface Props {
  event: PhaseEvent;
  disabled?: boolean;
}

export default function GiftRecommendation({ event }: Props) {
  if (event.type === 'GIFT_SEARCHING') {
    const data = event.data as unknown as GiftSearchingData;
    return (
      <LunaSearching
        topic="gift"
        label="언니가 선물 골라주는 중"
        subtitle={`${data.occasion} · ${data.relation}`}
      />
    );
  }

  const data = event.data as unknown as GiftRecommendationData;
  return <ResultCard data={data} />;
}

const CATEGORY_COLORS: Record<string, string> = {
  주얼리: '#ec4899',
  포토북: '#a855f7',
  경험권: '#f59e0b',
  각인: '#e11d48',
  DIY: '#14b8a6',
  소품: '#6366f1',
  뷰티: '#f472b6',
  기타: '#fb7185',
};

function getCategoryColor(cat: string): string {
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (cat.includes(key)) return color;
  }
  return CATEGORY_COLORS['기타'];
}

function ResultCard({ data }: { data: GiftRecommendationData }) {
  const has = data.gifts && data.gifts.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="my-3 max-w-[92%] ml-auto mr-2 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 60%, #fce7f3 100%)',
        border: '1px solid rgba(244,63,94,0.22)',
        boxShadow: '0 10px 30px rgba(244,63,94,0.18)',
      }}
    >
      {/* 헤더 — openerMsg 중심 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">🎁</span>
          <span className="text-[10px] font-semibold text-rose-600/80 tracking-wide">언니가 골라봤어</span>
        </div>
        <p className="text-[14px] text-rose-900 font-semibold leading-snug">{data.openerMsg}</p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-200/60 text-rose-700 font-semibold">{data.occasion}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-200/60 text-pink-700 font-semibold">{data.relation}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fuchsia-200/60 text-fuchsia-700 font-semibold">{data.budget}</span>
        </div>
      </div>

      {/* 선물 카드 */}
      {has ? (
        <div className="px-3 pb-1 flex flex-col gap-2.5">
          {data.gifts.map((gift, idx) => (
            <GiftItem key={`${gift.name}-${idx}`} gift={gift} idx={idx} />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-2 text-[11.5px] text-rose-600/80 italic">
          지금은 잘 안 떠오르네 ㅠ
        </div>
      )}

      {/* 루나 한마디 */}
      {data.lunaComment && (
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-rose-50/70 text-[11.5px] text-rose-800/90 italic text-center">
          &ldquo;{data.lunaComment}&rdquo;
        </div>
      )}

    </motion.div>
  );
}

function GiftItem({ gift, idx }: { gift: GiftCard; idx: number }) {
  const color = getCategoryColor(gift.category);
  return (
    <motion.a
      href={gift.searchLink}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.15, type: 'spring', stiffness: 260, damping: 22 }}
      className="block p-3 rounded-xl bg-white/75 hover:bg-white/90 active:bg-white transition-colors"
      style={{ borderLeft: `4px solid ${color}`, border: '1px solid rgba(244,63,94,0.1)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13.5px] font-bold text-rose-900">{gift.name}</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white"
              style={{ background: color }}
            >
              {gift.category}
            </span>
            {gift.trendBadge && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-200/90 text-yellow-800 font-bold">
                ✨ {gift.trendBadge}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[10.5px] text-rose-600/80">💰 {gift.priceRange}</div>
        </div>
        <div className="flex-shrink-0 text-[11px] text-rose-400">🛒</div>
      </div>

      {gift.reason && (
        <div className="mt-1.5 text-[11.5px] text-rose-800/90 leading-snug">
          {gift.reason}
        </div>
      )}
    </motion.a>
  );
}
