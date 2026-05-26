'use client';

/**
 * v119.5 — 관계 단계 진입 풀스크린 의식 모먼트.
 *
 * 시퀀스 (단계별 차이는 STAGE_COPY 와 MOMENT_DURATIONS 로 변주):
 *  1. 어두워짐 (radial — 단계 컬러)
 *  2. ShootingStars 배경 + Sparkles 다수
 *  3. StageIllustration 가운데 등장 (큰 사이즈)
 *  4. "이제 우리는 ○○ 사이" 손글씨 페이드 인
 *  5. (Lv.5) "네임카드 수령" + 유저 닉네임
 *  6. canvas-confetti 폭죽 (단계 컬러)
 *  7. 햅틱 + playSound('sparkle')
 *  8. 자동 페이드 또는 "확인" 버튼
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkle, X as CloseIcon } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';
import {
  HANDWRITE_FONT,
  getStageColor,
  MOMENT_DURATIONS,
} from '@/lib/luna-life/relationship-tokens';
import StageIllustration from './StageIllustration';
import Sparkles from './effects/Sparkles';
import ShootingStars from './effects/ShootingStars';

interface Props {
  /** 재생할 단계 — null 이면 비활성 */
  level: number | null;
  /** 모먼트 종료 콜백 */
  onClose: () => void;
  /** 유저 닉네임 — Lv.5 네임카드용 */
  userDisplayName?: string;
}

/**
 * 단계별 카피 변주 — 단순 호칭이 아닌 "이제 우리는…" 결.
 */
const STAGE_COPY: Record<number, { hero: string; sub: string; tag: string }> = {
  2: { hero: '이제 우리는\n아는 사이',         sub: '별 두 개가 이어졌어',     tag: 'Lv 2 unlocked' },
  3: { hero: '이제 우리는\n친구',              sub: '달이 우릴 비춰',          tag: 'Lv 3 unlocked' },
  4: { hero: '이제 우리는\n단짝',              sub: '은하수가 흘러',            tag: 'Lv 4 unlocked' },
  5: { hero: '이제 우리는\n소중한 사람',        sub: '우리만의 우주가 있어',    tag: 'Lv 5 unlocked' },
};

export default function StageTransitionMoment({
  level, onClose, userDisplayName,
}: Props) {
  return (
    <AnimatePresence>
      {level != null && (
        <MomentInner key={level} level={level} onClose={onClose} userDisplayName={userDisplayName} />
      )}
    </AnimatePresence>
  );
}

