'use client';

/**
 * v103: SpiritsRoomLayer
 *
 * 루나 룸에 placed=true 인 정령들을 부유 스프라이트로 그린다.
 * + 페어 인터랙션 말풍선 (30분마다 폴링, 두 정령 사이 a→b 순차 등장)
 * + mood < 30 정령은 반투명 (조용한 상태)
 *
 * 자체적으로 /api/spirits/list 폴링 (60초 주기 — placed/mood 갱신).
 * 페어 인터랙션은 별도 5분 주기 /api/spirits/interactions/check.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SpiritMaster, UserSpirit } from '@/types/spirit.types';
import SpiritSprite from '@/components/spirit/SpiritSprite';

interface PairInteraction {
  fired: true;
  pairKey: string;
  dialogueIndex: number;
  a: { spiritId: string; name: string; line: string };
  b: { spiritId: string; name: string; line: string };
}

interface PlacedSpirit {
  master: SpiritMaster;
  state: UserSpirit;
  /** 룸 내 좌표 (% 단위) */
  pos: { left: string; bottom: string };
}

const PLACEMENT_SLOTS: Array<{ left: string; bottom: string }> = [
  { left: '12%', bottom: '38%' },
  { left: '78%', bottom: '32%' },
  { left: '20%', bottom: '20%' },
  { left: '70%', bottom: '52%' },
  { left: '8%',  bottom: '58%' },
  { left: '85%', bottom: '15%' },
];

const LIST_POLL_MS = 60_000;
const PAIR_POLL_MS = 5 * 60_000;

interface Props {
  /** 부모가 무드/배치 변경을 알아야 할 때 (옵션) */
  onPlacedChange?: (count: number) => void;
}

export default function SpiritsRoomLayer({ onPlacedChange }: Props) {
  const [placed, setPlaced] = useState<PlacedSpirit[]>([]);
  const [interaction, setInteraction] = useState<PairInteraction | null>(null);
  const [bubblePhase, setBubblePhase] = useState<'a' | 'b' | 'done'>('done');

  // ── (1) 정령 리스트 로드 + 폴링 ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const r = await fetch('/api/spirits/list');
        const d: { owned: UserSpirit[]; masterData: SpiritMaster[] } = await r.json();
        if (cancelled) return;
        const masterById = new Map(d.masterData.map((m) => [m.id, m]));
        const placedOnly = (d.owned ?? [])
          .filter((u) => u.isPlacedInRoom)
          .slice(0, PLACEMENT_SLOTS.length);
        const result: PlacedSpirit[] = placedOnly.map((u, i) => ({
          master: masterById.get(u.spiritId)!,
          state: u,
          pos: PLACEMENT_SLOTS[i],
        })).filter((p) => !!p.master);
        setPlaced(result);
        onPlacedChange?.(result.length);
      } catch {
        // silent
      }
    }
    load();
    timer = setInterval(load, LIST_POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [onPlacedChange]);

  // ── (2) 페어 인터랙션 체크 ─────────────────────────────────
  const lastTriggerRef = useRef<number>(0);
  useEffect(() => {
    if (placed.length < 2) return;

    let cancelled = false;
    async function tryFire() {
      // 중복 트리거 가드 (이전 말풍선 진행 중이면 스킵)
      if (interaction || bubblePhase !== 'done') return;
      try {
        const r = await fetch('/api/spirits/interactions/check');
        const d = await r.json();
        if (cancelled) return;
        if (d?.fired) {
          setInteraction(d);
          setBubblePhase('a');
          lastTriggerRef.current = Date.now();
          // seen 기록
          fetch('/api/spirits/interactions/seen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pairKey: d.pairKey, dialogueIndex: d.dialogueIndex }),
          }).catch(() => {});
        }
      } catch {
        // silent
      }
    }

    // 마운트 후 첫 시도 (4초 딜레이)
    const initial = setTimeout(tryFire, 4000);
    const interval = setInterval(tryFire, PAIR_POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [placed.length, interaction, bubblePhase]);

  // ── (3) 말풍선 a → b → done 순차 ────────────────────────────
  useEffect(() => {
    if (bubblePhase === 'a') {
      const t = setTimeout(() => setBubblePhase('b'), 1800);
      return () => clearTimeout(t);
    }
    if (bubblePhase === 'b') {
      const t = setTimeout(() => {
        setBubblePhase('done');
        setInteraction(null);
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [bubblePhase]);

  if (placed.length === 0) return null;

  return (
    <div className="absolute inset-0 z-[45] pointer-events-none">
      {placed.map((p) => {
        const mood = p.state.mood ?? 60;
        const isQuiet = mood < 30;
        const isInteractingA = interaction?.a.spiritId === p.master.id && bubblePhase === 'a';
        const isInteractingB = interaction?.b.spiritId === p.master.id && bubblePhase === 'b';
        const showBubble = isInteractingA || isInteractingB;
        const bubbleLine = isInteractingA ? interaction!.a.line : isInteractingB ? interaction!.b.line : '';

        return (
          <motion.div
            key={p.master.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: isQuiet ? 0.55 : 1,
              y: 0,
            }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="absolute"
            style={{
              left: p.pos.left,
              bottom: p.pos.bottom,
              transform: 'translate(-50%, 0)',
            }}
          >
            {/* idle bobbing */}
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.4 + Math.random() * 0.6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <SpiritSprite spirit={p.master} size={42} />

              {/* 무드 점 (작은 코너 인디케이터) */}
              {!isQuiet && (
                <div
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: mood >= 75 ? '#fbbf24' : '#ffffff',
                    boxShadow: mood >= 75 ? '0 0 6px #fbbf2488' : 'none',
                  }}
                />
              )}

              {/* 말풍선 — 페어 인터랙션 시 등장 */}
              <AnimatePresence>
                {showBubble && (
                  <motion.div
                    key={`bubble-${interaction!.pairKey}-${interaction!.dialogueIndex}-${bubblePhase}`}
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    className="absolute left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-2xl whitespace-nowrap pointer-events-none"
                    style={{
                      bottom: 'calc(100% + 6px)',
                      background: 'rgba(255,255,255,0.94)',
                      border: '1.5px solid rgba(212,175,55,0.45)',
                      color: '#3a2418',
                      fontSize: 11,
                      fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                      maxWidth: 220,
                      whiteSpace: 'normal',
                      textAlign: 'center',
                    }}
                  >
                    {bubbleLine}
                    {/* tail */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{
                        bottom: -7,
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '7px solid rgba(212,175,55,0.45)',
                      }}
                    />
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{
                        bottom: -5,
                        width: 0,
                        height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '6px solid rgba(255,255,255,0.94)',
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
