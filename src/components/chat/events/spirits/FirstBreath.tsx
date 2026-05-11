'use client';

/**
 * 🌱 v104.2: FirstBreath — seed_spirit 새싹 자라기 호흡 의식
 *
 * 첫 세션 진입 의식. 4-7-8 호흡과 새싹이 동기로 자라남.
 *   - 들숨(4s) — 새싹 잎이 펴지고 위로 자람
 *   - 멈춤(7s) — 잎 끝에 작은 꽃봉오리가 부풀어 오름
 *   - 날숨(8s) — 꽃이 활짝 피고 화면 가득 꽃잎이 떨어짐
 *
 * 완료시 풀스크린 정원으로 전환.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { FirstBreathData } from '@/engines/spirits/spirit-event-types';

type Phase = 'in' | 'hold' | 'out';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const PHASE_LABEL: Record<Phase, string> = {
  in: '들숨 ─ 새싹이 펴져',
  hold: '잠시 ─ 꽃봉오리가 차',
  out: '날숨 ─ 꽃잎이 흩어져',
};

const PHASE_TIP: Record<Phase, string> = {
  in: '코로 천천히…',
  hold: '잠깐만…',
  out: '입으로 길게…',
};

export default function FirstBreath({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as FirstBreathData;
  const cycle = data.cycle ?? { in: 4, hold: 7, out: 8 };
  const totalRounds = data.rounds ?? 1;

  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>('in');
  const [secLeft, setSecLeft] = useState(cycle.in);
  const [done, setDone] = useState(false);
  const [showGarden, setShowGarden] = useState(false);

  useEffect(() => {
    if (done) return;
    if (secLeft <= 0) {
      if (phase === 'in') { setPhase('hold'); setSecLeft(cycle.hold); return; }
      if (phase === 'hold') { setPhase('out'); setSecLeft(cycle.out); return; }
      if (round < totalRounds) {
        setRound((r) => r + 1);
        setPhase('in');
        setSecLeft(cycle.in);
      } else {
        setDone(true);
        // 0.8s 후 풀스크린 정원
        setTimeout(() => setShowGarden(true), 800);
      }
      return;
    }
    const t = setTimeout(() => setSecLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secLeft, phase, round, totalRounds, cycle.in, cycle.hold, cycle.out, done]);

  const handle = (value: 'done' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'done' ? '🌱 호흡 같이 했어, 시작하자' : '🌱 다음에',
      {
        source: 'spirit_event',
        context: { spiritId: 'seed_spirit', eventType: 'SPIRIT_FIRST_BREATH', choice: value },
      },
    );
  };

  // ─── 풀스크린 정원 완료 ───
  if (showGarden) {
    return (
      <AnimatePresence>
        <motion.div
          key="garden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #FEF9E7 0%, #DCFBE5 50%, #B8E6C5 100%)' }}
        >
          {/* 떠 있는 꽃잎 */}
          {Array.from({ length: 22 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute select-none"
              style={{
                left: `${(i * 41) % 100}%`,
                top: '-5%',
                fontSize: 14 + (i % 3) * 6,
              }}
              initial={{ y: 0, rotate: 0, opacity: 0 }}
              animate={{
                y: '110vh',
                rotate: 360,
                opacity: [0, 0.9, 0.9, 0],
              }}
              transition={{
                duration: 7 + (i % 4),
                delay: (i % 6) * 0.4,
                ease: 'linear',
                repeat: Infinity,
              }}
            >
              {['🌸', '🌼', '🌷', '🍃'][i % 4]}
            </motion.span>
          ))}

          {/* 중앙: 만개한 큰 꽃 */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.2 }}
            className="text-[120px] mb-6 select-none"
            style={{ filter: 'drop-shadow(0 0 30px rgba(72,187,120,0.5))' }}
          >
            🌸
          </motion.div>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-emerald-800 font-bold text-xl mb-2"
          >
            {data.closeMsg ?? '잘했어. 이제 시작하자.'}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-emerald-600 text-sm italic mb-8"
          >
            오늘 이야기, 여기서 시작하자
          </motion.p>

          <motion.button
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.4 }}
            onClick={() => handle('done')}
            className="px-8 py-3 rounded-full bg-emerald-600 text-white font-bold text-base shadow-xl active:scale-95"
            style={{ boxShadow: '0 8px 30px rgba(72,187,120,0.5)' }}
          >
            🌱 시작할게
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── 카드 UI ───
  // 새싹 크기 (들숨↑, hold 최대, 날숨↓)
  const stemScale = phase === 'in' ? 1.0 : phase === 'hold' ? 1.0 : 0.5;
  const stemRotate = phase === 'in' ? 0 : phase === 'hold' ? -3 : 8;
  // 꽃 펴짐 (hold 끝~날숨에서 활짝)
  const flowerScale = phase === 'in' ? 0.2 : phase === 'hold' ? 0.6 : 1;
  // 잎 펼침
  const leafRotateL = phase === 'in' ? -30 : phase === 'hold' ? -55 : -25;
  const leafRotateR = phase === 'in' ? 30 : phase === 'hold' ? 55 : 25;

  return (
    <SpiritEventCard spiritId="seed_spirit" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm text-emerald-700 mb-4">{data.openMsg}</p>

      {/* 새싹 SVG 애니메이션 */}
      <div className="relative flex flex-col items-center justify-center min-h-[200px] gap-4">
        {/* 흙 베이스 */}
        <div className="absolute bottom-12 w-32 h-3 rounded-full bg-gradient-to-t from-amber-800 to-amber-600 opacity-50" />

        {/* 새싹 SVG */}
        <motion.svg
          width="120"
          height="160"
          viewBox="0 0 120 160"
          className="relative"
          animate={{ rotate: stemRotate }}
          transition={{ duration: phase === 'in' ? cycle.in : phase === 'hold' ? 0 : cycle.out, ease: 'easeInOut' }}
        >
          {/* 줄기 */}
          <motion.path
            d="M 60 150 Q 58 100 60 70 Q 62 50 60 30"
            stroke="#48bb78"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            animate={{ scaleY: stemScale, originY: '150px' }}
            transition={{ duration: phase === 'in' ? cycle.in : phase === 'hold' ? 0 : cycle.out, ease: 'easeInOut' }}
          />
          {/* 왼쪽 잎 */}
          <motion.ellipse
            cx="48" cy="90" rx="14" ry="7"
            fill="#68d391"
            animate={{ rotate: leafRotateL }}
            transition={{ duration: phase === 'in' ? cycle.in : cycle.out, ease: 'easeInOut' }}
            style={{ transformOrigin: '60px 90px' }}
          />
          {/* 오른쪽 잎 */}
          <motion.ellipse
            cx="72" cy="80" rx="14" ry="7"
            fill="#68d391"
            animate={{ rotate: leafRotateR }}
            transition={{ duration: phase === 'in' ? cycle.in : cycle.out, ease: 'easeInOut' }}
            style={{ transformOrigin: '60px 80px' }}
          />
          {/* 꽃봉오리/만개 */}
          <motion.g
            animate={{ scale: flowerScale }}
            transition={{ duration: phase === 'hold' ? cycle.hold : cycle.out, ease: 'easeInOut' }}
            style={{ transformOrigin: '60px 30px' }}
          >
            {/* 5장 꽃잎 */}
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse
                key={deg}
                cx="60"
                cy="22"
                rx="6"
                ry="10"
                fill="#f8b6d4"
                transform={`rotate(${deg} 60 30)`}
              />
            ))}
            {/* 꽃 중심 */}
            <circle cx="60" cy="30" r="4" fill="#fbbf24" />
          </motion.g>
        </motion.svg>

        {/* 흩날리는 작은 꽃잎 (날숨 때만) */}
        {phase === 'out' && Array.from({ length: 6 }).map((_, i) => (
          <motion.span
            key={`p-${round}-${i}`}
            className="absolute text-base select-none pointer-events-none"
            style={{ top: 30, left: '50%' }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: (i - 2.5) * 28,
              y: 60 + (i % 3) * 20,
              opacity: [0, 1, 0],
              rotate: i * 60,
            }}
            transition={{ duration: cycle.out, delay: i * 0.1 }}
          >
            🌸
          </motion.span>
        ))}

        {/* 라벨 */}
        <div className="text-center mt-2">
          <p className="text-sm font-bold text-emerald-700">{PHASE_LABEL[phase]}</p>
          <p className="text-xs text-emerald-600 mt-0.5">{PHASE_TIP[phase]}</p>
          <p className="text-[11px] text-gray-500 tabular-nums mt-1">
            {secLeft}초 · {round}/{totalRounds} 라운드
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setDone(true); setShowGarden(true); }}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-emerald-500 text-white shadow active:scale-[0.98] disabled:opacity-50 transition"
        >
          🌱 다 했어
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('skip')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
        >
          ⏭️ 다음에
        </button>
      </div>
    </SpiritEventCard>
  );
}
