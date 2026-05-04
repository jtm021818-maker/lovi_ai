'use client';

/**
 * 🆕 v112: 살아있는 루나 — Idle Animation
 *
 * Finch 패턴: 호흡 + 눈깜빡 + 헤드틸트 = 캐릭터가 "살아있음".
 * 1차 구현은 기존 정적 이미지 (luna_fox_transparent.webp) 위에
 * framer-motion 으로 호흡/회전 simulate.
 * 눈깜빡은 위에 흰색 mask 가 잠깐 덮음 (cheap trick).
 *
 * Activity 별 emoji 풍선이 옆에 가끔 떠오름 (5초 주기).
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { LunaActivity, LunaMood } from '@/lib/luna-life/mood';
import { triggerHaptic } from '@/lib/haptic';

interface Props {
  activity: LunaActivity;
  mood: LunaMood;
  size?: 'sm' | 'md' | 'lg';
  onTap?: () => void;
}

const SIZE_PX: Record<NonNullable<Props['size']>, number> = {
  sm: 48,
  md: 64,
  lg: 80,
};

// ─── Activity → emoji 매핑 ─────────────────────────────────────────────
const ACTIVITY_EMOJI: Record<LunaActivity, string> = {
  sipping_tea: '☕',
  reading: '📖',
  drawing: '🎨',
  gazing_window: '🪟',
  cuddling_cat: '🐱',
  on_phone: '📱',
  stretching: '🙆',
  sleeping: '💤',
};

// 충격적인 짧은 반응 — 탭 시 가끔 (10%)
const TAP_REACTIONS = ['?', '💜', 'ㅋㅋ', '!', '?!'];

export default function LunaIdleCharacter({
  activity,
  mood,
  size = 'md',
  onTap,
}: Props) {
  const px = SIZE_PX[size];
  const [blinking, setBlinking] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [reactionText, setReactionText] = useState<string | null>(null);
  const blinkTimer = useRef<NodeJS.Timeout | null>(null);

  // 눈 깜빡 — 4~7초 랜덤 간격, 120ms
  useEffect(() => {
    function scheduleBlink() {
      const next = 4000 + Math.random() * 3000;
      blinkTimer.current = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => {
          setBlinking(false);
          scheduleBlink();
        }, 120);
      }, next);
    }
    scheduleBlink();
    return () => {
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, []);

  // Activity 풍선 — 5초마다 살짝 떠올랐다 사라짐
  useEffect(() => {
    const t = setInterval(() => {
      setShowActivity(true);
      setTimeout(() => setShowActivity(false), 1800);
    }, 5500);
    return () => clearInterval(t);
  }, [activity]);

  function handleTap() {
    triggerHaptic('light');
    onTap?.();
    // 10% 확률로 짧은 반응 풍선
    if (Math.random() < 0.25) {
      const r = TAP_REACTIONS[Math.floor(Math.random() * TAP_REACTIONS.length)];
      setReactionText(r);
      setTimeout(() => setReactionText(null), 900);
    }
  }

  // mood 별 미세 회전 패턴 (헤드 틸트)
  const tiltPattern: number[] = (() => {
    switch (mood) {
      case 'sleepy':
        return [0, -2, 0, -3, 0]; // 졸린 듯 살짝
      case 'wistful':
        return [0, -3, -1, 0]; // 한쪽으로 기운 듯
      case 'playful':
        return [0, -4, 0, 4, 0]; // 까불대듯
      case 'thoughtful':
        return [0, 2, 0, -2, 0]; // 생각 중
      default:
        return [0, -2, 0, 2, 0]; // 기본 부드럽게
    }
  })();

  return (
    <div className="relative inline-block" style={{ width: px, height: px }}>
      {/* 헤드 틸트 + 호흡 — 외부 wrapper */}
      <motion.div
        className="relative w-full h-full cursor-pointer"
        animate={{
          rotate: tiltPattern,
          scale: [1, 1.025, 1, 1.015, 1],
        }}
        transition={{
          rotate: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
          scale: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
        }}
        whileTap={{ scale: 0.92 }}
        onClick={handleTap}
      >
        {/* 캐릭터 이미지 */}
        <div
          className="w-full h-full overflow-hidden bg-[#F4EFE6]"
          style={{
            borderRadius: '50% 42% 58% 48% / 58% 50% 42% 52%',
            border: '1.5px solid rgba(244,114,182,0.55)',
            boxShadow: '0 3px 10px rgba(251,113,133,0.25)',
          }}
        >
          <img
            src="/luna_fox_transparent.webp"
            alt="루나"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 눈 깜빡 mask — 위쪽 절반 덮음 (트릭) */}
        <AnimatePresence>
          {blinking && (
            <motion.div
              key="blink"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ duration: 0.07 }}
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: '38%',
                height: '14%',
                background:
                  'linear-gradient(180deg, rgba(244,239,230,0.92), rgba(244,239,230,0.78))',
                borderRadius: '40%',
                transformOrigin: 'center',
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Activity emoji 풍선 — 옆에 가끔 떠오름 */}
      <AnimatePresence>
        {showActivity && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 6, scale: 0.7 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.85 }}
            transition={{ duration: 0.4 }}
            className="absolute -top-1 -right-2 z-10 pointer-events-none"
          >
            <div
              className="bg-white/95 rounded-full shadow-md px-1.5 py-0.5 text-[12px]"
              style={{
                boxShadow: '0 2px 8px rgba(180,80,140,0.18)',
                border: '1px solid rgba(255,200,220,0.6)',
              }}
            >
              {ACTIVITY_EMOJI[activity]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 탭 시 반응 풍선 */}
      <AnimatePresence>
        {reactionText && (
          <motion.div
            key="reaction"
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 1, y: -22, scale: 1 }}
            exit={{ opacity: 0, y: -32, scale: 0.85 }}
            transition={{ duration: 0.45 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <div
              className="bg-white rounded-full shadow-md px-2 py-0.5 text-[11px] font-bold text-[#5D4037] whitespace-nowrap"
              style={{
                boxShadow: '0 2px 8px rgba(180,80,140,0.22)',
                border: '1.5px solid rgba(255,200,220,0.7)',
              }}
            >
              {reactionText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
