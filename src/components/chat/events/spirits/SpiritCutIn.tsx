'use client';

/**
 * 🧚 v104.2: SpiritCutIn — 정령 발동 컷인 (공통 컴포넌트)
 *
 * 모든 정령 이벤트 카드의 앞단에 등장하는 시그니처 인트로.
 * 등급(N/R/SR/UR)별로 4가지 레이아웃:
 *   - N  (600ms):  화면 하단 인라인 카드 슬라이드 + 작은 sparkle
 *   - R  (1000ms): 하프모달 + 시그니처 컬러 글로우 + 이름 배너
 *   - SR (1600ms): 풀스크린 블랙아웃 + 중앙 정령 + 링 확장 + 입자
 *   - UR (2400ms): 풀스크린 + 별 + 정령 + 보조 텍스트 (왕관/소원 등)
 *
 * 사운드/햅틱은 useSpiritFx 가 담당.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSpirit } from '@/data/spirits';
import type { SpiritId, SpiritRarity } from '@/types/spirit.types';
import { useSpiritFx, CUTIN_DURATION_MS } from '@/hooks/useSpiritFx';

interface Props {
  spiritId: SpiritId;
  /** 명시적 rarity. 생략 시 getSpirit(spiritId).rarity */
  rarity?: SpiritRarity;
  open: boolean;
  onDone: () => void;
  /** 부제목 (UR 전용 — 예: "너의 왕관") */
  subtitle?: string;
}

