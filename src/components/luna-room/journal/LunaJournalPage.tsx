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

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  Flame, Coffee, Tag, Lock, Plant, PaperPlaneTilt,
  Notebook, HandHeart, Envelope, DiamondsFour,
  CaretDown, type IconProps,
} from '@phosphor-icons/react';
import { BOND_TOKENS, HANDWRITE_FONT, NUMERIC_FONT, getStageColor } from '@/lib/luna-life/relationship-tokens';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';
import LevelStamp from './LevelStamp';
import PetalFlower from './PetalFlower';
import GateOpenMoment from './GateOpenMoment';
import NicknameSection from './NicknameSection';
import StageCard from './StageCard';
import StageIcon from './StageIcon';
import RelationshipDex from './RelationshipDex';
import StageTransitionMoment from './StageTransitionMoment';
import { useStageTransition } from '@/hooks/useStageTransition';
import {
  SEED_HINT,
  FEATURE_UNLOCKS,
  partitionUnlocks,
  getStageLabel,
  getNextStageLabel,
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
  /** 유저 닉네임 — Lv.5 네임카드 및 도감 슬롯 표시 */
  userDisplayName?: string;
}

export default function LunaJournalPage({ data, show, persona = 'luna', userDisplayName }: Props) {
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

  const isSeed = data.daysSinceFirst === 0 && data.totalSessions === 0;
  const isMax = data.level >= 5;
  const stage = getStageLabel(data.level);
  const nextStage = getNextStageLabel(data.level);
  const { unlocked, nextLocked } = partitionUnlocks(data.level);

  // v119.5: 단계 전환 풀스크린 모먼트
  const transition = useStageTransition(data.level);

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
        // v119.5 fix: 모바일 가로 스크롤 차단 (자식 절대위치 leak 방지)
        overflow: 'hidden',
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

      {/* ── 2. StageCard (v119.5 메인 시각 — 별·달·은하 일러스트) ─── */}
      <StageCard show={show} stage={stage} nextStage={nextStage} isSeed={isSeed} isMax={isMax} />

      {/* ── 2-B. 마음의 4축 — 토글 접힘 (게임 스탯 느낌 약화) ─── */}
      <MindAxisToggle show={show} data={data} />

      {/* ── 3. 별명 (v115.7→v118.3 메인 시각 앵커) ───────────── */}
      {persona === 'luna' && <NicknameSection show={show} />}

      {/* ── 4. 관계 도감 (v119.5 신규 — Neko Atsume + Genshin 패턴) ─── */}
      <RelationshipDex
        show={show}
        currentLevel={data.level}
        userDisplayName={userDisplayName}
      />

      {/* ── 5. 해금 뱃지 ────────────────────────────────────── */}
      <UnlockBadges show={show} unlocked={unlocked} nextLocked={nextLocked} />

      {/* ── 6. 진행도 ───────────────────────────────────────── */}
      <ProgressFootnote show={show} nextStage={nextStage} isMax={isMax} />

      {/* 🆕 v117: 소프트 게이트 — Lv 3 진입 시 "마음 더 열기" 모먼트 */}
      <GateOpenMoment
        avgScore={data.avgScore}
        level={data.level}
        persona={persona}
      />

      {/* 🆕 v119.5: 단계 전환 풀스크린 의식 (Lv.2~5) */}
      <StageTransitionMoment
        level={transition.showFor}
        onClose={transition.dismiss}
        userDisplayName={userDisplayName}
      />
    </div>
  );
}

// ============================================================
// 마음의 4축 — 접힘 토글 (페탈 + 4축 라벨)
// ============================================================
function MindAxisToggle({ show, data }: { show: boolean; data: JournalData }) {
  const [open, setOpen] = useState(false);
  const color = getStageColor(data.level);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0 }}
      transition={{ delay: 0.65, duration: 0.5 }}
      style={{ marginBottom: 18 }}
    >
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); triggerHaptic('selection'); }}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.55)',
          border: `1px dashed ${color.accent}55`,
          borderRadius: 10,
          fontFamily: HANDWRITE_FONT,
          fontSize: 12,
          color: color.stamp,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        aria-expanded={open}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HandHeart size={14} weight="duotone" color={color.accent} />
          마음의 4축
          <span style={{ fontSize: 10.5, opacity: 0.6 }}>
            — 신뢰·개방·유대·존경
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden
          style={{ display: 'inline-flex' }}
        >
          <CaretDown size={12} weight="bold" color={color.stamp} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="petals"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '14px 10px 18px',
                marginTop: 8,
                background: 'rgba(255,255,255,0.45)',
                borderRadius: 12,
                border: `1px solid ${color.accent}33`,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <PetalFlower
                trust={data.trust}
                openness={data.openness}
                bond={data.bond}
                respect={data.respect}
                show
                delay={100}
                level={data.level}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
          <span
            style={{
              fontFamily: HANDWRITE_FONT, fontSize: 11, color: '#c4886f',
              marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 3,
            }}
          >
            <Flame size={11} weight="duotone" color="#E07A4A" />
            {consecutiveDays}일 연속
          </span>
        )}
      </div>
    </motion.div>
  );
}

// v119.5: 기존 CharacterCard + AxisChip 함수 폐기.
// 메인 시각은 StageCard 가 담당하고, 페탈/4축은 MindAxisToggle 안의 PetalFlower 가 담당.

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
        }}
      >
        <FeatureIcon featureId={feature.id} unlocked={isUnlocked} />
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
              · <em style={{ fontStyle: 'normal', color: '#8c6aa0' }}>{getStageLabel(feature.level).title}</em> 사이가 되면
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
function ProgressFootnote({
  show, nextStage, isMax,
}: { show: boolean; nextStage: ReturnType<typeof getStageLabel>; isMax: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={show ? { opacity: 1 } : { opacity: 0 }}
      transition={{ delay: 1.15, duration: 0.4 }}
      style={{
        marginTop: 12,
        textAlign: 'center',
        fontFamily: HANDWRITE_FONT, fontSize: 11,
        color: BOND_TOKENS.inkSoft, opacity: 0.85,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}
    >
      {isMax ? (
        <>
          <StageIcon level={5} size={12} weight="duotone" />
          여기가 끝이 아니야 — 우리만의 우주가 계속 자라
        </>
      ) : (
        <>
          <StageIcon level={nextStage.level} size={12} weight="duotone" />
          다음은 <strong style={{ fontWeight: 600, color: '#7a4a55' }}>{nextStage.title}</strong> 사이
        </>
      )}
    </motion.div>
  );
}

// ============================================================
// FeatureIcon — 9개 FEATURE_UNLOCKS id → Phosphor 매핑
// ============================================================
const FEATURE_ICONS: Record<string, React.ComponentType<IconProps>> = {
  warm_reaction:       Coffee,
  nickname:            Tag,
  deep_secret:         Lock,
  pattern_callout:     Plant,
  first_outreach:      PaperPlaneTilt,
  shared_memory:       Notebook,
  luna_vulnerability:  HandHeart,
  handwritten_letter:  Envelope,
  eternal_promise:     DiamondsFour,
};

function FeatureIcon({ featureId, unlocked }: { featureId: string; unlocked: boolean }) {
  const Comp = FEATURE_ICONS[featureId] ?? Tag;
  return (
    <Comp
      size={13}
      weight={unlocked ? 'fill' : 'thin'}
      color={unlocked ? '#3D8055' : '#7C5738'}
    />
  );
}
