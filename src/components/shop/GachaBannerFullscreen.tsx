'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { BannerConfig } from '@/types/gacha.types';
import type { SpiritMaster, SpiritRarity } from '@/types/spirit.types';
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

const RARITY_ORDER: Record<SpiritRarity, number> = { L: 0, UR: 1, SR: 2, R: 3, N: 4 };

const RARITY_COLOR: Record<SpiritRarity, string> = {
  L:  '#06b6d4',
  UR: '#f59e0b',
  SR: '#a855f7',
  R:  '#3b82f6',
  N:  '#94a3b8',
};

const RARITY_GLOW: Record<SpiritRarity, string> = {
  L:  'rgba(6,182,212,0.55)',
  UR: 'rgba(245,158,11,0.55)',
  SR: 'rgba(168,85,247,0.45)',
  R:  'rgba(59,130,246,0.30)',
  N:  'rgba(148,163,184,0.20)',
};

export default function GachaBannerFullscreen({
  banner,
  pityCounter,
  totalPulls,
  onPull,
  disabled,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playCountRef = useRef(0);

  const pityPct = Math.min(pityCounter / banner.hardPity, 1);
  const inSoftPity = pityCounter >= banner.softPityStart;

  const pickupIds = new Set(
    [banner.pickupSpiritId, ...(banner.pickupSrIds ?? [])].filter(Boolean) as string[]
  );

  const pickupSpirits = SPIRITS.filter((s) => pickupIds.has(s.id))
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);

  const pool = SPIRITS.filter((s) => s.rarity !== 'L').sort((a, b) => {
    const ap = pickupIds.has(a.id) ? 0 : 1;
    const bp = pickupIds.has(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
  });

  return (
    <>
      <div className="relative flex-1 flex flex-col overflow-hidden">

        {/* ─── 배경 동영상 / 이미지 / Hero ─── */}
        {banner.bannerVideoUrl ? (
          <video
            ref={videoRef}
            src={banner.bannerVideoUrl}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover object-top"
            onEnded={() => {
              playCountRef.current += 1;
              if (playCountRef.current < 3 && videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play();
              }
            }}
          />
        ) : banner.bannerImageUrl ? (
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
              background: banner.accentColor
                ? `radial-gradient(ellipse at top, ${banner.accentColor}55 0%, ${banner.accentColor}25 25%, #0d0820 60%, #050310 100%)`
                : 'radial-gradient(ellipse at top, #7c3aed55 0%, #1a0a2e 30%, #050310 100%)',
            }}
          />
        )}

        {/* 상단 글로우 */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 via-black/15 to-transparent pointer-events-none z-10" />

        <style dangerouslySetInnerHTML={{ __html: `
          .kcasual-title-group {
            font-family: var(--font-black-han-sans), 'Noto Sans KR', sans-serif;
            position: absolute;
            top: 50px;
            left: 0;
            right: 0;
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: center;
            pointer-events: none;
            filter: drop-shadow(0px 8px 4px rgba(0,0,0,0.35));
          }
          
          .k-stroke {
            position: absolute;
            inset: 0;
            z-index: 1;
            color: #5a2846;
            -webkit-text-fill-color: #5a2846;
          }
          .k-fill {
            position: relative;
            z-index: 2;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          
          .k-stroke-sm { font-size: 26px; letter-spacing: -1px; -webkit-text-stroke: 9px #613654; }
          .k-fill-top  { font-size: 26px; letter-spacing: -1px; background-image: linear-gradient(180deg, #ffffff 0%, #e0d4f5 100%); }
          
          .k-stroke-lg { font-size: 54px; letter-spacing: -2px; line-height: 1.1; -webkit-text-stroke: 16px #5a2846; }
          .k-fill-mid  { font-size: 54px; letter-spacing: -2px; line-height: 1.1; background-image: linear-gradient(180deg, #fffce0 0%, #ffe47a 25%, #ffa6c9 65%, #ff6b9d 100%); }
          
          .k-stroke-md { font-size: 34px; letter-spacing: -1px; -webkit-text-stroke: 11px #5a2846; }
          .k-fill-bot  { font-size: 34px; letter-spacing: -1px; background-image: linear-gradient(180deg, #ffffff 0%, #d8cbf0 100%); }
        `}} />

        {/* ─── Hero Title (K-Casual Style) ─── */}
        {banner.id === 'pickup_weekly' && (
          <div className="kcasual-title-group">
            <div className="text-[24px] mb-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] leading-none text-white opacity-95">👑</div>
            
            <div className="relative inline-block whitespace-nowrap mb-[-2px]">
              <div className="k-stroke k-stroke-sm">~ 이달의 픽업 ~</div>
              <div className="k-fill k-fill-top">~ 이달의 픽업 ~</div>
            </div>

            <div className="relative inline-block whitespace-nowrap mb-[-4px]">
              <div className="k-stroke k-stroke-lg">여왕 엘레나</div>
              <div className="k-fill k-fill-mid">여왕 엘레나</div>
            </div>

            <div className="relative inline-block whitespace-nowrap mt-[-2px]">
              <div className="k-stroke k-stroke-md">픽업 뽑기</div>
              <div className="k-fill k-fill-bot">픽업 뽑기</div>
            </div>
          </div>
        )}

        {/* ─── 하단 패널 (네비바 위) ─── */}
        <div
          className="absolute inset-x-0 bottom-0 z-20"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
        >
          {/* 어두운 그라디언트 배경 */}
          <div
            className="px-3 pt-4 pb-3"
            style={{
              background:
                'linear-gradient(to top, rgba(8,4,18,0.97) 0%, rgba(8,4,18,0.92) 50%, rgba(8,4,18,0.6) 88%, transparent 100%)',
            }}
          >

            {/* ─── PICKUP SHOWCASE ─── */}
            {pickupSpirits.length > 0 && (
              <div className="mb-3">
                <SectionHeader gold>✦ PICKUP · 확률 3배 UP ✦</SectionHeader>
                <div className="flex justify-center gap-2.5 mt-2">
                  {pickupSpirits.map((sp, i) => (
                    <PickupCard key={sp.id} spirit={sp} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* ─── POOL GRID ─── */}
            <div className="mb-3">
              <SectionHeader>
                전체 정령 풀
                <span className="ml-1.5 text-white/40 font-bold">{pool.length}종</span>
              </SectionHeader>
              <div
                className="grid gap-1 mt-1.5"
                style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
              >
                {pool.map((sp, i) => (
                  <PoolThumb
                    key={sp.id}
                    spirit={sp}
                    isPickup={pickupIds.has(sp.id)}
                    index={i}
                  />
                ))}
              </div>
            </div>

            {/* ─── PITY BAR ─── */}
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <span className="text-[9px] font-black text-white/60 shrink-0 tracking-wide">
                ✨ UR 피티
              </span>
              <div
                className="flex-1 relative h-[7px] rounded-full overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
                }}
              >
                <motion.div
                  animate={{ width: `${pityPct * 100}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                  className="h-full rounded-full"
                  style={{
                    background: inSoftPity
                      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                      : 'linear-gradient(90deg, #ec4899, #a855f7)',
                    boxShadow: inSoftPity
                      ? '0 0 6px rgba(251,191,36,0.6)'
                      : '0 0 4px rgba(168,85,247,0.45)',
                  }}
                />
                {/* 소프트피티 마커 */}
                <div
                  className="absolute top-0 bottom-0 w-px"
                  style={{
                    left: `${(banner.softPityStart / banner.hardPity) * 100}%`,
                    background: 'rgba(251,191,36,0.85)',
                  }}
                />
              </div>
              <span
                className="text-[10px] font-black tabular-nums shrink-0"
                style={{ color: inSoftPity ? '#fbbf24' : 'rgba(255,255,255,0.85)' }}
              >
                {pityCounter}
                <span className="text-[8px] opacity-50 font-bold">/{banner.hardPity}</span>
              </span>
              <span className="text-[8px] font-bold text-white/35 tabular-nums shrink-0">
                ({totalPulls}회)
              </span>
              <button
                onClick={() => setInfoOpen(true)}
                className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-black"
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                ?
              </button>
            </div>

            {/* ─── BUTTONS ─── */}
            <div className="flex gap-2.5 px-1">
              <SummonButton
                onClick={() => onPull(1)}
                disabled={disabled}
                kind="single"
                cost={banner.costSingle.heartStone ?? 0}
              />
              <SummonButton
                onClick={() => onPull(10)}
                disabled={disabled}
                kind="ten"
                cost={banner.costTen.heartStone ?? 0}
              />
            </div>
          </div>
        </div>
      </div>

      <DuplicateInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
    </>
  );
}

/* ─────────────────────────────────────────────────────────
 *  Sub-components
 * ───────────────────────────────────────────────────────── */

function SectionHeader({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div
        className="h-px flex-1"
        style={{
          background: gold
            ? 'linear-gradient(to right, transparent, rgba(251,191,36,0.45))'
            : 'linear-gradient(to right, transparent, rgba(255,255,255,0.18))',
        }}
      />
      <span
        className="text-[10px] font-black tracking-[0.12em] uppercase whitespace-nowrap"
        style={
          gold
            ? {
                background: 'linear-gradient(135deg, #fef3c7, #fbbf24, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.35))',
              }
            : { color: 'rgba(255,255,255,0.55)' }
        }
      >
        {children}
      </span>
      <div
        className="h-px flex-1"
        style={{
          background: gold
            ? 'linear-gradient(to left, transparent, rgba(251,191,36,0.45))'
            : 'linear-gradient(to left, transparent, rgba(255,255,255,0.18))',
        }}
      />
    </div>
  );
}

function PickupCard({ spirit, index }: { spirit: SpiritMaster; index: number }) {
  const img = getSpiritCharImg(spirit.id);
  const tint = spirit.themeColor;
  const rColor = RARITY_COLOR[spirit.rarity];
  const rGlow = RARITY_GLOW[spirit.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22, delay: index * 0.08 }}
      className="flex flex-col items-center"
      style={{ width: 78 }}
    >
      <div
        className="relative w-full overflow-hidden rounded-[12px]"
        style={{
          aspectRatio: '1 / 1.1',
          background: `linear-gradient(170deg, ${tint}50 0%, ${tint}25 50%, ${tint}10 100%)`,
          border: `1.5px solid ${rColor}`,
          boxShadow: `0 0 16px ${rGlow}, inset 0 0 14px ${tint}1f, inset 0 1px 0 rgba(255,255,255,0.15)`,
        }}
      >
        {/* 광택 레이어 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 30%, transparent 100%)',
          }}
        />

        {/* 등급 뱃지 (좌상단) */}
        <div
          className="absolute top-1 left-1 px-1 py-px rounded-[3px] text-[8px] font-black z-10 leading-none"
          style={{
            background: rColor,
            color: '#fff',
            textShadow: '0 1px 1px rgba(0,0,0,0.3)',
            boxShadow: `0 0 4px ${rGlow}`,
          }}
        >
          {spirit.rarity}
        </div>

        {/* UP 뱃지 (우상단) */}
        <div
          className="absolute top-1 right-1 px-[3px] py-px rounded-[3px] text-[7px] font-black z-10 leading-none"
          style={{
            background: 'linear-gradient(135deg, #fef08a, #f59e0b)',
            color: '#7c2d12',
          }}
        >
          UP↑
        </div>

        {/* 정령 이미지 */}
        <div className="absolute inset-0 flex items-center justify-center pt-3 pb-1.5 px-1">
          {img ? (
            <Image
              src={img}
              alt={spirit.name}
              width={70}
              height={70}
              className="object-contain w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
            />
          ) : (
            <span className="text-3xl">{spirit.emoji}</span>
          )}
        </div>
      </div>

      {/* 이름 */}
      <span
        className="text-[9px] font-bold mt-1 text-center leading-tight w-full px-0.5 truncate"
        style={{
          color: tint,
          textShadow: `0 0 4px ${tint}50, 0 1px 2px rgba(0,0,0,0.6)`,
        }}
      >
        {spirit.name}
      </span>
    </motion.div>
  );
}

function PoolThumb({
  spirit,
  isPickup,
  index,
}: {
  spirit: SpiritMaster;
  isPickup: boolean;
  index: number;
}) {
  const img = getSpiritCharImg(spirit.id);
  const rColor = RARITY_COLOR[spirit.rarity];
  const rGlow = RARITY_GLOW[spirit.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.012, duration: 0.18 }}
      className="relative aspect-square overflow-hidden flex items-center justify-center rounded-[7px]"
      style={{
        background: isPickup
          ? `linear-gradient(135deg, ${spirit.themeColor}40, ${spirit.themeColor}15)`
          : 'rgba(255,255,255,0.06)',
        border: isPickup ? `1.2px solid ${rColor}` : `1px solid ${rColor}55`,
        boxShadow: isPickup ? `0 0 6px ${rGlow}` : 'none',
      }}
    >
      {/* 등급 코너 표시 */}
      <div
        className="absolute top-0 right-0 w-1.5 h-1.5"
        style={{
          background: rColor,
          clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
          boxShadow: isPickup ? `0 0 3px ${rGlow}` : 'none',
        }}
      />

      {/* 이미지 */}
      {img ? (
        <Image
          src={img}
          alt={spirit.name}
          width={36}
          height={36}
          className="object-contain w-full h-full"
        />
      ) : (
        <span className="text-base leading-none">{spirit.emoji}</span>
      )}

      {/* 픽업 표시 */}
      {isPickup && (
        <div
          className="absolute bottom-0 inset-x-0 text-center text-[6px] font-black leading-none py-px"
          style={{
            background: 'linear-gradient(to top, rgba(245,158,11,0.95), rgba(245,158,11,0.5))',
            color: '#fef3c7',
          }}
        >
          UP
        </div>
      )}
    </motion.div>
  );
}

function SummonButton({
  onClick,
  disabled,
  kind,
  cost,
}: {
  onClick: () => void;
  disabled?: boolean;
  kind: 'single' | 'ten';
  cost: number;
}) {
  const isSingle = kind === 'single';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      className="flex-1 py-3 rounded-full font-black transition-all disabled:opacity-40 relative"
      style={
        isSingle
          ? {
              background:
                'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 35%, #0ea5e9 65%, #0369a1 100%)',
              boxShadow:
                '0 6px 20px rgba(14,165,233,0.55), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 0 rgba(3,105,161,0.6)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
            }
          : {
              background:
                'linear-gradient(180deg, #fef9c3 0%, #fde047 25%, #f59e0b 65%, #b45309 100%)',
              boxShadow:
                '0 6px 22px rgba(245,158,11,0.65), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 0 rgba(180,83,9,0.6)',
              color: '#7c2d12',
              border: '1px solid rgba(255,255,255,0.3)',
            }
      }
    >
      {/* 광택 */}
      <div
        className="absolute top-0 inset-x-0 h-1/2 pointer-events-none rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.32), transparent)',
        }}
      />

      <div className="relative">
        <div className="text-[15px] font-black leading-none tracking-tight"
          style={{ textShadow: isSingle ? '0 1px 1px rgba(3,105,161,0.45)' : 'none' }}
        >
          {isSingle ? '1회 뽑기' : '10회 뽑기'}
        </div>
        <div className="text-[11px] font-bold mt-1 flex items-center justify-center gap-0.5 opacity-95">
          <span>💎</span>
          <span className="tabular-nums">{cost.toLocaleString()}</span>
        </div>
      </div>

      {/* 10연차 보장 뱃지 */}
      {!isSingle && (
        <div
          className="absolute -top-1 -right-1 px-1.5 py-[2px] rounded-md text-[8px] font-black leading-none"
          style={{
            background: 'linear-gradient(135deg, #f43f5e, #be123c)',
            color: '#fff',
            boxShadow: '0 2px 6px rgba(244,63,94,0.5)',
            transform: 'rotate(7deg)',
          }}
        >
          R+ 보장
        </div>
      )}
    </motion.button>
  );
}
