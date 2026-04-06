'use client';

import { motion } from 'framer-motion';
import type { PhaseEvent } from '@/types/engine.types';

interface Props {
  event: PhaseEvent;
  onSelect: (text: string, meta?: any) => void;
  disabled?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  behavior: '행동 실험',
  observe: '관찰 과제',
  selfcare: '자기돌봄',
};

export default function HomeworkCard({ event, onSelect, disabled }: Props) {
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
          <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center">
            <span className="text-lg">📝</span>
          </div>
          <h3 className="text-[14px] font-bold text-[#5D4037]">{data.title}</h3>
        </div>

        {/* 숙제 목록 */}
        <div className="px-5 pb-3 space-y-3">
          {(data.homeworks as any[])?.map((hw: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.2 }}
              className="bg-[#FAFAF5] rounded-2xl p-3 border border-[#F0E8D8]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{hw.emoji}</span>
                <span className="text-[11px] font-medium text-[#C08B5C] bg-[#FFF8F0] px-2 py-0.5 rounded-full">
                  {TYPE_LABELS[hw.type] ?? hw.type}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-[#5D4037] mb-0.5">{hw.task}</p>
              <p className="text-[11px] text-[#8D6E63] leading-relaxed">{hw.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* 격려 멘트 */}
        <div className="px-5 pb-3">
          <p className="text-[12px] text-[#8D6E63] italic">{data.encouragement}</p>
        </div>

        {/* 버튼 */}
        <div className="px-5 pb-4 flex gap-2">
          <button
            disabled={disabled}
            onClick={() => onSelect('해볼게!', { source: 'homework_card', context: { accepted: true } })}
            className="flex-1 py-2.5 rounded-xl bg-[#C08B5C] text-white text-[13px] font-semibold shadow-sm disabled:opacity-50"
          >
            해볼게! 💪
          </button>
          <button
            disabled={disabled}
            onClick={() => onSelect('좀 더 얘기하고 싶어', { source: 'homework_card', context: { accepted: false } })}
            className="flex-1 py-2.5 rounded-xl bg-white border border-[#D5C2A5] text-[#5D4037] text-[13px] font-medium disabled:opacity-50"
          >
            좀 더 얘기하고 싶어
          </button>
        </div>
      </div>
    </motion.div>
  );
}
