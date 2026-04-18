'use client';

/**
 * 👥 v82: PANEL REPORT — 채팅 네이티브
 *
 * 3명 페르소나가 각자 카톡 말풍선으로 의견 전달.
 * 유저가 공감 선택 → 그 페르소나와 2-3턴 대화 → 마무리.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { PanelState, PanelPersona } from '@/engines/bridge-modes/types';

interface PanelModeProps {
  initial: PanelState & { modeId: 'panel' };
  onComplete: (chosen: PanelPersona, deepenTurns?: Array<{ role: 'user' | 'luna'; content: string }>) => void;
}

export default function PanelMode({ initial, onComplete }: PanelModeProps) {
  const [personas, setPersonas] = useState<PanelPersona[]>(initial.personas);
  const [deepenMode, setDeepenMode] = useState(false);
  const [deepenTurns, setDeepenTurns] = useState<Array<{ role: 'user' | 'luna'; content: string }>>([]);
  const [deepenInput, setDeepenInput] = useState('');
  const [deepenLoading, setDeepenLoading] = useState(false);

  const resonated = personas.find((p) => p.userReaction === 'resonate');

  const setReaction = (id: PanelPersona['id'], reaction: 'resonate' | 'listen' | 'dismiss') => {
    try { navigator.vibrate?.(5); } catch {/**/}
    setPersonas((arr) =>
      arr.map((p) => {
        if (p.id === id) return { ...p, userReaction: reaction };
        if (reaction === 'resonate' && p.userReaction === 'resonate') return { ...p, userReaction: null };
        return p;
      })
    );
  };

  const askDeepen = async (question: string) => {
    if (!resonated || !question.trim() || deepenLoading) return;
    const nh = [...deepenTurns, { role: 'user' as const, content: question }];
    setDeepenTurns(nh);
    setDeepenInput('');
    setDeepenLoading(true);
    try {
      const res = await fetch('/api/mode/panel/deepen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: initial.context, persona: resonated, userMessage: question, history: deepenTurns }),
      });
      const data = await res.json();
      setDeepenTurns([...nh, { role: 'luna', content: data.reply ?? '...' }]);
    } finally {
      setDeepenLoading(false);
    }
  };

  const finish = () => {
    if (!resonated) return;
    try {
      confetti({ particleCount: 16, spread: 55, origin: { y: 0.85 }, zIndex: 9990 });
    } catch {/**/}
    onComplete(resonated, deepenTurns);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[92%] mx-auto my-4 space-y-2"
    >
      <LunaBubble>야 이건 나 혼자 말고 3명한테 물어봤어 👥|||어느 시선이 제일 와닿아?</LunaBubble>

      {/* 3 페르소나 말풍선 */}
      {personas.map((p, idx) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{
            opacity: p.userReaction === 'dismiss' ? 0.4 : 1,
            x: 0,
            scale: p.userReaction === 'resonate' ? 1.02 : 1,
          }}
          transition={{ delay: 0.2 + idx * 0.2, type: 'spring', stiffness: 300, damping: 26 }}
          className="flex items-end gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-[#D5C2A5] flex items-center justify-center text-base shrink-0">
            {p.emoji}
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold text-[#5D4037] ml-1 mb-0.5 flex items-center gap-1">
              {p.name}
              {p.userReaction === 'resonate' && <span className="text-pink-500 text-[9px]">💙 공감</span>}
            </div>
            <div
              className={`px-3 py-2 rounded-2xl rounded-tl-sm text-[13px] text-[#4E342E] leading-relaxed shadow-sm border transition-all ${
                p.userReaction === 'resonate'
                  ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-300'
                  : p.userReaction === 'dismiss'
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-[#D5C2A5]'
              }`}
            >
              {p.opinion}
            </div>
            {/* 반응 버튼 */}
            {!deepenMode && (
              <div className="flex gap-1 mt-1.5">
                <ReactionBtn active={p.userReaction === 'resonate'} onClick={() => setReaction(p.id, 'resonate')} icon="💙" label="공감" primary />
                <ReactionBtn active={p.userReaction === 'listen'} onClick={() => setReaction(p.id, 'listen')} icon="🤔" label="들어볼래" />
                <ReactionBtn active={p.userReaction === 'dismiss'} onClick={() => setReaction(p.id, 'dismiss')} icon="🙅" label="아니야" />
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {/* CTA: 깊이 파고들기 */}
      {resonated && !deepenMode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="pt-1">
          <button
            onClick={() => setDeepenMode(true)}
            className="w-full py-2.5 rounded-full bg-[#B56576] text-white font-bold text-[13px] active:scale-[0.98] shadow-md"
          >
            {resonated.emoji} {resonated.name} 관점으로 더 깊게
          </button>
        </motion.div>
      )}

      {/* 깊이 파고들기 대화 */}
      <AnimatePresence>
        {deepenMode && resonated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 space-y-2"
          >
            <LunaBubble>오케이 {resonated.name}한테 더 물어봐 — 뭐든 물어봐도 돼</LunaBubble>

            {deepenTurns.map((t, i) => (
              t.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-[#B56576] text-white text-[12px]">
                    {t.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#D5C2A5] flex items-center justify-center text-base shrink-0">{resonated.emoji}</div>
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tl-sm bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 text-[12px] text-[#4E342E]">
                    {t.content}
                  </div>
                </div>
              )
            ))}

            {deepenLoading && (
              <div className="text-center text-[11px] text-[#6D4C41] italic">생각 중...</div>
            )}

            {/* 입력 */}
            <div className="flex gap-1.5 ml-10">
              <input
                type="text"
                value={deepenInput}
                onChange={(e) => setDeepenInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') askDeepen(deepenInput); }}
                placeholder={`${resonated.name}한테 물어봐...`}
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

            {deepenTurns.length >= 2 && (
              <button
                onClick={finish}
                className="w-full py-2.5 rounded-full bg-white border-2 border-[#B56576] text-[#B56576] font-bold text-[12px] mt-2"
              >
                ✓ 이제 채팅으로 돌아가기
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LunaBubble({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-end gap-2">
      <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-[#EACbb3] overflow-hidden shrink-0">
        <img src="/luna_fox_transparent.png" alt="루나" className="w-full h-full object-cover" />
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

function ReactionBtn({ active, onClick, icon, label, primary = false }: { active: boolean; onClick: () => void; icon: string; label: string; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1 rounded-full text-[10px] font-bold transition-all active:scale-95 ${
        active
          ? primary
            ? 'bg-[#B56576] text-white'
            : 'bg-[#6D4C41] text-white'
          : 'bg-[#EAE1D0] text-[#5D4037] hover:bg-[#D5C2A5]'
      }`}
    >
      {icon} {label}
    </button>
  );
}
