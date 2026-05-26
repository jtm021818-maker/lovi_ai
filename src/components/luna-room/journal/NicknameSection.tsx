'use client';

/**
 * v118.3: 별명 섹션 — 풀 리디자인 (10-20대 K-감성).
 *
 * 디자인 원칙:
 *  - "확 안 들어와" 피드백 반영 → 헤드라인급 큰 손글씨 + 그라데이션 카드
 *  - 활성 별명: 네임태그 카드 (이름표 + 도트 액센트 + 인용 말풍선)
 *  - 빈 상태: 진행 칩으로 시각화 (3개 조건 진행도)
 *  - 봉인 별명: 별도 토글 카드, 취소선 + 복원 버튼
 *  - 컬러: 라벤더/피치/코랄 그라데이션 + 글래스모피즘
 *  - 손글씨 폰트(HANDWRITE_FONT) + 강조점은 더 굵게/크게
 *
 * 인터랙션:
 *  - 별명 옆 [✗ 거부] → POST /api/relationship/nicknames { action:'reject' }
 *  - 봉인된 별명 [↻ 복원] → action:'restore'
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MoonStars, Sparkle } from '@phosphor-icons/react';
import { BOND_TOKENS, HANDWRITE_FONT, NUMERIC_FONT } from '@/lib/luna-life/relationship-tokens';
import { triggerHaptic } from '@/lib/haptic';
import Sparkles from './effects/Sparkles';
import ShootingStars from './effects/ShootingStars';

interface NicknameRecord {
  nickname: string;
  status: 'candidate' | 'trying' | 'accepted' | 'rejected';
  useCount: number;
  lastUsedAt: string;
  userReaction: 'accepted' | 'neutral' | 'rejected' | null;
  anchorQuote?: string | null;
  originContext?: string;
  daysSinceFirstUse: number;
}

interface GateDiag {
  intimacyLevel?: number;
  totalSessions?: number;
  daysSinceFirst?: number;
  hasDeepMoment?: boolean;
  activeCount?: number;
  phaseOk?: boolean;
}

interface NicknameApiData {
  gate: {
    allowProposal: boolean;
    reason: string;
    diagnostics: GateDiag;
  };
  active: NicknameRecord[];
  rejected: string[];
}

interface Props {
  show: boolean;
}

// 별명 카드별 컬러 팔레트 (인덱스 기준 순환) — K-감성 파스텔
const NAMETAG_PALETTES = [
  { tag: '#fbe1eb', accent: '#d6789a', ink: '#7a2a4a', glow: '#f4b8cf' },     // 라벤더 핑크
  { tag: '#fde8d1', accent: '#d68b50', ink: '#7a4520', glow: '#f5cba0' },     // 피치 코랄
  { tag: '#e6e0f5', accent: '#8c75c4', ink: '#3f306d', glow: '#c4b8e6' },     // 라일락
  { tag: '#d9efea', accent: '#5e9a86', ink: '#2a5747', glow: '#a6d6c5' },     // 민트
];

export default function NicknameSection({ show }: Props) {
  const [data, setData] = useState<NicknameApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejected, setShowRejected] = useState(false);
  const [busyNick, setBusyNick] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const res = await fetch('/api/relationship/nicknames', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as NicknameApiData;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    void refresh();
  }, [show]);

  const handleAction = async (nickname: string, action: 'reject' | 'restore') => {
    setBusyNick(nickname);
    triggerHaptic('medium');
    try {
      await fetch('/api/relationship/nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, nickname }),
      });
      await refresh();
    } finally {
      setBusyNick(null);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ delay: 0.75, duration: 0.55 }}
      style={{ marginBottom: 18 }}
    >
      {/* 섹션 헤더 — 워시테이프 스타일 */}
      <SectionHeader count={data?.active.length ?? 0} />

      {/* 본문 컨테이너 — 글래스모피즘 */}
      <div
        style={{
          position: 'relative',
          padding: '14px 12px 16px',
          background:
            'linear-gradient(160deg, rgba(255,236,242,0.85) 0%, rgba(255,245,229,0.78) 60%, rgba(243,230,251,0.82) 100%)',
          borderRadius: 18,
          border: '1.5px solid rgba(214,120,154,0.22)',
          boxShadow:
            '0 4px 16px rgba(196,114,148,0.10), inset 0 0 0 1px rgba(255,255,255,0.45)',
          overflow: 'hidden',
        }}
      >
        {/* 배경 데코 — 작은 별 */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 10, right: 14,
            fontSize: 12, color: '#d68694', opacity: 0.6, transform: 'rotate(-10deg)',
          }}
        >
          ✦
        </div>

        {loading && (
          <div
            style={{
              padding: '24px 0', textAlign: 'center',
              fontFamily: HANDWRITE_FONT, fontSize: 12, color: '#a07585', opacity: 0.75,
            }}
          >
            펼쳐보는 중...
          </div>
        )}

        {!loading && data && (
          <>
            {/* 활성 별명 또는 빈 상태 */}
            {data.active.length === 0 ? (
              <EmptyState gate={data.gate} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.active.map((rec, i) => (
                  <NameTagCard
                    key={rec.nickname}
                    record={rec}
                    palette={NAMETAG_PALETTES[i % NAMETAG_PALETTES.length]}
                    busy={busyNick === rec.nickname}
                    onReject={() => handleAction(rec.nickname, 'reject')}
                  />
                ))}
                <GateProgressMini gate={data.gate} />
              </div>
            )}

            {/* 봉인 토글 */}
            {data.rejected.length > 0 && (
              <RejectedList
                names={data.rejected}
                show={showRejected}
                onToggle={() => setShowRejected((v) => !v)}
                busyNick={busyNick}
                onRestore={(n) => handleAction(n, 'restore')}
              />
            )}
          </>
        )}
      </div>
    </motion.section>
  );
}

