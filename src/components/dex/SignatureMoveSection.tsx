'use client';

/**
 * 🎴 v105: SignatureMoveSection — 정령 시그니처 무브 카드 프리뷰
 *
 * 도감 디테일 시트 안의 한 섹션. 정령마다 1장씩 가지는 시그니처 카드의
 * "결" 만 보여준다. 카드 본문 텍스트는 절대 노출하지 않음.
 *
 * 노출 단계:
 *   - Lv.1~2: 실루엣 + cardName="???" + tagline + momentHint (호기심 유발)
 *   - Lv.3+ : 풀 컬러 + cardName 풀 + tagline + 모먼트/케이던스/선택/희소도 4줄
 *   - Lv.5+ : + empowerHint 한 줄 + 외곽 셔머 애니메이션
 *
 * 미소지 정령에선 호출되지 않는다 (SpiritDetailSheet 가 isOwned 가드).
 */

import { motion } from 'framer-motion';
import type { SpiritMaster, UserSpirit, SpiritRarity } from '@/types/spirit.types';
import { getEventPreview } from '@/data/spirit-event-preview';
import { RARITY_META } from './RarityBadge';

interface Props {
  spirit: SpiritMaster;
  owned: UserSpirit;
}

export default function SignatureMoveSection({ spirit, owned }: Props) {
  const preview = getEventPreview(spirit.id);
  if (!preview) return null;

  const rarity = spirit.rarity as SpiritRarity;
  const meta = RARITY_META[rarity];
  const lv = owned.bondLv;
  const isFullReveal = lv >= 3;
  const isEnhanced = lv >= 5;

  // 카드 외곽 보더 그라데이션
  const borderGradient = isFullReveal
    ? `linear-gradient(135deg, ${meta.colorFrom} 0%, ${meta.colorTo} 100%)`
    : 'linear-gradient(135deg, rgba(80,70,100,0.6) 0%, rgba(40,30,60,0.8) 100%)';

  // 카드 본체 배경
  const cardBg = isFullReveal
    ? `linear-gradient(145deg, ${meta.colorFrom}30 0%, ${spirit.themeColor}18 50%, #ffffff 100%)`
    : 'linear-gradient(135deg, rgba(40,30,55,0.92) 0%, rgba(20,15,30,0.97) 100%)';

  // 카드 외곽 글로우
  const cardShadow = isEnhanced
    ? `0 0 22px ${meta.glow}, 0 6px 16px rgba(0,0,0,0.18)`
    : isFullReveal
      ? `0 4px 12px ${meta.glow}`
      : '0 3px 10px rgba(0,0,0,0.35)';

  // 헤더 우측 상태칩
  const statusChip = isEnhanced
    ? { text: '✨ MAX', bg: 'linear-gradient(135deg, #fde68a 0%, #d97706 100%)', color: '#78350f' }
    : isFullReveal
      ? { text: '🔓 Lv.3', bg: 'rgba(255,255,255,0.85)', color: '#7c5738' }
      : { text: '🔒', bg: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.85)' };

  return (
    <div className="mx-4 mb-4">
      <h4 className="text-[11px] font-black tracking-widest text-[#7c5738] mb-0.5">
        💫 이 친구의 고유 이벤트
      </h4>
      <p className="text-[10px] text-[#7c5738]/75 italic mb-1.5 leading-snug">
        Lv.3 부터, 상담 중 알맞은 순간이 오면 이 친구가 직접 찾아와 줘
      </p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 22 }}
        className="relative w-full overflow-hidden"
        style={{
          borderRadius: 16,
          padding: 2,
          background: borderGradient,
          boxShadow: cardShadow,
        }}
      >
        <div
          className="relative w-full rounded-[14px] flex flex-col p-3 overflow-hidden"
          style={{ background: cardBg }}
        >
          {/* Lv.5 셔머 오버레이 */}
          {isEnhanced && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[16px] opacity-70"
              style={{
                background:
                  'linear-gradient(115deg, transparent 38%, rgba(255,235,180,0.5) 50%, transparent 62%)',
                backgroundSize: '220% 100%',
                animation: 'shimmer-signature 6s linear infinite',
                mixBlendMode: 'overlay',
              }}
            />
          )}

          {/* 헤더 — 레어도 라벨 + 상태칩 */}
          <div className="relative z-10 flex items-center justify-between mb-1.5">
            <span
              className="px-1.5 py-0.5 rounded-[3px] text-[8px] font-black tabular-nums"
              style={{
                background: isFullReveal
                  ? `linear-gradient(135deg, ${meta.colorFrom} 0%, ${meta.colorTo} 100%)`
                  : 'rgba(255,255,255,0.12)',
                color: isFullReveal ? meta.textColor : 'rgba(255,255,255,0.65)',
                letterSpacing: '0.15em',
              }}
            >
              {meta.label}
            </span>
            <span
              className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: statusChip.bg, color: statusChip.color }}
            >
              {statusChip.text}
            </span>
          </div>

          {/* 카드 일러스트 + 이름 — 가로 정렬로 압축 */}
          <div className="relative z-10 flex items-center gap-2.5 mb-2">
            <motion.span
              key={isFullReveal ? 'reveal' : 'lock'}
              initial={{ scale: 0.85, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="text-[36px] leading-none select-none flex-shrink-0"
              style={
                isFullReveal
                  ? { filter: isEnhanced ? `drop-shadow(0 0 10px ${meta.glow})` : 'none' }
                  : { filter: 'brightness(0) invert(0.45)', opacity: 0.55 }
              }
            >
              {preview.cardEmoji}
            </motion.span>
            <div className="flex-1 min-w-0">
              <h5
                className="text-[14px] font-black tracking-tight truncate"
                style={{
                  color: isFullReveal ? '#3a2418' : 'rgba(255,255,255,0.78)',
                  letterSpacing: isFullReveal ? '-0.01em' : '0.16em',
                }}
              >
                {isFullReveal ? preview.cardName : '???'}
              </h5>
              <p
                className="text-[10.5px] italic leading-snug mt-0.5"
                style={{ color: isFullReveal ? '#7c5738' : 'rgba(255,255,255,0.68)' }}
              >
                {preview.tagline}
              </p>
            </div>
          </div>

          {/* 정보 줄들 */}
          <div className="relative z-10 space-y-1">
            <InfoLine
              icon="🎬"
              label="등장 순간"
              text={preview.momentHint}
              dim={!isFullReveal}
              fullReveal={isFullReveal}
            />

            {isFullReveal && (
              <>
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 }}
                >
                  <InfoLine icon="⏱️" label="발생 빈도" text={preview.cadenceHint} fullReveal />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.24 }}
                >
                  <InfoLine icon="🎯" label="선택" text={preview.choiceHint} fullReveal />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.30 }}
                >
                  <InfoLine icon="💎" label="희소도" text={preview.rarityNote} fullReveal />
                </motion.div>
              </>
            )}

            {isEnhanced && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-2 px-2 py-1.5 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(253,230,138,0.5) 0%, rgba(217,119,6,0.18) 100%)',
                  border: '1px solid rgba(217,119,6,0.45)',
                }}
              >
                <InfoLine icon="✨" label="강화" text={preview.empowerHint} fullReveal bold />
              </motion.div>
            )}
          </div>

          {/* 푸터 — 잠금/펼쳐짐 캡션 */}
          <div
            className="relative z-10 mt-2 pt-1.5 text-center text-[9.5px]"
            style={{
              borderTop: isFullReveal
                ? '1px dashed rgba(124,87,56,0.25)'
                : '1px dashed rgba(255,255,255,0.18)',
              color: isFullReveal ? '#a1887f' : 'rgba(255,255,255,0.5)',
            }}
          >
            {isFullReveal ? (
              <>지금 이 친구는 상담 중에 찾아올 수 있어 ✨</>
            ) : (
              <>🔒 Lv.3 부터 상담 중에 발생해</>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer-signature {
            0% { background-position: -180% 0; }
            100% { background-position: 180% 0; }
          }
        `}</style>
      </motion.div>
    </div>
  );
}

function InfoLine({
  icon,
  label,
  text,
  dim = false,
  fullReveal = false,
  bold = false,
}: {
  icon: string;
  label?: string;
  text: string;
  dim?: boolean;
  fullReveal?: boolean;
  bold?: boolean;
}) {
  const color = fullReveal
    ? bold
      ? '#78350f'
      : '#3a2418'
    : dim
      ? 'rgba(255,255,255,0.55)'
      : 'rgba(255,255,255,0.78)';
  const labelColor = fullReveal
    ? bold
      ? '#92400e'
      : '#a1887f'
    : 'rgba(255,255,255,0.45)';
  return (
    <div className="flex items-start gap-1.5 leading-snug">
      <span className="text-[11px] flex-shrink-0 mt-px">{icon}</span>
      <span className="text-[11.5px] flex-1" style={{ color, fontWeight: bold ? 700 : 500 }}>
        {label && (
          <span
            className="text-[10px] font-bold mr-1"
            style={{ color: labelColor, letterSpacing: '0.02em' }}
          >
            {label} —
          </span>
        )}
        {text}
      </span>
    </div>
  );
}
