'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { playBgm, stopBgm, pickBgmForRoleplay } from '@/lib/bgm/bgm-manager';
import { effectBus, isFxEnabled } from '@/lib/fx/effect-bus';
import type { RoleplayState } from '@/engines/bridge-modes/types';
import LunaChainBubble from '../_shared/LunaChainBubble';

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

function roleBadge(archetype: string): string {
  if (archetype.includes('girlfriend') || archetype.includes('여친')) return '여친';
  if (archetype.includes('boyfriend') || archetype.includes('남친')) return '남친';
  if (archetype.includes('ex')) return '전남친';
  if (archetype.includes('crush')) return '썸';
  if (archetype.includes('friend')) return '친구';
  return '상대';
}

interface CoachEntry {
  id: string;
  afterUserTurn: number;
  feedback: string;
  tone: string;
}

function computeReadMs(text: string): number {
  const byChar = text.length * 67;
  return Math.max(7000, Math.min(30000, byChar));
}

export default function RoleplayMode({ initial, onComplete, onTurn }: RoleplayModeProps) {
  const scenario = initial.scenario;
  const badge = roleBadge(scenario.role.archetype);
  const [history, setHistory] = useState<HistoryTurn[]>(
    initial.history.length > 0
      ? initial.history
      : [{ role: 'npc', content: scenario.opening.dialogue, spriteFrame: scenario.opening.spriteFrame, narration: scenario.opening.narration ?? undefined }]
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [latestNpcIdx, setLatestNpcIdx] = useState<number>(
    initial.history.length > 0 ? -1 : 0
  );
  const [coachFeedback, setCoachFeedback] = useState<{ feedback: string; tone: string } | null>(null);
  const [coachPaused, setCoachPaused] = useState(false);
  const [coachHistory, setCoachHistory] = useState<CoachEntry[]>([]);
  const coachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!coachFeedback) {
      if (coachTimerRef.current) clearTimeout(coachTimerRef.current);
      return;
    }
    if (coachPaused) return;
    const ms = computeReadMs(coachFeedback.feedback);
    coachTimerRef.current = setTimeout(() => setCoachFeedback(null), ms);
    return () => { if (coachTimerRef.current) clearTimeout(coachTimerRef.current); };
  }, [coachFeedback, coachPaused]);

  useEffect(() => {
    playBgm(pickBgmForRoleplay(scenario), 0.22);
    return () => { stopBgm(); };
  }, [scenario]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  // NPC가 답하면 입력창 포커스
  useEffect(() => {
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [loading]);

  const send = async () => {
    const choice = input.trim();
    if (loading || !choice) return;
    setLoading(true);
    setInput('');
    const nh: HistoryTurn[] = [...history, { role: 'user', content: choice }];
    setHistory(nh);

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
      const newHistory = [...nh, { role: 'npc' as const, content: result.dialogue, spriteFrame: result.spriteFrame, narration: result.narration }];
      setHistory(newHistory);
      setLatestNpcIdx(nh.length);

      if (isFxEnabled()) {
        if (result.spriteFrame === 2) effectBus.fire({ id: 'shake.soft', target: 'screen' });
        else if (result.spriteFrame === 4) effectBus.fire({ id: 'flash.white', target: 'screen' });
        else if (result.spriteFrame === 1) effectBus.fire({ id: 'particle.tears', target: 'particle' });
      }

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
              setCoachHistory((prev) => [
                ...prev,
                { id: `coach-${userTurns}-${Date.now()}`, afterUserTurn: userTurns, feedback: d.feedback, tone: d.tone },
              ]);
              setCoachPaused(false);
              setCoachFeedback({ feedback: d.feedback, tone: d.tone });
            }
          })
          .catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[94%] mx-auto my-4 relative"
    >
      {(badge === '여친' || badge === '썸') && (
        <div
          className="absolute inset-0 -mx-2 -my-2 rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(253,230,236,0.4), rgba(254,202,217,0.25))',
            zIndex: -1,
          }}
        />
      )}

      <div className="mb-3">
        <LunaChainBubble
          text={`🎬 내가 ${badge} 역할 해볼게|||상황: ${scenario.situation}|||준비됐어? 그냥 답장하듯 해봐`}
        />
      </div>

      {/* 대화 이력 + 코치 엔트리 인라인 */}
      <div className="space-y-2.5">
        {(() => {
          let userTurnCount = 0;
          const nodes: React.ReactNode[] = [];
          history.forEach((turn, idx) => {
            nodes.push(<TurnBubble key={`turn-${idx}`} turn={turn} scenario={scenario} badge={badge} isNew={idx === latestNpcIdx} />);
            if (turn.role === 'user') {
              userTurnCount += 1;
              const coachEntry = coachHistory.find((c) => c.afterUserTurn === userTurnCount);
              if (coachEntry) {
                nodes.push(<CoachHistoryBubble key={coachEntry.id} entry={coachEntry} />);
              }
            }
          });
          return nodes;
        })()}
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

      {/* 입력창 — 항상 표시 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4"
      >
        <div className="flex items-end gap-2 bg-white border-2 border-pink-200 rounded-2xl px-3 py-2 shadow-sm focus-within:border-pink-400 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${scenario.role.name}한테 답장...`}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-[13px] text-[#4E342E] placeholder:text-[#C4A99A] focus:outline-none leading-relaxed max-h-[100px] overflow-y-auto disabled:opacity-50"
            style={{ minHeight: '24px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 100)}px`;
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="shrink-0 w-8 h-8 rounded-full bg-pink-500 disabled:bg-pink-200 flex items-center justify-center active:scale-95 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[9px] text-[#C4A99A] text-center mt-1">Enter로 보내기 · Shift+Enter 줄바꿈</p>
      </motion.div>

      {history.length > 4 && !loading && (
        <button
          onClick={() => onComplete(`연습 ${Math.floor(history.length / 2)}턴 완료`, history)}
          className="mt-2 w-full text-[10px] text-[#6D4C41]/60 hover:text-pink-500 underline"
        >
          이쯤 하고 마무리할래
        </button>
      )}

      {/* 코치 피드백 팝업 — 고퀄 연출 */}
      <AnimatePresence>
        {coachFeedback && (
          <CoachPopup
            feedback={coachFeedback}
            paused={coachPaused}
            onTogglePause={() => setCoachPaused((p) => !p)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 코치 히스토리 인라인 버블 ───────────────────────────────

function CoachHistoryBubble({ entry }: { entry: CoachEntry }) {
  const colors = {
    positive: { bg: 'rgba(209,250,229,0.6)', border: 'rgba(16,185,129,0.4)', text: '#065f46' },
    caution:  { bg: 'rgba(254,243,199,0.6)', border: 'rgba(245,158,11,0.4)',  text: '#78350f' },
    neutral:  { bg: 'rgba(243,232,255,0.6)', border: 'rgba(168,85,247,0.35)', text: '#4c1d95' },
  };
  const c = colors[(entry.tone as keyof typeof colors) ?? 'neutral'] ?? colors.neutral;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="ml-10 px-3 py-2 rounded-xl border text-[11px] leading-relaxed flex items-start gap-1.5"
      style={{ background: c.bg, borderColor: c.border }}
    >
      <span className="text-[12px] mt-0.5 shrink-0">🦊</span>
      <div>
        <span className="text-[9px] font-black mr-1.5" style={{ color: c.text }}>루나 코치</span>
        <span style={{ color: c.text }}>{entry.feedback}</span>
      </div>
    </motion.div>
  );
}

// ─── 코치 팝업 — 고퀄 연출 ──────────────────────────────────

function CoachPopup({ feedback, paused, onTogglePause }: {
  feedback: { feedback: string; tone: string };
  paused: boolean;
  onTogglePause: () => void;
}) {
  const isPositive = feedback.tone === 'positive';
  const isCaution  = feedback.tone === 'caution';

  const gradient = isPositive
    ? 'linear-gradient(135deg, #ecfdf5 0%, #bbf7d0 60%, #d1fae5 100%)'
    : isCaution
    ? 'linear-gradient(135deg, #fffbeb 0%, #fde68a 60%, #fef3c7 100%)'
    : 'linear-gradient(135deg, #f5f3ff 0%, #e9d5ff 60%, #ede9fe 100%)';

  const glowColor = isPositive ? 'rgba(16,185,129,0.55)' : isCaution ? 'rgba(245,158,11,0.55)' : 'rgba(168,85,247,0.5)';
  const borderColor = isPositive ? '#10b981' : isCaution ? '#f59e0b' : '#a855f7';
  const textColor = isPositive ? '#064e3b' : isCaution ? '#78350f' : '#3b0764';
  const labelColor = isPositive ? '#059669' : isCaution ? '#d97706' : '#9333ea';

  const emoji = isPositive ? '✨' : isCaution ? '⚠️' : '💡';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      className="mt-4 relative"
    >
      {/* 글로우 레이어 */}
      <motion.div
        animate={{ opacity: paused ? 0.3 : [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.2, repeat: paused ? 0 : Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: `0 0 24px 6px ${glowColor}`,
          borderRadius: '16px',
        }}
      />

      <motion.button
        type="button"
        onClick={onTogglePause}
        whileTap={{ scale: 0.98 }}
        className="relative w-full text-left rounded-2xl overflow-hidden border-2"
        style={{ background: gradient, borderColor }}
      >
        {/* 상단 shimmer 라인 */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
          className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${borderColor}, transparent)` }}
        />

        <div className="px-3.5 py-3 flex items-start gap-2.5">
          {/* 아이콘 + 파티클 */}
          <div className="relative shrink-0 mt-0.5">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[20px]"
              style={{ background: `${borderColor}22`, border: `1.5px solid ${borderColor}44` }}
            >
              🦊
            </motion.div>
            {/* 이모지 뱃지 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, delay: 0.2 }}
              className="absolute -top-1 -right-1 text-[11px]"
            >
              {emoji}
            </motion.div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[10px] font-black tracking-wide"
                style={{ color: labelColor }}
              >
                루나 코치 피드백
              </motion.span>
              <span className="text-[8px] font-semibold opacity-60" style={{ color: textColor }}>
                {paused ? '⏸ 고정됨' : '탭하면 고정'}
              </span>
            </div>
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[12px] leading-relaxed font-medium"
              style={{ color: textColor }}
            >
              {feedback.feedback}
            </motion.p>
          </div>
        </div>

        {/* 하단 진행 바 (읽기 타이머 시각화) */}
        {!paused && (
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: computeReadMs(feedback.feedback) / 1000, ease: 'linear' }}
            className="h-[3px] origin-left"
            style={{ background: `linear-gradient(90deg, ${borderColor}, ${glowColor})` }}
          />
        )}
      </motion.button>
    </motion.div>
  );
}

// ─── TurnBubble ─────────────────────────────────────────────

function TurnBubble({ turn, scenario, badge, isNew = false }: { turn: HistoryTurn; scenario: RoleplayState['scenario']; badge: string; isNew?: boolean }) {
  if (turn.role === 'user') {
    const userBubbles = turn.content.split('|||').map((s) => s.trim()).filter(Boolean);
    return (
      <div className="space-y-1">
        {userBubbles.map((t, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: idx * 0.25, type: 'spring', stiffness: 340, damping: 26 }}
            className="flex justify-end"
          >
            <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-[#B56576] text-white text-[13px] leading-relaxed shadow-sm">
              {t}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  const npcBubbles = turn.content.split('|||').map((s) => s.trim()).filter(Boolean);
  return (
    <div className="space-y-1">
      {turn.narration && (
        <motion.div
          initial={isNew ? { opacity: 0, y: 4 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-[11px] text-[#6D4C41]/80 italic px-1 ml-10"
        >
          {turn.narration}
        </motion.div>
      )}
      {npcBubbles.map((t, idx) => (
        <NpcBubble key={idx} text={t} bubbleIdx={idx} isNew={isNew} badge={badge} scenario={scenario} showAvatar={idx === 0} />
      ))}
    </div>
  );
}

// ─── NpcBubble ──────────────────────────────────────────────

function NpcBubble({ text, bubbleIdx, isNew, badge, scenario, showAvatar }: {
  text: string; bubbleIdx: number; isNew: boolean; badge: string;
  scenario: RoleplayState['scenario']; showAvatar: boolean;
}) {
  const DOTS_MS = 900;
  const STAGGER_MS = 1400;
  const [showText, setShowText] = useState(!isNew);

  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(() => setShowText(true), bubbleIdx * STAGGER_MS + DOTS_MS);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -12, y: 6 } : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: isNew ? bubbleIdx * (STAGGER_MS / 1000) : 0, type: 'spring', stiffness: 300, damping: 24 }}
      className="flex items-end gap-2"
    >
      {showAvatar ? (
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-pink-300 overflow-hidden">
            <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-[8px] font-black shadow-sm">
            {badge}
          </div>
        </div>
      ) : (
        <div className="w-8 shrink-0" aria-hidden />
      )}
      <div>
        {showAvatar && (
          <div className="text-[10px] font-bold text-pink-600 ml-1 mb-0.5">{scenario.role.name}</div>
        )}
        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-pink-200 text-[13px] text-[#4E342E] leading-relaxed shadow-sm min-w-[48px] min-h-[36px] flex items-center">
          <AnimatePresence mode="wait">
            {!showText ? (
              <motion.span key="dots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1 py-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block"
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                  />
                ))}
              </motion.span>
            ) : (
              <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                {text}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