export function SpiritCutIn({ spiritId, rarity: rarityProp, open, onDone, subtitle }: Props) {
  const master = getSpirit(spiritId);
  const rarity: SpiritRarity = rarityProp ?? master?.rarity ?? 'N';
  const themeColor = master?.themeColor ?? '#A78BFA';
  const emoji = master?.emoji ?? '🧚';
  const name = master?.name ?? '정령';
  const { playCutin } = useSpiritFx({ spiritId, rarity });

  useEffect(() => {
    if (!open) return;
    playCutin();
    const t = setTimeout(onDone, CUTIN_DURATION_MS[rarity]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rarity]);

  if (!open) return null;

  // ─── N 등급: 인라인 하단 카드 ──────────────────────
  if (rarity === 'N') {
    return (
      <AnimatePresence>
        <motion.div
          key="cutin-n"
          className="fixed bottom-24 left-1/2 z-[80] pointer-events-none"
          initial={{ opacity: 0, x: '-50%', y: 30, scale: 0.85 }}
          animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <div
            className="px-4 py-2.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-xl border"
            style={{
              background: `linear-gradient(135deg, ${themeColor}E0, ${themeColor}AA)`,
              borderColor: `${themeColor}40`,
              boxShadow: `0 8px 30px ${themeColor}55, 0 0 0 4px ${themeColor}1a`,
            }}
          >
            <motion.span
              className="text-xl"
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {emoji}
            </motion.span>
            <span className="text-white font-bold text-sm tracking-wide drop-shadow">
              {name} 등장!
            </span>
          </div>
          {/* sparkles */}
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute top-1/2 left-1/2 text-yellow-200 text-xs"
              style={{ originX: 0.5, originY: 0.5 }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{
                x: [0, (i - 1.5) * 40],
                y: [0, (i % 2 === 0 ? -20 : -28)],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
            >
              ✦
            </motion.span>
          ))}
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── R 등급: 하프모달 + 글로우 ──────────────────────
  if (rarity === 'R') {
    return (
      <AnimatePresence>
        <motion.div
          key="cutin-r"
          className="fixed inset-x-0 bottom-0 z-[90] pointer-events-none flex items-end justify-center pb-32"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 후광 글로우 */}
          <motion.div
            className="absolute bottom-32 w-[280px] h-[280px] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${themeColor}aa, transparent 70%)` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.7] }}
            transition={{ duration: 0.8 }}
          />
          <motion.div
            className="relative"
            initial={{ y: 80, scale: 0.7, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* 정령 큰 이모지 */}
            <motion.div
              className="text-7xl text-center mb-2 select-none"
              animate={{ rotate: [0, -10, 10, -5, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.8 }}
              style={{ filter: `drop-shadow(0 0 24px ${themeColor})` }}
            >
              {emoji}
            </motion.div>
            {/* 이름 배너 */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
              className="px-5 py-1.5 rounded-full text-white font-bold text-sm tracking-wider shadow-lg origin-center"
              style={{
                background: `linear-gradient(90deg, ${themeColor}, ${themeColor}cc)`,
                boxShadow: `0 6px 24px ${themeColor}66`,
              }}
            >
              {name} 등장!
            </motion.div>
          </motion.div>
          {/* 입자 */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-base"
              style={{ color: themeColor, left: '50%', bottom: 200 }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{
                x: (i - 3.5) * 50,
                y: -50 - (i % 3) * 40,
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.7],
              }}
              transition={{ duration: 1, delay: 0.2 + i * 0.04 }}
            >
              ✦
            </motion.span>
          ))}
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── SR / UR: 풀스크린 ─────────────────────────────
  const isUR = rarity === 'UR' || rarity === 'L';
  return (
    <AnimatePresence>
      <motion.div
        key={`cutin-${rarity}`}
        className="fixed inset-0 z-[120] flex flex-col items-center justify-center backdrop-blur-md pointer-events-none"
        style={{
          background: isUR
            ? 'radial-gradient(circle at 50% 50%, rgba(20,10,40,0.92), rgba(0,0,0,0.95))'
            : 'rgba(0,0,0,0.78)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* UR: 배경 별 */}
        {isUR && Array.from({ length: 30 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-yellow-100/70 select-none"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 23) % 100}%`,
              fontSize: 4 + (i % 4) * 4,
            }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: (i % 10) * 0.15 }}
          >
            ★
          </motion.span>
        ))}

        {/* 동심원 링 확장 */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`ring-${i}`}
            className="absolute rounded-full border-2"
            style={{
              borderColor: themeColor,
              width: 120,
              height: 120,
            }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 6 + i * 1.5, opacity: 0 }}
            transition={{ duration: 1.6, delay: 0.2 + i * 0.15, ease: 'easeOut' }}
          />
        ))}

        {/* 중앙 후광 */}
        <motion.div
          className="absolute w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${themeColor}80, transparent 60%)` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1.1], opacity: [0, 0.9, 0.7] }}
          transition={{ duration: 1.0 }}
        />

        {/* 정령 이모지 */}
        <motion.div
          className="relative text-[120px] select-none"
          initial={{ scale: 0, rotate: isUR ? -180 : -60 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.15 }}
          style={{ filter: `drop-shadow(0 0 36px ${themeColor})` }}
        >
          {emoji}
        </motion.div>

        {/* 이름 */}
        <motion.h2
          className="relative mt-6 text-white font-extrabold text-3xl tracking-wider drop-shadow-lg"
          style={{ textShadow: `0 0 24px ${themeColor}` }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {name}
        </motion.h2>

        {/* UR 전용 부제 */}
        {isUR && subtitle && (
          <motion.p
            className="relative mt-2 text-white/80 italic text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            {subtitle}
          </motion.p>
        )}

        {/* 상승 입자 */}
        {Array.from({ length: isUR ? 20 : 14 }).map((_, i) => (
          <motion.span
            key={`p-${i}`}
            className="absolute text-base"
            style={{
              color: themeColor,
              left: `${50 + (i - 7) * 6}%`,
              bottom: '40%',
            }}
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{
              y: -200 - (i % 5) * 40,
              opacity: [0, 1, 0],
              scale: [0.5, 1.3, 0.5],
            }}
            transition={{ duration: 1.4, delay: 0.4 + (i % 7) * 0.08 }}
          >
            {isUR && i % 3 === 0 ? '✨' : '✦'}
          </motion.span>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
