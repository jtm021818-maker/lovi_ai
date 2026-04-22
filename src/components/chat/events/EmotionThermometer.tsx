import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

// ============================================================================
// 🖍️ 나노바나나 스타일 커스텀 감정 코어 SVG & 데이터
// ============================================================================
const HAND_DRAWN_EMOTIONS = [
  {
    value: -4,
    label: '많이 힘들어',
    // 폭풍 눈물 (>< 눈 + 〰 입 + 눈물방울)
    svg: (
      <svg viewBox="0 0 100 100" className="w-[42px] h-[42px] overflow-visible">
        {/* 삐뚤빼뚤 얼굴 윤곽선 */}
        <path d="M50 12 C 20 10, 10 38, 12 68 C 15 92, 45 95, 72 88 C 92 82, 95 55, 90 28 C 85 10, 65 15, 50 12 Z"
              fill="#fefce8" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* >< 모양 눈 */}
        <path d="M25 38 L35 45 L25 52 M75 38 L65 45 L75 52"
              fill="none" stroke="#334155" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* 지그재그 입 */}
        <path d="M38 72 Q 44 64, 50 72 T 62 72"
              fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* 굵은 눈물 */}
        <path d="M30 55 Q 35 75, 25 80 Q 15 75, 20 55 Z M70 55 Q 75 75, 65 80 Q 55 75, 60 55 Z"
              fill="#60a5fa" stroke="#334155" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    value: -2,
    label: '좀 힘들어',
    // 섭섭/우울 (처진 눈물/눈썹 + ︵ 입)
    svg: (
      <svg viewBox="0 0 100 100" className="w-[42px] h-[42px] overflow-visible">
        <path d="M50 8 C 22 10, 12 40, 15 70 C 18 90, 48 97, 75 90 C 95 85, 92 50, 88 25 C 82 8, 62 6, 50 8 Z"
              fill="#fefce8" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* 처진 눈썹 (우울) */}
        <path d="M25 35 Q 32 30, 40 38 M75 35 Q 68 30, 60 38"
              fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* 눈 (작은 점) */}
        <circle cx="32" cy="48" r="3" fill="#334155" />
        <circle cx="68" cy="48" r="3" fill="#334155" />
        {/* 엎은 U 입 */}
        <path d="M40 70 Q 50 63, 60 70"
              fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    value: 0,
    label: '그냥 그래',
    // 멍함 (점눈 + 일자 입)
    svg: (
      <svg viewBox="0 0 100 100" className="w-[42px] h-[42px] overflow-visible">
        <path d="M48 10 C 20 12, 10 38, 14 68 C 18 92, 50 95, 74 85 C 92 78, 96 48, 88 22 C 80 5, 62 8, 48 10 Z"
              fill="#fefce8" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* 점눈 */}
        <circle cx="35" cy="45" r="3.5" fill="#334155" />
        <circle cx="65" cy="45" r="3.5" fill="#334155" />
        {/* 무심한 일자 입 */}
        <path d="M40 70 L 60 68"
              fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    value: 2,
    label: '괜찮아',
    // 방긋 (둥근 눈 + 미소 입)
    svg: (
      <svg viewBox="0 0 100 100" className="w-[42px] h-[42px] overflow-visible">
        <path d="M52 8 C 25 10, 8 38, 12 68 C 16 95, 50 94, 76 86 C 96 80, 94 48, 86 24 C 80 8, 65 6, 52 8 Z"
              fill="#fefce8" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* 홍조 */}
        <ellipse cx="25" cy="55" rx="8" ry="5" fill="#fbcfe8" opacity="0.8" />
        <ellipse cx="75" cy="55" rx="8" ry="5" fill="#fbcfe8" opacity="0.8" />
        {/* 미소 눈 (아치형) */}
        <path d="M25 45 Q 32 35, 40 45 M75 45 Q 68 35, 60 45"
              fill="none" stroke="#334155" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* 살짝 웃는 입 (u) */}
        <path d="M42 68 Q 50 75, 58 65"
              fill="none" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    value: 4,
    label: '좋은 편!',
    // 완전 행복 (큰 입)
    svg: (
      <svg viewBox="0 0 100 100" className="w-[42px] h-[42px] overflow-visible">
        <path d="M50 12 C 22 10, 12 42, 16 70 C 20 95, 52 96, 78 86 C 96 78, 92 46, 88 22 C 80 6, 62 14, 50 12 Z"
              fill="#fefce8" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* 꿀 홍조 */}
        <ellipse cx="22" cy="52" rx="10" ry="6" fill="#fbcfe8" opacity="0.9" />
        <ellipse cx="78" cy="52" rx="10" ry="6" fill="#fbcfe8" opacity="0.9" />
        {/* 많이 휜 아치 눈 */}
        <path d="M20 40 Q 30 25, 40 42 M80 40 Q 70 25, 60 42"
              fill="none" stroke="#334155" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* 활짝 D 입 */}
        <path d="M35 60 C 35 60, 50 85, 65 60 Z"
              fill="#fb7185" stroke="#334155" strokeWidth="4" strokeLinejoin="round" />
      </svg>
    )
  }
];

// AI점수(-5~5)를 5단계 인덱스 맵핑
function getNearestScore(aiScore: number): number {
  const diffs = HAND_DRAWN_EMOTIONS.map(opt => Math.abs(opt.value - aiScore));
  const minDiff = Math.min(...diffs);
  return HAND_DRAWN_EMOTIONS[diffs.indexOf(minDiff)].value;
}

