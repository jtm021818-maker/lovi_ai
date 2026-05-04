'use client';

/**
 * 🆕 v112: 루나 방 단면 (Glimpse)
 *
 * 컨셉: Bondee 식 룸 단면. 채팅창 위에 작은 방 (110px) 슬라이드 다운.
 * 데이터: 이미 있는 ROOM_BG_IMAGES (v100 디오라마 자산) 차용 + 시간대/날씨 오버레이.
 *
 * 탭 → 햅틱 medium + 루나룸 라우트로 이동.
 */

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import {
  ROOM_BG_IMAGES,
  getRoomBgKey,
  type LifeStage,
} from '@/lib/luna-life';
import type {
  LunaMood,
  LunaTimeBand,
  LunaWeather,
} from '@/lib/luna-life/mood';
import { triggerHaptic } from '@/lib/haptic';

interface Props {
  stage: LifeStage;
  mood: LunaMood;
  timeBand: LunaTimeBand;
  weather?: LunaWeather;
  ageDays: number;
  onTap?: () => void;
}

// ─── 시간대별 컬러 오버레이 ───────────────────────────────────────────
const TIME_OVERLAY: Record<LunaTimeBand, string> = {
  dawn: 'rgba(180,200,240,0.18)',
  morning: 'rgba(255,230,180,0.14)',
  afternoon: 'rgba(255,245,220,0.08)',
  evening: 'rgba(255,180,200,0.20)',
  night: 'rgba(80,60,120,0.32)',
};

// ─── 날씨별 입자 SVG ──────────────────────────────────────────────────
function RainParticles() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[1.5px] h-3 bg-blue-200/70 rounded-full"
          style={{ left: `${(i * 11 + 5) % 100}%`, top: '-12px' }}
          animate={{ y: ['0%', '480%'] }}
          transition={{
            duration: 1.4 + (i % 3) * 0.3,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

function SnowParticles() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-[10px] text-white/85"
          style={{ left: `${(i * 13 + 7) % 100}%`, top: '-12px' }}
          animate={{ y: ['0%', '500%'], x: [0, 6, -6, 0] }}
          transition={{
            duration: 4.5 + (i % 3) * 0.6,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'linear',
          }}
        >
          ❄
        </motion.div>
      ))}
    </div>
  );
}

function SunRay() {
  return (
    <motion.div
      className="pointer-events-none absolute -top-2 -left-2 w-32 h-32"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,235,150,0.4) 0%, rgba(255,235,150,0) 60%)',
        filter: 'blur(2px)',
      }}
      animate={{ opacity: [0.55, 0.85, 0.55] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function StarryParticles() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-[8px] text-yellow-100"
          style={{
            left: `${(i * 8 + 4) % 100}%`,
            top: `${(i * 17) % 80}%`,
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 2 + (i % 4) * 0.4,
            repeat: Infinity,
            delay: i * 0.18,
          }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  );
}

export default function LunaRoomGlimpse({
  stage,
  mood: _mood,
  timeBand,
  weather,
  ageDays: _ageDays,
  onTap,
}: Props) {
  const router = useRouter();
  const bgKey = getRoomBgKey(stage);
  const bgUrl = ROOM_BG_IMAGES[bgKey];
  const overlay = TIME_OVERLAY[timeBand];

  const handleTap = useCallback(() => {
    triggerHaptic('medium');
    if (onTap) {
      onTap();
    } else {
      router.push('/luna-room');
    }
  }, [onTap, router]);

  return (
    <motion.button
      type="button"
      onClick={handleTap}
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, type: 'spring', damping: 18, stiffness: 130 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      className="relative w-full mx-3 mb-2 mt-2 max-w-[calc(100%-1.5rem)] rounded-[20px] overflow-hidden"
      style={{
        height: 96,
        boxShadow:
          '0 4px 18px rgba(120,80,140,0.18), inset 0 0 30px rgba(0,0,0,0.08)',
      }}
      aria-label="루나의 방 보기"
    >
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />

      {/* 시간대 오버레이 */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: overlay }}
      />

      {/* 날씨 효과 */}
      {weather === 'rainy' && <RainParticles />}
      {weather === 'snowy' && <SnowParticles />}
      {weather === 'sunny' && (timeBand === 'morning' || timeBand === 'afternoon') && <SunRay />}
      {weather === 'starry' && <StarryParticles />}

      {/* 좌상단 라벨 */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 z-10">
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-[10px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
        >
          ✦
        </motion.span>
        <span
          className="text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
          style={{
            fontFamily:
              'var(--font-gaegu), Gaegu, "Nanum Pen Script", cursive',
          }}
        >
          루나의 방
        </span>
      </div>

      {/* 우하단 살짝 hint */}
      <div className="absolute bottom-1.5 right-3 z-10">
        <span className="text-[9px] text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
          탭해서 들어가기 →
        </span>
      </div>
    </motion.button>
  );
}
