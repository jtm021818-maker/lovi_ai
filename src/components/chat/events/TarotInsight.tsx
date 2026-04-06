'use client';
import { motion } from 'framer-motion';
import type { TarotInsightData } from '@/types/engine.types';

interface TarotInsightProps {
  data: TarotInsightData;
  disabled?: boolean;
}

export default function TarotInsight({ data }: TarotInsightProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className="rounded-[24px] shadow-[0_8px_40px_rgba(26,26,62,0.5)] border p-5 my-4 max-w-[92%] mx-auto"
      style={{
        background: 'linear-gradient(160deg, #0d0d2b 0%, #1a1a3e 60%, #2d1b69 100%)',
        borderColor: '#d4af3755',
      }}
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-4xl mb-2"
          style={{ filter: 'drop-shadow(0 0 14px rgba(212,175,55,0.8))' }}
        >
          ✨
        </motion.div>
        <p className="font-extrabold text-[15px] tracking-wide" style={{ color: '#f5e6a3' }}>
          카드의 깊은 메시지
        </p>
      </div>

      {/* 타로냥 message */}
      <div
        className="flex items-start gap-2 mb-5 rounded-[16px] p-3"
        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
      >
        <span className="text-xl flex-shrink-0">🐱</span>
        <p className="text-[13px] leading-snug font-medium" style={{ color: '#d4c5f0' }}>
          {data.tarotNyangMessage}
        </p>
      </div>

      {/* Card summary row */}
      {data.cards.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {data.cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: 'rgba(45,27,105,0.6)', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              <span className="text-base">{card.cardEmoji}</span>
              <span className="text-[11px] font-semibold" style={{ color: '#f5e6a3' }}>
                {card.position}
              </span>
              {card.isReversed && (
                <span className="text-[10px]" style={{ color: '#e0a0a0' }}>↓</span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4))' }} />
        <span className="text-sm" style={{ color: '#d4af37aa' }}>🔮</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)' }} />
      </div>

      {/* Insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-[16px] p-4 mb-3"
        style={{ background: 'rgba(45,27,105,0.6)', border: '1px solid rgba(212,175,55,0.3)' }}
      >
        <p className="text-[11px] font-bold mb-2 tracking-widest" style={{ color: '#d4af37aa' }}>
          핵심 메시지
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: '#f0e6c8' }}>
          {data.insight}
        </p>
      </motion.div>

      {/* Advice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-[16px] p-4 mb-4"
        style={{ background: 'rgba(155,125,212,0.12)', border: '1px solid rgba(155,125,212,0.3)' }}
      >
        <p className="text-[11px] font-bold mb-2 tracking-widest" style={{ color: '#9b7dd4' }}>
          카드의 조언
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: '#d4c5f0' }}>
          {data.advice}
        </p>
      </motion.div>

      {/* Action items */}
      {data.actionItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-2"
        >
          <p className="text-[11px] font-bold tracking-widest" style={{ color: '#d4af37aa' }}>
            이번 주 작은 실험 📝
          </p>
          {data.actionItems.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-[12px] px-3 py-2.5"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
            >
              <span className="text-[14px] mt-0.5 flex-shrink-0">✦</span>
              <p className="text-[12px] leading-snug" style={{ color: '#c8b8f0' }}>{item}</p>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
