'use client';

/**
 * ✍️ v85.1: IdeaRefine — "언니가 한 번 다듬어줄게"
 *
 * v35 → v85.1:
 *   - 전 Phase 자율 이벤트로 승격 (작전회의 custom 모드 제거)
 *   - UI 텍스트 "아이디어 다듬기 / 너의 원래 아이디어 / 다듬은 버전" → 언니/누나가 손 봐주는 톤
 *   - 팔레트 slate → rose-lavender (따뜻한 손편지 느낌)
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

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
    { label: '언니 이거 좋아', emoji: '✨', value: 'accept' as const },
    { label: '한 번만 더 손봐줘', emoji: '✏️', value: 'more_refine' as const },
  ];

  const handleSelect = (option: IdeaRefineOption) => {
    if (disabled || done) return;
    setSelected(option.value);
    setTimeout(() => {
      setDone(true);
      onSelect(
        option.value === 'accept'
          ? '✨ 언니 이거 좋아'
          : '✏️ 한 번만 더 다듬어줘',
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
        className="mx-4 my-3 p-4 bg-gradient-to-br from-rose-50/70 to-fuchsia-50/70 rounded-2xl border border-rose-200/50 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">✍️</span>
          <span className="text-[12px] font-bold text-rose-800">
            {selected === 'accept' ? '언니가 다듬어준 거 쓰기로 했어' : '언니가 한 번 더 손보는 중'}
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
          background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 45%, #fdf4ff 100%)',
          borderColor: 'rgba(244, 114, 182, 0.4)',
        }}
      >
        {/* 헤더 — 언니 톤 */}
        <div className="relative flex items-center gap-2.5 mb-4">
          <div
            className="w-10 h-10 flex-shrink-0 border-2 border-rose-300 overflow-hidden bg-white shadow-md"
            style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
          >
            <img src="/char_img/luna_1_event.png" alt="루나" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-rose-800">✍️ 언니가 한 번 다듬어줄게</div>
            <div className="text-[10.5px] text-rose-500/80 italic">네가 쓴 거 살짝 손 봐뒀어</div>
          </div>
        </div>

        {/* 원래 아이디어 — "네가 쓴 거" */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="relative bg-white/80 rounded-2xl p-3 mb-2 border border-rose-200/50"
        >
          <div className="text-[11px] font-bold text-rose-600 mb-1 flex items-center gap-1.5">
            <span>💭</span>
            <span>네가 쓴 거</span>
          </div>
          <p className="text-[13px] text-gray-700 leading-relaxed italic">&quot;{original}&quot;</p>
        </motion.div>

        {/* 화살표 */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', damping: 12 }}
          className="text-center text-xl py-1 text-rose-400"
        >
          ⬇️
        </motion.div>

        {/* 다듬은 버전 — "내가 손 본 거" */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="relative bg-gradient-to-r from-rose-50 to-fuchsia-50 rounded-2xl p-3 mb-3 border border-rose-300/60 shadow-sm"
        >
          <div className="text-[11px] font-bold text-rose-700 mb-1 flex items-center gap-1.5">
            <span>✨</span>
            <span>언니가 한 끗 손 본 거</span>
          </div>
          <p className="text-[13px] text-gray-800 leading-relaxed font-medium">
            &quot;{refined}&quot;
          </p>
        </motion.div>

        {/* 이유 — "왜 이렇게 바꿨냐면" */}
        {reason && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="relative bg-fuchsia-50/80 rounded-2xl p-3 mb-4 border border-fuchsia-200/50"
          >
            <div className="text-[11px] font-bold text-fuchsia-700 mb-1 flex items-center gap-1.5">
              <span>💌</span>
              <span>왜 이렇게 바꿨냐면</span>
            </div>
            <p className="text-[12px] text-fuchsia-800 leading-relaxed">{reason}</p>
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
                  ? 'bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white shadow-xl scale-105'
                  : idx === 0
                  ? 'bg-gradient-to-r from-rose-400 to-fuchsia-400 text-white hover:shadow-md'
                  : 'bg-white border-2 border-rose-200 text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className="mr-1">{option.emoji}</span>
              {option.label}
            </motion.button>
          ))}
        </motion.div>

        <div className="text-center mt-3">
          <span className="text-[9px] text-rose-500/80 italic">✍️ 네 말은 네 거, 언니는 한 끗만 거들었을 뿐</span>
        </div>
      </div>
    </motion.div>
  );
}
