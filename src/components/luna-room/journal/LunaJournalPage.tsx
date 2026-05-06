'use client';

/**
 * v114 — 루나 관계 일지 페이지 본체.
 *
 * 컨셉: 여행 일지 / 폴라로이드 스크랩북.
 * cream paper + 워시테이프 + 폴라로이드 스트립 + 도장 + 페탈 차트 + 손글씨 카피.
 */

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { BOND_TOKENS, HANDWRITE_FONT, NUMERIC_FONT } from '@/lib/luna-life/relationship-tokens';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';
import MomentStrip from './MomentStrip';
import PetalFlower from './PetalFlower';
import LevelStamp from './LevelStamp';
import BondStageCaption from './BondStageCaption';
import InkBar from './InkBar';
import { SEED_LABEL, SEED_HINT } from './level-unlocks';

export interface JournalData {
  level: number;
  levelName: string;
  levelLabel: string;
  depthHint: string;
  trust: number;
  openness: number;
  bond: number;
  respect: number;
  avgScore: number;
  progressPercent: number;
  daysSinceFirst: number;
  totalSessions: number;
  consecutiveDays: number;
}

interface Props {
  data: JournalData;
  show: boolean;
}

export default function LunaJournalPage({ data, show }: Props) {
  const stampPlayedRef = useRef(false);

  useEffect(() => {
    if (show && !stampPlayedRef.current) {
      stampPlayedRef.current = true;
      const t1 = setTimeout(() => {
        triggerHaptic('light');
        playSound('paper');
      }, 50);
      const t2 = setTimeout(() => {
        triggerHaptic('medium');
        playSound('sparkle');
      }, 950);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [show]);

  const isSeed = data.daysSinceFirst === 0 && data.totalSessions === 0;
  const isMax = data.level >= 5;
  const stageLabel = isSeed ? SEED_LABEL : data.levelLabel;
  const depthHint = isSeed ? SEED_HINT : data.depthHint;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        margin: '0 auto',
        padding: '12px 18px 28px',
        background: BOND_TOKENS.paper,
        borderRadius: 14,
        boxShadow: `0 4px 24px ${BOND_TOKENS.paperGrain}, 0 1px 4px rgba(45,32,19,0.06)`,
      }}
    >
      {/* 종이 그레인 텍스처 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.06,
          mixBlendMode: 'overlay',
          borderRadius: 14,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>\")",
        }}
      />

      {/* 워시테이프 #1 — 좌상 */}
      <motion.div
        initial={{ y: -10, opacity: 0, rotate: -8 }}
        animate={show ? { y: 0, opacity: 0.92, rotate: -3 } : { y: -10, opacity: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 18 }}
        style={{
          position: 'absolute',
          top: -8,
          left: 22,
          width: 64,
          height: 18,
          borderRadius: 1,
          background: `repeating-linear-gradient(45deg, ${BOND_TOKENS.washiPurple}, ${BOND_TOKENS.washiPurple} 6px, ${BOND_TOKENS.washiPurple}cc 6px, ${BOND_TOKENS.washiPurple}cc 12px)`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
        }}
      />
      {/* 워시테이프 #2 — 우하 */}
      <motion.div
        initial={{ y: 10, opacity: 0, rotate: 12 }}
        animate={show ? { y: 0, opacity: 0.85, rotate: 5 } : { y: 10, opacity: 0 }}
        transition={{ delay: 0.45, type: 'spring', stiffness: 260, damping: 18 }}
        style={{
          position: 'absolute',
          bottom: -6,
          right: 28,
          width: 56,
          height: 16,
          borderRadius: 1,
          background: BOND_TOKENS.washiPeach,
          boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
        }}
      />

      {/* 도장 — 우상 */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 16,
          zIndex: 5,
        }}
      >
        <LevelStamp
          level={data.level}
          levelName={data.levelName}
          show={show}
          delay={900}
          isMax={isMax}
        />
      </div>

      {/* 페이지 타이틀 (좌상, 도장과 분리) */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        style={{
          fontFamily: HANDWRITE_FONT,
          fontSize: 22,
          color: BOND_TOKENS.ink,
          marginTop: 6,
          marginBottom: 14,
          lineHeight: 1,
        }}
      >
        루나와 함께
        <span
          style={{
            display: 'block',
            fontSize: 11,
            color: BOND_TOKENS.inkSoft,
            fontFamily: NUMERIC_FONT,
            letterSpacing: '0.1em',
            marginTop: 2,
            opacity: 0.75,
          }}
        >
          our little journal
        </span>
      </motion.div>

      {/* 폴라로이드 스트립 */}
      <div style={{ marginBottom: 16 }}>
        <MomentStrip
          daysSinceFirst={data.daysSinceFirst}
          totalSessions={data.totalSessions}
          consecutiveDays={data.consecutiveDays}
          show={show}
        />
      </div>

      {/* 페탈 꽃 차트 */}
      <div style={{ marginBottom: 8 }}>
        <PetalFlower
          trust={data.trust}
          openness={data.openness}
          bond={data.bond}
          respect={data.respect}
          show={show}
          delay={920}
        />
      </div>

      {/* 단계 카피 + depthHint + 다음 unlock */}
      <div style={{ marginBottom: 18 }}>
        <BondStageCaption
          level={data.level}
          levelLabel={stageLabel}
          depthHint={depthHint}
          show={show}
        />
      </div>

      {/* 진행도 바 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: BOND_TOKENS.inkSoft,
            fontFamily: NUMERIC_FONT,
          }}
        >
          <span>다음 단계까지</span>
          <span style={{ fontWeight: 700, color: BOND_TOKENS.ink, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(data.progressPercent)}%
          </span>
        </div>
        <InkBar percent={data.progressPercent} show={show} delay={1500} />
      </div>
    </div>
  );
}
