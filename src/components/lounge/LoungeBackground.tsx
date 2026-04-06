'use client';
import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'lateNight';

const BG_STYLES: Record<TimeOfDay, { gradient: string; particleColor: string; particleCount: number }> = {
  dawn:      { gradient: 'linear-gradient(180deg, #ffecd2 0%, #fcb69f 50%, #f8b4b4 100%)', particleColor: '#fbbf24', particleCount: 8 },
  morning:   { gradient: 'linear-gradient(180deg, #fef9d7 0%, #d4edfc 50%, #c1e4f7 100%)', particleColor: '#fbbf24', particleCount: 6 },
  afternoon: { gradient: 'linear-gradient(180deg, #fff1eb 0%, #e8d5f5 50%, #d4c5f0 100%)', particleColor: '#c084fc', particleCount: 5 },
  evening:   { gradient: 'linear-gradient(180deg, #f97316 0%, #ec4899 40%, #8b5cf6 100%)', particleColor: '#fbbf24', particleCount: 10 },
  night:     { gradient: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)', particleColor: '#fbbf24', particleCount: 20 },
  lateNight: { gradient: 'linear-gradient(180deg, #0c0a1a 0%, #1e1b4b 50%, #312e81 100%)', particleColor: '#d4af37', particleCount: 25 },
};

export function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h < 6) return 'lateNight';
  if (h < 9) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  if (h < 23) return 'night';
  return 'lateNight';
}

export function getTimeGreeting(time: TimeOfDay): string {
  const greetings: Record<TimeOfDay, string> = {
    dawn: '일찍 일어났네! 좋은 아침',
    morning: '좋은 아침~ 오늘 기분은 어때?',
    afternoon: '오후인데 좀 쉬어가려고?',
    evening: '하루 어땠어? 좀 쉬자',
    night: '밤이네... 오늘 하루 수고했어',
    lateNight: '늦은 밤인데... 잠이 안 와?',
  };
  return greetings[time];
}

export default function LoungeBackground({ children }: { children: React.ReactNode }) {
  const timeOfDay = getTimeOfDay();
  const style = BG_STYLES[timeOfDay];
  const isNight = timeOfDay === 'night' || timeOfDay === 'lateNight';

  // Hydration mismatch 방지: Math.random()을 클라이언트에서만 실행
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const particles = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: style.particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 70,
      size: isNight ? 1 + Math.random() * 3 : 3 + Math.random() * 5,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    }));
  }, [mounted, style.particleCount, isNight]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: style.gradient }}>
      {/* 파티클 (낮: 꽃잎/빛, 밤: 별) — 클라이언트에서만 렌더 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: isNight ? '50%' : '30%',
              background: style.particleColor,
              opacity: 0.4,
            }}
            animate={{
              opacity: [0.2, 0.7, 0.2],
              y: isNight ? [0, -2, 0] : [0, 10, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* 시간대 아이콘 */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <motion.span
          className="text-2xl"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          {isNight ? '🌙' : timeOfDay === 'dawn' || timeOfDay === 'evening' ? '🌅' : '☀️'}
        </motion.span>
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
