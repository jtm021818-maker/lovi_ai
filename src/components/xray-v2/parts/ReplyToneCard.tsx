'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { XV2 } from '@/styles/xray-v2-tokens';
import type { ReplyOption, ReplyTone } from '@/lib/xray/types-v2';

interface Props {
  reply: ReplyOption;
  delay?: number;
}

const TONE_META: Record<ReplyTone, { ko: string; icon: string; color: string; tagline: string }> = {
  gentle:    { ko: '부드럽게',  icon: '🌸', color: XV2.green,   tagline: '공감 + 안전' },
  direct:    { ko: '솔직하게',  icon: '⚡', color: XV2.cyan,    tagline: '명확 + 단호' },
  humor:     { ko: '가볍게',    icon: '✨', color: XV2.amber,   tagline: '환기 + 분위기' },
  withdrawn: { ko: '거리 두기', icon: '🌙', color: XV2.blue,    tagline: '시간 + 공간' },
};

export default function ReplyToneCard({ reply, delay = 0 }: Props) {
  const meta = TONE_META[reply.tone];
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(reply.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 240, damping: 22 }}
      className="shrink-0 relative overflow-hidden"
      style={{
        width: 260,
        background: XV2.glassBg,
        backdropFilter: XV2.glassBlur,
        WebkitBackdropFilter: XV2.glassBlur,
        border: `1px solid ${meta.color}44`,
        borderRadius: 18,
        padding: 16,
        boxShadow: `0 0 20px ${meta.color}1a`,
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 16 }}>{meta.icon}</span>
          <span className="text-[12px] font-bold" style={{ color: meta.color }}>
            {meta.ko}
          </span>
        </div>
        <span
          className="text-[9px] uppercase tracking-[0.1em]"
          style={{ color: XV2.textMute, fontFamily: XV2.fontMono }}
        >
          {meta.tagline}
        </span>
      </div>

      {/* 본문 */}
      <p
        className="text-[13.5px] leading-relaxed"
        style={{ color: XV2.text, minHeight: 60 }}
      >
        &ldquo;{reply.text}&rdquo;
      </p>

      {/* 예상 반응 */}
      <div
        className="mt-3 pt-3"
        style={{ borderTop: `1px solid ${meta.color}22` }}
      >
        <div
          className="text-[9px] uppercase tracking-[0.1em] mb-1"
          style={{ color: XV2.textMute, fontFamily: XV2.fontMono }}
        >
          예상 반응
        </div>
        <p className="text-[11.5px] leading-relaxed" style={{ color: XV2.textDim }}>
          {reply.expectedReaction}
        </p>
      </div>

      {/* 복사 버튼 */}
      <button
        onClick={onCopy}
        className="mt-3 w-full py-2 rounded-lg text-[11px] font-bold transition-all active:scale-95"
        style={{
          background: copied ? meta.color : `${meta.color}22`,
          color: copied ? XV2.bg : meta.color,
          border: `1px solid ${meta.color}55`,
        }}
      >
        {copied ? '✓ 복사됨' : '📋 복사하기'}
      </button>
    </motion.div>
  );
}
