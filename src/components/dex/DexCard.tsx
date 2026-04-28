'use client';

/**
 * 🃏 v85.3: DexCard — 도감 그리드 카드
 *
 * 레어도별 광택 프리셋:
 *   N:  매트 회색
 *   R:  파랑 메탈 + 미세 glow
 *   SR: 보라 metallic + glow
 *   UR: 황금 shimmer (keyframes)
 *   L:  무지개 hologram + 회전 그라데이션
 *
 * owned vs locked:
 *   owned: 이모지 + 이름 + Lv 배지 + 월 표시
 *   locked: 검은 실루엣 + 물음표 + "???"
 */

import { motion } from 'framer-motion';
import type { SpiritMaster, UserSpirit, SpiritRarity } from '@/types/spirit.types';
import RarityBadge, { RARITY_META } from './RarityBadge';
import SpiritSprite from '@/components/spirit/SpiritSprite';

interface Props {
  spirit: SpiritMaster;
  owned: UserSpirit | null;
  onClick: () => void;
  index: number;
}

function formatMonth(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const m = String(d.getMonth() + 1);
    return `${d.getFullYear().toString().slice(2)}.${m.padStart(2, '0')}`;
  } catch {
    return null;
  }
}

export default function DexCard({ spirit, owned, onClick, index }: Props) {
  const isOwned = !!owned;
  const meta = RARITY_META[spirit.rarity as SpiritRarity];
  const maxLv = owned?.bondLv === 5;

  // 카드 배경 — 레어도별
  const cardBg = isOwned
    ? `linear-gradient(145deg, #ffffff 0%, ${meta.colorFrom}22 55%, #ffffff 100%)`
    : 'linear-gradient(145deg, #2a2a3a 0%, #1a1a24 100%)';

  const cardBorder = isOwned
    ? `linear-gradient(135deg, ${meta.colorFrom} 0%, ${meta.colorTo} 100%)`
    : 'linear-gradient(135deg, #3a3a4a 0%, #1a1a24 100%)';

  const meetMonth = owned ? formatMonth(owned.firstObtainedAt) : null;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.02 * index,
        type: 'spring',
        stiffness: 260,
        damping: 22,
      }}
      whileHover={isOwned ? { y: -4, scale: 1.04 } : { scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className="relative group"
      style={{
        aspectRatio: '3/4',
        borderRadius: '14px',
        padding: '2px',
        background: cardBorder,
        boxShadow: isOwned
          ? `0 8px 18px ${meta.glow}, 0 2px 4px rgba(0,0,0,0.1)`
          : '0 3px 8px rgba(0,0,0,0.35)',
      }}
    >
      <div
        className="w-full h-full rounded-[12px] flex flex-col items-center justify-center p-2 relative overflow-hidden"
        style={{ background: cardBg }}
      >
        {/* UR shimmer overlay */}
        {isOwned && spirit.rarity === 'UR' && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[12px] opacity-80"
            style={{
              background:
                'linear-gradient(115deg, transparent 40%, rgba(255,235,180,0.55) 50%, transparent 60%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-ur 3.5s linear infinite',
            }}
          />
        )}

        {/* L hologram overlay */}
        {isOwned && spirit.rarity === 'L' && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[12px] opacity-50 mix-blend-overlay"
            style={{
              background:
                'conic-gradient(from 0deg, #f472b6, #a78bfa, #60a5fa, #22d3ee, #fde047, #f472b6)',
              animation: 'spin-hologram 5s linear infinite',
            }}
          />
        )}

        {/* 이미지/스프라이트 (소지) / 실루엣 (미소지) */}
        <div className="relative z-10 flex flex-col items-center">
          {isOwned ? (
            <motion.div
              className="leading-none select-none flex items-center justify-center"
              animate={spirit.rarity === 'L' || spirit.rarity === 'UR' ? { y: [0, -2, 0] } : {}}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <SpiritSprite spirit={spirit} size={64} emojiSize={38} playing={false} />
            </motion.div>
          ) : (
            <div
              className="text-[34px] leading-none"
              style={{
                filter: 'brightness(0) invert(0.3)',
                opacity: 0.75,
              }}
            >
              ❓
            </div>
          )}
        </div>

        {/* 이름 + 메타 */}
        <div className="relative z-10 mt-1 w-full text-center">
          {isOwned ? (
            <>
              <div className="text-[10px] font-bold text-[#3a2a20] truncate">{spirit.name}</div>
              <div className="mt-0.5 flex items-center justify-center gap-1">
                <span className="text-[7.5px] font-bold text-[#6D4C41]">Lv.{owned.bondLv}</span>
                {meetMonth && (
                  <span className="text-[7px] text-[#a1887f]">· {meetMonth}</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-[9px] font-bold text-gray-400 tracking-[0.2em]">???</div>
          )}
        </div>

        {/* 레어도 배지 (좌상단) */}
        <div className="absolute top-1.5 left-1.5 z-20">
          <RarityBadge rarity={spirit.rarity as SpiritRarity} size="xs" />
        </div>

        {/* MAX 배지 (우상단) */}
        {maxLv && (
          <div
            className="absolute top-1.5 right-1.5 z-20 px-1 py-0 rounded-sm text-[7px] font-black text-white"
            style={{
              background: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,235,180,0.5), 0 1px 2px rgba(0,0,0,0.3)',
              letterSpacing: '0.1em',
            }}
          >
            MAX
          </div>
        )}

        {/* 중복 카운트 (하단 좌) */}
        {owned && owned.count > 1 && (
          <div className="absolute bottom-1 left-1.5 z-20 text-[8px] font-black text-pink-500">
            ×{owned.count}
          </div>
        )}

        {/* 백스토리 해금 🔓 (하단 우) */}
        {owned?.backstoryUnlocked && (
          <div className="absolute bottom-1 right-1.5 z-20 text-[9px]" title="비밀 해금">
            📜
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer-ur {
          0% { background-position: -150% 0; }
          100% { background-position: 150% 0; }
        }
        @keyframes spin-hologram {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.button>
  );
}
