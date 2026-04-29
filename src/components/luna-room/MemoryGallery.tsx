'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LunaMemory } from '@/lib/luna-life';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';

interface Props {
  memories: LunaMemory[];
  accentColor: string;
  isDark: boolean;
  onClose: () => void;
  onPin: (memoryId: string, pinned: boolean, frameStyle?: string) => Promise<void> | void;
}

const FRAME_STYLES = [
  { id: 'wood', label: '우드', color: '#8B5A2B' },
  { id: 'gold', label: '골드', color: '#D4AF37' },
  { id: 'pastel', label: '파스텔', color: '#F9A8D4' },
  { id: 'film', label: '필름', color: '#1F2937' },
] as const;

function MemoryPolaroid({
  memory,
  accentColor,
  isNew,
  onClick,
}: {
  memory: LunaMemory;
  accentColor: string;
  isNew: boolean;
  onClick: () => void;
}) {
  const tilt = ((memory.id.charCodeAt(0) % 5) - 2) * 1.2;
  const borderColor = (() => {
    switch (memory.frameStyle) {
      case 'gold': return '#D4AF37';
      case 'pastel': return '#F9A8D4';
      case 'film': return '#1F2937';
      default: return '#FFFBF5';
    }
  })();

  return (
    <motion.button
      whileHover={{ y: -4, rotate: 0 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 10, rotate: tilt }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      transition={ROOM_TOKENS.springSoft}
      className="relative flex flex-col w-full text-left"
      style={{
        padding: 8,
        paddingBottom: 24,
        background: borderColor === '#FFFBF5' ? '#FFFBF5' : '#FFFFFF',
        border: borderColor !== '#FFFBF5' ? `3px solid ${borderColor}` : 'none',
        borderRadius: 4,
        boxShadow: '0 6px 14px rgba(60,40,30,0.18), 0 1px 2px rgba(60,40,30,0.12)',
      }}
    >
      {memory.isPinned && (
        <div
          className="absolute"
          style={{
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 14,
          }}
        >
          📌
        </div>
      )}
      {isNew && (
        <div
          className="absolute"
          style={{
            top: 4,
            right: 4,
            background: '#EF4444',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: 6,
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          NEW
        </div>
      )}

      <div
        className="aspect-square w-full flex items-center justify-center relative overflow-hidden rounded-sm"
        style={{ background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}0F)` }}
      >
        <span
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: accentColor,
            opacity: 0.45,
            fontFamily: ROOM_TOKENS.whisperFont,
          }}
        >
          {memory.title.slice(0, 1)}
        </span>
        <div
          className="absolute bottom-1 right-2 text-[9px] opacity-50"
          style={{ color: '#7C6B5A', fontFamily: ROOM_TOKENS.hudFont }}
        >
          D+{memory.dayNumber}
        </div>
      </div>
      <div
        className="mt-2 px-1"
        style={{
          fontFamily: ROOM_TOKENS.whisperFont,
          fontSize: 13,
          color: '#3A2418',
          fontWeight: 500,
          lineHeight: 1.3,
          minHeight: 32,
        }}
      >
        {memory.title}
      </div>
    </motion.button>
  );
}

export default function MemoryGallery({ memories, accentColor, isDark, onClose, onPin }: Props) {
  const [selected, setSelected] = useState<LunaMemory | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<number>(0);

  useEffect(() => {
    const stored = Number(typeof window !== 'undefined' ? localStorage.getItem('luna-room:lastSeenMemoryAt') : 0);
    setLastSeenAt(stored || 0);
    return () => {
      try {
        localStorage.setItem('luna-room:lastSeenMemoryAt', String(Date.now()));
      } catch { /* ignore */ }
    };
  }, []);

  const isNew = (m: LunaMemory) => new Date(m.createdAt).getTime() > lastSeenAt && lastSeenAt > 0;

  // 핀 토글 (낙관적)
  const [localMemories, setLocalMemories] = useState<LunaMemory[]>(memories);
  useEffect(() => setLocalMemories(memories), [memories]);

  const handleTogglePin = async (m: LunaMemory) => {
    const next = !m.isPinned;
    setLocalMemories((prev) => prev.map((x) => (x.id === m.id ? { ...x, isPinned: next } : x)));
    setSelected((s) => (s && s.id === m.id ? { ...s, isPinned: next } : s));
    try {
      await onPin(m.id, next);
    } catch {
      // 실패 시 롤백
      setLocalMemories((prev) => prev.map((x) => (x.id === m.id ? { ...x, isPinned: m.isPinned } : x)));
      setSelected((s) => (s && s.id === m.id ? { ...s, isPinned: m.isPinned } : s));
    }
  };

  const handleFrameChange = async (m: LunaMemory, style: string) => {
    setLocalMemories((prev) => prev.map((x) => (x.id === m.id ? { ...x, frameStyle: style } : x)));
    setSelected((s) => (s && s.id === m.id ? { ...s, frameStyle: style } : s));
    try {
      await onPin(m.id, !!m.isPinned, style);
    } catch { /* ignore */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex flex-col"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, rgba(30, 27, 75, 0.96), rgba(15, 10, 30, 0.98))'
          : 'linear-gradient(180deg, rgba(255, 248, 240, 0.97), rgba(254, 240, 230, 0.99))',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* 헤더 */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-5 pt-12 pb-3"
      >
        <div>
          <h2 style={{ fontFamily: ROOM_TOKENS.hudFont, fontSize: 18, fontWeight: 800, color: isDark ? '#E0E7FF' : '#3A2418' }}>
            추억
          </h2>
          <p style={{ fontSize: 11, color: isDark ? '#A5B4FC' : '#7C6B5A', marginTop: 2 }}>
            {localMemories.length}장의 순간
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            color: isDark ? '#E0E7FF' : '#3A2418',
          }}
          aria-label="닫기"
        >
          ✕
        </button>
      </motion.div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-5 pb-10">
        {localMemories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-40">🖼</div>
            <p style={{ color: isDark ? '#A5B4FC' : '#7C6B5A', fontSize: 13, lineHeight: 1.7 }}>
              루나가 첫 추억을 쓰는 중이야{'\n'}
              상담을 한 번 마치면 채워져
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {localMemories.map((m) => (
              <MemoryPolaroid
                key={m.id}
                memory={m}
                accentColor={accentColor}
                isNew={isNew(m)}
                onClick={() => setSelected(m)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 확대 모달 */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 16 }}
              transition={ROOM_TOKENS.springSoft}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: '#FFFBF5', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
            >
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p style={{ fontSize: 10, color: accentColor, fontWeight: 700 }}>
                      D+{selected.dayNumber}
                    </p>
                    <h3
                      style={{
                        fontFamily: ROOM_TOKENS.whisperFont,
                        fontSize: 18,
                        color: '#3A2418',
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {selected.title}
                    </h3>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-lg opacity-50">
                    ✕
                  </button>
                </div>

                <div
                  className="aspect-[4/3] w-full rounded-md flex items-center justify-center mb-4"
                  style={{ background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)` }}
                >
                  <span
                    style={{
                      fontSize: 64,
                      color: accentColor,
                      opacity: 0.5,
                      fontFamily: ROOM_TOKENS.whisperFont,
                    }}
                  >
                    {selected.title.slice(0, 1)}
                  </span>
                </div>

                <p
                  style={{
                    fontFamily: ROOM_TOKENS.whisperFont,
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: '#3A2418',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selected.content}
                </p>
              </div>

              {/* 액자 스타일 + 핀 토글 */}
              <div className="px-5 py-3 bg-[#FAF1E0] border-t border-[#E8D5C0]">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 11, color: '#7C6B5A', fontWeight: 600 }}>액자</span>
                  <button
                    onClick={() => handleTogglePin(selected)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{
                      background: selected.isPinned ? accentColor : 'rgba(0,0,0,0.05)',
                      color: selected.isPinned ? '#fff' : '#7C6B5A',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    📌 {selected.isPinned ? '고정됨' : '고정하기'}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {FRAME_STYLES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleFrameChange(selected, f.id)}
                      className="flex-1 py-1.5 rounded-md text-[10px] font-semibold"
                      style={{
                        background: selected.frameStyle === f.id ? f.color : 'rgba(0,0,0,0.04)',
                        color: selected.frameStyle === f.id ? '#fff' : '#7C6B5A',
                        border: selected.frameStyle === f.id ? 'none' : '1px solid rgba(0,0,0,0.08)',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
