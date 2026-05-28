'use client';

/**
 * v120 루나의 생각 노트 — 살아있는 별명 시스템 UI.
 *
 * 기존 RelationshipDex + NicknameSection 을 통합 대체.
 *
 * 세 섹션:
 *  1. 지금 너를 이렇게 봐 — impression_text + facets (세션 종료마다 갱신)
 *  2. 이렇게 부를까 고민 중 — pondering candidates (maturity 진행률)
 *  3. 이렇게 부르기로 한 너 — accepted/trying nicknames (NameTagCard)
 *
 * API: GET /api/relationship/thought-note
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HANDWRITE_FONT, NUMERIC_FONT } from '@/lib/luna-life/relationship-tokens';
import { triggerHaptic } from '@/lib/haptic';
import NameTagCard, {
  NAMETAG_PALETTES,
  type NameTagRecord,
} from './NameTagCard';

interface PonderingCandidate {
  name: string;
  reason: string;
  maturity: number;
  context_hint?: string;
  context_tags?: string[];
}

interface ImpressionState {
  impression_text: string;
  impression_facets: string[];
  updated_at: string;
  session_count_at_update: number;
  pondering: {
    is_pondering: boolean;
    candidates: PonderingCandidate[];
    why_now: string;
  };
}

interface NicknameRecord extends NameTagRecord {
  originContext?: string;
  daysSinceFirstUse?: number;
  recentUseCount?: number;
}

interface ThoughtNoteData {
  impression: ImpressionState | null;
  active: NicknameRecord[];
  rejected: string[];
  gate: {
    allowProposal: boolean;
    reason: string;
  };
}

interface Props {
  show: boolean;
}

export default function LunaThoughtNote({ show }: Props) {
  const [data, setData] = useState<ThoughtNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejected, setShowRejected] = useState(false);
  const [busyNick, setBusyNick] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const res = await fetch('/api/relationship/thought-note', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as ThoughtNoteData;
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

  const handleReject = async (nickname: string) => {
    setBusyNick(nickname);
    triggerHaptic('medium');
    try {
      await fetch('/api/relationship/nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', nickname }),
      });
      await refresh();
    } finally {
      setBusyNick(null);
    }
  };

  const handleRestore = async (nickname: string) => {
    setBusyNick(nickname);
    triggerHaptic('medium');
    try {
      await fetch('/api/relationship/nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', nickname }),
      });
      await refresh();
    } finally {
      setBusyNick(null);
    }
  };

  const impressionFilled = !!data?.impression?.impression_text;
  const hasPondering = !!data?.impression?.pondering?.is_pondering
    && (data?.impression?.pondering?.candidates?.length ?? 0) > 0;
  const hasNicknames = (data?.active?.length ?? 0) > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ delay: 0.85, duration: 0.6 }}
      style={{ marginBottom: 18 }}
    >
      {/* 섹션 헤더 */}
      <Header
        sessionCount={data?.impression?.session_count_at_update ?? 0}
        updatedAt={data?.impression?.updated_at ?? ''}
      />

      {/* 본문 컨테이너 — 종이 노트 */}
      <div
        style={{
          position: 'relative',
          padding: '16px 14px 18px',
          background:
            'linear-gradient(180deg, #FBF5EC 0%, #F4E9D7 100%)',
          borderRadius: 16,
          border: '1.5px solid rgba(140,106,196,0.20)',
          boxShadow:
            '0 4px 16px rgba(124,87,56,0.10), inset 0 0 0 1px rgba(255,255,255,0.45)',
          overflow: 'hidden',
        }}
      >
        {/* 종이 그레인 */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            pointerEvents: 'none',
            opacity: 0.07,
            mixBlendMode: 'overlay',
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>\")",
          }}
        />

        {loading && (
          <div
            style={{
              padding: '32px 0', textAlign: 'center',
              fontFamily: HANDWRITE_FONT, fontSize: 12, color: '#a07585', opacity: 0.75,
            }}
          >
            노트 펼치는 중...
          </div>
        )}

        {!loading && (
          <>
            {/* ── 1. 지금 너를 이렇게 봐 ─────────────────────── */}
            <ImpressionPanel
              impression={data?.impression ?? null}
              filled={impressionFilled}
            />

            {/* ── 2. 이렇게 부를까 고민 중 ───────────────────── */}
            {hasPondering && (
              <PonderingPanel
                pondering={data!.impression!.pondering}
              />
            )}

            {/* ── 3. 이렇게 부르기로 한 너 ───────────────────── */}
            {hasNicknames && (
              <AcceptedNamesPanel
                active={data!.active}
                busyNick={busyNick}
                onReject={handleReject}
              />
            )}

            {/* 빈 상태 — 인상도 없고 별명도 없을 때 */}
            {!impressionFilled && !hasPondering && !hasNicknames && (
              <EmptyState gateReason={data?.gate?.reason ?? ''} />
            )}

            {/* 봉인된 별명 토글 */}
            {(data?.rejected?.length ?? 0) > 0 && (
              <RejectedList
                names={data!.rejected}
                show={showRejected}
                onToggle={() => setShowRejected((v) => !v)}
                busyNick={busyNick}
                onRestore={handleRestore}
              />
            )}
          </>
        )}
      </div>
    </motion.section>
  );
}

