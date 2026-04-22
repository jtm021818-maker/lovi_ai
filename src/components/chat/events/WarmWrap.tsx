'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 v39: 💜 WARM_WRAP — "오늘의 마무리" 카드 (EMPOWER)
 *
 * 학술 요약이 아니라 "언니가 동생 보내기 전 다독이는" 마무리.
 * 오늘 찾은 강점 + 감정 변화 + 다음 스텝 + 루나의 진심 한 마디.
 *
 * UX 포인트:
 * - 보라/핑크/라벤더 gradient (따뜻한 석양 톤)
 * - ✨ 강점 발견 → 💭 감정 변화 → 👉 다음 스텝 → 💜 루나 메시지
 * - 2 선택지: "고마워 루나" / "또 올게"
 * - 이 카드가 나오면 "아 오늘 여기서 마무리구나" 느낌
 */

interface WarmWrapOption {
  label: string;
  emoji: string;
  value: 'thanks' | 'revisit';
}

interface WarmWrapProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function WarmWrap({ event, onSelect, disabled }: WarmWrapProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = event.data as {
    strengthFound?: string;
    emotionShift?: string;
    nextStep?: string;
    lunaMessage?: string;
    options?: WarmWrapOption[];
  };

  const strengthFound = data.strengthFound ?? '끝까지 고민하는 그 진심';
  const emotionShift = data.emotionShift ?? '처음보다 마음이 좀 가벼워진 것 같지?';
  const nextStep = data.nextStep ?? '해보고 어떻게 됐는지 꼭 알려줘';
  const lunaMessage = data.lunaMessage ?? '항상 여기 있을게 💜';
  const options = data.options ?? [
    { label: '고마워 루나', emoji: '💜', value: 'thanks' as const },
    { label: '또 올게', emoji: '🤗', value: 'revisit' as const },
  ];

  const handleSelect = (option: WarmWrapOption) => {
    if (disabled || done) return;
    setSelected(option.value);
    setTimeout(() => {
      setDone(true);
      onSelect(
        option.value === 'thanks'
          ? '💜 고마워 루나, 진짜'
          : '🤗 해보고 다시 올게!',
        {
          source: 'warm_wrap' as any,
          context: {
            choice: option.value,
            strengthFound,
          },
        },
      );
    }, 400);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-2xl border border-purple-200/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💜</span>
          <span className="text-[12px] font-bold text-purple-700">
            오늘의 마무리 — {selected === 'thanks' ? '마음 받았어' : '기다릴게'}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.2 }}
      className="mx-4 my-4"
    >
      <div
        className="relative rounded-3xl border-2 shadow-xl overflow-hidden p-5"
        style={{
          background: 'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 35%, #ede9fe 70%, #fef3c7 100%)',
          borderColor: 'rgba(168, 85, 247, 0.45)',
        }}
      >
        {/* 배경 — 따뜻한 빛 효과 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-purple-300/40"
              style={{ left: `${8 + i * 10}%`, top: `${12 + (i % 4) * 22}%` }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.4, 0.8],
              }}
              transition={{ duration: 2.5 + i * 0.25, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>

        {/* 헤더 — 루나 + 하트 배지 */}
        <div className="relative flex items-center gap-2.5 mb-4">
          <div className="relative">
            <div
              className="w-12 h-12 flex-shrink-0 border-2 border-purple-400 overflow-hidden bg-white shadow-md"
              style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
            >
              <img src="/char_img/luna_1_event.webp" alt="루나" className="w-full h-full object-cover" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -right-1 -top-1 text-xs bg-pink-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold shadow"
            >
              💜
            </motion.div>
          </div>
          <div>
            <div className="text-[14px] font-bold text-purple-700">💜 오늘의 마무리</div>
            <div className="text-[11px] text-purple-500/90">야 오늘 진짜 잘했어 — 진심이야</div>
          </div>
        </div>

        {/* 강점 발견 */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 mb-3 border border-purple-200/60 shadow-sm"
        >
          <div className="text-[10px] font-bold text-purple-600 mb-1 flex items-center gap-1.5">
            <span>✨</span>
            <span>오늘 내가 본 너의 강점</span>
          </div>
          <p className="text-[13px] text-gray-800 leading-relaxed font-semibold">
            &ldquo;{strengthFound}&rdquo;
          </p>
        </motion.div>

        {/* 감정 변화 */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-pink-50/80 to-rose-50/80 rounded-2xl p-3 mb-3 border border-pink-200/50"
        >
          <div className="text-[10px] font-bold text-pink-600 mb-1 flex items-center gap-1.5">
            <span>💭</span>
            <span>처음이랑 지금이랑</span>
          </div>
          <p className="text-[12px] text-gray-700 leading-relaxed italic">
            {emotionShift}
          </p>
        </motion.div>

        {/* 다음 스텝 */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.65 }}
          className="bg-gradient-to-r from-lime-50/80 to-emerald-50/80 rounded-2xl p-3 mb-4 border border-lime-200/50"
        >
          <div className="text-[10px] font-bold text-lime-700 mb-1 flex items-center gap-1.5">
            <span>👉</span>
            <span>다음은 이렇게</span>
          </div>
          <p className="text-[12px] text-gray-700 leading-relaxed">
            {nextStep}
          </p>
        </motion.div>

        {/* 루나의 한 마디 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.85, type: 'spring', damping: 15 }}
          className="relative bg-gradient-to-br from-purple-100/80 to-pink-100/80 rounded-2xl p-4 mb-4 border-2 border-purple-300/60 shadow-md"
        >
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2 text-lg"
          >
            💜
          </motion.div>
          <div className="text-[10px] font-bold text-purple-600 mb-1 flex items-center gap-1.5">
            <span>🦊</span>
            <span>루나의 진심 한 마디</span>
          </div>
          <p className="text-[14px] text-purple-900 leading-relaxed font-bold italic text-center py-1">
            &ldquo;{lunaMessage}&rdquo;
          </p>
        </motion.div>

        {/* 선택 옵션 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="flex gap-2"
        >
          {options.map((option, idx) => (
            <motion.button
              key={option.value}
              whileHover={!disabled && !done ? { scale: 1.02 } : {}}
              whileTap={!disabled && !done ? { scale: 0.98 } : {}}
              onClick={() => handleSelect(option)}
              disabled={disabled || done}
              className={`flex-1 py-3 rounded-2xl font-bold text-[13px] transition-all ${
                selected === option.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl scale-105'
                  : idx === 0
                  ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white hover:shadow-md'
                  : 'bg-white border-2 border-purple-200 text-purple-600 hover:bg-purple-50'
              }`}
            >
              <span className="mr-1">{option.emoji}</span>
              {option.label}
            </motion.button>
          ))}
        </motion.div>

        <div className="text-center mt-3">
          <span className="text-[9px] text-purple-500/80">💜 항상 여기 있을게 — 언제든 또 와</span>
        </div>
      </div>
    </motion.div>
  );
}