// ============================================================
// 섹션 헤더 — 워시테이프 + 큰 손글씨
// ============================================================
function SectionHeader({ count }: { count: number }) {
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 10,
        paddingLeft: 6,
        display: 'flex', alignItems: 'flex-end', gap: 8,
      }}
    >
      {/* 좌측 작은 데코 라벨 */}
      <div
        style={{
          padding: '2px 8px 3px',
          background: 'linear-gradient(135deg, #f4b8cf, #d68694)',
          borderRadius: 4,
          fontFamily: HANDWRITE_FONT, fontSize: 10,
          color: '#fff', letterSpacing: '0.06em',
          transform: 'rotate(-3deg)',
          boxShadow: '0 2px 4px rgba(196,114,148,0.25)',
        }}
      >
        🏷️ NAME
      </div>
      {/* 메인 타이틀 */}
      <h3
        style={{
          margin: 0,
          fontFamily: HANDWRITE_FONT, fontSize: 18,
          color: '#5a2a3a', fontWeight: 700,
          lineHeight: 1,
        }}
      >
        루나가 부르는 너
      </h3>
      {count > 0 && (
        <span
          style={{
            marginLeft: 'auto',
            padding: '2px 9px',
            background: 'rgba(214,120,154,0.15)',
            border: '1px solid rgba(214,120,154,0.3)',
            borderRadius: 999,
            fontFamily: NUMERIC_FONT, fontSize: 11,
            color: '#a85e6f', fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}개
        </span>
      )}
    </div>
  );
}

