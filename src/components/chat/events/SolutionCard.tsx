import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SolutionCardData } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface SolutionCardProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function SolutionCard({ event, onSelect, disabled }: SolutionCardProps) {
  const data = event.data as unknown as SolutionCardData;
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  function handleDraftRequest() {
    if (disabled) return;
    onSelect("카톡 어떻게 보내면 좋을지 초안 짜줄래?", { source: 'solution_card_draft' });
  }

  function handleOtherRequest() {
    if (disabled) return;
    onSelect("다른 방법도 생각해볼래", { source: 'solution_card_other' });
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-full max-w-[90%] my-3 p-0.5 rounded-[20px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md overflow-hidden"
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-[18px] p-5 h-full">
        {/* 헤더 */}
        <div className="flex flex-col mb-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm text-sm">
              💡
            </div>
            <div>
              <h4 className="font-bold text-[15px] text-gray-800">{data.title}</h4>
              <p className="text-[11px] font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                {data.frameworkName}
              </p>
            </div>
          </div>
        </div>

        {/* 3단계 전략 리스트 */}
        <div className="space-y-2.5 mb-5 relative">
          {/* 세로 연결선 (좌측 인디케이터용) */}
          <div className="absolute left-[13px] top-6 bottom-4 w-0.5 bg-gray-100 z-0" />
          
          {data.steps.map((step, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.1 * idx }}
                className="relative z-10"
              >
                <div 
                  className={`flex flex-col gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                    isExpanded 
                      ? 'bg-purple-50/80 border-purple-200' 
                      : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                  onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
                >
                  <div className="flex items-start gap-3">
                    {/* 번호 인디케이터 */}
                    <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-bold text-[12px] transition-colors ${
                      isExpanded 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 mt-0.5">
                      <h5 className={`font-bold text-[13px] transition-colors ${isExpanded ? 'text-purple-900' : 'text-gray-700'}`}>
                        {step.name}
                      </h5>
                      <p className={`text-[12px] mt-1 line-clamp-2 transition-colors ${isExpanded ? 'text-purple-700' : 'text-gray-500'}`}>
                        {step.description}
                      </p>
                    </div>
                    
                    {/* 확장 토글 아이콘 */}
                    <div className="mt-1">
                      <motion.svg 
                        animate={{ rotate: isExpanded ? 180 : 0 }} 
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isExpanded ? "#d8b4fe" : "#d1d5db"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </motion.svg>
                    </div>
                  </div>
                  
                  {/* 확장 콘텐츠 (구체적 행동/예시) */}
                  <AnimatePresence>
                    {isExpanded && step.action && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 ml-10 p-2.5 bg-white rounded-lg border border-purple-100 shadow-sm relative">
                          <div className="absolute top-0 left-0 w-1 h-full bg-purple-400 rounded-l-lg" />
                          <p className="text-[12px] font-medium text-gray-700 leading-snug">
                            <span className="text-purple-600 font-bold block mb-1">💡 이렇게 해보세요</span>
                            {step.action}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {/* 이론적 근거 */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="flex items-start gap-2 text-[11px] text-gray-400 mb-5 pl-1"
        >
          <span className="text-base leading-none">📖</span>
          <p>
            <strong className="text-gray-500">근거:</strong> {data.rationale}
          </p>
        </motion.div>

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-2">
          {data.hasDraft && (
            <button
              onClick={handleDraftRequest}
              disabled={disabled}
              className={`w-full py-3 rounded-xl font-bold text-[13px] transition-all shadow-sm ${
                disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 active:scale-[0.98]'
              }`}
            >
              💬 이 전략대로 카톡 써볼래
            </button>
          )}
          <button
            onClick={handleOtherRequest}
            disabled={disabled}
            className={`w-full py-2.5 rounded-xl font-medium text-[12px] transition-all border ${
              disabled ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-[0.98]'
            }`}
          >
            이거 말고 다른 방법은 없어?
          </button>
        </div>
      </div>
    </motion.div>
  );
}
