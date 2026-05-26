'use client';

/**
 * v119.5 DEV-ONLY: 관계 일지 리디자인 시각 시안.
 * 인증 없이 접근 가능 — /debug-journal
 *
 * 두 가지 모드:
 *  1. 5단계 시안 그리드 — Lv.1~5 의 LunaJournalPage 비교
 *  2. StageTransitionMoment 강제 트리거 — Lv.2~5 풀스크린 의식 캡처용
 *
 * 작업 완료 후 삭제 예정.
 */

import { useState } from 'react';
import LunaJournalPage, { type JournalData } from '@/components/luna-room/journal/LunaJournalPage';
import StageTransitionMoment from '@/components/luna-room/journal/StageTransitionMoment';
import { writeLastSeenStage } from '@/hooks/useStageTransition';

// Module-level fetch override so it lands BEFORE LunaJournalPage children mount.
if (typeof window !== 'undefined' && !(window as unknown as { __dbgJ?: boolean }).__dbgJ) {
  (window as unknown as { __dbgJ?: boolean }).__dbgJ = true;
  // 모먼트 자동 재생 방지 — lastSeenStage = 5 로 둠
  writeLastSeenStage(5);
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
  const seeds = [
    { level: 1, levelName: '새싹',     levelLabel: '이제 막 알아가는 사이', depthHint: '표면적 공감.',           trust: 8,  openness: 6,  bond: 7,  respect: 7,  avg: 7,  pct: 35, days: 0,  ses: 0,  cons: 0 },
    { level: 2, levelName: '꽃봉오리', levelLabel: '좀 알아가는 중',         depthHint: '속감정 짚기 시작.',       trust: 28, openness: 22, bond: 32, respect: 24, avg: 27, pct: 50, days: 5,  ses: 7,  cons: 3 },
    { level: 3, levelName: '개화',     levelLabel: '같이 고민 나누는 사이', depthHint: '패턴 짚기 + 솔직한 의견.', trust: 52, openness: 48, bond: 55, respect: 50, avg: 51, pct: 64, days: 18, ses: 22, cons: 5 },
    { level: 4, levelName: '만개',     levelLabel: '진심으로 걱정하는 사이', depthHint: '루나도 감정 공유.',       trust: 78, openness: 72, bond: 82, respect: 76, avg: 77, pct: 70, days: 45, ses: 60, cons: 12 },
    { level: 5, levelName: '영원',     levelLabel: '모든 걸 아는 사이',     depthHint: '완전한 솔직함.',          trust: 95, openness: 92, bond: 96, respect: 94, avg: 94, pct: 100, days: 120, ses: 180, cons: 30 },
  ];
  const s = seeds[level - 1];
  return {
    level: s.level, levelName: s.levelName, levelLabel: s.levelLabel, depthHint: s.depthHint,
    trust: s.trust, openness: s.openness, bond: s.bond, respect: s.respect,
    avgScore: s.avg, progressPercent: s.pct,
    daysSinceFirst: s.days, totalSessions: s.ses, consecutiveDays: s.cons,
  };
}

export default function DebugJournalPage() {
  const stages = [1, 2, 3, 4, 5];
  const [forcedMoment, setForcedMoment] = useState<number | null>(null);

  return (
    <div style={{ background: '#f7f4ee', minHeight: '100vh', padding: '12px 8px 80px' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 16, color: '#5a2a3a', fontWeight: 700, margin: 0 }}>
          v119.5 관계 일지 — 프리미엄 리디자인
        </h1>
        <div style={{ fontSize: 11, color: '#8a5868', marginTop: 4 }}>
          별·달·은하 + 호칭형 + 도감 + 풀스크린 모먼트
        </div>
      </div>

      {/* 단계 전환 모먼트 트리거 — 5단계 의식 캡처용 */}
      <div
        style={{
          maxWidth: 460, margin: '0 auto 24px',
          padding: '12px 14px',
          background: 'linear-gradient(135deg, #2D2475 0%, #5B3F87 100%)',
          borderRadius: 12,
          color: '#fff',
          boxShadow: '0 6px 18px rgba(45,36,117,0.30)',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em' }}>
          ✦ 단계 전환 모먼트 강제 재생
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[2, 3, 4, 5].map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setForcedMoment(lv)}
              style={{
                flex: 1,
                minWidth: 60,
                padding: '8px 6px',
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.30)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Lv.{lv} 모먼트
            </button>
          ))}
        </div>
        <div style={{ fontSize: 9.5, opacity: 0.65, marginTop: 6, textAlign: 'center' }}>
          버튼 누르면 풀스크린 모먼트가 재생됩니다 — 자동 종료 또는 화면 탭으로 닫기
        </div>
      </div>

      {/* 5단계 시안 그리드 */}
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
          <LunaJournalPage
            data={buildMock(lv)}
            show
            persona="luna"
            userDisplayName="너"
          />
        </div>
      ))}

      {/* 강제 모먼트 마운트 */}
      <StageTransitionMoment
        level={forcedMoment}
        onClose={() => setForcedMoment(null)}
        userDisplayName="너"
      />
    </div>
  );
}
