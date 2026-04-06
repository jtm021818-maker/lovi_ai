'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface TarotStartScreenProps {
  onQuickStart: (type: 'love' | 'daily' | 'free') => void;
}

const QUICK_START_OPTIONS = [
  {
    type: 'love' as const,
    emoji: '💕',
    label: '연애 고민',
    desc: '사랑에 관한 모든 것',
    gradient: 'linear-gradient(135deg, rgba(233,100,148,0.25) 0%, rgba(107,70,193,0.25) 100%)',
    border: 'rgba(233,100,148,0.5)',
    glow: 'rgba(233,100,148,0.2)',
  },
  {
    type: 'daily' as const,
    emoji: '🃏',
    label: '오늘의 카드',
    desc: '오늘 하루의 에너지',
    gradient: 'linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(107,70,193,0.22) 100%)',
    border: 'rgba(212,175,55,0.5)',
    glow: 'rgba(212,175,55,0.2)',
  },
  {
    type: 'free' as const,
    emoji: '✨',
    label: '자유 질문',
    desc: '마음속 이야기를 꺼내봐',
    gradient: 'linear-gradient(135deg, rgba(100,160,233,0.22) 0%, rgba(107,70,193,0.22) 100%)',
    border: 'rgba(100,160,233,0.5)',
    glow: 'rgba(100,160,233,0.2)',
  },
];

// Floating particle positions
const PARTICLES = [
  { x: '12%', y: '18%', size: 4, delay: 0 },
  { x: '85%', y: '12%', size: 3, delay: 0.6 },
  { x: '75%', y: '35%', size: 5, delay: 1.1 },
  { x: '8%', y: '55%', size: 3, delay: 0.3 },
  { x: '92%', y: '60%', size: 4, delay: 0.9 },
  { x: '20%', y: '78%', size: 3, delay: 1.4 },
  { x: '60%', y: '85%', size: 4, delay: 0.5 },
  { x: '45%', y: '10%', size: 2, delay: 1.8 },
  { x: '30%', y: '42%', size: 3, delay: 0.7 },
];

export default function TarotStartScreen({ onQuickStart }: TarotStartScreenProps) {
  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start pt-10 pb-8 px-5 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0d0d2b 0%, #1a1a3e 40%, #2d1b69 100%)' }}
    >
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              background: i % 3 === 0 ? '#d4af37' : i % 3 === 1 ? '#c084fc' : '#93c5fd',
            }}
            animate={{
              opacity: [0.2, 0.9, 0.2],
              scale: [0.8, 1.4, 0.8],
              y: [0, -12, 0],
            }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Moon decoration */}
        <motion.div
          className="absolute"
          style={{ right: '8%', top: '6%' }}
          animate={{ rotate: [0, 8, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span style={{ fontSize: 32, filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.6))' }}>🌙</span>
        </motion.div>

        {/* Star decorations */}
        {['6%', '88%', '50%'].map((left, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute"
            style={{ left, top: i === 0 ? '30%' : i === 1 ? '25%' : '5%' }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.2, 0.9] }}
            transition={{ duration: 2.5 + i * 0.8, repeat: Infinity, delay: i * 0.5 }}
          >
            <span style={{ fontSize: 14, filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' }}>⭐</span>
          </motion.div>
        ))}
      </div>

      {/* Character image */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 mb-4"
      >
        {/* Glow ring behind character */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)', transform: 'scale(1.5)' }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [1.4, 1.7, 1.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="relative rounded-full overflow-hidden border-2"
          style={{ width: 110, height: 110, borderColor: '#d4af37', boxShadow: '0 0 30px rgba(212,175,55,0.4), 0 0 60px rgba(107,70,193,0.3)' }}
        >
          <Image
            src="/taronaong_kakao.png"
            alt="타로냥"
            width={110}
            height={110}
            className="object-cover w-full h-full"
            priority
          />
        </div>
      </motion.div>

      {/* Greeting text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="relative z-10 text-center mb-8"
      >
        <h1
          className="text-[20px] font-extrabold leading-snug mb-1"
          style={{ color: '#ffd54f', textShadow: '0 0 20px rgba(212,175,55,0.5)' }}
        >
          냥~ 오늘은 어떤 이야기를
        </h1>
        <h1
          className="text-[20px] font-extrabold leading-snug"
          style={{ color: '#ffd54f', textShadow: '0 0 20px rgba(212,175,55,0.5)' }}
        >
          들려줄래? 🔮
        </h1>
        <p className="text-[13px] mt-2" style={{ color: '#9b7dd4' }}>
          타로냥이 카드를 준비하고 있어...
        </p>
      </motion.div>

      {/* Quick start buttons */}
      <div className="relative z-10 w-full flex flex-col gap-3 max-w-sm">
        {QUICK_START_OPTIONS.map((option, idx) => (
          <motion.button
            key={option.type}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + idx * 0.1, type: 'spring', stiffness: 300, damping: 26 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onQuickStart(option.type)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-[20px] text-left outline-none cursor-pointer relative overflow-hidden"
            style={{
              background: option.gradient,
              border: `1px solid ${option.border}`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: `0 4px 24px ${option.glow}`,
            }}
          >
            {/* Shimmer on hover */}
            <motion.div
              className="absolute inset-0 rounded-[20px] pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, delay: idx * 1, ease: 'easeInOut' }}
            />

            <span className="text-3xl flex-shrink-0" style={{ filter: `drop-shadow(0 0 8px ${option.border})` }}>
              {option.emoji}
            </span>

            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-extrabold" style={{ color: '#f5f0e8' }}>
                {option.label}
              </span>
              <span className="text-[12px]" style={{ color: '#c8b8f0' }}>
                {option.desc}
              </span>
            </div>

            <motion.span
              className="ml-auto text-[18px] flex-shrink-0"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: idx * 0.4 }}
              style={{ color: option.border }}
            >
              →
            </motion.span>
          </motion.button>
        ))}
      </div>

      {/* Bottom pulsing text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ delay: 0.8, duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 mt-8 text-[12px] font-medium tracking-widest"
        style={{ color: '#9b7dd4' }}
      >
        카드가 기다리고 있어...
      </motion.p>
    </div>
  );
}
