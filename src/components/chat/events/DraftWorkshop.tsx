'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 v35: 💬 메시지 초안 모드 Turn 2 — 카톡 초안 3버전 카드
 *
 * AI가 생성한 3가지 버전의 카톡 초안을 카카오톡 말풍선 스타일로 표시.
 * 각 초안마다 [복사] [수정] 버튼 제공.
 *
 * UX:
 * - 버전 A/B/C (이모지 🅰️🅱️🅲)
 * - 각 초안은 카톡 말풍선 스타일 (노란색)
 * - 의도 설명 (루나 코멘트)
 * - 복사 버튼 → 클립보드
 * - 수정 버튼 → 유저가 수정 요청 텍스트 전송
 */

interface DraftCard {
  version: 'A' | 'B' | 'C';
  tone: string;
  text: string;
  intent: string;
}

interface DraftWorkshopProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

const VERSION_EMOJI: Record<string, string> = {
  A: '🅰️',
  B: '🅱️',
  C: '🅲',
};

export default function DraftWorkshop({ event, onSelect, disabled }: DraftWorkshopProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = event.data as {
    lunaMessage?: string;
    drafts?: DraftCard[];
  };

  const lunaMessage = data.lunaMessage ?? '자 이 중에 끌리는 거 있어?';
  const drafts: DraftCard[] = data.drafts ?? [];

  const handleCopy = async (draft: DraftCard) => {
    try {
      await navigator.clipboard.writeText(draft.text);
      setCopied(draft.version);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // 클립보드 실패 시 무시
    }
  };

  const handleSelect = (draft: DraftCard) => {
    if (disabled || done) return;
    setSelectedVersion(draft.version);
    setTimeout(() => {
      setDone(true);
      onSelect(`${VERSION_EMOJI[draft.version]} ${draft.version}번 버전으로 할래`, {
        source: 'draft_workshop',
        context: {
          version: draft.version,
          tone: draft.tone,
          selectedText: draft.text,
        },
      });
    }, 500);
  };

  const handleRefine = (draft: DraftCard) => {
    if (disabled || done) return;
    setSelectedVersion(draft.version);
    setTimeout(() => {
      setDone(true);
      onSelect(`${draft.version}번 버전 수정하고 싶어`, {
        source: 'draft_workshop',
        context: {
          version: draft.version,
          action: 'refine',
          originalText: draft.text,
        },
      });
    }, 300);
  };

  const handleAllAgain = () => {
    if (disabled || done) return;
    setDone(true);
    onSelect('다 별로야, 다시 만들어줘', {
      source: 'draft_workshop',
      context: { action: 'regenerate' },
    });
  };

  // 완료 상태
  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-yellow-50/80 to-orange-50/80 rounded-2xl border border-yellow-200/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="text-[12px] font-bold text-yellow-700">
            카톡 초안 — {selectedVersion ?? 'A'}번 선택
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.2 }}
      className="mx-4 my-4"
    >
      <div
        className="relative rounded-3xl border-2 shadow-xl overflow-hidden p-5"
        style={{
          background: 'linear-gradient(135deg, #fef9c3 0%, #fef3c7 50%, #fef9c3 100%)',
          borderColor: 'rgba(250, 204, 21, 0.4)',
        }}
      >
        {/* 헤더 */}
        <div className="relative flex items-center gap-2.5 mb-3">
          <div
            className="w-10 h-10 flex-shrink-0 border-2 border-yellow-400 overflow-hidden bg-white shadow-md"
            style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
          >
            <img src="/char_img/luna_1_event.png" alt="루나" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-yellow-700">💬 카톡 초안 워크샵</div>
            <div className="text-[10px] text-yellow-600/80">3가지 버전 만들어봤어</div>
          </div>
        </div>

        {/* 루나 멘트 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative text-[13px] text-gray-700 mb-4 italic pl-3 border-l-2 border-yellow-300"
        >
          {lunaMessage}
        </motion.div>

        {/* 초안 카드들 */}
        <div className="space-y-4">
          {drafts.map((draft, idx) => (
            <motion.div
              key={draft.version}
              initial={{ opacity: 0, x: -15 }}
              animate={{
                opacity: selectedVersion && selectedVersion !== draft.version ? 0.4 : 1,
                x: 0,
              }}
              transition={{ delay: 0.5 + idx * 0.15 }}
              className={`relative rounded-2xl p-3 border-2 transition-all ${
                selectedVersion === draft.version
                  ? 'bg-gradient-to-r from-yellow-200 to-orange-200 border-yellow-500 shadow-lg'
                  : 'bg-white/80 border-yellow-200/70 hover:border-yellow-400'
              }`}
            >
              {/* 버전 + 톤 배지 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{VERSION_EMOJI[draft.version]}</span>
                  <span className="text-[12px] font-bold text-yellow-700">{draft.version}</span>
                  <span className="text-[11px] text-yellow-600 bg-yellow-100 rounded-full px-2 py-0.5">
                    {draft.tone}
                  </span>
                </div>
              </div>

              {/* 카톡 말풍선 */}
              <div className="bg-yellow-200 rounded-2xl rounded-tl-md p-3 mb-2 shadow-sm">
                <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {draft.text}
                </p>
              </div>

              {/* 의도 설명 */}
              <div className="text-[10px] text-yellow-700/80 italic mb-2 pl-2">
                💭 {draft.intent}
              </div>

              {/* 버튼들 */}
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCopy(draft)}
                  disabled={disabled || done}
                  className="flex-1 py-2 px-3 bg-white border border-yellow-300 rounded-xl text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 transition-colors"
                >
                  {copied === draft.version ? '✓ 복사됨' : '📋 복사'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRefine(draft)}
                  disabled={disabled || done}
                  className="flex-1 py-2 px-3 bg-white border border-yellow-300 rounded-xl text-[11px] font-semibold text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 transition-colors"
                >
                  ✏️ 수정
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(draft)}
                  disabled={disabled || done}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-[11px] font-bold text-white hover:shadow-md disabled:opacity-50 transition-shadow"
                >
                  ✨ 이거로
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* "전부 다시" 버튼 */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAllAgain}
          disabled={disabled || done}
          className="mt-4 w-full py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          🔄 전부 다시 만들기
        </motion.button>

        <div className="text-center mt-2">
          <span className="text-[9px] text-yellow-600/80">💛 카톡 스타일로 만들었어</span>
        </div>

        {/* 선택 시 반짝 효과 */}
        <AnimatePresence>
          {selectedVersion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 0] }}
                transition={{ duration: 0.5 }}
                className="text-5xl"
              >
                ✨
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
