'use client';
import { useState, useRef } from 'react';

interface LoungeInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function LoungeInput({ onSend, disabled, placeholder }: LoungeInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md border-t border-gray-100">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        placeholder={placeholder ?? "메시지를 입력해..."}
        disabled={disabled}
        className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 text-[13px] text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-200 transition-all"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
        style={{
          background: text.trim() ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : '#e5e7eb',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
