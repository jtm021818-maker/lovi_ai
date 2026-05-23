'use client';

/**
 * v115.7: 별명 섹션 — 루나 관계 일지 안에 들어가는 UI.
 *
 * 표시 컨텐츠:
 *  - 현재 루나가 부르는 별명들 (active: candidate/trying/accepted)
 *  - 각 별명의 추억 앵커 (anchorQuote)
 *  - 봉인된 별명 (rejected) 토글로 열기
 *  - 게이트 진행도 (게이트 미통과 시 — "왜 아직 별명이 없는지" 설명)
 *
 * 인터랙션:
 *  - 별명 옆 [✗ 거부] 버튼 → POST /api/relationship/nicknames { action:'reject' }
 *  - 봉인된 별명 옆 [↻ 복원] 버튼 → action:'restore'
 *
 * 톤: LunaJournalPage 의 종이/손글씨 디자인 시스템 (BOND_TOKENS, HANDWRITE_FONT) 사용.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BOND_TOKENS, HANDWRITE_FONT } from '@/lib/luna-life/relationship-tokens';
import { triggerHaptic } from '@/lib/haptic';

interface NicknameRecord {
  nickname: string;
  status: 'candidate' | 'trying' | 'accepted' | 'rejected';
  useCount: number;
  lastUsedAt: string;
  userReaction: 'accepted' | 'neutral' | 'rejected' | null;
  anchorQuote?: string | null;
  originContext?: string;
  daysSinceFirstUse: number;
}

interface GateDiag {
  intimacyLevel?: number;
  totalSessions?: number;
  daysSinceFirst?: number;
  hasDeepMoment?: boolean;
  activeCount?: number;
  phaseOk?: boolean;
}

interface NicknameApiData {
  gate: {
    allowProposal: boolean;
    reason: string;
    diagnostics: GateDiag;
  };
  active: NicknameRecord[];
  rejected: string[];
}

interface Props {
  show: boolean;
}

export default function NicknameSection({ show }: Props) {
  const [data, setData] = useState<NicknameApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejected, setShowRejected] = useState(false);
  const [busyNick, setBusyNick] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const res = await fetch('/api/relationship/nicknames', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as NicknameApiData;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    void refresh();
  }, [show]);

  const handleAction = async (nickname: string, action: 'reject' | 'restore') => {
    setBusyNick(nickname);
    triggerHaptic('medium');
    try {
      await fetch('/api/relationship/nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, nickname }),
      });
      await refresh();
    } finally {
      setBusyNick(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ delay: 1.05, duration: 0.5 }}
      style={{ marginBottom: 16 }}
    >
      {/* 헤더 */}
      <div
        style={{
          fontFamily: HANDWRITE_FONT, fontSize: 13, color: BOND_TOKENS.ink,
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        🏷️ 루나가 너를 부르는 이름
        {data && (
          <span style={{ fontSize: 10, color: BOND_TOKENS.inkSoft, opacity: 0.7, marginLeft: 4 }}>
            {data.active.length}개
          </span>
        )}
      </div>

      {/* 본문 카드 */}
      <div
        style={{
          padding: '12px 14px',
          background: 'linear-gradient(180deg, #fffaf2 0%, #fdf2e3 100%)',
          border: '1px solid rgba(196,136,111,0.22)',
          borderRadius: 10,
          boxShadow: '0 2px 6px rgba(120,80,40,0.06)',
        }}
      >
        {loading && (
          <div
            style={{
              fontFamily: HANDWRITE_FONT, fontSize: 12, color: BOND_TOKENS.inkSoft,
              opacity: 0.7, textAlign: 'center', padding: '12px 0',
            }}
          >
            펼쳐보는 중...
          </div>
        )}

        {!loading && data && (
          <>
            {/* 활성 별명 리스트 */}
            {data.active.length === 0 && (
              <NoNicknamesView gate={data.gate} />
            )}

            {data.active.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.active.map((rec) => (
                  <ActiveNicknameRow
                    key={rec.nickname}
                    record={rec}
                    busy={busyNick === rec.nickname}
                    onReject={() => handleAction(rec.nickname, 'reject')}
                  />
                ))}
              </div>
            )}

            {/* 게이트 진행도 — active 있어도 작게 보여줌 */}
            {data.active.length > 0 && (
              <GateProgressMini gate={data.gate} />
            )}

            {/* 봉인된 별명 토글 */}
            {data.rejected.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => setShowRejected((v) => !v)}
                  style={{
                    fontFamily: HANDWRITE_FONT, fontSize: 11,
                    color: '#a87a5e', background: 'transparent',
                    border: 'none', padding: 0, cursor: 'pointer',
                    textDecoration: 'underline dashed',
                    textUnderlineOffset: 2,
                  }}
                >
                  🔒 봉인한 별명 {data.rejected.length}개 {showRejected ? '닫기' : '열기'}
                </button>
                <AnimatePresence>
                  {showRejected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6,
                        overflow: 'hidden',
                      }}
                    >
                      {data.rejected.map((name) => (
                        <div
                          key={name}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'rgba(168,122,94,0.08)',
                            border: '1px dashed rgba(168,122,94,0.3)',
                            borderRadius: 6,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: HANDWRITE_FONT, fontSize: 12,
                              color: BOND_TOKENS.inkSoft, textDecoration: 'line-through',
                              opacity: 0.75,
                            }}
                          >
                            "{name}"
                          </span>
                          <button
                            disabled={busyNick === name}
                            onClick={() => handleAction(name, 'restore')}
                            style={{
                              fontFamily: HANDWRITE_FONT, fontSize: 10,
                              color: '#7c5738', background: 'transparent',
                              border: '1px solid rgba(124,87,56,0.25)',
                              borderRadius: 4, padding: '3px 8px',
                              cursor: busyNick === name ? 'wait' : 'pointer',
                              opacity: busyNick === name ? 0.5 : 1,
                            }}
                          >
                            ↻ 복원
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// 별명 0개 — 게이트 진행도 표시
// ============================================================
function NoNicknamesView({ gate }: { gate: NicknameApiData['gate'] }) {
  if (gate.allowProposal) {
    return (
      <div
        style={{
          fontFamily: HANDWRITE_FONT, fontSize: 12.5, color: BOND_TOKENS.inkSoft,
          lineHeight: 1.55, padding: '4px 2px',
        }}
      >
        루나가 너에게 어울리는 별명을 떠올리는 중이야...
        <br />
        <span style={{ fontSize: 10.5, opacity: 0.7 }}>
          깊은 순간을 함께 나눌 때 자연스럽게 생길 거야.
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: HANDWRITE_FONT, fontSize: 12.5, color: BOND_TOKENS.inkSoft,
        lineHeight: 1.55, padding: '4px 2px',
      }}
    >
      <div style={{ marginBottom: 8, color: BOND_TOKENS.ink }}>
        🌱 아직 별명이 만들어지지 않았어
      </div>
      <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 10 }}>
        진짜 별명은 함께 쌓은 추억 위에 생겨나. 루나가 충분히 너를 알게 되면 자연스럽게 부를 거야.
      </div>
      <GateChecklist diag={gate.diagnostics} />
    </div>
  );
}

