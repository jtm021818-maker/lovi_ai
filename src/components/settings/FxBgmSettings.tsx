'use client';

/**
 * ⚙️ v81: FX / BGM 설정 드로어
 *
 * 사용자 토글:
 *   - FX (화면 흔들림, 파티클 등)
 *   - BGM (배경음악)
 *   - reduced-motion 시스템 값 표시
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isFxEnabled } from '@/lib/fx/effect-bus';
import { isBgmEnabled, setBgmEnabled, stopBgm } from '@/lib/bgm/bgm-manager';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FxBgmSettings({ open, onClose }: Props) {
  const [fx, setFx] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFx(isFxEnabled());
    setBgm(isBgmEnabled());
    if (typeof window !== 'undefined') {
      setSystemReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, [open]);

  const toggleFx = (next: boolean) => {
    setFx(next);
    localStorage.setItem('fx_enabled', next ? 'true' : 'false');
  };
  const toggleBgm = (next: boolean) => {
    setBgm(next);
    setBgmEnabled(next);
    if (!next) stopBgm();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9500] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="w-full sm:max-w-md bg-[#F4EFE6] rounded-t-[28px] sm:rounded-[24px] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[15px] font-bold text-[#4E342E]">⚙️ 효과 설정</div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#EAE1D0] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <Row
                icon="✨"
                title="화면 연출 (FX)"
                desc="흔들림 / 파티클 / 말풍선 효과"
                on={fx}
                onChange={toggleFx}
              />
              <Row
                icon="🎵"
                title="배경 음악 (BGM)"
                desc="롤플레이 모드 등에서 재생"
                on={bgm}
                onChange={toggleBgm}
              />
              {systemReducedMotion && (
                <div className="p-3 rounded-xl bg-[#FEF3C7] text-[11px] text-[#92400E]">
                  ⚠️ 시스템에서 모션 감소 설정됨. FX 를 켜도 일부 애니는 자동 비활성.
                </div>
              )}
            </div>

            <div className="text-[10px] text-[#6D4C41]/60 text-center mt-4">
              설정은 이 기기에만 저장돼 — 로그인과 무관
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ icon, title, desc, on, onChange }: { icon: string; title: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border-2 border-[#D5C2A5]/50 active:scale-[0.98] transition-transform"
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 text-left">
        <div className="text-[13px] font-bold text-[#4E342E]">{title}</div>
        <div className="text-[11px] text-[#6D4C41]">{desc}</div>
      </div>
      <div
        className={`w-10 h-6 rounded-full transition-colors relative ${on ? 'bg-[#B56576]' : 'bg-[#D5C2A5]'}`}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
          animate={{ x: on ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}
