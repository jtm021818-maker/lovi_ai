'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { BannerConfig, BannerBadge } from '@/types/gacha.types';
import { SPIRITS } from '@/data/spirits';
import { getSpiritCharImg } from '@/data/spirit-sprites';
import DuplicateInfoSheet from './DuplicateInfoSheet';

interface Props {
  banner: BannerConfig;
  pityCounter: number;
  totalPulls: number;
  onPull: (count: 1 | 10) => void;
  disabled?: boolean;
}

const BADGE_LABEL: Record<BannerBadge, string> = {
  PICKUP: '★ PICKUP',
  LIMITED: '⏳ LIMITED',
  NEW:    '✦ NEW',
  SALE:   '💸 SALE',
};

const BADGE_STYLE: Record<BannerBadge, string> = {
  PICKUP:  'from-amber-400 to-orange-500',
  LIMITED: 'from-rose-500 to-pink-600',
  NEW:     'from-emerald-400 to-teal-500',
  SALE:    'from-violet-500 to-purple-600',
};

export default function GachaBannerCard({
  banner,
  pityCounter,
  totalPulls,
  onPull,
  disabled,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  const accent = banner.accentColor ?? '#DB2777';
  const pityPct = Math.min(pityCounter / banner.hardPity, 1);
  const softPct = banner.softPityStart / banner.hardPity;
  const inSoftPity = pityCounter >= banner.softPityStart;

  const pickupUR = banner.pickupSpiritId
    ? SPIRITS.find((s) => s.id === banner.pickupSpiritId)
    : null;
  const pickupSRs = banner.pickupSrIds
    ? SPIRITS.filter((s) => banner.pickupSrIds!.includes(s.id))
    : [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="rounded-3xl overflow-hidden"
        style={{
          background: '#fff',
          boxShadow: `0 4px 28px ${accent}22, 0 1px 4px rgba(0,0,0,0.08)`,
          border: `1.5px solid ${accent}28`,
        }}
      >
        {/* ── 배너 이미지 히어로 ── */}
        <div className="relative h-44 overflow-hidden">
          {banner.bannerImageUrl ? (
            <>
              <Image
                src={banner.bannerImageUrl}
                alt={banner.name}
                fill
                className="object-cover object-center"
                priority
                sizes="(max-width: 480px) 100vw, 480px"
              />
              {/* 하단 페이드 — 텍스트 가독성 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              {/* 설명 */}
              <p className="absolute bottom-3 left-4 right-14 text-[11px] text-white/85 leading-snug drop-shadow-sm">
                {banner.description}
              </p>
            </>
          ) : (
            /* 이미지 없는 배너 — 그라디언트 fallback */
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1"
              style={{
                background: `linear-gradient(135deg, ${accent}55 0%, ${accent}99 100%)`,
              }}
            >
              <span className="text-4xl mb-1">
                {banner.id === 'pickup_weekly' ? '⭐' : '✨'}
              </span>
              <div className="text-[22px] font-black text-white drop-shadow text-center px-6">
                {banner.name}
              </div>
              <div className="text-[11px] text-white/80 text-center px-8 leading-snug">
                {banner.description}
              </div>
            </div>
          )}

          {/* 배지 */}
          {banner.bannerBadge && (
            <div
              className={`absolute top-3 left-3 px-2.5 py-[3px] rounded-full text-[10px] font-black tracking-wide text-white shadow-md bg-gradient-to-r ${BADGE_STYLE[banner.bannerBadge]}`}
            >
              {BADGE_LABEL[banner.bannerBadge]}
            </div>
          )}

          {/* 기간 한정 라벨 */}
          {banner.validUntil && (
            <div className="absolute top-3 right-3 px-2 py-[3px] rounded-full bg-black/45 backdrop-blur-sm text-[9px] text-white/90 font-bold">
              기간 한정
            </div>
          )}
        </div>

        {/* ── 픽업 정령 행 (픽업 배너만) ── */}
        {(pickupUR || pickupSRs.length > 0) && (
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{
              background: `linear-gradient(90deg, ${accent}12 0%, transparent 100%)`,
              borderBottom: `1px solid ${accent}18`,
            }}
          >
            <span className="text-[9px] font-black tracking-widest text-gray-400 uppercase shrink-0">
              PICKUP
            </span>

            <div className="flex items-center gap-2">
              {/* UR 픽업 */}
              {pickupUR && (() => {
                const img = getSpiritCharImg(pickupUR.id);
                return (
                  <div className="relative">
                    <div
                      className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center text-xl"
                      style={{
                        background: `linear-gradient(135deg, ${pickupUR.themeColor}35, ${pickupUR.themeColor}18)`,
                        border: `1.5px solid ${pickupUR.themeColor}70`,
                        boxShadow: `0 0 10px ${pickupUR.themeColor}45`,
                      }}
                    >
                      {img
                        ? <Image src={img} alt={pickupUR.name} width={44} height={44} className="object-cover w-full h-full" />
                        : <span>{pickupUR.emoji}</span>
                      }
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 px-1 py-px rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-[7px] font-black text-white shadow">
                      UR
                    </div>
                  </div>
                );
              })()}

              {/* SR 픽업들 */}
              {pickupSRs.map((spirit) => {
                const img = getSpiritCharImg(spirit.id);
                return (
                  <div key={spirit.id} className="relative">
                    <div
                      className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-lg"
                      style={{
                        background: `linear-gradient(135deg, ${spirit.themeColor}28, ${spirit.themeColor}12)`,
                        border: `1px solid ${spirit.themeColor}55`,
                      }}
                    >
                      {img
                        ? <Image src={img} alt={spirit.name} width={40} height={40} className="object-cover w-full h-full" />
                        : <span>{spirit.emoji}</span>
                      }
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 px-1 py-px rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-[7px] font-black text-white shadow">
                      SR
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ml-auto text-[10px] font-black" style={{ color: accent }}>
              확률 3배↑
            </div>
          </div>
        )}

        {/* ── UR 피티 바 ── */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black text-gray-500">✨ UR 피티</span>
            <span
              className="text-[11px] font-black tabular-nums"
              style={{ color: inSoftPity ? '#f59e0b' : accent }}
            >
              {pityCounter}
              <span className="text-[9px] font-bold text-gray-400"> / {banner.hardPity}</span>
            </span>
          </div>

          {/* 피티 트랙 */}
          <div className="relative h-2 rounded-full bg-gray-100 overflow-visible">
            {/* 소프트피티 마커 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-px h-3 z-10"
              style={{ left: `${softPct * 100}%`, background: '#fbbf24aa' }}
            />
            {/* 채워진 바 */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${pityPct * 100}%` }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                className="h-full rounded-full"
                style={{
                  background: inSoftPity
                    ? 'linear-gradient(90deg, #f472b6, #fbbf24)'
                    : `linear-gradient(90deg, ${accent}bb, ${accent})`,
                }}
              />
            </div>
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-gray-400">총 {totalPulls}회 소환</span>
            <span className="text-[8px] text-amber-500 font-bold">
              소프트피티 {banner.softPityStart}부터
            </span>
          </div>
        </div>

        {/* ── 중복 교감 XP 안내 ── */}
        <div className="px-4 pt-1.5 pb-1">
          <button
            onClick={() => setInfoOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:scale-[0.98] transition-transform"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.10), rgba(236,72,153,0.07))',
              border: '1px solid rgba(251,191,36,0.22)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">💛</span>
              <span className="text-[10px] font-bold text-amber-900">중복 교감 XP</span>
              <div className="flex items-center gap-1 ml-0.5">
                {[
                  { label: 'N', xp: 10,  color: '#9ca3af' },
                  { label: 'R', xp: 20,  color: '#60a5fa' },
                  { label: 'SR', xp: 60, color: '#c084fc' },
                  { label: 'L', xp: 250, color: '#06b6d4' },
                ].map((r) => (
                  <span
                    key={r.label}
                    className="text-[9px] font-black tabular-nums"
                    style={{ color: r.color }}
                  >
                    +{r.xp}
                  </span>
                ))}
                <span className="text-[9px] text-amber-900/40">…</span>
              </div>
            </div>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black bg-amber-100 text-amber-700 shrink-0">
              ?
            </div>
          </button>
        </div>

        {/* ── 뽑기 버튼 ── */}
        <div className="px-4 pb-4 pt-2 flex gap-2">
          {/* 1회 */}
          <button
            onClick={() => onPull(1)}
            disabled={disabled}
            className="flex-1 py-3.5 rounded-2xl font-bold text-[13px] active:scale-95 transition-all disabled:opacity-40"
            style={{
              background: '#fff',
              border: `2px solid ${accent}`,
              color: accent,
            }}
          >
            <div>1회 소환</div>
            <div className="text-[10px] font-semibold mt-0.5 opacity-75">
              💎 {banner.costSingle.heartStone}
            </div>
          </button>

          {/* 10회 */}
          <button
            onClick={() => onPull(10)}
            disabled={disabled}
            className="flex-[1.35] py-3.5 rounded-2xl text-white font-black text-[13px] active:scale-95 transition-all disabled:opacity-40 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${accent}ee, ${accent}cc)`,
              boxShadow: `0 4px 18px ${accent}50`,
            }}
          >
            {/* 광택 레이어 */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            <div className="relative">
              <div>10회 소환</div>
              <div className="text-[10px] font-bold mt-0.5 opacity-90">
                💎 {banner.costTen.heartStone} · R+ 보장
              </div>
            </div>
          </button>
        </div>
      </motion.div>

      <DuplicateInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}
