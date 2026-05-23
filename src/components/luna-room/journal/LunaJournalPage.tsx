'use client';

/**
 * v117 — 루나 관계 페이지 풀 리디자인.
 *
 * 계획서: docs/v117-relationship-redesign-plan.md
 * 컨셉: "키우는 캐릭터 시트" — Princess Maker / Stardew / 러브앤딥스페이스 영감.
 *
 * 섹션 5종:
 *  1. 헤더 (D+N 카운터 + 레벨 도장)
 *  2. 메인 위젯 (식물 화분 + 루나 캐릭터 카드 2단)
 *  3. 데일리 일기 카드
 *  4. 기억 앨범 (5슬롯 폴라로이드)
 *  5. 해금 뱃지 (Persona 5 스타일)
 *
 * 이미지 미배포 시: emoji fallback 으로 동작. 이미지 swap-in only 으로 완성.
 */

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { BOND_TOKENS, HANDWRITE_FONT, NUMERIC_FONT } from '@/lib/luna-life/relationship-tokens';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';
import LevelStamp from './LevelStamp';
import PetalFlower from './PetalFlower';
import GateOpenMoment from './GateOpenMoment';
import NicknameSection from './NicknameSection';
import {
  SEED_LABEL,
  SEED_HINT,
  FEATURE_UNLOCKS,
  partitionUnlocks,
  type FeatureUnlock,
} from './level-unlocks';

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
  /** 페르소나 — 메모리 fetch 시 필터 */
  persona?: 'luna' | 'tarot';
}

export default function LunaJournalPage({ data, show, persona = 'luna' }: Props) {
  const stampPlayedRef = useRef(false);

  // 사운드/햅틱 인트로
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

  // v118.3: 우리의 기억(MemoryAlbum) + 일일 일기 둘 다 제거.
  // 빈 슬롯이 시각적 노이즈였음. NicknameSection 이 새 시각 앵커로 격상.

  const isSeed = data.daysSinceFirst === 0 && data.totalSessions === 0;
  const isMax = data.level >= 5;
  const stageLabel = isSeed ? SEED_LABEL : data.levelLabel;
  const depthHint = isSeed ? SEED_HINT : data.depthHint;
  const { unlocked, nextLocked } = partitionUnlocks(data.level);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 440,
        margin: '0 auto',
        padding: '14px 16px 32px',
        background: BOND_TOKENS.paper,
        borderRadius: 16,
        boxShadow: `0 4px 24px ${BOND_TOKENS.paperGrain}, 0 1px 4px rgba(45,32,19,0.06)`,
      }}
    >
      {/* 종이 그레인 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.06,
          mixBlendMode: 'overlay',
          borderRadius: 16,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>\")",
        }}
      />

      {/* 워시테이프 좌상 */}
      <motion.div
        initial={{ y: -10, opacity: 0, rotate: -8 }}
        animate={show ? { y: 0, opacity: 0.92, rotate: -3 } : { y: -10, opacity: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 18 }}
        style={{
          position: 'absolute', top: -8, left: 22,
          width: 64, height: 18, borderRadius: 1,
          background: `repeating-linear-gradient(45deg, ${BOND_TOKENS.washiPurple}, ${BOND_TOKENS.washiPurple} 6px, ${BOND_TOKENS.washiPurple}cc 6px, ${BOND_TOKENS.washiPurple}cc 12px)`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
        }}
      />

      {/* 도장 — 우상 */}
      <div style={{ position: 'absolute', top: 14, right: 16, zIndex: 5 }}>
        <LevelStamp level={data.level} levelName={data.levelName} show={show} delay={900} isMax={isMax} />
      </div>

      {/* ── 1. 헤더 ─────────────────────────────────────────── */}
      <Header
        show={show}
        daysSinceFirst={data.daysSinceFirst}
        consecutiveDays={data.consecutiveDays}
      />

      {/* ── 2. 메인 위젯 (캐릭터 카드 — 풀폭, v118.1 화분/일지 제거) ────── */}
      <CharacterCard
        show={show}
        data={data}
        stageLabel={stageLabel}
        depthHint={depthHint}
      />

      {/* ── 3. 별명 (v115.7→v118.3 메인 시각 앵커) ───────────── */}
      {persona === 'luna' && <NicknameSection show={show} />}

      {/* ── 5. 해금 뱃지 ────────────────────────────────────── */}
      <UnlockBadges show={show} unlocked={unlocked} nextLocked={nextLocked} />

      {/* ── 6. 진행도 ───────────────────────────────────────── */}
      <ProgressFootnote show={show} percent={data.progressPercent} />

      {/* 🆕 v117: 소프트 게이트 — Lv 3 진입 시 "마음 더 열기" 모먼트 */}
      <GateOpenMoment
        avgScore={data.avgScore}
        level={data.level}
        persona={persona}
      />
    </div>
  );
}

