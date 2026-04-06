'use client';

import { motion } from 'framer-motion';

interface XRayResultCardProps {
  overallAnalysis: string;
  keyInsight: string;
  suggestedResponse: string;
  reconciliationScore: number;
  onSimulate?: () => void;
}

export default function XRayResultCard({
  overallAnalysis,
  keyInsight,
  suggestedResponse,
  reconciliationScore,
  onSimulate,
}: XRayResultCardProps) {
  const scoreColor =
    reconciliationScore >= 70 ? 'text-green-600' :
    reconciliationScore >= 40 ? 'text-yellow-600' :
    'text-red-500';

  const scoreBarColor =
    reconciliationScore >= 70 ? 'bg-green-400' :
    reconciliationScore >= 40 ? 'bg-yellow-400' :
    'bg-red-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
      className="bg-white rounded-2xl border border-pink-100 shadow-lg overflow-hidden"
    >
      {/* 화해 확률 헤더 */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500">화해 가능성</span>
          <span className={`text-2xl font-black ${scoreColor}`}>{reconciliationScore}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${reconciliationScore}%` }}
            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${scoreBarColor}`}
          />
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* 전체 분석 */}
        <div>
          <h3 className="text-xs font-bold text-purple-600 mb-1.5">🔬 루나의 분석</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{overallAnalysis}</p>
        </div>

        {/* 핵심 인사이트 */}
        <div className="bg-purple-50 rounded-xl p-3.5">
          <h3 className="text-xs font-bold text-purple-700 mb-1.5">💡 핵심 발견</h3>
          <p className="text-sm text-purple-900 leading-relaxed font-medium">{keyInsight}</p>
        </div>

        {/* 추천 대응 */}
        <div className="bg-pink-50 rounded-xl p-3.5">
          <h3 className="text-xs font-bold text-pink-600 mb-1.5">💬 이렇게 답해보는 건 어때?</h3>
          <p className="text-sm text-pink-900 leading-relaxed italic">"{suggestedResponse}"</p>
        </div>

        {/* 시뮬레이션 버튼 */}
        {onSimulate && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onSimulate}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 text-white font-bold text-sm shadow-lg shadow-pink-200/50"
          >
            🎭 연습해볼래? 내가 상대방 해줄게
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
