'use client';

import { motion } from 'framer-motion';
import type { PhaseEvent } from '@/types/engine.types';

interface Props {
  event: PhaseEvent;
  onSelect: (text: string, meta?: any) => void;
  disabled?: boolean;
}

interface LetterData {
  letter?: string;
  footerLine?: string;
  // 레거시
  keyInsights?: string[];
  lunaMessage?: string;
}

export default function SessionSummary({ event, onSelect, disabled }: Props) {
  const data = event.data as LetterData;

  const letter = data.letter?.trim();
  const hasLetter = !!letter;
  const footerLine = data.footerLine ?? '이거 붙여놓고 가 💜';

  const legacyBody = hasLetter
    ? null
    : (() => {
        const insights = data.keyInsights ?? [];
        const lunaMsg = data.lunaMessage ?? '';
        const firstLine = insights[0] ? `네가 '${insights[0]}' 이런 부분을 진짜 솔직하게 꺼내줬잖아.` : '';
        return [firstLine, lunaMsg].filter(Boolean).join(' ');
      })();

  const body = letter ?? legacyBody ?? '야 오늘 여기까지 얘기해준 거, 그거 진짜 용기야 💜';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, rotate: -1.2 }}
      animate={{ opacity: 1, y: 0, rotate: -0.6 }}
      transition={{ duration: 0.55, type: 'spring', damping: 20, stiffness: 120 }}
      className="mx-3 mb-4"
    >
      <div className="relative">
        {/* 마스킹 테이프 — 좌상 */}
        <div
          className="absolute -top-2 left-6 w-16 h-5 z-10 rotate-[-6deg] shadow-sm"
          style={{
            background: 'repeating-linear-gradient(45deg, rgba(244,114,182,0.55) 0 4px, rgba(251,191,36,0.4) 4px 8px)',
            borderRadius: 2,
          }}
        />
        {/* 마스킹 테이프 — 우하 */}
        <div
          className="absolute -bottom-2 right-8 w-14 h-4 z-10 rotate-[8deg] shadow-sm"
          style={{
            background: 'repeating-linear-gradient(45deg, rgba(244,114,182,0.5) 0 4px, rgba(251,191,36,0.35) 4px 8px)',
            borderRadius: 2,
          }}
        />

        {/* 종이 본체 */}
        <div
          className="relative rounded-[22px] overflow-hidden shadow-[0_8px_28px_rgba(180,83,9,0.13)]"
          style={{
            // 줄공책 느낌 — 베이지 크림 + 은은한 수평 라인
            background: `
              linear-gradient(180deg, rgba(255,252,245,0.98) 0%, rgba(254,247,232,0.97) 100%),
              repeating-linear-gradient(0deg, transparent 0 26px, rgba(194,148,92,0.08) 26px 27px)
            `,
            backgroundBlendMode: 'multiply',
            border: '1px solid rgba(194,148,92,0.22)',
          }}
        >
          {/* 상단 루나 + 타이틀 라인 */}
          <div className="flex items-center gap-2 px-5 pt-5 pb-1">
            <div
              className="w-9 h-9 flex-shrink-0 overflow-hidden bg-white"
              style={{
                borderRadius: '50% 42% 58% 48% / 58% 50% 42% 52%',
                border: '1.5px solid rgba(244,114,182,0.55)',
                boxShadow: '0 2px 6px rgba(251,113,133,0.18)',
              }}
            >
              <img src="/char_img/luna_1_event.webp" alt="루나" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[13px] text-[#6b4a2b] leading-tight"
                style={{ fontFamily: 'var(--font-gaegu), Gaegu, "Nanum Pen Script", cursive', fontWeight: 700 }}
              >
                루나가 놓고 가는 쪽지
              </div>
              <div className="text-[10px] text-[#a0784b]/90 tracking-tight">
                오늘 너한테 하고 싶은 말
              </div>
            </div>
            {/* 별 장식 */}
            <motion.span
              animate={{ rotate: [0, 10, -6, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="text-sm text-[#e8a43e] drop-shadow-sm"
            >
              ✦
            </motion.span>
          </div>

          {/* 본문 쪽지 — 손글씨 톤 */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-5 pt-2 pb-5"
          >
            <p
              className="text-[17px] text-[#4b3418] leading-[1.85] whitespace-pre-line"
              style={{
                fontFamily: 'var(--font-gaegu), Gaegu, "Nanum Pen Script", "Apple SD Gothic Neo", cursive',
                fontWeight: 400,
                letterSpacing: '-0.2px',
              }}
            >
              {body}
            </p>
          </motion.div>

          {/* 하단 signature line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="px-5 pb-4 flex items-center justify-between gap-2"
          >
            <span
              className="text-[12px] text-[#a0784b]"
              style={{ fontFamily: 'var(--font-gaegu), Gaegu, cursive', fontWeight: 700 }}
            >
              — 루나 🦊
            </span>
            <span
              className="text-[11px] text-[#c08b5c]/90 italic"
              style={{ fontFamily: 'var(--font-gaegu), Gaegu, cursive' }}
            >
              {footerLine}
            </span>
          </motion.div>

          {/* ✨ 세션 종료 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="px-5 pb-5 pt-0"
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.025 }}
              disabled={disabled}
              onClick={() => onSelect('루나야 오늘 고마워 💜', { source: 'session_summary_end' })}
              className="w-full relative overflow-hidden rounded-[18px] py-3.5 text-white text-[14.5px] font-bold tracking-wide disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #f9a8d4 0%, #c084fc 55%, #818cf8 100%)',
                boxShadow: '0 6px 22px rgba(192,132,252,0.42), 0 2px 8px rgba(249,168,212,0.3)',
              }}
            >
              {/* 흐르는 반짝이 shimmer */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ x: ['-110%', '110%'] }}
                transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)',
                }}
              />
              {/* 반짝이 파티클 */}
              <motion.span
                className="absolute top-2 left-5 text-[11px] opacity-80"
                animate={{ opacity: [0.5, 1, 0.5], y: [0, -2, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
              >✦</motion.span>
              <motion.span
                className="absolute bottom-2 right-6 text-[9px] opacity-70"
                animate={{ opacity: [0.4, 0.9, 0.4], y: [0, -2, 0] }}
                transition={{ duration: 2.1, repeat: Infinity, delay: 0.9 }}
              >✦</motion.span>
              <span className="relative z-10">루나야 오늘 고마워 ✨💜</span>
            </motion.button>
          </motion.div>

          {/* 종이 모서리 fold 장식 */}
          <div
            className="absolute bottom-0 right-0 w-7 h-7 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, rgba(194,148,92,0.14) 50%)',
              borderTopLeftRadius: 8,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
