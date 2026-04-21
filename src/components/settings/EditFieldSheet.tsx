'use client';

/**
 * 📝 v85.5: EditFieldSheet — 설정 필드 편집용 제네릭 bottom-sheet
 *
 * 기존: 3열 요약 row 안에서 input+save 버튼 인라인으로 밀어넣어 UI 터짐.
 * 개선: 탭 시 하단에서 시트가 올라와 충분한 공간에서 편집.
 *
 * iOS/Material/Instagram 프로필 편집 표준 패턴.
 */

import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  /** 시트 본체 — input, options 등 */
  children: ReactNode;
  /** 저장 버튼 라벨 (기본 "저장") */
  saveLabel?: string;
  /** 저장 가능 여부 */
  canSave?: boolean;
  /** 저장 중 표시 */
  saving?: boolean;
}

export default function EditFieldSheet({
  open,
  onClose,
  onSave,
  title,
  subtitle,
  children,
  saveLabel = '저장',
  canSave = true,
  saving = false,
}: Props) {
  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="edit-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex items-end justify-center"
          style={{
            background: 'rgba(40,20,50,0.55)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <motion.div
            key="edit-sheet-body"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md"
            style={{
              background: 'linear-gradient(180deg, #fff8fb 0%, #fdf4f9 100%)',
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -16px 40px rgba(80,30,90,0.35)',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
          >
            {/* drag handle */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-gray-300/70" />
            </div>

            {/* 제목 */}
            <div className="px-5 pt-2 pb-4 text-center">
              <h3 className="text-[17px] font-extrabold text-[#4a148c] tracking-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="mt-1 text-[11.5px] text-[#9575cd] italic">
                  {subtitle}
                </p>
              )}
            </div>

            {/* 컨텐츠 */}
            <div className="px-5 pb-5">{children}</div>

            {/* 버튼 2분할 */}
            <div className="px-5 pt-1 flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl font-bold text-[13.5px] transition-all active:scale-95"
                style={{
                  background: 'rgba(156,39,176,0.08)',
                  color: '#7c3aed',
                }}
              >
                취소
              </button>
              <button
                onClick={() => void onSave()}
                disabled={!canSave || saving}
                className="flex-1 py-3 rounded-2xl font-bold text-[13.5px] transition-all active:scale-95"
                style={{
                  background:
                    !canSave || saving
                      ? 'rgba(156,39,176,0.22)'
                      : 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                  color: '#fff',
                  boxShadow:
                    !canSave || saving
                      ? 'none'
                      : '0 6px 16px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.35)',
                  cursor: !canSave || saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? '저장 중...' : saveLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
