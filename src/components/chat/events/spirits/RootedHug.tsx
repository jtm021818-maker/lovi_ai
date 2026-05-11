'use client';

/**
 * 🌳 v104.2: RootedHug — forest_mom 함께 숲 키우기
 *
 * 5-4-3-2-1 그라운딩을 5단계로 분할. 각 단계 완료시 화면 하단에 큰 나무가 자라남.
 *   - 단계 1: 보이는 것 5개 입력 → 첫 번째 큰 나무
 *   - 단계 2: 만질 수 있는 것 4개 → 두 번째 나무 (왼쪽)
 *   - 단계 3: 들리는 것 3개 → 세 번째 나무 (오른쪽)
 *   - 단계 4: 냄새 2개 → 꽃/풀이 자라남
 *   - 단계 5: 맛 1개 → 새들 + 햇살 + 풀스크린 숲 완성
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { RootedHugData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function RootedHug({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as RootedHugData;
  const groups = data.groups;
  const [step, setStep] = useState(0);              // 0~groups.length, groups.length 이상이면 forest
  const [inputs, setInputs] = useState<Record<number, string[]>>({});
  const [showForest, setShowForest] = useState(false);

  const isForestComplete = step >= groups.length;
  const currentGroup = groups[step];

  const updateInput = (groupIdx: number, itemIdx: number, value: string) => {
    setInputs((prev) => {
      const list = [...(prev[groupIdx] ?? [])];
      list[itemIdx] = value;
      return { ...prev, [groupIdx]: list };
    });
  };

  const handleNext = () => {
    if (step < groups.length - 1) {
      setStep((s) => s + 1);
    } else {
      // 마지막 단계 완료 → 0.8s 후 풀스크린 숲
      setStep((s) => s + 1);
      setTimeout(() => setShowForest(true), 800);
    }
  };

  const handleDone = () => {
    if (disabled) return;
    const allInputs = Object.values(inputs).flat().filter((s) => s && s.trim());
    onChoose(
      allInputs.length > 0
        ? `🌳 발 디뎠어: ${allInputs.slice(0, 5).join(', ')}`
        : '🌳 잘 돌아왔어요',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'forest_mom',
          eventType: 'SPIRIT_ROOTED_HUG',
          choice: 'done',
          totalItems: allInputs.length,
        },
      },
    );
  };

  const handleSkip = () => {
    if (disabled) return;
    onChoose('🌳 다음에', {
      source: 'spirit_event',
      context: { spiritId: 'forest_mom', eventType: 'SPIRIT_ROOTED_HUG', choice: 'skip' },
    });
  };

  // ─── 풀스크린 숲 완성 ───
  if (showForest) {
    return (
      <AnimatePresence>
        <motion.div
          key="forest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #C8EAF7 0%, #D6F0DA 55%, #8FBE6D 100%)' }}
        >
          {/* 햇살 */}
          <motion.div
            className="absolute top-12 right-12 text-7xl select-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            style={{ filter: 'drop-shadow(0 0 30px rgba(255,200,80,0.8))' }}
          >
            ☀️
          </motion.div>

          {/* 새들 */}
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.span
              key={`bird-${i}`}
              className="absolute text-2xl select-none"
              style={{ top: `${20 + i * 8}%`, left: '-10%' }}
              animate={{ x: ['0vw', '120vw'] }}
              transition={{ duration: 12 + i * 4, delay: i * 2, repeat: Infinity, ease: 'linear' }}
            >
              🐦
            </motion.span>
          ))}

          {/* 큰 나무 5그루 */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around pb-8 px-2">
            {[
              { emoji: '🌳', size: 88, delay: 0 },
              { emoji: '🌲', size: 72, delay: 0.15 },
              { emoji: '🌳', size: 96, delay: 0.3 },
              { emoji: '🌲', size: 76, delay: 0.45 },
              { emoji: '🌳', size: 80, delay: 0.6 },
            ].map((tree, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: tree.delay, type: 'spring', stiffness: 140, damping: 14 }}
                style={{ fontSize: tree.size, filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.2))' }}
              >
                {tree.emoji}
              </motion.div>
            ))}
          </div>

          {/* 풀 */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-around opacity-70">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.05 }}
                className="text-xl select-none"
              >
                🌱
              </motion.span>
            ))}
          </div>

          {/* 떠다니는 잎 */}
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.span
              key={`leaf-${i}`}
              className="absolute text-base select-none"
              style={{ left: `${(i * 31) % 100}%`, top: '-5%' }}
              animate={{ y: '110vh', x: [0, 30, -30, 0], rotate: 360 }}
              transition={{ duration: 10 + (i % 3) * 3, delay: (i % 5) * 0.5, repeat: Infinity, ease: 'linear' }}
            >
              🍃
            </motion.span>
          ))}

          {/* 중앙 메시지 */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="relative bg-white/85 backdrop-blur-sm rounded-3xl px-8 py-5 shadow-2xl border border-emerald-200/50 mx-6 text-center"
          >
            <p className="text-5xl mb-3">🌳</p>
            <p className="text-emerald-900 font-bold text-lg mb-1">
              이제 발이 땅에 닿았네
            </p>
            <p className="text-emerald-600 text-sm italic">
              여기서, 잠깐 같이 서 있자
            </p>
          </motion.div>

          <motion.button
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.8 }}
            onClick={handleDone}
            className="mt-8 px-8 py-3 rounded-full bg-emerald-700 text-white font-bold text-base shadow-xl active:scale-95"
            style={{ boxShadow: '0 8px 30px rgba(34,139,84,0.5)' }}
          >
            🌳 같이 돌아갈게
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── 카드 UI: 단계별 ───
  return (
    <SpiritEventCard spiritId="forest_mom" onSkip={handleSkip} disabled={disabled}>
      <p className="text-sm text-amber-900/80 italic mb-3">{data.openerMsg}</p>

      {/* 진행률 도트 */}
      <div className="flex justify-center gap-1.5 mb-4">
        {groups.map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            animate={{
              backgroundColor: i < step ? '#16a34a' : i === step ? '#86efac' : '#e5e7eb',
              scale: i === step ? 1.4 : 1,
            }}
          />
        ))}
      </div>

      {/* 자라난 나무들 (지금까지) */}
      {step > 0 && !isForestComplete && (
        <div className="flex justify-center items-end gap-1 mb-3 h-12">
          {Array.from({ length: step }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-3xl"
            >
              {['🌱', '🌿', '🌳', '🌲', '🌳'][i]}
            </motion.span>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentGroup && (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200/60 mb-4"
          >
            <p className="text-sm font-bold text-emerald-800 mb-2.5 flex items-center gap-1.5">
              <span className="text-xl">{currentGroup.emoji}</span>
              {currentGroup.label}
              <span className="font-normal text-emerald-600 text-xs">
                {currentGroup.count}가지
              </span>
            </p>
            <div className="space-y-1.5">
              {Array.from({ length: currentGroup.count }).map((_, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={inputs[step]?.[idx] ?? ''}
                  onChange={(e) => updateInput(step, idx, e.target.value)}
                  disabled={disabled}
                  maxLength={30}
                  placeholder={`${idx + 1}.`}
                  className="w-full px-3 py-1.5 text-sm bg-white/90 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-emerald-900 placeholder-emerald-300"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled || isForestComplete}
          onClick={handleNext}
          className="py-2.5 px-3 rounded-xl text-sm font-bold bg-emerald-600 text-white shadow active:scale-[0.98] disabled:opacity-50 transition"
        >
          {step < groups.length - 1 ? `${['🌱','🌿','🌳','🌲','🌳'][step]} 다음` : '🌳 숲 완성'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleSkip}
          className="py-2.5 px-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
        >
          ⏭️ 다음에
        </button>
      </div>
    </SpiritEventCard>
  );
}
