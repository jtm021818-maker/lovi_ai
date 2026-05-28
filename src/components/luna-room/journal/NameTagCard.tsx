'use client';

/**
 * v120 NameTagCard — 정착된 별명 카드.
 *
 * 기존 NicknameSection (v118.3) 의 카드 컴포넌트를 분리 + v120 사용 맥락/빈도 표시 추가.
 *
 * Props:
 *   - record: 별명 상태 + anchor + useCount
 *   - useContextHint: "네가 약해질 때만" 같은 사용 맥락 한 줄
 *   - useContextTags: 칩으로 노출 (late_night / vulnerable_moment …)
 *   - recentUseCount: 최근 7일 사용 횟수 (sparingly indicator)
 *   - palette: 카드 컬러
 *   - busy, onReject: 거부 버튼
 */

import { motion } from 'framer-motion';
import { HANDWRITE_FONT } from '@/lib/luna-life/relationship-tokens';

export interface NameTagPalette {
  tag: string;
  accent: string;
  ink: string;
  glow: string;
}

export const NAMETAG_PALETTES: NameTagPalette[] = [
  { tag: '#fbe1eb', accent: '#d6789a', ink: '#7a2a4a', glow: '#f4b8cf' },     // 라벤더 핑크
  { tag: '#fde8d1', accent: '#d68b50', ink: '#7a4520', glow: '#f5cba0' },     // 피치 코랄
  { tag: '#e6e0f5', accent: '#8c75c4', ink: '#3f306d', glow: '#c4b8e6' },     // 라일락
  { tag: '#d9efea', accent: '#5e9a86', ink: '#2a5747', glow: '#a6d6c5' },     // 민트
];

export interface NameTagRecord {
  nickname: string;
  status: 'candidate' | 'trying' | 'accepted' | 'rejected';
  useCount: number;
  lastUsedAt: string;
  userReaction: 'accepted' | 'neutral' | 'rejected' | null;
  anchorQuote?: string | null;
  /** v120 — 별명을 부르고 싶은 맥락 (LLM 가이드) */
  useContextHint?: string | null;
  /** v120 — 맥락 태그 (UI 칩) */
  useContextTags?: string[];
}

interface Props {
  record: NameTagRecord;
  palette: NameTagPalette;
  busy: boolean;
  onReject: () => void;
  /** v120 — 최근 7일간 사용 횟수 (있으면 칩 노출). 미제공 시 record.useCount 사용 */
  recentUseCount?: number;
}

export default function NameTagCard({ record, palette, busy, onReject, recentUseCount }: Props) {
  const statusInfo = formatStatus(record.status, record.userReaction);
  const recent = recentUseCount ?? record.useCount;
  const tags = (record.useContextTags ?? []).slice(0, 3);

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

      {/* v120: 사용 맥락 한 줄 — 루나가 "이런 순간에만 부르고 싶어" */}
      {record.useContextHint && (
        <div
          style={{
            marginTop: 8,
            padding: '7px 10px',
            background: `${palette.accent}10`,
            borderLeft: `2px solid ${palette.accent}88`,
            borderRadius: '0 8px 8px 0',
            fontFamily: HANDWRITE_FONT, fontSize: 11,
            color: palette.ink, opacity: 0.82,
            lineHeight: 1.45,
          }}
        >
          <span style={{ opacity: 0.6, marginRight: 4 }}>🌙</span>
          {record.useContextHint}
        </div>
      )}

      {/* v120: 사용 맥락 태그 칩 */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                padding: '2px 7px',
                background: 'rgba(255,255,255,0.55)',
                border: `1px solid ${palette.accent}33`,
                borderRadius: 999,
                fontFamily: HANDWRITE_FONT, fontSize: 9.5,
                color: palette.ink, opacity: 0.72,
                letterSpacing: '0.02em',
              }}
            >
              {translateContextTag(t)}
            </span>
          ))}
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
          💌 <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{recent}</strong>회
        </span>
        <span>·</span>
        <span>{formatAgo(record.lastUsedAt)}</span>
      </div>
    </motion.div>
  );
}

// ============================================================
// Helpers (formerly inside NicknameSection)
// ============================================================
function formatStatus(
  status: NameTagRecord['status'],
  reaction: NameTagRecord['userReaction'],
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
  if (!iso) return '아직 한 번도';
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

const TAG_LABELS: Record<string, string> = {
  late_night: '늦은 밤',
  morning_greeting: '아침 인사',
  vulnerable_moment: '약해진 순간',
  playful_banter: '장난칠 때',
  praising: '잘했다 할 때',
  consoling: '위로할 때',
  reunion: '오랜만일 때',
  intimate_share: '속얘기할 때',
};

function translateContextTag(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replace(/_/g, ' ');
}
