'use client';

/**
 * v114 — 루나 관계 일지 Bottom Sheet.
 *
 * BagSheet 패턴 차용. backdrop + sheet slide-up.
 * fetch /api/user/intimacy?persona=luna → JournalData 로 가공 → LunaJournalPage 렌더.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptic';
import { BOND_TOKENS, HANDWRITE_FONT } from '@/lib/luna-life/relationship-tokens';
import LunaJournalPage, { JournalData } from './LunaJournalPage';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface IntimacyApiResponse {
  derived?: {
    level: number;
    levelName: string;
    levelLabel: string;
    depthHint: string;
    avgScore: number;
    progressPercent: number;
    daysSinceFirst: number;
    totalSessions: number;
    consecutiveDays: number;
    dimensions: {
      trust: number;
      openness: number;
      bond: number;
      respect: number;
    };
  };
}

export default function LunaJournalSheet({ open, onClose }: Props) {
  const [data, setData] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(false);
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/intimacy?persona=luna');
        if (!res.ok) throw new Error(String(res.status));
        const json: IntimacyApiResponse = await res.json();
        const d = json.derived;
        if (!d) throw new Error('no derived');
        if (cancelled) return;
        setData({
          level: d.level,
          levelName: d.levelName,
          levelLabel: d.levelLabel,
          depthHint: d.depthHint,
          trust: d.dimensions.trust,
          openness: d.dimensions.openness,
          bond: d.dimensions.bond,
          respect: d.dimensions.respect,
          avgScore: d.avgScore,
          progressPercent: d.progressPercent,
          daysSinceFirst: d.daysSinceFirst,
          totalSessions: d.totalSessions,
          consecutiveDays: d.consecutiveDays,
        });
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleClose() {
    triggerHaptic('selection');
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(20,12,4,0.55)',
              backdropFilter: 'blur(2px)',
              zIndex: 200,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sh"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32, mass: 0.9 }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 201,
              maxHeight: '92vh',
              overflowY: 'auto',
              overflowX: 'hidden', // v119.5 fix: 가로 스크롤 leak 차단
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              background: BOND_TOKENS.paper,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.35)',
              padding: '14px 12px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {/* 핸들바 */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: BOND_TOKENS.inkLine,
              }}
            />

            {/* 본체 */}
            {loading && !data && (
              <div
                style={{
                  padding: 60,
                  fontFamily: HANDWRITE_FONT,
                  fontSize: 16,
                  color: BOND_TOKENS.inkSoft,
                  textAlign: 'center',
                }}
              >
                일기장을 펼치는 중...
              </div>
            )}

            {error && !data && (
              <div
                style={{
                  padding: 40,
                  fontFamily: HANDWRITE_FONT,
                  fontSize: 16,
                  color: BOND_TOKENS.inkSoft,
                  textAlign: 'center',
                }}
              >
                ”아 미안, 일기장이 잠깐 안 열려…”
                <br />
                <span style={{ fontSize: 12, opacity: 0.7 }}>잠시 후에 다시 와줄래?</span>
              </div>
            )}

            {data && <LunaJournalPage data={data} show={!loading} />}

            {/* 닫기 버튼 — 우하 비대칭 */}
            <button
              onClick={handleClose}
              style={{
                alignSelf: 'flex-end',
                marginRight: 14,
                padding: '8px 16px',
                fontFamily: HANDWRITE_FONT,
                fontSize: 14,
                color: BOND_TOKENS.ink,
                background: 'transparent',
                border: `1.5px solid ${BOND_TOKENS.inkLine}`,
                borderRadius: 4,
              }}
            >
              일기장 덮기
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
