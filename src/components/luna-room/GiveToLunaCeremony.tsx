'use client';

/**
 * v118: GiveToLunaCeremony — 4축 친밀도 progress bar + Streak chip + Daily cap 인디케이터 추가
 *
 * 흐름: 확인 → 보내는 애니 → 루나 답례 + 친밀도 변화 패널
 *
 * v118 신규:
 *  - 4축 (trust/openness/bond/respect) progress bar 4개 애니메이션
 *  - 가장 크게 증가한 축은 ✨ 글로우 강조
 *  - [🔥 N일 연속] streak 칩
 *  - 일일 캡 (3개) 표시 + 캡 초과 시 "오늘은 충분히 줬어" 메시지
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AxisDelta {
  trust: number;
  openness: number;
  bond: number;
  respect: number;
}

interface GiveResponse {
  reaction?: string;
  intimacyDelta?: AxisDelta;
  streak?: {
    count: number;
    bonus: Partial<AxisDelta> | null;
    isMilestone: boolean;
  };
  dailyCap?: {
    capped: boolean;
    todayCount: number;
    max: number;
  };
  muted?: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  inventoryItemId: string | null;
  itemEmoji: string;
  itemName: string;
  onClose: () => void;
  onGiven: () => void;
}

type Phase = 'confirm' | 'flying' | 'reaction';

const AXIS_META: Array<{ key: keyof AxisDelta; label: string; emoji: string; color: string }> = [
  { key: 'trust',    label: '신뢰', emoji: '🤝', color: '#3b82f6' },
  { key: 'openness', label: '개방', emoji: '🌸', color: '#ec4899' },
  { key: 'bond',     label: '유대', emoji: '💞', color: '#a855f7' },
  { key: 'respect',  label: '존중', emoji: '🪞', color: '#f59e0b' },
];

export default function GiveToLunaCeremony({
  open, inventoryItemId, itemEmoji, itemName, onClose, onGiven,
}: Props) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [response, setResponse] = useState<GiveResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase('confirm');
      setResponse(null);
    }
  }, [open]);

  async function send() {
    if (!inventoryItemId || busy) return;
    setBusy(true);
    setPhase('flying');
    try {
      const r = await fetch(`/api/luna-room/inventory/${inventoryItemId}/give-to-luna`, {
        method: 'POST',
      });
      const d: GiveResponse = await r.json();
      if (r.ok) {
        setTimeout(() => {
          setResponse(d);
          setPhase('reaction');
        }, 1700);
      } else {
        setResponse({
          reaction: d.muted ? '— 루나는 더 이상 답하지 않아.' : (d.error ?? '잠깐, 못 받았어.'),
        });
        setPhase('reaction');
      }
    } catch {
      setResponse({ reaction: '연결이 잠깐 끊겼어.' });
      setPhase('reaction');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (phase === 'reaction') onGiven();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="give-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[270] bg-black/65 backdrop-blur-sm"
            onClick={phase === 'confirm' ? close : undefined}
          />

          {phase === 'confirm' && (
            <ConfirmCard
              itemEmoji={itemEmoji}
              itemName={itemName}
              busy={busy}
              onCancel={close}
              onSend={send}
            />
          )}

          {phase === 'flying' && (
            <FlyingAnimation itemEmoji={itemEmoji} />
          )}

          {phase === 'reaction' && response && (
            <ReactionCard response={response} onClose={close} />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Confirm
// ============================================================
function ConfirmCard({
  itemEmoji, itemName, busy, onCancel, onSend,
}: { itemEmoji: string; itemName: string; busy: boolean; onCancel: () => void; onSend: () => void }) {
  return (
    <motion.div
      key="give-confirm"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
      className="fixed inset-x-6 z-[271] flex justify-center"
      style={{ top: '24%' }}
    >
      <div
        className="max-w-sm w-full p-6 rounded-3xl text-center"
        style={{
          background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)',
          border: '1px solid rgba(212,175,55,0.45)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
        }}
      >
        <div className="text-[44px] mb-2">{itemEmoji}</div>
        <div className="text-[14px] font-black text-[#3a2418] mb-1">루나에게 주기</div>
        <div className="text-[11.5px] text-[#7c5738]/80 leading-relaxed mb-4 italic"
          style={{ fontFamily: 'var(--font-handwrite-soft)' }}
        >
          {itemName} — 루나에게 줄까?<br />
          <span className="text-[10px] text-[#a1887f]">(가방에서 사라지고, 루나의 추억으로 보관돼)</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-[12px] font-bold text-[#7c5738] active:scale-[0.98]"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            잠깐
          </button>
          <button
            onClick={onSend}
            disabled={busy}
            className="flex-[1.4] py-3 rounded-2xl text-[12px] font-bold text-white active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
          >
            응, 줄게
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Flying
// ============================================================
function FlyingAnimation({ itemEmoji }: { itemEmoji: string }) {
  return (
    <motion.div
      key="give-fly"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[271] flex items-center justify-center pointer-events-none"
    >
      <motion.div
        initial={{ x: -160, y: 80, opacity: 0, scale: 0.5, rotate: -20 }}
        animate={{
          x: 0,
          y: -40,
          opacity: [0, 1, 1, 0.7],
          scale: [0.5, 1.1, 1, 0.85],
          rotate: [-20, 0, 8, -6, 0],
        }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        className="text-[72px]"
      >
        {itemEmoji}
      </motion.div>
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: Math.cos((i / 6) * Math.PI * 2) * 120,
            y: -100 + Math.sin((i / 6) * Math.PI * 2) * 60,
          }}
          transition={{ duration: 1.6, delay: 0.6 + i * 0.08 }}
          className="absolute text-pink-300 text-base"
        >
          💗
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================
// Reaction — 친밀도 4축 progress + streak chip + daily cap
// ============================================================
function ReactionCard({
  response, onClose,
}: { response: GiveResponse; onClose: () => void }) {
  const delta = response.intimacyDelta;
  const streak = response.streak;
  const cap = response.dailyCap;
  const isCapped = cap?.capped ?? false;

  // 가장 크게 증가한 축
  const maxAxis = delta
    ? AXIS_META.reduce((m, a) => (delta[a.key] > delta[m.key] ? a : m), AXIS_META[0])
    : null;

  return (
    <motion.div
      key="give-react"
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', damping: 22 }}
      className="fixed inset-x-4 z-[271] flex justify-center"
      style={{ top: '14%' }}
    >
      <div
        className="max-w-sm w-full p-5 rounded-3xl"
        style={{
          background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)',
          border: '1px solid rgba(212,175,55,0.55)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
        }}
      >
        {/* 헤더 */}
        <div className="text-center mb-3">
          <div className="text-[10px] font-black tracking-widest text-[#7c5738]/65 mb-1.5">
            💬 루나가 받았어
          </div>
          <div className="min-h-[52px] flex items-center justify-center px-2">
            <p
              className="text-[#3a2418] text-[13.5px] leading-relaxed font-semibold text-center"
              style={{ fontFamily: 'var(--font-handwrite-soft)' }}
            >
              &ldquo;{response.reaction ?? '...'}&rdquo;
            </p>
          </div>
        </div>

        {/* 4축 progress (capped 가 아닐 때만) */}
        {delta && !isCapped && (
          <div className="px-1 mb-3">
            <div className="text-[9px] font-black text-[#7c5738]/60 tracking-widest mb-2 text-center">
              관계가 조금 더 가까워졌어
            </div>
            <div className="space-y-1.5">
              {AXIS_META.map((a) => {
                const value = delta[a.key];
                const isMax = maxAxis?.key === a.key && value > 0;
                const bonusValue = streak?.bonus?.[a.key] ?? 0;
                if (value === 0) return null;
                return (
                  <AxisBar key={a.key} meta={a} delta={value} bonus={bonusValue} highlight={isMax} />
                );
              })}
            </div>
          </div>
        )}

        {/* Streak 칩 */}
        {streak && streak.count >= 1 && !isCapped && (
          <div className="flex justify-center mb-3">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: streak.isMilestone
                  ? 'linear-gradient(135deg, #fb923c, #f97316, #ea580c)'
                  : 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(249,115,22,0.10))',
                border: streak.isMilestone ? 'none' : '1px solid rgba(249,115,22,0.30)',
                color: streak.isMilestone ? 'white' : '#c2410c',
                boxShadow: streak.isMilestone ? '0 4px 12px rgba(249,115,22,0.4)' : 'none',
              }}
            >
              <span className="text-[12px]">🔥</span>
              <span className="text-[11px] font-black tabular-nums">{streak.count}일 연속</span>
              {streak.isMilestone && streak.bonus && (
                <span className="text-[9px] font-bold opacity-90">+ 보너스</span>
              )}
            </div>
          </div>
        )}

        {/* Daily cap 인디케이터 */}
        {cap && (
          <div className="mb-3">
            {isCapped ? (
              <div
                className="px-3 py-2 rounded-xl text-center text-[10.5px] font-bold leading-relaxed"
                style={{ background: 'rgba(168,85,247,0.12)', color: '#7c3aed', border: '1px solid rgba(168,85,247,0.25)' }}
              >
                오늘은 충분히 줬어. 다음 선물은 내일 ✨
              </div>
            ) : (
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-[#7c5738]/70">오늘 선물</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: cap.max }).map((_, i) => (
                      <div key={i}
                        className="w-2 h-2 rounded-full transition-colors"
                        style={{ background: i < cap.todayCount ? '#ec4899' : 'rgba(236,72,153,0.18)' }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-[#7c5738]">
                    {cap.todayCount}/{cap.max}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl text-[12px] font-bold active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white' }}
        >
          좋아
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// 4축 progress bar 1줄
// ============================================================
function AxisBar({
  meta, delta, bonus, highlight,
}: {
  meta: { key: string; label: string; emoji: string; color: string };
  delta: number;
  bonus: number;
  highlight: boolean;
}) {
  // 시각화: 0~3 범위로 가정 (선물당 최대 ~5 — UR proud 케이스)
  const pct = Math.min(100, (delta / 4) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-[58px] flex-shrink-0">
        <span className="text-[13px] leading-none">{meta.emoji}</span>
        <span className="text-[10px] font-bold text-[#3a2418]">{meta.label}</span>
        {highlight && <span className="text-[10px]">✨</span>}
      </div>
      <div className="flex-1 h-2 rounded-full overflow-hidden relative"
        style={{ background: 'rgba(0,0,0,0.06)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
          className="absolute inset-y-0 left-0"
          style={{
            background: highlight
              ? `linear-gradient(90deg, ${meta.color}, ${meta.color}cc)`
              : meta.color,
            boxShadow: highlight ? `0 0 8px ${meta.color}80` : 'none',
          }}
        />
      </div>
      <div className="text-[10.5px] font-black tabular-nums flex-shrink-0 min-w-[52px] text-right"
        style={{ color: meta.color }}
      >
        +{delta.toFixed(1)}
        {bonus > 0 && (
          <span className="text-[8.5px] font-bold opacity-80 ml-0.5">+{bonus.toFixed(1)}🔥</span>
        )}
      </div>
    </div>
  );
}
