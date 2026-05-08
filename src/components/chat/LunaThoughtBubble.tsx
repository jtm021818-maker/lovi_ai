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
  const shadowCol = isDark ? 'rgba(201,168,124,0.15)' : 'rgba(61,44,30,0.15)';
  const shadowCol2 = isDark ? 'rgba(201,168,124,0.06)' : 'rgba(61,44,30,0.06)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4, transition: { duration: 0.15, ease: 'easeIn' } }}
      transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        marginBottom: '4px',
        paddingLeft: '4px',
      }}
    >
      {/* 낙서체 wobble 필터 — 손으로 그린 테두리 */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden>
        <defs>
          <filter id="luna-sketch-wobble" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="turbulence" baseFrequency="0.042" numOctaves="3" seed={17} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* 루나 아바타 */}
      <motion.div
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f0abfc 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
          alignSelf: 'flex-end',
          boxShadow: '0 2px 8px rgba(168,85,247,0.28)',
        }}
      >
        🌙
      </motion.div>

      {/* 낙서체 말풍선 */}
      <motion.div
        animate={{ rotate: [-1.1, -0.7, -1.1] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative' }}
      >
        <div
          style={{
            position: 'relative',
            background: bg,
            // 모서리마다 다른 반지름 = 손 그림 느낌
            borderRadius: '14px 19px 16px 13px / 13px 15px 18px 12px',
            border: `2px solid ${borderCol}`,
            padding: '9px 13px 10px',
            maxWidth: '195px',
            boxShadow: `2px 3px 0 ${shadowCol}, 4px 5px 0 ${shadowCol2}`,
            filter: 'url(#luna-sketch-wobble)',
          }}
        >
          {/* 말풍선 꼬리 — 테두리 색 삼각형 */}
          <div
            style={{
              position: 'absolute',
              bottom: -11,
              left: 14,
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: `11px solid ${borderCol}`,
            }}
          />
          {/* 말풍선 꼬리 — 배경 색 삼각형 (내부 채우기) */}
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              left: 16,
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `8px solid ${bg}`,
            }}
          />

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
        </div>
      </motion.div>
    </motion.div>
  );
}
