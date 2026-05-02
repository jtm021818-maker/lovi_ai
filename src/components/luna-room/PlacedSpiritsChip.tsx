'use client';

/**
 * v103: PlacedSpiritsChip
 *
 * 룸 헤더 영역에 "오늘 같이 N마리" 칩.
 * 누르면 placed 정령 목록 시트가 열려 빠른 빼내기 가능.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SpiritMaster, UserSpirit } from '@/types/spirit.types';
import SpiritSprite from '@/components/spirit/SpiritSprite';
import { moodToDots, moodToLabel } from '@/lib/spirits/mood-engine';

interface Row {
  master: SpiritMaster;
  state: UserSpirit;
}

interface Props {
  isDark?: boolean;
  accentColor?: string;
  /** 변경 시 부모에게 알림 (옵션) */
  onChanged?: () => void;
}

export default function PlacedSpiritsChip({ isDark = false, accentColor = '#a78bfa', onChanged }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch('/api/spirits/list');
      const d: { owned: UserSpirit[]; masterData: SpiritMaster[] } = await r.json();
      const masterById = new Map(d.masterData.map((m) => [m.id, m]));
      const placed = (d.owned ?? [])
        .filter((u) => u.isPlacedInRoom)
        .map((u) => ({ master: masterById.get(u.spiritId)!, state: u }))
        .filter((p) => !!p.master);
      setRows(placed);
    } catch { /* silent */ }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  async function unplace(spiritId: string) {
    if (busyId) return;
    setBusyId(spiritId);
    try {
      await fetch(`/api/spirits/${spiritId}/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placed: false }),
      });
      await load();
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[10px] font-bold transition-transform active:scale-95"
        style={{
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${accentColor}55`,
          color: isDark ? '#fde68a' : '#7c5738',
          backdropFilter: 'blur(6px)',
        }}
      >
        <span>🛋️</span>
        <span>오늘 같이 {rows.length}마리</span>
        <div className="flex -space-x-1.5 ml-0.5">
          {rows.slice(0, 3).map((r) => (
            <div
              key={r.master.id}
              className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: r.master.themeColor + '40', border: '1px solid white' }}
            >
              <span className="text-[9px]">{r.master.emoji}</span>
            </div>
          ))}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[180] bg-black/55 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[181] max-h-[60vh] overflow-y-auto rounded-t-3xl"
              style={{ background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-amber-900/25" />
              </div>
              <div className="px-5 pt-2 pb-3 text-center">
                <div className="text-[11px] font-black tracking-widest text-[#7c5738] mb-0.5">
                  🛋️ 오늘 같이 있는 친구들
                </div>
                <div className="text-[10px] text-[#a1887f]">
                  같이 두면 — 자기들끼리도 한 마디씩 주고받아
                </div>
              </div>

              <div className="px-3 pb-6 space-y-1.5">
                {rows.map((r) => {
                  const mood = r.state.mood ?? 60;
                  return (
                    <div
                      key={r.master.id}
                      className="flex items-center gap-3 p-2.5 rounded-2xl"
                      style={{
                        background: 'rgba(255,255,255,0.85)',
                        border: '1px solid rgba(212,175,55,0.25)',
                      }}
                    >
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: r.master.themeColor + '22', border: `1px solid ${r.master.themeColor}55` }}
                      >
                        <SpiritSprite spirit={r.master} size={32} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-[#3a2418] truncate">{r.master.name}</div>
                        <div className="text-[10px] text-[#7c5738]/75 flex items-center gap-1">
                          <span>{moodToDots(mood)}</span>
                          <span>{moodToLabel(mood)}</span>
                          <span className="opacity-50">·</span>
                          <span>Lv.{r.state.bondLv}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => unplace(r.master.id)}
                        disabled={busyId === r.master.id}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold active:scale-95 disabled:opacity-50"
                        style={{
                          background: 'rgba(0,0,0,0.06)',
                          color: '#7c5738',
                        }}
                      >
                        빼내기
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
