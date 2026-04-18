'use client';

/**
 * 🎭 v81: ROLEPLAY Mode — Visual Novel 스타일 역할극
 *
 * UI 구조:
 *   - 상단: 시나리오 배너 (제목 + 상황)
 *   - 중앙: Luna 아바타 (역할 태그 포함) + 나레이션 박스 + 대사 박스
 *   - 하단: 선택지 2개 + [직접 쓸래 ↓] 버튼
 *
 * 흐름:
 *   1. 시나리오 시작 (scenario.opening)
 *   2. 매 턴: 유저 선택/입력 → API → 역할 응답 + 새 선택지
 *   3. Luna 판단: complete=true → 요약 + 종료
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModeFrame from '../ModeFrame';
import type { RoleplayState } from '@/engines/bridge-modes/types';
import { playBgm, stopBgm, pickBgmForRoleplay } from '@/lib/bgm/bgm-manager';
import { effectBus, isFxEnabled } from '@/lib/fx/effect-bus';

type HistoryTurn = RoleplayState['history'][number];

interface RoleplayModeProps {
  initial: RoleplayState & { modeId: 'roleplay' };
  onComplete: (summary: string, history: HistoryTurn[]) => void;
  onExit: () => void;
  onTurn: (userChoice: string, history: HistoryTurn[]) => Promise<{
    narration: string | null;
    dialogue: string;
    spriteFrame: number;
    choices: string[];
    complete: boolean;
    completeSummary: string | null;
  }>;
}

export default function RoleplayMode({ initial, onComplete, onExit, onTurn }: RoleplayModeProps) {
  const scenario = initial.scenario;
  const [history, setHistory] = useState<HistoryTurn[]>(
    initial.history.length > 0
      ? initial.history
      : [{ role: 'npc', content: scenario.opening.dialogue, spriteFrame: scenario.opening.spriteFrame, narration: scenario.opening.narration ?? undefined }]
  );
  const [choices, setChoices] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  // 🆕 v81: 코치 피드백 — 주기적으로 나타남
  const [coachFeedback, setCoachFeedback] = useState<{ feedback: string; tone: string } | null>(null);

  // 🆕 v81: BGM 자동 재생 (시나리오 기반)
  useEffect(() => {
    const bgmId = pickBgmForRoleplay(scenario);
    playBgm(bgmId, 0.25);
    return () => { stopBgm(); };
  }, [scenario]);

  const currentNpc = history[history.length - 1]?.role === 'npc' ? history[history.length - 1] : null;

  const sendChoice = async (choice: string) => {
    if (loading || !choice.trim()) return;
    setLoading(true);

    const newHistory: HistoryTurn[] = [...history, { role: 'user', content: choice }];
    setHistory(newHistory);
    setChoices([]);
    setCustomMode(false);
    setCustomInput('');

    try {
      const result = await onTurn(choice, newHistory);
      if (result.complete && result.completeSummary) {
        onComplete(result.completeSummary, [
          ...newHistory,
          { role: 'npc', content: result.dialogue, spriteFrame: result.spriteFrame, narration: result.narration },
        ]);
        return;
      }
      setHistory([
        ...newHistory,
        { role: 'npc', content: result.dialogue, spriteFrame: result.spriteFrame, narration: result.narration },
      ]);
      setChoices(result.choices);

      // 🆕 v81: 감정 프레임 → FX 발동 (몰입감 UP)
      if (isFxEnabled()) {
        if (result.spriteFrame === 2) effectBus.fire({ id: 'shake.soft', target: 'screen' });        // 화남
        else if (result.spriteFrame === 4) effectBus.fire({ id: 'flash.white', target: 'screen' });  // 놀람
        else if (result.spriteFrame === 1) effectBus.fire({ id: 'particle.tears', target: 'particle' }); // 슬픔
      }

      // 🆕 v81: 매 3턴마다 코치 피드백 호출 (fire-and-forget)
      const userTurnCount = newHistory.filter((h) => h.role === 'user').length;
      if (userTurnCount > 0 && userTurnCount % 3 === 0) {
        fetch('/api/mode/roleplay/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario, history: newHistory }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.feedback) {
              setCoachFeedback({ feedback: data.feedback, tone: data.tone });
              setTimeout(() => setCoachFeedback(null), 5000);
            }
          })
          .catch(() => {/* 조용히 무시 */});
      }
    } catch (err) {
      console.error('[Roleplay] turn 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const bgStyle = scenario.backgroundImageBase64
    ? { backgroundImage: `url(data:image/jpeg;base64,${scenario.backgroundImageBase64})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <ModeFrame modeId="roleplay" onExit={onExit}>
      {/* 시나리오 배너 — 배경 이미지 있으면 Ken Burns 스타일 */}
      <div
        className="relative px-4 py-3 border-b border-[#D5C2A5]/60 overflow-hidden"
        style={bgStyle}
      >
        {/* 배경 이미지 있으면 반투명 오버레이로 가독성 확보 */}
        {scenario.backgroundImageBase64 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50"
            initial={{ scale: 1.05 }}
            animate={{ scale: 1.12 }}
            transition={{ duration: 18, ease: 'linear' }}
          />
        )}
        <div className="relative z-10">
          <div className={`text-[11px] font-bold mb-0.5 ${scenario.backgroundImageBase64 ? 'text-pink-200' : 'text-[#B56576]'}`}>🎭 {scenario.title}</div>
          <div className={`text-[12px] ${scenario.backgroundImageBase64 ? 'text-white' : 'text-[#6D4C41]'}`}>📍 {scenario.situation}</div>
          <div className={`text-[11px] mt-0.5 ${scenario.backgroundImageBase64 ? 'text-pink-100' : 'text-[#6D4C41]'}`}>
            👤 상대: <span className="font-bold">{scenario.role.name}</span> <span className="opacity-70">({scenario.role.tone})</span>
          </div>
        </div>
        {/* 배경 없을 때 gradient */}
        {!scenario.backgroundImageBase64 && (
          <div className="absolute inset-0 bg-gradient-to-r from-pink-50 to-rose-50 -z-10" />
        )}
      </div>

      {/* 대화 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(96dvh - 280px)' }}>
        {history.map((turn, idx) => (
          <TurnRender key={idx} turn={turn} roleName={scenario.role.name} roleEmoji={scenario.role.emoji ?? '🦊'} />
        ))}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[11px] text-[#6D4C41] italic">
            {scenario.role.name} 생각 중...
          </motion.div>
        )}
      </div>

      {/* 하단: 선택지 or 직접 입력 */}
      <div className="border-t border-[#D5C2A5]/60 bg-white p-3 space-y-2">
        {!customMode && currentNpc && choices.length > 0 && !loading && (
          <>
            {choices.map((c, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => sendChoice(c)}
                className="w-full text-left px-3 py-2 rounded-xl bg-[#F4EFE6] border border-[#D5C2A5]/60 hover:bg-white active:scale-[0.98] transition-all text-[12px] text-[#4E342E]"
              >
                <span className="text-[#B56576] font-bold mr-1.5">{['A', 'B'][i]}.</span> {c}
              </motion.button>
            ))}
            <button
              onClick={() => setCustomMode(true)}
              className="w-full px-3 py-2 rounded-xl bg-[#B56576]/10 border-2 border-dashed border-[#B56576]/40 text-[#B56576] font-bold text-[12px] active:scale-[0.98]"
            >
              ✍️ 내가 직접 쓸래
            </button>
          </>
        )}

        {!customMode && choices.length === 0 && history.length <= 1 && !loading && (
          <button
            onClick={() => setCustomMode(true)}
            className="w-full px-3 py-2 rounded-xl bg-[#B56576] text-white font-bold text-[12px] active:scale-[0.98]"
          >
            ✍️ 대답하기
          </button>
        )}

        {customMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <textarea
              autoFocus
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder={`${scenario.role.name} 한테 뭐라고 답할까...`}
              className="w-full min-h-[60px] p-2.5 rounded-xl border-2 border-[#B56576] bg-white text-[13px] text-[#4E342E] focus:outline-none resize-none"
            />
            <div className="flex gap-1.5">
              <button onClick={() => { setCustomMode(false); setCustomInput(''); }} className="px-3 py-1.5 rounded-full bg-[#EAE1D0] text-[11px] font-bold text-[#5D4037]">
                취소
              </button>
              <button
                onClick={() => sendChoice(customInput)}
                disabled={!customInput.trim() || loading}
                className="flex-1 py-1.5 rounded-full bg-[#B56576] text-white text-[11px] font-bold disabled:opacity-50"
              >
                보내기
              </button>
            </div>
          </motion.div>
        )}

        {/* 수동 종료 버튼 (유저가 충분히 했다 싶으면) */}
        {!customMode && history.length > 4 && !loading && (
          <button
            onClick={() => onComplete(`연습 ${Math.floor(history.length / 2)}턴 완료`, history)}
            className="w-full text-[10px] text-[#6D4C41]/60 hover:text-[#B56576] underline pt-1"
          >
            이쯤 하고 마무리할래
          </button>
        )}
      </div>

      {/* 🆕 v81: 코치 피드백 플로팅 오버레이 */}
      <AnimatePresence>
        {coachFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="absolute bottom-20 left-4 right-4 z-30 max-w-[92%] mx-auto p-3 rounded-2xl shadow-xl pointer-events-none"
            style={{
              background:
                coachFeedback.tone === 'positive' ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' :
                coachFeedback.tone === 'caution'  ? 'linear-gradient(135deg, #fef3c7, #fde68a)' :
                'linear-gradient(135deg, #f5f5f4, #e7e5e4)',
              border: `1.5px solid ${coachFeedback.tone === 'positive' ? '#10b981' : coachFeedback.tone === 'caution' ? '#f59e0b' : '#78716c'}`,
            }}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">🦊</span>
              <div>
                <div className="text-[10px] font-bold text-[#5D4037] mb-0.5">루나 코치</div>
                <div className="text-[12px] text-[#3f2a20] leading-relaxed">{coachFeedback.feedback}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModeFrame>
  );
}

// ──────────────────────────────────────────────

function TurnRender({ turn, roleName, roleEmoji }: { turn: HistoryTurn; roleName: string; roleEmoji: string }) {
  if (turn.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-[#B56576] text-white text-[13px] leading-relaxed shadow-sm">
          {turn.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-1.5"
    >
      {turn.narration && (
        <div className="text-[11px] text-[#6D4C41]/80 italic px-1">
          {turn.narration}
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="w-7 h-7 rounded-full bg-[#EAE1D0] flex items-center justify-center text-sm shrink-0">
          {roleEmoji}
        </div>
        <div>
          <div className="text-[10px] text-[#6D4C41]/80 font-bold ml-1 mb-0.5">{roleName}</div>
          <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm bg-white border border-[#D5C2A5]/60 text-[13px] text-[#4E342E] leading-relaxed shadow-sm">
            {turn.content}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
