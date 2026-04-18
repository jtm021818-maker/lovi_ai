'use client';

/**
 * 🎭 v81.1: ModeSelector — 풀스크린 모드 선택 화면 (리디자인)
 *
 * 한 번만 선택 가능 → 채팅 버블 대신 **극적 전환 오버레이** 로.
 * - 배경 어둡게 페이드 인
 * - 헤더: Luna 가 "자 이제 뭐부터 해볼까?" 인트로
 * - 5개 모드가 **큰 카드** 로 stagger 등장 (carousel 느낌)
 * - 호버/포커스 시 프리뷰 확장 (설명 + 예상 턴 수)
 * - 선택 → 카드가 "확대되며" 사라지고 해당 모드 오버레이 등장
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { MODE_CATALOG } from '@/engines/bridge-modes/types';
import type { ModeId } from '@/engines/bridge-modes/types';

interface ModeSelectorProps {
  opener?: string;
  situationSummary?: string;
  onSelect: (mode: ModeId) => void;
  onDismiss?: () => void;
}

const DEFAULT_MODES: ModeId[] = ['roleplay', 'draft', 'panel', 'tone', 'idea'];

// 각 모드별 테마 컬러 (카드 그라디언트용)
const MODE_THEMES: Record<ModeId, { bg: string; accent: string }> = {
  roleplay: { bg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', accent: '#be185d' },
  draft:    { bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', accent: '#b45309' },
  panel:    { bg: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)', accent: '#6d28d9' },
  tone:     { bg: 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)', accent: '#1d4ed8' },
  idea:     { bg: 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)', accent: '#15803d' },
};

export default function ModeSelector({ opener, situationSummary, onSelect, onDismiss }: ModeSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const [selecting, setSelecting] = useState<ModeId | null>(null);
  const [expandedId, setExpandedId] = useState<ModeId | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleSelect = (mode: ModeId) => {
    if (selecting) return;
    setSelecting(mode);
    // 선택 확대 애니 보여준 뒤 콜백
    setTimeout(() => onSelect(mode), 450);
  };

  const content = (
    <motion.div
      className="fixed inset-0 z-[8800] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background:
          'radial-gradient(ellipse at center top, rgba(255,237,213,0.95) 0%, rgba(253,224,203,0.98) 50%, rgba(185,144,105,0.95) 100%)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* 상단 헤더 */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 280, damping: 26 }}
        className="px-5 pt-8 pb-3 relative"
      >
        <div className="flex items-start gap-3">
          <motion.div
            initial={{ scale: 0.7, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 20 }}
            className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center shrink-0"
          >
            <span className="text-2xl">🦊</span>
          </motion.div>
          <div className="flex-1 pt-1">
            <div className="text-[16px] font-black text-[#7C2D12] leading-tight">
              {opener || '자 이제 같이 준비해보자 🔥'}
            </div>
            {situationSummary && (
              <div className="text-[12px] text-[#9A3412] mt-1">📍 {situationSummary}</div>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center text-[#7C2D12]/70 hover:bg-white/90"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </motion.header>

      {/* 안내 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ delay: 0.35 }}
        className="px-5 mb-2 text-[11px] text-[#9A3412] font-semibold"
      >
        어떤 방식으로 같이 준비할래? <span className="opacity-70">한 번 선택하면 이게 이번 준비 단계야</span>
      </motion.div>

      {/* 모드 카드 리스트 */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
        {DEFAULT_MODES.map((modeId, idx) => {
          const meta = MODE_CATALOG[modeId];
          const theme = MODE_THEMES[modeId];
          const isExpanded = expandedId === modeId;
          const isSelecting = selecting === modeId;
          const isOtherSelecting = selecting && selecting !== modeId;

          return (
            <motion.button
              key={modeId}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{
                opacity: isOtherSelecting ? 0.2 : 1,
                y: 0,
                scale: isSelecting ? 1.08 : 1,
              }}
              transition={{
                delay: selecting ? 0 : 0.45 + idx * 0.08,
                type: 'spring',
                stiffness: 280,
                damping: 24,
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(modeId)}
              onMouseEnter={() => !selecting && setExpandedId(modeId)}
              onMouseLeave={() => setExpandedId(null)}
              disabled={!!selecting}
              className="w-full text-left rounded-3xl overflow-hidden shadow-lg active:shadow-xl transition-shadow disabled:cursor-not-allowed"
              style={{ background: theme.bg }}
            >
              <div className="p-4 relative">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: isSelecting ? [0, -8, 8, -4, 0] : 0, scale: isExpanded ? 1.15 : 1 }}
                    transition={{ duration: isSelecting ? 0.45 : 0.3 }}
                    className="w-14 h-14 rounded-2xl bg-white/70 backdrop-blur-sm flex items-center justify-center text-3xl shrink-0 shadow-sm"
                  >
                    {meta.emoji}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-black truncate" style={{ color: theme.accent }}>
                      {meta.label}
                    </div>
                    <div className="text-[12px] text-[#4E342E]/80 font-semibold truncate mt-0.5">
                      {meta.tagline}
                    </div>
                    <div className="text-[10px] text-[#4E342E]/60 mt-1 flex items-center gap-2">
                      <span>⏱ {meta.estimatedTurns}</span>
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" className="shrink-0 opacity-60">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>

                {/* 확장 설명 */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-[#4E342E]/15 text-[11px] text-[#4E342E]/75 leading-relaxed">
                        {meta.description}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 하단 힌트 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8 }}
        className="px-5 pb-5 text-[10px] text-[#7C2D12] text-center"
      >
        💡 한 개만 고르면 돼 — 끝나면 바로 실행 계획으로 넘어가
      </motion.div>
    </motion.div>
  );

  if (!mounted) return null;
  return createPortal(<AnimatePresence>{content}</AnimatePresence>, document.body);
}
