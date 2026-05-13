'use client';

/**
 * 🆕 v117 D1: DailyLogHistory — 과거 데일리 일기 히스토리 드로어.
 *
 * DailyLogCard 의 "📅 일지 전체 보기" 탭 시 등장.
 * 최근 60일 일기를 월별 그룹으로 보여줌.
 *
 * 계획서: docs/v117-relationship-redesign-plan.md Phase D.1
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptic';

const HANDWRITE = '"Gowun Dodum", "Nanum Pen Script", system-ui';
const INK = '#3a2418';
const INK_SOFT = '#6f5142';

interface Log {
  log_date: string;
  content: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  persona?: 'luna' | 'tarot';
}

interface MonthGroup {
  monthKey: string;   // YYYY-MM
  monthLabel: string; // "5월 2026"
  logs: Log[];
}

function groupByMonth(logs: Log[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const log of logs) {
    const d = new Date(log.log_date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = `${d.getMonth() + 1}월 ${d.getFullYear()}`;
    if (!map.has(monthKey)) {
      map.set(monthKey, { monthKey, monthLabel, logs: [] });
    }
    map.get(monthKey)!.logs.push(log);
  }
  return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getDate()}일 (${weekday})`;
}

export default function DailyLogHistory({ open, onClose, persona = 'luna' }: Props) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/relationship/daily-log/range?persona=${persona}&days=60`);
        const json = r.ok ? await r.json() : { logs: [] };
        if (!cancelled) setLogs(json.logs ?? []);
      } catch {
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, persona]);

  const groups = groupByMonth(logs);

  function handleClose() {
    triggerHaptic('selection');
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 백드롭 */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[420]"
            style={{ background: 'rgba(40,25,15,0.45)', backdropFilter: 'blur(4px)' }}
          />
          {/* 드로어 */}
          <motion.div
            key="dr"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="fixed left-0 right-0 bottom-0 z-[421] max-w-[480px] mx-auto"
            style={{
              height: '78vh',
              background: 'linear-gradient(180deg, #fffaf2 0%, #fff5e7 30%, #fef0d8 100%)',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              boxShadow: '0 -10px 30px rgba(120,80,40,0.25)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* 핸들 + 헤더 */}
            <div style={{ padding: '10px 18px 8px', flexShrink: 0 }}>
              <div
                style={{
                  width: 38, height: 4, borderRadius: 2,
                  background: 'rgba(124,87,56,0.3)',
                  margin: '0 auto 12px',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: HANDWRITE, fontSize: 20, color: INK, lineHeight: 1 }}>
                    루나의 일지장
                  </div>
                  <div
                    style={{
                      fontFamily: HANDWRITE, fontSize: 11, color: INK_SOFT,
                      opacity: 0.7, marginTop: 3,
                    }}
                  >
                    지난 60일치를 펼쳐봤어
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    background: 'rgba(255,253,247,0.85)',
                    border: '1px solid rgba(124,87,56,0.18)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontFamily: HANDWRITE, fontSize: 13, color: INK,
                    cursor: 'pointer',
                  }}
                >
                  닫기
                </button>
              </div>
            </div>

            {/* 본문 — 스크롤 */}
            <div
              style={{
                flex: 1, overflowY: 'auto', padding: '8px 18px 32px',
              }}
            >
              {loading && (
                <div
                  style={{
                    fontFamily: HANDWRITE, fontSize: 13, color: INK_SOFT,
                    textAlign: 'center', padding: '30px 0', opacity: 0.6,
                  }}
                >
                  일지 펼치는 중…
                </div>
              )}
              {!loading && groups.length === 0 && (
                <div
                  style={{
                    fontFamily: HANDWRITE, fontSize: 14, color: INK_SOFT,
                    textAlign: 'center', padding: '40px 12px', opacity: 0.7,
                    lineHeight: 1.55,
                  }}
                >
                  아직 일지가 비어있어.<br />
                  내일이면 첫 페이지가 적힐 거야 ☁
                </div>
              )}
              {groups.map((g) => (
                <div key={g.monthKey} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontFamily: HANDWRITE, fontSize: 13, color: INK_SOFT,
                      letterSpacing: '0.06em', opacity: 0.75,
                      borderBottom: '1px dashed rgba(124,87,56,0.25)',
                      paddingBottom: 4, marginBottom: 8,
                    }}
                  >
                    🗓 {g.monthLabel}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {g.logs.map((log) => (
                      <LogRow key={log.log_date} log={log} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function LogRow({ log }: { log: Log }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'relative',
        padding: '10px 12px',
        background: 'rgba(255,253,247,0.85)',
        border: '1px dashed rgba(124,87,56,0.25)',
        borderRadius: 6,
        boxShadow: '0 1.5px 4px rgba(120,80,40,0.06)',
      }}
    >
      <div
        style={{
          fontFamily: HANDWRITE, fontSize: 11, color: INK_SOFT,
          opacity: 0.65, marginBottom: 3,
        }}
      >
        {formatDay(log.log_date)}
      </div>
      <div
        style={{
          fontFamily: HANDWRITE, fontSize: 14, color: INK,
          lineHeight: 1.45, fontStyle: 'italic',
        }}
      >
        "{log.content}"
      </div>
    </motion.div>
  );
}