// ============================================================
// 1. 헤더
// ============================================================
function Header({
  show,
  daysSinceFirst,
  consecutiveDays,
}: {
  show: boolean;
  daysSinceFirst: number;
  consecutiveDays: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      style={{
        marginTop: 6,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
        paddingRight: 70,
      }}
    >
      <div>
        <div style={{ fontFamily: HANDWRITE_FONT, fontSize: 22, color: BOND_TOKENS.ink, lineHeight: 1 }}>
          루나와 우리
        </div>
        <div
          style={{
            fontSize: 11, color: BOND_TOKENS.inkSoft, fontFamily: NUMERIC_FONT,
            letterSpacing: '0.1em', marginTop: 3, opacity: 0.7,
          }}
        >
          our little journal
        </div>
      </div>
      {/* D+N 카운터 */}
      <div
        style={{
          display: 'flex', alignItems: 'baseline', gap: 4,
          padding: '4px 10px',
          background: 'rgba(255,253,247,0.85)',
          border: `1px dashed ${BOND_TOKENS.inkSoft}66`,
          borderRadius: 8,
        }}
      >
        <span style={{ fontFamily: HANDWRITE_FONT, fontSize: 12, color: BOND_TOKENS.inkSoft }}>D+</span>
        <span
          style={{
            fontFamily: NUMERIC_FONT, fontWeight: 700, fontSize: 16,
            color: BOND_TOKENS.ink, fontVariantNumeric: 'tabular-nums',
          }}
        >
          {daysSinceFirst}
        </span>
        {consecutiveDays > 1 && (
          <span style={{ fontFamily: HANDWRITE_FONT, fontSize: 11, color: '#c4886f', marginLeft: 4 }}>
            🔥 {consecutiveDays}일 연속
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// 2-A. 화분 카드 (식물 성장 비주얼)
// ============================================================
// v118.3: 캐릭터 카드 임팩트 강화 — 헤드라인급 스테이지 라벨 + 장식 액센트.
// "확 안 들어와" 피드백 반영: 큰 핵심 문장 / 4축 페탈 / 그라데이션 액센트 / 반짝 데코.
function CharacterCard({
  show, data, stageLabel, depthHint,
}: {
  show: boolean;
  data: JournalData;
  stageLabel: string;
  depthHint: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ delay: 0.5, duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
      style={{
        position: 'relative',
        padding: '20px 18px 22px',
        marginBottom: 18,
        background:
          'linear-gradient(150deg, #fff7ec 0%, #fdebd8 45%, #fbd6e2 100%)',
        border: '1.5px solid rgba(225,168,170,0.35)',
        borderRadius: 18,
        boxShadow:
          '0 6px 18px rgba(196,114,124,0.12), 0 2px 4px rgba(120,80,40,0.06), inset 0 0 0 1px rgba(255,255,255,0.5)',
        overflow: 'hidden',
      }}
    >
      {/* 배경 데코 — 반짝 별 1 */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={show ? { opacity: 0.7, scale: 1 } : { opacity: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        style={{
          position: 'absolute',
          top: 14, right: 24,
          fontSize: 16,
          color: '#e0a4ad',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
          transform: 'rotate(-8deg)',
        }}
      >
        ✦
      </motion.div>
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={show ? { opacity: 0.55, scale: 1 } : { opacity: 0 }}
        transition={{ delay: 1.05, duration: 0.6 }}
        style={{
          position: 'absolute',
          bottom: 18, right: 18,
          fontSize: 11,
          color: '#d68694',
          transform: 'rotate(14deg)',
        }}
      >
        ✦
      </motion.div>

      {/* 작은 라벨 — "지금 우리는" */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
          padding: '3px 10px 4px',
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(225,168,170,0.4)',
          borderRadius: 999,
          fontFamily: HANDWRITE_FONT, fontSize: 11,
          color: '#a85e6f', letterSpacing: '0.04em',
        }}
      >
        <span style={{ fontSize: 10 }}>🌷</span>
        지금 우리는
      </div>

      {/* 메인 헤드라인 — 스테이지 라벨 (큰 손글씨) */}
      <div
        style={{
          fontFamily: HANDWRITE_FONT,
          fontSize: 26,
          color: '#5a2a3a',
          lineHeight: 1.18,
          fontWeight: 700,
          marginBottom: 6,
          letterSpacing: '-0.01em',
          textShadow: '0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        "{stageLabel}"
      </div>

      {/* 부제 — depthHint */}
      <div
        style={{
          fontFamily: HANDWRITE_FONT, fontSize: 12.5,
          color: 'rgba(120,60,70,0.78)',
          lineHeight: 1.5, marginBottom: 14,
        }}
      >
        {depthHint}
      </div>

      {/* 페탈 + 4축 라벨 — 카드 하단 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '110px 1fr',
          gap: 12,
          alignItems: 'center',
          padding: '12px 10px 6px',
          background: 'rgba(255,255,255,0.4)',
          borderRadius: 14,
          border: '1px dashed rgba(225,168,170,0.45)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 100, height: 100 }}>
            <PetalFlower
              trust={data.trust}
              openness={data.openness}
              bond={data.bond}
              respect={data.respect}
              show={show}
              delay={760}
            />
          </div>
        </div>

        {/* 4축 미니 칩 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <AxisChip label="신뢰" value={data.trust} color="#e0938d" />
          <AxisChip label="개방" value={data.openness} color="#c98ab8" />
          <AxisChip label="유대" value={data.bond} color="#d6a26c" />
          <AxisChip label="존경" value={data.respect} color="#7c9c8a" />
        </div>
      </div>
    </motion.div>
  );
}

function AxisChip({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 26, fontFamily: HANDWRITE_FONT, fontSize: 10.5,
          color: '#7a4a55', flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1, height: 6, borderRadius: 999,
          background: 'rgba(160,90,100,0.10)',
          overflow: 'hidden', position: 'relative',
        }}
      >
        <div
          style={{
            width: `${pct}%`, height: '100%',
            background: `linear-gradient(90deg, ${color}b3, ${color})`,
            borderRadius: 999,
            transition: 'width 600ms cubic-bezier(0.22,0.61,0.36,1)',
          }}
        />
      </div>
      <span
        style={{
          width: 24,
          fontFamily: NUMERIC_FONT, fontSize: 10,
          color: '#7a4a55', opacity: 0.7,
          textAlign: 'right', fontVariantNumeric: 'tabular-nums',
        }}
      >
        {Math.round(pct)}
      </span>
    </div>
  );
}

// ============================================================
// 4. 해금 뱃지  (v118.3: MemoryAlbum/PolaroidSlot 제거)
// ============================================================
function UnlockBadges({
  show, unlocked, nextLocked,
}: {
  show: boolean;
  unlocked: FeatureUnlock[];
  nextLocked: FeatureUnlock[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ delay: 1.0, duration: 0.5 }}
      style={{ marginBottom: 6 }}
    >
      <div
        style={{
          fontFamily: HANDWRITE_FONT, fontSize: 13, color: BOND_TOKENS.ink,
          marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        🎁 해금한 것
        <span style={{ fontSize: 10, color: BOND_TOKENS.inkSoft, opacity: 0.7 }}>
          {unlocked.length}/{FEATURE_UNLOCKS.length}
        </span>
      </div>

      <div
        style={{
          padding: '10px 12px',
          background: 'linear-gradient(180deg, #fdf6ec 0%, #f5e8d3 100%)',
          border: '1px solid rgba(196,136,111,0.18)',
          borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}
      >
        {unlocked.map(f => (
          <UnlockRow key={f.id} feature={f} state="unlocked" />
        ))}
        {nextLocked.map(f => (
          <UnlockRow key={f.id} feature={f} state="next" />
        ))}
      </div>
    </motion.div>
  );
}

function UnlockRow({
  feature, state,
}: {
  feature: FeatureUnlock;
  state: 'unlocked' | 'next';
}) {
  const isUnlocked = state === 'unlocked';
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        opacity: isUnlocked ? 1 : 0.55,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 22, height: 22,
          borderRadius: 4,
          background: isUnlocked ? 'rgba(34,139,84,0.12)' : 'rgba(124,87,56,0.10)',
          border: `1px solid ${isUnlocked ? 'rgba(34,139,84,0.35)' : 'rgba(124,87,56,0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
        }}
      >
        {isUnlocked ? '✓' : feature.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: HANDWRITE_FONT, fontSize: 12.5, color: BOND_TOKENS.ink,
            lineHeight: 1.2,
          }}
        >
          {feature.title}
          {!isUnlocked && (
            <span style={{ fontSize: 9.5, marginLeft: 5, color: BOND_TOKENS.inkSoft, opacity: 0.75 }}>
              · Lv {feature.level} 해금
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: HANDWRITE_FONT, fontSize: 10.5, color: BOND_TOKENS.inkSoft,
            opacity: 0.85, lineHeight: 1.25,
          }}
        >
          {feature.detail}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 6. 진행도 (식물 옆 마이크로 정보)
// ============================================================
function ProgressFootnote({ show, percent }: { show: boolean; percent: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={show ? { opacity: 1 } : { opacity: 0 }}
      transition={{ delay: 1.15, duration: 0.4 }}
      style={{
        marginTop: 12,
        textAlign: 'center',
        fontFamily: HANDWRITE_FONT, fontSize: 10.5,
        color: BOND_TOKENS.inkSoft, opacity: 0.7,
      }}
    >
      다음 단계까지 — {Math.round(percent)}% 자랐어
    </motion.div>
  );
}
