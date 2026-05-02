'use client';

/**
 * v104 M2: TimeCapsuleSealModal + WishMakeModal
 *
 * 타임캡슐 봉인 — 7/14/30일 선택 + 미래 자기에게 메시지.
 * 소원 종이학 — 한 줄 소원 입력 후 띄움.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────
// 타임캡슐 봉인
// ─────────────────────────────────────────────

interface CapsuleProps {
  open: boolean;
  inventoryItemId: string | null;
  onClose: () => void;
  onSealed: () => void;
}

const LOCK_DAYS = [
  { days: 7,  label: '7일',  desc: '한 주 뒤' },
  { days: 14, label: '14일', desc: '두 주 뒤' },
  { days: 30, label: '30일', desc: '한 달 뒤' },
];

export function TimeCapsuleSealModal({ open, inventoryItemId, onClose, onSealed }: CapsuleProps) {
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function seal() {
    if (!inventoryItemId || busy || message.trim().length < 1) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/luna-room/inventory/${inventoryItemId}/seal-capsule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockDays: days, message: message.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setDone(d.message ?? '봉인 완료');
        setTimeout(() => {
          onSealed();
          setDone(null);
          setMessage('');
          setDays(7);
        }, 1800);
      } else {
        setDone(d.error ?? '봉인 실패');
        setTimeout(() => setDone(null), 1800);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cap-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[260] bg-black/65 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="cap-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[261] max-h-[85vh] overflow-y-auto rounded-t-[28px]"
            style={{
              background: 'linear-gradient(180deg, #1a0a2e 0%, #0f0520 100%)',
              color: '#fff',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-[3px] rounded-full bg-white/20" />
            </div>
            <div className="px-6 pt-4 pb-6 text-center">
              <div className="text-[36px] mb-2">⌛</div>
              <div className="text-[15px] font-black mb-1">타임캡슐 봉인</div>
              <div className="text-[11px] text-white/55 leading-relaxed mb-5">
                지금의 너 → 미래의 너에게
              </div>

              {/* 일수 선택 */}
              <div className="flex gap-2 justify-center mb-5">
                {LOCK_DAYS.map((opt) => {
                  const active = days === opt.days;
                  return (
                    <button
                      key={opt.days}
                      onClick={() => setDays(opt.days)}
                      className="flex-1 py-3 rounded-xl active:scale-95 transition-all"
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, rgba(251,191,36,0.30), rgba(236,72,153,0.20))'
                          : 'rgba(255,255,255,0.07)',
                        border: `1.5px solid ${active ? 'rgba(251,191,36,0.55)' : 'rgba(255,255,255,0.10)'}`,
                      }}
                    >
                      <div className={`text-[14px] font-black ${active ? 'text-yellow-200' : 'text-white/70'}`}>
                        {opt.label}
                      </div>
                      <div className={`text-[9px] mt-0.5 ${active ? 'text-yellow-100/70' : 'text-white/40'}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 메시지 입력 */}
              <textarea
                placeholder="미래의 너에게 한 마디… (최대 500자)"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl text-[12px] outline-none resize-none mb-3"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                }}
              />
              <div className="text-right text-[9px] text-white/40 mb-4 tabular-nums">
                {message.length} / 500
              </div>

              {done && (
                <div className="mb-3 text-[11.5px] font-bold text-yellow-200">{done}</div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl text-[12px] font-bold text-white/70 active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  취소
                </button>
                <button
                  onClick={seal}
                  disabled={busy || message.trim().length < 1}
                  className="flex-[1.4] py-3 rounded-2xl text-[12px] font-bold text-white active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
                >
                  {busy ? '봉인 중…' : `${days}일 봉인하기`}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────
// 소원 종이학
// ─────────────────────────────────────────────

interface WishProps {
  open: boolean;
  inventoryItemId: string | null;
  onClose: () => void;
  onMade: () => void;
}

export function WishMakeModal({ open, inventoryItemId, onClose, onMade }: WishProps) {
  const [wish, setWish] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'input' | 'flying'>('input');

  async function makeWish() {
    if (!inventoryItemId || busy || wish.trim().length < 1) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/luna-room/inventory/${inventoryItemId}/make-wish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishText: wish.trim() }),
      });
      if (r.ok) {
        setPhase('flying');
        setTimeout(() => {
          onMade();
          setWish('');
          setPhase('input');
        }, 3500);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="wish-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[260] bg-black/70 backdrop-blur-sm"
            onClick={phase === 'input' ? onClose : undefined}
          />

          {phase === 'input' && (
            <motion.div
              key="wish-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="fixed inset-x-6 z-[261] flex justify-center"
              style={{ top: '20%' }}
            >
              <div
                className="max-w-sm w-full p-6 rounded-3xl text-center"
                style={{
                  background: 'linear-gradient(180deg, #1a0a2e 0%, #0f0520 100%)',
                  border: '1px solid rgba(167,139,250,0.4)',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                }}
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                  className="text-[44px] mb-2"
                >
                  🕊️
                </motion.div>
                <div className="text-[14px] font-black text-white mb-1">소원 종이학</div>
                <div className="text-[11px] text-white/55 mb-4 leading-relaxed">
                  한 마디만 — 어딘가로 흘려 보낼게
                </div>
                <textarea
                  placeholder="너의 한 마디 (최대 200자)"
                  value={wish}
                  onChange={(e) => setWish(e.target.value.slice(0, 200))}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-[12.5px] outline-none resize-none mb-3 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(167,139,250,0.3)',
                    color: '#fff',
                    fontFamily: 'serif',
                  }}
                />
                <div className="text-right text-[9px] text-white/40 mb-4 tabular-nums">
                  {wish.length} / 200
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl text-[12px] font-bold text-white/70 active:scale-[0.98]"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    취소
                  </button>
                  <button
                    onClick={makeWish}
                    disabled={busy || wish.trim().length < 1}
                    className="flex-[1.4] py-3 rounded-2xl text-[12px] font-bold text-white active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #ec4899)' }}
                  >
                    {busy ? '띄우는 중…' : '띄우기'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'flying' && (
            <motion.div
              key="wish-flying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[261] flex items-center justify-center pointer-events-none"
            >
              <motion.div
                initial={{ y: 20, scale: 0.6, opacity: 0 }}
                animate={{
                  y: -260,
                  scale: 1,
                  opacity: [0, 1, 1, 0],
                  rotate: [0, -8, 8, -6, 0],
                }}
                transition={{ duration: 3.2, ease: 'easeOut', times: [0, 0.15, 0.85, 1] }}
                className="text-[60px]"
              >
                🕊️
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 3.2, times: [0, 0.3, 0.85, 1] }}
                className="absolute bottom-32 text-white/85 text-[12px] italic"
                style={{ fontFamily: 'serif' }}
              >
                — 소원이 어딘가로 흘러갔어
              </motion.div>
              {/* 별 파티클 */}
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: Math.cos((i / 8) * Math.PI * 2) * 100,
                    y: -120 + Math.sin((i / 8) * Math.PI * 2) * 60,
                  }}
                  transition={{ duration: 2.4, delay: 0.6 + i * 0.1 }}
                  className="absolute text-yellow-200 text-lg"
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
