'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 v48: 상황 재연 1인 연극 + 기존 마음 헤아리기 통합
 *
 * eventStyle === 'situation_scene' → 루나 1인 연극 (v48)
 * eventStyle === 'situation_summary' → 기존 텍스트 상황파악 (폴백)
 * 그 외 → 기존 마음 헤아리기
 */

interface MindReadingProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

interface ChoiceItem {
  label: string;
  value: string;
  emoji: string;
}

/** 대사에서 (지문)과 대사를 분리 */
function parseSceneLine(line: string): { action?: string; dialog: string } {
  const match = line.match(/^\(([^)]+)\)\s*(.*)$/);
  if (match) return { action: match[1], dialog: match[2] };
  return { dialog: line };
}

export default function MindReading({ event, onSelect, disabled }: MindReadingProps) {
  const [phase, setPhase] = useState<'reading' | 'different' | 'unsure' | 'done'>('reading');
  const [userInput, setUserInput] = useState('');

  const data = event.data as {
    surfaceEmotion?: string;
    deepGuess?: string;
    fullText?: string;
    lunaMessage?: string;
    choices?: ChoiceItem[];
    eventStyle?: string;
    stickerId?: string;
    situationSummary?: string;
    coreProblem?: string;
    // 🆕 v48: 1인 연극
    sceneTitle?: string;
    sceneLines?: string[];
    problemReveal?: string;
  };

  const isScene = data.eventStyle === 'situation_scene' && data.sceneLines && data.sceneLines.length > 0;
  const isSituationSummary = data.eventStyle === 'situation_summary';
  const guessText = isSituationSummary
    ? (data.situationSummary || data.fullText || '네 상황을 정리해볼게')
    : (data.fullText || data.deepGuess || '네 마음이 좀 복잡한 것 같아');
  const lunaMsg = data.lunaMessage || (isScene ? '야 봐봐 내가 니 상황 해볼게 ㅋㅋ' : isSituationSummary ? '야 내가 들은 거 정리해볼게' : '야 잠깐, 나 느낌 오는 게 하나 있는데');
  const choices = data.choices ?? [
    { label: '어 맞아! 그런 것 같아', value: 'confirm', emoji: '💡' },
    { label: '음 좀 다른 것 같은데...', value: 'different', emoji: '🤔' },
    { label: '나도 잘 모르겠어', value: 'unsure', emoji: '😶' },
  ];

  const handleConfirm = () => {
    setPhase('done');
    onSelect('맞아', {
      source: 'mind_reading' as any,
      context: {
        agreed: true,
        deepGuess: data.deepGuess,
        surfaceEmotion: data.surfaceEmotion,
      },
    });
  };

  const handleDifferent = () => setPhase('different');

  const handleUnsure = () => {
    setPhase('done');
    onSelect('나도 잘 모르겠어', {
      source: 'mind_reading' as any,
      context: { agreed: false, unsure: true, deepGuess: data.deepGuess, surfaceEmotion: data.surfaceEmotion },
    });
  };

  const handleSubmitCorrection = () => {
    if (!userInput.trim()) return;
    setPhase('done');
    onSelect(userInput.trim(), {
      source: 'mind_reading' as any,
      context: { agreed: false, userCorrection: userInput.trim(), deepGuess: data.deepGuess },
    });
  };

  const handleChoice = (value: string) => {
    switch (value) {
      case 'confirm': return handleConfirm();
      case 'different': return handleDifferent();
      case 'unsure': return handleUnsure();
      case 'more':
        setPhase('done');
        onSelect('더 있어, 들어줘', {
          source: 'mind_reading' as any,
          context: { agreed: false, wantsMore: true },
        });
        return;
    }
  };

  // ─── 완료 상태 ───
  if (phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-pink-50/80 to-purple-50/80 rounded-2xl border border-pink-100/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🦊</span>
          <span className="text-[12px] font-bold text-pink-600">
            {isScene ? '상황 파악 완료' : isSituationSummary ? '상황 파악 완료' : '마음 들여다보기'}
          </span>
          <span className="text-[11px] text-gray-400">✓ 루나가 기억할게</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.3 }}
      className="mx-4 my-4"
    >
      <div className="relative bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl border-2 border-dashed border-pink-200/60 shadow-lg overflow-hidden p-5">

        {/* 배경 반짝이 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-pink-300/40"
              style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>

        {/* 타이틀 */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="relative">
            <div className="w-10 h-10 flex-shrink-0 border-2 border-pink-200 overflow-hidden bg-white shadow-sm"
                 style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}>
              <img src="/char_img/luna_1_event.png" alt="루나" className="w-full h-full object-cover" />
            </div>
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-pink-300"
            />
          </div>
          <div>
            <div className="text-[13px] font-bold text-pink-600">
              {isScene ? '🎭 루나의 1인 연극' : isSituationSummary ? '📋 루나의 상황 파악' : '🦊 마음 들여다보기'}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[10px] text-pink-400"
            >
              {lunaMsg}
            </motion.div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── 메인 콘텐츠 ─── */}
          {phase === 'reading' && (
            <motion.div
              key="reading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-pink-100/50 shadow-sm">

                {/* ─── v48: 1인 연극 모드 ─── */}
                {isScene ? (
                  <>
                    {/* 장면 제목 */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-center mb-3 py-1.5 px-3 bg-pink-50 rounded-xl border border-pink-100/50"
                    >
                      <span className="text-[10px] text-pink-400 font-bold">장면:</span>
                      <span className="text-[12px] text-pink-600 font-bold ml-1">{data.sceneTitle}</span>
                    </motion.div>

                    {/* 연극 대사들 */}
                    <div className="space-y-2.5 mb-4">
                      {data.sceneLines!.map((line, idx) => {
                        const parsed = parseSceneLine(line);
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + idx * 0.35, type: 'spring', stiffness: 300 }}
                            className="pl-3 border-l-[3px] border-pink-200/60"
                          >
                            {parsed.action && (
                              <p className="text-[10px] text-gray-400 italic mb-0.5">
                                ({parsed.action})
                              </p>
                            )}
                            <p className="text-[13px] font-bold text-gray-700 leading-relaxed">
                              {parsed.dialog}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Problem Reveal */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + data.sceneLines!.length * 0.35, type: 'spring' }}
                      className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 border border-pink-200/50"
                    >
                      <div className="text-[10px] text-pink-400 mb-1 font-bold">🎯 루나가 짚은 핵심</div>
                      <div className="text-[13px] font-bold text-pink-600 leading-snug">
                        {data.problemReveal}
                      </div>
                    </motion.div>
                  </>
                ) : isSituationSummary ? (
                  /* ─── 기존 텍스트 상황파악 (폴백) ─── */
                  <>
                    {data.stickerId && (
                      <div className="flex justify-center mb-3">
                        <img
                          src={`/stickers/luna-${data.stickerId}.png`}
                          alt="루나"
                          className="w-[80px] h-auto"
                        />
                      </div>
                    )}
                    <div className="text-[11px] text-pink-400 mb-1.5">내가 이해한 상황</div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.8 }}
                      className="text-[14px] font-bold text-gray-800 leading-relaxed mb-3"
                    >
                      &ldquo;{guessText}&rdquo;
                    </motion.div>
                    {data.coreProblem && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.0, duration: 0.6 }}
                        className="bg-pink-50 rounded-xl p-3 border border-pink-100/50"
                      >
                        <div className="text-[10px] text-pink-400 mb-1">🎯 해결해야 할 것</div>
                        <div className="text-[13px] font-bold text-pink-600">{data.coreProblem}</div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  /* ─── 기존 마음 헤아리기 ─── */
                  <>
                    <div className="text-[11px] text-pink-400 mb-1.5">혹시...</div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.8 }}
                      className="text-[15px] font-bold text-gray-800 leading-relaxed"
                    >
                      &ldquo;{guessText}&rdquo;
                    </motion.div>
                  </>
                )}
              </div>

              {/* 선택지 */}
              <div className="flex flex-col gap-2">
                {choices.map((choice, idx) => (
                  <motion.button
                    key={choice.value}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (isScene ? 1.2 + data.sceneLines!.length * 0.35 : 0.7) + idx * 0.1 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChoice(choice.value)}
                    disabled={disabled}
                    className={`w-full py-3 px-4 rounded-2xl font-bold text-[13px] transition-all disabled:opacity-50 ${
                      idx === 0
                        ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md hover:shadow-lg'
                        : idx === 1
                        ? 'bg-white border-2 border-pink-200 text-pink-500 hover:bg-pink-50'
                        : 'bg-gray-50 border border-gray-200 text-gray-400 hover:bg-gray-100 text-[12px]'
                    }`}
                  >
                    {choice.emoji} {choice.label}
                  </motion.button>
                ))}
              </div>

              <div className="text-center mt-3">
                <span className="text-[9px] text-gray-400">
                  {isScene ? '🎭 루나가 네 이야기를 연기해본 거야' : isSituationSummary ? '📋 루나가 네 이야기를 정리한 거야' : '✨ 루나가 대화를 듣고 느낀 거야'}
                </span>
              </div>
            </motion.div>
          )}

          {/* "좀 다른데" → 직접 입력 */}
          {phase === 'different' && (
            <motion.div
              key="different"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-violet-100/50">
                <div className="text-[13px] font-bold text-violet-600 mb-1">아 그래?</div>
                <div className="text-[11px] text-gray-400 mb-3">그럼 어떤 상황인지 알려줘 — 한 줄이면 돼!</div>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="사실은..."
                  className="w-full h-16 px-3 py-2.5 text-[13px] bg-violet-50/50 border border-violet-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent placeholder:text-gray-300"
                  autoFocus
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmitCorrection}
                disabled={!userInput.trim()}
                className="w-full py-3 bg-gradient-to-r from-violet-400 to-indigo-400 text-white rounded-2xl font-bold text-[13px] shadow-md disabled:opacity-40 transition-opacity"
              >
                이게 맞아 💜
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
