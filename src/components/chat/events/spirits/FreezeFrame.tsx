'use client';

/**
 * ❄️ v104.2: FreezeFrame — ice_prince 60초 강제 멈춤
 *
 * 풀스크린 얼음 결정 의식:
 *   - 화면 4 가장자리에서 얼음 결정이 안쪽으로 자라옴 (60s 동안 점진적)
 *   - 중앙 큰 카운트다운 + 3가지 프롬프트 순차 등장 (0s/20s/40s)
 *   - 60s 끝: 얼음이 가운데부터 녹으며 봄빛 차오름 → "이제 결정해도 돼"
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { FreezeFrameData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'invite' | 'freeze' | 'thaw';

export default function FreezeFrame({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as FreezeFrameData;
  const total = data.durationSec ?? 60;
  const [mode, setMode] = useState<Mode>('invite');
  const [remaining, setRemaining] = useState(total);

  useEffect(() => {
    if (mode !== 'freeze') return;
    if (remaining <= 0) {
      setMode('thaw');
      return;
    }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [mode, remaining]);

  const handleStart = () => setMode('freeze');

  const handleUnderstood = () => {
    if (disabled) return;
    onChoose('❄️ 한 번 호흡하고 다시 얘기하자', {
      source: 'spirit_event',
      context: { spiritId: 'ice_prince', eventType: 'SPIRIT_FREEZE_FRAME', choice: 'understood' },
    });
  };

  const progress = ((total - remaining) / total) * 100;       // 0 ~ 100
  // 프롬프트 순차 등장 (각 ⅓ 지점)
  const promptStage = remaining < total * 2 / 3 ? (remaining < total / 3 ? 3 : 2) : 1;

  // ─── INVITE ───
  if (mode === 'invite') {
    return (
      <SpiritEventCard
        spiritId="ice_prince"
        showSkip={false}
        className="!bg-gradient-to-br !from-blue-950 !to-indigo-900 !border-cyan-400/40"
      >
        <div className="text-center py-3 relative">
          {/* 얼음 결정 떠다님 */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-cyan-200/40 text-xl"
                style={{ left: `${10 + i * 20}%`, top: `${(i % 2) * 60}%` }}
                animate={{ rotate: [0, 360], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 8 + i, repeat: Infinity, ease: 'linear' }}
              >
                ❄
              </motion.span>
            ))}
          </div>

          <p className="relative text-cyan-100 text-base font-mono tracking-wider mb-2">
            {data.opener}
          </p>
          <p className="relative text-xs text-cyan-300/80 italic mb-4">
            60초 동안 화면이 얼어붙어 — 카톡도, 카드도, 닫지 못해
          </p>

          <button
            type="button"
            disabled={disabled}
            onClick={handleStart}
            className="w-full py-3 rounded-xl text-sm font-bold bg-cyan-300 text-blue-950 shadow-lg active:scale-[0.98] transition"
          >
            ❄️ 그래, 멈춰
          </button>
        </div>
      </SpiritEventCard>
    );
  }

  // ─── FREEZE (풀스크린) ───
  if (mode === 'freeze') {
    return (
      <AnimatePresence>
        <motion.div
          key="freeze"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #1E3A8A 0%, #0B1B4D 60%, #050A22 100%)',
          }}
        >
          {/* 얼음 결정 — 4 코너에서 안쪽으로 자라옴 */}
          {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, ci) => (
            <motion.div
              key={ci}
              className={`absolute ${pos} pointer-events-none`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1 + (progress / 100) * 3, opacity: 1 }}
              transition={{ duration: 60, ease: 'linear' }}
              style={{
                width: 220,
                height: 220,
                transformOrigin: pos.includes('top') && pos.includes('left') ? '0 0'
                  : pos.includes('top') && pos.includes('right') ? '100% 0'
                  : pos.includes('bottom') && pos.includes('left') ? '0 100%'
                  : '100% 100%',
              }}
            >
              {/* 결정 4갈래 SVG */}
              <svg viewBox="0 0 100 100" className="w-full h-full opacity-70">
                <defs>
                  <radialGradient id={`ice-grad-${ci}`}>
                    <stop offset="0%" stopColor="#A5F3FC" stopOpacity="0.9" />
                    <stop offset="60%" stopColor="#67E8F9" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="45" fill={`url(#ice-grad-${ci})`} />
                {/* 6갈래 결정 */}
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <line
                    key={deg}
                    x1="50" y1="50" x2="50" y2="0"
                    stroke="#A5F3FC"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.6"
                    transform={`rotate(${deg} 50 50)`}
                  />
                ))}
              </svg>
            </motion.div>
          ))}

          {/* 떠다니는 결정 */}
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={`snow-${i}`}
              className="absolute text-cyan-100 select-none"
              style={{
                left: `${(i * 31) % 100}%`,
                top: `${(i * 53) % 100}%`,
                fontSize: 12 + (i % 4) * 6,
              }}
              animate={{
                rotate: 360,
                opacity: [0.3, 0.9, 0.3],
                y: [0, -10, 0],
              }}
              transition={{ duration: 8 + (i % 5), repeat: Infinity, ease: 'linear' }}
            >
              ❄
            </motion.span>
          ))}

          {/* 중앙 컨텐츠 */}
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
            {/* 진행 링 */}
            <div className="relative w-56 h-56 mb-6">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(165,243,252,0.15)" strokeWidth="2" />
                <motion.circle
                  cx="50" cy="50" r="46"
                  fill="none"
                  stroke="#A5F3FC"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46}
                  animate={{ strokeDashoffset: 2 * Math.PI * 46 * (remaining / total) }}
                  transition={{ duration: 1, ease: 'linear' }}
                  style={{ filter: 'drop-shadow(0 0 8px #A5F3FC)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p
                  className="text-7xl font-mono font-bold text-white tabular-nums"
                  style={{ textShadow: '0 0 24px #67E8F9' }}
                >
                  {remaining}
                </p>
                <p className="text-cyan-200/70 text-xs mt-1 tracking-widest">FREEZE</p>
              </div>
            </div>

            {/* opener */}
            <p
              className="text-cyan-100 text-base font-mono tracking-widest text-center mb-5 whitespace-pre"
              style={{ textShadow: '0 0 12px #67E8F9' }}
            >
              {data.opener}
            </p>

            {/* 프롬프트 순차 등장 */}
            <div className="space-y-2.5 w-full max-w-xs">
              {data.prompts.map((p, i) => {
                const shown = i + 1 <= promptStage;
                return (
                  <AnimatePresence key={i}>
                    {shown && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-start gap-2 text-cyan-100"
                      >
                        <span className="text-cyan-300 text-sm font-bold mt-0.5">{i + 1}.</span>
                        <span className="text-sm leading-relaxed">{p}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                );
              })}
            </div>

            <p className="absolute bottom-12 text-cyan-300/50 text-[11px] italic">
              지금 결정 = 내일 후회
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── THAW — 얼음 녹는 의식 ───
  return (
    <AnimatePresence>
      <motion.div
        key="thaw"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[115] flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #DBEAFE 0%, #BFDBFE 50%, #93C5FD 100%)',
        }}
      >
        {/* 가운데서 봄빛 차오름 */}
        <motion.div
          className="absolute inset-0"
          initial={{ background: 'radial-gradient(circle at 50% 50%, rgba(254,243,199,0) 0%, transparent 100%)' }}
          animate={{ background: 'radial-gradient(circle at 50% 50%, rgba(254,243,199,0.7) 0%, transparent 70%)' }}
          transition={{ duration: 1.6 }}
        />

        {/* 떨어지는 물방울 */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-blue-400 text-xl select-none"
            style={{ left: `${(i * 41) % 100}%`, top: '-5%' }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: '110vh', opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3 + (i % 3), delay: i * 0.15, ease: 'easeIn' }}
          >
            💧
          </motion.span>
        ))}

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 180, delay: 0.3 }}
          className="text-7xl mb-4 select-none"
          style={{ filter: 'drop-shadow(0 0 30px rgba(125,211,252,0.7))' }}
        >
          ❄️
        </motion.div>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-blue-900 font-bold text-2xl mb-2"
        >
          이제 결정해도 돼
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-blue-700 text-sm italic mb-8"
        >
          60초 멈춤 성공 — 충동, 한 번 이겼어
        </motion.p>

        <motion.button
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.5 }}
          onClick={handleUnderstood}
          className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold text-base shadow-2xl active:scale-95"
          style={{ boxShadow: '0 8px 30px rgba(59,130,246,0.5)' }}
        >
          ❄️ 다시 얘기하자
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
