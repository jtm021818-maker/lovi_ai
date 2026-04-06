import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, EmotionMirrorData } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface EmotionMirrorProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function EmotionMirror({ event, onSelect, disabled }: EmotionMirrorProps) {
  const data = event.data as unknown as EmotionMirrorData;
  const [submitted, setSubmitted] = useState(false);

  function handleSelect(value: string, label: string) {
    if (disabled || submitted) return;
    setSubmitted(true);

    const text = value === 'confirm'
      ? `맞아, ${data.deepEmotion.slice(0, 20)}... 그런 느낌이야`
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, rotate: -0.5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
      className="bg-[#faf9f5] border-[2.5px] border-slate-700 p-5 my-4 max-w-[88%] ml-auto overflow-hidden relative"
    >
      {/* 종이 텍스처 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* 헤더: 루나의 마음 거울 */}
      <div className="flex items-start gap-3 mb-5 relative z-10">
        <div className="w-10 h-10 flex-shrink-0 border-2 border-slate-700 overflow-hidden"
             style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}>
          <img src="/luna_fox_transparent.png" alt="루나" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-800">
            루나가 보기에... 🦊
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            네 마음을 좀 들여다봤어
          </p>
        </div>
      </div>

      {/* 표면 감정 → 깊은 감정 거울 */}
      <div className="space-y-3 mb-5 relative z-10">
        {/* 표면 감정 */}
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
            <p className="text-[13px] font-bold text-slate-800 leading-snug">
              &ldquo;{data.surfaceEmotion}&rdquo;
            </p>
          </div>
        </motion.div>

        {/* 화살표 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="flex justify-center"
        >
          <span className="text-slate-400 text-lg">↓</span>
        </motion.div>

        {/* 깊은 감정 */}
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
            <p className="text-[13px] font-bold text-slate-800 leading-snug">
              &ldquo;{data.deepEmotion}&rdquo;
            </p>
          </div>
        </motion.div>
      </div>

      {/* 루나 한마디 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
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
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleSelect(choice.value, choice.label)}
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
