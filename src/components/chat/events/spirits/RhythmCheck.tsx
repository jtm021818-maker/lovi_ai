'use client';

/**
 * 🥁 v104.2: RhythmCheck — drum_imp 박자 시각화 + 매트로놈 의식
 *
 * 두 단계:
 *   1) diagnose — 두 줄(너/걔) 비트바가 좌→우 흐름. 패턴 라벨 + 진단.
 *   2) slowdown — "두 박자 늦춰볼게" 누르면 매트로놈이 점진적으로 느려지는 4초 의식.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { RhythmCheckData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'diagnose' | 'slowdown';

const PATTERN_LABEL: Record<string, string> = {
  chase: '추격형',
  avoid: '회피형',
  offbeat: '엇박자형',
  sync: '동조형',
};

const PATTERN_COLOR: Record<string, string> = {
  chase: 'from-red-400 to-orange-400',
  avoid: 'from-slate-400 to-blue-400',
  offbeat: 'from-amber-400 to-yellow-400',
  sync: 'from-green-400 to-emerald-400',
};

export default function RhythmCheck({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as RhythmCheckData;
  const [mode, setMode] = useState<Mode>('diagnose');

  const handle = (value: 'tryslow' | 'detail' | 'skip') => {
    if (disabled) return;
    if (value === 'tryslow') { setMode('slowdown'); return; }
    onChoose(
      value === 'detail' ? '🥁 더 자세히 보고 싶어' : '🥁 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'drum_imp',
          eventType: 'SPIRIT_RHYTHM_CHECK',
          choice: value,
          pattern: data.pattern,
        },
      },
    );
  };

  // 비트바 me/partner 분리
  const myBars = data.visualBars.filter((b) => b.who === 'me');
  const partnerBars = data.visualBars.filter((b) => b.who === 'partner');

  // ─── SLOWDOWN — 매트로놈 의식 ───
  if (mode === 'slowdown') {
    return <SlowdownRitual
      drumAdvice={data.drumAdvice}
      onDone={() => {
        onChoose(`🥁 두 박자 늦췄어 — ${data.drumAdvice}`, {
          source: 'spirit_event',
          context: {
            spiritId: 'drum_imp',
            eventType: 'SPIRIT_RHYTHM_CHECK',
            choice: 'tryslow',
            drumAdvice: data.drumAdvice,
          },
        });
      }}
    />;
  }

  return (
    <SpiritEventCard spiritId="drum_imp" onSkip={() => handle('skip')} disabled={disabled}>
      {/* 둥 둥 쿵 인트로 */}
      <motion.p
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-base font-extrabold text-amber-800 mb-3 flex items-center gap-1"
      >
        <motion.span
          animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 1.2 }}
        >🥁</motion.span>
        {data.openerMsg}
      </motion.p>

      {/* 평균 라벨 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
          <p className="text-[10px] text-amber-600/70">너의 박자</p>
          <p className="text-sm font-bold text-amber-700">{data.myAvg}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
          <p className="text-[10px] text-orange-600/70">걔의 박자</p>
          <p className="text-sm font-bold text-orange-700">{data.partnerAvg}</p>
        </div>
      </div>

      {/* 흐르는 비트바 */}
      <div className="bg-white/70 border border-amber-200 rounded-xl p-3 mb-3 overflow-hidden">
        <p className="text-[10px] text-amber-600 mb-2">📊 답장 텀 (시간 흐름 →)</p>
        <FlowingBars myBars={myBars} partnerBars={partnerBars} />
      </div>

      {/* 패턴 카드 */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`bg-gradient-to-r ${PATTERN_COLOR[data.pattern] ?? 'from-amber-400 to-orange-400'} rounded-xl p-3 mb-3 text-white shadow`}
      >
        <p className="text-xs font-bold mb-1 flex items-center gap-1">
          <span className="text-base">{data.patternEmoji}</span>
          <span className="tracking-wider">{PATTERN_LABEL[data.pattern] ?? data.pattern}</span>
        </p>
        <p className="text-sm leading-relaxed">{data.patternDescription}</p>
      </motion.div>

      <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 mb-3">
        <p className="text-xs text-amber-900">💡 <span className="italic">{data.drumAdvice}</span></p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('tryslow')}
          className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow active:scale-[0.98] transition"
        >
          ⏱️ 두 박자 늦춰볼게
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('detail')}
          className="py-2.5 px-3 rounded-xl text-sm font-medium border border-amber-300 text-amber-800 hover:bg-amber-50 transition"
        >
          📊 더 자세히
        </button>
      </div>
    </SpiritEventCard>
  );
}

