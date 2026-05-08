'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { BannerConfig } from '@/types/gacha.types';
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

const RARITY_ORDER: Record<string, number> = { L: 0, UR: 1, SR: 2, R: 3, N: 4 };

export default function GachaBannerFullscreen({
  banner,
  pityCounter,
  totalPulls,
  onPull,
  disabled,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  const pityPct = Math.min(pityCounter / banner.hardPity, 1);
  const inSoftPity = pityCounter >= banner.softPityStart;

  const pickupIds = new Set(
    [banner.pickupSpiritId, ...(banner.pickupSrIds ?? [])].filter(Boolean) as string[]
  );

  const pool = SPIRITS.filter((s) => s.rarity !== 'L').sort((a, b) => {
    const ap = pickupIds.has(a.id) ? 0 : 1;
    const bp = pickupIds.has(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
  });

  return (
    <>
      <div className="relative flex-1 flex flex-col overflow-hidden">

        {/* ── 배경 이미지 / 그라디언트 ── */}
        {banner.bannerImageUrl ? (
          <Image
            src={banner.bannerImageUrl}
            alt={banner.name}
            fill
            className="object-cover object-top"
            priority
            sizes="100vw"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                banner.accentColor
                  ? `linear-gradient(160deg, ${banner.accentColor}55 0%, #1a0a2e 55%, #0d0618 100%)`
                  : 'linear-gradient(160deg, #7c3aed55 0%, #1a0a2e 55%, #0d0618 100%)',
            }}
          />
        )}

        {/* 상단 어두운 오버레이 (탭 가독성) */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-10" />

        {/* 하단 오버레이 — 정령 그리드 + 버튼 배경 */}
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/95 via-black/75 to-transparent pointer-events-none z-10" />

        {/* ── 정령 그리드 ── */}
        <div className="absolute bottom-[84px] left-0 right-0 z-20 px-3">

          {/* 확률 UP 섹션 구분선 */}
          {pickupIds.size > 0 && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="h-px flex-1" style={{ background: 'rgba(251,191,36,0.3)' }} />
              <span className="text-[9px] font-black tracking-widest" style={{ color: '#fbbf24cc' }}>
                ✦ 확률 UP 정령
              </span>
              <div className="h-px flex-1" style={{ background: 'rgba(251,191,36,0.3)' }} />
            </div>
          )}

          <div
            className="grid gap-1.5 overflow-y-auto"
            style={{
              gridTemplateColumns: 'repeat(5, 1fr)',
              maxHeight: '28vh',
              scrollbarWidth: 'none',
            }}
          >
            {pool.map((spirit, i) => {
              const img = getSpiritCharImg(spirit.id);
              const isPickup = pickupIds.has(spirit.id);

              return (
                <motion.div
                  key={spirit.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.025, duration: 0.2 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  {/* 카드 */}
                  <div
                    className="relative w-full overflow-hidden flex flex-col"
                    style={{
                      aspectRatio: '1 / 1.1',
                      borderRadius: 10,
                      background: isPickup
                        ? `linear-gradient(135deg, ${spirit.themeColor}45, ${spirit.themeColor}25)`
                        : 'rgba(255,255,255,0.10)',
                      border: isPickup
                        ? `1.5px solid ${spirit.themeColor}70`
                        : '1px solid rgba(255,255,255,0.18)',
                      boxShadow: isPickup
                        ? `0 0 10px ${spirit.themeColor}40, inset 0 0 8px ${spirit.themeColor}15`
                        : 'none',
                    }}
                  >
                    {/* 확률 UP 뱃지 */}
                    {isPickup && (
                      <div
                        className="shrink-0 text-center py-[2px] text-[7px] font-black leading-none"
                        style={{
                          background: 'linear-gradient(90deg, #ca8a04cc, #d97706cc)',
                          color: '#fef3c7',
                          letterSpacing: '0.02em',
                        }}
                      >
                        확률 UP!
                      </div>
                    )}

                    {/* 이미지 / 이모지 */}
                    <div className="flex-1 flex items-center justify-center p-0.5">
                      {img ? (
                        <Image
                          src={img}
                          alt={spirit.name}
                          width={52}
                          height={52}
                          className="object-contain w-full h-full"
                        />
                      ) : (
                        <span className="text-2xl leading-none">{spirit.emoji}</span>
                      )}
                    </div>
                  </div>

                  {/* 이름 */}
                  <span
                    className="text-center leading-tight font-semibold w-full px-0.5 truncate"
                    style={{ fontSize: 8, color: isPickup ? '#fde68a' : 'rgba(255,255,255,0.7)' }}
                  >
                    {spirit.name}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── 하단 고정: 피티 + 버튼 ── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 pt-2">

          {/* 피티 행 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-bold shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>
              ✨ UR 피티
            </span>
            <div className="flex-1 relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <motion.div
                animate={{ width: `${pityPct * 100}%` }}
                transition={{ type: 'spring', stiffness: 140 }}
                className="h-full rounded-full"
                style={{
                  background: inSoftPity
                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(90deg, #e879f9, #a855f7)',
                }}
              />
              {/* 소프트피티 마커 */}
              <div
                className="absolute top-0 bottom-0 w-px"
                style={{
                  left: `${(banner.softPityStart / banner.hardPity) * 100}%`,
                  background: 'rgba(251,191,36,0.6)',
                }}
              />
            </div>
            <span
              className="text-[9px] font-black tabular-nums shrink-0"
              style={{ color: inSoftPity ? '#fbbf24' : 'rgba(255,255,255,0.75)' }}
            >
              {pityCounter}/{banner.hardPity}
              <span className="text-[7px] font-normal opacity-50 ml-1">({totalPulls}회)</span>
            </span>
            <button
              onClick={() => setInfoOpen(true)}
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.6)' }}
            >
              ?
            </button>
          </div>

          {/* 뽑기 버튼 */}
          <div className="flex gap-3">
            {/* 1회 뽑기 — 하늘색 */}
            <button
              onClick={() => onPull(1)}
              disabled={disabled}
              className="flex-1 py-3.5 rounded-full font-black text-white active:scale-95 transition-all disabled:opacity-40 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)',
                boxShadow: '0 4px 20px rgba(14,165,233,0.45), 0 1px 0 rgba(255,255,255,0.2) inset',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="text-[15px] font-black">1회 뽑기</div>
                <div className="text-[11px] font-bold opacity-90 mt-0.5">💎 {banner.costSingle.heartStone}</div>
              </div>
            </button>

            {/* 10회 뽑기 — 황금색 */}
            <button
              onClick={() => onPull(10)}
              disabled={disabled}
              className="flex-1 py-3.5 rounded-full font-black text-white active:scale-95 transition-all disabled:opacity-40 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
                boxShadow: '0 4px 20px rgba(245,158,11,0.50), 0 1px 0 rgba(255,255,255,0.25) inset',
                color: '#78350f',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="text-[15px] font-black">10회 뽑기</div>
                <div className="text-[11px] font-bold opacity-80 mt-0.5">💎 {banner.costTen.heartStone}</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <DuplicateInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}
