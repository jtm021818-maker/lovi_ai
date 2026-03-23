import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, ScalingQuestionData } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface ScalingQuestionProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function ScalingQuestion({ event, onSelect, disabled }: ScalingQuestionProps) {
  const data = event.data as unknown as ScalingQuestionData;
  const [score, setScore] = useState(data.currentScore ?? 5);
  const [step, setStep] = useState(1); // 1: 점수 선택, 2: 옵션 선택
  const [submitted, setSubmitted] = useState(false);

  function handleScoreSubmit() {
    if (disabled || submitted) return;
    setStep(2);
  }

  function handleOptionSelect(option: string) {
    if (disabled || submitted) return;
    setSubmitted(true);
    
    // 최종 응답 포맷팅
    const text = `${score}점에서 1점 올리려면... ${option}`;
    onSelect(text, { 
      source: 'scaling_question',
      context: { score, selectedOption: option }
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
      className="bg-white rounded-[20px] shadow-sm border border-purple-100 p-5 my-3 max-w-[90%] mx-auto"
    >
      <div className="flex flex-col items-center text-center mb-5">
        <span className="text-2xl mb-2">📊</span>
        <h4 className="font-bold text-gray-800 text-[15px]">{data.question}</h4>
      </div>
      
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-purple-50/50 rounded-2xl p-4"
          >
            <p className="text-[12px] font-medium text-center text-purple-600 mb-4">현재 스트레스 점수는 몇 점인가요?</p>
            
            <div className="flex justify-between items-center mb-2 px-1 text-xs font-medium text-gray-500">
              <span>{data.minLabel}</span>
              <span className="text-3xl transition-all duration-300 transform scale-110 drop-shadow-sm">{emoji}</span>
              <span>{data.maxLabel}</span>
            </div>
            
            <input 
              type="range" min="0" max="10" step="1"
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value))}
              disabled={disabled || submitted}
              className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 mb-4"
            />
            
            <div className="text-center mb-5">
              <span className="inline-block px-3.5 py-1.5 bg-white rounded-full text-[14px] font-bold text-gray-700 shadow-sm border border-gray-100">
                현재: <span className={`text-transparent bg-clip-text bg-gradient-to-r ${gradientColor}`}>{score}점</span>
              </span>
            </div>

            <button
              onClick={handleScoreSubmit}
              disabled={disabled}
              className={`w-full py-3 rounded-xl font-bold text-[14px] transition-all shadow-md ${
                disabled ? 'bg-gray-100 text-gray-400' : `bg-gradient-to-r ${gradientColor} text-white hover:opacity-90 active:scale-95`
              }`}
            >
              다음 질문 보기
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-2"
          >
            <div className="bg-purple-50/80 p-3 rounded-xl mb-2 border border-purple-100">
              <p className="text-[13px] font-bold text-purple-900 text-center">
                현재 {score}점이시군요.<br/>
                <span className="text-purple-600 font-medium mt-1 inline-block">여기서 딱 1점만 좋아지려면 뭐가 필요할까요?</span>
              </p>
            </div>
            
            {data.options.map((option: string, idx: number) => (
              <motion.button
                key={idx}
                whileTap={!disabled && !submitted ? { scale: 0.96 } : {}}
                onClick={() => handleOptionSelect(option)}
                disabled={disabled || submitted}
                className={`w-full py-3 px-4 rounded-xl text-[13px] font-medium text-left transition-all border outline-none ${
                  submitted 
                    ? 'bg-gray-50 border-gray-100 text-gray-400' 
                    : 'bg-white border-purple-100 text-gray-700 hover:bg-purple-50 hover:border-purple-300 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 text-lg">•</span>
                  <span className="flex-1">{option}</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
