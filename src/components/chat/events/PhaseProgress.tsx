import { motion } from 'framer-motion';
import type { ConversationPhaseV2 } from '@/types/engine.types';

interface PhaseProgressProps {
  currentPhase: ConversationPhaseV2 | null;
  progress: number;
}

const PHASE_STEPS: { id: ConversationPhaseV2; label: string; icon: string }[] = [
  { id: 'HOOK', label: '상황 파악', icon: '🎯' },
  { id: 'MIRROR', label: '패턴 분석', icon: '🪞' },
  { id: 'BRIDGE', label: '원인 찾기', icon: '🌉' },
  { id: 'SOLVE', label: '해결책 준비', icon: '💡' },
  { id: 'EMPOWER', label: '변화 리포트', icon: '🚀' }
];

export default function PhaseProgress({ currentPhase, progress }: PhaseProgressProps) {
  if (!currentPhase) return null;

  const currentIndex = PHASE_STEPS.findIndex(p => p.id === currentPhase);
  if (currentIndex === -1) return null;

  // 전체 진행도 계산 로직
  // 5개 phase가 있으므로 한 phase당 20%
  // 각 phase 내의 progress(0~100)를 전체 게이지 기준으로 환산
  const basePercent = currentIndex * 20;
  const phasePercent = (progress / 100) * 20;
  const totalPercent = Math.min(100, Math.max(0, basePercent + phasePercent));

  return (
    <div className="w-full bg-white/95 backdrop-blur-md px-1 py-2.5 border-b border-gray-100 z-10 sticky top-[60px] shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
      
      {/* 5단계 스텝퍼 영역 (여정 맵) */}
      <div className="flex justify-between items-start w-full px-2 mb-2 relative">
        {/* 진행선 배경 */}
        <div className="absolute left-[10%] right-[10%] top-3 h-[2px] bg-gray-100 z-0 rounded-full" />
        {/* 진행선 활성 (그라디언트) */}
        <motion.div 
          className="absolute left-[10%] top-3 h-[2px] bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 z-0 rounded-full" 
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, totalPercent - 10)}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        />

        {PHASE_STEPS.map((step, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
              <motion.div 
                animate={isCurrent ? { y: [0, -3, 0] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] bg-white transition-all duration-300
                  ${isPast ? 'border-2 border-pink-300 opacity-80' : 
                    isCurrent ? 'border-2 border-pink-500 shadow-[0_2px_8px_rgba(236,72,153,0.3)] scale-110 z-20' : 
                    'border-2 border-gray-100 opacity-40'}
                `}
              >
                {step.icon}
              </motion.div>
              <div className="text-center mt-1 w-full relative">
                <span className={`text-[9px] font-bold block transition-colors duration-300 whitespace-nowrap
                  ${isCurrent ? 'text-pink-600 scale-105' : isPast ? 'text-gray-500' : 'text-gray-300'}
                `}>
                  {step.label}
                </span>
                {isCurrent && (
                  <motion.div 
                    animate={{ opacity: [0.3, 1, 0.3] }} 
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="text-[8px] text-pink-400 font-medium whitespace-nowrap absolute left-1/2 -translate-x-1/2 mt-0.5"
                  >
                    진행중...
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
