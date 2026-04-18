'use client';

/**
 * 🎭 v81.2: ModeSelector — 채팅 인라인 카드 (원복 + 개선)
 *
 * 한 번만 선택 가능. 선택 후엔 해당 모드 오버레이가 풀스크린으로 떠서 못 돌아감.
 * - 선택 전: 채팅 흐름 안에 예쁜 카드 (5개 버튼)
 * - 선택 후: ChatContainer 가 모드 오버레이 띄움
 */

import { motion } from 'framer-motion';
import { MODE_CATALOG } from '@/engines/bridge-modes/types';
import type { ModeId } from '@/engines/bridge-modes/types';

interface ModeSelectorProps {
  opener?: string;
  situationSummary?: string;
  onSelect: (mode: ModeId) => void;
}

const DEFAULT_MODES: ModeId[] = ['roleplay', 'draft', 'panel', 'tone', 'idea'];

const MODE_ACCENTS: Record<ModeId, string> = {
  roleplay: '#be185d',
  draft:    '#b45309',
  panel:    '#6d28d9',
  tone:     '#1d4ed8',
  idea:     '#15803d',
};

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
            <div className="text-[11px] text-[#B45309] mt-0.5">📍 {situationSummary}</div>
          )}
          <div className="text-[10px] text-[#B45309]/80 mt-1 italic">
            하나 골라줘 — 끝나면 바로 실행 계획으로 넘어가
          </div>
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
                <div className="text-[13px] font-bold truncate" style={{ color: MODE_ACCENTS[modeId] }}>
                  {meta.label}
                </div>
                <div className="text-[11px] text-[#9A3412]/80 truncate">{meta.tagline}</div>
                <div className="text-[10px] text-[#9A3412]/60 mt-0.5">⏱ {meta.estimatedTurns}</div>
              </div>
              <span className="shrink-0 opacity-60" style={{ color: MODE_ACCENTS[modeId] }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
