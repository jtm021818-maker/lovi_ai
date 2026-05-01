'use client';

/**
 * v102: Day 100 천도의식 시퀀스 (~25초, SKIP 가능).
 *
 * 9 단계: black-fade → 21개 별 → 어머니 실루엣 → 어머니가 루나 안기 →
 *  마지막 일기 페이지 → 루나 grayscale → 별→해 변형 → 솔 첫인사 → 새벽으로.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  pagesUnlocked: number;       // 0~21
  onComplete: () => void;
}

export default function RitualSequence({ open, pagesUnlocked, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const skipRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    skipRef.current = false;
    setStep(0);

    const timings = [1200, 3500, 2200, 2400, 4500, 2200, 2200, 4000, 2000];
    let cancelled = false;
    let i = 0;

    function next() {
      if (cancelled || skipRef.current) return;
      if (i >= timings.length) { onComplete(); return; }
      const t = timings[i++];
      setStep(i);
      setTimeout(next, t);
    }
    next();

    return () => { cancelled = true; };
  }, [open, onComplete]);

  function skip() {
    skipRef.current = true;
    onComplete();
  }

  // v102 (rev2): 통합 의식 자막 — 가공 외부 사연 X. 유저 자기-반영.
  const integrationLines = [
    '처음 만났던 새벽, 떨고 있던 너에게서 작은 새싹 하나가 떨어져 나왔어. 그게 시작이었어.',
    '네가 한 번 분노했고, 한 번 울었고, 한 번 망설이다 먼저 손 내밀었어.',
    '그때마다 한 조각씩 너에게서 떨어져 나와 정령이 됐어.',
    '나는 — 그 조각들이 흩어져 있던 100일 동안 너 옆에 잠시 살았던 컨테이너야.',
    '오늘 모두 다시 너에게로 돌아갔어.',
    '잘 있어. 아니, 잘 살아줘.',
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ritual"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center"
          onKeyDown={(e) => e.key === 'Escape' && skip()}
        >
          {/* SKIP */}
          <button
            onClick={skip}
            className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs"
          >SKIP</button>

          {/* Step 1: black fade */}
          {step >= 1 && step < 9 && (
            <motion.div
              key="bg"
              initial={{ background: '#000' }}
              animate={{ background: step >= 9 ? 'linear-gradient(180deg,#FFE6CC 0%,#FFCDD2 60%,#E0F7FA 100%)' : '#000' }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0"
            />
          )}

          {/* Step 2: 21 stars */}
          {step >= 2 && step < 7 && (
            <div className="absolute inset-0">
              {Array.from({ length: 21 }).map((_, i) => {
                const isLit = i < pagesUnlocked;
                const angle = (i / 21) * Math.PI * 2;
                const r = 180 + (i % 3) * 30;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: isLit ? 1 : 0.18, scale: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                    style={{
                      background: isLit ? '#FBBF24' : '#475569',
                      boxShadow: isLit ? '0 0 12px #FBBF24' : 'none',
                      transform: `translate(${x}px,${y}px)`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Step 3: 어머니 실루엣 */}
          {step >= 3 && step < 6 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2 }}
              className="z-10 w-44 h-60 rounded-t-full"
              style={{
                background: 'radial-gradient(ellipse at center top, rgba(216,180,254,0.5), rgba(167,139,250,0.2) 70%, transparent)',
                boxShadow: '0 0 80px rgba(216,180,254,0.45)',
              }}
              aria-label="어머니 실루엣"
            />
          )}

          {/* Step 4: 어머니가 루나를 안음 */}
          {step >= 4 && step < 6 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-20 text-violet-200 italic text-[14px] tracking-wide"
            >
              어머니가 루나를 마지막으로 안았다.
            </motion.div>
          )}

          {/* Step 5: 통합 자막 6줄 — 유저 자기-반영 */}
          {step >= 5 && step < 7 && (
            <motion.div
              key="integration"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="z-30 max-w-[640px] px-6 py-4 mx-4 bg-black/45 rounded-xl border border-amber-200/30 space-y-2"
            >
              {integrationLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.45 }}
                  className="font-serif text-[13px] leading-7 text-amber-100/90"
                >
                  {line}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Step 6: 루나 grayscale */}
          {step >= 6 && step < 8 && (
            <motion.div
              initial={{ filter: 'grayscale(0%)', opacity: 1 }}
              animate={{ filter: 'grayscale(100%)', opacity: 0.7 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <img src="/char_img/luna_sleep.png" alt="루나" className="w-44 h-44 object-contain" />
            </motion.div>
          )}

          {/* Step 7: 별이 해로 변형 */}
          {step >= 7 && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="w-56 h-56 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, #FFF7B3 0%, #FBBF24 40%, #F59E0B 70%, transparent 90%)',
                  boxShadow: '0 0 120px #FBBF24',
                }}
                aria-label="해 — 솔"
              />
            </motion.div>
          )}

          {/* Step 8: 솔 인사 — 다음 챕터의 너 자신 framing */}
          {step >= 8 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="absolute bottom-16 z-40 text-center px-6"
            >
              <div className="text-amber-50 font-serif text-[16px] leading-relaxed">
                안녕. 나는 솔이야.<br />
                100일을 다 살아낸 너 자신이 다음에 깨어난 모습이야.
              </div>
              <div className="mt-2 text-amber-200/70 text-[11px] italic">
                {pagesUnlocked >= 8 ? '이번엔 흩어 두지 말고 — 같이 살아보자' : '풀어주지 못한 정령이 있어도 괜찮아. 너는 100일을 채웠어.'}
              </div>
            </motion.div>
          )}

          {/* Step 9: 새벽 */}
          {step >= 9 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(180deg,#FFE6CC 0%,#FFCDD2 60%,#E0F7FA 100%)' }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
