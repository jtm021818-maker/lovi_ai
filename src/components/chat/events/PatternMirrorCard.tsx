import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, PatternMirrorData, SuggestionMeta } from '@/types/engine.types';

interface PatternMirrorCardProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function PatternMirrorCard({ event, onSelect, disabled }: PatternMirrorCardProps) {
  const data = event.data as unknown as PatternMirrorData;
  const [submitted, setSubmitted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 컴포넌트 마운트 후 애니메이션 시작 지연
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  function handleChoiceSelect(choice: { label: string; value: string }) {
    if (disabled || submitted) return;
    setSubmitted(true);
    onSelect(choice.label, {
      source: 'pattern_mirror',
      context: { selectedValue: choice.value },
    });
  }

  // K-Casual 스프링 설정
  const springTransition = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }} // overshoot bounce
      className="bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-purple-100/50 p-5 my-4 max-w-[92%] mx-auto overflow-hidden relative"
    >
      {/* 배경 장식 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full blur-3xl -z-10 transform translate-x-10 -translate-y-10" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-200/20 rounded-full blur-2xl -z-10 transform -translate-x-8 translate-y-8" />

      {/* 헤더 */}
      <div className="flex flex-col items-center text-center mb-5">
        <motion.div
          animate={{ rotateY: [0, 15, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-purple-100 to-pink-100 shadow-sm flex items-center justify-center mb-3 border border-purple-50"
        >
          <span className="text-2xl drop-shadow-sm">🪞</span>
        </motion.div>
        <h4 className="font-extrabold text-gray-800 text-[16px] tracking-tight">{data.title}</h4>
      </div>

      {/* EFT 사이클 시각화 (있을 경우 최상단 표출) */}
      {data.cycle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-[18px] p-4 border border-indigo-100/50 relative overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-[13px] font-bold text-indigo-800 bg-white/60 px-2 py-0.5 rounded-md shadow-sm">{data.cycle.myRole}</span>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="text-indigo-400 text-lg opacity-80"
            >
              ♾️
            </motion.div>
            <span className="text-[13px] font-bold text-indigo-800 bg-white/60 px-2 py-0.5 rounded-md shadow-sm">{data.cycle.partnerRole}</span>
          </div>
          <p className="text-[12px] font-medium text-indigo-900/80 text-center leading-relaxed">
            {data.cycle.name}<br/>
            <span className="text-[11px] text-indigo-600/70 mt-1 block">{data.cycle.description}</span>
          </p>
        </motion.div>
      )}

      {/* 패턴 감지 리스트 */}
      <div className="flex flex-col gap-2.5 mb-5">
        {data.patterns?.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={isReady ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 + i * 0.15, ...springTransition }}
            className="bg-white rounded-[16px] p-3.5 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg bg-gray-50 rounded-lg p-1">{p.icon}</span>
                <span className="text-[13px] font-bold text-gray-800">{p.label}</span>
              </div>
              {p.frequency && (
                <span className="text-[10px] font-semibold bg-pink-50 text-pink-500 px-2 py-1 rounded-full border border-pink-100/50">
                  {p.frequency}
                </span>
              )}
            </div>
            
            <p className="text-[12px] text-gray-500 ml-9 mb-2.5 leading-snug">{p.description}</p>
            
            {/* 🆕 성능 최적화: CSS width transition 기반 강도 바 */}
            <div className="ml-9 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-500"
                  initial={{ width: '0%' }}
                  animate={isReady ? { width: `${(p.intensity / 5) * 100}%` } : {}}
                  transition={{ delay: 0.4 + i * 0.15, duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="text-[9px] font-bold text-gray-400 min-w-[32px] text-right">
                {p.intensity}/5
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 인사이트 박스 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-purple-50/50 rounded-[14px] p-3.5 mb-2 text-center"
      >
        <p className="text-[13px] font-bold text-purple-900">
          <span className="mr-1.5">💡</span>
          {data.insight}
        </p>
      </motion.div>

      {/* 🆕 학술 논문/연구 인용 (전문성 어필) */}
      {data.researchBasis && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mb-5 text-center px-2"
        >
          <p className="text-[10px] font-medium text-gray-400/80 leading-snug">
            {data.researchBasis}
          </p>
        </motion.div>
      )}

      {/* 액션 버튼 그룹 */}
      <div className="flex gap-2.5">
        {data.choices?.map((choice, idx) => {
          const isPrimary = idx === 1; // 두 번째 버튼을 강조
          return (
            <motion.button
              key={idx}
              whileTap={!disabled && !submitted ? { scale: 0.96 } : {}}
              onClick={() => handleChoiceSelect(choice)}
              disabled={disabled || submitted}
              className={`flex-1 py-3.5 px-3 rounded-[16px] text-[13px] font-extrabold transition-all outline-none ${
                submitted
                  ? 'bg-gray-50 border-gray-100 text-gray-400'
                  : isPrimary
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg'
                  : 'bg-white border-2 border-purple-100 text-purple-600 hover:bg-purple-50'
              }`}
              style={!submitted && isPrimary ? { textShadow: '0 1px 2px rgba(0,0,0,0.1)' } : undefined}
            >
              {choice.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