interface EmotionThermometerProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function EmotionThermometer({ event, onSelect, disabled }: EmotionThermometerProps) {
  const rawAiScore = (event.data as any).aiAssessedScore ?? 5;
  const initialScore = getNearestScore(rawAiScore);

  const [score, setScore] = useState(initialScore);
  const [submitted, setSubmitted] = useState(false);
  const [adjusted, setAdjusted] = useState(false);

  const isChanged = score !== initialScore;

  function handleSelectEmotion(value: number) {
    if (disabled || submitted) return;
    setScore(value);
    if (value !== initialScore) setAdjusted(true);
  }

  function handleSubmit() {
    if (disabled || submitted) return;
    setSubmitted(true);

    let text: string;
    if (!isChanged) {
      text = `마자 난 ${score}점 정도인 거 가태.`;
    } else {
      const diff = score - initialScore;
      const direction = diff > 0 ? '더 기분 조은' : '좀 더 우울한';
      text = `사실 ${direction} 느낌이야. ${score}점 정도?`;
    }

    onSelect(text, {
      source: 'emotion_thermometer',
      context: {
        score,
        aiAssessedScore: initialScore,
        wasAdjusted: isChanged,
        adjustment: score - initialScore
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, rotate: -1, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }} // Wobbly Hand-drawn Border
      className="bg-[#faf9f5] border-[2.5px] border-slate-700 p-5 my-4 max-w-[88%] ml-auto overflow-visible relative"
    >
      {/* 텍스처 오버레이 (구겨진 종이 느낌) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* 헤더 섹션: 루나 말풍선 (손그림 포스트잇 느낌) */}
      <div className="flex items-start gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 flex-shrink-0 border-2 border-slate-700 overflow-hidden"
             style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}>
          <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
        </div>
        <div className="bg-pink-100/60 px-4 py-3 border-2 border-slate-700"
             style={{ borderRadius: '15px 225px 15px 255px/255px 15px 225px 15px', transform: 'rotate(1deg)' }}>
          <p className="text-[13px] font-bold text-slate-800 leading-snug">
            {initialScore <= -3
              ? '루나가 느끼기엔... 지금 많이 힘든 것 같아 🥺'
              : initialScore < 0
              ? '음... 루나가 보기엔 좀 마음이 무거운 것 같은데?'
              : initialScore === 0
              ? '흐음~ 루나가 보기엔 그냥저냥인 것 같은데?'
              : initialScore <= 2
              ? '루나가 느끼기엔 괜찮은 편인 것 같아!'
              : '오~ 루나가 보기엔 지금 기분 좋은 것 같은데!'}
          </p>
          <p className="text-[11px] text-slate-600 mt-1 font-medium">
            틀렸으면 밑에서 직접 골라줘, <span className="text-pink-500 font-bold">루나</span>가 다시 맞출게! 💕
          </p>
        </div>
      </div>

      {/* 감정 선택 영역 (5 낙서 이모지) */}
      <div className="mb-6 relative z-10 px-1">
        <p className="text-[11px] font-bold text-slate-400 text-center mb-3 tracking-tight"
           style={{ transform: 'rotate(-1deg)' }}>
          {isChanged ? '👆 오오 이거구나~!' : '어떤 표정이 제일 가까워? 콕! 눌러줘'}
        </p>

        <div className="flex justify-between items-end relative">
          {HAND_DRAWN_EMOTIONS.map((opt) => {
            const isSelected = score === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelectEmotion(opt.value)}
                disabled={disabled || submitted}
                className="flex flex-col items-center gap-1.5 focus:outline-none relative"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="relative w-[48px] h-[48px] flex items-center justify-center">

                  {/* 동그라미 분홍 선택 (마커펜 느낌) */}
                  {isSelected && (
                    <motion.svg
                      viewBox="0 0 100 100"
                      className="absolute w-[140%] h-[140%] -left-[20%] -top-[20%] overflow-visible z-20"
                    >
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        d="M 50 15 C 80 10, 95 40, 85 75 C 70 95, 30 105, 10 75 C -5 45, 20 5, 50 15 Z M 48 10 C 85 5, 105 50, 80 85 C 55 110, 5 95, 15 60 C 25 30, 45 5, 50 10 Z"
                        fill="none"
                        stroke="#f472b6"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.8"
                      />
                    </motion.svg>
                  )}

                  <motion.div
                    animate={{
                      scale: isSelected ? 1.05 : 0.95,
                      opacity: submitted && !isSelected ? 0.3 : isSelected ? 1 : 0.6,
                      y: isSelected ? -3 : 0
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="z-10 relative"
                  >
                    {opt.svg}
                  </motion.div>
                </div>

                <motion.span
                  animate={{
                    color: isSelected ? '#334155' : '#94a3b8',
                    fontWeight: isSelected ? 800 : 600
                  }}
                  className="text-[10px] whitespace-nowrap z-10"
                >
                  {opt.label}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 액션 버튼 (연필로 칠한 낙서 버튼) */}
      <button
        onClick={handleSubmit}
        disabled={disabled || submitted}
        className={`w-full py-3.5 text-[14px] font-bold transition-all duration-300 relative z-10 ${
          submitted
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300'
            : `bg-pink-400 text-white hover:bg-pink-500 active:scale-[0.98] border-[2.5px] border-slate-700`
        }`}
        style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', transform: 'rotate(0.5deg)' }}
      >
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-1.5"
            >
              <span className="text-slate-500 text-xl font-black">✓</span> 루나가 기억해둘게!
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-1.5"
            >
              {isChanged ? '응 이게 더 맞아!' : '맞아, 완전 이거야!'}
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}
