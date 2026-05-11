'use client';

/**
 * 🎭 v104.2: ReverseRole — clown_harley 풀스크린 무대 + 배역 교환 의식
 *
 * 흐름:
 *   1) invite — 카드: 광대 등장 + "배역 바꿔보자"
 *   2) stage  — 풀스크린: 붉은 커튼 열림 → 스포트라이트 → 좌/우 배역 카드 등장
 *   3) start  — "막 올리기" 누르면 5라운드 롤플레이 시작 (다음 턴부터 useChat)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { ReverseRoleData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'invite' | 'stage';

const TONE_LABEL: Record<string, string> = {
  anxious: '불안한',
  angry: '화난',
  sad: '슬픈',
  cold: '차가운',
  caring: '걱정하는',
};

const TONE_EMOJI: Record<string, string> = {
  anxious: '😰',
  angry: '😠',
  sad: '😢',
  cold: '🥶',
  caring: '🥺',
};

export default function ReverseRole({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as ReverseRoleData;
  const [mode, setMode] = useState<Mode>('invite');

  const handle = (value: 'start' | 'later') => {
    if (disabled) return;
    onChoose(
      value === 'start' ? '🎭 좋아 시작해보자' : '🎭 다음에',
      {
        source: 'spirit_event',
        context: {
          spiritId: 'clown_harley',
          eventType: 'SPIRIT_REVERSE_ROLE',
          choice: value,
          partnerName: data.partnerName,
          tone: data.harleyAsUser.tone,
          openingLine: data.harleyAsUser.openingLine,
          rounds: data.rounds,
        },
      },
    );
  };

  // ─── STAGE (풀스크린) ───
  if (mode === 'stage') {
    return (
      <AnimatePresence>
        <motion.div
          key="stage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] flex flex-col overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 50% 30%, #FCE7F3 0%, #1F0814 80%)',
          }}
        >
          {/* 좌측 커튼 */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: '-50%' }}
            transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.2 }}
            className="absolute top-0 left-0 w-1/2 h-full pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, #7F1D1D 0%, #991B1B 40%, #B91C1C 70%, #7F1D1D 100%)',
              boxShadow: 'inset -20px 0 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* 커튼 주름 */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-black/20"
                style={{ left: `${(i + 1) * 12}%` }}
              />
            ))}
          </motion.div>

          {/* 우측 커튼 */}
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: '50%' }}
            transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.2 }}
            className="absolute top-0 right-0 w-1/2 h-full pointer-events-none"
            style={{
              background: 'linear-gradient(-90deg, #7F1D1D 0%, #991B1B 40%, #B91C1C 70%, #7F1D1D 100%)',
              boxShadow: 'inset 20px 0 40px rgba(0,0,0,0.4)',
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-black/20"
                style={{ right: `${(i + 1) * 12}%` }}
              />
            ))}
          </motion.div>

          {/* 스포트라이트 (중앙 위에서 아래로 빛 줄기) */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: '60vw',
              height: '70vh',
              background: 'radial-gradient(ellipse at top, rgba(254,243,199,0.55), transparent 60%)',
              clipPath: 'polygon(35% 0%, 65% 0%, 90% 100%, 10% 100%)',
            }}
          />

          {/* 무대 바닥 */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, transparent, #451A03 80%)',
            }}
          />

          {/* 컨텐츠 */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
            {/* 광대 등장 */}
            <motion.div
              initial={{ y: -40, scale: 0, rotate: -180 }}
              animate={{ y: 0, scale: 1, rotate: 0 }}
              transition={{ delay: 1.4, type: 'spring', stiffness: 160 }}
              className="text-[80px] mb-2 select-none"
              style={{ filter: 'drop-shadow(0 0 30px rgba(236,72,153,0.6))' }}
            >
              🎭
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.8 }}
              className="text-pink-100 font-extrabold text-2xl tracking-widest mb-1"
              style={{ textShadow: '0 0 20px rgba(244,114,182,0.6)' }}
            >
              ACT 1
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.0 }}
              className="text-pink-200 text-sm italic mb-6"
            >
              너 ↔ 할리, 배역 교환
            </motion.p>

            {/* 좌/우 배역 카드 */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-5">
              {/* 너 (= 상대 역할) */}
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 2.2 }}
                className="bg-rose-50/95 backdrop-blur-sm border-2 border-rose-300 rounded-xl p-3 shadow-2xl"
              >
                <p className="text-[10px] text-rose-500 tracking-widest font-bold">너</p>
                <p className="text-rose-900 font-bold text-base mt-0.5">
                  ↪ {data.partnerName}
                </p>
                <p className="text-[10px] text-rose-600 italic mt-1">
                  상대방 역할로 답변해
                </p>
              </motion.div>

              {/* 할리 (= 너 역할) */}
              <motion.div
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 2.35 }}
                className="bg-pink-50/95 backdrop-blur-sm border-2 border-pink-400 rounded-xl p-3 shadow-2xl"
                style={{ boxShadow: '0 8px 30px rgba(236,72,153,0.4)' }}
              >
                <p className="text-[10px] text-pink-500 tracking-widest font-bold">할리</p>
                <p className="text-pink-900 font-bold text-base mt-0.5">
                  ↪ 너 {TONE_EMOJI[data.harleyAsUser.tone] ?? ''}
                </p>
                <p className="text-[10px] text-pink-600 italic mt-1">
                  ({TONE_LABEL[data.harleyAsUser.tone] ?? data.harleyAsUser.tone})
                </p>
              </motion.div>
            </div>

            {/* 첫 라인 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 2.6 }}
              className="bg-white/95 backdrop-blur-sm border border-pink-300/60 rounded-xl px-4 py-3 shadow-xl max-w-md mb-4"
            >
              <p className="text-[10px] text-pink-500 tracking-widest font-bold mb-1">
                📜 할리의 첫 라인
              </p>
              <p
                className="text-pink-900 text-sm italic"
                style={{ fontFamily: 'var(--font-gaegu, serif)' }}
              >
                &ldquo;{data.harleyAsUser.openingLine}&rdquo;
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.9 }}
              className="text-pink-100/70 text-xs italic mb-4"
            >
              {data.rounds}라운드. 시작하면 다음 턴부터 자동 진행.
            </motion.p>

            <div className="flex gap-3">
              <motion.button
                type="button"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 3.0 }}
                disabled={disabled}
                onClick={() => handle('start')}
                className="px-7 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-base shadow-2xl active:scale-95"
                style={{ boxShadow: '0 8px 30px rgba(236,72,153,0.6)' }}
              >
                ▶️ 막 올리기
              </motion.button>
              <motion.button
                type="button"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 3.1 }}
                disabled={disabled}
                onClick={() => handle('later')}
                className="px-5 py-3 rounded-full border-2 border-pink-300/50 text-pink-100 hover:bg-pink-900/30 transition text-sm font-medium"
              >
                다음에
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── INVITE — 카드 ───
  return (
    <SpiritEventCard
      spiritId="clown_harley"
      onSkip={() => handle('later')}
      disabled={disabled}
    >
      <motion.div
        animate={{ rotate: [-5, 5, -5], y: [0, -3, 0] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="absolute top-2 right-12 text-2xl select-none"
        aria-hidden
      >
        🎭
      </motion.div>

      <p className="text-sm text-rose-700 mb-3 font-bold">{data.openerMsg}</p>

      <div className="bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 rounded-xl p-3 mb-3">
        <p className="text-[10px] tracking-widest text-rose-600 font-bold mb-2">🎬 ACT 1</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-white/70 border border-rose-200 rounded-lg p-2 text-center">
            <p className="text-[10px] text-rose-500">너 ↪</p>
            <p className="font-bold text-rose-800">{data.partnerName}</p>
          </div>
          <div className="bg-pink-100/70 border border-pink-300 rounded-lg p-2 text-center">
            <p className="text-[10px] text-pink-500">할리 ↪</p>
            <p className="font-bold text-pink-800">
              너 {TONE_EMOJI[data.harleyAsUser.tone] ?? ''}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/80 border border-rose-100 rounded-lg p-3 mb-4">
        <p className="text-[11px] text-gray-500 mb-1">📜 할리의 첫 라인</p>
        <p className="text-sm text-gray-800 italic">&ldquo;{data.harleyAsUser.openingLine}&rdquo;</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode('stage')}
          className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow active:scale-[0.98] transition"
        >
          🎭 무대로 올라
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('later')}
          className="py-2.5 px-3 rounded-xl text-sm font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
        >
          ⏭️ 다음에
        </button>
      </div>
    </SpiritEventCard>
  );
}
