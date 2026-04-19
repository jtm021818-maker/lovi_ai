'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@/types/chat.types';
import type { PersonaMode } from '@/types/persona.types';
import LunaSticker, { isValidSticker } from './LunaSticker';
import PremiumBadge from '@/components/common/PremiumBadge';
import { useBubbleFx } from '@/lib/fx/use-bubble-fx';

interface MessageBubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
  /** 🆕 v22: TTS 토글 콜백 (AI 메시지 전용) */
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  /** 프리미엄 유저 여부 (TTS 잠금 표시용) */
  isPremium?: boolean;
  /** 현재 페르소나 모드 */
  persona?: PersonaMode;
  /** 🆕 v79: 마지막 AI 메시지 여부 (bubble FX 매칭용) */
  isLastAi?: boolean;
}

const REACTIONS = ['❤️', '🥺', '😢', '😮', '👍', '💪'];

/** **bold** 마크다운을 <strong>으로 변환 */
function renderFormattedText(text: string) {
  // **text** → <strong>text</strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function MessageBubble({ message, isTyping, onSpeak, isSpeaking, isPremium = true, persona = 'luna', isLastAi = false }: MessageBubbleProps) {
  const isUser = message.senderType === 'user';
  const [showReactions, setShowReactions] = useState(false);
  const [chosenReaction, setChosenReaction] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🆕 v79: bubble FX 구독 (AI 메시지만)
  const bubbleFx = useBubbleFx(message.id, !isUser && isLastAi);
  const bubbleFxClass = !isUser ? bubbleFx.classes.join(' ') : '';

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

  // 🆕 v22: [STICKER:xxx] 태그 파싱
  const stickerMatch = !isUser ? message.content?.match(/\[STICKER:(\w+)\]/) : null;
  const stickerId = stickerMatch?.[1] ?? null;

  // 🆕 v82.10: 루나 극장 "정정" 메시지 감지 — 특화 스타일 (보라톤 + 📝 뱃지)
  const CORRECTION_PREFIX = '📝 내 진짜 마음은 이래: ';
  const isMirrorCorrection = isUser && message.content.startsWith(CORRECTION_PREFIX);
  // 🆕 v25: 유효/무효 관계없이 태그는 항상 텍스트에서 제거
  // 🆕 v35: 선택지 배열이 텍스트에 남는 버그 수정 — 버튼으로 이미 표시되므로 텍스트에서 제거
  const textContent = message.content
    .replace(/\[STICKER:\w+\]/g, '')
    .replace(/\|\|\|/g, ' ')
    // 선택지 태그 제거: [SUGGESTIONS: "옵션1", "옵션2", "옵션3"]
    .replace(/\[?SUGGESTIONS:?\]?\s*\[[^\]]*\]/gi, '')
    .replace(/SUGGESTIONS:\s*"[^"]*"(,\s*"[^"]*")*/gi, '')
    .replace(/\bSUGGESTIONS\b[^\n]*/gi, '')
    // 한글 선택지 배열 제거: ["응 진짜 지쳐", "서운하긴 해", "잘 모르겠어"]
    .replace(/\[\s*"[^"]{1,20}"\s*(,\s*"[^"]{1,20}"\s*){1,5}\]/g, '')
    // 🆕 v36: 루나 인사이트 태그 방어 제거
    .replace(/\[SITUATION_READ:[^\]]*\]/g, '')
    .replace(/\[LUNA_THOUGHT:[^\]]*\]/g, '')
    // 🆕 v80: 인라인 힌트 태그 안전망 (DELAY/TYPING/SILENCE — 파이프라인 누락 방어)
    //   닫힌 태그: [DELAY:fast], [TYPING], [SILENCE] 등
    .replace(/\[(?:DELAY|TYPING|SILENCE)(?::[^\]]*)?(?:\])?\s*/gi, '')
    //   열린 태그: [DELAY... (닫는 ] 없이 비정상 종료)
    .replace(/\[(?:DELAY|TYPING|SILENCE)[^\]\n]*/gi, '')
    // 🆕 v79: FX 태그 안전망 (범위형 + 단일형 + 열린형)
    .replace(/\[FX:[a-z_]+\.[a-z_]+\]/gi, '')
    .replace(/\[\/FX\]/gi, '')
    .replace(/\[FX[^\]\n]*/gi, '')
    // 🆕 v81: OPERATION_COMPLETE 태그 안전망
    .replace(/\[OPERATION_COMPLETE[^\]]*\]/gi, '')
    // 🆕 v42: 빈 대괄호 [] 제거 (선택지 제거 후 남은 잔해)
    .replace(/\[\s*\]/g, '')
    // 🆕 v82.10: 정정 메시지 prefix 제거 — 뱃지로 대체 렌더
    .replace(/^📝 내 진짜 마음은 이래:\s*/, '')
    // 🆕 v82.5: 카톡 스타일 — 한 버블 안에서 newline 불필요. 공백 1개로 정리.
    //   `\n{3,}` 만 collapse 하던 이전 로직은 `\n\n` (빈 줄) 을 남겨서 중간에 공백 줄 떴음.
    .replace(/\s*\n\s*/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  const isStickerOnly = stickerId && isValidSticker(stickerId) && !textContent;

  return (
    <motion.div
      initial={isUser ? { opacity: 0, x: 20 } : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 relative`}
    >
      {/* AI avatar with pulse */}
      {!isUser && (
        <div className="relative mr-2 flex-shrink-0">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center shadow-sm border border-[#EACbb3] overflow-hidden"
          >
            <img src={persona === 'tarot' ? '/taronaong_kakao.png' : '/luna_fox_transparent.png'} alt={persona === 'tarot' ? '타로냥' : '루나'} className="w-full h-full object-cover" />
          </motion.div>
        </div>
      )}

      <div className={`relative max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && (
          <span className="text-[13px] font-bold text-[#5D4037] mb-0.5 ml-1">
            {persona === 'tarot' ? '타로냥' : '루나'}
          </span>
        )}
        {/* bubble — 스티커만이면 버블 숨김 */}
        {/* 🆕 v82.10: 정정 메시지 — 위에 "📝 루나한테 정정" 뱃지 */}
        {isMirrorCorrection && (
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-fuchsia-600 ml-1">
            <span>📝</span>
            <span>루나한테 정정</span>
            <div className="flex-1 h-[1px] max-w-[60px]" style={{ background: 'linear-gradient(90deg, rgba(192,38,211,0.4), transparent)' }} />
          </div>
        )}
        {!isStickerOnly && <div
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          // 🆕 v79: 루나 메시지 버블에 data-attr — CinematicTransition 이 마지막 버블 위치 감지
          data-luna-bubble={!isUser ? 'true' : undefined}
          className={`px-4 py-2.5 shadow-sm select-none ${bubbleFxClass} ${
            isUser
              ? isMirrorCorrection
                // 🆕 v82.10: 정정 메시지 — 보라 그라디언트 + fuchsia border + glow
                ? 'text-[#3b0764] rounded-[20px] rounded-tr-[4px] border-2'
                : 'bg-[#EAE1D0] text-[#4E342E] rounded-[20px] rounded-tr-[4px] border border-[#D5C2A5]'
              : 'bg-[#F4EFE6] text-[#4E342E] rounded-[20px] rounded-tl-[4px] border border-[#D5C2A5]'
          }`}
          style={isMirrorCorrection ? {
            background: 'linear-gradient(135deg, #fae8ff 0%, #f5d0fe 100%)',
            borderColor: 'rgba(192,38,211,0.55)',
            boxShadow: '0 2px 12px rgba(192,38,211,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
          } : undefined}
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
            <p className="text-[15px] leading-[1.6] whitespace-pre-wrap break-words tracking-tight font-medium">
              {renderFormattedText(textContent)}
            </p>
          )}
        </div>}

        {/* 🆕 v22: 루나 스티커 — 버블 아래 카톡 스타일 */}
        {stickerId && isValidSticker(stickerId) && (
          <LunaSticker stickerId={stickerId} />
        )}

        {/* TTS 스피커 버튼 (AI 메시지, 타이핑 중 아닐 때) */}
        {!isUser && textContent && !isTyping && !isPremium && (
          <div className="mt-1 ml-1">
            <PremiumBadge inline label="음성" />
          </div>
        )}
        {!isUser && onSpeak && textContent && !isTyping && isPremium && (
          <button
            onClick={() => onSpeak(textContent)}
            className={`mt-1 ml-1 p-1 rounded-full transition-all duration-200 ${
              isSpeaking
                ? 'text-pink-500 bg-pink-50'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            aria-label={isSpeaking ? '음성 중지' : '음성으로 듣기'}
          >
            {isSpeaking ? (
              <motion.svg
                width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </motion.svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
        )}

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
