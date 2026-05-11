'use client';

/**
 * 🔥 v104.2: RageLetter — fire_goblin 분노 폭발 편지
 *
 * 3가지 mode:
 *   1) invite — 3가지 강도 초안 미리보기 + 직접 쓰기 진입
 *   2) write  — 텍스트 입력창. 글자가 불타는 효과 (text-shadow flicker)
 *   3) burn   — 풀스크린 봉투 봉인 의식
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { RageLetterData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'invite' | 'write' | 'burn';

const INTENSITY_COLORS: Record<string, string> = {
  fire:   'border-red-400 bg-red-50/60',
  honest: 'border-orange-300 bg-orange-50/60',
  cool:   'border-slate-300 bg-slate-50/60',
};

export default function RageLetter({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as RageLetterData;
  const [mode, setMode] = useState<Mode>('invite');
  const [picked, setPicked] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const startBurn = (text: string) => {
    setDraft(text);
    setMode('burn');
  };

  const handleFinish = () => {
    if (disabled) return;
    const finalText = picked === '__user__' ? draft : draft;
    onChoose('🔥 다 태웠어 — 보관함에 봉인됨', {
      source: 'spirit_event',
      context: {
        spiritId: 'fire_goblin',
        eventType: 'SPIRIT_RAGE_LETTER',
        choice: 'burn',
        selectedIntensity: picked,
        letterPreview: finalText.slice(0, 80),
      },
    });
  };

  const handleSkip = () => {
    if (disabled) return;
    onChoose('🔥 다음에', {
      source: 'spirit_event',
      context: { spiritId: 'fire_goblin', eventType: 'SPIRIT_RAGE_LETTER', choice: 'skip' },
    });
  };

  // ─── BURN — 풀스크린 봉투 봉인 ───
  if (mode === 'burn') {
    return (
      <AnimatePresence>
        <motion.div
          key="burn"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(circle at 50% 50%, #2C0E0A 0%, #0A0202 100%)' }}
        >
          {/* 불씨 입자 */}
          {Array.from({ length: 26 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute select-none"
              style={{
                left: `${(i * 37) % 100}%`,
                bottom: '-5%',
                color: i % 3 === 0 ? '#FFD23F' : i % 3 === 1 ? '#FF7A2F' : '#FF3B1F',
                fontSize: 10 + (i % 4) * 6,
              }}
              animate={{
                y: ['0vh', '-110vh'],
                x: [0, (i % 2 === 0 ? 30 : -30)],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 3 + (i % 3),
                delay: (i % 8) * 0.2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            >
              ✦
            </motion.span>
          ))}

          {/* 봉투 등장 → 봉투 안으로 글자 빨려들어감 → 봉인 도장 */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 15 }}
            className="relative"
          >
            {/* 봉투 */}
            <div className="relative w-48 h-32 bg-gradient-to-br from-red-100 to-red-200 rounded-md shadow-2xl">
              {/* 봉투 삼각형 플랩 */}
              <div
                className="absolute inset-x-0 top-0 h-16 bg-gradient-to-br from-red-200 to-red-300"
                style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
              />
              {/* 봉투 외곽 그림자 */}
              <div className="absolute inset-0 rounded-md ring-1 ring-red-300" />
            </div>

            {/* 글자가 봉투로 빨려들어가는 애니 */}
            <motion.p
              initial={{ y: -120, scale: 1, opacity: 1 }}
              animate={{ y: -10, scale: 0.3, opacity: 0 }}
              transition={{ delay: 0.6, duration: 1.0, ease: 'easeIn' }}
              className="absolute -top-32 left-1/2 -translate-x-1/2 text-orange-200 font-bold text-sm whitespace-nowrap max-w-[200px] overflow-hidden"
              style={{ textShadow: '0 0 12px #FF6B2C' }}
            >
              {draft.slice(0, 24)}{draft.length > 24 ? '…' : ''}
            </motion.p>

            {/* 봉랍 인장 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.4, 1], opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.6, type: 'spring' }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-red-700 to-red-900 shadow-xl flex items-center justify-center text-2xl"
              style={{
                boxShadow: '0 0 30px rgba(220,38,38,0.7), inset 0 0 12px rgba(0,0,0,0.4)',
              }}
            >
              🔥
            </motion.div>

            {/* 불씨 폭발 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2.5, opacity: [0, 0.8, 0] }}
              transition={{ delay: 1.8, duration: 0.8 }}
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,107,44,0.6), transparent 70%)',
              }}
            />
          </motion.div>

          {/* 메시지 */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.6 }}
            className="text-orange-200 font-bold text-xl mt-12 text-center px-6"
            style={{ textShadow: '0 0 16px rgba(255,107,44,0.6)' }}
          >
            안 보냄.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.0 }}
            className="text-orange-300/80 text-sm italic mt-1"
          >
            보관함에 영원히 봉인됨
          </motion.p>

          <motion.button
            type="button"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 3.4 }}
            onClick={handleFinish}
            className="mt-10 px-8 py-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-base shadow-2xl active:scale-95"
            style={{ boxShadow: '0 8px 30px rgba(220,38,38,0.6)' }}
          >
            💥 후련하다
          </motion.button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── WRITE — 직접 쓰기 (글자 불타는 효과) ───
  if (mode === 'write') {
    return (
      <SpiritEventCard spiritId="fire_goblin" onSkip={handleSkip} disabled={disabled}>
        <p className="text-sm font-bold text-red-700 mb-2">🔥 다 적어! 안 보내!</p>
        <p className="text-xs text-gray-600 mb-3">어차피 안 부치니까 욕도 OK, 비명도 OK</p>

        <div className="relative mb-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={disabled}
            rows={5}
            maxLength={500}
            placeholder="여기에 다 쏟아내…"
            className="w-full px-3 py-2.5 text-sm bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-red-900 placeholder-red-300 font-bold resize-none"
            style={{
              textShadow: draft.length > 0 ? '0 0 6px rgba(255,107,44,0.6), 0 0 14px rgba(255,107,44,0.3)' : undefined,
            }}
          />
          {/* 불씨 입자 — 입력시 글자 따라 */}
          {draft.length > 0 && Array.from({ length: 6 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute pointer-events-none text-orange-400"
              style={{
                right: 12 + i * 6,
                bottom: 12 + (i % 3) * 8,
                fontSize: 6 + (i % 3) * 2,
              }}
              animate={{
                y: [0, -10, -20],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.7],
              }}
              transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity }}
            >
              ✦
            </motion.span>
          ))}
          <p className="text-[11px] text-right text-red-400 mt-1">{draft.length}/500</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled || draft.trim().length < 1}
            onClick={() => startBurn(draft)}
            className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white shadow active:scale-[0.98] disabled:opacity-40 transition"
          >
            💥 다 태우자
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode('invite')}
            className="py-2.5 px-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            ← 돌아가
          </button>
        </div>
      </SpiritEventCard>
    );
  }

  // ─── INVITE — 3개 초안 + 직접 쓰기 ───
  return (
    <SpiritEventCard spiritId="fire_goblin" onSkip={handleSkip} disabled={disabled}>
      <p className="text-sm font-bold text-red-700 mb-1">{data.openerMsg}</p>
      <p className="text-xs text-gray-600 mb-3">{data.context}</p>

      <div className="space-y-2">
        {data.drafts.map((d, i) => (
          <motion.button
            key={d.intensity}
            type="button"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            disabled={disabled}
            onClick={() => setPicked(d.intensity)}
            className={[
              'w-full text-left p-3 rounded-lg border-2 transition',
              INTENSITY_COLORS[d.intensity] ?? 'border-gray-200',
              picked === d.intensity ? 'ring-2 ring-red-400 scale-[1.01]' : 'hover:bg-red-100/30',
            ].join(' ')}
          >
            <div className="text-[11px] font-bold text-red-700 mb-1">
              {d.intensity === 'fire' ? '🔥' : d.intensity === 'honest' ? '💛' : '🥶'} {d.label}
            </div>
            <div className="text-sm whitespace-pre-wrap text-gray-800">{d.text}</div>
          </motion.button>
        ))}
      </div>

      <p className="mt-3 text-xs italic text-gray-500">{data.lunaCutIn}</p>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          disabled={disabled || !picked}
          onClick={() => {
            const d = data.drafts.find((x) => x.intensity === picked);
            if (d) startBurn(d.text);
          }}
          className="py-2.5 px-3 rounded-xl text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white shadow active:scale-[0.98] disabled:opacity-40 transition"
        >
          💥 다 태워버려
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setPicked('__user__'); setDraft(''); setMode('write'); }}
          className="py-2.5 px-3 rounded-xl text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
        >
          ✏️ 직접 써볼게
        </button>
      </div>
    </SpiritEventCard>
  );
}
