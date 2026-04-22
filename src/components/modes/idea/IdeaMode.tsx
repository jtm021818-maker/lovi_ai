'use client';

/**
 * 💡 v82: IDEA REFINE — 채팅 네이티브
 *
 * 유저가 아이디어 쓰면 → Luna 가 "오케이 내가 다듬어볼게" → 다듬은 버전 카톡
 * → 3선택 (원본/루나꺼/섞기)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { diffWords } from 'diff';
import confetti from 'canvas-confetti';
import type { IdeaState } from '@/engines/bridge-modes/types';

interface IdeaModeProps {
  initial: IdeaState & { modeId: 'idea' };
  onComplete: (chosen: { final: string; source: 'original' | 'refined' | 'merged' }) => void;
  onRefine: (original: string) => Promise<{ refined: string; reasons: string[] }>;
}

export default function IdeaMode({ initial, onComplete, onRefine }: IdeaModeProps) {
  const [original, setOriginal] = useState(initial.original);
  const [refined, setRefined] = useState(initial.refined);
  const [reasons, setReasons] = useState<string[]>(initial.reasons ?? []);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [merged, setMerged] = useState('');

  const submit = async () => {
    if (!original.trim() || loading) return;
    setLoading(true);
    try {
      const r = await onRefine(original);
      setRefined(r.refined);
      setReasons(r.reasons);
      setMerged(r.refined);
    } finally {
      setLoading(false);
    }
  };

  const choose = (source: 'original' | 'refined' | 'merged') => {
    const final = source === 'original' ? original : source === 'refined' ? refined! : merged;
    try {
      confetti({ particleCount: 16, spread: 50, origin: { y: 0.85 }, startVelocity: 18, zIndex: 9990 });
      navigator.vibrate?.([5, 20, 5]);
    } catch {/* ignore */}
    setTimeout(() => onComplete({ final, source }), 700);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[92%] mx-auto my-4 space-y-2"
    >
      {/* Luna 오프닝 */}
      <LunaBubble>네 아이디어 들어볼게 — 뭐든 써봐 💭</LunaBubble>

      {/* 유저 입력 or 원본 표시 */}
      {!refined && (
        <div className="flex justify-end">
          <div className="max-w-[80%]">
            <textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="예: 이번 주말에 영화보자고 카톡 보낼까?"
              className="w-full min-h-[80px] p-3 rounded-2xl rounded-tr-sm border-2 border-[#D5C2A5] bg-white text-[13px] text-[#4E342E] focus:outline-none focus:border-[#B56576] resize-none"
            />
            <button
              onClick={submit}
              disabled={!original.trim() || loading}
              className="mt-1.5 ml-auto block px-4 py-2 rounded-full bg-[#B56576] text-white text-[12px] font-bold active:scale-95 disabled:opacity-50"
            >
              {loading ? '루나가 다듬는 중...' : '🦊 루나가 다듬어줘'}
            </button>
          </div>
        </div>
      )}

      {/* 원본 유저 메시지 (제출 후) */}
      {refined && (
        <>
          <div className="flex justify-end">
            <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-[#EAE1D0] text-[#4E342E] text-[13px]">
              {original}
            </div>
          </div>

          {/* Luna 다듬은 버전 — 반짝 등장 */}
          <LunaBubble>오케이 내가 다듬어봤어 ✨</LunaBubble>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.2 }}
            className="flex items-start gap-2 ml-10"
          >
            <div className="flex-1">
              <div
                className="px-3 py-2.5 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed shadow-md"
                style={{ background: 'linear-gradient(135deg, #fdf4ff, #fae8ff)', border: '1.5px solid #d8b4fe' }}
              >
                <DiffView original={original} refined={refined} />
              </div>

              {/* 이유들 */}
              {reasons.length > 0 && (
                <div className="space-y-1 mt-2 ml-1">
                  {reasons.map((reason, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="text-[11px] text-[#6D4C41] italic"
                    >
                      💡 {reason}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* 선택지 */}
          {!editMode && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex gap-1.5 ml-10 mt-2"
              >
                <button
                  onClick={() => choose('original')}
                  className="flex-1 py-2 rounded-full bg-[#EAE1D0] text-[#5D4037] font-bold text-[11px] active:scale-95"
                >
                  원본 살리기
                </button>
                <button
                  onClick={() => { setMerged(refined); setEditMode(true); }}
                  className="flex-1 py-2 rounded-full bg-white border-2 border-[#B56576]/40 text-[#B56576] font-bold text-[11px] active:scale-95"
                >
                  섞어 편집
                </button>
                <button
                  onClick={() => choose('refined')}
                  className="flex-1 py-2 rounded-full bg-[#B56576] text-white font-bold text-[11px] active:scale-95"
                >
                  루나꺼로
                </button>
              </motion.div>
            </AnimatePresence>
          )}

          {editMode && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-10 space-y-1.5 mt-2">
              <textarea
                value={merged}
                onChange={(e) => setMerged(e.target.value)}
                autoFocus
                className="w-full min-h-[70px] p-2.5 rounded-2xl border-2 border-[#B56576] bg-white text-[13px] text-[#4E342E] focus:outline-none resize-none"
              />
              <div className="flex gap-1.5">
                <button onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-full bg-[#EAE1D0] text-[#5D4037] font-bold text-[11px]">취소</button>
                <button onClick={() => choose('merged')} className="flex-1 py-2 rounded-full bg-[#B56576] text-white font-bold text-[11px]">이걸로</button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

function LunaBubble({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-end gap-2"
    >
      <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-[#EACbb3] overflow-hidden shrink-0">
        <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
      </div>
      <div>
        <div className="text-[10px] font-bold text-[#5D4037] ml-1 mb-0.5">루나</div>
        <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-[#F4EFE6] border border-[#D5C2A5] text-[13px] text-[#4E342E]">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

function DiffView({ original, refined }: { original: string; refined: string }) {
  const parts = diffWords(original, refined);
  return (
    <>
      {parts.map((p, i) => {
        if (p.added) return <span key={i} className="bg-green-200/70 rounded px-0.5 text-[#064e3b] font-semibold">{p.value}</span>;
        if (p.removed) return <span key={i} className="bg-red-200/50 line-through opacity-60 rounded px-0.5">{p.value}</span>;
        return <span key={i}>{p.value}</span>;
      })}
    </>
  );
}
