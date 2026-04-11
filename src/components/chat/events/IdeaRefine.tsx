'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 v35: 🤔 커스텀 모드 — 아이디어 전후 비교 카드
 *
 * 유저 원래 아이디어 ⬇️ 루나의 다듬은 버전 ⬇️ 이유
 * "이거로 해볼래" / "더 다듬기" 선택
 */

interface IdeaRefineOption {
  label: string;
  emoji: string;
  value: 'accept' | 'more_refine';
}

interface IdeaRefineProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function IdeaRefine({ event, onSelect, disabled }: IdeaRefineProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = event.data as {
    original?: string;
    refined?: string;
    reason?: string;
    options?: IdeaRefineOption[];
  };

  const original = data.original ?? '';
  const refined = data.refined ?? '';
  const reason = data.reason ?? '';
  const options = data.options ?? [
    { label: '이거로 해볼래', emoji: '✨', value: 'accept' as const },
    { label: '더 다듬기', emoji: '✏️', value: 'more_refine' as const },
  ];

  const handleSelect = (option: IdeaRefineOption) => {
    if (disabled || done) return;
    setSelected(option.value);
    setTimeout(() => {
      setDone(true);
      onSelect(
        option.value === 'accept'
          ? '✨ 이거로 해볼래!'
          : '✏️ 더 다듬어보자',
        {
          source: 'idea_refine',
          context: {
            choice: option.value,
            refinedIdea: refined,
          },
        },
      );
    }, 500);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-slate-50/80 to-gray-50/80 rounded-2xl border border-gray-200/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span className="text-[12px] font-bold text-slate-700">
            아이디어 — {selected === 'accept' ? '확정!' : '더 다듬는 중'}
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
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #ecfccb 100%)',
          borderColor: 'rgba(100, 116, 139, 0.4)',
        }}
      >
        {/* 헤더 */}
        <div className="relative flex items-center gap-2.5 mb-4">
          <div
            className="w-10 h-10 flex-shrink-0 border-2 border-slate-400 overflow-hidden bg-white shadow-md"
            style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
          >
            <img src="/char_img/luna_1_event.png" alt="루나" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-slate-700">💡 아이디어 다듬기</div>
            <div className="text-[10px] text-slate-500/80">너의 생각을 같이 다듬어볼게</div>
          </div>
        </div>

        {/* 원래 아이디어 */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="relative bg-white/80 rounded-2xl p-3 mb-2 border border-slate-200/60"
        >
          <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
            <span>🤔</span>
            <span>너의 원래 아이디어</span>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed italic">&quot;{original}&quot;</p>
        </motion.div>

        {/* 화살표 */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', damping: 12 }}
          className="text-center text-2xl py-1"
        >
          ⬇️
        </motion.div>

        {/* 다듬은 버전 */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="relative bg-gradient-to-r from-lime-50 to-emerald-50 rounded-2xl p-3 mb-3 border border-lime-300/60 shadow-sm"
        >
          <div className="text-[11px] font-bold text-lime-700 mb-1 flex items-center gap-1.5">
            <span>✨</span>
            <span>다듬은 버전</span>
          </div>
          <p className="text-[13px] text-gray-800 leading-relaxed font-medium">
            &quot;{refined}&quot;
          </p>
        </motion.div>

        {/* 이유 */}
        {reason && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="relative bg-yellow-50/80 rounded-2xl p-3 mb-4 border border-yellow-200/50"
          >
            <div className="text-[11px] font-bold text-yellow-700 mb-1 flex items-center gap-1.5">
              <span>💡</span>
              <span>왜?</span>
            </div>
            <p className="text-[12px] text-yellow-800 leading-relaxed">{reason}</p>
          </motion.div>
        )}

        {/* 선택 옵션 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
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
                  ? 'bg-gradient-to-r from-lime-500 to-emerald-500 text-white shadow-xl scale-105'
                  : idx === 0
                  ? 'bg-gradient-to-r from-lime-400 to-emerald-400 text-white hover:shadow-md'
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="mr-1">{option.emoji}</span>
              {option.label}
            </motion.button>
          ))}
        </motion.div>

        <div className="text-center mt-3">
          <span className="text-[9px] text-slate-500/80">🤔 네가 스스로 생각한 거야</span>
        </div>
      </div>
    </motion.div>
  );
}
