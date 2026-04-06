'use client';

import { motion } from 'framer-motion';
import type { PhaseEvent } from '@/types/engine.types';

interface Props {
  event: PhaseEvent;
  onSelect: (text: string, meta?: any) => void;
  disabled?: boolean;
}

export default function SessionSummary({ event }: Props) {
  const data = event.data as any;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-2 mb-4"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#E8D5B7] shadow-sm overflow-hidden">
        {/* 헤더 */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#FFF3E0] flex items-center justify-center">
            <span className="text-lg">📋</span>
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#5D4037]">{data.title}</h3>
            <p className="text-[11px] text-[#8D6E63]">{data.emotionJourney}</p>
          </div>
        </div>

        {/* 핵심 발견 */}
        <div className="px-5 pb-3">
          <div className="space-y-2">
            {(data.keyInsights as string[])?.map((insight: string, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.15 }}
                className="flex items-start gap-2"
              >
                <span className="text-[12px] mt-0.5 text-[#C08B5C]">✦</span>
                <span className="text-[13px] text-[#5D4037] leading-relaxed">{insight}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 루나 멘트 */}
        <div className="px-5 pb-4">
          <p className="text-[12px] text-[#8D6E63] italic">{data.lunaMessage}</p>
        </div>
      </div>
    </motion.div>
  );
}
