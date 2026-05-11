'use client';

/**
 * 🌙 v104.2: NightConfession — moon_rabbit 새벽 고백 풀스크린 의식
 *
 * 흐름:
 *   1) 카드(invite) — 시작 가이드
 *   2) 풀스크린 우주 — 한 줄 입력 + 달과 moon_rabbit
 *   3) send_to_moon → 글자가 별이 되어 달까지 올라감 + "달이 받았어"
 *   4) bury → 글자가 흙으로 묻힘 + 즉시 삭제
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { NightConfessionData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Mode = 'invite' | 'writing' | 'send' | 'bury';

export default function NightConfession({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as NightConfessionData;
  const [mode, setMode] = useState<Mode>('invite');
  const [body, setBody] = useState('');
  const [pickedPrompt, setPickedPrompt] = useState<string | null>(null);

  const handleSkip = () => {
    if (disabled) return;
    onChoose('🌙 다음에', {
      source: 'spirit_event',
      context: { spiritId: 'moon_rabbit', eventType: 'SPIRIT_NIGHT_CONFESSION', choice: 'skip' },
    });
  };

  const sendToMoon = () => {
    setMode('send');
    setTimeout(() => {
      onChoose('🌙 달에 띄워 보냈어', {
        source: 'spirit_event',
        context: {
          spiritId: 'moon_rabbit',
          eventType: 'SPIRIT_NIGHT_CONFESSION',
          choice: 'send_to_moon',
          body,
        },
      });
    }, 3500);
  };

  const buryIt = () => {
    setMode('bury');
    setTimeout(() => {
      onChoose('🌙 그냥 묻었어', {
        source: 'spirit_event',
        context: {
          spiritId: 'moon_rabbit',
          eventType: 'SPIRIT_NIGHT_CONFESSION',
          choice: 'bury',
        },
      });
    }, 2400);
  };

  // ─── INVITE — 카드 ───
  if (mode === 'invite') {
    return (
      <SpiritEventCard
        spiritId="moon_rabbit"
        onSkip={handleSkip}
        disabled={disabled}
        className="!bg-gradient-to-br !from-indigo-950 !to-purple-950 !border-indigo-700/40"
      >
        <div className="relative">
          {/* 별 파티클 */}
          {[...Array(8)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-yellow-100/60 text-[10px] select-none"
              style={{ left: `${5 + i * 12}%`, top: `${(i * 17) % 80}%` }}
              animate={{ opacity: [0.2, 0.9, 0.2] }}
              transition={{ duration: 3 + i * 0.4, repeat: Infinity }}
            >
              ✦
            </motion.span>
          ))}

          <p className="text-sm text-indigo-100 mb-1 font-serif italic relative">
            {data.openerMsg}
          </p>
          <p className="text-[11px] text-indigo-300/70 mb-4 relative">
            이 시간엔 평소엔 못 한 한 줄도 적어도 돼
          </p>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode('writing')}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-indigo-300 text-indigo-950 shadow-lg active:scale-[0.98] transition relative"
          >
            🌙 달과 같이 적어볼게
          </button>
        </div>
      </SpiritEventCard>
    );
  }

  // ─── WRITING — 풀스크린 ───
  if (mode === 'writing') {
    return (
      <AnimatePresence>
        <motion.div
          key="writing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] flex flex-col overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 70% 25%, #312E81 0%, #1E1B4B 50%, #0F0E2A 100%)',
          }}
        >
          {/* 별 */}
          {Array.from({ length: 42 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-yellow-50 select-none pointer-events-none"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 60}%`,
                fontSize: 4 + (i % 5) * 3,
              }}
              animate={{ opacity: [0.15, 1, 0.15], scale: [1, 1.4, 1] }}
              transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: (i % 10) * 0.15 }}
            >
              ✦
            </motion.span>
          ))}

          {/* 달 + moon_rabbit */}
          <div className="absolute right-6 top-12 pointer-events-none">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              {/* 달 */}
              <div
                className="w-28 h-28 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, #FFFBEB 0%, #FEF3C7 60%, #FDE68A 100%)',
                  boxShadow: '0 0 60px rgba(254,243,199,0.6), 0 0 120px rgba(254,243,199,0.3)',
                }}
              />
              {/* moon_rabbit 실루엣 */}
              <span
                className="absolute -bottom-2 -left-2 text-3xl"
                style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
              >
                🐰
              </span>
            </motion.div>
          </div>

          {/* 본문 */}
          <div className="relative z-10 flex-1 flex flex-col px-6 pt-6 pb-8">
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-indigo-100 font-serif italic text-base mb-6 mt-32"
            >
              {data.openerMsg}
            </motion.p>

            {/* 가이드 칩 */}
            <div className="space-y-1.5 mb-4">
              {data.prompts.map((p, i) => (
                <motion.button
                  key={p}
                  type="button"
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.12 }}
                  disabled={disabled}
                  onClick={() => {
                    setPickedPrompt(p);
                    if (!body) setBody(p);
                  }}
                  className={[
                    'w-full text-left px-3 py-2 text-xs rounded-lg transition',
                    pickedPrompt === p
                      ? 'bg-indigo-600/40 text-indigo-50 border border-indigo-300/60'
                      : 'text-indigo-200/80 border border-indigo-700/50 hover:bg-indigo-900/40',
                  ].join(' ')}
                >
                  {p}
                </motion.button>
              ))}
            </div>

            {/* 입력 */}
            <motion.textarea
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={disabled}
              rows={4}
              maxLength={200}
              placeholder="진짜 마음 한 줄…"
              className="w-full px-3 py-2.5 text-base bg-indigo-900/40 backdrop-blur-sm border border-indigo-500/40 text-indigo-50 placeholder-indigo-300/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 font-serif italic resize-none"
            />
            <p className="text-[11px] text-indigo-300/60 mt-1.5">아무도 못 봐. 너만.</p>

            {/* 액션 */}
            <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
              <motion.button
                type="button"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                disabled={disabled || body.length < 1}
                onClick={sendToMoon}
                className="py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-300 to-purple-300 text-indigo-950 shadow-lg active:scale-[0.98] disabled:opacity-40 transition"
              >
                🌙 달에 띄울래
              </motion.button>
              <motion.button
                type="button"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.0 }}
                disabled={disabled || body.length < 1}
                onClick={buryIt}
                className="py-3 rounded-xl text-sm font-medium border border-indigo-500/60 text-indigo-200 hover:bg-indigo-900/40 transition disabled:opacity-40"
              >
                🔒 그냥 묻을래
              </motion.button>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="mt-3 text-[11px] text-indigo-400/60 hover:text-indigo-300 underline self-center"
            >
              다음에
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── SEND — 글자가 별이 되어 달로 ───
  if (mode === 'send') {
    return (
      <AnimatePresence>
        <motion.div
          key="send"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[115] overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 70% 20%, #312E81 0%, #1E1B4B 50%, #0F0E2A 100%)',
          }}
        >
          {/* 배경 별 */}
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-yellow-50 select-none pointer-events-none"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 100}%`,
                fontSize: 4 + (i % 5) * 3,
              }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: (i % 12) * 0.1 }}
            >
              ✦
            </motion.span>
          ))}

          {/* 달 + 토끼 */}
          <div className="absolute right-12 top-16 pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 60px rgba(254,243,199,0.6)',
                  '0 0 120px rgba(254,243,199,0.9), 0 0 200px rgba(254,243,199,0.4)',
                  '0 0 60px rgba(254,243,199,0.6)',
                ],
              }}
              transition={{ duration: 3, delay: 2 }}
              className="w-32 h-32 rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #FFFBEB 0%, #FEF3C7 60%, #FDE68A 100%)',
              }}
            />
            <span className="absolute -bottom-2 -left-2 text-3xl">🐰</span>
          </div>

          {/* 사용자 글이 별이 되어 위로 올라감 */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 bottom-32 max-w-xs text-center"
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{
              y: ['0vh', '-30vh', '-50vh', '-65vh'],
              x: [0, 30, 80, 120],
              opacity: [1, 1, 0.7, 0],
              scale: [1, 0.8, 0.5, 0.2],
              rotate: [0, 10, 20, 30],
            }}
            transition={{ duration: 3, ease: 'easeOut' }}
          >
            <p
              className="text-indigo-100 font-serif italic text-base leading-relaxed"
              style={{
                textShadow: '0 0 20px rgba(199,210,254,0.8), 0 0 40px rgba(199,210,254,0.4)',
                fontFamily: 'var(--font-gaegu, serif)',
              }}
            >
              {body}
            </p>
          </motion.div>

          {/* 별 입자 따라옴 */}
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.span
              key={`trail-${i}`}
              className="absolute text-yellow-200 select-none pointer-events-none text-base"
              style={{ left: '50%', bottom: '30%' }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{
                x: 40 + (i * 8),
                y: -300 - (i * 30),
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.3],
              }}
              transition={{ duration: 2.5, delay: 0.2 + i * 0.15 }}
            >
              ✦
            </motion.span>
          ))}

          {/* "달이 받았어" */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 3.0 }}
            className="absolute left-0 right-0 bottom-20 text-center px-6"
          >
            <p className="text-indigo-100 font-bold text-xl mb-2">달이 받았어 ✨</p>
            <p className="text-indigo-300 text-xs italic">
              여기서만 빛나도 돼
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── BURY — 흙으로 묻기 ───
  return (
    <AnimatePresence>
      <motion.div
        key="bury"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[115] overflow-hidden flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #312E81 0%, #1E1B4B 40%, #5B4423 100%)',
        }}
      >
        {/* 사용자 글 (fade out) */}
        <motion.p
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: 100, filter: 'blur(8px)' }}
          transition={{ duration: 1.4 }}
          className="text-indigo-100 font-serif italic text-base text-center px-8 max-w-xs mb-8"
          style={{ fontFamily: 'var(--font-gaegu, serif)' }}
        >
          {body}
        </motion.p>

        {/* 흙 덮임 */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1/2"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ duration: 1.6, ease: 'easeIn', delay: 0.3 }}
          style={{
            background: 'linear-gradient(180deg, #78350F 0%, #451A03 100%)',
            borderTopLeftRadius: '50%',
            borderTopRightRadius: '50%',
          }}
        />

        {/* 자물쇠 */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.8, type: 'spring' }}
          className="absolute bottom-32 text-6xl"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
        >
          🔒
        </motion.div>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2.0 }}
          className="absolute bottom-16 left-0 right-0 text-center text-amber-100 font-bold text-base"
        >
          묻었어. 기억 안 해도 돼.
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
