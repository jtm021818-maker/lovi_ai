'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';
/* eslint-disable @next/next/no-img-element */

interface Props {
  unopenedCount: number;
  onOpen: () => void;
  isDeceased: boolean;
  accentColor: string;
  hasFinalLetter: boolean;
}

const SRC_IDLE = '/luna-room/furniture/mailbox_idle.webp';
const SRC_ALERT = '/luna-room/furniture/mailbox_alert.webp';

export default function MailboxSlot({ unopenedCount, onOpen, isDeceased, accentColor, hasFinalLetter }: Props) {
  const src = unopenedCount > 0 ? SRC_ALERT : SRC_IDLE;
  const [imgFailed, setImgFailed] = useState(false);

  const hasUnread = unopenedCount > 0;
  const isFinal = isDeceased && hasFinalLetter;

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -3 }}
      onClick={onOpen}
      className="relative flex flex-col items-center cursor-pointer"
      style={{ width: 84, height: 100 }}
      aria-label={`우편함 ${unopenedCount > 0 ? `— 새 편지 ${unopenedCount}` : ''}`}
    >
      {/* shadow under */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full opacity-30"
        style={{ width: 56, height: 8, background: 'rgba(60, 40, 30, 0.4)', filter: 'blur(4px)' }}
      />

      {/* mailbox body */}
      <motion.div
        animate={hasUnread && !isFinal ? { rotate: [-2.5, 2.5, -2.5] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
        style={{ width: 80, height: 92 }}
      >
        {!imgFailed ? (
          <img
            src={src}
            alt="우편함"
            className="w-full h-full object-contain"
            onError={() => setImgFailed(true)}
            draggable={false}
          />
        ) : (
          // Fallback: CSS 박스 우편함
          <div className="relative w-full h-full">
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-2xl rounded-b-md"
              style={{
                width: 56,
                height: 70,
                background: isFinal
                  ? `linear-gradient(180deg, #8B5CF6, #4C1D95)`
                  : `linear-gradient(180deg, ${hasUnread ? '#F87171' : '#A78BFA'}, ${hasUnread ? '#DC2626' : '#7C3AED'})`,
                boxShadow: '0 4px 8px rgba(0,0,0,0.18)',
              }}
            />
            {/* 슬롯 */}
            <div
              className="absolute"
              style={{
                left: '50%',
                top: 26,
                transform: 'translateX(-50%)',
                width: 30,
                height: 4,
                background: '#1F1B2C',
                borderRadius: 2,
              }}
            />
            {/* 기둥 */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{ width: 6, height: 18, background: '#3F2E25', borderRadius: 1 }}
            />
            {/* 깃발 */}
            {hasUnread && (
              <motion.div
                animate={{ rotate: [0, -8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute"
                style={{
                  left: 'calc(50% + 18px)',
                  top: 28,
                  width: 12,
                  height: 8,
                  background: '#EF4444',
                  borderRadius: 1,
                }}
              />
            )}
          </div>
        )}
      </motion.div>

      {/* badge */}
      {hasUnread && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={ROOM_TOKENS.springTap}
          className="absolute"
          style={{
            top: -2,
            right: 4,
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 9,
            background: isFinal ? '#FBBF24' : '#EF4444',
            color: 'white',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            fontFamily: ROOM_TOKENS.hudFont,
          }}
        >
          {isFinal ? '⭐' : unopenedCount}
        </motion.div>
      )}

      {/* label */}
      <div
        className="absolute"
        style={{
          bottom: -16,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 10,
          fontFamily: ROOM_TOKENS.hudFont,
          fontWeight: 600,
          color: accentColor,
          opacity: 0.7,
          whiteSpace: 'nowrap',
        }}
      >
        우편함
      </div>
    </motion.button>
  );
}
