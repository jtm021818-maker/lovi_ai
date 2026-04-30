'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LunaActivity, LunaMood } from '@/lib/luna-life/mood';
import { ACTIVITY_LABELS } from '@/lib/luna-life/whispers';
import { useTransparentPixelGuard } from '@/hooks/useTransparentPixelGuard';

interface Props {
  activity: LunaActivity;
  mood: LunaMood;
  onSingleTap: () => void;
  onDoubleTap: () => void;
  size?: number;
  isDeceased?: boolean;
  accentColor: string;
}

/** v102: 룸 전용 스프라이트 — 투명배경 룸 포지셔닝 완료된 단일 이미지 */
const SPRITE_ROOM_DEFAULT = '/background/lunaroom_runa_sleep.png';
/** 사망 fallback 동일 이미지로 처리 (grayscale 필터 적용) */
const SPRITE_FALLBACK = SPRITE_ROOM_DEFAULT;

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
  // v102: 룸 전용 스프라이트 — 모든 활동에 동일 이미지 사용 (투명배경 위치 완성본)
  void mood; // 무드 매핑 미사용 (향후 다중 스프라이트 도입 시 활용)
  const [src, setSrc] = useState(SPRITE_ROOM_DEFAULT);
  const [hearts, setHearts] = useState<number[]>([]);
  const lastClickRef = useRef<number>(0);
  const singleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // v102: 투명 PNG 알파 픽셀 가드 — 캐릭터 픽셀 위에서만 클릭 작동
  const { isOpaque } = useTransparentPixelGuard(src);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 투명 영역 클릭 차단
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    if (!isOpaque(localX, localY, rect.width, rect.height)) {
      return;
    }

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
