'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LunaThoughtBubbleProps {
  thought: string;
}

export default function LunaThoughtBubble({ thought }: LunaThoughtBubbleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const bg = isDark ? '#2a1a10' : '#FFFDF5';
  const borderCol = isDark ? '#c9a87c' : '#3d2c1e';
  const textCol = isDark ? '#f0e0c8' : '#3d2c1e';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4, transition: { duration: 0.15, ease: 'easeIn' } }}
      transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        marginBottom: '4px',
        paddingLeft: '4px',
      }}
    >
      {/* 루나 프로필 — MessageBubble과 동일 */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid #EACbb3',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <img
          src="/luna_fox_transparent.webp"
          alt="루나"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* 생각 연결 도트 3개 — 만화 생각 말풍선 꼬리 */}
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: borderCol, opacity: 0.38, flexShrink: 0 }} />
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: borderCol, opacity: 0.55, flexShrink: 0 }} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: borderCol, opacity: 0.72, flexShrink: 0 }} />

      {/* 만화 생각 말풍선 — 구름 타원형 */}
      <motion.div
        animate={{ y: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: bg,
          border: `2px solid ${borderCol}`,
          /* 불규칙 타원 — 구름 느낌 */
          borderRadius: '28px 34px 30px 26px / 26px 30px 34px 28px',
          padding: '9px 14px 10px',
          maxWidth: '185px',
          boxShadow: isDark
            ? '2px 3px 0 rgba(201,168,124,0.12)'
            : '2px 3px 0 rgba(61,44,30,0.10)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: textCol,
            lineHeight: 1.55,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            wordBreak: 'keep-all',
            whiteSpace: 'pre-wrap',
          }}
        >
          {thought}
        </p>
      </motion.div>
    </motion.div>
  );
}
