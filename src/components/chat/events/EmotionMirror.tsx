import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, EmotionMirrorData } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface EmotionMirrorProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

/** 대사에서 (지문)과 대사를 분리 */
function parseSceneLine(line: string): { action?: string; dialog: string } {
  const match = line.match(/^\(([^)]+)\)\s*(.*)$/);
  if (match) {
    return { action: match[1], dialog: match[2] };
  }
  return { dialog: line };
}

export default function EmotionMirror({ event, onSelect, disabled }: EmotionMirrorProps) {
  const data = event.data as unknown as EmotionMirrorData;
  const [submitted, setSubmitted] = useState(false);

  // v48: 1인 연극 모드 여부
  const hasScene = data.sceneLines && data.sceneLines.length > 0 && data.reveal;

  function handleSelect(value: string) {
    if (disabled || submitted) return;
    setSubmitted(true);

    const text = value === 'confirm'
      ? `맞아, ${(data.reveal || data.deepEmotion).slice(0, 20)}... 그런 느낌이야`
      : '음 좀 다른 느낌인데, 내가 말해볼게';

    onSelect(text, {
      source: 'emotion_mirror',
      context: {
        confirmed: value === 'confirm',
        surfaceEmotion: data.surfaceEmotion,
        deepEmotion: data.deepEmotion,
      },
    });
  }

  // ─────────────────────────────────────────
  // v48: 1인 연극 레이아웃
  // ─────────────────────────────────────────
  if (hasScene) {
    const lines = data.sceneLines!;
    const revealLine = data.reveal!;
    // 마지막 2줄이 전환점 + 속마음 비침
    const surfaceLines = lines.slice(0, -2);
    const transitionLines = lines.slice(-2);

    return (
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
        className="bg-[#faf9f5] border-[2.5px] border-slate-700 p-5 my-4 max-w-[88%] ml-auto overflow-hidden relative"
      >
        {/* 종이 텍스처 */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />

        {/* 헤더: 루나의 1인 연극 */}
        <div className="flex items-start gap-3 mb-4 relative z-10">
          <div
            className="w-10 h-10 flex-shrink-0 border-2 border-slate-700 overflow-hidden"
            style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
          >
            <img src="/luna_fox_transparent.png" alt="루나" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-800">
              🎭 루나의 1인 연극
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              잠깐, 내가 너 상황 한번 해볼게
            </p>
          </div>
        </div>

        {/* 장면 제목 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 mb-4 py-2 px-3 bg-slate-100/80 border border-slate-200"
          style={{
            borderRadius: '15px 225px 15px 255px/255px 15px 225px 15px',
            transform: 'rotate(-0.3deg)',
          }}
        >
          <p className="text-[11px] text-slate-400 font-bold text-center">
            장면: {data.sceneTitle || '너의 그 순간'}
          </p>
        </motion.div>

        {/* 연극 대사들 */}
        <div className="space-y-2.5 mb-4 relative z-10">
          {/* 겉감정 연기 (1~2줄) */}
          {surfaceLines.map((line, idx) => {
            const parsed = parseSceneLine(line);
            return (
              <motion.div
                key={`surface-${idx}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.3, type: 'spring', stiffness: 300 }}
                className="pl-3 border-l-[3px] border-rose-300/60"
              >
                {parsed.action && (
                  <p className="text-[10.5px] text-slate-400 italic mb-0.5">
                    ({parsed.action})
                  </p>
                )}
                <p className="text-[13px] font-bold text-slate-700 leading-relaxed">
                  {parsed.dialog}
                </p>
              </motion.div>
            );
          })}

          {/* 전환 점선 */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.4 + surfaceLines.length * 0.3, duration: 0.4 }}
            className="border-t-2 border-dashed border-slate-300/60 my-1 mx-4"
          />

          {/* 전환점 + 속마음 비침 (마지막 2줄) */}
          {transitionLines.map((line, idx) => {
            const parsed = parseSceneLine(line);
            return (
              <motion.div
                key={`deep-${idx}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.6 + surfaceLines.length * 0.3 + idx * 0.4,
                  type: 'spring',
                  stiffness: 300,
                }}
                className="pl-3 border-l-[3px] border-purple-300/60"
              >
                {parsed.action && (
                  <p className="text-[10.5px] text-purple-400 italic mb-0.5">
                    ({parsed.action})
                  </p>
                )}
                <p className="text-[13px] font-bold text-slate-700 leading-relaxed">
                  {parsed.dialog}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Reveal: 루나의 파악 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.8 + lines.length * 0.3,
            type: 'spring',
            stiffness: 250,
          }}
          className="relative z-10 p-3 mb-4 bg-purple-50/70 border-2 border-purple-200/40"
          style={{
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            transform: 'rotate(-0.3deg)',
          }}
        >
          <p className="text-[11px] font-bold text-purple-400 mb-1">
            {data.deepEmoji} 루나가 느끼기에...
          </p>
          <p className="text-[13px] font-bold text-slate-800 leading-snug">
            &ldquo;{revealLine}&rdquo;
          </p>
        </motion.div>

        {/* 루나 마무리 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 + lines.length * 0.3 }}
          className="text-[12px] font-bold text-slate-500 text-center mb-4 relative z-10"
          style={{ transform: 'rotate(-0.5deg)' }}
        >
          {data.lunaMessage}
        </motion.p>

        {/* 선택 버튼 */}
        <div className="flex gap-2.5 relative z-10">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="submitted"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full py-3 text-center text-[13px] font-bold text-slate-500 bg-slate-100 border-2 border-slate-200"
                style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
              >
                ✓ 루나가 기억해둘게!
              </motion.div>
            ) : (
              <>
                {data.choices.map((choice, idx) => (
                  <motion.button
                    key={choice.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + lines.length * 0.3 + idx * 0.1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSelect(choice.value)}
                    disabled={disabled}
                    className={`py-3 font-bold text-[12.5px] transition-all border-[2.5px] ${
                      idx === 0
                        ? 'flex-1 bg-white border-slate-700/30 text-slate-600 hover:bg-slate-50'
                        : 'flex-[1.5] bg-pink-400 text-white border-slate-700 hover:bg-pink-500'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                    style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
                  >
                    {choice.label}
                  </motion.button>
                ))}
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────
  // 레거시 폴백: sceneLines 없을 때 기존 방식
  // ─────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, rotate: -0.5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
      className="bg-[#faf9f5] border-[2.5px] border-slate-700 p-5 my-4 max-w-[88%] ml-auto overflow-hidden relative"
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />

      <div className="flex items-start gap-3 mb-5 relative z-10">
        <div className="w-10 h-10 flex-shrink-0 border-2 border-slate-700 overflow-hidden"
             style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}>
          <img src="/luna_fox_transparent.png" alt="루나" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-800">루나가 보기에... 🦊</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">네 마음을 좀 들여다봤어</p>
        </div>
      </div>

      <div className="space-y-3 mb-5 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="flex items-start gap-3 p-3 bg-rose-50/60 border-2 border-slate-700/15"
          style={{ borderRadius: '15px 225px 15px 255px/255px 15px 225px 15px', transform: 'rotate(0.3deg)' }}
        >
          <span className="text-2xl flex-shrink-0 mt-0.5">{data.surfaceEmoji}</span>
          <div>
            <p className="text-[11px] font-bold text-rose-400 mb-0.5">겉으로는</p>
            <p className="text-[13px] font-bold text-slate-800 leading-snug">&ldquo;{data.surfaceEmotion}&rdquo;</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="flex justify-center"
        >
          <span className="text-slate-400 text-lg">↓</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="flex items-start gap-3 p-3 bg-purple-50/60 border-2 border-slate-700/15"
          style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', transform: 'rotate(-0.3deg)' }}
        >
          <span className="text-2xl flex-shrink-0 mt-0.5">{data.deepEmoji}</span>
          <div>
            <p className="text-[11px] font-bold text-purple-400 mb-0.5">속마음은</p>
            <p className="text-[13px] font-bold text-slate-800 leading-snug">&ldquo;{data.deepEmotion}&rdquo;</p>
          </div>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-[12px] font-bold text-slate-500 text-center mb-4 relative z-10"
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        {data.lunaMessage}
      </motion.p>

      <div className="flex gap-2.5 relative z-10">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full py-3 text-center text-[13px] font-bold text-slate-500 bg-slate-100 border-2 border-slate-200"
              style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
            >
              ✓ 루나가 기억해둘게!
            </motion.div>
          ) : (
            <>
              {data.choices.map((choice, idx) => (
                <motion.button
                  key={choice.value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleSelect(choice.value)}
                  disabled={disabled}
                  className={`py-3 font-bold text-[12.5px] transition-all border-[2.5px] ${
                    idx === 0
                      ? 'flex-1 bg-white border-slate-700/30 text-slate-600 hover:bg-slate-50'
                      : 'flex-[1.5] bg-pink-400 text-white border-slate-700 hover:bg-pink-500'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                  style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
                >
                  {choice.label}
                </motion.button>
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
