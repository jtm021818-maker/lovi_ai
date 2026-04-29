'use client';

/**
 * LunaChat — 마음의 방에서 루나와 나누는 일상 대화
 * - 세션 내 임시 히스토리 (DB 저장 없음)
 * - /api/room/luna-chat 단일 호출 (무료 Gemini/Groq)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LunaMemory } from '@/lib/luna-life';

interface Message {
  role: 'user' | 'luna';
  text: string;
}

interface MemoryContext {
  memory: LunaMemory;
  recall: string | null;
}

interface Props {
  onClose: () => void;
  accentColor?: string;
  /** v101: 추억 회상에서 진입 — 첫 메시지가 이 추억 컨텍스트 */
  memoryContext?: MemoryContext;
}

const DEFAULT_INITIAL: Message = {
  role: 'luna',
  text: '왔어? 😊 오늘 어때~',
};

export default function LunaChat({ onClose, accentColor = '#c084fc', memoryContext }: Props) {
  const initial: Message[] = useMemo(() => {
    if (!memoryContext) return [DEFAULT_INITIAL];
    const recall = memoryContext.recall?.trim();
    const text = recall && recall.length > 0
      ? recall
      : `D+${memoryContext.memory.dayNumber} "${memoryContext.memory.title}"... 그날 떠올라?`;
    return [{ role: 'luna', text }];
  }, [memoryContext]);

  const [history, setHistory] = useState<Message[]>(initial);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const send = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');

    const next: Message[] = [...history, { role: 'user', text: msg }];
    setHistory(next);
    setLoading(true);

    try {
      const res = await fetch('/api/room/luna-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: next.slice(-20),
          memoryContext: memoryContext
            ? {
                title: memoryContext.memory.title,
                content: memoryContext.memory.content,
                dayNumber: memoryContext.memory.dayNumber,
                lunaThought: memoryContext.memory.lunaThought ?? null,
                recall: memoryContext.recall,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      setHistory((prev) => [
        ...prev,
        { role: 'luna', text: data.text || '잠깐 생각 중이야 🙈' },
      ]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { role: 'luna', text: '연결이 살짝 끊겼어 다시 말해줘~' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, history]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* 딤 배경 */}
      <motion.div
        key="dim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      {/* 채팅 시트 */}
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 220, damping: 28 }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
        style={{
          height: '72vh',
          maxWidth: 480,
          margin: '0 auto',
          background: 'linear-gradient(180deg, #fef9f3 0%, #fff5ee 100%)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid #f0e4d4' }}
        >
          {/* 드래그 핸들 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-amber-200" />

          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-base"
              style={{ background: `${accentColor}22` }}
            >
              🌙
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#3a2418] leading-none">루나</p>
              <p className="text-[10px] text-[#b08060] mt-0.5">마음의 방에서</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-1 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-amber-900"
            style={{ background: 'rgba(0,0,0,0.06)' }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          <AnimatePresence initial={false}>
            {history.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={
                    m.role === 'user'
                      ? {
                          background: accentColor,
                          color: '#fff',
                          borderRadius: '18px 18px 4px 18px',
                          boxShadow: `0 2px 8px ${accentColor}44`,
                        }
                      : {
                          background: '#fff',
                          color: '#3a2418',
                          border: '1px solid #ede0d0',
                          borderRadius: '18px 18px 18px 4px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        }
                  }
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 타이핑 인디케이터 */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div
                className="px-4 py-3"
                style={{
                  background: '#fff',
                  border: '1px solid #ede0d0',
                  borderRadius: '18px 18px 18px 4px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: accentColor }}
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 0.55,
                        delay: i * 0.13,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div
          className="px-4 pt-2 pb-6 shrink-0"
          style={{ borderTop: '1px solid #f0e4d4' }}
        >
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="루나한테 말 걸어봐..."
              autoComplete="off"
              className="flex-1 px-4 py-2.5 rounded-full text-[13px] outline-none"
              style={{
                background: '#fff',
                border: `1.5px solid ${input ? accentColor + '80' : '#e8d5c0'}`,
                color: '#3a2418',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
                opacity: input.trim() && !loading ? 1 : 0.4,
                boxShadow: input.trim() ? `0 2px 10px ${accentColor}44` : 'none',
              }}
              aria-label="전송"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
