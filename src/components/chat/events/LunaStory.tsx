'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 ACE v4: 비슷한 경험 (Self-Disclosure)
 *
 * "친한 누나가 자기 이야기 꺼내는 순간"
 *
 * 핵심 UX:
 * - 단계적 전개: opener → situation → innerThought → cliffhanger
 * - 타이핑 효과로 진짜 말하는 느낌
 * - "..."으로 끝나는 클리프행어 → 호기심 → "뭔데?!"
 * - 3선택지: 뭔데?(curious) / 나도비슷해(relate) / 좀다른데(different)
 *
 * 심리학:
 * - Self-Disclosure 상호성 (jaenung.net, arxiv 2025)
 * - 보편성 인식 (mindthos.com)
 * - Vulnerability Hangover 방지 (psychologytoday.com)
 */

interface ChoiceItem {
  label: string;
  emoji: string;
  value: 'curious' | 'relate' | 'different';
}

interface LunaStoryProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

// 타이핑 효과 훅
function useTypewriter(text: string, speed = 40, startDelay = 0) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;

    const startTimer = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

export default function LunaStory({ event, onSelect, disabled }: LunaStoryProps) {
  const [phase, setPhase] = useState<'storytelling' | 'choices' | 'done'>('storytelling');

  const data = event.data as {
    opener?: string;
    situation?: string;
    innerThought?: string;
    cliffhanger?: string;
    choices?: ChoiceItem[];
  };

  const opener = data.opener || '야 근데 있잖아... 나도 비슷한 거 겪어본 적 있거든';
  const situation = data.situation || '나도 그때 진짜 마음이 무거웠어';
  const innerThought = data.innerThought || "'나만 이런 건가?' 그 생각이 계속 들더라고";
  const cliffhanger = data.cliffhanger || '근데 나중에 알게 됐거든? 그게 사실...';
  const choices: ChoiceItem[] = data.choices ?? [
    { label: '뭔데..?', emoji: '👀', value: 'curious' },
    { label: '나도 비슷해', emoji: '💭', value: 'relate' },
    { label: '글쎄 난 좀 다른 것 같아', emoji: '🤔', value: 'different' },
  ];

  // 단계별 타이핑 효과 (순차 등장)
  const openerType = useTypewriter(opener, 35, 300);
  const situationType = useTypewriter(situation, 35, openerType.done ? 400 : 9999);
  const innerType = useTypewriter(innerThought, 35, situationType.done ? 500 : 9999);
  const cliffType = useTypewriter(cliffhanger, 40, innerType.done ? 700 : 9999);

  // 클리프행어가 끝나면 선택지 등장
  useEffect(() => {
    if (cliffType.done && phase === 'storytelling') {
      const t = setTimeout(() => setPhase('choices'), 600);
      return () => clearTimeout(t);
    }
  }, [cliffType.done, phase]);

  // 선택지 클릭 핸들러
  const handleChoice = (choice: ChoiceItem) => {
    setPhase('done');
    let text: string;
    switch (choice.value) {
      case 'curious':
        text = '뭔데..? 더 말해줘';
        break;
      case 'relate':
        text = '나도 진짜 비슷해...';
        break;
      case 'different':
        text = '음 나는 좀 다른 것 같아';
        break;
    }
    onSelect(text, {
      source: 'luna_story' as any,
      context: {
        choice: choice.value,
        opener,
        situation,
        innerThought,
        cliffhanger,
      },
    });
  };

  // 완료 상태 — 최소화된 표시
  if (phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-2xl border border-purple-100/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <span className="text-[12px] font-bold text-purple-600">비슷한 경험</span>
          <span className="text-[11px] text-gray-400">💭 같이 생각해보자</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.2 }}
      className="mx-4 my-4"
    >
      {/* 메모장 느낌의 따뜻한 카드 */}
      <div
        className="relative rounded-3xl border-2 border-dashed shadow-lg overflow-hidden p-5"
        style={{
          background: 'linear-gradient(135deg, #fef3f7 0%, #fef9f5 50%, #fff5f8 100%)',
          borderColor: 'rgba(244, 114, 182, 0.3)',
        }}
      >
        {/* 종이 결 텍스처 */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(244, 114, 182, 0.04) 24px, rgba(244, 114, 182, 0.04) 25px)',
          }}
        />

        {/* 부드러운 빛 효과 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-pink-300/40"
              style={{ left: `${10 + i * 12}%`, top: `${15 + (i % 3) * 30}%` }}
              animate={{
                opacity: [0.2, 0.7, 0.2],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>

        {/* 헤더 */}
        <div className="relative flex items-center gap-2.5 mb-4">
          <div className="relative">
            <div
              className="w-11 h-11 flex-shrink-0 border-2 border-pink-200 overflow-hidden bg-white shadow-sm"
              style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
            >
              <img src="/char_img/luna_1_event.webp" alt="루나" className="w-full h-full object-cover" />
            </div>
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-pink-400"
            />
          </div>
          <div>
            <div className="text-[14px] font-bold text-pink-600">📖 비슷한 경험</div>
            <div className="text-[10px] text-pink-400/80">나도 그랬거든...</div>
          </div>
        </div>

        {/* 스토리 텍스트 영역 */}
        <div className="relative space-y-3">
          {/* 1. Opener — 시작 멘트 */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[14px] font-semibold text-gray-700 leading-relaxed"
          >
            {openerType.displayed}
            {!openerType.done && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
                className="inline-block ml-0.5 w-[2px] h-[14px] bg-pink-400 align-middle"
              />
            )}
          </motion.div>

          {/* 2. Situation — 루나의 상황 (메모장 박스 안에) */}
          <AnimatePresence>
            {openerType.done && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-pink-100/60 shadow-sm"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-base">💜</span>
                  <div className="text-[13px] text-gray-700 leading-relaxed flex-1 italic">
                    {situationType.displayed}
                    {situationType.displayed && !situationType.done && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.7, repeat: Infinity }}
                        className="inline-block ml-0.5 w-[2px] h-[12px] bg-pink-400 align-middle"
                      />
                    )}
                  </div>
                </div>

                {/* 3. Inner Thought — 속마음 */}
                {situationType.done && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[12px] text-pink-500/90 italic pl-6 leading-relaxed"
                  >
                    {innerType.displayed}
                    {innerType.displayed && !innerType.done && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.7, repeat: Infinity }}
                        className="inline-block ml-0.5 w-[2px] h-[11px] bg-pink-400 align-middle"
                      />
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Cliffhanger — 클리프행어 */}
          <AnimatePresence>
            {innerType.done && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[14px] font-bold text-gray-800 leading-relaxed pt-1"
              >
                {cliffType.displayed}
                {cliffType.displayed && !cliffType.done && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    className="inline-block ml-0.5 w-[2px] h-[14px] bg-pink-500 align-middle"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 선택지 — 클리프행어 끝나면 등장 */}
        <AnimatePresence>
          {phase === 'choices' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="relative mt-5 flex flex-col gap-2"
            >
              {choices.map((choice, idx) => (
                <motion.button
                  key={choice.value}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.12 }}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleChoice(choice)}
                  disabled={disabled}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-[13px] transition-all disabled:opacity-50 ${
                    idx === 0
                      ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md hover:shadow-lg'
                      : idx === 1
                      ? 'bg-white border-2 border-pink-200 text-pink-500 hover:bg-pink-50'
                      : 'bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 text-[12px]'
                  }`}
                >
                  <span className="mr-1.5">{choice.emoji}</span>
                  {choice.label}
                </motion.button>
              ))}

              <div className="text-center mt-2">
                <span className="text-[9px] text-gray-400">💭 루나가 자기 이야기 꺼내는 순간</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
