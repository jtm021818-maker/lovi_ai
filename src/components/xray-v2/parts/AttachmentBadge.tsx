'use client';

import { motion } from 'framer-motion';
import { XV2, ATTACHMENT_LABELS } from '@/styles/xray-v2-tokens';
import type { AttachmentRead } from '@/lib/xray/types-v2';

interface Props {
  who: '나' | '상대';
  read: AttachmentRead;
  delay?: number;
}

/**
 * 애착 스타일 카드. 4스타일 컬러 + confidence 바.
 */
export default function AttachmentBadge({ who, read, delay = 0 }: Props) {
  const meta = ATTACHMENT_LABELS[read.style];
  const color = XV2.attachment[read.style];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 240, damping: 22 }}
      className="relative overflow-hidden"
      style={{
        background: XV2.glassBg,
        backdropFilter: XV2.glassBlur,
        WebkitBackdropFilter: XV2.glassBlur,
        border: `1px solid ${color}55`,
        borderRadius: 16,
        padding: 16,
        boxShadow: `0 0 24px ${color}22, inset 0 0 24px ${color}0a`,
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: XV2.textDim, fontFamily: XV2.fontMono }}
        >
          {who}
        </span>
        <span
          className="text-[10px] font-mono"
          style={{ color, fontFamily: XV2.fontMono }}
        >
          {read.confidence}%
        </span>
      </div>

      {/* 본체 */}
      <div className="flex items-center gap-2.5">
        <span style={{ fontSize: 28 }}>{meta.icon}</span>
        <div>
          <div
            className="text-[16px] font-extrabold leading-none"
            style={{ color }}
          >
            {meta.ko}
          </div>
          <div
            className="text-[11px] mt-1"
            style={{ color: XV2.textDim }}
          >
            {meta.tagline}
          </div>
        </div>
      </div>

      {/* confidence 바 */}
      <div
        className="mt-3 w-full overflow-hidden"
        style={{ height: 3, background: `${color}22`, borderRadius: 2 }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${read.confidence}%` }}
          transition={{ delay: delay + 0.3, duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </motion.div>
  );
}
