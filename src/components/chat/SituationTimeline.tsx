'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🆕 v37: 🔍 루나의 상황 인식 패널 (문서 1.6 섹션 구현)
 *
 * ChatContainer 상단의 "🔍 [상황인식]" 버튼 클릭 시 등장.
 * 구성 요소:
 *   1. 🦊 루나의 현재 이해 (큰 카드)
 *   2. 변화 여정 타임라인 (히스토리)
 *   3. 📝 수정 입력창 ("잘못 이해했으면 알려줘")
 *
 * UX:
 * - 바텀시트 (아래에서 올라오는 패널)
 * - 보라색 테마
 * - 수정 입력 → onCorrect 콜백 → sendMessage로 전송
 */

interface SituationTimelineProps {
  open: boolean;
  onClose: () => void;
  history: string[];
  current: string | null;
  onCorrect?: (correction: string) => void;
}

export default function SituationTimeline({
  open,
  onClose,
  history,
  current,
  onCorrect,
}: SituationTimelineProps) {
  const [correctionInput, setCorrectionInput] = useState('');

  // 현재 이해 — current 우선, 없으면 history 마지막
  const currentUnderstanding = current || history[history.length - 1] || null;

  // 타임라인용 — 현재까지의 변화 여정 (최신 제외, 과거 기록)
  const pastHistory =
    current && history[history.length - 1] === current
      ? history.slice(0, -1) // current가 이미 history에 있으면 과거만
      : history;

  const handleCorrect = () => {
    const text = correctionInput.trim();
    if (!text) return;
    if (onCorrect) {
      onCorrect(text);
    }
    setCorrectionInput('');
    onClose();
  };

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
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-hidden rounded-t-3xl shadow-2xl flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #f5f3ff 0%, #faf5ff 40%, #ffffff 100%)',
            }}
          >
            {/* 드래그 핸들 */}
            <div className="w-10 h-1 bg-violet-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* 헤더 */}
            <div className="px-5 pt-3 pb-4 border-b border-violet-100/60 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-lg"
                >
                  🔍
                </motion.div>
                <h3 className="text-[15px] font-bold text-violet-600">지금 이해하고 있는 상황</h3>
                <span className="text-[10px] text-violet-400/80 ml-auto">
                  {history.length > 0 ? `${history.length}단계 변화` : '탐색 중'}
                </span>
              </div>
              <p className="text-[11px] text-violet-400/80 leading-tight">
                지금 대화를 어떻게 이해하고 있는지 보여줄게 🦊
              </p>
            </div>

            {/* 스크롤 컨텐츠 */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* ① 루나의 현재 이해 — 큰 카드 */}
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">🦊</span>
                  <span className="text-[11px] font-bold text-violet-600">지금 이해한 것</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
                </div>
                {currentUnderstanding ? (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-2xl p-4 border-2 shadow-md"
                    style={{
                      background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)',
                      borderColor: 'rgba(139, 92, 246, 0.35)',
                    }}
                  >
                    {/* 반짝 효과 */}
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute top-2 right-2 text-xs"
                    >
                      ✨
                    </motion.div>
                    <p className="text-[14px] text-violet-900 leading-relaxed font-semibold">
                      &ldquo;{currentUnderstanding}&rdquo;
                    </p>
                  </motion.div>
                ) : (
                  <div className="rounded-2xl p-4 bg-violet-50/50 border border-violet-100/50 text-center">
                    <motion.div
                      animate={{ opacity: [0.4, 0.8, 0.4], rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="text-3xl mb-2"
                    >
                      🔍
                    </motion.div>
                    <p className="text-[12px] text-violet-400">
                      대화가 진행되면 이해가 여기 쌓여요
                    </p>
                  </div>
                )}
              </div>

              {/* ② 변화 여정 타임라인 */}
              {pastHistory.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">🕰️</span>
                    <span className="text-[11px] font-bold text-violet-600">변화 여정</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
                  </div>
                  <div className="relative">
                    {/* 세로 연결선 */}
                    <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-violet-200 via-violet-300 to-violet-400/60 rounded-full" />
                    <div className="space-y-2.5">
                      {pastHistory.map((situation, idx) => {
                        const isFirst = idx === 0;
                        return (
                          <motion.div
                            key={`situation-past-${idx}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative pl-9 pr-2"
                          >
                            {/* 타임라인 도트 */}
                            <div className="absolute left-0 top-1.5">
                              <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center bg-violet-100 ring-1 ring-violet-200">
                                <span className="text-[10px] text-violet-500">
                                  {isFirst ? '①' : `${idx + 1}`}
                                </span>
                              </div>
                            </div>
                            {/* 카드 */}
                            <div className="py-2 px-3 rounded-xl bg-white/70 border border-violet-100/50">
                              <div className="text-[8.5px] font-semibold text-violet-400/80 mb-0.5">
                                {isFirst ? '첫 인식' : `변화 ${idx + 1}`}
                              </div>
                              <p className="text-[11.5px] text-gray-600 leading-relaxed">
                                {situation}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ③ 수정 입력창 */}
              <div className="mb-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">📝</span>
                  <span className="text-[11px] font-bold text-violet-600">
                    이해가 잘못됐으면
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-violet-200 to-transparent" />
                </div>
                <div className="rounded-2xl border border-violet-200/60 bg-white/80 p-3 shadow-sm">
                  <textarea
                    value={correctionInput}
                    onChange={(e) => setCorrectionInput(e.target.value)}
                    placeholder="여기에 상황을 알려줘... (예: 사실 걔가 바람핀 건 아니야, 그냥 연락이 뜸해진 거지)"
                    rows={3}
                    className="w-full bg-transparent text-[12px] text-gray-700 placeholder:text-violet-300/80 resize-none focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-violet-100/60">
                    <span className="text-[9px] text-violet-400/70">
                      💜 다음 턴에 반영할게
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCorrect}
                      disabled={!correctionInput.trim()}
                      className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                        correctionInput.trim()
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md hover:shadow-lg'
                          : 'bg-violet-100 text-violet-300 cursor-not-allowed'
                      }`}
                    >
                      다시 알려주기
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <div className="px-5 pt-2 pb-5 border-t border-violet-100/60 shrink-0">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="w-full py-2.5 bg-violet-50 border border-violet-200 text-violet-600 rounded-2xl text-[12px] font-semibold hover:bg-violet-100 transition-colors"
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