// ============================================================
// 섹션 헤더
// ============================================================
function Header({ sessionCount, updatedAt }: { sessionCount: number; updatedAt: string }) {
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 10,
        paddingLeft: 6,
        display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap',
      }}
    >
      {/* 좌측 라벨 */}
      <div
        style={{
          padding: '2px 8px 3px',
          background: 'linear-gradient(135deg, #C9B3E8, #8C6AC4)',
          borderRadius: 4,
          fontFamily: HANDWRITE_FONT, fontSize: 10,
          color: '#fff', letterSpacing: '0.06em',
          transform: 'rotate(-3deg)',
          boxShadow: '0 2px 4px rgba(140,106,196,0.30)',
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}
      >
        🧠 NOTE
      </div>
      {/* 메인 타이틀 */}
      <h3
        style={{
          margin: 0,
          fontFamily: HANDWRITE_FONT, fontSize: 18,
          color: '#3F2A75', fontWeight: 700,
          lineHeight: 1,
        }}
      >
        루나의 생각 노트
      </h3>
      {updatedAt && (
        <span
          style={{
            marginLeft: 'auto',
            padding: '2px 9px',
            background: 'rgba(140,106,196,0.10)',
            border: '1px solid rgba(140,106,196,0.25)',
            borderRadius: 999,
            fontFamily: NUMERIC_FONT, fontSize: 10,
            color: '#5B3F87', fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
          title={new Date(updatedAt).toLocaleString('ko-KR')}
        >
          {formatAgo(updatedAt)} · {sessionCount}회차
        </span>
      )}
    </div>
  );
}

// ============================================================
// 1) 인상 패널
// ============================================================
function ImpressionPanel({
  impression, filled,
}: {
  impression: ImpressionState | null;
  filled: boolean;
}) {
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <SubsectionLabel emoji="💭" text="지금 너를 이렇게 봐" />

      {filled ? (
        <>
          <div
            style={{
              padding: '12px 14px 14px',
              background: 'rgba(255,255,255,0.55)',
              borderLeft: '3px solid #8C6AC4',
              borderRadius: '0 10px 10px 0',
              fontFamily: HANDWRITE_FONT, fontSize: 14.5,
              color: '#3A2A55', lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
            }}
          >
            {impression!.impression_text}
          </div>

          {/* facet 칩 */}
          {impression!.impression_facets.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8, paddingLeft: 4 }}>
              {impression!.impression_facets.map((f, i) => (
                <motion.span
                  key={f + i}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  style={{
                    padding: '3px 9px 4px',
                    background: 'linear-gradient(135deg, #F4ECFF 0%, #E8DCF7 100%)',
                    border: '1px solid rgba(140,106,196,0.30)',
                    borderRadius: 999,
                    fontFamily: HANDWRITE_FONT, fontSize: 11,
                    color: '#5B3F87', fontWeight: 600,
                    transform: i % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)',
                  }}
                >
                  {f}
                </motion.span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            padding: '14px 14px',
            background: 'rgba(255,255,255,0.45)',
            borderRadius: 10,
            fontFamily: HANDWRITE_FONT, fontSize: 12.5,
            color: '#7E70B0', opacity: 0.85, lineHeight: 1.55,
            fontStyle: 'italic',
          }}
        >
          아직 너에 대한 인상을 정리하기엔 우리가 너무 짧아.
          <br />
          한두 번만 더 얘기하면 노트에 적을 게 생길 거야.
        </div>
      )}
    </div>
  );
}

// ============================================================
// 2) 고민 중 패널
// ============================================================
function PonderingPanel({
  pondering,
}: {
  pondering: ImpressionState['pondering'];
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <SubsectionLabel emoji="🤔" text="이렇게 부를까 고민 중" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pondering.candidates.map((c, i) => (
          <PonderingCard key={c.name + i} candidate={c} index={i} />
        ))}
      </div>

      {pondering.why_now && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.40)',
            border: '1px dashed rgba(140,106,196,0.30)',
            borderRadius: 10,
            fontFamily: HANDWRITE_FONT, fontSize: 11.5,
            color: '#5B3F87', opacity: 0.85, lineHeight: 1.55,
          }}
        >
          <span aria-hidden style={{ marginRight: 4 }}>💭</span>
          {pondering.why_now}
        </div>
      )}
    </div>
  );
}

