'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { XRayResult } from '@/app/api/xray/analyze/route';

interface XRayInlineCardProps {
  result: XRayResult;
}

export default function XRayInlineCard({ result }: XRayInlineCardProps) {
  const router = useRouter();

  const scoreColor =
    result.reconciliationScore >= 70 ? 'text-green-600' :
    result.reconciliationScore >= 40 ? 'text-yellow-600' :
    'text-red-500';

  const handleDetail = () => {
    sessionStorage.setItem('xray-result', JSON.stringify(result));
    router.push('/xray');
  };

  const handleSimulate = () => {
    sessionStorage.setItem('xray-result', JSON.stringify(result));
    router.push('/xray/simulate');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="bg-white rounded-2xl border border-purple-100 shadow-md overflow-hidden my-3 max-w-[88%]"
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔬</span>
          <span className="text-xs font-bold text-purple-700">카톡 엑스레이 완료</span>
        </div>
        <span className={`text-sm font-black ${scoreColor}`}>{result.reconciliationScore}%</span>
      </div>

      {/* 썸네일 + 핵심 분석 */}
      <div className="px-4 py-3 flex gap-3">
        <img
          src={result.imageBase64}
          alt="캡처"
          className="w-16 h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 line-clamp-2 mb-1.5">{result.keyInsight}</p>
          <p className="text-[11px] text-pink-600 italic line-clamp-1">💬 "{result.suggestedResponse}"</p>
        </div>
      </div>

      {/* 버튼 */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={handleDetail}
          className="flex-1 py-2 rounded-lg border border-purple-200 text-xs font-bold text-purple-600 hover:bg-purple-50 transition-colors"
        >
          자세히 보기
        </button>
        <button
          onClick={handleSimulate}
          className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold text-white"
        >
          🎭 연습하기
        </button>
      </div>
    </motion.div>
  );
}
