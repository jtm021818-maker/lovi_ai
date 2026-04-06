'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';

export type LoungeMessageType =
  | { type: 'character'; speaker: 'luna' | 'tarot'; text: string; timestamp?: string }
  | { type: 'user'; text: string; timestamp?: string }
  | { type: 'system'; text: string }
  | { type: 'action'; speaker: 'luna' | 'tarot'; text: string }
  | { type: 'typing'; speaker: 'luna' | 'tarot' };

const CHAR_CONFIG = {
  luna: { name: '루나', color: '#ea580c', bgColor: '#fff7ed', image: '/luna_fox_transparent.png' },
  tarot: { name: '타로냥', color: '#7c3aed', bgColor: '#f5f3ff', image: '/char_img/taronaang_xray.png' },
};

export default function LoungeMessage({ message }: { message: LoungeMessageType }) {
  // 시스템 메시지
  if (message.type === 'system') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex justify-center my-3">
        <span className="text-[10px] text-gray-400 bg-gray-100/80 px-3 py-1 rounded-full">
          {message.text}
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

  // 타이핑 인디케이터
  if (message.type === 'typing') {
    const cfg = CHAR_CONFIG[message.speaker];
    return (
      <div className="flex items-end gap-2 mb-2 px-1">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
          <Image src={cfg.image} width={32} height={32} alt={cfg.name} className="object-cover" />
        </div>
        <div className="px-3 py-2 rounded-2xl rounded-bl-sm" style={{ background: cfg.bgColor }}>
          <motion.div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-400"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  // 유저 메시지
  if (message.type === 'user') {
    return (
      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        className="flex justify-end mb-2 px-1">
        <div className="max-w-[70%]">
          <div className="px-3.5 py-2 rounded-2xl rounded-br-sm bg-[#fee500] shadow-sm">
            <p className="text-[13px] text-gray-900 leading-relaxed">{message.text}</p>
          </div>
          {message.timestamp && (
            <p className="text-[9px] text-gray-300 text-right mt-0.5 mr-1">{message.timestamp}</p>
          )}
        </div>
      </motion.div>
    );
  }

  // 캐릭터 메시지
  const cfg = CHAR_CONFIG[message.speaker];
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 mb-2 px-1">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 mt-0.5">
        <Image src={cfg.image} width={32} height={32} alt={cfg.name} className="object-cover" />
      </div>
      <div className="max-w-[70%]">
        <span className="text-[10px] font-bold ml-1" style={{ color: cfg.color }}>{cfg.name}</span>
        <div className="px-3.5 py-2 rounded-2xl rounded-tl-sm shadow-sm mt-0.5"
          style={{ background: cfg.bgColor }}>
          <p className="text-[13px] text-gray-800 leading-relaxed">{message.text}</p>
        </div>
        {message.timestamp && (
          <p className="text-[9px] text-gray-300 ml-1 mt-0.5">{message.timestamp}</p>
        )}
      </div>
    </motion.div>
  );
}
