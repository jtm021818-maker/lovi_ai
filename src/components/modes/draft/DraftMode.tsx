'use client';

/**
 * ✏️ v82: DRAFT WORKSHOP — 채팅 네이티브 (오버레이 없음)
 *
 * Luna 가 진짜로 3개 초안을 카톡으로 보낸 느낌.
 * - 위에 Luna 한마디: "야 내가 3개 써봤어 골라봐 ㅎㅎ"
 * - 3개 말풍선 (💐 / 🔍 / 🔥 이모지 + 색조 다름)
 * - 각 말풍선에 [이걸로] / [고칠래] 버튼
 * - 선택 시: 나머지 2개 opacity 낮춤 + Luna 한마디 "오 그거 좋지 🔥"
 * - 완료 액션은 부모(ChatContainer) 의 onComplete
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DraftState, DraftOption } from '@/engines/bridge-modes/types';
import LunaChainBubble from '../_shared/LunaChainBubble';

interface DraftModeProps {
  initial: DraftState & { modeId: 'draft' };
  onComplete: (chosen: { draft: DraftOption; finalContent: string }) => void;
}

export default function DraftMode({ initial, onComplete }: DraftModeProps) {
  const [drafts, setDrafts] = useState<DraftOption[]>(initial.drafts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');

  const selectDraft = (d: DraftOption) => {
    setSelectedId(d.id);
    // 800ms 후 완료 (Luna 가 다시 한마디 할 여유)
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
      {/* Luna 오프닝 멘트 — ||| 로 분리돼서 연속 카톡 느낌 */}
      <LunaChainBubble
        text={`야 내가 3개 써봤어${selectedId ? '' : ' ㅎㅎ'}|||어떤 게 제일 맘에 와?`}
      />

      {/* 3개 초안 말풍선 — Luna 가 연속으로 보낸 느낌 */}
      {drafts.map((d, idx) => {
        const toneColor = d.tone === 'soft' ? '#3B82F6' : d.tone === 'honest' ? '#F59E0B' : '#EF4444';
        const toneBg = d.tone === 'soft' ? '#DBEAFE' : d.tone === 'honest' ? '#FEF3C7' : '#FEE2E2';
        const isSelected = selectedId === d.id;
        const isOther = selectedId && selectedId !== d.id;
        const isEditing = editingId === d.id;

        return (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: isOther ? 0.3 : 1,
              y: 0,
              scale: isSelected ? 1.02 : 1,
            }}
            transition={{ delay: 0.9 + idx * 0.45, type: 'spring', stiffness: 300, damping: 26 }}
            className="flex items-start gap-2 ml-10"
          >
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1 ml-1">
                <span className="text-[11px]">{d.tone === 'soft' ? '💐' : d.tone === 'honest' ? '🔍' : '🔥'}</span>
                <span className="text-[10px] font-bold" style={{ color: toneColor }}>{d.label}</span>
                <div className="flex-1 h-[2px] rounded-full" style={{ background: `${toneBg}`, maxWidth: `${d.intensity}%` }} />
                <span className="text-[9px] tabular-nums opacity-60" style={{ color: toneColor }}>{d.intensity}</span>
              </div>

              {!isEditing ? (
                <div
                  className="px-3 py-2.5 rounded-2xl rounded-tl-sm text-[13px] text-[#4E342E] leading-relaxed shadow-sm border"
                  style={{ background: toneBg, borderColor: `${toneColor}55` }}
                >
                  {d.content}
                </div>
              ) : (
                <div>
                  <textarea
                    value={editBuffer}
                    onChange={(e) => setEditBuffer(e.target.value)}
                    autoFocus
                    className="w-full p-2.5 rounded-2xl text-[13px] text-[#4E342E] border-2 resize-none"
                    style={{ background: toneBg, borderColor: toneColor, minHeight: 70 }}
                  />
                </div>
              )}

              {/* 액션 버튼 */}
              {!selectedId && (
                <div className="flex gap-1 mt-1.5">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => selectDraft(d)}
                        className="flex-1 py-1.5 rounded-full bg-white text-[11px] font-bold active:scale-95 transition-transform shadow-sm"
                        style={{ color: toneColor, border: `1.5px solid ${toneColor}` }}
                      >
                        이걸로 보낼게
                      </button>
                      <button
                        onClick={() => startEdit(d)}
                        className="px-3 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037] active:scale-95"
                      >
                        조금 고칠래
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={saveEdit}
                        className="flex-1 py-1.5 rounded-full text-white text-[11px] font-bold active:scale-95"
                        style={{ background: toneColor }}
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037]"
                      >
                        취소
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

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
