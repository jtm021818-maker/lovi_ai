import { motion } from 'framer-motion';
import type { PhaseEvent, GrowthReportData } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface GrowthReportProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function GrowthReport({ event, onSelect, disabled }: GrowthReportProps) {
  const data = event.data as unknown as GrowthReportData;
  const isPositiveGrowth = data.pointDifference >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.2 }}
      className="w-full max-w-[90%] my-4 p-[3px] rounded-[24px] bg-gradient-to-br from-green-400 via-teal-500 to-emerald-500 shadow-xl overflow-hidden mx-auto"
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-[21px] p-6 h-full relative overflow-hidden">
        
        {/* 장식용 배경 요소 */}
        <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-green-100/50 rounded-full blur-3xl z-0" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[120px] h-[120px] bg-teal-100/40 rounded-full blur-2xl z-0" />
        
        <div className="relative z-10">
          <div className="flex flex-col items-center text-center border-b border-gray-100 pb-5 mb-5">
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}
              className="w-14 h-14 bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-sm border border-white rotate-3"
            >
              📈
            </motion.div>
            <h4 className="font-bold text-gray-800 text-[18px] tracking-tight">{data.title}</h4>
            <p className="text-[12px] font-medium text-gray-400 mt-1">오늘 대화에서 우리가 만들어낸 변화예요</p>
          </div>

          {/* 감정 변화 (Before / After) */}
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-5 relative">
            <div className="flex flex-col items-center flex-1">
              <span className="text-[11px] font-bold text-gray-400 mb-1">처음 시작할 때</span>
              <span className="text-3xl mb-1 grayscale opacity-60">
                {data.beforeScore <= -2 ? '😰' : data.beforeScore <= 1 ? '😐' : '🙂'}
              </span>
              <span className="text-[14px] font-bold text-gray-600">{data.beforeScore > 0 ? `+${data.beforeScore}` : data.beforeScore}점</span>
            </div>
            
            <div className="flex flex-col items-center justify-center px-2">
              <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 z-10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
              <div className="absolute top-1/2 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-gray-200 to-green-300 -translate-y-1/2 z-0" />
            </div>

            <div className="flex flex-col items-center flex-1">
              <span className="text-[11px] font-bold text-teal-600 mb-1">지금 내 마음</span>
              <motion.span 
                initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.8, bounce: 0.5 }}
                className="text-3xl mb-1"
              >
                {data.afterScore >= 2 ? '😊' : data.afterScore >= -1 ? '🙂' : '😐'}
              </motion.span>
              <span className="text-[14px] font-bold text-teal-600">{data.afterScore > 0 ? `+${data.afterScore}` : data.afterScore}점</span>
            </div>
          </div>

          {/* 주요 발견 및 계획 */}
          <div className="space-y-3 mb-6">
            <div className="bg-teal-50/50 rounded-xl p-3 border border-teal-100/50">
              <h5 className="text-[12px] font-bold text-teal-800 flex items-center gap-1.5 mb-2">
                <span className="text-sm">✨</span> 오늘 우리가 알게 된 것
              </h5>
              <ul className="space-y-1.5 pl-1">
                {data.keyDiscoveries.map((item, idx) => (
                  <motion.li key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + Math.min(idx * 0.1, 0.4) }} className="text-[12px] text-gray-700 flex items-start gap-1.5">
                    <span className="text-teal-400 font-black mt-[1px]">·</span>
                    <span className="leading-snug">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {data.actionPlan && data.actionPlan.length > 0 && (
              <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50">
                <h5 className="text-[12px] font-bold text-emerald-800 flex items-center gap-1.5 mb-2">
                  <span className="text-sm">💪</span> 앞으로 해볼 작은 행동
                </h5>
                <ul className="space-y-1.5 pl-1">
                  {data.actionPlan.map((item, idx) => (
                    <motion.li key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + Math.min(idx * 0.1, 0.4) }} className="text-[12px] text-gray-700 flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-[1px]">✓</span>
                      <span className="leading-snug">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => !disabled && onSelect("내일 결과 알려주러 다시 올게!", { source: 'growth_report_promise' })}
              disabled={disabled}
              className={`w-full py-3.5 rounded-xl font-bold text-[14px] transition-all shadow-md ${
                disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-teal-500 text-white hover:shadow-lg active:scale-[0.98]'
              }`}
            >
              내일 또 올게 고마워!
            </button>
            <button
              onClick={() => !disabled && onSelect("아직 더 물어볼 게 남았어", { source: 'growth_report_continue' })}
              disabled={disabled}
              className={`w-full py-2.5 rounded-xl font-medium text-[12px] transition-all border ${
                disabled ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-[0.98]'
              }`}
            >
              대화 계속하기
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
