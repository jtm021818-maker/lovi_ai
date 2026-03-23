'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@/types/chat.types';

interface MessageBubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
}

const REACTIONS = ['❤️', '🥺', '😢', '😮', '👍', '💪'];

export default function MessageBubble({ message, isTyping }: MessageBubbleProps) {
  const isUser = message.senderType === 'user';
  const [showReactions, setShowReactions] = useState(false);
  const [chosenReaction, setChosenReaction] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePressStart() {
    pressTimer.current = setTimeout(() => setShowReactions(true), 500);
  }

  function handlePressEnd() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  function handleReact(emoji: string) {
    setChosenReaction(emoji);
    setShowReactions(false);
  }

  return (
    <motion.div
      initial={isUser ? { opacity: 0, x: 20 } : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 relative`}
    >
      {/* AI avatar with pulse */}
      {!isUser && (
        <div className="relative mr-2 mt-1 flex-shrink-0">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center shadow-sm"
          >
            <span className="text-sm">💜</span>
          </motion.div>
        </div>
      )}

      <div className="relative max-w-[80%]">
        {/* bubble */}
        <div
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          className={`px-5 py-3.5 rounded-[22px] shadow-sm select-none ${
            isUser
              ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-pink-200/50 rounded-br-[4px]'
              : 'bg-white text-gray-800 rounded-bl-[4px] border border-pink-50 shadow-gray-100/50'
          }`}
        >
          {isTyping && !message.content ? (
            <div className="flex space-x-1.5 py-1 items-center h-5">
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay, ease: 'easeInOut' }}
                  className="w-1.5 h-1.5 bg-pink-400 rounded-full"
                />
              ))}
            </div>
          ) : (
            <p className="text-[15px] leading-[1.6] whitespace-pre-wrap break-words tracking-tight">
              {message.content}
            </p>
          )}
        </div>

        {/* chosen reaction badge */}
        {chosenReaction && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -bottom-2 ${isUser ? '-left-2' : '-right-2'} text-base leading-none`}
          >
            {chosenReaction}
          </motion.span>
        )}

        {/* reaction popup */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 6 }}
              transition={{ duration: 0.2 }}
              className={`absolute ${isUser ? 'right-0' : 'left-0'} -top-12 z-10 flex gap-1 bg-white/95 backdrop-blur-sm border border-pink-100 rounded-2xl px-3 py-2 shadow-lg`}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="text-xl hover:scale-125 transition-transform active:scale-110"
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* dismiss overlay when reactions shown */}
      {showReactions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowReactions(false)}
        />
      )}
    </motion.div>
  );
}
