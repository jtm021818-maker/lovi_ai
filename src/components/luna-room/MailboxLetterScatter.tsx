'use client';

/**
 * MailboxLetterScatter — 우편함을 클릭하면 뜨는 "루나의 책상" 모달.
 * 받은 편지들이 책상 위에 자연스럽게 흩어진 상태로 배치되어,
 * 사용자가 며칠째 편지인지 보고 골라서 읽을 수 있다.
 *
 * 디자인:
 *  - Skeuomorphic letter (크림 종이 + 마스킹 테이프 + 잉크 도장 + 왁스 씰)
 *  - Deterministic scatter: gift.id 해시 시드로 매번 같은 위치 → 인지 안정감
 *  - Stagger entrance: 우편함에서 쏟아지듯 (0.07s 간격)
 *  - 미열람=빨간 왁스+펄스, 열람=`읽음`, final=골드 왁스+shimmer
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { LunaGift } from '@/lib/luna-life';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';

interface Props {
  gifts: LunaGift[];
  accentColor: string;
  isDark: boolean;
  isDeceased: boolean;
  onClose: () => void;
  onSelect: (gift: LunaGift) => void;
}

const ICON: Record<LunaGift['giftType'], string> = {
  letter: '💌',
  poem: '🌸',
  memory_album: '📷',
  final_letter: '⭐',
};

interface PaperTint {
  bg: string;
  ink: string;
  tape: string;
  ruled: string;
}

const PAPER_TINT: Record<LunaGift['giftType'], PaperTint> = {
  letter: {
    bg: 'linear-gradient(135deg, #FFFBEC 0%, #FFEFCC 100%)',
    ink: '#7C3F22',
    tape: 'rgba(251, 191, 36, 0.78)',
    ruled: 'rgba(124, 63, 34, 0.10)',
  },
  poem: {
    bg: 'linear-gradient(135deg, #FFEEF5 0%, #FBCFE8 100%)',
    ink: '#9D174D',
    tape: 'rgba(244, 114, 182, 0.78)',
    ruled: 'rgba(157, 23, 77, 0.10)',
  },
  memory_album: {
    bg: 'linear-gradient(135deg, #E5F0FF 0%, #BFDBFE 100%)',
    ink: '#1E3A8A',
    tape: 'rgba(96, 165, 250, 0.78)',
    ruled: 'rgba(30, 58, 138, 0.10)',
  },
  final_letter: {
    bg: 'linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)',
    ink: '#92400E',
    tape: 'rgba(245, 158, 11, 0.85)',
    ruled: 'rgba(146, 64, 14, 0.12)',
  },
};

// ─── Deterministic random (gift.id seed) ────────────────────────────────────
function hashStr(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function seededRand(seed: number) {
  // mulberry32-lite
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

interface ScatterPos {
  x: number;
  y: number;
  rot: number;
}

function computeScatter(
  count: number,
  width: number,
  height: number,
  cardW: number,
  cardH: number,
  ids: string[],
): ScatterPos[] {
  if (count === 0) return [];
  const cols = count <= 2 ? count : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);

  const padX = cardW * 0.55;
  const padY = cardH * 0.55;
  const innerW = Math.max(1, width - padX * 2);
  const innerH = Math.max(1, height - padY * 2);
  const cellW = innerW / cols;
  const cellH = innerH / rows;

  return ids.slice(0, count).map((id, i) => {
    const seed = hashStr(id);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const baseX = padX + cellW * col + cellW / 2;
    const baseY = padY + cellH * row + cellH / 2;
    const jitterX = (seededRand(seed + 11) - 0.5) * cellW * 0.45;
    const jitterY = (seededRand(seed + 23) - 0.5) * cellH * 0.45;
    const rot = (seededRand(seed + 41) - 0.5) * 26; // -13° ~ +13°
    return { x: baseX + jitterX, y: baseY + jitterY, rot };
  });
}

// ─── Date helpers ───────────────────────────────────────────────────────────
function formatStampDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${String(m).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function MailboxLetterScatter({
  gifts,
  accentColor,
  isDark,
  isDeceased,
  onClose,
  onSelect,
}: Props) {
  // 정렬: read(아래) → unread(중간) → final_letter(맨 위, 마지막에 렌더)
  const sorted = useMemo(() => {
    const score = (g: LunaGift) => {
      if (g.giftType === 'final_letter') return 2;
      if (!g.openedAt) return 1;
      return 0;
    };
    return [...gifts].sort((a, b) => {
      const s = score(a) - score(b);
      if (s !== 0) return s;
      return a.triggerDay - b.triggerDay;
    });
  }, [gifts]);

  const SCATTER_W = 320;
  const SCATTER_H = 380;
  const CARD_W = 124;
  const CARD_H = 158;

  const positions = useMemo(
    () => computeScatter(sorted.length, SCATTER_W, SCATTER_H, CARD_W, CARD_H, sorted.map((g) => g.id)),
    [sorted],
  );

  const unopenedCount = gifts.filter((g) => !g.openedAt).length;
  const headerLabel = isDeceased ? '루나의 마지막 책상' : '루나의 책상';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: isDark ? 'rgba(8, 6, 22, 0.86)' : 'rgba(20, 12, 6, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #2A1F4A 0%, #1A0F36 100%)'
            : 'linear-gradient(135deg, #5C3A1E 0%, #8B5A3C 35%, #A07050 100%)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45), inset 0 0 80px rgba(0,0,0,0.18)',
          padding: 18,
        }}
      >
        {/* 우드 그레인 오버레이 */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: isDark
              ? `repeating-linear-gradient(95deg, transparent 0px, rgba(255,255,255,0.025) 1px, transparent 3px)`
              : `repeating-linear-gradient(92deg, transparent 0px, rgba(0,0,0,0.05) 1px, transparent 2px, rgba(255,255,255,0.025) 3px, transparent 4px)`,
            mixBlendMode: 'overlay',
          }}
        />

        {/* 헤더 */}
        <div className="relative flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16 }}>📬</span>
            <span
              style={{
                fontFamily: ROOM_TOKENS.hudFont,
                fontSize: 12,
                fontWeight: 700,
                color: '#FFF8E7',
                letterSpacing: '0.04em',
              }}
            >
              {headerLabel}
              <span style={{ marginLeft: 8, opacity: 0.65, fontWeight: 500 }}>
                · 편지 {gifts.length}통
                {unopenedCount > 0 && (
                  <span style={{ color: '#FCD34D', marginLeft: 6, fontWeight: 700 }}>
                    (안 읽은 편지 {unopenedCount})
                  </span>
                )}
              </span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            style={{ background: 'rgba(0,0,0,0.28)' }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 책상 면 (편지 흩뿌려지는 영역) */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            width: '100%',
            height: SCATTER_H,
            background: isDark
              ? 'radial-gradient(ellipse at 30% 25%, rgba(165,140,255,0.14) 0%, transparent 60%), linear-gradient(160deg, #1A0F36 0%, #2A1F4A 100%)'
              : 'radial-gradient(ellipse at 30% 25%, rgba(255,240,210,0.55) 0%, transparent 55%), linear-gradient(160deg, #C89B6E 0%, #A87850 60%, #8B5A3C 100%)',
            boxShadow: 'inset 0 6px 18px rgba(0,0,0,0.28), inset 0 -10px 24px rgba(0,0,0,0.20)',
          }}
        >
          {/* 그레인 도트 */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.18]"
            aria-hidden
            style={{
              backgroundImage: `radial-gradient(rgba(0,0,0,0.5) 1px, transparent 1px)`,
              backgroundSize: '4px 4px',
            }}
          />

          {/* 빈 상태 */}
          {sorted.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span style={{ fontSize: 36, opacity: 0.55 }}>✉️</span>
              <span
                style={{
                  fontFamily: ROOM_TOKENS.whisperFont,
                  fontSize: 14,
                  color: '#FFF8E7CC',
                }}
              >
                아직 편지가 없어
              </span>
              <span
                style={{
                  fontFamily: ROOM_TOKENS.hudFont,
                  fontSize: 10,
                  color: '#FFF8E780',
                }}
              >
                루나가 며칠 더 자라면 첫 편지를 줄 거야
              </span>
            </div>
          )}

          {/* 편지 카드들 */}
          {sorted.map((g, i) => {
            const pos = positions[i];
            const tint = PAPER_TINT[g.giftType];
            const unread = !g.openedAt;
            const isFinal = g.giftType === 'final_letter';

            return (
              <LetterCard
                key={g.id}
                gift={g}
                pos={pos}
                tint={tint}
                unread={unread}
                isFinal={isFinal}
                width={CARD_W}
                height={CARD_H}
                index={i}
                onClick={() => onSelect(g)}
              />
            );
          })}
        </div>

        {/* 푸터 힌트 */}
        <div className="relative mt-3 text-center">
          <span
            style={{
              fontFamily: ROOM_TOKENS.whisperFont,
              fontSize: 13,
              color: '#FFF8E7CC',
            }}
          >
            {sorted.length === 0
              ? ' '
              : isDeceased
                ? '천천히, 마음의 속도로 읽어줘'
                : '편지를 골라서 열어볼래?'}
          </span>
        </div>

        {/* 액센트 컬러 라인 (디오라마와 시각 연결) */}
        <div
          className="absolute left-0 right-0 bottom-0 pointer-events-none"
          style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}88, transparent)` }}
        />
      </motion.div>
    </motion.div>
  );
}

// ─── LetterCard ─────────────────────────────────────────────────────────────
interface CardProps {
  gift: LunaGift;
  pos: ScatterPos;
  tint: PaperTint;
  unread: boolean;
  isFinal: boolean;
  width: number;
  height: number;
  index: number;
  onClick: () => void;
}

function LetterCard({
  gift,
  pos,
  tint,
  unread,
  isFinal,
  width,
  height,
  index,
  onClick,
}: CardProps) {
  const stampDate = formatStampDate(gift.createdAt);
  const baseZ = isFinal ? 200 : unread ? 100 + index : 1 + index;

  return (
    <motion.button
      type="button"
      initial={{
        x: pos.x - width / 2,
        y: -180,
        rotate: pos.rot - 35,
        opacity: 0,
        scale: 0.55,
      }}
      animate={{
        x: pos.x - width / 2,
        y: pos.y - height / 2,
        rotate: pos.rot,
        opacity: 1,
        scale: 1,
      }}
      whileHover={{
        y: pos.y - height / 2 - 14,
        rotate: pos.rot * 0.3,
        scale: 1.06,
        zIndex: 999,
        transition: { type: 'spring', stiffness: 320, damping: 22 },
      }}
      whileTap={{ scale: 0.96 }}
      transition={{
        delay: 0.06 + index * 0.07,
        type: 'spring',
        stiffness: 180,
        damping: 18,
      }}
      onClick={onClick}
      className="absolute focus:outline-none"
      style={{
        width,
        height,
        zIndex: baseZ,
        cursor: 'pointer',
        background: tint.bg,
        borderRadius: 6,
        boxShadow:
          '0 6px 14px rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.20), inset 0 0 0 1px rgba(255,255,255,0.35)',
        border: '1px solid rgba(0,0,0,0.06)',
        padding: 0,
        textAlign: 'left',
        overflow: 'hidden',
      }}
      aria-label={`${gift.triggerDay}일째 편지 — ${gift.title}${unread ? ' (안 읽음)' : ''}`}
    >
      {/* 종이 줄무늬 (편지지 ruled lines) */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage: `repeating-linear-gradient(transparent 0px, transparent 17px, ${tint.ruled} 18px)`,
          opacity: 0.55,
        }}
      />

      {/* 마스킹 테이프 (상단 중앙, 살짝 비뚤어짐) */}
      <div
        className="absolute"
        aria-hidden
        style={{
          top: -6,
          left: '50%',
          transform: 'translateX(-50%) rotate(-3deg)',
          width: 58,
          height: 16,
          background: tint.tape,
          boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
          // 셀로판 줄무늬
          backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 6px)`,
        }}
      />

      {/* 우표/도장 영역 (top-right) */}
      <div
        className="absolute"
        style={{
          top: 11,
          right: 9,
          padding: '3px 6px',
          border: `1.5px solid ${tint.ink}`,
          borderRadius: 4,
          color: tint.ink,
          fontFamily: ROOM_TOKENS.hudFont,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.04em',
          background: 'rgba(255,255,255,0.42)',
          transform: 'rotate(6deg)',
          opacity: 0.88,
        }}
      >
        D+{gift.triggerDay}
      </div>

      {/* 큰 숫자 (며칠째) */}
      <div
        style={{
          position: 'absolute',
          top: 22,
          left: 12,
          fontFamily: ROOM_TOKENS.whisperFont,
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1,
          color: tint.ink,
          opacity: 0.92,
          textShadow: '0 1px 0 rgba(255,255,255,0.4)',
        }}
      >
        {gift.triggerDay}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 14,
          fontFamily: ROOM_TOKENS.hudFont,
          fontSize: 9,
          fontWeight: 700,
          color: tint.ink,
          opacity: 0.6,
          letterSpacing: '0.1em',
        }}
      >
        일째 편지
      </div>

      {/* 제목 (간략) */}
      <div
        style={{
          position: 'absolute',
          bottom: 38,
          left: 10,
          right: 10,
          fontFamily: ROOM_TOKENS.whisperFont,
          fontSize: 13,
          color: tint.ink,
          opacity: 0.85,
          lineHeight: 1.25,
          maxHeight: 36,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {gift.title}
      </div>

      {/* 날짜 도장 (bottom-left) */}
      {stampDate && (
        <div
          style={{
            position: 'absolute',
            bottom: 18,
            left: 10,
            fontFamily: ROOM_TOKENS.hudFont,
            fontSize: 8,
            color: tint.ink,
            opacity: 0.45,
            letterSpacing: '0.1em',
            fontWeight: 600,
          }}
        >
          {stampDate}
        </div>
      )}

      {/* 하단: 아이콘 + 상태 */}
      <div
        className="absolute"
        style={{
          left: 8,
          right: 8,
          bottom: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 16, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.18))' }}>
          {ICON[gift.giftType]}
        </span>
        {unread ? (
          <UnreadSeal isFinal={isFinal} />
        ) : (
          <span
            style={{
              fontFamily: ROOM_TOKENS.hudFont,
              fontSize: 8,
              color: tint.ink,
              opacity: 0.42,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            읽음
          </span>
        )}
      </div>

      {/* 미열람 외곽 펄스 */}
      {unread && !isFinal && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(239, 68, 68, 0)',
              '0 0 0 8px rgba(239, 68, 68, 0.18)',
              '0 0 0 0 rgba(239, 68, 68, 0)',
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ borderRadius: 6 }}
        />
      )}

      {/* 마지막 편지 shimmer */}
      {isFinal && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          animate={{ x: ['-100%', '120%'] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.6 }}
          style={{
            background:
              'linear-gradient(120deg, transparent 25%, rgba(255,240,180,0.55) 50%, transparent 75%)',
            mixBlendMode: 'plus-lighter',
          }}
        />
      )}
    </motion.button>
  );
}

// ─── Wax seal ───────────────────────────────────────────────────────────────
function UnreadSeal({ isFinal }: { isFinal: boolean }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: isFinal
          ? 'radial-gradient(circle at 35% 28%, #FCD34D 0%, #D97706 70%, #92400E 100%)'
          : 'radial-gradient(circle at 35% 28%, #FCA5A5 0%, #DC2626 65%, #7F1D1D 100%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.30), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 2px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 9,
        fontWeight: 800,
        textShadow: '0 1px 1px rgba(0,0,0,0.4)',
        fontFamily: ROOM_TOKENS.hudFont,
        letterSpacing: '0.04em',
      }}
      aria-label={isFinal ? '마지막 편지' : '안 읽은 편지'}
    >
      {isFinal ? '★' : 'NEW'}
    </motion.div>
  );
}
