import { motion } from 'framer-motion';
import type { PhaseEvent, InsightCardData } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface InsightCardProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function InsightCard({ event, onSelect, disabled }: InsightCardProps) {
  const data = event.data as unknown as InsightCardData;
  const isReadAndIgnored = data.scenario === '읽씹 상황';
  
  // 상황에 따른 색상 테마 결정 (K-Casual)
  const themeAccent = isReadAndIgnored ? 'from-blue-500 to-indigo-500' : 'from-pink-500 to-purple-500';
  const bgLight = isReadAndIgnored ? 'bg-blue-50/50' : 'bg-pink-50/50';
  const borderLight = isReadAndIgnored ? 'border-blue-100' : 'border-pink-100';
  const textDark = isReadAndIgnored ? 'text-blue-900' : 'text-pink-900';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`w-full max-w-[90%] my-3 p-0.5 rounded-[20px] bg-gradient-to-br ${themeAccent} shadow-md overflow-hidden`}
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-[18px] p-5 h-full">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${themeAccent} flex items-center justify-center text-white shadow-sm`}>
            {isReadAndIgnored ? '📱' : '💡'}
          </div>
          <div>
            <h4 className={`font-bold text-[14px] ${textDark}`}>{data.title}</h4>
            <p className="text-[11px] font-medium text-gray-400">마음이가 파악한 정보</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {/* 상황 요약 */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className={`flex flex-col gap-1 p-3 rounded-xl ${bgLight} border ${borderLight}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-gray-700">📍 현재 상황</span>
              <span className="text-[11px] font-semibold bg-white px-2 py-0.5 rounded-md shadow-sm border border-gray-100">
                {data.scenario}
              </span>
            </div>
            {data.duration && (
              <p className="text-[12px] text-gray-600 pl-1 mt-1">🕒 <span className="font-semibold text-gray-800">{data.duration}째</span> 지속 중</p>
            )}
            {data.pattern && (
              <p className="text-[12px] text-gray-600 pl-1">🔄 반복 패턴: <span className="font-medium text-gray-800">{data.pattern}</span></p>
            )}
          </motion.div>

          {/* 감정 분석 */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className={`flex flex-col gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100`}
          >
            <div className="flex items-start gap-2">
              <span className="text-[12px] font-bold text-gray-700 mt-0.5">💔 핵심 감정</span>
              <div className="flex flex-wrap gap-1.5">
                {data.emotions.map((emotion: string, i: number) => (
                  <span key={i} className="text-[11px] font-semibold text-purple-700 bg-purple-100/50 px-2 py-0.5 rounded-full border border-purple-200">
                    {emotion}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 핵심 인사이트 */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="mt-1"
          >
            <div className={`p-3 rounded-xl border-l-4 border-l-purple-400 bg-purple-50 flex items-start gap-2`}>
              <span className="mt-0.5 text-[14px]">✨</span>
              <p className="text-[13px] font-medium text-gray-800 leading-snug">
                {data.insight}
              </p>
            </div>
          </motion.div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => !disabled && onSelect("조금 더 자세히 말해줄게", { source: 'insight_card' })}
            disabled={disabled}
            className={`flex-[3] py-2.5 rounded-xl font-semibold text-[13px] transition-all border ${
              disabled ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-[0.98]'
            }`}
          >
            더 얘기할게
          </button>
          <button
            onClick={() => !disabled && onSelect("맞아, 네 말이 정확해!", { source: 'insight_card' })}
            disabled={disabled}
            className={`flex-[4] py-2.5 rounded-xl font-semibold text-[13px] transition-all shadow-sm ${
              disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : `bg-gradient-to-r ${themeAccent} text-white hover:opacity-90 active:scale-[0.98]`
            }`}
          >
            맞아, 딱 내 마음이야!
          </button>
        </div>
      </div>
    </motion.div>
  );
}
