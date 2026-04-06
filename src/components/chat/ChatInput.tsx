'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  typingPlaceholder?: string;
  onImageAttach?: (imageBase64: string) => void;
}

export default function ChatInput({ onSend, disabled, placeholder, typingPlaceholder, onImageAttach }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const showCustomPlaceholder = typingPlaceholder && text.length === 0;
  const hasText = text.trim().length > 0;

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition: _browserSupport,
  } = useSpeechRecognition();

  // Hydration 안전: 서버/클라이언트 동일하게 false → mount 후 실제 값
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);
  const browserSupportsSpeechRecognition = hasMounted && _browserSupport;

  useEffect(() => {
    if (transcript) {
      setText(transcript);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
      }
    }
  }, [transcript]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageAttach) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (base64) onImageAttach(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setShowExtras(false);
  }, [onImageAttach]);

  const toggleMic = useCallback(() => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ language: 'ko-KR', continuous: true });
    }
  }, [listening, resetTranscript]);

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
    <div className="bg-white/90 backdrop-blur-xl px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+8px)] border-t border-purple-50/50 relative z-20">
      {/* 확장 메뉴 (이미지 첨부) */}
      <AnimatePresence>
        {showExtras && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-2"
          >
            <div className="flex gap-4 px-2 py-2">
              {onImageAttach && (
                <>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 hover:bg-purple-100 transition-colors">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <span className="text-[10px] text-gray-400">사진</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-1.5 max-w-2xl mx-auto">
        {/* + 버튼 (확장 메뉴 토글) */}
        {onImageAttach && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowExtras(!showExtras)}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 mb-0.5 ${
              showExtras ? 'bg-purple-100 text-purple-500 rotate-45' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>
        )}

        {/* 텍스트 입력 */}
        <div className="flex-1 bg-gray-50/80 rounded-[22px] border border-gray-100 focus-within:border-purple-200 focus-within:bg-purple-50/20 transition-all duration-200 overflow-hidden relative min-h-[42px]">
          <AnimatePresence>
            {showCustomPlaceholder && (
              <motion.div
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="absolute left-4 top-0 bottom-0 py-[11px] flex items-start pointer-events-none text-[14px] text-gray-400 whitespace-nowrap overflow-hidden w-[calc(100%-32px)]"
              >
                {typingPlaceholder.split('').map((char, index) => (
                  <motion.span
                    key={index}
                    variants={{
                      hidden: { opacity: 0, y: 3 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.2, delay: index * 0.035 } }
                    }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={showCustomPlaceholder ? '' : (placeholder || '마음 편하게 다 말해봐...')}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-[11px] text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none max-h-[120px] leading-relaxed relative z-10"
          />
        </div>

        {/* 마이크 ↔ 전송 버튼 (컨텍스트 전환) */}
        <AnimatePresence mode="wait">
          {hasText ? (
            <motion.button
              key="send"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={disabled}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-200/40 disabled:opacity-40 transition-all duration-200 flex-shrink-0 mb-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </motion.button>
          ) : listening ? (
            <motion.button
              key="listening"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMic}
              className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-200/50 flex-shrink-0 mb-0.5"
            >
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </motion.div>
            </motion.button>
          ) : browserSupportsSpeechRecognition ? (
            <motion.button
              key="mic"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMic}
              disabled={disabled}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-all duration-200 flex-shrink-0 mb-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </motion.button>
          ) : (
            <motion.button
              key="send-disabled"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              disabled
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-300 flex items-center justify-center flex-shrink-0 mb-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