// ============================================================
// 게이트 체크리스트 — 4개 조건
// ============================================================
function GateChecklist({ diag }: { diag: GateDiag }) {
  const items = [
    {
      label: '친밀도 Lv.3 이상',
      ok: (diag.intimacyLevel ?? 0) >= 3,
      hint: `현재 Lv.${diag.intimacyLevel ?? 1}`,
    },
    {
      label: '세션 15회 또는 14일 이상 함께',
      ok: (diag.totalSessions ?? 0) >= 15 || (diag.daysSinceFirst ?? 0) >= 14,
      hint: `${diag.totalSessions ?? 0}회 · ${diag.daysSinceFirst ?? 0}일`,
    },
    {
      label: '함께 깊은 순간 1회+',
      ok: !!diag.hasDeepMoment,
      hint: diag.hasDeepMoment ? '쌓임' : '아직 없음',
    },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: HANDWRITE_FONT, fontSize: 11,
            color: it.ok ? '#3f7a4f' : BOND_TOKENS.inkSoft,
            opacity: it.ok ? 1 : 0.75,
          }}
        >
          <span style={{ width: 14, textAlign: 'center' }}>{it.ok ? '✓' : '·'}</span>
          <span style={{ flex: 1 }}>{it.label}</span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>{it.hint}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 활성 별명 한 줄
