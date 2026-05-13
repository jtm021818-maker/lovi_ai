'use client';

/**
 * 🆕 v117: GateOpenMoment — Stardew bouquet 메커닉.
 *
 * 평균 ≥ 35 (Lv 3 개화 진입) 시 자동으로 등장하는 풀스크린 모먼트.
 * 유저가 "예, 더 열게" 를 의식적으로 탭해야 Lv 4 진입 가능.
 *
 * 계획서: docs/v117-relationship-redesign-plan.md 5장
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';

const HANDWRITE = '"Gowun Dodum", "Nanum Pen Script", system-ui';

interface Props {
  /** 친밀도 평균 점수 (4축 평균) */
  avgScore: number;
  /** 현재 레벨 */
  level: number;
  /** 페르소나 */
  persona?: 'luna' | 'tarot';
  /** 게이트 통과 후 콜백 (페이지 새로고침 등) */
  onOpened?: () => void;
}

interface GateState {
  gate_level: number;
  opened_at: string | null;
}

export default function GateOpenMoment({
  avgScore, level, persona = 'luna', onOpened,
}: Props) {
  const [gates, setGates] = useState<GateState[] | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 게이트 상태 조회
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/relationship/gate/open?persona=${persona}`);
        if (!r.ok) {
          if (!cancelled) setGates([]);
          return;
        }
        const json = await r.json();
        if (!cancelled) setGates(json.gates ?? []);
      } catch {
        if (!cancelled) setGates([]);
      }
    })();
    return () => { cancelled = true; };
  }, [persona]);

  // 등장 조건: 평균 35 이상 (Lv3 개화) + gate_level=3 아직 안 열림
  useEffect(() => {
    if (gates == null) return;
    const lv3Gate = gates.find(g => g.gate_level === 3);
    const alreadyOpened = !!(lv3Gate?.opened_at);
    if (avgScore >= 35 && level >= 3 && !alreadyOpened) {
      // 살짝 딜레이로 페이지 로드 후 부드럽게 등장
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [gates, avgScore, level]);

  async function handleOpen() {
    if (submitting) return;
    setSubmitting(true);
    triggerHaptic('medium');
    playSound('sparkle');
    try {
      await fetch('/api/relationship/gate/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona, gate_level: 3 }),
      });
      // 부드럽게 닫힘
      setTimeout(() => {
        setOpen(false);
        onOpened?.();
      }, 1200);
    } catch {
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleLater() {
    triggerHaptic('selection');
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[400] flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at 60% 30%, rgba(252,231,243,0.94) 0%, rgba(255,228,230,0.95) 40%, rgba(252,213,193,0.96) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* 떠다니는 꽃잎 */}
          {[...Array(12)].map((_, i) => (
            <motion.svg
              key={i}
              viewBox="0 0 20 20"
              width={10 + (i % 4) * 3}
              height={10 + (i % 4) * 3}
              className="absolute pointer-events-none"
              style={{
                left: `${5 + (i * 8) % 90}%`,
                top: `${10 + (i * 11) % 80}%`,
              }}
              animate={{
                y: [0, -14, 0],
                rotate: [0, 15, 0],
                opacity: [0.4, 0.85, 0.4],
              }}
              transition={{
                duration: 4 + (i % 5),
                repeat: Infinity,
                delay: (i * 0.3) % 3,
                ease: 'easeInOut',
              }}
            >
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="10" cy="5.5" rx="2.4" ry="3.8"
                  fill="#fbcfe8" stroke="#f472b6" strokeWidth="0.5"
                  transform={`rotate(${deg} 10 10)`}
                />
              ))}
              <circle cx="10" cy="10" r="1.5" fill="#fde68a" />
            </motion.svg>
          ))}

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 22 }}
            className="relative w-[88%] max-w-[360px] px-6 py-7"
            style={{
              background: 'rgba(255,253,247,0.96)',
              borderRadius: 18,
              boxShadow: '0 20px 50px rgba(190,24,93,0.22), 0 6px 14px rgba(190,24,93,0.12)',
              border: '1px solid rgba(244,114,182,0.20)',
              textAlign: 'center',
            }}
          >
            {/* 봉투 봉인 일러스트 (왁스 씰) */}
            <motion.div
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 14 }}
              className="mx-auto mb-3"
              style={{
                width: 64, height: 64,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 32% 28%, #f9a8d4, #be185d 70%)',
                boxShadow: '0 4px 12px rgba(190,24,93,0.35), inset 0 -3px 6px rgba(157,23,77,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28,
              }}
            >
              💌
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              style={{
                fontFamily: HANDWRITE,
                fontSize: 22,
                color: '#7c1d3a',
                lineHeight: 1.3,
                marginBottom: 8,
              }}
            >
              마음을 더 열까?
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              style={{
                fontFamily: HANDWRITE,
                fontSize: 14,
                color: '#9d174d',
                lineHeight: 1.5,
                opacity: 0.82,
                marginBottom: 22,
              }}
            >
              여기까지 와줘서 고마워.<br />
              이제부터는 — 진심으로 가까워지는 사이.<br />
              <span style={{ fontSize: 11, opacity: 0.7 }}>(되돌리고 싶으면 언제든 말해줘)</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.5 }}
              className="flex flex-col gap-2"
            >
              <button
                onClick={handleOpen}
                disabled={submitting}
                style={{
                  padding: '11px 18px',
                  background: 'linear-gradient(180deg, #f472b6 0%, #be185d 100%)',
                  color: '#fff',
                  fontFamily: HANDWRITE,
                  fontSize: 15,
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 12,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 6px 14px rgba(190,24,93,0.32), inset 0 -2px 0 rgba(157,23,77,0.3)',
                  transition: 'transform 120ms ease',
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {submitting ? '봉인 풀리는 중…' : '응, 더 열게 💕'}
              </button>
              <button
                onClick={handleLater}
                disabled={submitting}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  color: '#9d174d',
                  fontFamily: HANDWRITE,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: 0.7,
                }}
              >
                아직은… 다음에
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
