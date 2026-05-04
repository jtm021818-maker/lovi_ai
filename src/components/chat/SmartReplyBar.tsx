'use client';

/**
 * 🆕 v112-rev2: 카톡 답장 추천 — Smart Reply Bar
 *
 * ChatInput 바로 위 가로 chip. 카드 X. 카테고리 라벨 X. 답장 텍스트만.
 * iOS 18 / Gmail / 카톡 답장 추천 패턴.
 *
 * - 가로 스크롤 (모바일 친화)
 * - 클릭 → onChipSelect (ChatInput.initialValue 채움)
 * - 자동 페이드아웃 (클릭 후 또는 외부에서 visible=false)
 * - 햅틱 light + chip-pop 사운드
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { LunaMood } from '@/lib/luna-life/mood';
import { pickSmartReplies } from '@/lib/luna-life/whispers';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';

interface Props {
  mood: LunaMood;
  ageDays: number;
  intimacyLevel: number;
  recentSessionCount24h: number;
  visible: boolean;
  onChipSelect: (text: string) => void;
}

export default function SmartReplyBar({
  mood,
  ageDays,
  intimacyLevel,
  recentSessionCount24h,
  visible,
  onChipSelect,
}: Props) {
  // 결정형 seed — mount 시 한 번만 (Date.now() 가 매 렌더 안 호출되도록)
  const [mountedAtMs] = useState(() => Date.now());
  const replies = useMemo(() => {
    const daySeed =
      Math.floor((mountedAtMs + 9 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000)) +
      ageDays +
      recentSessionCount24h;
    return pickSmartReplies({
      mood,
      recentSessionCount24h,
      intimacyLevel,
      seed: daySeed,
    });
  }, [mood, ageDays, intimacyLevel, recentSessionCount24h, mountedAtMs]);

  function handleClick(text: string) {
    triggerHaptic('light');
    playSound('pop');
    onChipSelect(text);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="smart-reply-bar"
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: 4, height: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div
            className="relative px-3 pt-2 pb-2"
            style={{
              // 좌우 끝 fade — 스크롤 가능 hint
              maskImage:
                'linear-gradient(90deg, transparent 0%, black 4%, black 96%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent 0%, black 4%, black 96%, transparent 100%)',
            }}
          >
            <div
              className="flex items-center gap-1.5 overflow-x-auto"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <style jsx>{`
                div::-webkit-scrollbar { display: none; }
              `}</style>
              {replies.map((reply, i) => (
                <motion.button
                  key={`${reply}-${i}`}
                  type="button"
                  onClick={() => handleClick(reply)}
                  initial={{ opacity: 0, x: -6, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{
                    duration: 0.32,
                    delay: i * 0.06,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12.5px] text-[#5D4037] whitespace-nowrap transition-colors"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,245,250,0.85) 100%)',
                    border: '1px solid rgba(244,114,182,0.32)',
                    boxShadow:
                      '0 1px 3px rgba(192,132,252,0.10), 0 1px 1px rgba(255,180,210,0.12)',
                  }}
                >
                  {reply}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
