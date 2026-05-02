'use client';

/**
 * v104 M3: WishCapsuleHistory
 *
 * 가방 안 "📜 기록" — 모든 소원 + 캡슐 + 외출 이력 통합 뷰.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Wish {
  id: string;
  text: string;
  fulfilled: boolean;
  createdAt: string;
}
interface Capsule {
  id: string;
  message: string;
  sealedAt: string;
  unlocksAt: string;
  unlockedAt: string | null;
  status: 'sealed' | 'ready' | 'opened';
  daysUntilUnlock: number;
}
interface Trip {
  id: string;
  departedAt: string;
  returnedAt: string | null;
  day: number | null;
  emotion: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'wishes' | 'capsules' | 'trips';

export default function WishCapsuleHistory({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('wishes');
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/luna-room/history')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setWishes(d.wishes ?? []);
        setCapsules(d.capsules ?? []);
        setTrips(d.trips ?? []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const tabs: Array<{ key: Tab; label: string; icon: string; count: number }> = [
    { key: 'wishes',   label: '소원',     icon: '🕊️', count: wishes.length },
    { key: 'capsules', label: '캡슐',     icon: '⌛',  count: capsules.length },
    { key: 'trips',    label: '루나 외출', icon: '🛍️', count: trips.length },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="hist-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[230] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="hist-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[231] max-h-[88vh] overflow-y-auto rounded-t-[28px]"
            style={{ background: 'linear-gradient(180deg, #15052f 0%, #0b0219 100%)' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-[3px] rounded-full bg-white/20" />
            </div>

            <div className="px-5 pt-2 pb-3 text-center">
              <div className="text-[12px] font-black tracking-widest text-white/85 mb-0.5">
                📜 기록
              </div>
              <div className="text-[10px] text-white/40">
                흘러간 소원, 봉인된 마음, 루나의 발자국
              </div>
            </div>

            {/* 탭 */}
            <div className="px-4 mb-3 flex gap-1.5">
              {tabs.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className="flex-1 py-2 rounded-xl active:scale-[0.97] transition-all flex flex-col items-center gap-0.5"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(167,139,250,0.30), rgba(236,72,153,0.15))'
                        : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${active ? 'rgba(167,139,250,0.55)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[14px]">{t.icon}</span>
                      <span className={`text-[11px] font-bold ${active ? 'text-violet-200' : 'text-white/65'}`}>
                        {t.label}
                      </span>
                    </div>
                    <div className={`text-[9px] tabular-nums ${active ? 'text-violet-200/70' : 'text-white/35'}`}>
                      {t.count}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 컨텐츠 */}
            <div className="px-4 pb-8 space-y-2">
              {loading && (
                <div className="text-center text-[11px] text-white/40 py-12">불러오는 중…</div>
              )}

              {!loading && tab === 'wishes' && wishes.length === 0 && (
                <EmptyHint icon="🕊️" text="아직 빈 소원이 없어." />
              )}
              {!loading && tab === 'wishes' && wishes.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(167,139,250,0.18)',
                  }}
                >
                  <div className="text-[10px] text-white/40 mb-1.5">
                    {formatKr(w.createdAt)} · {daysAgo(w.createdAt)}일 전
                  </div>
                  <div className="text-[12.5px] text-white/85 leading-relaxed italic"
                    style={{ fontFamily: 'serif' }}
                  >
                    “{w.text}”
                  </div>
                </div>
              ))}

              {!loading && tab === 'capsules' && capsules.length === 0 && (
                <EmptyHint icon="⌛" text="아직 봉인한 캡슐이 없어." />
              )}
              {!loading && tab === 'capsules' && capsules.map((c) => (
                <CapsuleRow key={c.id} c={c} />
              ))}

              {!loading && tab === 'trips' && trips.length === 0 && (
                <EmptyHint icon="🛍️" text="아직 루나 외출 기록이 없어." />
              )}
              {!loading && tab === 'trips' && trips.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl flex items-center gap-3"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="text-2xl flex-shrink-0">🛍️</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/85 font-semibold">
                      Day {t.day ?? '?'} · {formatKr(t.departedAt)}
                    </div>
                    <div className="text-[9.5px] text-white/45 mt-0.5">
                      {emotionLabel(t.emotion)} {t.returnedAt ? '· 돌아왔어' : '· 외출 중'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-8">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl text-white/70 font-bold text-[12px] active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.08)' }}
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

function CapsuleRow({ c }: { c: Capsule }) {
  const meta = STATUS_META[c.status];
  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${meta.border}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{meta.icon}</span>
        <span className="text-[10px] font-bold tracking-wider" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="ml-auto text-[9px] text-white/40 tabular-nums">
          {c.status === 'sealed' ? `D-${c.daysUntilUnlock}` : formatKr(c.unlocksAt)}
        </span>
      </div>
      <div
        className="text-[12px] text-white/80 italic leading-relaxed line-clamp-3"
        style={{ fontFamily: 'serif', filter: c.status === 'sealed' ? 'blur(3px)' : 'none' }}
      >
        “{c.message}”
      </div>
    </div>
  );
}

const STATUS_META = {
  sealed:  { icon: '🔒', label: '봉인 중',     color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  ready:   { icon: '✨', label: '풀 준비 됐어', color: '#fde68a', border: 'rgba(251,191,36,0.45)' },
  opened:  { icon: '📖', label: '풀어봄',       color: '#cbd5e1', border: 'rgba(255,255,255,0.10)' },
};

function EmptyHint({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-[11px] text-white/45 italic">{text}</div>
    </div>
  );
}

function formatKr(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
  } catch { return ''; }
}
function daysAgo(iso: string): number {
  try {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  } catch { return 0; }
}
function emotionLabel(e: string | null): string {
  switch (e) {
    case 'anxious': return '🌫️ 불안한 결';
    case 'sad':     return '💧 슬픈 결';
    case 'happy':   return '🌸 환한 결';
    case 'proud':   return '🌟 뿌듯한 결';
    case 'lonely':  return '🌙 혼자의 결';
    case 'excited': return '⚡ 두근거림';
    default:        return '🍃 평온한 결';
  }
}