// ============================================================
// 빈 상태 — 게이트 진행 시각화
// ============================================================
function EmptyState({ gate }: { gate: NicknameApiData['gate'] }) {
  if (gate.allowProposal) {
    return (
      <div
        style={{
          padding: '10px 6px 4px',
          fontFamily: HANDWRITE_FONT,
          color: '#5a2a3a', lineHeight: 1.55,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
          ✨ 별명, 곧 만들어줄게
        </div>
        <div style={{ fontSize: 12, color: '#8a5868', opacity: 0.85 }}>
          너랑 함께 쌓인 추억 위에 어울리는 이름을 떠올리는 중
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 4px 4px' }}>
      {/* 큰 메인 카피 */}
      <div
        style={{
          fontFamily: HANDWRITE_FONT, fontSize: 17, fontWeight: 700,
          color: '#5a2a3a', lineHeight: 1.25, marginBottom: 6,
        }}
      >
        🌙 아직 별명이 없어
      </div>
      <div
        style={{
          fontFamily: HANDWRITE_FONT, fontSize: 12,
          color: '#8a5868', opacity: 0.85, lineHeight: 1.55, marginBottom: 14,
        }}
      >
        진짜 별명은 함께 쌓은 추억 위에 자연스럽게 생겨나.
        <br />
        우리 별자리가 완성되면 곧 태어날 거야
      </div>

      <GateConstellation diag={gate.diagnostics} />
    </div>
  );
}

// ============================================================
// v119: 게이트 별자리 — 수치 대신 별 3개가 켜지는 시각화
// ============================================================
function GateConstellation({ diag }: { diag: GateDiag }) {
  const intimacyDone   = (diag.intimacyLevel ?? 1) >= 3;
  const timeDone       = (diag.totalSessions ?? 0) >= 15 || (diag.daysSinceFirst ?? 0) >= 14;
  const deepMomentDone = !!diag.hasDeepMoment;

  // 별 밝기: 희미(잠금) / 은은(절반) / 환함(완료)
  const intimacyGlow   = (diag.intimacyLevel ?? 1) >= 3 ? 1 : (diag.intimacyLevel ?? 1) >= 2 ? 0.55 : 0.28;
  const timeGlow       = timeDone ? 1
                         : Math.max((diag.totalSessions ?? 0) / 15, (diag.daysSinceFirst ?? 0) / 14) >= 0.5 ? 0.55
                         : 0.28;
  const deepGlow       = deepMomentDone ? 1 : 0.28;

  const stars = [
    {
      key: 'intimacy',
      Icon: Heart,
      label: deepLabel(intimacyDone, '마음이 활짝 열렸어', '마음이 열리는 중'),
      xPct: 18, yPct: 28,
      done: intimacyDone,
      glow: intimacyGlow,
      color: '#C98AB8',
      glowColor: '#F0C0E0',
    },
    {
      key: 'time',
      Icon: MoonStars,
      label: deepLabel(timeDone, '시간이 우리 편이야', '함께한 시간이 쌓이는 중'),
      xPct: 82, yPct: 36,
      done: timeDone,
      glow: timeGlow,
      color: '#9D7BC4',
      glowColor: '#D7C5F0',
    },
    {
      key: 'deep',
      Icon: Sparkle,
      label: deepLabel(deepMomentDone, '깊은 순간이 쌓였어', '깊은 순간을 기다리는 중'),
      xPct: 50, yPct: 78,
      done: deepMomentDone,
      glow: deepGlow,
      color: '#D6A26C',
      glowColor: '#F5E2B0',
    },
  ];

  const allDone = intimacyDone && timeDone && deepMomentDone;
  const prevAllDoneRef = useRef(false);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2400);
      return () => clearTimeout(t);
    }
    prevAllDoneRef.current = allDone;
  }, [allDone]);

  return (
    <div
      style={{
        padding: '14px 14px 16px',
        background:
          'radial-gradient(ellipse at 50% 30%, #2D2475 0%, #1B1A4A 55%, #100D38 100%)',
        borderRadius: 14,
        border: '1px solid rgba(140,118,196,0.40)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(245,211,138,0.08), 0 4px 14px rgba(48,32,82,0.40)',
      }}
    >
      {/* 배경 별 + 별똥별 */}
      <Sparkles count={22} color="#E8DCFF" sizeRange={[0.4, 1.6]} opacityRange={[0.25, 0.9]} seed={31} />
      <ShootingStars count={2} color="#F5D38A" interval={7} seed={17} />

      {/* 별자리 영역 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '5 / 3',
          marginBottom: 10,
        }}
      >
        {/* 연결선 — 글로우 그라데이션 */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <linearGradient id="gc-line-1" x1="0" y1="0" x2="1" y2="0.2" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#C98AB8" />
              <stop offset="100%" stopColor="#9D7BC4" />
            </linearGradient>
            <linearGradient id="gc-line-2" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#9D7BC4" />
              <stop offset="100%" stopColor="#D6A26C" />
            </linearGradient>
            <linearGradient id="gc-line-3" x1="1" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor="#D6A26C" />
              <stop offset="100%" stopColor="#C98AB8" />
            </linearGradient>
            <filter id="gc-line-glow"><feGaussianBlur stdDeviation="0.6" /></filter>
          </defs>
          {[
            { from: 0, to: 1, gradId: 'gc-line-1', delay: 0.0 },
            { from: 1, to: 2, gradId: 'gc-line-2', delay: 0.1 },
            { from: 2, to: 0, gradId: 'gc-line-3', delay: 0.2 },
          ].map((edge, idx) => {
            const a = stars[edge.from];
            const b = stars[edge.to];
            const op = ((a.glow + b.glow) / 2) * 0.95;
            return (
              <motion.line
                key={idx}
                x1={a.xPct} y1={a.yPct} x2={b.xPct} y2={b.yPct}
                stroke={`url(#${edge.gradId})`}
                strokeWidth={0.7}
                strokeLinecap="round"
                filter="url(#gc-line-glow)"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: op, pathLength: 1 }}
                transition={{ duration: 1.1, delay: edge.delay, ease: [0.22, 0.61, 0.36, 1] }}
              />
            );
          })}
        </svg>

        {/* 별 3개 */}
        {stars.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: s.glow, scale: s.done ? 1 : 0.86 }}
            transition={{ duration: 0.6, delay: 0.18 + 0.12 * i, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              position: 'absolute',
              left: `${s.xPct}%`,
              top: `${s.yPct}%`,
              transform: 'translate(-50%, -50%)',
              width: 42, height: 42,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.done
                ? `radial-gradient(circle, ${s.glowColor}cc 0%, ${s.color}55 45%, transparent 80%)`
                : 'radial-gradient(circle, rgba(196,179,230,0.35) 0%, transparent 70%)',
              filter: s.done ? `drop-shadow(0 0 10px ${s.glowColor})` : 'none',
            }}
          >
            <s.Icon size={s.done ? 22 : 18} weight={s.done ? 'duotone' : 'thin'} color={s.done ? s.color : '#A89BD6'} />
            {s.done && (
              <>
                {/* 십자 광채 */}
                <motion.span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    width: 36, height: 1.2,
                    background: `linear-gradient(90deg, transparent, ${s.glowColor}cc, transparent)`,
                    borderRadius: 2,
                  }}
                  animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.6, 1.0, 0.6] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    width: 1.2, height: 36,
                    background: `linear-gradient(180deg, transparent, ${s.glowColor}cc, transparent)`,
                    borderRadius: 2,
                  }}
                  animate={{ opacity: [0.3, 0.8, 0.3], scaleY: [0.6, 1.0, 0.6] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
                />
                {/* 주위 작은 별 흩어짐 */}
                <Sparkles count={4} color={s.glowColor} sizeRange={[0.4, 0.9]} seed={i * 17 + 3} twinkleDuration={1.8} opacityRange={[0.3, 0.95]} />
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* 별 상태 텍스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
        {stars.map((s) => (
          <div
            key={`${s.key}-label`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: HANDWRITE_FONT, fontSize: 12,
              color: s.done ? s.glowColor : '#A89BD6',
              opacity: s.done ? 1 : 0.78,
              fontWeight: s.done ? 600 : 400,
              textShadow: s.done ? `0 0 8px ${s.color}66` : 'none',
            }}
          >
            <span aria-hidden style={{ width: 8, display: 'inline-flex', justifyContent: 'center' }}>
              {s.done
                ? <Sparkle size={9} weight="fill" color={s.glowColor} />
                : <span style={{ fontSize: 11, color: '#7E70B0' }}>·</span>}
            </span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {allDone && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          style={{
            position: 'relative',
            marginTop: 12,
            padding: '7px 12px',
            background: 'linear-gradient(135deg, #F5D38A 0%, #E8B4C8 55%, #C9B3E8 100%)',
            borderRadius: 999,
            textAlign: 'center',
            fontFamily: HANDWRITE_FONT, fontSize: 12.5,
            color: '#3A2E78', fontWeight: 700,
            letterSpacing: '0.02em',
            boxShadow: '0 4px 12px rgba(245,211,138,0.45), inset 0 0 0 1px rgba(255,255,255,0.40)',
            overflow: 'hidden',
          }}
        >
          {celebrate && (
            <Sparkles count={18} color="#FFE9B8" sizeRange={[0.6, 1.6]} seed={97} twinkleDuration={1.4} opacityRange={[0.4, 1]} />
          )}
          <span style={{ position: 'relative' }}>
            별자리가 완성됐어 — 별명이 곧 태어날 거야
          </span>
        </motion.div>
      )}
    </div>
  );
}

function deepLabel(done: boolean, ok: string, wait: string) {
  return done ? ok : wait;
}

// v119.5: NightSkyDecor 함수 폐기 → Sparkles + ShootingStars 컴포넌트로 대체

// ============================================================
// 네임태그 카드 — 핵심 컴포넌트
// ============================================================
function NameTagCard({
  record, palette, busy, onReject,
}: {
  record: NicknameRecord;
  palette: typeof NAMETAG_PALETTES[number];
  busy: boolean;
  onReject: () => void;
}) {
  const statusInfo = formatStatus(record.status, record.userReaction);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
      style={{
        position: 'relative',
        padding: '14px 14px 14px 16px',
        background: `linear-gradient(135deg, ${palette.tag} 0%, #ffffff 100%)`,
        borderRadius: 14,
        border: `1.5px solid ${palette.accent}44`,
        boxShadow: `0 4px 12px ${palette.accent}1f, inset 0 0 0 1px rgba(255,255,255,0.5)`,
      }}
    >
      {/* 좌측 끈 점 — 네임태그 느낌 */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: 14, left: 0,
          width: 4, height: 28,
          background: palette.accent,
          borderRadius: '0 4px 4px 0',
          opacity: 0.55,
        }}
      />

      {/* 헤더 — 이름 + 상태 + 거부 버튼 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 큰 손글씨 별명 */}
          <div
            style={{
              fontFamily: HANDWRITE_FONT, fontSize: 24,
              color: palette.ink, fontWeight: 700, lineHeight: 1.1,
              letterSpacing: '-0.01em',
              textShadow: `0 1px 0 ${palette.glow}55`,
            }}
          >
            {record.nickname}
          </div>
          {/* 상태 칩 */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              marginTop: 6,
              padding: '2px 8px 3px',
              background: 'rgba(255,255,255,0.6)',
              border: `1px solid ${palette.accent}55`,
              borderRadius: 999,
              fontFamily: HANDWRITE_FONT, fontSize: 10.5,
              color: palette.accent,
            }}
          >
            <span style={{ fontSize: 9 }}>{statusInfo.dot}</span>
            {statusInfo.label}
          </div>
        </div>

        <button
          disabled={busy}
          onClick={onReject}
          aria-label="이 별명 거부"
          style={{
            flexShrink: 0,
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.65)',
            border: '1px solid rgba(160,80,80,0.25)',
            borderRadius: 8,
            color: '#a05050', fontSize: 13, fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.5 : 0.85,
            transition: 'all 0.15s',
          }}
        >
          ✗
        </button>
      </div>

      {/* 추억 앵커 — 인용 말풍선 */}
      {record.anchorQuote && (
        <div
          style={{
            marginTop: 8, padding: '10px 12px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 10,
            border: `1px dashed ${palette.accent}55`,
            fontFamily: HANDWRITE_FONT, fontSize: 11.5,
            color: palette.ink, opacity: 0.92,
            fontStyle: 'italic', lineHeight: 1.5,
            position: 'relative',
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute', top: -7, left: 14,
              fontSize: 14, color: palette.accent,
            }}
          >
            ❝
          </span>
          {record.anchorQuote}
        </div>
      )}

      {/* 푸터 — 사용 횟수 / 시간 */}
      <div
        style={{
          marginTop: 10,
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: HANDWRITE_FONT, fontSize: 10,
          color: palette.ink, opacity: 0.6,
        }}
      >
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 7px',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: 999,
          }}
        >
          💌 <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{record.useCount}</strong>회
        </span>
        <span>·</span>
        <span>{formatAgo(record.lastUsedAt)}</span>
      </div>
    </motion.div>
  );
}

