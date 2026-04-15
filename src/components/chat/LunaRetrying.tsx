'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * v51: 루나 재시도 로딩 UI — 고퀄 시네마 스타일
 *
 * 캐스케이드 폴백 시 "루나가 열심히 생각하는 중" 프리미엄 로딩 UX
 * - 물결 프로그레스 바 + 글로우 효과
 * - 루나 캐릭터 애니메이션 (사고중 모션)
 * - 재시도 단계별 시각 피드백
 * - 메시지 타이프라이터 등장
 */

interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  message: string;
  reason: string;
}

interface LunaRetryingProps {
  retries: RetryInfo[];
  done?: boolean;
}

export default function LunaRetrying({ retries, done = false }: LunaRetryingProps) {
  const [visibleIdx, setVisibleIdx] = useState(-1);

  // 새 재시도 순차 표시
  useEffect(() => {
    if (done || visibleIdx >= retries.length - 1) return;
    const timer = setTimeout(() => setVisibleIdx((i) => i + 1), visibleIdx < 0 ? 100 : 500);
    return () => clearTimeout(timer);
  }, [visibleIdx, retries.length, done]);

  useEffect(() => {
    if (retries.length - 1 > visibleIdx) {
      const timer = setTimeout(() => setVisibleIdx((i) => i + 1), 500);
      return () => clearTimeout(timer);
    }
  }, [retries.length, visibleIdx]);

  if (retries.length === 0) return null;

  const latest = retries[retries.length - 1];
  const progress = latest.attempt / latest.maxAttempts;

  return (
    <AnimatePresence mode="wait">
      {!done && (
        <motion.div
          key="luna-retrying"
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.4 } }}
          transition={{ type: 'spring', damping: 20, stiffness: 250 }}
          className="mx-3 my-3"
        >
          {/* 메인 카드 */}
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #1a0a2e 0%, #16082a 50%, #0f0520 100%)',
              border: '1px solid rgba(168,85,247,0.2)',
              boxShadow: '0 8px 32px rgba(88,28,135,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* 배경 글로우 애니메이션 */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)' }}
            />

            <div className="relative z-10 p-4">
              {/* 상단: 루나 + 상태 */}
              <div className="flex items-center gap-3 mb-3">
                {/* 루나 아바타 — 생각 중 애니메이션 */}
                <div className="relative flex-shrink-0">
                  <motion.div
                    animate={{ rotate: [0, -3, 3, -2, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-11 h-11 rounded-full overflow-hidden border-2 border-purple-400/40 shadow-lg"
                    style={{ boxShadow: '0 0 16px rgba(168,85,247,0.3)' }}
                  >
                    <img
                      src="/char_img/luna_1_event.png"
                      alt="루나"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>

                  {/* 회전 로딩 링 */}
                  <motion.svg
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute -inset-1"
                    viewBox="0 0 52 52"
                  >
                    <circle
                      cx="26" cy="26" r="24"
                      fill="none"
                      stroke="url(#retryGrad)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeDasharray="40 110"
                    />
                    <defs>
                      <linearGradient id="retryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-bold text-white/90">루나가 준비하는 중</span>
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-[10px] text-purple-300/70"
                    >
                      thinking...
                    </motion.span>
                  </div>

                  {/* 프로그레스 바 */}
                  <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                    <motion.div
                      className="h-full rounded-full relative"
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.max(progress * 100, 15)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{
                        background: 'linear-gradient(90deg, #a855f7, #ec4899, #f59e0b)',
                      }}
                    >
                      {/* 쉬머 효과 */}
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                          width: '50%',
                        }}
                      />
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* 재시도 메시지 — 말풍선 스택 */}
              <div className="space-y-1.5 mb-2.5">
                <AnimatePresence>
                  {retries.slice(0, visibleIdx + 1).map((retry, idx) => (
                    <motion.div
                      key={`retry-${idx}`}
                      initial={{ opacity: 0, x: -8, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    >
                      <div
                        className="inline-block px-3.5 py-2 rounded-2xl rounded-tl-sm text-[13px] font-medium"
                        style={{
                          background: idx === visibleIdx
                            ? 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.1))'
                            : 'rgba(255,255,255,0.05)',
                          border: idx === visibleIdx
                            ? '1px solid rgba(168,85,247,0.25)'
                            : '1px solid rgba(255,255,255,0.05)',
                          color: idx === visibleIdx ? '#e9d5ff' : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {retry.message}

                        {/* 마지막에 타이핑 점 */}
                        {idx === visibleIdx && (
                          <span className="inline-flex items-center gap-[3px] ml-2 align-middle">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                                className="inline-block w-[3px] h-[3px] rounded-full bg-purple-300"
                              />
                            ))}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* 하단: 시도 횟수 + 상태 */}
              <div className="flex items-center justify-between">
                {/* 단계 인디케이터 */}
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: latest.maxAttempts }).map((_, i) => (
                    <motion.div
                      key={`step-${i}`}
                      initial={{ scale: 0 }}
                      animate={{
                        scale: 1,
                        backgroundColor: i < latest.attempt ? '#a855f7' : 'rgba(255,255,255,0.1)',
                        boxShadow: i < latest.attempt ? '0 0 8px rgba(168,85,247,0.4)' : 'none',
                      }}
                      transition={{ delay: i * 0.08, type: 'spring', stiffness: 300 }}
                      className="w-2 h-2 rounded-full"
                    />
                  ))}
                  <span className="text-[10px] text-white/30 ml-1 font-mono">
                    {latest.attempt}/{latest.maxAttempts}
                  </span>
                </div>

                {/* 상태 뱃지 */}
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.15)' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[9px] text-purple-300/70 font-medium">
                    {latest.reason === 'rate_limit' ? '한도 조정 중' : latest.reason === 'timeout' ? '응답 대기 중' : '모델 전환 중'}
                  </span>
                </motion.div>
              </div>
            </div>

            {/* 하단 글로우 라인 */}
            <motion.div
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="h-[2px]"
              style={{
                background: 'linear-gradient(90deg, transparent, #a855f7, #ec4899, #a855f7, transparent)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