function PonderingCard({ candidate, index }: { candidate: PonderingCandidate; index: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, candidate.maturity)) * 100);
  const isClose = candidate.maturity >= 0.8;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.06, duration: 0.45 }}
      style={{
        position: 'relative',
        padding: '11px 12px 12px',
        background: 'linear-gradient(180deg, #FFFCEE 0%, #FFF6E0 100%)',
        border: '1px solid rgba(214,162,108,0.30)',
        borderRadius: 12,
        boxShadow: '0 2px 6px rgba(124,87,56,0.10)',
        transform: index % 2 === 0 ? 'rotate(-0.6deg)' : 'rotate(0.6deg)',
      }}
    >
      {/* 후보 이름 + maturity */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div
          style={{
            fontFamily: HANDWRITE_FONT, fontSize: 19, fontWeight: 700,
            color: isClose ? '#7a4520' : '#8a5e48',
            opacity: isClose ? 1 : 0.78,
            letterSpacing: '-0.01em',
          }}
        >
          {candidate.name}
        </div>
        <div
          style={{
            fontFamily: NUMERIC_FONT, fontSize: 10.5, fontWeight: 600,
            color: isClose ? '#d68b50' : '#a07585',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {pct}% 무르익음
        </div>
      </div>

      {/* maturity 진행 바 */}
      <div
        style={{
          marginTop: 6, height: 4,
          background: 'rgba(214,162,108,0.18)',
          borderRadius: 2, overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            height: '100%',
            background: isClose
              ? 'linear-gradient(90deg, #D6A26C 0%, #E8B47A 100%)'
              : 'linear-gradient(90deg, #C4A88E 0%, #D6B294 100%)',
            borderRadius: 2,
          }}
        />
      </div>

      {/* 이유 */}
      <div
        style={{
          marginTop: 8,
          fontFamily: HANDWRITE_FONT, fontSize: 11.5,
          color: '#5A4030', opacity: 0.85, lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        “{candidate.reason}”
      </div>

      {/* context hint — 어떤 순간에 부르고 싶은지 */}
      {candidate.context_hint && (
        <div
          style={{
            marginTop: 6,
            padding: '5px 8px',
            background: 'rgba(214,162,108,0.10)',
            borderRadius: 6,
            fontFamily: HANDWRITE_FONT, fontSize: 10.5,
            color: '#8a5e48', opacity: 0.85,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          <span aria-hidden>🌙</span>
          {candidate.context_hint}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// 3) 정착된 별명 패널
// ============================================================
function AcceptedNamesPanel({
  active, busyNick, onReject,
}: {
  active: NicknameRecord[];
  busyNick: string | null;
  onReject: (n: string) => void;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <SubsectionLabel emoji="🏷️" text="이렇게 부르기로 한 너" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {active.map((rec, i) => (
          <NameTagCard
            key={rec.nickname}
            record={rec}
            palette={NAMETAG_PALETTES[i % NAMETAG_PALETTES.length]}
            busy={busyNick === rec.nickname}
            onReject={() => onReject(rec.nickname)}
            recentUseCount={rec.recentUseCount}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 빈 상태
// ============================================================
function EmptyState({ gateReason }: { gateReason: string }) {
  return (
    <div
      style={{
        padding: '20px 12px 18px',
        textAlign: 'center',
        fontFamily: HANDWRITE_FONT,
        color: '#5B3F87', lineHeight: 1.55,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
        🌱 루나가 너를 알아가는 중
      </div>
      <div style={{ fontSize: 12, color: '#7E70B0', opacity: 0.85 }}>
        몇 번 더 얘기 나누면 노트에 적어둘 게 생길 거야.
        {gateReason && (
          <>
            <br />
            <span style={{ fontSize: 10.5, opacity: 0.7 }}>· {gateReason}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 봉인 토글
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
// Helpers
// ============================================================
function SubsectionLabel({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 8, paddingLeft: 2,
        fontFamily: HANDWRITE_FONT, fontSize: 13,
        color: '#5B3F87', fontWeight: 700,
        letterSpacing: '-0.005em',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 3, height: 14,
          background: '#8C6AC4',
          borderRadius: 2,
          display: 'inline-block',
        }}
      />
      <span aria-hidden>{emoji}</span>
      {text}
    </div>
  );
}

function formatAgo(iso: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.round(hr / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.round(day / 7)}주 전`;
  return `${Math.round(day / 30)}달 전`;
}