// ============================================================
// 활성 별명 있을 때 게이트 진행도 — 작은 푸터
// ============================================================
function GateProgressMini({ gate }: { gate: NicknameApiData['gate'] }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.4)',
        borderRadius: 10,
        border: '1px dashed rgba(214,120,154,0.25)',
        fontFamily: HANDWRITE_FONT, fontSize: 11,
        color: '#7a4a55', opacity: 0.78, lineHeight: 1.45,
      }}
    >
      {gate.allowProposal ? (
        <>✓ 새 별명이 떠오르면 자연스럽게 더 불러줄게</>
      ) : (
        <>· 새 별명은 조금 더 쌓이면 — {gate.reason}</>
      )}
    </div>
  );
}

// ============================================================
// 봉인된 별명 리스트 — 토글
// ============================================================
function RejectedList({
  names, show, onToggle, busyNick, onRestore,
}: {
  names: string[];
  show: boolean;
  onToggle: () => void;
  busyNick: string | null;
  onRestore: (n: string) => void;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '8px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(124,87,56,0.07)',
          border: '1px dashed rgba(124,87,56,0.3)',
          borderRadius: 10,
          fontFamily: HANDWRITE_FONT, fontSize: 11.5,
          color: '#8a5e48', cursor: 'pointer',
        }}
      >
        <span>🔒 봉인한 별명 <strong>{names.length}개</strong></span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>{show ? '접기 ▴' : '펼치기 ▾'}</span>
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', marginTop: 6 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
              {names.map((name) => (
                <div
                  key={name}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.5)',
                    border: '1px dashed rgba(160,90,100,0.28)',
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: HANDWRITE_FONT, fontSize: 13,
                      color: '#a07585', textDecoration: 'line-through',
                      opacity: 0.78,
                    }}
                  >
                    {name}
                  </span>
                  <button
                    disabled={busyNick === name}
                    onClick={() => onRestore(name)}
                    style={{
                      fontFamily: HANDWRITE_FONT, fontSize: 10.5,
                      color: '#7a4a55',
                      background: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(124,87,56,0.3)',
                      borderRadius: 6, padding: '4px 10px',
                      cursor: busyNick === name ? 'wait' : 'pointer',
                      opacity: busyNick === name ? 0.5 : 1,
                    }}
                  >
                    ↻ 복원
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// 헬퍼
// ============================================================
function formatStatus(
  status: NicknameRecord['status'],
  reaction: NicknameRecord['userReaction'],
): { label: string; dot: string } {
  if (status === 'accepted') return { label: '받아들임', dot: '💗' };
  if (status === 'rejected') return { label: '봉인됨', dot: '✗' };
  if (status === 'trying') {
    if (reaction === 'accepted') return { label: '시험 → 긍정', dot: '✨' };
    if (reaction === 'rejected') return { label: '시험 → 거부', dot: '·' };
    return { label: '반응 살피는 중', dot: '👀' };
  }
  return { label: '막 떠올린 이름', dot: '💭' };
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return '방금 전';
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.round(hr / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.round(day / 7)}주 전`;
  return `${Math.round(day / 30)}달 전`;
}

// 미사용 import 차단용 ref (BOND_TOKENS — 다른 곳에서 색깔 일관성 위해 보존)
export const __NICKNAME_SECTION_TOKENS_KEEP = BOND_TOKENS;
