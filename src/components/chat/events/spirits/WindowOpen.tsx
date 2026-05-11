'use client';

/**
 * 🍃 v104.2: WindowOpen — wind_sprite 5분 동행
 *
 * 5턴+ 무거움 누적 시 wind_sprite와 함께 5분 휴식.
 *   - 초대 카드 (시작 전)
 *   - 동행 모드 (풀스크린): 바람 입자 + 중앙 wind_sprite + 원형 타이머 + 20초마다 격려 메시지
 *   - 복귀: 한 줄 입력 → 바람에 실려 떠나는 애니
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { WindowOpenData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'invite' | 'companion' | 'return';

/** 5분간 wind_sprite 격려 메시지 — 20초마다 변경 */
const COMPANION_MESSAGES = [
  '잘 와줬어 ㅎㅎ',
  '창문 한 번 열어볼래?',
  '햇빛 한 번 받아 봐',
  '심호흡 한 번~',
  '물 한 잔 마셔도 좋아',
  '어깨 한 번 펴 봐',
  '잠깐 멍 때려도 돼',
  '냄새 맡아 봐 — 뭐가 나?',
  '잘 하고 있어',
  '발 한 번 땅에 디뎌 봐',
  '곧 끝나',
  '지금 어디 봐?',
  '거의 다 왔어',
  '끝 보여~',
  '잘했어 ㅎㅎ 돌아오자',
];

export default function WindowOpen({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as WindowOpenData;
  const totalSec = (data.durationMin ?? 5) * 60;
  const [mode, setMode] = useState<Mode>('invite');
  const [remaining, setRemaining] = useState(totalSec);
  const [msgIdx, setMsgIdx] = useState(0);
  const [returnNote, setReturnNote] = useState('');

  // 타이머 + 메시지 회전
  useEffect(() => {
    if (mode !== 'companion') return;
    if (remaining <= 0) { setMode('return'); return; }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [mode, remaining]);

  useEffect(() => {
    if (mode !== 'companion') return;
    // 매 20초마다 메시지 인덱스 증가
    const elapsed = totalSec - remaining;
    const idx = Math.min(Math.floor(elapsed / 20), COMPANION_MESSAGES.length - 1);
    setMsgIdx(idx);
  }, [remaining, mode, totalSec]);

  const handleStart = () => setMode('companion');
  const handleEarly = () => setMode('return');

  const handleFinish = () => {
    if (disabled) return;
    onChoose(
      returnNote.trim()
        ? `🍃 다녀왔어 — ${returnNote.trim()}`
        : '🍃 다녀왔어',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'wind_sprite',
          eventType: 'SPIRIT_WINDOW_OPEN',
          choice: 'done',
          note: returnNote.trim() || undefined,
          secElapsed: totalSec - remaining,
        },
      },
    );
  };

  const handleSkip = () => {
    if (disabled) return;
    onChoose('🍃 지금은 됐어', {
      source: 'spirit_event',
      context: { spiritId: 'wind_sprite', eventType: 'SPIRIT_WINDOW_OPEN', choice: 'skip' },
    });
  };

  const mm = Math.floor(remaining / 60);
  const ss = (remaining % 60).toString().padStart(2, '0');
  const progress = ((totalSec - remaining) / totalSec) * 100;

  // ─── invite ─────────────────────────────
  if (mode === 'invite') {
    return (
      <SpiritEventCard spiritId="wind_sprite" onSkip={handleSkip} disabled={disabled}>
        <p className="text-sm text-teal-700 mb-3">{data.openerMsg}</p>
        <ul className="space-y-1.5 text-sm text-gray-700 mb-4">
          {data.tasks.map((t, i) => (
            <li key={i} className="flex items-center gap-2">
              <span aria-hidden>🌬️</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs italic text-gray-500 mb-4">💨 {data.closing}</p>
        <p className="text-[11px] text-teal-600 italic mb-3">
          내가 5분 같이 있어줄게 ㅎㅎ
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={handleStart}
            className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-400 to-emerald-400 text-white shadow active:scale-[0.98] transition"
          >
            🍃 같이 가자
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSkip}
            className="py-2.5 px-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            ⏭️ 다음에
          </button>
        </div>
      </SpiritEventCard>
    );
  }

  // ─── companion (풀스크린) ───────────────
  if (mode === 'companion') {
    return (
      <AnimatePresence>
        <motion.div
          key="companion"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #E0F7F4 0%, #C8EEDB 100%)' }}
        >
          {/* 흐르는 바람 입자 */}
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute select-none text-teal-400/60"
              style={{
                left: '-5%',
                top: `${(i * 17) % 100}%`,
                fontSize: 12 + (i % 4) * 6,
              }}
              animate={{
                x: ['0vw', '115vw'],
                y: [0, (i % 2 === 0 ? -30 : 20)],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 5 + (i % 4) * 2,
                delay: (i * 0.3) % 5,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              {i % 3 === 0 ? '🍃' : i % 3 === 1 ? '〜' : '·'}
            </motion.span>
          ))}

          {/* 중앙 wind_sprite */}
          <motion.div
            animate={{
              y: [0, -20, 0, 15, 0],
              rotate: [0, 6, -6, 4, 0],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-7xl mb-4 select-none"
            style={{ filter: 'drop-shadow(0 8px 20px rgba(72,187,170,0.4))' }}
          >
            🍃
          </motion.div>

          {/* 메시지 (20초마다 교체) */}
          <div className="h-10 flex items-center justify-center mb-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={msgIdx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5 }}
                className="text-teal-800 font-bold text-lg text-center px-6"
              >
                {COMPANION_MESSAGES[msgIdx]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* 원형 타이머 */}
          <div className="relative w-44 h-44 mb-6">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="rgba(72,187,170,0.2)"
                strokeWidth="3"
              />
              <motion.circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke="#48bbaa"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 44 * (1 - progress / 100),
                }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-mono tabular-nums font-bold text-teal-800">
                {mm}:{ss}
              </p>
              <p className="text-xs text-teal-600 mt-1">남은 시간</p>
            </div>
          </div>

          {/* 일찍 돌아오기 */}
          <button
            type="button"
            onClick={handleEarly}
            className="text-sm text-teal-700 underline hover:text-teal-900 transition"
          >
            돌아왔어 ↩
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── return (한 줄 + 바람에 떠나기) ───────
  return (
    <AnimatePresence>
      <motion.div
        key="return"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex flex-col items-center justify-center px-6"
        style={{ background: 'linear-gradient(180deg, #FEF9E7 0%, #E0F7F4 100%)' }}
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180 }}
          className="text-6xl mb-4 select-none"
        >
          🍃
        </motion.div>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-teal-800 font-bold text-xl mb-1"
        >
          어서 와 ㅎㅎ
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-teal-600 text-sm italic mb-6"
        >
          한 줄만 들려줘 — 바람에 띄워 보낼게
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm mb-6"
        >
          <input
            type="text"
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            maxLength={60}
            placeholder="예: 햇살 따뜻했어"
            className="w-full px-4 py-3 text-sm bg-white/80 border border-teal-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-teal-800 placeholder-teal-400/60 italic"
          />
        </motion.div>

        <motion.button
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={handleFinish}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 text-white font-bold text-base shadow-xl active:scale-95"
          style={{ boxShadow: '0 8px 30px rgba(72,187,170,0.5)' }}
        >
          🌬️ 바람에 띄워 보내기
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
