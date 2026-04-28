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

import { motion, AnimatePresence } from 'framer-motion';
import type { SpiritMaster, UserSpirit, SpiritRarity } from '@/types/spirit.types';
import { SPIRITS } from '@/data/spirits';
import { INTERACTIONS } from '@/data/interactions';
import RarityBadge, { RARITY_META } from './RarityBadge';
import SpiritSprite from '@/components/spirit/SpiritSprite';

interface Props {
  spirit: SpiritMaster | null;
  owned: UserSpirit | null;
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

export default function SpiritDetailSheet({ spirit, owned, onClose }: Props) {
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
            <DetailBody spirit={spirit} owned={owned} onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailBody({ spirit, owned, onClose }: {
  spirit: SpiritMaster;
  owned: UserSpirit | null;
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
            <SpiritSprite spirit={spirit} size={88} emojiSize={72} playing={false} />
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

      {/* 백스토리 */}
      {isOwned && owned && (
        <Section title="📜 비밀 이야기">
          {owned.backstoryUnlocked || owned.bondLv >= 5 ? (
            <p className="text-[12px] text-[#3a2418] leading-relaxed italic">
              {spirit.backstoryPreview}
            </p>
          ) : (
            <>
              <p className="text-[11.5px] text-[#7c5738]/80 italic leading-relaxed">
                &quot;{spirit.backstoryPreview.slice(0, 28)}...&quot;
              </p>
              <p className="mt-1.5 text-[10px] text-[#a1887f]">
                🔒 Lv.5 에 도달하면 전부 읽을 수 있어
              </p>
            </>
          )}
        </Section>
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
                <div className="text-[22px]">{p.emoji}</div>
                <div className="text-[8.5px] font-bold text-[#3a2418] truncate max-w-full mt-0.5">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9.5px] text-[#7c5738]/70 italic">
            둘 다 Lv.4 이상일 때 같이 방에 두면 대화해
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
