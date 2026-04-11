'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🆕 v40: 💭 루나가 "진짜 고민하는 중" 로딩 UI
 *
 * 핵심 철학:
 *   - 하드코딩 "숨은 도구상자" ❌
 *   - 루나가 실시간으로 최신 연구 검색 중인 순간을 "사람처럼 고민" UI로 표현
 *   - 카톡 말풍선 순차 등장 + 점 3개 깜빡임 + 루나 아바타 눈 깜빡임
 *   - "계산 중" / "로딩 중" 느낌 ❌ → "진짜 생각하는 누나" 느낌 ✅
 *
 * 데이터:
 *   - phrases: 3개 랜덤 문구 (유저 키워드 반영, 서버에서 생성)
 *   - 순차 등장: 0.8초 간격
 *   - 자동 종료: 서버가 status='done' 보내면 fade out
 */

interface LunaThinkingDeepProps {
  /** 서버에서 보낸 고민 문구 (최대 3~5개) */
  phrases: string[];
  /** 완료 여부 (true면 fade out) */
  done?: boolean;
}

export default function LunaThinkingDeep({ phrases, done = false }: LunaThinkingDeepProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  // 문구 순차 등장 (0.8초 간격)
  useEffect(() => {
    if (done) return;
    if (visibleCount >= phrases.length) return;

    const timer = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + 1, phrases.length));
    }, visibleCount === 0 ? 200 : 800);

    return () => clearTimeout(timer);
  }, [visibleCount, phrases.length, done]);

  // done 상태면 fade out 애니메이션 (400ms 후 언마운트)
  return (
    <AnimatePresence mode="wait">
      {!done && (
        <motion.div
          key="thinking-deep"
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.4 } }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="mx-4 my-3"
        >
          <div className="flex items-start gap-2.5">
            {/* 루나 아바타 — 눈 깜빡이는 애니메이션 */}
            <div className="relative flex-shrink-0">
              <motion.div
                animate={{
                  rotate: [0, -3, 3, -2, 0],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-10 h-10 border-2 border-pink-300 overflow-hidden bg-white shadow-md"
                style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
              >
                <img
                  src="/char_img/luna_1_event.png"
                  alt="루나 고민 중"
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* 생각 구름 ☁️💭 */}
              <motion.div
                animate={{
                  y: [0, -3, 0],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-2 -right-2 text-sm"
              >
                💭
              </motion.div>
            </div>

            {/* 말풍선 스택 — 순차 등장 */}
            <div className="flex-1 min-w-0 space-y-2">
              <AnimatePresence>
                {phrases.slice(0, visibleCount).map((phrase, idx) => (
                  <motion.div
                    key={`phrase-${idx}`}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    className="inline-block max-w-[85%]"
                  >
                    <div
                      className="relative px-3.5 py-2 rounded-2xl text-[13px] text-gray-700 font-medium shadow-sm"
                      style={{
                        background: 'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%)',
                        border: '1px solid rgba(244, 114, 182, 0.25)',
                      }}
                    >
                      {phrase}

                      {/* 마지막 말풍선에 점 3개 타이핑 인디케이터 */}
                      {idx === visibleCount - 1 && visibleCount === phrases.length && (
                        <span className="inline-flex items-center gap-0.5 ml-1.5 align-middle">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              animate={{
                                opacity: [0.3, 1, 0.3],
                                y: [0, -2, 0],
                              }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                              className="inline-block w-1 h-1 rounded-full bg-pink-400"
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 문구 아직 다 안 나왔을 때 "타이핑 중" 플레이스홀더 */}
              {visibleCount < phrases.length && visibleCount > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white/60 border border-pink-100"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        y: [0, -2, 0],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      className="inline-block w-1.5 h-1.5 rounded-full bg-pink-300"
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