// ============================================================
function ActiveNicknameRow({
  record, busy, onReject,
}: {
  record: NicknameRecord;
  busy: boolean;
  onReject: () => void;
}) {
  const statusLabel = formatStatusLabel(record.status, record.userReaction);
  const statusColor = record.status === 'accepted'
    ? '#3f7a4f'
    : record.status === 'rejected'
    ? '#a05050'
    : '#8a6a48';

  return (
    <div
      style={{
        padding: '10px 12px',
        background: '#fdf8ef',
        border: '1px solid rgba(196,136,111,0.18)',
        borderRadius: 8,
        boxShadow: '0 1px 2px rgba(120,80,40,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: HANDWRITE_FONT, fontSize: 16, color: BOND_TOKENS.ink,
              fontWeight: 600,
            }}
          >
            "{record.nickname}"
          </span>
          <span
            style={{
              fontFamily: HANDWRITE_FONT, fontSize: 10.5, color: statusColor,
              opacity: 0.85,
            }}
          >
            {statusLabel}
          </span>
        </div>
        <button
          disabled={busy}
          onClick={onReject}
          style={{
            flexShrink: 0,
            fontFamily: HANDWRITE_FONT, fontSize: 10.5,
            color: '#a05050', background: 'transparent',
            border: '1px solid rgba(160,80,80,0.3)',
            borderRadius: 4, padding: '4px 8px',
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          ✗ 거부
        </button>
      </div>

      {record.anchorQuote && (
        <div
          style={{
            marginTop: 6, padding: '6px 8px',
            background: 'rgba(196,136,111,0.06)',
            borderLeft: '2px solid rgba(196,136,111,0.35)',
            borderRadius: 3,
            fontFamily: HANDWRITE_FONT, fontSize: 11,
            color: BOND_TOKENS.inkSoft,
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          📖 "{record.anchorQuote}"
        </div>
      )}

      <div
        style={{
          marginTop: 6,
          fontFamily: HANDWRITE_FONT, fontSize: 10, color: BOND_TOKENS.inkSoft,
          opacity: 0.7, display: 'flex', gap: 10,
        }}
      >
        <span>{record.useCount}회 부름</span>
        <span>·</span>
        <span>{formatAgo(record.lastUsedAt)}</span>
      </div>
    </div>
  );
}

// ============================================================
// 게이트 진행도 — 별명 있을 때 작게 표시
// ============================================================
function GateProgressMini({ gate }: { gate: NicknameApiData['gate'] }) {
  return (
    <div
      style={{
        marginTop: 10, paddingTop: 10,
        borderTop: '1px dashed rgba(124,87,56,0.18)',
        fontFamily: HANDWRITE_FONT, fontSize: 10, color: BOND_TOKENS.inkSoft,
        opacity: 0.75, lineHeight: 1.4,
      }}
    >
      {gate.allowProposal ? (
        <span>✓ 새 별명이 떠오르면 자연스럽게 더 불러줄 거야</span>
      ) : (
        <span>· 새 별명은 함께 더 쌓이면 — {gate.reason}</span>
      )}
    </div>
  );
}

function formatStatusLabel(
  status: NicknameRecord['status'],
  reaction: NicknameRecord['userReaction'],
): string {
  if (status === 'accepted') return '받아들임 ✓';
  if (status === 'rejected') return '봉인됨 ✗';
  if (status === 'trying') {
    if (reaction === 'accepted') return '시험 → 긍정';
    if (reaction === 'rejected') return '시험 → 거부 분위기';
    return '시험 중 (반응 관찰)';
  }
  return '막 떠올린 이름';
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return '방금 전';
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.round(hr / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.round(day / 7)}주 전`;
  return `${Math.round(day / 30)}달 전`;
}
