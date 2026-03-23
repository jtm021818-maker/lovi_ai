'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] border-t border-purple-50 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] relative z-20">
      <div className="flex items-end gap-2 max-w-2xl mx-auto">
        <div className="flex-1 bg-gray-50/80 rounded-[20px] border border-gray-100 focus-within:border-pink-300 focus-within:bg-pink-50/30 transition-all duration-300 shadow-inner overflow-hidden">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || '지금의 감정을 이야기해주세요...'}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-3.5 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none max-h-[120px] leading-relaxed"
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.05 }}
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-pink-500 to-rose-400 text-white flex items-center justify-center shadow-lg shadow-pink-200/50 disabled:opacity-40 disabled:shadow-none disabled:transform-none transition-all duration-300 mb-0.5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
