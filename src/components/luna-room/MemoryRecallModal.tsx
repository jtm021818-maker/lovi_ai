'use client';

/**
 * MemoryRecallModal — 액자 클릭 시 뜨는 추억 회상 모달
 *
 * 진입: 액자 클릭 → POST /api/luna-room/memory/[id]/recall
 * 표시:
 *  - 액자 안 이미지 (image_url 있으면 실제 이미지, 없으면 글자 fallback)
 *  - "그때 우리는..." 회상문 (typewriter)
 *  - frameStyle 별 테두리
 *  - "더 말하기" → LunaChat 시트로 전환 (memoryContext 전달)
 *  - "고정/해제" 토글
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LunaMemory } from '@/lib/luna-life';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';

interface Props {
  memory: LunaMemory;
  accentColor: string;
  isDark: boolean;
  onClose: () => void;
  onTalkMore: (memory: LunaMemory, recall: string | null) => void;
  onPin?: (memoryId: string, pinned: boolean) => Promise<void> | void;
}

const FRAME_BORDER: Record<string, string> = {
  wood: '#8B5A2B',
  gold: '#D4AF37',
  pastel: '#F9A8D4',
  film: '#1F2937',
};

export default function MemoryRecallModal({
  memory,
  accentColor,
  isDark,
  onClose,
  onTalkMore,
  onPin,
}: Props) {
  const [recall, setRecall] = useState<string | null>(null);
  const [recallError, setRecallError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [pinned, setPinned] = useState(!!memory.isPinned);

  // 회상문 fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/luna-room/memory/${memory.id}/recall`, { method: 'POST' });
        const data = await res.json();
        if (cancelled) return;
        if (typeof data?.recall === 'string') {
          setRecall(data.recall);
        } else {
          setRecallError(true);
        }
      } catch {
        if (!cancelled) setRecallError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [memory.id]);

  const handlePin = async () => {
    if (!onPin) return;
    const next = !pinned;
    setPinned(next);
    try {
      await onPin(memory.id, next);
    } catch {
      setPinned(!next);
    }
  };

  const borderColor = FRAME_BORDER[memory.frameStyle ?? 'wood'] ?? FRAME_BORDER.wood;
  const isStorageImage = !!memory.imageUrl && !memory.imageUrl.includes('pollinations.ai');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      style={{
        background: isDark ? 'rgba(8, 6, 22, 0.86)' : 'rgba(20, 12, 6, 0.55)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: isDark ? '#1A0F36' : '#FFFBF5',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: '0.08em', fontFamily: ROOM_TOKENS.hudFont }}>
              D+{memory.dayNumber}
            </div>
            <div style={{
              fontFamily: ROOM_TOKENS.whisperFont,
              fontSize: 18,
              fontWeight: 600,
              color: isDark ? '#F0ABFC' : '#3A2418',
              marginTop: 2,
            }}>
              {memory.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: isDark ? '#E0E7FF' : '#3A2418',
            }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 액자 + 이미지 */}
        <div className="px-5">
          <motion.div
            initial={{ scale: 0.96, rotate: -1 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 22 }}
            className="relative mx-auto"
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              padding: 12,
              background: '#FFFBF5',
              border: `4px solid ${borderColor}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(60,40,30,0.25), inset 0 0 0 1px rgba(0,0,0,0.06)',
            }}
          >
            {/* mat (액자 매트지) */}
            <div
              className="relative w-full h-full overflow-hidden rounded-sm"
              style={{
                background: memory.imageUrl
                  ? '#000'
                  : `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)`,
              }}
            >
              {memory.imageUrl && !imgFailed ? (
                <>
                  {/* blur-up placeholder */}
                  {!imgLoaded && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)`,
                      }}
                    />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={memory.imageUrl}
                    alt={memory.title}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgFailed(true)}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      opacity: imgLoaded ? 1 : 0,
                      transition: 'opacity 600ms ease-out',
                    }}
                    referrerPolicy={isStorageImage ? undefined : 'no-referrer'}
                    loading="lazy"
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    style={{
                      fontSize: 80,
                      color: accentColor,
                      opacity: 0.45,
                      fontFamily: ROOM_TOKENS.whisperFont,
                      fontWeight: 700,
                    }}
                  >
                    {memory.title.slice(0, 1)}
                  </span>
                </div>
              )}
            </div>

            {/* 핀 표시 */}
            {pinned && (
              <div
                className="absolute"
                style={{
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 18,
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                }}
              >
                📌
              </div>
            )}
          </motion.div>
        </div>

        {/* 회상문 (typewriter) */}
        <div className="px-5 pt-4 pb-3 min-h-[90px]">
          <div
            className="text-xs mb-2 opacity-60"
            style={{ color: isDark ? '#A5B4FC' : '#7C6B5A', fontFamily: ROOM_TOKENS.hudFont, fontWeight: 600 }}
          >
            루나의 회상
          </div>
          <RecallText
            text={recall}
            error={recallError}
            isDark={isDark}
            accentColor={accentColor}
          />
        </div>

        {/* 본문 (작성 시 content) */}
        <div className="px-5 pb-3">
          <p
            style={{
              fontFamily: ROOM_TOKENS.whisperFont,
              fontSize: 13,
              lineHeight: 1.7,
              color: isDark ? '#C7D2FE' : '#5C4A3A',
              opacity: 0.85,
              whiteSpace: 'pre-wrap',
            }}
          >
            {memory.content}
          </p>
        </div>

        {/* 액션 */}
        <div
          className="flex gap-2 px-5 py-4"
          style={{ borderTop: `1px solid ${isDark ? '#2D2A5A' : '#E8D5C0'}` }}
        >
          {onPin && (
            <button
              onClick={handlePin}
              className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1"
              style={{
                background: pinned ? accentColor : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                color: pinned ? '#fff' : (isDark ? '#A5B4FC' : '#7C6B5A'),
              }}
            >
              📌 {pinned ? '고정됨' : '고정'}
            </button>
          )}
          <button
            onClick={() => onTalkMore(memory, recall)}
            className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}DD 100%)`,
              boxShadow: `0 4px 14px ${accentColor}55`,
            }}
          >
            💬 더 말하기
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Typewriter ─────────────────────────────────────────────────────────────
function RecallText({
  text,
  error,
  isDark,
  accentColor,
}: {
  text: string | null;
  error: boolean;
  isDark: boolean;
  accentColor: string;
}) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    setDone(false);
    const chars = text.split('');
    let i = 0;
    const tick = () => {
      i++;
      setDisplayed(chars.slice(0, i).join(''));
      if (i >= chars.length) { setDone(true); return; }
      const c = chars[i - 1];
      const delay = c === '.' || c === '。' ? 700
        : c === ',' || c === ',' ? 280
        : c === '\n' ? 400
        : 26;
      setTimeout(tick, delay);
    };
    setTimeout(tick, 300);
  }, [text]);

  if (error) {
    return (
      <p
        className="text-[13px] italic"
        style={{
          color: isDark ? '#A5B4FC' : '#7C6B5A',
          opacity: 0.6,
          fontFamily: ROOM_TOKENS.whisperFont,
        }}
      >
        잠깐 생각이 멀리 갔어... 다시 봐줄래?
      </p>
    );
  }
  if (!text) {
    return (
      <div className="flex items-center gap-1.5 py-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: accentColor, opacity: 0.6 }}
            animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.7, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </div>
    );
  }

  return (
    <p
      className="text-[14px] leading-[1.85]"
      style={{
        color: isDark ? '#F0ABFC' : '#3A2418',
        fontFamily: ROOM_TOKENS.whisperFont,
        whiteSpace: 'pre-wrap',
      }}
    >
      {displayed}
      <AnimatePresence>
        {!done && (
          <motion.span
            className="inline-block w-[2px] h-[14px] ml-0.5 rounded-full align-middle"
            style={{ background: accentColor }}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          />
        )}
      </AnimatePresence>
    </p>
  );
}
