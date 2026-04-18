'use client';

/**
 * 💡 v81: IDEA REFINE Mode — 유저 아이디어 입력 → Luna 다듬기 → 비교
 *
 * 흐름:
 *   1. 유저가 아이디어 입력 (textarea)
 *   2. [다듬기] 버튼 → API 호출
 *   3. 원본 vs 다듬은 것 side-by-side
 *   4. diff 하이라이트 + 이유 툴팁
 *   5. [원본 살리기] / [루나꺼로] / [섞어서 편집]
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { diffWords } from 'diff';
import ModeFrame from '../ModeFrame';
import type { IdeaState } from '@/engines/bridge-modes/types';

interface IdeaModeProps {
  initial: IdeaState & { modeId: 'idea' };
  onComplete: (chosen: { final: string; source: 'original' | 'refined' | 'merged' }) => void;
  onExit: () => void;
  /** 다듬기 API 호출 */
  onRefine: (original: string) => Promise<{ refined: string; reasons: string[] }>;
}

export default function IdeaMode({ initial, onComplete, onExit, onRefine }: IdeaModeProps) {
  const [original, setOriginal] = useState(initial.original);
  const [refined, setRefined] = useState(initial.refined);
  const [reasons, setReasons] = useState<string[]>(initial.reasons ?? []);
  const [loading, setLoading] = useState(false);
  const [merged, setMerged] = useState('');
  const [editMode, setEditMode] = useState(false);

  const handleRefine = async () => {
    if (!original.trim()) return;
    setLoading(true);
    try {
      const result = await onRefine(original);
      setRefined(result.refined);
      setReasons(result.reasons);
      setMerged(result.refined); // edit mode 기본값
    } catch (err) {
      console.error('[IdeaMode] 다듬기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChoose = (source: 'original' | 'refined' | 'merged') => {
    const final = source === 'original' ? original : source === 'refined' ? refined! : merged;
    onComplete({ final, source });
  };

  return (
    <ModeFrame modeId="idea" onExit={onExit}>
      <div className="p-4 space-y-4">
        {/* 입력 단계 */}
        {!refined && (
          <>
            <div className="text-center py-2">
              <div className="text-[13px] font-bold text-[#5D4037]">네 아이디어 들어볼게</div>
              <div className="text-[11px] text-[#6D4C41]/80 mt-0.5">뭐든 써봐, 내가 다듬어줄게</div>
            </div>
            <textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="예: 이번 주말에 영화보자고 카톡 보낼까?"
              className="w-full min-h-[120px] p-3 rounded-xl border-2 border-[#D5C2A5]/60 bg-white text-[14px] text-[#4E342E] focus:outline-none focus:border-[#B56576] resize-none"
            />
            <button
              onClick={handleRefine}
              disabled={!original.trim() || loading}
              className="w-full py-3 rounded-full bg-[#B56576] text-white font-bold text-[14px] disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? '루나가 다듬는 중...' : '🦊 루나가 다듬기'}
            </button>
          </>
        )}

        {/* 비교 단계 */}
        {refined && !editMode && (
          <>
            {/* 원본 */}
            <div className="p-3 rounded-xl bg-[#EAE1D0]/60 border border-[#D5C2A5]">
              <div className="text-[11px] font-bold text-[#6D4C41] mb-1">✍️ 네 원본</div>
              <div className="text-[13px] text-[#4E342E] leading-relaxed">{original}</div>
            </div>

            {/* 루나 다듬음 + diff */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="p-3 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-[#B56576]/40"
            >
              <div className="text-[11px] font-bold text-[#B56576] mb-1">🦊 루나 다듬음</div>
              <div className="text-[13px] text-[#4E342E] leading-relaxed">
                <DiffView original={original} refined={refined} />
              </div>
            </motion.div>

            {/* 이유들 */}
            {reasons.length > 0 && (
              <div className="space-y-1.5">
                {reasons.map((reason, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="text-[11px] text-[#6D4C41] px-2 italic"
                  >
                    💡 {reason}
                  </motion.div>
                ))}
              </div>
            )}

            {/* 선택 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleChoose('original')}
                className="flex-1 py-2.5 rounded-full bg-[#EAE1D0] text-[#5D4037] font-bold text-[12px] active:scale-[0.98]"
              >
                원본 살리기
              </button>
              <button
                onClick={() => { setMerged(refined); setEditMode(true); }}
                className="flex-1 py-2.5 rounded-full bg-white border-2 border-[#B56576]/40 text-[#B56576] font-bold text-[12px] active:scale-[0.98]"
              >
                섞어서 편집
              </button>
              <button
                onClick={() => handleChoose('refined')}
                className="flex-1 py-2.5 rounded-full bg-[#B56576] text-white font-bold text-[12px] active:scale-[0.98]"
              >
                루나꺼로
              </button>
            </div>
          </>
        )}

        {/* 편집 단계 */}
        <AnimatePresence>
          {editMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="text-[12px] font-bold text-[#5D4037]">✂️ 섞어서 편집</div>
              <textarea
                value={merged}
                onChange={(e) => setMerged(e.target.value)}
                className="w-full min-h-[100px] p-3 rounded-xl border-2 border-[#B56576] bg-white text-[14px] text-[#4E342E] focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-2.5 rounded-full bg-[#EAE1D0] text-[#5D4037] font-bold text-[12px]"
                >
                  취소
                </button>
                <button
                  onClick={() => handleChoose('merged')}
                  className="flex-1 py-2.5 rounded-full bg-[#B56576] text-white font-bold text-[12px]"
                >
                  이걸로 결정
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModeFrame>
  );
}

function DiffView({ original, refined }: { original: string; refined: string }) {
  const parts = diffWords(original, refined);
  return (
    <>
      {parts.map((p, i) => {
        if (p.added) return <span key={i} className="bg-green-200/60 rounded px-0.5">{p.value}</span>;
        if (p.removed) return <span key={i} className="bg-red-200/50 line-through opacity-60 rounded px-0.5">{p.value}</span>;
        return <span key={i}>{p.value}</span>;
      })}
    </>
  );
}
