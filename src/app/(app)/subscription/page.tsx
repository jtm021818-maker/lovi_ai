'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

const FREE = SUBSCRIPTION_PLANS.free;
const PRO = SUBSCRIPTION_PLANS.premium;

const COMPARISON = [
  { label: '일일 상담', free: `${FREE.dailyChatLimit}회`, premium: '무제한' },
  { label: 'AI 음성 (루나 보이스)', free: '—', premium: '✓' },
  { label: 'XRay 분석', free: `${FREE.dailyXrayLimit}회/일`, premium: '무제한' },
  { label: 'XRay 시뮬레이션', free: '—', premium: '✓' },
  { label: '인사이트', free: '기본', premium: '전체' },
  { label: '상담 전략', free: '공감/지지', premium: '전체 (CBT, ACT, MI)' },
  { label: '세션 히스토리', free: '최근 3개', premium: '전체' },
];

export default function SubscriptionPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-28">
        {/* 헤더 */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500" />
          <div className="relative px-6 pt-14 pb-8 text-white text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-4xl">🦊</span>
            </motion.div>
            <h1 className="text-2xl font-bold">Love AI Premium</h1>
            <p className="text-purple-100 text-sm mt-2">루나와 더 깊은 대화를 시작해보세요</p>
          </div>
        </div>

        {/* 가격 카드 */}
        <div className="px-4 -mt-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-purple-100"
          >
            <div className="flex items-end justify-center gap-1 mb-1">
              <span className="text-4xl font-bold text-gray-800">
                {PRO.priceMonthly.toLocaleString()}
              </span>
              <span className="text-gray-400 text-sm pb-1">원/월</span>
            </div>
            <p className="text-center text-xs text-gray-400 mb-5">
              연간 결제 시 {PRO.priceYearly.toLocaleString()}원 ({Math.round(PRO.priceYearly / 12).toLocaleString()}원/월)
            </p>

            {/* 프리미엄 혜택 리스트 */}
            <div className="space-y-3 mb-6">
              {PRO.features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-500 text-xs">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">{f}</span>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => alert('결제 시스템 준비 중입니다. 곧 만나요!')}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform"
            >
              프리미엄 시작하기
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-2">
              언제든 해지 가능 · 7일 무료 체험
            </p>
          </motion.div>
        </div>

        {/* 비교 테이블 */}
        <div className="px-4 mt-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3 px-1">무료 vs 프리미엄</h2>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            {/* 헤더 */}
            <div className="grid grid-cols-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-xs text-gray-400">기능</span>
              <span className="text-xs text-gray-400 text-center">Free</span>
              <span className="text-xs text-purple-500 text-center font-medium">Premium</span>
            </div>
            {/* 행 */}
            {COMPARISON.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 px-4 py-3 ${i < COMPARISON.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <span className="text-xs text-gray-600">{row.label}</span>
                <span className="text-xs text-gray-400 text-center">{row.free}</span>
                <span className="text-xs text-purple-600 text-center font-medium">{row.premium}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 루나 코멘트 */}
        <div className="px-4 mt-6 mb-4">
          <div className="rounded-3xl bg-purple-50 p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🦊</span>
              <div>
                <p className="text-sm text-purple-700 font-medium">루나의 한마디</p>
                <p className="text-sm text-purple-600 mt-1">
                  &ldquo;프리미엄이면 내 목소리도 들을 수 있고,
                  카톡 분석도 무제한이야.
                  네 연애를 더 깊이 함께할 수 있어!&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
