'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LunaThoughtBubbleProps {
  thought: string;
}

export default function LunaThoughtBubble({ thought }: LunaThoughtBubbleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => obs.disconnect();
  }, []);

  // ── 다크/라이트 토큰 ─────────────────────────────
  const cloudBg    = isDark ? 'rgba(52, 20, 82, 0.97)'  : '#f3e8ff';
  const textColor  = isDark ? 'rgba(220, 180, 255, 0.92)' : 'rgba(109, 40, 217, 0.90)';
  const labelColor = isDark ? 'rgba(192, 132, 252, 0.52)' : 'rgba(168, 85, 247, 0.48)';
  const shadowOut  = isDark
    ? 'drop-shadow(0 0 1.4px rgba(200,140,255,0.55)) drop-shadow(0 6px 18px rgba(140,60,220,0.18))'
    : 'drop-shadow(0 0 1.4px rgba(167,107,220,0.48)) drop-shadow(0 6px 18px rgba(168,85,247,0.10))';
  const innerGlow  = isDark
    ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
    : 'inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -1px 0 rgba(200,150,255,0.06)';

  // ── 구름 범프 위치 (210px 고정 컨테이너 기준) ──
  const bumps: { w: number; h: number; top: number; left: number }[] = [
    { w: 38, h: 38, top: -18, left:  8 },
    { w: 48, h: 48, top: -24, left: 50 },
    { w: 40, h: 40, top: -19, left: 108 },
    { w: 32, h: 32, top: -14, left: 162 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.72, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.86, y: 8, transition: { duration: 0.22, ease: 'easeIn' } }}
      transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '7px',
        marginBottom: '2px',
        paddingLeft: '2px',
      }}
    >
      {/* ── 루나 아바타 ───────────────────────────── */}
      <motion.div
        animate={{ rotate: [-5, 5, -5] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f0abfc 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(168,85,247,0.30)',
          alignSelf: 'flex-end',
          marginBottom: 22, // 트레일 오브 높이만큼 올림
        }}
      >
        🌙
      </motion.div>

      {/* ── 구름 + 트레일 열 ────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>

        {/* ── 구름 말풍선 ─────────────────────────── */}
        <motion.div
          animate={{ y: [-1.8, 1.8, -1.8] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            // drop-shadow 가 bumps+body 실루엣 전체를 하나의 윤곽선으로 감쌈
            filter: shadowOut,
            // 범프가 위로 튀어나오므로 clipping 방지를 위한 padding-top
            paddingTop: 26,
          }}
        >
          <div style={{ position: 'relative', width: 210 }}>

            {/* 구름 범프들 */}
            {bumps.map((b, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: b.w,
                  height: b.h,
                  borderRadius: '50%',
                  background: cloudBg,
                  top: b.top,
                  left: b.left,
                }}
              />
            ))}

            {/* 구름 본체 */}
            <div
              style={{
                background: cloudBg,
                borderRadius: 22,
                padding: '14px 18px 16px',
                position: 'relative',
                zIndex: 1,
                boxShadow: innerGlow,
              }}
            >
              {/* 라벨 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 7,
                }}
              >
                <motion.span
                  animate={{ rotate: [0, 18, -12, 18, 0] }}
                  transition={{
                    duration: 3.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    repeatDelay: 1.8,
                  }}
                  style={{ fontSize: 12, display: 'inline-block', lineHeight: 1 }}
                >
                  💭
                </motion.span>
                <span
                  style={{
                    fontSize: 9,
                    color: labelColor,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  루나의 생각
                </span>
              </div>

              {/* 생각 텍스트 */}
              <motion.p
                animate={{ opacity: [0.80, 1, 0.80] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: textColor,
                  lineHeight: 1.62,
                  wordBreak: 'keep-all',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                }}
              >
                {thought}
              </motion.p>
            </div>
          </div>
        </motion.div>

        {/* ── 트레일 오브 (아바타 → 구름 연결) ──────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            paddingLeft: 18,
            marginTop: 4,
          }}
        >
          {[
            { size: 6,  delay: 0    },
            { size: 9,  delay: 0.22 },
            { size: 13, delay: 0.44 },
          ].map(({ size, delay }, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.28, 0.72, 0.28], scale: [0.88, 1.08, 0.88] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay,
              }}
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: isDark
                  ? 'linear-gradient(135deg, #c084fc, #7c3aed)'
                  : 'linear-gradient(135deg, #e879f9, #a855f7)',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
