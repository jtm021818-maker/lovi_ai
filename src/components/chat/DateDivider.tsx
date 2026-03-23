'use client';

import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DateDividerProps {
  date: string; // ISO string
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return '오늘';
  if (isYesterday(date)) return '어제';
  return format(date, 'M월 d일', { locale: ko });
}

export default function DateDivider({ date }: DateDividerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0.8 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-center gap-3 my-4 px-2"
    >
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
      <span className="text-[11px] font-medium text-pink-300 tracking-wide whitespace-nowrap px-2">
        {formatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
    </motion.div>
  );
}
