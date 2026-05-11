'use client';

/**
 * 🕊️ v104.2: OliveBranch — peace_dove 화해 메시지 + 비둘기 날리기 의식
 *
 * 두 단계:
 *   1) pick — 3가지 톤 화해 카드 선택 + 90초 룰 토글
 *   2) fly — 풀스크린: 비둘기가 봉투를 부리에 물고 화면 가로지름 + 깃털 + "잘 갔다 와"
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { OliveBranchData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'pick' | 'fly';

const TONE_BG: Record<string, string> = {
  soft: 'border-rose-200 bg-rose-50/50',
  responsibility: 'border-amber-200 bg-amber-50/50',
  humor: 'border-pink-200 bg-pink-50/50',
};

export default function OliveBranch({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as OliveBranchData;
  const [picked, setPicked] = useState<string | null>(null);
  const [agreedRule, setAgreedRule] = useState(true);
  const [mode, setMode] = useState<Mode>('pick');

  const handleSend = () => {
    if (!picked) return;
    setMode('fly');
  };

  const handleFinish = () => {
    if (disabled) return;
    const draft = data.drafts.find((d) => d.tone === picked);
    onChoose(`🕊️ 보냈어: ${draft?.text ?? ''}`, {
      source: 'spirit_event',
      context: {
        spiritId: 'peace_dove',
        eventType: 'SPIRIT_OLIVE_BRANCH',
        choice: 'send',
        selectedTone: picked,
        selectedText: draft?.text,
        ninetySecRule: agreedRule,
      },
    });
  };

  const handleTweak = () => {
    if (disabled) return;
    onChoose('🕊️ 한 번 다듬을래', {
      source: 'spirit_event',
      context: { spiritId: 'peace_dove', eventType: 'SPIRIT_OLIVE_BRANCH', choice: 'tweak' },
    });
  };

  const handleSkip = () => {
    if (disabled) return;
    onChoose('🕊️ 다음에', {
      source: 'spirit_event',
      context: { spiritId: 'peace_dove', eventType: 'SPIRIT_OLIVE_BRANCH', choice: 'skip' },
    });
  };

  // ─── FLY — 풀스크린 비둘기 날아가기 ───
  if (mode === 'fly') {
    return (
      <AnimatePresence>
        <motion.div
          key="fly"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #FCE7F3 0%, #FDE2EB 50%, #FDF4E3 100%)' }}
        >
          {/* 떠다니는 깃털 */}
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-rose-200/80 select-none"
              style={{
                left: `${(i * 31) % 100}%`,
                top: '-5%',
                fontSize: 16 + (i % 3) * 6,
              }}
              animate={{
                y: '110vh',
                x: [0, 30, -30, 0],
                rotate: 360,
                opacity: [0, 0.8, 0.8, 0],
              }}
              transition={{
                duration: 7 + (i % 4),
                delay: (i % 6) * 0.4,
                ease: 'linear',
                repeat: Infinity,
              }}
            >
              🪶
            </motion.span>
          ))}

          {/* 비둘기 가로지름 */}
          <motion.div
            initial={{ x: '-30vw', y: 0, scale: 0.6, rotate: -15 }}
            animate={{
              x: ['-30vw', '0vw', '50vw', '130vw'],
              y: [0, -30, -50, -10],
              scale: [0.6, 1.2, 1.4, 1],
              rotate: [-15, 0, 5, 12],
            }}
            transition={{ duration: 3.5, ease: 'easeInOut' }}
            className="absolute top-[35%] flex flex-col items-center select-none"
            style={{ filter: 'drop-shadow(0 6px 16px rgba(244,114,182,0.4))' }}
          >
            <span className="text-7xl">🕊️</span>
            <motion.span
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-2xl mt-1"
            >
              💌
            </motion.span>
          </motion.div>

          {/* 올리브 가지 떨어짐 */}
          <motion.span
            className="absolute text-3xl select-none"
            style={{ left: '60%', top: '40%' }}
            initial={{ y: 0, rotate: 0, opacity: 0 }}
            animate={{
              y: 200,
              rotate: 180,
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 2.5, delay: 1.6 }}
          >
            🌿
          </motion.span>

          {/* 중앙 메시지 (비둘기 떠난 후) */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.8 }}
            className="absolute bottom-[28%] text-center px-6"
          >
            <p className="text-rose-800 font-bold text-2xl mb-2">
              잘 갔다 와, 비둘기
            </p>
            <p className="text-rose-500 text-sm italic mb-1">
              90초 안에 답 안 오면 기다리기
            </p>
            <p className="text-rose-400 text-xs">
              먼저 손 내미는 사람이 더 큰 사람이야
            </p>
          </motion.div>

          <motion.button
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 3.4 }}
            onClick={handleFinish}
            className="absolute bottom-16 px-8 py-3 rounded-full bg-gradient-to-r from-rose-400 to-pink-400 text-white font-bold text-base shadow-2xl active:scale-95"
            style={{ boxShadow: '0 8px 30px rgba(244,114,182,0.5)' }}
          >
            🕊️ 기다릴게
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── PICK ───
  return (
    <SpiritEventCard spiritId="peace_dove" onSkip={handleSkip} disabled={disabled}>
      <motion.div
        animate={{ x: [0, 8, 0], y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute top-2 right-12 text-xl select-none"
        aria-hidden
      >
        🕊️
      </motion.div>

      <p className="text-sm text-rose-700 mb-3">{data.openerMsg}</p>

      <div className="space-y-2">
        {data.drafts.map((d, i) => (
          <motion.button
            key={d.tone}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            disabled={disabled}
            onClick={() => setPicked(d.tone)}
            className={[
              'w-full text-left p-3 rounded-lg border-2 transition',
              TONE_BG[d.tone] ?? 'border-gray-200',
              picked === d.tone ? 'ring-2 ring-rose-400 scale-[1.01]' : 'hover:bg-rose-50',
            ].join(' ')}
          >
            <div className="text-xs font-bold mb-1">
              {d.emoji} {d.label}
            </div>
            <div className="text-sm text-gray-800 mb-1">{d.text}</div>
            <div className="text-[11px] italic text-gray-500">→ {d.intent}</div>
          </motion.button>
        ))}
      </div>

      {/* 90초 룰 */}
      <motion.label
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-3 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer"
      >
        <input
          type="checkbox"
          checked={agreedRule}
          onChange={(e) => setAgreedRule(e.target.checked)}
          className="accent-rose-500"
        />
        <span className="text-[11px] text-amber-900 leading-snug">
          ⏱️ <b>90초 룰</b> — 답 안 오면 기다리기. 한 번만 보내기.
        </span>
      </motion.label>

      <p className="mt-3 text-xs italic text-rose-700/70">💡 {data.doveGuide}</p>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          disabled={disabled || !picked}
          onClick={handleSend}
          className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-400 to-pink-400 text-white shadow active:scale-[0.98] disabled:opacity-40 transition"
        >
          🕊️ 비둘기에 실어 보내
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleTweak}
          className="py-2.5 px-3 rounded-xl text-sm font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
        >
          ✏️ 다듬을래
        </button>
      </div>
    </SpiritEventCard>
  );
}
