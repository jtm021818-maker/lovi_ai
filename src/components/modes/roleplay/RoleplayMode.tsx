'use client';

/**
 * 🎭 v82: ROLEPLAY — 채팅 네이티브
 *
 * Luna 이름이 "루나 → 루나(여친)" 으로 morph.
 * 아바타 뱃지 ("여친" 등) 자동 추가.
 * Narration 은 italic 회색 텍스트로 대사 위.
 * Quick replies 는 말풍선 아래 chip 형태.
 * Background 는 rose tint (부모에서 조건부).
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playBgm, stopBgm, pickBgmForRoleplay } from '@/lib/bgm/bgm-manager';
import { effectBus, isFxEnabled } from '@/lib/fx/effect-bus';
import type { RoleplayState } from '@/engines/bridge-modes/types';

type HistoryTurn = RoleplayState['history'][number];

interface RoleplayModeProps {
  initial: RoleplayState & { modeId: 'roleplay' };
  onComplete: (summary: string, history: HistoryTurn[]) => void;
  onTurn: (userChoice: string, history: HistoryTurn[]) => Promise<{
    narration: string | null;
    dialogue: string;
    spriteFrame: number;
    choices: string[];
    complete: boolean;
    completeSummary: string | null;
  }>;
}

// 역할별 아바타 배지 라벨
function roleBadge(archetype: string): string {
  if (archetype.includes('girlfriend') || archetype.includes('여친')) return '여친';
  if (archetype.includes('boyfriend') || archetype.includes('남친')) return '남친';
  if (archetype.includes('ex')) return '전남친';
  if (archetype.includes('crush')) return '썸';
  if (archetype.includes('friend')) return '친구';
  return '상대';
}

export default function RoleplayMode({ initial, onComplete, onTurn }: RoleplayModeProps) {
  const scenario = initial.scenario;
  const badge = roleBadge(scenario.role.archetype);
  const [history, setHistory] = useState<HistoryTurn[]>(
    initial.history.length > 0
      ? initial.history
      : [{ role: 'npc', content: scenario.opening.dialogue, spriteFrame: scenario.opening.spriteFrame, narration: scenario.opening.narration ?? undefined }]
  );
  const [choices, setChoices] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<{ feedback: string; tone: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    playBgm(pickBgmForRoleplay(scenario), 0.22);
    return () => { stopBgm(); };
  }, [scenario]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const sendChoice = async (choice: string) => {
    if (loading || !choice.trim()) return;
    setLoading(true);
    const nh: HistoryTurn[] = [...history, { role: 'user', content: choice }];
    setHistory(nh);
    setChoices([]); setCustomMode(false); setCustomInput('');

    try {
      const result = await onTurn(choice, nh);
      if (result.complete && result.completeSummary) {
        try {
          confetti({ particleCount: 20, spread: 60, origin: { y: 0.8 }, shapes: ['heart'] as any, colors: ['#f472b6', '#ec4899', '#db2777'], zIndex: 9990 });
          navigator.vibrate?.([10, 30, 10]);
        } catch {/**/}
        onComplete(result.completeSummary, [
          ...nh,
          { role: 'npc', content: result.dialogue, spriteFrame: result.spriteFrame, narration: result.narration },
        ]);
        return;
      }
      setHistory([...nh, { role: 'npc', content: result.dialogue, spriteFrame: result.spriteFrame, narration: result.narration }]);
      setChoices(result.choices);

      // FX 연동
      if (isFxEnabled()) {
        if (result.spriteFrame === 2) effectBus.fire({ id: 'shake.soft', target: 'screen' });
        else if (result.spriteFrame === 4) effectBus.fire({ id: 'flash.white', target: 'screen' });
        else if (result.spriteFrame === 1) effectBus.fire({ id: 'particle.tears', target: 'particle' });
      }

      // 코치 피드백 (3턴마다)
      const userTurns = nh.filter((h) => h.role === 'user').length;
      if (userTurns > 0 && userTurns % 3 === 0) {
        fetch('/api/mode/roleplay/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario, history: nh }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.feedback) {
              setCoachFeedback({ feedback: d.feedback, tone: d.tone });
              setTimeout(() => setCoachFeedback(null), 5000);
            }
          })
          .catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[94%] mx-auto my-4 relative"
    >
      {/* Rose tint 배경 (여친/썸 역할 시) */}
      {(badge === '여친' || badge === '썸') && (
        <div
          className="absolute inset-0 -mx-2 -my-2 rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(253,230,236,0.4), rgba(254,202,217,0.25))',
            zIndex: -1,
          }}
        />
      )}

      {/* Luna 오프닝 + 시나리오 */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-end gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-[#EACbb3] overflow-hidden shrink-0">
          <img src="/luna_fox_transparent.png" alt="루나" className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-[#5D4037] ml-1 mb-0.5">루나</div>
          <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-[#F4EFE6] border border-[#D5C2A5] text-[13px] text-[#4E342E]">
            🎬 내가 {badge} 역할 해볼게|||상황: {scenario.situation}|||준비됐어? 그냥 답장하듯 해봐
          </div>
        </div>
      </motion.div>

      {/* 대화 이력 */}
      <div className="space-y-2.5">
        {history.map((turn, idx) => (
          <TurnBubble key={idx} turn={turn} scenario={scenario} badge={badge} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 ml-10">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.15, ease: 'easeInOut' }}
                  className="w-1.5 h-1.5 bg-pink-400 rounded-full"
                />
              ))}
            </div>
            <span className="text-[10px] text-[#6D4C41] italic">{scenario.role.name} 타이핑 중...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick Replies */}
      {!customMode && choices.length > 0 && !loading && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-col gap-1.5">
          {choices.map((c, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => sendChoice(c)}
              className="text-left px-3 py-2 rounded-2xl bg-white border border-pink-200/60 hover:bg-pink-50 active:scale-[0.98] transition-all text-[12px] text-[#4E342E] shadow-sm"
            >
              <span className="text-pink-500 font-bold mr-1.5">{['A', 'B'][i]}.</span> {c}
            </motion.button>
          ))}
          <button
            onClick={() => setCustomMode(true)}
            className="px-3 py-2 rounded-2xl bg-pink-50 border-2 border-dashed border-pink-300 text-pink-600 font-bold text-[12px] active:scale-[0.98]"
          >
            ✍️ 내가 직접 쓸래
          </button>
        </motion.div>
      )}

      {/* 첫 턴 — 답장하기 */}
      {!customMode && choices.length === 0 && history.length <= 1 && !loading && (
        <button
          onClick={() => setCustomMode(true)}
          className="mt-3 w-full px-3 py-2.5 rounded-full bg-pink-400 text-white font-bold text-[12px] active:scale-[0.98]"
        >
          ✍️ 답장하기
        </button>
      )}

      {/* 직접 입력 */}
      {customMode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-1.5">
          <textarea
            autoFocus
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder={`${scenario.role.name} 한테 답장...`}
            className="w-full min-h-[60px] p-2.5 rounded-2xl border-2 border-pink-300 bg-white text-[13px] text-[#4E342E] focus:outline-none resize-none"
          />
          <div className="flex gap-1.5">
            <button onClick={() => { setCustomMode(false); setCustomInput(''); }} className="px-3 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037]">
              취소
            </button>
            <button
              onClick={() => sendChoice(customInput)}
              disabled={!customInput.trim() || loading}
              className="flex-1 py-1.5 rounded-full bg-pink-500 text-white text-[11px] font-bold disabled:opacity-50"
            >
              보내기
            </button>
          </div>
        </motion.div>
      )}

      {/* 수동 종료 */}
      {!customMode && history.length > 4 && !loading && (
        <button
          onClick={() => onComplete(`연습 ${Math.floor(history.length / 2)}턴 완료`, history)}
          className="mt-2 w-full text-[10px] text-[#6D4C41]/60 hover:text-pink-500 underline"
        >
          이쯤 하고 마무리할래
        </button>
      )}

      {/* 코치 피드백 */}
      <AnimatePresence>
        {coachFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 320 }}
            className="mt-3 p-2.5 rounded-2xl shadow-md"
            style={{
              background:
                coachFeedback.tone === 'positive' ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' :
                coachFeedback.tone === 'caution' ? 'linear-gradient(135deg, #fef3c7, #fde68a)' :
                'linear-gradient(135deg, #f5f5f4, #e7e5e4)',
              border: `1.5px solid ${coachFeedback.tone === 'positive' ? '#10b981' : coachFeedback.tone === 'caution' ? '#f59e0b' : '#78716c'}`,
            }}
          >
            <div className="flex items-start gap-2">
              <span className="text-base">🦊</span>
              <div>
                <div className="text-[9px] font-bold text-[#5D4037] mb-0.5">루나 코치</div>
                <div className="text-[11px] text-[#3f2a20] leading-relaxed">{coachFeedback.feedback}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────

function TurnBubble({ turn, scenario, badge }: { turn: HistoryTurn; scenario: RoleplayState['scenario']; badge: string }) {
  if (turn.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-[#B56576] text-white text-[13px] leading-relaxed shadow-sm">
          {turn.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
      {/* Narration (italic, 회색) */}
      {turn.narration && (
        <div className="text-[11px] text-[#6D4C41]/80 italic px-1 ml-10">
          {turn.narration}
        </div>
      )}
      <div className="flex items-end gap-2">
        {/* 아바타 + 뱃지 */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-pink-300 overflow-hidden">
            <img src="/luna_fox_transparent.png" alt="루나" className="w-full h-full object-cover" />
          </div>
          {/* Role 뱃지 */}
          <motion.div
            layoutId="luna-role-badge"
            className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-[8px] font-black shadow-sm"
          >
            {badge}
          </motion.div>
        </div>
        <div>
          {/* 이름 morph */}
          <motion.div layoutId="luna-name-tag" className="text-[10px] font-bold text-pink-600 ml-1 mb-0.5">
            {scenario.role.name}
          </motion.div>
          <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-pink-200 text-[13px] text-[#4E342E] leading-relaxed shadow-sm">
            {turn.content}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
