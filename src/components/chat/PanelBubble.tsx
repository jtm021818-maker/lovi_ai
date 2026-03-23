'use client';

import { motion } from 'framer-motion';
import type { PanelResponse } from '@/types/persona.types';

interface PanelBubbleProps {
  panel: PanelResponse;
}

const PANEL_MEMBERS = [
  {
    key: 'counselor' as const,
    icon: '💜',
    label: '공감 상담사',
    barColor: 'bg-purple-400',
    bgColor: 'bg-purple-50/50',
  },
  {
    key: 'analyst' as const,
    icon: '🔍',
    label: '분석가',
    barColor: 'bg-blue-400',
    bgColor: 'bg-blue-50/50',
  },
  {
    key: 'coach' as const,
    icon: '🎯',
    label: '코치',
    barColor: 'bg-emerald-400',
    bgColor: 'bg-emerald-50/50',
  },
];

/**
 * 3인 전문가 패널 메시지 버블
 * 순차 펼침 애니메이션 + 좌측 컬러 바
 */
export default function PanelBubble({ panel }: PanelBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex justify-start mb-4"
    >
      {/* AI 아바타 */}
      <div className="relative mr-2 mt-1 flex-shrink-0">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center shadow-sm"
        >
          <span className="text-sm">🧑‍🔬</span>
        </motion.div>
      </div>

      {/* 패널 카드 */}
      <div className="max-w-[85%] rounded-[18px] overflow-hidden bg-white border border-gray-100 shadow-sm">
        {PANEL_MEMBERS.map((member, i) => {
          const message = panel[member.key]?.message;
          if (!message) return null;

          return (
            <motion.div
              key={member.key}
              initial={{ opacity: 0, x: -10, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              transition={{
                delay: 0.15 + i * 0.2,
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className={`flex ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              {/* 왼쪽 컬러 바 */}
              <div className={`w-1 ${member.barColor} flex-shrink-0`} />

              {/* 내용 */}
              <div className={`flex-1 px-4 py-3 ${member.bgColor}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">{member.icon}</span>
                  <span className="text-[11px] font-semibold text-gray-500">{member.label}</span>
                </div>
                <p className="text-[14px] leading-[1.6] text-gray-700 whitespace-pre-wrap">
                  {message}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
