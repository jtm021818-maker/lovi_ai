'use client';

/**
 * 🎭 v81: ModeSelector — BRIDGE 진입 시 모드 선택 카드
 *
 * [STRATEGY_READY:opener|situationSummary|...] 이벤트로 트리거.
 * 5개 모드 중 하나 선택 → useModeStore.enter() + 해당 모드 오버레이 오픈.
 */

import { motion } from 'framer-motion';
import { MODE_CATALOG } from '@/engines/bridge-modes/types';
import type { ModeId } from '@/engines/bridge-modes/types';

interface ModeSelectorProps {
  /** LLM 이 준 오프닝 한 줄 */
  opener?: string;
  /** LLM 이 파악한 상황 요약 */
  situationSummary?: string;
  onSelect: (mode: ModeId) => void;
  onDismiss?: () => void;
}

/** 어떤 모드를 보여줄지 — 기본 5개 다 노출 */
const DEFAULT_MODES: ModeId[] = ['roleplay', 'draft', 'panel', 'tone', 'idea'];

export default function ModeSelector({ opener, situationSummary, onSelect }: ModeSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="my-3 max-w-[92%] mx-auto p-4 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        border: '1px solid rgba(251,146,60,0.25)',
        boxShadow: '0 6px 24px rgba(251,146,60,0.12)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">🔥</span>
        <div className="flex-1">
          <div className="text-[14px] font-bold text-[#9A3412]">
            {opener || '자 이제 같이 준비해보자'}
          </div>
          {situationSummary && (
            <div className="text-[11px] text-[#B45309] mt-0.5">
              📍 {situationSummary}
            </div>
          )}
        </div>
      </div>

      {/* 모드 리스트 */}
      <div className="space-y-2">
        {DEFAULT_MODES.map((modeId, idx) => {
          const meta = MODE_CATALOG[modeId];
          return (
            <motion.button
              key={modeId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.08, type: 'spring', stiffness: 400, damping: 25 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(modeId)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-orange-200/50 hover:bg-white hover:border-orange-300 active:scale-[0.98] transition-all text-left shadow-sm"
            >
              <span className="text-2xl shrink-0">{meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-[#7C2D12] truncate">{meta.label}</div>
                <div className="text-[11px] text-[#9A3412]/80 truncate">{meta.tagline}</div>
              </div>
              <span className="text-[#9A3412]/60 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* 힌트 */}
      <div className="text-[10px] text-[#B45309]/70 text-center mt-3">
        골라주면 바로 모드로 들어갈게
      </div>
    </motion.div>
  );
}
