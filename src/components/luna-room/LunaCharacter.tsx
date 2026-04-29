'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LunaActivity, LunaMood } from '@/lib/luna-life/mood';
import { ACTIVITY_LABELS } from '@/lib/luna-life/whispers';

interface Props {
  activity: LunaActivity;
  mood: LunaMood;
  onSingleTap: () => void;
  onDoubleTap: () => void;
  size?: number;
  isDeceased?: boolean;
  accentColor: string;
}

const SPRITE_FALLBACK = '/char_img/luna_1_event.webp';
const SPRITE_SLEEP = '/char_img/luna_sleep.png';

/**
 * 활동 × 무드 → 스프라이트 경로.
 * 사용자 제작 시 `public/luna-room/character/luna_<activity>_<moodPair>.webp` 로 저장.
 * 미존재 시 onError → fallback.
 */
function pickSpriteSrc(activity: LunaActivity, mood: LunaMood): string {
  const base = `/luna-room/character/luna_${activity}`;

  // 무드 → 스프라이트 그룹 매핑 (16장 케이스, 2-3 무드씩 묶음)
  const moodGroup = (() => {
    if (activity === 'sleeping') return mood === 'peaceful' ? 'peaceful' : 'sleepy';
    if (activity === 'stretching') return mood === 'sleepy' ? 'sleepy' : 'bright';
    if (activity === 'sipping_tea') return mood === 'thoughtful' || mood === 'wistful' ? 'thoughtful' : 'warm';
    if (activity === 'reading') return mood === 'wistful' ? 'wistful' : 'warm';
    if (activity === 'drawing') return mood === 'thoughtful' ? 'thoughtful' : 'bright';
    if (activity === 'gazing_window') return mood === 'wistful' || mood === 'thoughtful' ? 'wistful' : 'warm';
    if (activity === 'cuddling_cat') return mood === 'sleepy' ? 'sleepy' : 'warm';
    if (activity === 'on_phone') return mood === 'playful' ? 'playful' : 'warm';
    return 'warm';
  })();

  return `${base}_${moodGroup}.webp`;
}

function ActivityHint({ activity }: { activity: LunaActivity }) {
  // 활동별 작은 보조 모션 (이모지로 fallback — 사용자 sprite에 이미 있을 수도)
  if (activity === 'sipping_tea') {
    return (
      <motion.div
        className="absolute"
        style={{ top: '8%', right: '32%', fontSize: 18 }}
        animate={{ y: [0, -10, -20], opacity: [0, 0.7, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
      >
        ☁️
      </motion.div>
    );
  }
  if (activity === 'sleeping') {
    return (
      <motion.div
        className="absolute"
        style={{ top: '12%', right: '20%', fontSize: 14, color: '#A78BFA' }}
        animate={{ y: [0, -12], opacity: [1, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
      >
        Z
      </motion.div>
    );
  }
  return null;
}

export default function LunaCharacter({
  activity,
  mood,
  onSingleTap,
  onDoubleTap,
  size = 220,
  isDeceased = false,
  accentColor,
}: Props) {
  const [src, setSrc] = useState(() =>
    isDeceased ? SPRITE_FALLBACK : activity === 'sleeping' ? SPRITE_SLEEP : pickSpriteSrc(activity, mood),
  );
  const [hearts, setHearts] = useState<number[]>([]);
  const lastClickRef = useRef<number>(0);
  const singleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    const now = Date.now();
    const since = now - lastClickRef.current;
    lastClickRef.current = now;

    if (since < 350 && singleTimerRef.current) {
      // double tap
      clearTimeout(singleTimerRef.current);
      singleTimerRef.current = null;
      lastClickRef.current = 0;

      const id = now;
      setHearts((h) => [...h, id, id + 1, id + 2]);
      setTimeout(() => setHearts((h) => h.filter((x) => x < now)), 1200);

      onDoubleTap();
      return;
    }

    if (singleTimerRef.current) clearTimeout(singleTimerRef.current);
    singleTimerRef.current = setTimeout(() => {
      singleTimerRef.current = null;
      onSingleTap();
    }, 320);
  };

  const idleAnim = isDeceased
    ? { scale: [1, 1.02, 1], opacity: [0.55, 0.85, 0.55] }
    : activity === 'sleeping'
    ? { scale: [1, 1.015, 1], y: [0, -1, 0] }
    : { scale: [1, 1.008, 1], y: [0, -3, 0] };

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ width: size, height: size }}
      onClick={handleClick}
      role="button"
      aria-label={`루나 — ${ACTIVITY_LABELS[activity]}`}
    >
      {/* glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full -m-4"
        style={{ background: `radial-gradient(circle, ${accentColor}28 0%, transparent 70%)` }}
        animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="relative w-full h-full"
        animate={idleAnim}
        transition={{ duration: activity === 'sleeping' ? 5 : 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={src}
          alt="루나"
          className="w-full h-full object-contain drop-shadow-xl"
          style={{
            filter: isDeceased
              ? 'grayscale(0.7) brightness(0.85) saturate(0.6)'
              : 'brightness(1.02) saturate(1.05)',
          }}
          onError={() => {
            if (src !== SPRITE_FALLBACK) setSrc(SPRITE_FALLBACK);
          }}
          draggable={false}
        />
        <ActivityHint activity={activity} />
      </motion.div>

      {/* 더블탭 하트 */}
      <AnimatePresence>
        {hearts.map((h, i) => (
          <motion.div
            key={h}
            className="absolute pointer-events-none"
            style={{
              left: `${30 + i * 20}%`,
              bottom: '50%',
              fontSize: 18,
            }}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], y: -60, scale: [0.6, 1, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: i * 0.08 }}
          >
            💗
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
