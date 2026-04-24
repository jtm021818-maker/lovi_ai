'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DraftState, DraftOption } from '@/engines/bridge-modes/types';
import LunaChainBubble from '../_shared/LunaChainBubble';

interface DraftModeProps {
  initial: DraftState & { modeId: 'draft' };
  onComplete: (chosen: { draft: DraftOption; finalContent: string }) => void;
}

// 인트로 버블 2개 (stagger 0.5s × 2 + DOTS 0.7s ≈ 1.2s) 후 첫 카드 등장
const INTRO_END_MS = 1500;
const CARD_STAGGER_MS = 1150;
const CARD_DOTS_MS = 650;

function DraftCard({
  d, idx, selectedId, editingId, editBuffer,
  onSelect, onStartEdit, onSaveEdit, onCancelEdit, onEditChange,
}: {
  d: DraftOption;
  idx: number;
  selectedId: string | null;
  editingId: string | null;
  editBuffer: string;
  onSelect: (d: DraftOption) => void;
  onStartEdit: (d: DraftOption) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (v: string) => void;
}) {
  const slideInDelay = (INTRO_END_MS + idx * CARD_STAGGER_MS) / 1000;
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), INTRO_END_MS + idx * CARD_STAGGER_MS + CARD_DOTS_MS);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toneColor = d.tone === 'soft' ? '#3B82F6' : d.tone === 'honest' ? '#F59E0B' : '#EF4444';
  const toneBg   = d.tone === 'soft' ? '#DBEAFE' : d.tone === 'honest' ? '#FEF3C7' : '#FEE2E2';
  const toneIcon = d.tone === 'soft' ? '💐'      : d.tone === 'honest' ? '🔍'      : '🔥';
  const isSelected = selectedId === d.id;
  const isOther    = selectedId !== null && selectedId !== d.id;
  const isEditing  = editingId === d.id;

  return (
    <motion.div
      initial={{ opacity: 0, x: -14, y: 8 }}
      animate={{ opacity: isOther ? 0.3 : 1, x: 0, y: 0, scale: isSelected ? 1.02 : 1 }}
      transition={{ delay: slideInDelay, type: 'spring', stiffness: 280, damping: 24 }}
      className="flex items-start gap-2 ml-10"
    >
      <div className="flex-1">
        {/* 라벨 행 */}
        <div className="flex items-center gap-1.5 mb-1 ml-1">
          <span className="text-[11px]">{toneIcon}</span>
          <span className="text-[10px] font-bold" style={{ color: toneColor }}>{d.label}</span>
          <div className="flex-1 h-[2px] rounded-full" style={{ background: toneBg, maxWidth: `${d.intensity}%` }} />
          <span className="text-[9px] tabular-nums opacity-60" style={{ color: toneColor }}>{d.intensity}</span>
        </div>

        {/* dots → 내용 */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="dots"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2.5 rounded-2xl rounded-tl-sm border min-h-[44px] flex items-center"
              style={{ background: toneBg, borderColor: `${toneColor}55` }}
            >
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: toneColor }}
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                  />
                ))}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {!isEditing ? (
                <div
                  className="px-3 py-2.5 rounded-2xl rounded-tl-sm text-[13px] text-[#4E342E] leading-relaxed shadow-sm border"
                  style={{ background: toneBg, borderColor: `${toneColor}55` }}
                >
                  {d.content}
                </div>
              ) : (
                <textarea
                  value={editBuffer}
                  onChange={(e) => onEditChange(e.target.value)}
                  autoFocus
                  className="w-full p-2.5 rounded-2xl text-[13px] text-[#4E342E] border-2 resize-none"
                  style={{ background: toneBg, borderColor: toneColor, minHeight: 70 }}
                />
              )}

              {!selectedId && (
                <div className="flex gap-1 mt-1.5">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => onSelect(d)}
                        className="flex-1 py-1.5 rounded-full bg-white text-[11px] font-bold active:scale-95 transition-transform shadow-sm"
                        style={{ color: toneColor, border: `1.5px solid ${toneColor}` }}
                      >
                        이걸로 보낼게
                      </button>
                      <button
                        onClick={() => onStartEdit(d)}
                        className="px-3 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037] active:scale-95"
                      >
                        조금 고칠래
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={onSaveEdit}
                        className="flex-1 py-1.5 rounded-full text-white text-[11px] font-bold active:scale-95"
                        style={{ background: toneColor }}
                      >
                        저장
                      </button>
                      <button
                        onClick={onCancelEdit}
                        className="px-3 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037]"
                      >
                        취소
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function DraftMode({ initial, onComplete }: DraftModeProps) {
  const [drafts, setDrafts] = useState<DraftOption[]>(initial.drafts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');

  const selectDraft = (d: DraftOption) => {
    setSelectedId(d.id);
    setTimeout(() => onComplete({ draft: d, finalContent: d.content }), 900);
  };

  const startEdit = (d: DraftOption) => {
    setEditingId(d.id);
    setEditBuffer(d.content);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setDrafts((arr) => arr.map((d) => (d.id === editingId ? { ...d, content: editBuffer } : d)));
    setEditingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[92%] mx-auto my-4 space-y-2"
    >
      {/* Luna 오프닝 — typing dots 연출 */}
      <LunaChainBubble
        text={`야 내가 3개 써봤어${selectedId ? '' : ' ㅎㅎ'}|||어떤 게 제일 맘에 와?`}
        stagger={0.5}
        showTypingDots
      />

      {/* 3개 초안 — 순차 등장 */}
      {drafts.map((d, idx) => (
        <DraftCard
          key={d.id}
          d={d}
          idx={idx}
          selectedId={selectedId}
          editingId={editingId}
          editBuffer={editBuffer}
          onSelect={selectDraft}
          onStartEdit={startEdit}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditingId(null)}
          onEditChange={setEditBuffer}
        />
      ))}

      {/* 선택 후 Luna 마지막 멘트 */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-end gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-[#EACbb3] overflow-hidden shrink-0">
              <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
            </div>
            <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-[#F4EFE6] border border-[#D5C2A5] text-[13px] text-[#4E342E]">
              오 그거 좋지 🔥
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
