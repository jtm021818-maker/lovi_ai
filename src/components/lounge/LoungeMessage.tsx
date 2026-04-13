'use client';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getCharacterPresence } from '@/engines/lounge/ambient-actions';

export type LoungeMessageType =
  | { type: 'character'; speaker: 'luna' | 'tarot'; text: string; timestamp?: string; reaction?: string; isConsecutive?: boolean }
  | { type: 'user'; text: string; timestamp?: string; reaction?: string; reactionSpeaker?: 'luna' | 'tarot' }
  | { type: 'system'; text: string }
  | { type: 'action'; speaker: 'luna' | 'tarot'; text: string }
  | { type: 'ambient'; speaker: 'luna' | 'tarot'; text: string; emoji: string; timestamp?: string }
  | { type: 'typing'; speaker: 'luna' | 'tarot'; hesitate?: boolean };

const CHAR_CONFIG = {
  luna: { name: '루나', color: '#ea580c', bgColor: '#fff7ed', image: '/luna_fox_transparent.png' },
  tarot: { name: '타로냥', color: '#7c3aed', bgColor: '#f5f3ff', image: '/char_img/taronaang_xray.png' },
};

/** 🆕 v45: 현재 시간 기반 카톡 시간 포맷 */
function nowChatTime(): string {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const period = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${h12}:${String(m).padStart(2, '0')}`;
}

export default function LoungeMessage({ message }: { message: LoungeMessageType }) {
  // 시스템 메시지
  if (message.type === 'system') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center my-3">
        <span className="text-[10px] text-gray-400 bg-gray-100/80 px-3 py-1 rounded-full">
          {message.text}
        </span>
      </motion.div>
    );
  }

  // 🆕 v43: Ambient Action (이탈릭 + 이모지) — v45: 타임스탬프 추가
  if (message.type === 'ambient') {
    const cfg = CHAR_CONFIG[message.speaker];
    const ts = (message as any).timestamp ?? nowChatTime();
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-center my-2"
      >
        <span className="text-[11px] italic px-3 py-1.5 rounded-full"
          style={{
            color: cfg.color,
            background: `${cfg.bgColor}cc`,
            backdropFilter: 'blur(4px)',
          }}>
          {message.emoji} {cfg.name} {message.text}
          <span className="text-[8px] ml-1.5 opacity-50 not-italic">{ts}</span>
        </span>
      </motion.div>
    );
  }

  // 액션 메시지
  if (message.type === 'action') {
    const cfg = CHAR_CONFIG[message.speaker];
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex justify-center my-1">
        <span className="text-[10px] italic" style={{ color: cfg.color }}>
          {cfg.name} {message.text}
        </span>
      </motion.div>
    );
  }

  // 🆕 v43: 타이핑 인디케이터 개선 — 멈칫 효과 + 이름 표시
  if (message.type === 'typing') {
    const cfg = CHAR_CONFIG[message.speaker];
    return (
      <div className="flex items-end gap-2 mb-2 px-1">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
          <Image src={cfg.image} width={32} height={32} alt={cfg.name} className="object-cover" />
        </div>
        <div>
          <span className="text-[9px] font-medium ml-0.5" style={{ color: cfg.color, opacity: 0.6 }}>
            {cfg.name}
          </span>
          <div className="px-3 py-2 rounded-2xl rounded-bl-sm mt-0.5" style={{ background: cfg.bgColor }}>
            <motion.div className="flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <motion.div key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: cfg.color, opacity: 0.5 }}
                  animate={message.hesitate
                    ? { y: [0, -3, 0], opacity: [0.3, 0.6, 0.3] }
                    : { y: [0, -4, 0] }
                  }
                  transition={message.hesitate
                    ? { duration: 1.2, repeat: Infinity, delay: i * 0.25 }
                    : { duration: 0.6, repeat: Infinity, delay: i * 0.15 }
                  }
                />
              ))}
              {message.hesitate && (
                <motion.span
                  className="text-[9px] ml-1"
                  style={{ color: cfg.color, opacity: 0.4 }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  💭
                </motion.span>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // 유저 메시지 + 🆕 리액션 — v45: 항상 타임스탬프
  if (message.type === 'user') {
    const ts = message.timestamp ?? nowChatTime();
    return (
      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        className="flex justify-end mb-2 px-1">
        <div className="max-w-[70%] relative">
          <div className="px-3.5 py-2 rounded-2xl rounded-br-sm bg-[#fee500] shadow-sm">
            <p className="text-[13px] text-gray-900 leading-relaxed">{message.text}</p>
          </div>
          <p className="text-[9px] text-gray-300 text-right mt-0.5 mr-1">{ts}</p>
          {/* 🆕 v43: 리액션 이모지 */}
          <AnimatePresence>
            {message.reaction && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="absolute -bottom-1 -left-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shadow-sm"
                style={{
                  background: CHAR_CONFIG[message.reactionSpeaker ?? 'luna'].bgColor,
                  border: `1px solid ${CHAR_CONFIG[message.reactionSpeaker ?? 'luna'].color}22`,
                }}
              >
                <span className="text-[14px]">{message.reaction}</span>
                <span className="text-[8px] font-bold" style={{ color: CHAR_CONFIG[message.reactionSpeaker ?? 'luna'].color }}>
                  {CHAR_CONFIG[message.reactionSpeaker ?? 'luna'].name}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // 캐릭터 메시지 — 🆕 v45: 온라인 dot 수면 반영 + 항상 타임스탬프
  const cfg = CHAR_CONFIG[message.speaker];
  const isConsecutive = (message as any).isConsecutive === true;
  const presence = getCharacterPresence(message.speaker);
  const isOnline = presence.isOnline;
  const ts = message.timestamp ?? nowChatTime();

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-2 px-1 ${isConsecutive ? 'mb-0.5' : 'mb-2'}`}>
      {/* 프로필: 연속 메시지면 공간만 유지, 이미지 숨김 */}
      {isConsecutive ? (
        <div className="w-8 flex-shrink-0" />
      ) : (
        <div className="relative flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
            <Image src={cfg.image} width={32} height={32} alt={cfg.name} className="object-cover" />
          </div>
          {/* 🆕 v45: 온라인 상태 — 수면 시간 반영 */}
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
            style={{ background: isOnline ? '#22c55e' : '#94a3b8' }}
            animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      )}
      <div className="max-w-[70%]">
        {/* 연속이면 이름 숨김 */}
        {!isConsecutive && (
          <span className="text-[10px] font-bold ml-1" style={{ color: cfg.color }}>{cfg.name}</span>
        )}
        <div className={`px-3.5 py-2 rounded-2xl shadow-sm ${isConsecutive ? 'rounded-l-lg' : 'rounded-tl-sm mt-0.5'}`}
          style={{ background: cfg.bgColor }}>
          <p className="text-[13px] text-gray-800 leading-relaxed">{message.text}</p>
        </div>
        {/* 🆕 v45: 모든 메시지에 타임스탬프 (카톡 일관성) */}
        {!isConsecutive && (
          <p className="text-[9px] text-gray-300 ml-1 mt-0.5">{ts}</p>
        )}
      </div>
    </motion.div>
  );
}
