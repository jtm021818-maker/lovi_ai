'use client';

/**
 * v119 DEV-ONLY: 관계 일지 5단계 시각 시안 페이지.
 * 인증 없이 접근 가능 — /debug-journal
 * 별·달·은하 + 호칭형 리디자인 검증용. 작업 완료 후 삭제 예정.
 */

import LunaJournalPage, { type JournalData } from '@/components/luna-room/journal/LunaJournalPage';

// Module-level fetch override so it lands BEFORE LunaJournalPage children mount.
if (typeof window !== 'undefined' && !(window as unknown as { __dbgJ?: boolean }).__dbgJ) {
  (window as unknown as { __dbgJ?: boolean }).__dbgJ = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as { url?: string }).url ?? String(input);
    if (url.includes('/api/relationship/gate/open')) {
      return Promise.resolve(
        new Response(JSON.stringify({ gates: [{ gate_level: 3, opened_at: new Date().toISOString() }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (url.includes('/api/relationship/nicknames')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            gate: {
              allowProposal: false,
              reason: 'mock',
              diagnostics: { intimacyLevel: 2, totalSessions: 8, daysSinceFirst: 7, hasDeepMoment: false, activeCount: 0, phaseOk: true },
            },
            active: [],
            rejected: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }
    return origFetch(input as RequestInfo, init);
  }) as typeof window.fetch;
}

function buildMock(level: number): JournalData {
  // 각 레벨의 대표값 — INTIMACY_LEVELS 의 minAvg+5 정도
  const seeds = [
    { level: 1, levelName: '새싹',     levelLabel: '이제 막 알아가는 사이', depthHint: '표면적 공감.',           trust: 8,  openness: 6,  bond: 7,  respect: 7,  avg: 7,  pct: 35, days: 0,  ses: 0,  cons: 0 },
    { level: 2, levelName: '꽃봉오리', levelLabel: '좀 알아가는 중',         depthHint: '속감정 짚기 시작.',       trust: 22, openness: 18, bond: 24, respect: 20, avg: 21, pct: 30, days: 5,  ses: 7,  cons: 3 },
    { level: 3, levelName: '개화',     levelLabel: '같이 고민 나누는 사이', depthHint: '패턴 짚기 + 솔직한 의견.', trust: 48, openness: 42, bond: 50, respect: 44, avg: 46, pct: 44, days: 18, ses: 22, cons: 5 },
    { level: 4, levelName: '만개',     levelLabel: '진심으로 걱정하는 사이', depthHint: '루나도 감정 공유.',       trust: 72, openness: 68, bond: 75, respect: 70, avg: 71, pct: 44, days: 45, ses: 60, cons: 12 },
    { level: 5, levelName: '영원',     levelLabel: '모든 걸 아는 사이',     depthHint: '완전한 솔직함.',          trust: 92, openness: 88, bond: 94, respect: 90, avg: 91, pct: 100, days: 120, ses: 180, cons: 30 },
  ];
  const s = seeds[level - 1];
  return {
    level: s.level,
    levelName: s.levelName,
    levelLabel: s.levelLabel,
    depthHint: s.depthHint,
    trust: s.trust,
    openness: s.openness,
    bond: s.bond,
    respect: s.respect,
    avgScore: s.avg,
    progressPercent: s.pct,
    daysSinceFirst: s.days,
    totalSessions: s.ses,
    consecutiveDays: s.cons,
  };
}

export default function DebugJournalPage() {
  const stages = [1, 2, 3, 4, 5];
  return (
    <div style={{ background: '#f7f4ee', minHeight: '100vh', padding: '12px 8px 80px' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 16, color: '#5a2a3a', fontWeight: 700, margin: 0 }}>
          v119 관계 일지 — 별·달·은하 + 호칭형
        </h1>
        <div style={{ fontSize: 11, color: '#8a5868', marginTop: 4 }}>
          5단계 시안 (위→아래: 모르는 사이 → 소중한 사람)
        </div>
      </div>
      {stages.map((lv) => (
        <div key={lv} style={{ marginBottom: 28 }}>
          <div
            style={{
              maxWidth: 460,
              margin: '0 auto 6px',
              padding: '4px 12px',
              fontSize: 11,
              color: '#7a4a55',
              fontWeight: 600,
              letterSpacing: '0.06em',
            }}
          >
            ── STAGE {lv}
          </div>
          <LunaJournalPage data={buildMock(lv)} show persona="luna" />
        </div>
      ))}
    </div>
  );
}
