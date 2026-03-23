import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface EmotionThermometerProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function EmotionThermometer({ event, onSelect, disabled }: EmotionThermometerProps) {
  // 🆕 v10: AI 자체 판단 점수를 초기값으로 사용
  const aiScore = (event.data as any).aiAssessedScore ?? 5;
  const aiLabel = (event.data as any).aiEmotionLabel || '복잡한 감정';
  const basis = (event.data as any).assessmentBasis || '대화를 분석했어요';
  
  const [score, setScore] = useState(aiScore); // AI 판단 점수가 초기값!
  const [submitted, setSubmitted] = useState(false);
  const [adjusted, setAdjusted] = useState(false); // 유저가 조정했는지

  const minLabel = (event.data as any).minLabel || '최악';
  const maxLabel = (event.data as any).maxLabel || '최고';

  const isChanged = score !== aiScore;

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newScore = parseInt(e.target.value);
    setScore(newScore);
    if (newScore !== aiScore) setAdjusted(true);
  }

  function handleSubmit() {
    if (disabled || submitted) return;
    setSubmitted(true);
    
    // 유저가 조정했는지에 따라 다른 메시지
    let text: string;
    if (!isChanged) {
      text = `맞아, 지금 내 감정은 ${score}점 정도인 것 같아.`;
    } else {
      const diff = score - aiScore;
      const direction = diff > 0 ? '좀 더 괜찮은' : '좀 더 힘든';
      text = `사실 ${direction} 편이야. ${score}점 정도인 것 같아.`;
    }

    onSelect(text, { 
      source: 'emotion_thermometer',
      context: { 
        score, 
        aiAssessedScore: aiScore,
        wasAdjusted: isChanged,
        adjustment: score - aiScore 
      }
    });
  }

  const gradientColor = 
    score <= 3 ? 'from-indigo-400 to-blue-500' :
    score <= 6 ? 'from-purple-400 to-pink-500' :
    'from-rose-400 to-orange-400';

  const emoji = score <= 2 ? '😰' : score <= 4 ? '😥' : score <= 6 ? '😐' : score <= 8 ? '🙂' : '😊';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 my-2 max-w-[85%] ml-auto"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🌡️</span>
        <h4 className="font-semibold text-gray-800 text-[14px]">감정 온도계</h4>
      </div>
      
      {/* 🆕 AI 판단 표시 */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 mb-3 border border-pink-100/50"
      >
        <p className="text-[12px] text-gray-500 mb-1">💭 대화를 분석해봤어</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-gray-700">
              &quot;{aiLabel}&quot;
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{basis}</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl">{score <= 2 ? '😰' : score <= 4 ? '😥' : score <= 6 ? '😐' : score <= 8 ? '🙂' : '😊'}</span>
            <span className={`text-[13px] font-bold text-transparent bg-clip-text bg-gradient-to-r ${gradientColor}`}>
              {aiScore}점
            </span>
          </div>
        </div>
      </motion.div>

      {/* 슬라이더 (유저 조정용) */}
      <div className="bg-gray-50 rounded-xl p-4 mb-3">
        <p className="text-[12px] text-gray-500 text-center mb-2">
          {isChanged ? '👆 조정됨!' : '맞으면 그대로, 다르면 조절해줘'}
        </p>
        
        <div className="flex justify-between items-center mb-2 px-1 text-xs font-medium text-gray-500">
          <span>{minLabel}</span>
          <span className="text-2xl transition-all duration-300 transform scale-110">{emoji}</span>
          <span>{maxLabel}</span>
        </div>
        
        <input 
          type="range" 
          min="0" 
          max="10" 
          step="1"
          value={score}
          onChange={handleSliderChange}
          disabled={disabled || submitted}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
        />
        
        <div className="text-center mt-3">
          <AnimatePresence mode="wait">
            <motion.span 
              key={score}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="inline-block px-3 py-1 bg-white rounded-full text-[13px] font-bold text-gray-700 shadow-sm border border-gray-100"
            >
              {isChanged ? (
                <>
                  <span className="text-gray-400 line-through mr-1">{aiScore}점</span>
                  <span className="mx-1">→</span>
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${gradientColor}`}>{score}점</span>
                </>
              ) : (
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${gradientColor}`}>{score}점</span>
              )}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      
      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={disabled || submitted}
        className={`w-full py-2.5 rounded-xl font-semibold text-[13px] transition-all shadow-sm ${
          submitted 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : `bg-gradient-to-r ${gradientColor} text-white hover:opacity-90 active:scale-[0.98]`
        }`}
      >
        {submitted 
          ? '전송 완료' 
          : isChanged 
            ? `${score}점으로 조정해서 보내기` 
            : '맞아, 이대로 보내기'
        }
      </button>
    </motion.div>
  );
}
