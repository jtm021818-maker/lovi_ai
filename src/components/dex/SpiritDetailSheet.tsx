'use client';

/**
 * 📜 v85.3: SpiritDetailSheet — 정령 상세 bottom-sheet
 *
 * 카드 탭 시 아래에서 올라오는 전면 시트.
 * - 대형 이모지 + 이름 + 레어도 리본
 * - 처음 만난 날 + 교감 레벨 프로그레스
 * - 성격 / 능력 카테고리 태그
 * - 능력 설명 (Lv.3+ 언락)
 * - 백스토리 (Lv.5 언락 / 아니면 teaser)
 * - 파트너 정령 (상호작용 쌍)
 * - 미소지: ??? + 힌트
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SpiritMaster, UserSpirit, SpiritRarity } from '@/types/spirit.types';
import { SPIRITS } from '@/data/spirits';
import { INTERACTIONS } from '@/data/interactions';
import { getRevealEntry } from '@/data/spirit-reveal-schedule';
import { getBackstory } from '@/data/backstories';
import { getAllFragmentSlots, FRAGMENT_UNLOCK_BY_SLOT } from '@/data/spirit-cherished-fragments';
import { SPIRIT_DRIVE_BASELINE, describeDrive } from '@/data/spirit-drive-profiles';
import { moodToDots, moodToLabel } from '@/lib/spirits/mood-engine';
import RarityBadge, { RARITY_META } from './RarityBadge';
import SpiritSprite from '@/components/spirit/SpiritSprite';
import SignatureMoveSection from './SignatureMoveSection';

interface FragmentResp {
  unlocked: boolean;
  resolved: {
    spiritId: string;
    title: string;
    body: string;
    sourceLabel: string;
    bridgeOneLiner: string;
    matched: boolean;
  } | null;
}

interface Props {
  spirit: SpiritMaster | null;
  owned: UserSpirit | null;
  /** v102: 루나 현재 나이 (Day Gate 계산) */
  ageDays?: number;
  /** v102: 다른 정령 L2 누적 해금 수 (lore L3 게이트 계산) */
  totalUnlockedL2?: number;
  onClose: () => void;
}

function formatKoreanDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

/** bondLv 1~5 → XP 필요량 대략치 (UI 참고용) */
const LV_THRESHOLD: Record<number, { next: number; label: string }> = {
  1: { next: 100, label: '처음 알아감' },
  2: { next: 250, label: '친해지는 중' },
  3: { next: 500, label: '마음을 나눔' },
  4: { next: 900, label: '깊이 연결됨' },
  5: { next: 900, label: 'MAX · 비밀 해금' },
};