// ─── 흐르는 비트바 ──────────────────────────────
function FlowingBars({
  myBars, partnerBars,
}: { myBars: { length: number }[]; partnerBars: { length: number }[] }) {
  return (
    <div className="space-y-2">
      {/* 너 (위) */}
      <div>
        <p className="text-[10px] text-amber-700 mb-1">너 ▶</p>
        <div className="relative h-7 flex items-center gap-1">
          {myBars.map((b, i) => (
            <motion.div
              key={i}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: i * 0.12, type: 'spring', stiffness: 180 }}
              style={{
                width: `${b.length * 8 + 8}px`,
                originX: 0,
              }}
              className="h-5 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 shadow"
            />
          ))}
        </div>
      </div>
      {/* 걔 (아래) */}
      <div>
        <p className="text-[10px] text-orange-700 mb-1">걔 ▶</p>
        <div className="relative h-7 flex items-center gap-1">
          {partnerBars.map((b, i) => (
            <motion.div
              key={i}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 180 }}
              style={{
                width: `${b.length * 8 + 8}px`,
                originX: 0,
              }}
              className="h-5 rounded-md bg-gradient-to-r from-orange-400 to-red-400 shadow"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 슬로다운 매트로놈 의식 ──────────────────────
function SlowdownRitual({ drumAdvice, onDone }: { drumAdvice: string; onDone: () => void }) {
  const [bpm, setBpm] = useState(120);
  const [step, setStep] = useState(0); // 0~4

  // BPM 점진적 감소: 120 → 90 → 70 → 55 → 45
  useEffect(() => {
    if (step >= 4) return;
    const t = setTimeout(() => {
      setStep((s) => s + 1);
      setBpm((b) => Math.max(b - 18, 45));
    }, 1100);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <AnimatePresence>
      <motion.div
        key="slowdown"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[115] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)' }}
      >
        {/* 매트로놈 추 */}
        <motion.div
          className="relative w-40 h-56 mb-6 flex items-end justify-center"
        >
          {/* 추 막대 */}
          <motion.div
            className="absolute bottom-12 w-2 h-44 rounded-full bg-amber-800 origin-bottom"
            animate={{ rotate: [-30, 30, -30] }}
            transition={{ duration: 60 / bpm * 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '50% 100%' }}
          >
            {/* 추 머리 */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-amber-900 shadow-lg" />
          </motion.div>
          {/* 베이스 */}
          <div className="w-32 h-10 bg-gradient-to-br from-amber-700 to-amber-900 rounded-lg shadow-xl" />
        </motion.div>

        {/* BPM 라벨 */}
        <motion.div
          key={bpm}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-6"
        >
          <p className="text-5xl font-mono font-extrabold text-amber-900 tabular-nums">
            {bpm}
          </p>
          <p className="text-amber-700 text-xs tracking-widest">BPM</p>
        </motion.div>

        {/* 진행 스텝 */}
        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              animate={{
                backgroundColor: i <= step ? '#92400E' : '#FCD34D',
                scale: i === step ? 1.5 : 1,
              }}
            />
          ))}
        </div>

        <motion.p
          key={`label-${step}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-amber-900 font-bold text-base text-center mb-2 px-6"
        >
          {step === 0 && '둥─둥─쿵 (빠른 박자)'}
          {step === 1 && '둥─둥 (느려지는 중)'}
          {step === 2 && '둥… 둥… (한 박자 늦춤)'}
          {step === 3 && '둥…    둥…    (두 박자)'}
          {step === 4 && '잘했어. 이제 네 박자로 갈래?'}
        </motion.p>

        {step >= 4 && (
          <>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-amber-700 text-sm italic mb-6 text-center px-8"
            >
              💡 {drumAdvice}
            </motion.p>
            <motion.button
              type="button"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={onDone}
              className="px-8 py-3 rounded-full bg-amber-800 text-amber-50 font-bold text-base shadow-2xl active:scale-95"
              style={{ boxShadow: '0 8px 30px rgba(146,64,14,0.4)' }}
            >
              🥁 새 박자로 갈게
            </motion.button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
