'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 v35: 🍿 연참 모드 — 객관적 분석 리포트 카드
 *
 * "연애의 참견" 스타일의 객관적 분석:
 * - 상황 정리
 * - 강점 (💪🧡)
 * - 주의점 (📱😰)
 * - 루나의 한 마디
 * - "더 자세히" / "액션 짜자" 선택
 */

interface PanelReportProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

interface PanelItem {
  icon: string;
  text: string;
}

interface PanelOption {
  label: string;
  emoji: string;
  value: 'detail' | 'action' | 'switch_mode';
}

export default function PanelReport({ event, onSelect, disabled }: PanelReportProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = event.data as {
    situationSummary?: string;
    strengths?: PanelItem[];
    cautions?: PanelItem[];
    lunaVerdict?: string;
    options?: PanelOption[];
  };

  const situationSummary = data.situationSummary ?? '';
  const strengths = data.strengths ?? [];
  const cautions = data.cautions ?? [];
  const lunaVerdict = data.lunaVerdict ?? '';
  const options: PanelOption[] = data.options ?? [
    { label: '더 자세히', emoji: '📖', value: 'detail' },
    { label: '이제 액션 짜자', emoji: '🔥', value: 'action' },
  ];

  const handleSelect = (option: PanelOption) => {
    if (disabled || done) return;
    setSelected(option.value);
    setTimeout(() => {
      setDone(true);
      let text = '';
      switch (option.value) {
        case 'detail':
          text = '📖 더 자세히 알고 싶어';
          break;
        case 'action':
          text = '🔥 이제 액션 짜자';
          break;
        default:
          text = '다른 방향으로 가볼까';
      }
      onSelect(text, {
        source: 'panel_report',
        context: { choice: option.value },
      });
    }, 500);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-amber-50/80 to-orange-50/80 rounded-2xl border border-amber-200/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🍿</span>
          <span className="text-[12px] font-bold text-amber-700">
            연참 리포트 — {selected === 'detail' ? '더 자세히' : '액션 준비'}
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
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fed7aa 100%)',
          borderColor: 'rgba(251, 146, 60, 0.4)',
        }}
      >
        {/* 배경 팝콘 느낌 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-amber-400/30"
              style={{ left: `${15 + i * 18}%`, top: `${10 + (i % 2) * 70}%`, fontSize: '20px' }}
              animate={{
                y: [0, -6, 0],
                rotate: [-5, 5, -5],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.5 }}
            >
              🍿
            </motion.div>
          ))}
        </div>

        {/* 헤더 */}
        <div className="relative flex items-center gap-2.5 mb-4">
          <div
            className="w-11 h-11 flex-shrink-0 border-2 border-amber-500 overflow-hidden bg-white shadow-md"
            style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
          >
            <img src="/char_img/luna_1_event.webp" alt="루나" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-amber-700">🍿 객관적 상황 분석</div>
            <div className="text-[10px] text-amber-600/80">한 발 떨어져서 보면...</div>
          </div>
        </div>

        {/* 상황 정리 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative bg-white/80 rounded-2xl p-4 mb-3 border border-amber-200/60"
        >
          <div className="text-[11px] font-bold text-amber-700 mb-2 flex items-center gap-1.5">
            <span>📊</span>
            <span>상황 정리</span>
          </div>
          <p className="text-[13px] text-gray-800 leading-relaxed">&quot;{situationSummary}&quot;</p>
        </motion.div>

        {/* 강점 */}
        {strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative bg-green-50/80 rounded-2xl p-4 mb-3 border border-green-200/60"
          >
            <div className="text-[11px] font-bold text-green-700 mb-2 flex items-center gap-1.5">
              <span>✅</span>
              <span>너의 강점</span>
            </div>
            <div className="space-y-2">
              {strengths.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[12px] text-green-800 leading-relaxed flex-1">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 주의점 */}
        {cautions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="relative bg-orange-50/80 rounded-2xl p-4 mb-3 border border-orange-200/60"
          >
            <div className="text-[11px] font-bold text-orange-700 mb-2 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>조심할 점</span>
            </div>
            <div className="space-y-2">
              {cautions.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[12px] text-orange-800 leading-relaxed flex-1">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 루나의 한 마디 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, type: 'spring', damping: 18 }}
          className="relative bg-gradient-to-r from-pink-50/80 to-rose-50/80 rounded-2xl p-4 mb-4 border border-pink-200/60"
        >
          <div className="text-[11px] font-bold text-pink-700 mb-2 flex items-center gap-1.5">
            <span>🎯</span>
            <span>한 마디</span>
          </div>
          <p className="text-[13px] text-gray-800 leading-relaxed font-medium italic">
            &quot;{lunaVerdict}&quot;
          </p>
        </motion.div>

        {/* 선택 옵션 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
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
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl scale-105'
                  : idx === 0
                  ? 'bg-white border-2 border-amber-300 text-amber-700 hover:bg-amber-50'
                  : 'bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:shadow-md'
              }`}
            >
              <span className="mr-1">{option.emoji}</span>
              {option.label}
            </motion.button>
          ))}
        </motion.div>

        <div className="text-center mt-3">
          <span className="text-[9px] text-amber-600/80">🍿 한 발 떨어져서 본 너의 상황</span>
        </div>
      </div>
    </motion.div>
  );
}
