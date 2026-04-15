'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * v48: 루나 재시도 UI
 *
 * 캐스케이드 폴백 시 "루나가 다시 생각하는 중" 느낌의 예쁜 UI
 * - 재시도 메시지 순차 등장 (카톡 말풍선 스타일)
 * - 시도 횟수 프로그레스 표시 (점 인디케이터)
 * - 자동 사라짐: done=true 시 fade out
 */

interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  message: string;
  reason: string;
}

interface LunaRetryingProps {
  /** 현재까지의 재시도 히스토리 */
  retries: RetryInfo[];
  /** 완료 (성공 or 최종 실패) — fade out */
  done?: boolean;
}

export default function LunaRetrying({ retries, done = false }: LunaRetryingProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  // 새 재시도가 추가되면 순차 표시
  useEffect(() => {
    if (done) return;
    if (visibleCount >= retries.length) return;

    const timer = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + 1, retries.length));
    }, visibleCount === 0 ? 150 : 400);

    return () => clearTimeout(timer);
  }, [visibleCount, retries.length, done]);

  // retries 배열이 늘어나면 visibleCount 갱신 트리거
  useEffect(() => {
    if (retries.length > visibleCount) {
      const timer = setTimeout(() => {
        setVisibleCount((c) => Math.min(c + 1, retries.length));
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [retries.length, visibleCount]);

  if (retries.length === 0) return null;

  const latest = retries[retries.length - 1];

  return (
    <AnimatePresence mode="wait">
      {!done && (
        <motion.div
          key="luna-retrying"
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.35 } }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="mx-4 my-3"
        >
          <div className="flex items-start gap-2.5">
            {/* 루나 아바타 — 약간 당황한 표정 + 흔들림 */}
            <div className="relative flex-shrink-0">
              <motion.div
                animate={{ rotate: [0, -5, 5, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-10 h-10 border-2 border-purple-300 overflow-hidden bg-white shadow-md"
                style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
              >
                <img
                  src="/char_img/luna_1_event.png"
                  alt="루나 재시도 중"
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* 재시도 아이콘 */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-1.5 -right-1.5 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-purple-200"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M10 6A4 4 0 1 1 6 2"
                    stroke="#a855f7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path d="M6 0.5L7.5 2L6 3.5" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            </div>

            {/* 말풍선 스택 */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <AnimatePresence>
                {retries.slice(0, visibleCount).map((retry, idx) => (
                  <motion.div
                    key={`retry-${idx}`}
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    className="inline-block max-w-[85%]"
                  >
                    <div
                      className="relative px-3.5 py-2 rounded-2xl text-[13px] font-medium shadow-sm"
                      style={{
                        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        color: '#6b21a8',
                      }}
                    >
                      <span>{retry.message}</span>

                      {/* 마지막 메시지에 타이핑 인디케이터 */}
                      {idx === visibleCount - 1 && (
                        <span className="inline-flex items-center gap-0.5 ml-1.5 align-middle">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              animate={{
                                opacity: [0.3, 1, 0.3],
                                y: [0, -2, 0],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.15,
                              }}
                              className="inline-block w-1 h-1 rounded-full bg-purple-400"
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 시도 횟수 프로그레스 (점 인디케이터) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-1.5 pt-0.5 pl-1"
              >
                {Array.from({ length: latest.maxAttempts }).map((_, i) => (
                  <motion.div
                    key={`dot-${i}`}
                    initial={{ scale: 0 }}
                    animate={{
                      scale: 1,
                      backgroundColor: i < latest.attempt
                        ? '#a855f7'  // 시도 완료 = 보라
                        : '#e9d5ff', // 미시도 = 연보라
                    }}
                    transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
                    className="w-2 h-2 rounded-full"
                  />
                ))}
                <span className="text-[10px] text-purple-400 ml-1">
                  {latest.attempt}/{latest.maxAttempts}
                </span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