function MomentInner({
  level, onClose, userDisplayName,
}: { level: number; onClose: () => void; userDisplayName?: string }) {
  const color = getStageColor(level);
  const dur = MOMENT_DURATIONS[level] ?? MOMENT_DURATIONS[3];
  const copy = STAGE_COPY[level] ?? STAGE_COPY[3];
  const closingRef = useRef(false);

  // 햅틱 + 사운드 + 컨페티 + 자동 종료
  useEffect(() => {
    triggerHaptic('medium');
    playSound('sparkle');

    // confetti — 단계 컬러로 톤. Lv.5 는 골드 + 가장 화려.
    const palettes: Record<number, string[]> = {
      2: ['#E8A4B8', '#F5D38A', '#D89AC4'],
      3: ['#A88AD6', '#D7C5F0', '#9D7BC4'],
      4: ['#7A6FC4', '#E0D0FF', '#F5D38A'],
      5: ['#F5D38A', '#FFE9B8', '#FFB8E0', '#FFFFFF'],
    };
    const colors = palettes[level] ?? palettes[3];

    const fireConfetti = () => {
      const baseOpts: confetti.Options = {
        spread: 70,
        startVelocity: 38,
        scalar: 0.95,
        ticks: 220,
        gravity: 0.85,
        colors,
        disableForReducedMotion: true,
        zIndex: 9999,
      };
      // 좌우 동시 발사
      confetti({ ...baseOpts, origin: { x: 0.2, y: 0.55 }, angle: 60 });
      confetti({ ...baseOpts, origin: { x: 0.8, y: 0.55 }, angle: 120 });
      if (level >= 4) {
        // 가운데에서 위로 — 큰 모먼트
        setTimeout(() => {
          confetti({ ...baseOpts, particleCount: 150, spread: 100, origin: { x: 0.5, y: 0.4 }, angle: 90, startVelocity: 50 });
        }, 350);
      }
      if (level === 5) {
        // 두 번째 폭발 — 골드 추가
        setTimeout(() => {
          confetti({
            ...baseOpts,
            particleCount: 180,
            spread: 130,
            origin: { x: 0.5, y: 0.45 },
            angle: 90,
            startVelocity: 55,
            colors: ['#F5D38A', '#FFE9B8', '#FFFFFF', '#E8B068'],
          });
        }, 900);
      }
    };

    const confettiTimer = setTimeout(fireConfetti, dur.reveal + 100);
    const autoClose = setTimeout(() => {
      if (!closingRef.current) {
        closingRef.current = true;
        onClose();
      }
    }, dur.total + 600);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(autoClose);
    };
  }, [level, dur, onClose]);

  const handleManualClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    triggerHaptic('selection');
    onClose();
  };

  const isCosmos = level === 5;
  const heroSize = isCosmos ? 220 : 200;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      role="dialog"
      aria-modal="true"
      aria-label={copy.tag}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(ellipse at 50% 40%, ${color.bg[0]}EE 0%, ${color.bg[2]}F2 55%, #0B0A28FA 100%)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={handleManualClose}
    >
      {/* 배경 별/별똥별 */}
      <Sparkles count={isCosmos ? 60 : 40} color={color.glow} sizeRange={[0.5, isCosmos ? 2.4 : 1.8]} opacityRange={[0.3, 1]} seed={level * 41} twinkleDuration={2.4} />
      <ShootingStars count={isCosmos ? 4 : 3} color={isCosmos ? '#F5D38A' : color.glow} interval={isCosmos ? 2.0 : 2.8} seed={level * 23} />

      {/* 닫기 */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleManualClose(); }}
        aria-label="닫기"
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          width: 36, height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.20)',
          color: isCosmos ? '#FAF6E8' : color.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          cursor: 'pointer',
        }}
      >
        <CloseIcon size={18} weight="thin" />
      </button>

      {/* 메인 컨텐츠 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        {/* 상단 라벨 — "Lv X unlocked" */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            padding: '3px 10px 4px',
            borderRadius: 999,
            background: isCosmos ? 'rgba(245,211,138,0.18)' : 'rgba(255,255,255,0.18)',
            border: `1px solid ${color.accent}77`,
            fontFamily: HANDWRITE_FONT,
            fontSize: 10.5,
            color: isCosmos ? '#F5D38A' : color.ink,
            letterSpacing: '0.08em',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Sparkle size={10} weight="fill" color={color.accent} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {copy.tag}
        </motion.div>

        {/* 일러스트 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.85, ease: [0.22, 0.61, 0.36, 1] }}
          style={{
            width: heroSize, height: heroSize,
            borderRadius: 22,
            overflow: 'hidden',
            border: `1.5px solid ${color.accent}88`,
            background: isCosmos ? '#0F0E2A' : `${color.bg[2]}cc`,
            boxShadow: isCosmos
              ? `0 12px 40px ${color.stamp}99, 0 0 60px ${color.glow}66, inset 0 0 0 1px rgba(255,255,255,0.20)`
              : `0 10px 30px ${color.accent}55, inset 0 0 0 1px rgba(255,255,255,0.40)`,
          }}
        >
          <StageIllustration level={level} size={heroSize} variant="hero" show />
        </motion.div>

        {/* 메인 카피 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          style={{
            fontFamily: HANDWRITE_FONT,
            fontSize: isCosmos ? 30 : 26,
            fontWeight: 700,
            color: isCosmos ? '#FAF6E8' : color.ink,
            lineHeight: 1.25,
            textAlign: 'center',
            letterSpacing: '-0.01em',
            textShadow: isCosmos
              ? `0 0 20px ${color.glow}88, 0 2px 0 rgba(0,0,0,0.30)`
              : '0 1px 0 rgba(255,255,255,0.55)',
            whiteSpace: 'pre-line',
          }}
        >
          {copy.hero}
        </motion.div>

        {/* 부제 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.85, duration: 0.6 }}
          style={{
            fontFamily: HANDWRITE_FONT,
            fontSize: 14,
            color: isCosmos ? color.glow : `${color.ink}cc`,
            textAlign: 'center',
          }}
        >
          {copy.sub}
        </motion.div>

        {/* Lv.5 — 네임카드 */}
        {isCosmos && userDisplayName && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.1, duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              marginTop: 4,
              padding: '10px 20px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #F5D38A 0%, #E8B068 60%, #C9A05C 100%)',
              border: '1px solid rgba(255,233,184,0.50)',
              boxShadow: '0 6px 20px rgba(245,211,138,0.40), inset 0 0 0 1px rgba(255,255,255,0.40)',
              fontFamily: HANDWRITE_FONT,
              fontSize: 14,
              fontWeight: 700,
              color: '#3A2E78',
              letterSpacing: '0.04em',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400, marginBottom: 2 }}>
              우리만의 네임카드
            </div>
            ✦ {userDisplayName} ✦
          </motion.div>
        )}

        {/* 안내 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          style={{
            marginTop: 8,
            fontFamily: HANDWRITE_FONT,
            fontSize: 10.5,
            color: isCosmos ? color.glow : `${color.ink}99`,
            letterSpacing: '0.04em',
          }}
        >
          화면을 톡 — 닫기
        </motion.div>
      </div>
    </motion.div>
  );
}
