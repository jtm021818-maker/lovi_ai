'use client';

/**
 * 📂 v81: 내 초안함 — 저장된 메시지 초안 목록
 *
 * 바텀시트/모달로 열려서 최근 20개 초안 카드형 표시.
 * 복사 + 실제로 보냈다고 표시 기능.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DraftRow {
  id: string;
  tone: 'soft' | 'honest' | 'firm' | 'custom';
  content: string;
  context?: string | null;
  created_at: string;
  sent_at?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const TONE_META: Record<string, { label: string; emoji: string; color: string }> = {
  soft:   { label: '부드럽게', emoji: '💐', color: 'text-blue-500' },
  honest: { label: '솔직하게', emoji: '🔍', color: 'text-amber-500' },
  firm:   { label: '단호하게', emoji: '🔥', color: 'text-red-500' },
  custom: { label: '커스텀',   emoji: '✂️', color: 'text-purple-500' },
};

export default function DraftsVault({ open, onClose }: Props) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/mode/draft/save?limit=30')
      .then((r) => r.json())
      .then((data) => {
        setDrafts(data.drafts ?? []);
        if (data.warning) setWarning(data.warning);
      })
      .catch(() => {/* 조용히 */})
      .finally(() => setLoading(false));
  }, [open]);

  const copyContent = async (d: DraftRow) => {
    try {
      await navigator.clipboard.writeText(d.content);
      setCopiedId(d.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {/* ignore */}
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9400] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
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
            className="w-full sm:max-w-lg bg-[#F4EFE6] rounded-t-[28px] sm:rounded-[24px] overflow-hidden shadow-2xl"
            style={{ maxHeight: '88dvh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D5C2A5]/60 bg-white/60 backdrop-blur-md">
              <div>
                <div className="text-[15px] font-bold text-[#4E342E]">📂 내 초안함</div>
                <div className="text-[11px] text-[#6D4C41]">저장한 메시지 {drafts.length}개</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#EAE1D0] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 목록 */}
            <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(88dvh - 64px)' }}>
              {loading && <div className="text-center text-[12px] text-[#6D4C41] py-8">로딩 중...</div>}

              {warning && (
                <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-300 text-[11px] text-yellow-800">
                  ⚠️ {warning} — DB 마이그레이션 실행 필요 (supabase/migrations/20260418_bridge_modes_v81.sql)
                </div>
              )}

              {!loading && drafts.length === 0 && !warning && (
                <div className="text-center py-10">
                  <div className="text-3xl mb-2">📭</div>
                  <div className="text-[12px] text-[#6D4C41]">저장된 초안이 없어</div>
                  <div className="text-[11px] text-[#6D4C41]/70 mt-1">초안 모드에서 '이걸로' 누르면 여기 쌓여</div>
                </div>
              )}

              {drafts.map((d) => {
                const meta = TONE_META[d.tone] ?? TONE_META.custom;
                const created = new Date(d.created_at);
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-2xl bg-white border border-[#D5C2A5]/60 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-1.5 text-[11px]">
                      <span className="text-base">{meta.emoji}</span>
                      <span className={`font-bold ${meta.color}`}>{meta.label}</span>
                      {d.sent_at && <span className="text-green-600 font-bold">✓ 보냄</span>}
                      <span className="ml-auto text-[#6D4C41]/60 tabular-nums">
                        {created.toLocaleDateString('ko-KR')} {created.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {d.context && (
                      <div className="text-[10px] text-[#6D4C41]/70 mb-2 italic">📍 {d.context}</div>
                    )}
                    <p className="text-[13px] text-[#4E342E] leading-relaxed whitespace-pre-wrap mb-2">{d.content}</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => copyContent(d)}
                        className="flex-1 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037] active:scale-95"
                      >
                        {copiedId === d.id ? '✓ 복사됨' : '📋 복사'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
