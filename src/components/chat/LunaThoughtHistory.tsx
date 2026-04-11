'use client';

import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🆕 v37: 💭 루나의 속마음 타임라인 모달
 *
 * ChatContainer 상단의 "💭 [속마음]" 버튼 클릭 시 등장.
 * 대화 중 누적된 루나의 속마음 히스토리를 타임라인 형태로 표시.
 *
 * UX:
 * - 바텀시트 (아래에서 올라오는 패널)
 * - 최신순 (위가 가장 최근)
 * - 각 속마음 카드: 💭 아이콘 + 턴 번호 + 속마음 텍스트
 * - 펄스 애니메이션 (루나 감성)
 */

interface LunaThoughtHistoryProps {
  open: boolean;
  onClose: () => void;
  history: string[];
}

export default function LunaThoughtHistory({
  open,
  onClose,
  history,
}: LunaThoughtHistoryProps) {
  // 최신순으로 (마지막이 가장 최근) — 역순 표시
  const reversedHistory = [...history].reverse();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 딤 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          />

          {/* 바텀시트 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] overflow-hidden rounded-t-3xl shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, #fff5f8 0%, #fef3f7 50%, #ffffff 100%)',
            }}
          >
            {/* 드래그 핸들 */}
            <div className="w-10 h-1 bg-pink-200 rounded-full mx-auto mt-3 mb-1" />

            {/* 헤더 */}
            <div className="px-5 pt-3 pb-4 border-b border-pink-100/60">
              <div className="flex items-center gap-2 mb-1">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-lg"
                >
                  💭
                </motion.div>
                <h3 className="text-[15px] font-bold text-pink-600">속마음 타임라인</h3>
                <span className="text-[10px] text-pink-400/80 ml-auto">
                  {history.length > 0 ? `${history.length}개` : '아직 없음'}
                </span>
              </div>
              <p className="text-[11px] text-pink-400/80 leading-tight">
                루나가 대화하면서 속으로 생각한 것들이야 🦊
              </p>
            </div>

            {/* 타임라인 */}
            <div className="px-5 py-4 max-h-[55vh] overflow-y-auto">
              {history.length === 0 ? (
                /* 빈 상태 */
                <div className="text-center py-12">
                  <motion.div
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-5xl mb-3"
                  >
                    💭
                  </motion.div>
                  <p className="text-[12px] text-gray-400">
                    대화가 진행되면 속마음이 쌓여가요
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reversedHistory.map((thought, idx) => {
                    const isLatest = idx === 0;
                    const turnNumber = history.length - idx;
                    return (
                      <motion.div
                        key={`thought-${turnNumber}-${idx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, type: 'spring', damping: 20 }}
                        className={`relative pl-10 pr-3 py-3 rounded-2xl ${
                          isLatest
                            ? 'bg-gradient-to-r from-pink-100/90 to-rose-100/80 border border-pink-300/50 shadow-md'
                            : 'bg-white/70 border border-pink-100/50'
                        }`}
                      >
                        {/* 타임라인 도트 */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <motion.div
                            animate={isLatest ? { scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] } : {}}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              isLatest
                                ? 'bg-gradient-to-br from-pink-400 to-rose-400 shadow-[0_0_8px_rgba(244,114,182,0.4)]'
                                : 'bg-pink-200/70'
                            }`}
                          >
                            <span className="text-[9px]">💭</span>
                          </motion.div>
                        </div>

                        {/* 턴 번호 + 최신 뱃지 */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-semibold ${isLatest ? 'text-pink-600' : 'text-pink-400/80'}`}>
                            턴 {turnNumber}
                          </span>
                          {isLatest && (
                            <span className="text-[8px] font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 rounded-full shadow-sm">
                              NOW
                            </span>
                          )}
                        </div>

                        {/* 속마음 텍스트 */}
                        <p className={`text-[12.5px] leading-relaxed italic ${
                          isLatest ? 'text-pink-700 font-medium' : 'text-gray-600'
                        }`}>
                          &ldquo;{thought}&rdquo;
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* 푸터 힌트 */}
              {history.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-center"
                >
                  <span className="text-[9px] text-pink-400/70">
                    💜 루나는 매 턴 너를 생각해
                  </span>
                </motion.div>
              )}
            </div>

            {/* 닫기 버튼 */}
            <div className="px-5 pt-2 pb-5 border-t border-pink-100/60">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl text-[13px] font-bold shadow-md hover:shadow-lg transition-shadow"
              >
                닫기
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