export default function SpiritDetailSheet({ spirit, owned, ageDays = 0, totalUnlockedL2 = 0, onClose }: Props) {
  return (
    <AnimatePresence>
      {spirit && (
        <>
          {/* 배경 딤 */}
          <motion.div
            key="dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          {/* 시트 */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="absolute bottom-0 left-0 right-0 z-50 max-h-[88%] overflow-y-auto rounded-t-3xl"
            style={{
              background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.45)',
            }}
          >
            <DetailBody
              spirit={spirit}
              owned={owned}
              ageDays={ageDays}
              totalUnlockedL2={totalUnlockedL2}
              onClose={onClose}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailBody({ spirit, owned, ageDays, totalUnlockedL2, onClose }: {
  spirit: SpiritMaster;
  owned: UserSpirit | null;
  ageDays: number;
  totalUnlockedL2: number;
  onClose: () => void;
}) {
  const rarity = spirit.rarity as SpiritRarity;
  const meta = RARITY_META[rarity];
  const isOwned = !!owned;
  const lvInfo = owned ? LV_THRESHOLD[owned.bondLv] : null;
  const meetDate = owned ? formatKoreanDate(owned.firstObtainedAt) : null;

  // 파트너 정령 검색
  const partners = INTERACTIONS
    .filter((i) => i.pairKey.includes(spirit.id))
    .map((i) => {
      const ids = i.pairKey.split('+');
      const partnerId = ids[0] === spirit.id ? ids[1] : ids[0];
      return SPIRITS.find((s) => s.id === partnerId);
    })
    .filter((s): s is SpiritMaster => !!s);

  return (
    <div className="relative pb-8">
      {/* Drag handle */}
      <div className="sticky top-0 z-10 pt-2 pb-1 flex justify-center"
        style={{ background: 'linear-gradient(180deg, #fef9f3 0%, rgba(254,249,243,0) 100%)' }}
      >
        <div className="w-10 h-1 rounded-full bg-amber-900/30" />
      </div>

      {/* 닫기 */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-amber-900"
        style={{
          background: 'rgba(0,0,0,0.08)',
        }}
        aria-label="닫기"
      >
        ✕
      </button>

      {/* 히어로 */}
      <div
        className="relative mx-4 mt-2 mb-4 rounded-2xl p-5 text-center overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${meta.colorFrom}25 0%, ${spirit.themeColor}15 50%, ${meta.colorTo}20 100%)`,
          border: `1.5px solid ${meta.border}`,
          boxShadow: `0 6px 18px ${meta.glow}`,
        }}
      >
        {/* 레어도 리본 */}
        <div className="absolute top-2 left-2">
          <RarityBadge rarity={rarity} size="sm" showName />
        </div>

        {/* 대형 이미지 */}
        <motion.div
          className="leading-none mb-2 select-none flex items-center justify-center"
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        >
          {isOwned ? (
            <SpiritSprite spirit={spirit} size={88} emojiSize={72} />
          ) : (
            <span
              className="text-[72px]"
              style={{ filter: 'brightness(0) invert(0.3)', opacity: 0.7 }}
            >
              ❓
            </span>
          )}
        </motion.div>

        {/* 이름 */}
        <h3 className="text-[22px] font-extrabold text-[#3a2418] tracking-tight">
          {isOwned ? spirit.name : '???'}
        </h3>
        {isOwned && (
          <p className="mt-0.5 text-[11px] text-[#7c5738]/85 italic">{spirit.personality}</p>
        )}

        {/* 만난 날 + Lv */}
        {isOwned && meetDate && (
          <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/70 text-[10px] font-semibold text-amber-900">
            <span>🗓️</span>
            <span>{meetDate} 에 처음 만남</span>
          </div>
        )}
      </div>

      {/* 마음의 결 — 무드 + Drive (v103) */}
      {isOwned && owned && (
        <MoodDriveStrip
          mood={owned.mood ?? 60}
          lastVisitedAt={owned.lastVisitedAt ?? null}
          driveText={describeDrive(SPIRIT_DRIVE_BASELINE[spirit.id] ?? {
            connection: 50, novelty: 50, expression: 50, safety: 50, play: 50,
          })}
        />
      )}

      {/* 미소지 힌트 */}
      {!isOwned && (
        <div className="mx-4 mb-5 p-4 rounded-2xl text-center bg-white/60"
          style={{ border: `1px dashed ${meta.border}` }}
        >
          <p className="text-[12px] font-bold text-[#5a3e2b]">아직 이 정령은 만나지 못했어</p>
          <p className="mt-1 text-[10.5px] text-[#7c5738]/80 leading-relaxed">
            대화 속 어딘가에서 너를 기다리고 있을 거야.<br />
            마음이 가는 순간 나타날지도?
          </p>
        </div>
      )}

      {/* 교감 레벨 */}
      {isOwned && owned && lvInfo && (
        <Section title="💗 교감 상태">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[12px] font-bold text-[#3a2418]">
              Lv.{owned.bondLv} · <span className="text-[#7c5738]">{lvInfo.label}</span>
            </span>
            <span className="text-[10px] text-[#a1887f] tabular-nums">
              {owned.bondXp} XP
            </span>
          </div>
          {/* 5개 세그먼트 프로그레스 */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((lv) => (
              <div
                key={lv}
                className="flex-1 h-2 rounded-full"
                style={{
                  background:
                    lv <= owned.bondLv
                      ? `linear-gradient(90deg, ${meta.colorFrom} 0%, ${meta.colorTo} 100%)`
                      : 'rgba(0,0,0,0.08)',
                  boxShadow:
                    lv <= owned.bondLv ? `0 0 6px ${meta.glow}` : undefined,
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* 능력 */}
      {isOwned && owned && (
        <Section title="⚡ 능력">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <Tag>{spirit.abilityCategory}</Tag>
            {owned.bondLv >= 3 ? (
              <Tag tone="gold">🔓 Lv.3 개방</Tag>
            ) : (
              <Tag tone="muted">🔒 Lv.3 에 개방</Tag>
            )}
          </div>
          {owned.bondLv >= 3 ? (
            <p className="text-[12px] text-[#3a2418] leading-relaxed">
              {spirit.abilityShort}
            </p>
          ) : (
            <p className="text-[11.5px] text-[#7c5738]/75 italic leading-relaxed">
              더 친해지면 이 친구가 뭘 해주는지 알게 돼...
            </p>
          )}
          {owned.bondLv >= 5 && (
            <div className="mt-2 p-2 rounded-lg bg-amber-100/60 border border-amber-300/50">
              <p className="text-[10.5px] font-bold text-amber-900 mb-0.5">✨ 강화된 능력</p>
              <p className="text-[11.5px] text-[#3a2418]">{spirit.abilityEnhanced}</p>
            </div>
          )}
        </Section>
      )}

      {/* v105: 시그니처 무브 카드 프리뷰 — Lv.3 해금 랜덤 이벤트의 결을 도감에 노출 */}
      {isOwned && owned && (
        <SignatureMoveSection spirit={spirit} owned={owned} />
      )}

      {/* v103: 같이 두기 토글 (방 배치) */}
      {isOwned && owned && (
        <RoomPlaceToggle
          spiritId={spirit.id}
          spiritName={spirit.name}
          initiallyPlaced={!!owned.isPlacedInRoom}
          bondLv={owned.bondLv}
        />
      )}

      {/* 백스토리 — v102: 3-step 잠금 */}
      {isOwned && owned && (
        <ThreeStepSecret
          spiritId={spirit.id}
          spirit={spirit}
          owned={owned}
          ageDays={ageDays}
          totalUnlockedL2={totalUnlockedL2}
        />
      )}

      {/* v103: Cherished Fragments — 본드 1/3/5 단계별 해제 */}
      {isOwned && owned && (
        <CherishedFragmentsSection
          spiritId={spirit.id}
          bondLv={owned.bondLv}
        />
      )}

      {/* v103: 별자리 — Mind Map 노드 시각화 */}
      {isOwned && owned && (
        <MindMapConstellation
          spiritId={spirit.id}
          bondLv={owned.bondLv}
        />
      )}

      {/* 파트너 정령 */}
      {isOwned && partners.length > 0 && (
        <Section title="🤝 같이 놀면 좋은 친구">
          <div className="grid grid-cols-4 gap-1.5">
            {partners.map((p) => (
              <div
                key={p.id}
                className="aspect-square rounded-lg flex flex-col items-center justify-center p-1"
                style={{
                  background: `linear-gradient(145deg, ${p.themeColor}22 0%, #ffffff 100%)`,
                  border: `1px solid ${p.themeColor}55`,
                }}
              >
                <div className="flex items-center justify-center">
                  <SpiritSprite spirit={p} size={36} />
                </div>
                <div className="text-[8.5px] font-bold text-[#3a2418] truncate max-w-full mt-0.5">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9.5px] text-[#7c5738]/70 italic leading-relaxed">
            둘 다 <span className="font-bold">Lv.4</span> 이상이고 같은 방에 있을 때
            — 30분에 한 번씩 자기들끼리 한 마디씩 주고받아.
          </p>
        </Section>
      )}

      {/* 중복 보유 */}
      {isOwned && owned && owned.count > 1 && (
        <Section title="🎁 중복 보유">
          <p className="text-[11.5px] text-[#3a2418]">
            이 정령을 <span className="font-black text-pink-600">×{owned.count}</span> 만났어.
            <span className="ml-1 text-[#7c5738]/80">마음이 닿은 만큼 XP 로 환원됐어.</span>
          </p>
        </Section>
      )}
    </div>
  );
}

/**
 * v102: 3-step 비밀 섹션 — 표면 / 백스토리(L2) / 어머니 일기(L3).
 */
function ThreeStepSecret({ spiritId, spirit, owned, ageDays, totalUnlockedL2 }: {
  spiritId: string;
  spirit: SpiritMaster;
  owned: UserSpirit;
  ageDays: number;
  totalUnlockedL2: number;
}) {
  const entry = getRevealEntry(spiritId);
  const revealDay = entry?.revealDay ?? 0;
  const dayGateOpen = ageDays >= revealDay;
  const lvGateOpen = owned.bondLv >= 5;
  const l2Open = lvGateOpen && dayGateOpen;
  const l3GateNeed = entry?.loreUnlockAfter ?? 999;
  const otherUnlocked = Math.max(0, totalUnlockedL2 - (owned.backstoryUnlocked ? 1 : 0));
  const l3Open = l2Open && otherUnlocked >= l3GateNeed;
  const remainXp = lvGateOpen ? 0 : Math.max(0, 1500 - owned.bondXp);
  const remainDay = dayGateOpen ? 0 : Math.max(0, revealDay - ageDays);
  const need = Math.max(0, l3GateNeed - otherUnlocked);

  const backstory = getBackstory(spiritId);

  // v102 (rev2): L3 는 동적 fetch (유저 세션 기반)
  const [fragment, setFragment] = useState<FragmentResp['resolved']>(null);
  const [loadingFragment, setLoadingFragment] = useState(false);
  useEffect(() => {
    if (!l3Open) return;
    let cancelled = false;
    setLoadingFragment(true);
    fetch(`/api/spirits/${spiritId}/fragment`)
      .then((r) => r.json() as Promise<FragmentResp>)
      .then((d) => { if (!cancelled) setFragment(d.resolved ?? null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingFragment(false); });
    return () => { cancelled = true; };
  }, [l3Open, spiritId]);

  return (
    <Section title="📜 비밀 이야기">
      {/* Step 1 — 표면 */}
      <Step locked={false} label="첫 만남 한 줄" idx={1}>
        <p className="text-[12px] text-[#3a2418] italic leading-relaxed">
          {spirit.backstoryPreview}
        </p>
      </Step>

      {/* Step 2 — 출신 백스토리 */}
      <Step
        locked={!l2Open}
        label="진짜 이야기"
        idx={2}
        unlockHint={
          !lvGateOpen ? `💜 Lv.5 까지 ${remainXp}XP 더 친해지자`
          : !dayGateOpen ? `🌙 D-${remainDay}일 — 그 날이 오면 풀 수 있어`
          : ''
        }
      >
        {l2Open && backstory ? (
          <div className="space-y-1.5">
            {backstory.paragraphs.map((p, i) => (
              <p key={i} className="text-[12px] leading-relaxed text-[#3a2418]">{p}</p>
            ))}
            <div className="mt-2 p-2 rounded-lg bg-purple-50 border border-purple-200">
              <div className="text-[9px] font-bold text-purple-500 mb-0.5">세계관 조각</div>
              <div className="text-[11px] italic text-purple-700">“{backstory.loreFragment}”</div>
            </div>
          </div>
        ) : null}
      </Step>

      {/* Step 3 — 내 마음의 페이지 (L3, 유저 자기-반영) */}
      <Step
        locked={!l3Open}
        label="내 마음의 페이지"
        idx={3}
        unlockHint={
          !l2Open ? '먼저 진짜 이야기를 풀어줘'
          : need > 0 ? `이 비밀은 다른 정령들의 비밀이 ${need}개 더 풀리면 보여`
          : ''
        }
        accent="amber"
      >
        {l3Open ? (
          loadingFragment ? (
            <p className="text-[11px] text-amber-900/60 italic">너에게서 흘러나온 결을 읽는 중…</p>
          ) : fragment ? (
            <div>
              <pre className="whitespace-pre-wrap font-serif text-[12px] leading-6 text-[#3a2418]">
                {fragment.body}
              </pre>
              {fragment.bridgeOneLiner && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-[10px] italic text-amber-800">“{fragment.bridgeOneLiner}”</div>
                </div>
              )}
              {fragment.sourceLabel && (
                <div className="mt-1 text-[9px] text-amber-700/70">{fragment.sourceLabel}</div>
              )}
            </div>
          ) : null
        ) : null}
      </Step>
    </Section>
  );
}

function Step({ locked, label, idx, children, unlockHint, accent = 'rose' }: {
  locked: boolean;
  label: string;
  idx: number;
  children?: React.ReactNode;
  unlockHint?: string;
  accent?: 'rose' | 'amber';
}) {
  const accentBg = accent === 'amber' ? 'bg-amber-100/60 border-amber-300/60' : 'bg-rose-50 border-rose-200/60';
  return (
    <div className={`mb-2 p-2.5 rounded-xl border ${accentBg} ${locked ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-4 h-4 rounded-full bg-white/70 text-[9px] font-black text-[#7c5738] flex items-center justify-center">
          {idx}
        </span>
        <span className="text-[11px] font-bold text-[#7c5738]">{label}</span>
        <span className="ml-auto text-[10px]">{locked ? '🔒' : '✨'}</span>
      </div>
      {children}
      {locked && unlockHint && (
        <div className="mt-1 text-[10.5px] text-[#7c5738]/80 italic">{unlockHint}</div>
      )}
    </div>
  );
}

/* ───────────────────────── v103 컴포넌트 ───────────────────────── */

/** 마음의 결 — 무드 점등 + 마지막 방문 + Drive 한 줄 */
function MoodDriveStrip({ mood, lastVisitedAt, driveText }: {
  mood: number;
  lastVisitedAt: string | null;
  driveText: string;
}) {
  const dots = moodToDots(mood);
  const moodLbl = moodToLabel(mood);
  const visitedLabel = formatRelativeKr(lastVisitedAt);
  return (
    <div className="mx-4 mt-1 mb-3 px-3 py-2 rounded-2xl flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(254,243,229,0.7) 100%)',
        border: '1px solid rgba(212,175,55,0.25)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[14px]">{dots}</span>
        <span className="text-[10.5px] font-bold text-[#7c5738]">{moodLbl}</span>
      </div>
      <div className="w-px h-4 bg-amber-900/15" />
      <div className="flex-1 text-[10px] text-[#7c5738]/75 italic truncate">
        {driveText}
      </div>
      {visitedLabel && (
        <div className="text-[9px] text-[#a1887f] flex-shrink-0">{visitedLabel}</div>
      )}
    </div>
  );
}

/** 방 배치 토글 — POST /api/spirits/[id]/place */
function RoomPlaceToggle({ spiritId, spiritName, initiallyPlaced, bondLv }: {
  spiritId: string;
  spiritName: string;
  initiallyPlaced: boolean;
  bondLv: number;
}) {
  const [placed, setPlaced] = useState(initiallyPlaced);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !placed;
    setPlaced(next); // optimistic
    try {
      const r = await fetch(`/api/spirits/${spiritId}/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placed: next }),
      });
      if (!r.ok) throw new Error('place failed');
      setToast(next
        ? `${spiritName} 가 방에 함께 있어요 ✨`
        : `${spiritName} 가 방에서 나갔어요`);
      setTimeout(() => setToast(null), 2000);
    } catch {
      setPlaced(!next); // rollback
      setToast('잠깐 — 다시 시도해줘');
      setTimeout(() => setToast(null), 1800);
    } finally {
      setBusy(false);
    }
  }

  const lvNeeded = bondLv < 4;

  return (
    <div className="mx-4 mb-4">
      <h4 className="text-[11px] font-black tracking-widest text-[#7c5738] mb-1.5">🛋️ 같이 두기</h4>
      <button
        onClick={toggle}
        disabled={busy}
        className="w-full p-3 rounded-xl flex items-center gap-3 active:scale-[0.99] transition-transform disabled:opacity-60"
        style={{
          background: placed
            ? 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(236,72,153,0.12) 100%)'
            : 'rgba(255,255,255,0.75)',
          border: `1.5px solid ${placed ? 'rgba(251,191,36,0.45)' : 'rgba(212,175,55,0.25)'}`,
          boxShadow: placed ? '0 0 14px rgba(251,191,36,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.06)',
        }}
      >
        <div className="text-[20px]">{placed ? '✨' : '🛋️'}</div>
        <div className="flex-1 text-left">
          <div className="text-[12px] font-black text-[#3a2418]">
            {placed ? '지금 방에 같이 있어요' : '방에 두기'}
          </div>
          <div className="text-[10px] text-[#7c5738]/75 mt-0.5 leading-snug">
            {placed
              ? '루나 옆에서 너를 기다리고 있어'
              : lvNeeded
                ? 'Lv.4 부터는 다른 친구와 같이 두면 대화도 해'
                : '다른 친구들과 같이 두면 페어 대화가 시작돼'}
          </div>
        </div>
        <div className="text-[10px] font-bold tabular-nums"
          style={{ color: placed ? '#b45309' : '#a1887f' }}
        >
          {placed ? 'ON' : 'OFF'}
        </div>
      </button>
      {toast && (
        <div className="mt-2 text-center text-[10.5px] font-semibold text-amber-700">
          {toast}
        </div>
      )}
    </div>
  );
}

/** 간직한 조각 — 본드 1/3/5 슬롯, 잠긴 슬롯은 흐릿한 실루엣 */
function CherishedFragmentsSection({ spiritId, bondLv }: {
  spiritId: string;
  bondLv: number;
}) {
  const slots = getAllFragmentSlots(spiritId);
  if (slots.length === 0) return null;
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <Section title="💎 간직한 조각">
      <div className="grid grid-cols-3 gap-2">
        {slots.map((f, i) => {
          const required = FRAGMENT_UNLOCK_BY_SLOT[f.slot];
          const unlocked = bondLv >= required;
          const isOpen = openIdx === i;
          return (
            <button
              key={f.slot}
              onClick={() => unlocked && setOpenIdx(isOpen ? null : i)}
              disabled={!unlocked}
              className="aspect-square rounded-xl flex flex-col items-center justify-center p-2 active:scale-95 transition-transform"
              style={{
                background: unlocked
                  ? 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(254,243,229,0.85) 100%)'
                  : 'rgba(0,0,0,0.05)',
                border: `1px ${unlocked ? 'solid rgba(212,175,55,0.45)' : 'dashed rgba(124,87,56,0.25)'}`,
                boxShadow: unlocked ? '0 2px 8px rgba(212,175,55,0.18)' : 'none',
              }}
            >
              <div
                className="text-[26px] leading-none mb-0.5"
                style={{
                  filter: unlocked ? 'none' : 'blur(2.5px) opacity(0.35)',
                }}
              >
                {f.icon}
              </div>
              <div className="text-[8.5px] font-bold text-[#7c5738] truncate max-w-full">
                {unlocked ? f.title : `Lv.${required}에서`}
              </div>
            </button>
          );
        })}
      </div>
      {openIdx !== null && bondLv >= FRAGMENT_UNLOCK_BY_SLOT[slots[openIdx].slot] && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200"
        >
          <div className="text-[10px] font-bold text-amber-700 mb-1">
            {slots[openIdx].icon} {slots[openIdx].title}
          </div>
          <div className="text-[11.5px] italic text-[#3a2418] leading-relaxed">
            {slots[openIdx].recollection}
          </div>
        </motion.div>
      )}
    </Section>
  );
}

/** Mind Map 별자리 — 본드 레벨에 따라 별이 점점 선명해짐 */
interface MapNode {
  id: string;
  type: 'first_meet' | 'bond_up' | 'secret_unlock' | 'room_session' | 'user_note';
  label: string;
  detail: string | null;
  createdAt: string;
}

function MindMapConstellation({ spiritId, bondLv }: { spiritId: string; bondLv: number }) {
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [open, setOpen] = useState<MapNode | null>(null);
  const [adding, setAdding] = useState(false);
  const [noteLabel, setNoteLabel] = useState('');
  const [noteDetail, setNoteDetail] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await fetch(`/api/spirits/${spiritId}/mind-map`);
      const d: { nodes: MapNode[] } = await r.json();
      setNodes(d.nodes ?? []);
    } catch { /* silent */ }
  }
  useEffect(() => { load(); }, [spiritId]);

  const userNoteCount = nodes.filter((n) => n.type === 'user_note').length;
  const canAddNote = bondLv >= 3 && userNoteCount < 3;

  async function submitNote() {
    if (!noteLabel.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/spirits/${spiritId}/mind-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: noteLabel.trim(), detail: noteDetail.trim() || undefined }),
      });
      if (r.ok) {
        await load();
        setAdding(false);
        setNoteLabel('');
        setNoteDetail('');
      }
    } finally {
      setBusy(false);
    }
  }

  // 별 크기/투명도는 본드 레벨 따라
  const clarity = Math.max(0.3, Math.min(1, 0.3 + bondLv * 0.18));

  // 노드 좌표 계산 — 원형 배치 (안정 시드: index)
  const positions = nodes.map((_, i) => {
    const total = Math.max(nodes.length, 1);
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    const r = 38 + (i % 2) * 8;
    return { x: 50 + Math.cos(angle) * r * 0.65, y: 50 + Math.sin(angle) * r * 0.65 };
  });

  const TYPE_STYLE: Record<MapNode['type'], { color: string; size: number }> = {
    first_meet:    { color: '#fde68a', size: 9 },
    bond_up:       { color: '#fca5a5', size: 7 },
    secret_unlock: { color: '#a78bfa', size: 10 },
    room_session:  { color: '#86efac', size: 6 },
    user_note:     { color: '#67e8f9', size: 8 },
  };

  return (
    <Section title="✨ 기억의 별자리">
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          aspectRatio: '5 / 3',
          background: 'radial-gradient(circle at center, #1e1b4b 0%, #0b0219 100%)',
          border: '1px solid rgba(167,139,250,0.25)',
        }}
      >
        {/* 배경 미세 별 */}
        {Array.from({ length: 22 }).map((_, i) => (
          <div
            key={`bg-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 17 + 9) % 100}%`,
              top: `${(i * 23 + 11) % 100}%`,
              width: 1.5,
              height: 1.5,
              opacity: 0.15 + (i % 3) * 0.08,
            }}
          />
        ))}

        {/* 노드 간 선 (인접한 것끼리, 본드 4+) */}
        {bondLv >= 4 && nodes.length > 1 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {nodes.slice(0, -1).map((_, i) => {
              const a = positions[i];
              const b = positions[i + 1];
              return (
                <line
                  key={`l-${i}`}
                  x1={`${a.x}%`} y1={`${a.y}%`}
                  x2={`${b.x}%`} y2={`${b.y}%`}
                  stroke="rgba(167,139,250,0.35)"
                  strokeWidth={0.6}
                  strokeDasharray="2 3"
                />
              );
            })}
          </svg>
        )}

        {/* 노드(별) */}
        {nodes.map((n, i) => {
          const style = TYPE_STYLE[n.type];
          const pos = positions[i];
          return (
            <button
              key={n.id}
              onClick={() => setOpen(n)}
              className="absolute rounded-full active:scale-90 transition-transform"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: style.size,
                height: style.size,
                transform: 'translate(-50%, -50%)',
                background: style.color,
                opacity: clarity,
                boxShadow: `0 0 ${style.size * 1.4}px ${style.color}aa`,
              }}
              aria-label={n.label}
            />
          );
        })}

        {/* 노드 0개 안내 */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[10px] text-white/40 italic text-center px-4 leading-relaxed">
              아직 기억이 모이지 않았어<br />
              만나고 친해지면 별이 하나씩 생겨
            </div>
          </div>
        )}
      </div>

      {/* 선택된 노드 라벨 + 디테일 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 p-2.5 rounded-xl bg-white/85 border border-violet-200"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: TYPE_STYLE[open.type].color }}
              />
              <span className="text-[11px] font-bold text-[#3a2418]">{open.label}</span>
              <button
                onClick={() => setOpen(null)}
                className="ml-auto text-[10px] text-[#a1887f] active:scale-95"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            {open.detail && (
              <div className="text-[11px] text-[#5a3e2b] leading-relaxed italic">{open.detail}</div>
            )}
            <div className="mt-1 text-[9px] text-[#a1887f]">
              {formatRelativeKr(open.createdAt) ?? ''}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 사용자 메모 추가 */}
      <div className="mt-2 flex items-center justify-between">
        <div className="text-[10px] text-[#7c5738]/65">
          ⭐ 별 {nodes.length}개 · 내 메모 {userNoteCount}/3
        </div>
        {!adding && canAddNote && (
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-800 active:scale-95"
            style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.35)' }}
          >
            + 메모 추가
          </button>
        )}
        {!canAddNote && bondLv < 3 && (
          <span className="text-[9px] text-[#a1887f]">Lv.3부터 메모 가능</span>
        )}
      </div>

      {adding && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5"
        >
          <input
            type="text"
            placeholder="기억할 한 줄 (최대 60자)"
            value={noteLabel}
            onChange={(e) => setNoteLabel(e.target.value.slice(0, 60))}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-white border border-amber-300 outline-none focus:border-amber-500"
          />
          <textarea
            placeholder="자세한 내용 (선택, 최대 200자)"
            value={noteDetail}
            onChange={(e) => setNoteDetail(e.target.value.slice(0, 200))}
            rows={2}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-white border border-amber-300 outline-none focus:border-amber-500 resize-none"
          />
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={() => { setAdding(false); setNoteLabel(''); setNoteDetail(''); }}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold text-[#7c5738] active:scale-95"
              style={{ background: 'rgba(0,0,0,0.06)' }}
            >
              취소
            </button>
            <button
              onClick={submitNote}
              disabled={!noteLabel.trim() || busy}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              저장
            </button>
          </div>
        </motion.div>
      )}
    </Section>
  );
}

/** 시간 포맷 */
function formatRelativeKr(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return '방금';
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const d = Math.floor(hr / 24);
    if (d < 7) return `${d}일 전`;
    return `${Math.floor(d / 7)}주 전`;
  } catch { return null; }
}

/* ───────────────────────── 기존 헬퍼 ───────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 mb-4">
      <h4 className="text-[11px] font-black tracking-widest text-[#7c5738] mb-1.5">{title}</h4>
      <div
        className="p-3 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.75)',
          border: '1px solid rgba(212,175,55,0.25)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.06)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Tag({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'gold' | 'muted' }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: '#fef3c7', color: '#92400e' },
    gold: {
      background: 'linear-gradient(135deg, #fde68a 0%, #d97706 100%)',
      color: '#78350f',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
    },
    muted: { background: '#e5e7eb', color: '#6b7280' },
  };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={styles[tone]}
    >
      {children}
    </span>
  );
}
