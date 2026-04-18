'use client';

/**
 * ✏️ v81: DRAFT WORKSHOP Mode — 3가지 초안 카드 공방
 *
 * 흐름:
 *   1. 3개 카드 (A 부드럽게 / B 솔직하게 / C 단호하게) 순차 등장
 *   2. 각 카드: 미리보기 + 온도계 + [편집] [이걸로]
 *   3. [편집] → textarea 열림, 실시간 길이 카운터
 *   4. [이걸로] → 채팅으로 확정 전달
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModeFrame from '../ModeFrame';
import type { DraftState, DraftOption } from '@/engines/bridge-modes/types';

interface DraftModeProps {
  initial: DraftState & { modeId: 'draft' };
  onComplete: (chosen: { draft: DraftOption; finalContent: string }) => void;
  onExit: () => void;
}

export default function DraftMode({ initial, onComplete, onExit }: DraftModeProps) {
  const [drafts, setDrafts] = useState<DraftOption[]>(initial.drafts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<string>('');
  // 🆕 v81: 반응 시뮬레이션
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simulations, setSimulations] = useState<Record<string, Array<{ type: string; reaction: string; likelihood: number }>>>({});

  const simulateReactions = async (d: DraftOption) => {
    if (simulatingId) return;
    setSimulatingId(d.id);
    try {
      const res = await fetch('/api/mode/draft/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: d.content, context: initial.context }),
      });
      const data = await res.json();
      setSimulations((prev) => ({ ...prev, [d.id]: data.reactions ?? [] }));
    } catch (e) {
      console.error('[DraftSim] 실패:', e);
    } finally {
      setSimulatingId(null);
    }
  };

  const startEdit = (d: DraftOption) => {
    setEditingId(d.id);
    setEditBuffer(d.content);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setDrafts((arr) => arr.map((d) => (d.id === editingId ? { ...d, content: editBuffer } : d)));
    setEditingId(null);
    setEditBuffer('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuffer('');
  };

  const confirm = (d: DraftOption) => {
    onComplete({ draft: d, finalContent: d.content });
  };

  return (
    <ModeFrame modeId="draft" subtitle={initial.context} onExit={onExit}>
      <div className="p-4 space-y-4">
        <div className="text-center py-2">
          <div className="text-[13px] font-bold text-[#5D4037]">어떤 버전이 좋아?</div>
          <div className="text-[11px] text-[#6D4C41]/80 mt-0.5">3가지로 짜봤어 — 편집도 가능해</div>
        </div>

        {drafts.map((d, idx) => (
          <DraftCard
            key={d.id}
            draft={d}
            idx={idx}
            isEditing={editingId === d.id}
            editBuffer={editBuffer}
            onEditBufferChange={setEditBuffer}
            onStartEdit={() => startEdit(d)}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onConfirm={() => confirm(d)}
            simulations={simulations[d.id]}
            isSimulating={simulatingId === d.id}
            onSimulate={() => simulateReactions(d)}
          />
        ))}
      </div>
    </ModeFrame>
  );
}

// ──────────────────────────────────────────────

function DraftCard({
  draft,
  idx,
  isEditing,
  editBuffer,
  onEditBufferChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onConfirm,
  simulations,
  isSimulating,
  onSimulate,
}: {
  draft: DraftOption;
  idx: number;
  isEditing: boolean;
  editBuffer: string;
  onEditBufferChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onConfirm: () => void;
  simulations?: Array<{ type: string; reaction: string; likelihood: number }>;
  isSimulating: boolean;
  onSimulate: () => void;
}) {
  const toneEmoji = draft.tone === 'soft' ? '💐' : draft.tone === 'honest' ? '🔍' : '🔥';
  const intensityColor =
    draft.intensity < 33 ? '#60A5FA' :
    draft.intensity < 66 ? '#FBBF24' :
    '#EF4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + idx * 0.1, type: 'spring', stiffness: 300, damping: 26 }}
      className="p-4 rounded-2xl bg-white border-[2px] border-[#D5C2A5]/60 shadow-sm"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[12px] font-black text-[#B56576]">{draft.id}</span>
        <span className="text-lg">{toneEmoji}</span>
        <span className="text-[13px] font-bold text-[#5D4037]">{draft.label}</span>
        {/* 온도계 */}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-12 h-1.5 rounded-full bg-[#EAE1D0] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${draft.intensity}%` }}
              transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
              className="h-full rounded-full"
              style={{ background: intensityColor }}
            />
          </div>
          <span className="text-[9px] font-bold tabular-nums" style={{ color: intensityColor }}>
            {draft.intensity}
          </span>
        </div>
      </div>

      {/* 내용 — 카톡 말풍선 스타일 */}
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <textarea
              value={editBuffer}
              onChange={(e) => onEditBufferChange(e.target.value)}
              className="w-full min-h-[100px] p-3 rounded-xl border-2 border-[#B56576] bg-[#FDF8F3] text-[13px] text-[#4E342E] focus:outline-none resize-none"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-[#6D4C41]/70 tabular-nums">{editBuffer.length}자</span>
              <div className="flex gap-1.5">
                <button onClick={onCancelEdit} className="px-3 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037]">
                  취소
                </button>
                <button onClick={onSaveEdit} className="px-3 py-1.5 rounded-full bg-[#B56576] text-white text-[11px] font-bold">
                  저장
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="p-3 rounded-2xl rounded-tl-sm bg-[#F4EFE6] border border-[#D5C2A5]/50">
              <p className="text-[13px] text-[#4E342E] leading-relaxed whitespace-pre-wrap">{draft.content}</p>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[10px] text-[#6D4C41]/60 tabular-nums">{draft.content.length}자</span>
              <div className="flex gap-1.5">
                <button
                  onClick={onSimulate}
                  disabled={isSimulating}
                  className="px-3 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037] active:scale-95 transition-transform disabled:opacity-60"
                >
                  {isSimulating ? '...' : '👀 반응 예상'}
                </button>
                <button
                  onClick={onStartEdit}
                  className="px-3 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037] active:scale-95 transition-transform"
                >
                  ✏️ 편집
                </button>
                <button
                  onClick={onConfirm}
                  className="px-3 py-1.5 rounded-full bg-[#B56576] text-white text-[11px] font-bold active:scale-95 transition-transform"
                >
                  이걸로
                </button>
              </div>
            </div>
            {/* 반응 시뮬레이션 결과 */}
            {simulations && simulations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 space-y-1.5 overflow-hidden"
              >
                <div className="text-[10px] font-bold text-[#6D4C41]">상대 반응 예상</div>
                {simulations.map((sim, i) => {
                  const color = sim.type === 'positive' ? 'bg-green-50 border-green-300' :
                                sim.type === 'neutral'  ? 'bg-gray-50 border-gray-300' :
                                'bg-red-50 border-red-300';
                  const emoji = sim.type === 'positive' ? '😊' : sim.type === 'neutral' ? '😐' : '😤';
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`p-2 rounded-lg border text-[11px] ${color}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span>{emoji}</span>
                        <span className="text-[9px] font-bold text-[#6D4C41]">{sim.likelihood}%</span>
                      </div>
                      <div className="text-[#4E342E]">&ldquo;{sim.reaction}&rdquo;</div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
