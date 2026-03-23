import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SolutionPreviewData } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface SolutionPreviewProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function SolutionPreview({ event, onSelect, disabled }: SolutionPreviewProps) {
  const data = event.data as unknown as SolutionPreviewData;
  const [isRevealed, setIsRevealed] = useState(false);

  function handleReveal() {
    if (disabled) return;
    setIsRevealed(true);
    
    // 약간의 딜레이 후 실제로 다음 단계로 넘어가도록 트리거
    setTimeout(() => {
      onSelect("응, 어떤 해결책인지 알려줘!", { source: 'solution_preview' });
    }, 800);
  }

  function handleDelay() {
    if (disabled) return;
    onSelect("아직은 좀 더 내 얘기를 하고 싶어", { source: 'solution_preview_delay' });
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="w-full max-w-[90%] my-3 p-[2px] rounded-[24px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg overflow-hidden relative"
    >
      {/* 반짝이는 배경 애니메이션 효과 */}
      <motion.div 
        animate={{ 
          backgroundPosition: ['0% 0%', '100% 100%'],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4"
      />

      <div className="bg-white/95 backdrop-blur-xl rounded-[22px] p-6 relative z-10">
        <div className="flex flex-col items-center text-center mb-5">
          <motion.div 
            animate={isRevealed ? { scale: [1, 1.2, 1], rotate: [0, 360] } : { y: [0, -4, 0] }}
            transition={{ duration: isRevealed ? 0.6 : 2, repeat: isRevealed ? 0 : Infinity }}
            className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner border border-white"
          >
            🔮
          </motion.div>
          <h4 className="font-bold text-gray-800 text-[16px]">{data.title}</h4>
          <p className="text-[12px] text-gray-500 mt-1">상황 분석 및 심리학 프레임워크 매칭 완료</p>
        </div>

        <div className="space-y-2 mb-6">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-2 text-[13px] text-gray-700 font-medium">
            <span className="text-green-500 text-base">✅</span> 맞춤형 전략 <span className="text-purple-600 font-bold">{data.strategyCount}개</span> 준비됨
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-2 text-[13px] text-gray-700 font-medium">
            <span className="text-green-500 text-base">✅</span> 마음을 전달할 <span className="text-pink-600 font-bold">카톡 초안</span> 포함
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div key="buttons" initial={{ opacity: 1 }} exit={{ opacity: 0, y: 10 }} className="flex flex-col gap-2">
              <button
                onClick={handleReveal}
                disabled={disabled}
                className="w-full py-3.5 rounded-xl font-bold text-[14px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98] relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>해결책 확인하기</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </span>
                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              </button>
              
              <button
                onClick={handleDelay}
                disabled={disabled}
                className="w-full py-2 rounded-xl text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                아직은 좀 더 내 얘기를 할래
              </button>
            </motion.div>
          ) : (
            <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-4 flex flex-col items-center justify-center">
              <div className="flex gap-1.5 mb-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -8, 0], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    className="w-2.5 h-2.5 bg-purple-500 rounded-full"
                  />
                ))}
              </div>
              <span className="text-[12px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse">
                솔루션을 준비하고 있어요...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
