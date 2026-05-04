'use client';

/**
 * 🆕 v112: 진입 컨텍스트 — streak + 24h 세션수 + birthDate + memoryCount
 *
 * /api/luna-room/streak 한 번 호출. 한 세션당 1번만 fetch.
 */

import { useEffect, useState } from 'react';

export interface EntryContext {
  streak: number;
  recentSessionCount24h: number;
  birthDate: string | null;   // ISO
  memoryCount: number;
  loading: boolean;
}

export function useStreakDays(): EntryContext {
  const [streak, setStreak] = useState(0);
  const [recentSessionCount24h, setRecentSessionCount24h] = useState(0);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/luna-room/streak', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setStreak(Number(data.streak) || 0);
        setRecentSessionCount24h(Number(data.recentSessionCount24h) || 0);
        setBirthDate(typeof data.birthDate === 'string' ? data.birthDate : null);
        setMemoryCount(Number(data.memoryCount) || 0);
      })
      .catch(() => {
        /* 실패 시 0 유지 */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { streak, recentSessionCount24h, birthDate, memoryCount, loading };
}
