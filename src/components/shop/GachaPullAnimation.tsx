'use client';

/**
 * results: PullResult[] | null
 *   - null  → 서스펜스 중 (API 응답 대기)
 *   - array → 서스펜스 끝나는 동시에 reveal 시작
 *
 * 서스펜스 타이머(1500ms) 와 API 응답 중
 * 둘 다 준비됐을 때만 reveal로 전환.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { PullResult } from '@/types/gacha.types';
import { getSpirit } from '@/data/spirits';
import SpiritSprite from '@/components/spirit/SpiritSprite';

interface Props {
  results: PullResult[] | null;
  onFinish: () => void;
}

const RARITY_EFFECT: Record<string, { bg: string; glow: string; label: string }> = {
  N:  { bg: 'linear-gradient(135deg, #9ca3af, #6b7280)', glow: 'rgba(156,163,175,0.5)', label: '일반' },
  R:  { bg: 'linear-gradient(135deg, #60a5fa, #2563eb)', glow: 'rgba(96,165,250,0.6)',  label: '레어' },
  SR: { bg: 'linear-gradient(135deg, #c084fc, #7c3aed)', glow: 'rgba(192,132,252,0.7)', label: '슈퍼레어' },
  UR: { bg: 'linear-gradient(135deg, #fbbf24, #ec4899, #8b5cf6)', glow: 'rgba(251,191,36,0.9)', label: '울트라레어' },
  L:  { bg: 'linear-gradient(135deg, #06b6d4, #3b82f6, #ec4899)', glow: 'rgba(6,182,212,1)', label: '전설' },
};

// 결과가 없을 때 서스펜스 배경용 기본값
const DEFAULT_GLOW = 'rgba(192,132,252,0.6)';

function bestRarity(results: PullResult[]) {
  const order = ['N', 'R', 'SR', 'UR', 'L'];
  return results.reduce((b, r) =>
    order.indexOf(r.rarity) > order.indexOf(b.rarity) ? r : b
  , results[0]);
}

function FlipCard({ result, flipped }: { result: PullResult; flipped: boolean }) {
  const sp = getSpirit(result.spiritId);
  const eff = RARITY_EFFECT[result.rarity];

  return (
    <div style={{ perspective: '700px' }} className="relative w-20 h-28">
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
      >
        {/* 뒷면: card_back_img.webp */}
        <div style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          position: 'absolute', inset: 0,
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <Image src="/ui/card_back_img.webp" fill sizes="80px" alt="card back" className="object-cover" />
        </div>

        {/* 앞면: 정령 */}
        <div style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          position: 'absolute', inset: 0,
          borderRadius: 12,
          background: eff.bg,
          boxShadow: `0 0 20px ${eff.glow}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {result.isNew && (
            <div style={{
              position: 'absolute', top: -8, right: -8,
              padding: '2px 6px', borderRadius: 9999,
              background: '#ec4899', fontSize: 8, fontWeight: 900, color: 'white',
            }}>NEW</div>
          )}
          <div className="mb-1 flex items-center justify-center">
            {sp ? <SpiritSprite spirit={sp} size={44} /> : null}
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'white' }}>{sp?.name}</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)' }}>{result.rarity}</div>
          {result.bondBonus && (
            <div className="flex flex-col items-center gap-0.5 mt-0.5">
              {result.bondBonus.overflowHearts ? (
                <div style={{ fontSize: 7, fontWeight: 700, color: '#fef08a' }}>
                  +{result.bondBonus.overflowHearts}💎
                </div>
              ) : (
                <div style={{ fontSize: 7, fontWeight: 900, color: '#fde68a' }}>
                  +{result.bondBonus.xpGained}XP
                </div>
              )}
              {result.bondBonus.lvAfter > result.bondBonus.lvBefore && (
                <div style={{
                  padding: '1px 4px', borderRadius: 9999,
                  fontSize: 6, fontWeight: 900,
                  background: 'rgba(251,191,36,0.35)', color: '#fde68a',
                }}>
                  ↑Lv{result.bondBonus.lvAfter}
                </div>
              )}
            </div>
          )}
          {!result.bondBonus && result.duplicateRefund?.heartStone && (
            <div style={{ fontSize: 7, color: '#fef08a' }}>+💎{result.duplicateRefund.heartStone}</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function GachaPullAnimation({ results, onFinish }: Props) {
  const [phase, setPhase] = useState<'suspense' | 'reveal' | 'grid'>('suspense');
  const [flippedSet, setFlippedSet] = useState<Set<number>>(new Set());

  // 두 조건이 모두 충족돼야 reveal 시작
  const suspenseDone = useRef(false);
  const latestResults = useRef<PullResult[] | null>(null);

  const tryReveal = () => {
    if (suspenseDone.current && latestResults.current) {
      setPhase('reveal');
    }
  };

  // 서스펜스 타이머 (1500ms)
  useEffect(() => {
    const t = setTimeout(() => {
      suspenseDone.current = true;
      tryReveal();
    }, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // API 결과 도착 감지
  useEffect(() => {
    if (!results) return;
    latestResults.current = results;
    tryReveal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  // reveal → 카드 순차 뒤집기 → grid
  useEffect(() => {
    if (phase !== 'reveal' || !results) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    results.forEach((_, i) => {
      timers.push(setTimeout(() =>
        setFlippedSet((prev) => new Set([...prev, i])),
        250 + i * 220,
      ));
    });
    const gridDelay = 250 + (results.length - 1) * 220 + 1000;
    timers.push(setTimeout(() => setPhase('grid'), gridDelay));
    return () => timers.forEach(clearTimeout);
  }, [phase, results]);

  const glow = results ? RARITY_EFFECT[bestRarity(results).rarity].glow : DEFAULT_GLOW;
  const pendingCount = results?.length ?? null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${glow} 0%, rgba(0,0,0,0.96) 65%)`,
      }}
    >
      {/* ── 서스펜스: API 대기 중에도 즉시 표시 ── */}
      <AnimatePresence>
        {phase === 'suspense' && (
          <motion.div
            key="suspense"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center gap-5"
          >
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              style={{ position: 'relative', width: 152, height: 212 }}
            >
              <motion.div
                animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.85, 0.45] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', inset: -24, borderRadius: 32,
                  background: `radial-gradient(ellipse, ${glow} 0%, transparent 70%)`,
                  filter: 'blur(12px)', pointerEvents: 'none',
                }}
              />
              <div style={{
                position: 'relative', width: '100%', height: '100%',
                borderRadius: 20, overflow: 'hidden',
                boxShadow: `0 0 60px ${glow}, 0 24px 48px rgba(0,0,0,0.6)`,
              }}>
                <Image src="/ui/card_back_img.webp" fill sizes="152px" alt="card back" className="object-cover" priority />
              </div>
            </motion.div>

            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                color: 'white', fontSize: 13, fontWeight: 700,
                letterSpacing: '0.08em',
                textShadow: `0 0 24px ${glow}`,
              }}
            >
              {pendingCount != null
                ? `${pendingCount}장의 카드 확인 중...`
                : '카드를 확인하는 중...'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── reveal: 카드 뒤집기 ── */}
      {phase === 'reveal' && results && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex flex-wrap justify-center gap-3 p-6 max-w-xl"
        >
          {results.map((r, i) => (
            <motion.div
              key={`${r.spiritId}-${i}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
            >
              <FlipCard result={r} flipped={flippedSet.has(i)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── grid: 결과 요약 ── */}
      {phase === 'grid' && results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-xl p-6"
        >
          <div className="text-center text-white/80 text-sm mb-4 font-bold">🎉 뽑기 결과</div>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {results.map((r, i) => {
              const sp = getSpirit(r.spiritId);
              const eff = RARITY_EFFECT[r.rarity];
              return (
                <div
                  key={i}
                  className="relative aspect-[3/4] rounded-xl flex flex-col items-center justify-center text-white shadow-lg"
                  style={{ background: eff.bg, boxShadow: `0 0 8px ${eff.glow}` }}
                >
                  {r.isNew && (
                    <div className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full bg-pink-500 text-[7px] font-black">N</div>
                  )}
                  <div className="flex items-center justify-center">
                    {sp ? <SpiritSprite spirit={sp} size={32} /> : null}
                  </div>
                  <div className="text-[8px] font-bold truncate max-w-full px-1">{sp?.name}</div>
                  <div className="text-[7px] opacity-80">{r.rarity}</div>
                  {r.bondBonus && (
                    <div className="flex flex-col items-center gap-0.5 mt-0.5">
                      {r.bondBonus.overflowHearts ? (
                        <div className="text-[7px] font-bold text-yellow-200 tabular-nums">+{r.bondBonus.overflowHearts}💎</div>
                      ) : (
                        <div className="text-[7px] font-black tabular-nums" style={{ color: '#fde68a' }}>+{r.bondBonus.xpGained}XP</div>
                      )}
                      {r.bondBonus.lvAfter > r.bondBonus.lvBefore && (
                        <div className="px-1 py-0.5 rounded-full text-[6px] font-black" style={{ background: 'rgba(251,191,36,0.35)', color: '#fde68a' }}>
                          ↑Lv{r.bondBonus.lvAfter}
                        </div>
                      )}
                    </div>
                  )}
                  {!r.bondBonus && r.duplicateRefund?.heartStone && (
                    <div className="text-[7px] text-yellow-200">+💎{r.duplicateRefund.heartStone}</div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={onFinish}
            className="w-full py-3 rounded-2xl bg-white text-purple-700 font-bold text-[14px] active:scale-95"
          >
            확인
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
