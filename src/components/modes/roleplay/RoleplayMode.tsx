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

// 역할별 아바타 배지 라벨
function roleBadge(archetype: string): string {
  if (archetype.includes('girlfriend') || archetype.includes('여친')) return '여친';
  if (archetype.includes('boyfriend') || archetype.includes('남친')) return '남친';
  if (archetype.includes('ex')) return '전남친';
  if (archetype.includes('crush')) return '썸';
  if (archetype.includes('friend')) return '친구';
  return '상대';
}

/** 🆕 v82.7: 코치 피드백 히스토리 엔트리 — 유저 턴 인덱스 기준으로 타임라인에 삽입 */
interface CoachEntry {
  id: string;
  afterUserTurn: number; // 이 유저 턴 번호 뒤에 삽입
  feedback: string;
  tone: string;
}

/** 한국어 평균 읽기 속도 기반 동적 타이머 — 15자/초, 최소 7초, 최대 30초 */
function computeReadMs(text: string): number {
  const byChar = text.length * 67; // 15자/초 = 67ms/char
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
  const [choices, setChoices] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  // 🆕 v82.7: 실시간 팝업 + 탭 일시정지 + 히스토리 누적
  const [coachFeedback, setCoachFeedback] = useState<{ feedback: string; tone: string } | null>(null);
  const [coachPaused, setCoachPaused] = useState(false);
  const [coachHistory, setCoachHistory] = useState<CoachEntry[]>([]);
  const coachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 🆕 v82.7: 코치 팝업 타이머 — paused 이면 멈춤, 재개 시 동적 시간 새로 돌림
  useEffect(() => {
    if (!coachFeedback) {
      if (coachTimerRef.current) clearTimeout(coachTimerRef.current);
      return;
    }
    if (coachPaused) return; // paused 상태에선 타이머 X
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

      // 🆕 v82.7: 코치 피드백 (3턴마다) — 히스토리 누적 + 동적 타이머 + 탭 일시정지
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
              // 타임라인 영구 기록
              setCoachHistory((prev) => [
                ...prev,
                { id: `coach-${userTurns}-${Date.now()}`, afterUserTurn: userTurns, feedback: d.feedback, tone: d.tone },
              ]);
              // 실시간 팝업 (동적 타이머는 useEffect 가 처리)
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

      {/* Luna 오프닝 + 시나리오 — ||| 로 3개 버블 */}
      <div className="mb-3">
        <LunaChainBubble
          text={`🎬 내가 ${badge} 역할 해볼게|||상황: ${scenario.situation}|||준비됐어? 그냥 답장하듯 해봐`}
        />
      </div>

      {/* 🆕 v82.7: 대화 이력 + 코치 엔트리 인라인 삽입 (유저 턴 번호 매치) */}
      <div className="space-y-2.5">
        {(() => {
          let userTurnCount = 0;
          const nodes: React.ReactNode[] = [];
          history.forEach((turn, idx) => {
            nodes.push(<TurnBubble key={`turn-${idx}`} turn={turn} scenario={scenario} badge={badge} />);
            if (turn.role === 'user') {
              userTurnCount += 1;
              const coachEntry = coachHistory.find((c) => c.afterUserTurn === userTurnCount);
              if (coachEntry) {
                nodes.push(
                  <motion.div
                    key={coachEntry.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ml-10 px-2.5 py-1.5 rounded-xl border text-[10.5px] leading-relaxed"
                    style={{
                      background:
                        coachEntry.tone === 'positive' ? 'rgba(209,250,229,0.5)' :
                        coachEntry.tone === 'caution' ? 'rgba(254,243,199,0.5)' :
                        'rgba(231,229,228,0.5)',
                      borderColor:
                        coachEntry.tone === 'positive' ? 'rgba(16,185,129,0.35)' :
                        coachEntry.tone === 'caution' ? 'rgba(245,158,11,0.35)' :
                        'rgba(120,113,108,0.3)',
                    }}
                  >
                    <span className="text-[10px] mr-1">🦊</span>
                    <span className="text-[9px] font-bold text-[#5D4037] mr-1.5">코치</span>
                    <span className="text-[#3f2a20]">{coachEntry.feedback}</span>
                  </motion.div>
                );
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

      {/* 🆕 v82.7: 코치 피드백 — 탭하면 일시정지/해제, 동적 타이머 (읽기 속도 비례) */}
      <AnimatePresence>
        {coachFeedback && (
          <motion.button
            type="button"
            onClick={() => setCoachPaused((p) => !p)}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 320 }}
            className="mt-3 p-2.5 rounded-2xl shadow-md w-full text-left active:scale-[0.99]"
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[9px] font-bold text-[#5D4037]">루나 코치</span>
                  <span className="text-[8px] text-[#5D4037]/60 tabular-nums">
                    {coachPaused ? '⏸ 고정됨 (다시 탭 → 닫기)' : '탭하면 고정'}
                  </span>
                </div>
                <div className="text-[11px] text-[#3f2a20] leading-relaxed">{coachFeedback.feedback}</div>
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────

function TurnBubble({ turn, scenario, badge }: { turn: HistoryTurn; scenario: RoleplayState['scenario']; badge: string }) {
  if (turn.role === 'user') {
    // 🆕 v82.1: 유저 답장도 ||| 으로 여러 버블 가능
    const userBubbles = turn.content.split('|||').map((s) => s.trim()).filter(Boolean);
    return (
      <div className="space-y-1">
        {userBubbles.map((t, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.35 }}
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

  // 🆕 v82.1: NPC 대사도 ||| 분리 — 첫 버블만 아바타/이름, 나머지는 들여쓰기
  const npcBubbles = turn.content.split('|||').map((s) => s.trim()).filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1">
      {/* Narration (italic, 회색) */}
      {turn.narration && (
        <div className="text-[11px] text-[#6D4C41]/80 italic px-1 ml-10">
          {turn.narration}
        </div>
      )}
      {npcBubbles.map((t, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -10, y: 4 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: idx * 0.45, type: 'spring', stiffness: 320, damping: 26 }}
          className="flex items-end gap-2"
        >
          {idx === 0 ? (
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-pink-300 overflow-hidden">
                <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
              </div>
              <motion.div
                layoutId="luna-role-badge"
                className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-[8px] font-black shadow-sm"
              >
                {badge}
              </motion.div>
            </div>
          ) : (
            <div className="w-8 shrink-0" aria-hidden />
          )}
          <div>
            {idx === 0 && (
              <motion.div layoutId="luna-name-tag" className="text-[10px] font-bold text-pink-600 ml-1 mb-0.5">
                {scenario.role.name}
              </motion.div>
            )}
            <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-pink-200 text-[13px] text-[#4E342E] leading-relaxed shadow-sm">
              {t}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
