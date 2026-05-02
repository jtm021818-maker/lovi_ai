'use client';

/**
 * v104 M2: LunaShowReaction
 *
 * "루나에게 보여주기" 후 한 줄 반응 모달 (가볍게).
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  inventoryItemId: string | null;
  onClose: () => void;
}

export default function LunaShowReaction({ open, inventoryItemId, onClose }: Props) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !inventoryItemId) return;
    let cancelled = false;
    async function fetch1() {
      setLoading(true);
      try {
        const r = await fetch(`/api/luna-room/inventory/${inventoryItemId}/show-luna`, {
          method: 'POST',
        });
        const d = await r.json();
        if (!cancelled) setReaction(d.reaction ?? null);
      } catch {
        if (!cancelled) setReaction('— 잠깐, 루나가 못 들었나봐.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch1();
    return () => { cancelled = true; };
  }, [open, inventoryItemId]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="fixed inset-x-6 z-[261] flex justify-center"
            style={{ top: '30%' }}
          >
            <div
              className="max-w-xs w-full p-5 rounded-3xl text-center"
              style={{
                background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)',
                border: '1px solid rgba(212,175,55,0.45)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              }}
            >
              <div className="text-[10px] font-black tracking-widest text-[#7c5738]/60 mb-2">
                💬 루나가
              </div>
              <div className="min-h-[60px] flex items-center justify-center">
                {loading ? (
                  <span className="text-[11px] text-[#a1887f] italic">루나가 보고 있어…</span>
                ) : (
                  <p className="text-[#3a2418] text-[14px] leading-relaxed font-semibold"
                    style={{ fontFamily: 'serif' }}
                  >
                    “{reaction ?? '...'}”
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="mt-4 w-full py-2.5 rounded-xl text-[12px] font-bold active:scale-[0.98]"
                style={{ background: 'rgba(0,0,0,0.06)', color: '#7c5738' }}
              >
                닫기
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
