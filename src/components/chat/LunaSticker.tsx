'use client';

import { motion } from 'framer-motion';

const VALID_STICKERS = ['heart', 'cry', 'angry', 'proud', 'comfort', 'celebrate', 'think', 'fighting'] as const;
type StickerId = typeof VALID_STICKERS[number];

interface LunaStickerProps {
  stickerId: string;
}

export function isValidSticker(id: string): id is StickerId {
  return VALID_STICKERS.includes(id as StickerId);
}

/**
 * 루나 캐릭터 스티커 — 카카오톡 이모티콘 스타일
 * 메시지 버블 없이 이미지만 독립 표시
 */
export default function LunaSticker({ stickerId }: LunaStickerProps) {
  if (!isValidSticker(stickerId)) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
      className="my-1"
    >
      <img
        src={`/stickers/luna-${stickerId}.png`}
        alt={`루나 ${stickerId}`}
        className="w-[120px] h-auto"
        draggable={false}
      />
    </motion.div>
  );
}
