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
import { useEffect, useRef, useState } from 'react';
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
  MEMORY_SLOTS,
  FEATURE_UNLOCKS,
  partitionUnlocks,
  type FeatureUnlock,
  type MemorySlot,
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

interface MemoryRow {
  slot_index: number;
  level: number;
  trigger_type: string;
  llm_caption: string;
  unlocked_at: string;
}

interface Props {
  data: JournalData;
  show: boolean;
  /** 페르소나 — 메모리 fetch 시 필터 */
  persona?: 'luna' | 'tarot';
}

export default function LunaJournalPage({ data, show, persona = 'luna' }: Props) {
  const stampPlayedRef = useRef(false);
  const [memories, setMemories] = useState<MemoryRow[]>([]);

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

  // 기억 카드 fetch — 일일 일기는 루나 편지와 중복이라 v118.1 에서 제거
  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    (async () => {
      try {
        const m = await fetch(`/api/relationship/memories?persona=${persona}`)
          .then((r) => (r.ok ? r.json() : { memories: [] }));
        if (cancelled) return;
        setMemories(m.memories ?? []);
      } catch {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, [show, persona]);

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

      {/* ── 3. 기억 앨범 ────────────────────────────────────── */}
      <MemoryAlbum show={show} memories={memories} currentLevel={data.level} />

      {/* ── 4. 별명 (v115.7) — 루나/타로 공통이지만 luna persona 일 때만 ── */}
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
// v118.1: 캐릭터 카드 — 풀폭으로 재배치 (화분/일지 카드 제거 후 메인 위젯 유일)
//   4축 페탈을 키우고 스테이지 라벨/depthHint 를 좌우 정렬로 균형.
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
      initial={{ opacity: 0, y: 10 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      style={{
        position: 'relative',
        padding: '16px 18px',
        marginBottom: 16,
        background: 'linear-gradient(180deg, #fdf6ec 0%, #f9e9d8 100%)',
        border: '1px solid rgba(196,136,111,0.2)',
        borderRadius: 14,
        boxShadow: '0 3px 10px rgba(120,80,40,0.08)',
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: 14,
        alignItems: 'center',
      }}
    >
      {/* 좌측 — 4축 페탈 */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 120, height: 120 }}>
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

      {/* 우측 — 스테이지 라벨 / depthHint */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div
          style={{
            fontFamily: HANDWRITE_FONT, fontSize: 11, color: BOND_TOKENS.inkSoft,
            opacity: 0.7, letterSpacing: '0.02em',
          }}
        >
          지금 우리는
        </div>
        <div
          style={{
            fontFamily: HANDWRITE_FONT, fontSize: 17, color: BOND_TOKENS.ink,
            lineHeight: 1.25, fontWeight: 600,
          }}
        >
          "{stageLabel}"
        </div>
        <div
          style={{
            fontFamily: HANDWRITE_FONT, fontSize: 11.5, color: BOND_TOKENS.inkSoft,
            opacity: 0.85, lineHeight: 1.45, marginTop: 2,
          }}
        >
          {depthHint}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// 4. 기억 앨범 (5슬롯 폴라로이드)
// ============================================================
function MemoryAlbum({
  show, memories, currentLevel,
}: {
  show: boolean;
  memories: MemoryRow[];
  currentLevel: number;
}) {
  const bySlot = new Map(memories.map(m => [m.slot_index, m]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ delay: 0.85, duration: 0.5 }}
      style={{ marginBottom: 16 }}
    >
      <div
        style={{
          fontFamily: HANDWRITE_FONT, fontSize: 13, color: BOND_TOKENS.ink,
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        📸 우리의 기억
        <span style={{ fontSize: 10, color: BOND_TOKENS.inkSoft, opacity: 0.7, marginLeft: 4 }}>
          {memories.length}/5
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6,
        }}
      >
        {MEMORY_SLOTS.map(slot => {
          const memory = bySlot.get(slot.index);
          const unlocked = !!memory || slot.level <= currentLevel;
          return (
            <PolaroidSlot
              key={slot.index}
              slot={slot}
              memory={memory}
              unlocked={unlocked}
              show={show}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

function PolaroidSlot({
  slot, memory, unlocked, show,
}: {
  slot: MemorySlot;
  memory: MemoryRow | undefined;
  unlocked: boolean;
  show: boolean;
}) {
  const [imgOk, setImgOk] = useState(true);
  const isLocked = !unlocked;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotate: slot.index % 2 ? -2 : 2 }}
      animate={show ? { opacity: 1, scale: 1, rotate: slot.index % 2 ? -1.5 : 1.5 } : { opacity: 0 }}
      transition={{ delay: 0.9 + slot.index * 0.06, duration: 0.4 }}
      style={{
        background: isLocked ? '#f0e6d6' : '#fdf6ec',
        border: `1px solid ${isLocked ? 'rgba(124,87,56,0.18)' : 'rgba(124,87,56,0.28)'}`,
        borderRadius: 3,
        padding: '4px 4px 18px',
        boxShadow: isLocked
          ? '0 1px 3px rgba(120,80,40,0.08)'
          : '0 3px 8px rgba(120,80,40,0.18)',
        position: 'relative',
        aspectRatio: '4 / 5',
        filter: isLocked ? 'grayscale(0.5) opacity(0.55)' : 'none',
      }}
    >
      {/* 사진 영역 */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          background: isLocked
            ? '#d4c2a8'
            : 'linear-gradient(135deg, #f5d6c5, #e8c4ad)',
          borderRadius: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          fontSize: 24,
        }}
      >
        {isLocked ? (
          <span style={{ opacity: 0.45 }}>🔒</span>
        ) : imgOk ? (
          <img
            src={slot.imageSrc}
            alt={slot.title}
            onError={() => setImgOk(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span>{slot.fallbackEmoji}</span>
        )}
      </div>
      {/* 캡션 */}
      <div
        style={{
          fontFamily: HANDWRITE_FONT,
          fontSize: 8.5,
          color: BOND_TOKENS.ink,
          textAlign: 'center',
          marginTop: 3,
          lineHeight: 1.1,
          opacity: isLocked ? 0.5 : 1,
        }}
      >
        {isLocked ? '???' : slot.title}
      </div>
      {memory?.llm_caption && (
        <div
          title={memory.llm_caption}
          style={{
            position: 'absolute',
            top: -2, right: -2,
            width: 8, height: 8,
            borderRadius: '50%',
            background: '#c4886f',
            boxShadow: '0 0 0 1.5px #fdf6ec',
          }}
        />
      )}
    </motion.div>
  );
}

// ============================================================
// 5. 해금 뱃지
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
