'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 v35: 🎭 롤플레이 모드 마무리 — 피드백 카드
 *
 * 2~4 라운드 롤플레이 후 루나가 캐릭터에서 나와서 피드백 주는 시점.
 * 잘한 점, 조심할 점, 실전 팁 + "다시 해보기" / "충분해"
 *
 * UX:
 * - 보라색 톤 (롤플레이 테마)
 * - 잘한 점 (초록 체크)
 * - 조심할 점 (주황 경고)
 * - 팁 (노란 전구)
 * - 재시도/종료 버튼
 */

interface FeedbackOption {
  label: string;
  emoji: string;
  type: 'retry' | 'done';
}

interface RoleplayFeedbackProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function RoleplayFeedback({ event, onSelect, disabled }: RoleplayFeedbackProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = event.data as {
    strengths?: string[];
    improvements?: string[];
    tip?: string;
    options?: FeedbackOption[];
  };

  const strengths = data.strengths ?? [];
  const improvements = data.improvements ?? [];
  const tip = data.tip ?? '실전에서도 오늘처럼만 하면 돼';
  const options = data.options ?? [
    { label: '다시 해보기', emoji: '🔄', type: 'retry' },
    { label: '충분해, 다음으로', emoji: '🦊', type: 'done' },
  ];

  const handleSelect = (option: FeedbackOption) => {
    if (disabled || done) return;
    setSelected(option.type);
    setTimeout(() => {
      setDone(true);
      onSelect(
        option.type === 'retry'
          ? '🔄 다시 해보자'
          : '🦊 충분해, 다음으로 가자',
        {
          source: 'roleplay_feedback',
          context: { action: option.type },
        },
      );
    }, 500);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-2xl border border-purple-200/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎭</span>
          <span className="text-[12px] font-bold text-purple-700">
            롤플레이 피드백 — {selected === 'retry' ? '다시 해보기' : '완료'}
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
          background: 'linear-gradient(135deg, #faf5ff 0%, #fdf4ff 50%, #fce7f3 100%)',
          borderColor: 'rgba(168, 85, 247, 0.4)',
        }}
      >
        {/* 헤더 */}
        <div className="relative flex items-center gap-2.5 mb-3">
          <div className="relative">
            <div
              className="w-11 h-11 flex-shrink-0 border-2 border-purple-400 overflow-hidden bg-white shadow-md"
              style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
            >
              <img src="/char_img/luna_1_event.png" alt="루나" className="w-full h-full object-cover" />
            </div>
            {/* 골드 "돌아왔어" 뱃지 */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -right-2 -top-1 text-xs bg-yellow-400 text-white rounded-full px-1.5 py-0.5 font-bold shadow-sm"
            >
              🦊
            </motion.div>
          </div>
          <div>
            <div className="text-[14px] font-bold text-purple-700">🎭 롤플레이 피드백</div>
            <div className="text-[10px] text-purple-500/80">캐릭터에서 돌아왔어 — 이제 피드백 줄게</div>
          </div>
        </div>

        {/* 잘한 점 */}
        {strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative bg-green-50/80 rounded-2xl p-3 mb-3 border border-green-200/50"
          >
            <div className="text-[12px] font-bold text-green-700 mb-2 flex items-center gap-1.5">
              <span>✅</span>
              <span>잘한 점</span>
            </div>
            <ul className="space-y-1.5">
              {strengths.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="text-[12px] text-green-800 leading-relaxed flex items-start gap-1.5"
                >
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{s}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* 조심할 점 */}
        {improvements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="relative bg-orange-50/80 rounded-2xl p-3 mb-3 border border-orange-200/50"
          >
            <div className="text-[12px] font-bold text-orange-700 mb-2 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>조심할 점</span>
            </div>
            <ul className="space-y-1.5">
              {improvements.map((imp, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="text-[12px] text-orange-800 leading-relaxed flex items-start gap-1.5"
                >
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>{imp}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* 실전 팁 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="relative bg-yellow-50/80 rounded-2xl p-3 mb-4 border border-yellow-200/50"
        >
          <div className="text-[12px] font-bold text-yellow-700 mb-1.5 flex items-center gap-1.5">
            <span>💡</span>
            <span>실전 팁</span>
          </div>
          <p className="text-[12px] text-yellow-800 leading-relaxed italic">{tip}</p>
        </motion.div>

        {/* 선택 옵션 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex gap-2"
        >
          {options.map((option, idx) => (
            <motion.button
              key={option.type}
              whileHover={!disabled && !done ? { scale: 1.02 } : {}}
              whileTap={!disabled && !done ? { scale: 0.98 } : {}}
              onClick={() => handleSelect(option)}
              disabled={disabled || done}
              className={`flex-1 py-3 rounded-2xl font-bold text-[13px] transition-all ${
                selected === option.type
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl scale-105'
                  : idx === 0
                  ? 'bg-white border-2 border-purple-200 text-purple-600 hover:bg-purple-50'
                  : 'bg-gradient-to-r from-purple-400 to-pink-400 text-white hover:shadow-md'
              }`}
            >
              <span className="mr-1">{option.emoji}</span>
              {option.label}
            </motion.button>
          ))}
        </motion.div>

        <div className="text-center mt-3">
          <span className="text-[9px] text-purple-500/80">💜 실전에서도 오늘처럼</span>
        </div>
      </div>
    </motion.div>
  );
}
