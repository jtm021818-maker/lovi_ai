'use client';

/**
 * 🎭 v81: ModeFrame — 몰입 모드 공용 외피
 *
 * 모든 모드 (roleplay/draft/panel/tone/idea) 의 공통 컨테이너.
 * - 상단 바: 모드 아이콘 + 제목 + 부제목 + 종료 버튼
 * - 본문: children (모드 전용 UI)
 * - 하단: 채팅 복귀 미니 버튼
 *
 * 레이아웃:
 *   Desktop → 중앙 modal (max-w-2xl)
 *   Mobile  → 풀스크린 bottom-sheet
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { ModeId } from '@/engines/bridge-modes/types';
import { MODE_CATALOG } from '@/engines/bridge-modes/types';

interface ModeFrameProps {
  modeId: ModeId;
  title?: string;
  subtitle?: string;
  onExit: () => void;
  /** 종료 확인 다이얼로그 스킵 */
  skipExitConfirm?: boolean;
  /** 🆕 v81.2: 종료 버튼 숨김 — 한 번 들어가면 완료까지 못 나감 (BRIDGE 고정 모드용) */
  hideExit?: boolean;
  children: React.ReactNode;
}

export default function ModeFrame({ modeId, title, subtitle, onExit, skipExitConfirm = false, hideExit = false, children }: ModeFrameProps) {
  const meta = MODE_CATALOG[modeId];
  const [mounted, setMounted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleExit = () => {
    if (hideExit) return; // 못 나감
    if (skipExitConfirm) onExit();
    else setShowExitConfirm(true);
  };

  const content = (
    <AnimatePresence>
      <motion.div
        key="mode-backdrop"
        className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={hideExit ? undefined : handleExit}
      >
        <motion.div
          key="mode-frame"
          onClick={(e) => e.stopPropagation()}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="relative w-full sm:max-w-2xl bg-[#F4EFE6] text-[#4E342E] rounded-t-[28px] sm:rounded-[24px] overflow-hidden shadow-2xl"
          style={{ height: 'min(96dvh, 800px)' }}
        >
          {/* 상단 바 */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-[#D5C2A5]/50 bg-white/60 backdrop-blur-md">
            <div className="text-2xl shrink-0">{meta.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold truncate">{title ?? meta.label}</div>
              <div className="text-[11px] text-[#6D4C41] truncate">{subtitle ?? meta.tagline}</div>
            </div>
            {!hideExit && (
              <button
                onClick={handleExit}
                className="shrink-0 w-8 h-8 rounded-full bg-[#EAE1D0] hover:bg-[#D5C2A5] active:scale-95 transition-all flex items-center justify-center text-[#5D4037]"
                aria-label="모드 종료"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
            {hideExit && (
              <div className="shrink-0 text-[9px] text-[#6D4C41]/60 font-semibold px-2 py-1 rounded-full bg-[#EAE1D0]/60">
                진행 중
              </div>
            )}
          </header>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100% - 56px)' }}>
            {children}
          </div>
        </motion.div>

        {/* 종료 확인 다이얼로그 */}
        <AnimatePresence>
          {showExitConfirm && (
            <motion.div
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitConfirm(false)}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="bg-white text-[#4E342E] p-5 rounded-2xl max-w-xs mx-4 shadow-xl"
              >
                <div className="text-[14px] font-bold mb-2">이 모드 나갈래?</div>
                <div className="text-[12px] text-[#6D4C41] mb-4">지금까지 한 건 메모로 남겨둘게.</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 py-2 rounded-full bg-[#EAE1D0] text-[13px] font-bold"
                  >
                    계속 할래
                  </button>
                  <button
                    onClick={() => { setShowExitConfirm(false); onExit(); }}
                    className="flex-1 py-2 rounded-full bg-[#B56576] text-white text-[13px] font-bold"
                  >
                    나갈래
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
