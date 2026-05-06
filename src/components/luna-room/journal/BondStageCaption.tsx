'use client';

/**
 * v114 — 단계 카피 + 깊이 힌트 + 다음 단계 unlock.
 */

import { motion } from 'framer-motion';
import { BOND_TOKENS, HANDWRITE_FONT, NUMERIC_FONT } from '@/lib/luna-life/relationship-tokens';
import { getNextUnlocks } from './level-unlocks';

interface Props {
  level: number;
  levelLabel: string;   // "이제 막 알아가는 사이"
  depthHint: string;    // "표면적 공감, 따뜻하게 받아주기만"
  show: boolean;
}

export default function BondStageCaption({ level, levelLabel, depthHint, show }: Props) {
  const next = getNextUnlocks(level);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {/* 단계 카피 (italic 손글씨) */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
        transition={{ delay: 1.3, duration: 0.45 }}
        style={{
          textAlign: 'center',
          fontSize: 18,
          color: BOND_TOKENS.ink,
          fontFamily: HANDWRITE_FONT,
          fontStyle: 'italic',
          lineHeight: 1.3,
        }}
      >
        “{levelLabel}”
      </motion.div>

      {/* depthHint — 본문 한 줄 */}
      {depthHint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={show ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1.5, duration: 0.4 }}
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: BOND_TOKENS.inkSoft,
            fontFamily: NUMERIC_FONT,
            lineHeight: 1.5,
            padding: '0 12px',
          }}
        >
          💭 {depthHint}
        </motion.div>
      )}

      {/* 다음 단계 unlock */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.65, duration: 0.4 }}
        style={{
          marginTop: 4,
          padding: '10px 12px',
          background: 'rgba(123,94,167,0.06)',
          border: `1px dashed ${BOND_TOKENS.inkLine}`,
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: BOND_TOKENS.stampInk,
            letterSpacing: '0.18em',
            fontFamily: NUMERIC_FONT,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          ✦ 다음 단계 「{next.nextLevelName}」에서 풀려
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {next.unlocks.slice(0, 3).map((u, i) => (
            <li
              key={i}
              style={{
                fontSize: 13,
                color: BOND_TOKENS.ink,
                fontFamily: HANDWRITE_FONT,
                lineHeight: 1.35,
              }}
            >
              {u}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
