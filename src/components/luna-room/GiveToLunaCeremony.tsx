'use client';

/**
 * v104 M4: GiveToLunaCeremony
 *
 * 사용자 → 루나 선물 의례.
 * 흐름: 확인 → 보내는 애니 → 루나 답례 한 줄
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  inventoryItemId: string | null;
  itemEmoji: string;
  itemName: string;
  onClose: () => void;
  onGiven: () => void;
}

type Phase = 'confirm' | 'flying' | 'reaction';

export default function GiveToLunaCeremony({
  open, inventoryItemId, itemEmoji, itemName, onClose, onGiven,
}: Props) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [reaction, setReaction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase('confirm');
      setReaction(null);
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
      const d = await r.json();
      if (r.ok) {
        // 비행 애니 잠깐 보여준 뒤 reaction
        setTimeout(() => {
          setReaction(d.reaction ?? '— 받았어. 고마워.');
          setPhase('reaction');
        }, 1800);
      } else {
        setReaction(d.muted ? '— 루나는 더 이상 답하지 않아.' : (d.error ?? '잠깐, 못 받았어.'));
        setPhase('reaction');
      }
    } catch {
      setReaction('연결이 잠깐 끊겼어.');
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
                <div className="text-[14px] font-black text-[#3a2418] mb-1">
                  루나에게 주기
                </div>
                <div className="text-[11.5px] text-[#7c5738]/80 leading-relaxed mb-4 italic"
                  style={{ fontFamily: 'serif' }}
                >
                  {itemName} — 루나에게 줄까?<br />
                  <span className="text-[10px] text-[#a1887f]">(가방에서 사라지고, 루나의 추억으로 보관돼)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={close}
                    className="flex-1 py-3 rounded-2xl text-[12px] font-bold text-[#7c5738] active:scale-[0.98]"
                    style={{ background: 'rgba(0,0,0,0.06)' }}
                  >
                    잠깐
                  </button>
                  <button
                    onClick={send}
                    disabled={busy}
                    className="flex-[1.4] py-3 rounded-2xl text-[12px] font-bold text-white active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)' }}
                  >
                    응, 줄게
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'flying' && (
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
              {/* 작은 하트 파티클 */}
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
          )}

          {phase === 'reaction' && (
            <motion.div
              key="give-react"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 22 }}
              className="fixed inset-x-6 z-[271] flex justify-center"
              style={{ top: '26%' }}
            >
              <div
                className="max-w-sm w-full p-6 rounded-3xl text-center"
                style={{
                  background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)',
                  border: '1px solid rgba(212,175,55,0.55)',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
                }}
              >
                <div className="text-[10px] font-black tracking-widest text-[#7c5738]/65 mb-2">
                  💬 루나가 받았어
                </div>
                <div className="min-h-[60px] flex items-center justify-center mb-4">
                  <p
                    className="text-[#3a2418] text-[13.5px] leading-relaxed font-semibold"
                    style={{ fontFamily: 'serif' }}
                  >
                    “{reaction ?? '...'}”
                  </p>
                </div>
                <button
                  onClick={close}
                  className="w-full py-3 rounded-2xl text-[12px] font-bold active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899)', color: 'white' }}
                >
                  좋아
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
