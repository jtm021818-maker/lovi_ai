'use client';

/**
 * 👥 v81: PANEL REPORT Mode — 3 페르소나 관점 비교
 *
 * 3명 (언니/친구/선배) 각자 의견 카드 순차 등장.
 * 유저가 각 카드에 반응: 공감 / 들어볼게 / 아니야
 * 공감 1개만 가능 (라디오).
 * 공감한 페르소나로 "더 깊게" 버튼 → 채팅으로 넘기며 그 관점 이어감.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModeFrame from '../ModeFrame';
import type { PanelState, PanelPersona } from '@/engines/bridge-modes/types';

interface PanelModeProps {
  initial: PanelState & { modeId: 'panel' };
  onComplete: (chosen: PanelPersona, deepenTurns?: Array<{ role: 'user' | 'luna'; content: string }>) => void;
  onExit: () => void;
}

export default function PanelMode({ initial, onComplete, onExit }: PanelModeProps) {
  const [personas, setPersonas] = useState<PanelPersona[]>(initial.personas);
  // 🆕 v81: 깊이 파고들기 모드
  const [deepenMode, setDeepenMode] = useState(false);
  const [deepenTurns, setDeepenTurns] = useState<Array<{ role: 'user' | 'luna'; content: string }>>([]);
  const [deepenInput, setDeepenInput] = useState('');
  const [deepenLoading, setDeepenLoading] = useState(false);

  const resonated = personas.find((p) => p.userReaction === 'resonate');

  const askDeepen = async (question: string) => {
    if (!resonated || !question.trim() || deepenLoading) return;
    const newHistory = [...deepenTurns, { role: 'user' as const, content: question }];
    setDeepenTurns(newHistory);
    setDeepenInput('');
    setDeepenLoading(true);
    try {
      const res = await fetch('/api/mode/panel/deepen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: initial.context,
          persona: resonated,
          userMessage: question,
          history: deepenTurns,
        }),
      });
      const data = await res.json();
      setDeepenTurns([...newHistory, { role: 'luna' as const, content: data.reply ?? '...' }]);
    } catch (e) {
      console.error('[PanelDeepen] 실패:', e);
    } finally {
      setDeepenLoading(false);
    }
  };

  const setReaction = (id: PanelPersona['id'], reaction: 'resonate' | 'listen' | 'dismiss') => {
    setPersonas((arr) =>
      arr.map((p) => {
        if (p.id === id) return { ...p, userReaction: reaction };
        // resonate 는 라디오 — 다른 사람은 공감 해제
        if (reaction === 'resonate' && p.userReaction === 'resonate') return { ...p, userReaction: null };
        return p;
      })
    );
  };

  return (
    <ModeFrame modeId="panel" subtitle={initial.context} onExit={onExit}>
      <div className="p-4 space-y-4">
        {/* 상단 아바타 줄 (현재 반응 상태 시각화) */}
        <div className="flex items-center justify-center gap-2 py-2">
          {personas.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xl transition-all ${
                  p.userReaction === 'resonate'
                    ? 'bg-[#B56576]/20 ring-2 ring-[#B56576]'
                    : p.userReaction === 'listen'
                      ? 'bg-[#EAE1D0]'
                      : p.userReaction === 'dismiss'
                        ? 'bg-[#EAE1D0] opacity-40 line-through'
                        : 'bg-white border border-[#D5C2A5]'
                }`}
              >
                {p.emoji}
              </div>
              <div className="text-[9px] text-[#6D4C41] font-medium">{p.name.slice(0, 2)}</div>
            </div>
          ))}
        </div>

        <div className="text-center py-1">
          <div className="text-[13px] font-bold text-[#5D4037]">3명이 각자 한마디 줬어</div>
          <div className="text-[11px] text-[#6D4C41]/80 mt-0.5">어느 관점이 제일 와닿아?</div>
        </div>

        {/* 3개 카드 */}
        {personas.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + idx * 0.15, type: 'spring', stiffness: 300, damping: 26 }}
            className={`p-4 rounded-2xl border-2 transition-all ${
              p.userReaction === 'resonate'
                ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-[#B56576] shadow-lg'
                : p.userReaction === 'dismiss'
                  ? 'bg-gray-50/40 border-gray-200 opacity-50'
                  : 'bg-white border-[#D5C2A5]/60'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{p.emoji}</span>
              <span className="text-[13px] font-bold text-[#5D4037]">{p.name}</span>
            </div>
            <p className="text-[13px] text-[#4E342E] leading-relaxed mb-3">&ldquo;{p.opinion}&rdquo;</p>
            <div className="flex gap-1.5">
              <ReactionBtn active={p.userReaction === 'resonate'} onClick={() => setReaction(p.id, 'resonate')} label="💙 내가 공감" primary />
              <ReactionBtn active={p.userReaction === 'listen'} onClick={() => setReaction(p.id, 'listen')} label="🤔 들어볼게" />
              <ReactionBtn active={p.userReaction === 'dismiss'} onClick={() => setReaction(p.id, 'dismiss')} label="🙅 아니야" />
            </div>
          </motion.div>
        ))}

        {/* CTA — 공감한 페르소나 있으면 깊이 파고들기 버튼 */}
        <motion.div
          animate={{ opacity: resonated ? 1 : 0.3, scale: resonated ? 1 : 0.98 }}
          className="pt-2"
        >
          <button
            onClick={() => resonated && setDeepenMode(true)}
            disabled={!resonated || deepenMode}
            className="w-full py-3 rounded-full bg-[#B56576] text-white font-bold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-md"
          >
            {resonated ? `${resonated.emoji} ${resonated.name} 관점으로 더 깊게` : '공감 가는 관점 골라줘'}
          </button>
        </motion.div>

        {/* 🆕 v81: 깊이 파고들기 서브 대화 */}
        <AnimatePresence>
          {deepenMode && resonated && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 p-3 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-[#B56576]/40 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{resonated.emoji}</span>
                <span className="text-[13px] font-bold text-[#5D4037]">{resonated.name} 과 얘기 중</span>
              </div>

              {/* 대화 */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {deepenTurns.map((t, i) => (
                  t.role === 'user' ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-[#B56576] text-white text-[12px]">
                        {t.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-base">{resonated.emoji}</span>
                      <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-[#D5C2A5]/50 text-[12px] text-[#4E342E]">
                        {t.content}
                      </div>
                    </div>
                  )
                ))}
                {deepenLoading && (
                  <div className="text-[11px] text-[#6D4C41] italic text-center">생각 중...</div>
                )}
              </div>

              {/* 입력 */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={deepenInput}
                  onChange={(e) => setDeepenInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') askDeepen(deepenInput); }}
                  placeholder="더 물어봐..."
                  className="flex-1 px-3 py-2 rounded-full border-2 border-[#D5C2A5]/60 bg-white text-[12px] focus:outline-none focus:border-[#B56576]"
                />
                <button
                  onClick={() => askDeepen(deepenInput)}
                  disabled={!deepenInput.trim() || deepenLoading}
                  className="px-4 py-2 rounded-full bg-[#B56576] text-white text-[11px] font-bold disabled:opacity-50"
                >
                  →
                </button>
              </div>

              {/* 마무리 버튼 */}
              {deepenTurns.length >= 2 && (
                <button
                  onClick={() => onComplete(resonated, deepenTurns)}
                  className="w-full py-2.5 rounded-full bg-white border-2 border-[#B56576] text-[#B56576] font-bold text-[12px]"
                >
                  ✓ 이제 채팅으로 돌아가기
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModeFrame>
  );
}

function ReactionBtn({ active, onClick, label, primary = false }: { active: boolean; onClick: () => void; label: string; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-all ${
        active
          ? primary
            ? 'bg-[#B56576] text-white'
            : 'bg-[#6D4C41] text-white'
          : 'bg-[#EAE1D0] text-[#5D4037] hover:bg-[#D5C2A5]'
      }`}
    >
      {label}
    </button>
  );
}
