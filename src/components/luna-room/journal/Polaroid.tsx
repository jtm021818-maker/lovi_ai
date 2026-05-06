'use client';

/**
 * v114 — 단일 폴라로이드 카드.
 * MomentStrip 의 빌딩 블록.
 */

import { motion } from 'framer-motion';
import { BOND_TOKENS, NUMERIC_FONT, HANDWRITE_FONT, BOND_EASE } from '@/lib/luna-life/relationship-tokens';

interface Props {
  label: string;        // "함께"
  value: number | string; // 11
  unit?: string;        // "일"
  /** -3, +2, -1.5 같은 기울기 */
  tilt: number;
  /** 폴라로이드 입장 스태거용 인덱스 */
  index: number;
  show: boolean;
}

export default function Polaroid({ label, value, unit, tilt, index, show }: Props) {
  return (
    <motion.div
      initial={{ y: 32, opacity: 0, rotate: tilt - 6 }}
      animate={
        show
          ? { y: 0, opacity: 1, rotate: tilt }
          : { y: 32, opacity: 0, rotate: tilt - 6 }
      }
      transition={{
        delay: 0.4 + index * 0.12,
        duration: 0.42,
        ease: BOND_EASE.polaroidSlide,
      }}
      style={{
        width: 92,
        background: '#FFFFFF',
        padding: '8px 6px 6px',
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(45,32,19,0.16), 0 1px 2px rgba(45,32,19,0.08)',
      }}
    >
      {/* 사진 영역 — 살짝 그라디언트로 빈티지 사진처럼 */}
      <div
        style={{
          height: 64,
          borderRadius: 1,
          background: 'linear-gradient(135deg, #F4E4C9, #E8D2A8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: BOND_TOKENS.ink,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: NUMERIC_FONT,
            lineHeight: 1,
            letterSpacing: -0.5,
          }}
        >
          {value}
          {unit && (
            <span
              style={{
                fontSize: 11,
                marginLeft: 1,
                fontWeight: 600,
                color: BOND_TOKENS.inkSoft,
                fontFamily: HANDWRITE_FONT,
              }}
            >
              {unit}
            </span>
          )}
        </div>
      </div>
      {/* 캡션 */}
      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          textAlign: 'center',
          color: BOND_TOKENS.inkSoft,
          fontFamily: HANDWRITE_FONT,
          lineHeight: 1,
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}
