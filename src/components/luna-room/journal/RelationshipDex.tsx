'use client';

/**
 * v119.5 — 관계 도감 (Neko Atsume + Animal Crossing 패턴).
 *
 * 3x2 그리드 6슬롯:
 *   1~4 = Lv.1~4 호칭 카드 (밤하늘 폴라로이드)
 *   5   = Lv.5 네임카드 (유저 닉네임 새김 — Genshin 패턴)
 *   6   = 첫 별명 슬롯 (별명 받았을 때 해금)
 *
 * 잠금: 회색 실루엣 + Lock + 호칭형 카피
 * 해금: 풀컬러 일러스트 + 받은 시점
 */

import { motion } from 'framer-motion';
import { Lock } from '@phosphor-icons/react';
import { HANDWRITE_FONT, getStageColor } from '@/lib/luna-life/relationship-tokens';
import StageIllustration from './StageIllustration';
import { getStageLabel } from './level-unlocks';

interface Props {
  currentLevel: number;
  /** 첫 별명 받은 적 있는지 */
  hasNickname?: boolean;
  /** 유저 닉네임 (Lv.5 네임카드용) */
  userDisplayName?: string;
  show: boolean;
}

interface SlotData {
  key: string;
  level: number | 'nickname';
  unlocked: boolean;
  title: string;
  lockedHint: string;
  unlockedDate?: string;
}

export default function RelationshipDex({
  currentLevel, hasNickname = false, userDisplayName, show,
}: Props) {
  const slots: SlotData[] = [
    {
      key: 'lv1',
      level: 1,
      unlocked: currentLevel >= 1,
      title: '첫 별이 켜진 밤',
      lockedHint: '곧 만날 거야',
    },
    {
      key: 'lv2',
      level: 2,
      unlocked: currentLevel >= 2,
      title: '별 두 개가 이어진 밤',
      lockedHint: '아는 사이가 되면',
    },
    {
      key: 'lv3',
      level: 3,
      unlocked: currentLevel >= 3,
      title: '달이 우릴 비춘 밤',
      lockedHint: '친구 사이가 되면',
    },
    {
      key: 'lv4',
      level: 4,
      unlocked: currentLevel >= 4,
      title: '은하수가 흐른 밤',
      lockedHint: '단짝 사이가 되면',
    },
    {
      key: 'lv5',
      level: 5,
      unlocked: currentLevel >= 5,
      title: '우리만의 우주',
      lockedHint: '소중한 사람이 되면',
    },
    {
      key: 'nickname',
      level: 'nickname',
      unlocked: hasNickname,
      title: '첫 별명',
      lockedHint: '루나가 별명으로 부를 때',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ delay: 0.95, duration: 0.6 }}
      style={{ marginBottom: 6 }}
    >
      {/* 섹션 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        <div
          style={{
            padding: '2px 8px 3px',
            background: 'linear-gradient(135deg, #B8A4D8, #8C6AC4)',
            borderRadius: 4,
            fontFamily: HANDWRITE_FONT,
            fontSize: 10,
            color: '#fff',
            letterSpacing: '0.06em',
            transform: 'rotate(-3deg)',
            boxShadow: '0 2px 4px rgba(140,106,196,0.30)',
          }}
        >
          📖 DEX
        </div>
        <h3
          style={{
            margin: 0,
            fontFamily: HANDWRITE_FONT,
            fontSize: 16,
            color: '#3F2A75',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          우리 사이 도감
        </h3>
        <span
          style={{
            marginLeft: 'auto',
            padding: '2px 8px',
            background: 'rgba(140,106,196,0.12)',
            border: '1px solid rgba(140,106,196,0.30)',
            borderRadius: 999,
            fontFamily: HANDWRITE_FONT,
            fontSize: 10,
            color: '#5B3F87',
            fontWeight: 600,
          }}
        >
          {slots.filter((s) => s.unlocked).length} / {slots.length}
        </span>
      </div>

      {/* 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          padding: '12px 10px',
          background: 'linear-gradient(180deg, #FBF5EC 0%, #F2E6D5 100%)',
          border: '1px solid rgba(196,136,111,0.22)',
          borderRadius: 14,
        }}
      >
        {slots.map((s, i) => (
          <DexSlot key={s.key} slot={s} index={i} show={show} userDisplayName={userDisplayName} />
        ))}
      </div>
    </motion.section>
  );
}

function DexSlot({
  slot, index, show, userDisplayName,
}: {
  slot: SlotData;
  index: number;
  show: boolean;
  userDisplayName?: string;
}) {
  const isNickname = slot.level === 'nickname';
  const lvNum = isNickname ? null : (slot.level as number);
  const stage = lvNum ? getStageLabel(lvNum) : null;
  const color = lvNum ? getStageColor(lvNum) : null;
  const isCosmos = lvNum === 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, rotate: index % 2 === 0 ? -1.5 : 1.5 }}
      animate={
        show
          ? { opacity: 1, y: 0, rotate: index % 2 === 0 ? -1.0 : 1.0 }
          : { opacity: 0, y: 6 }
      }
      transition={{ delay: 1.05 + index * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        padding: 6,
        background: '#fff',
        border: '1px solid rgba(124,87,56,0.18)',
        borderRadius: 8,
        boxShadow: '0 2px 5px rgba(45,32,19,0.08), 0 1px 1px rgba(45,32,19,0.04)',
        aspectRatio: '3 / 4',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 일러스트 영역 */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          borderRadius: 5,
          overflow: 'hidden',
          background: slot.unlocked
            ? (isCosmos ? '#0F0E2A' : (color ? `${color.bg[2]}cc` : '#E8DCC9'))
            : '#E2D8C8',
          filter: slot.unlocked ? 'none' : 'grayscale(0.65)',
        }}
      >
        {slot.unlocked && lvNum && (
          <StageIllustration level={lvNum} size={120} variant="card" show={show} />
        )}
        {slot.unlocked && isNickname && (
          <NicknameSlotIllustration />
        )}
        {!slot.unlocked && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={26} weight="thin" color="#8B7657" />
          </div>
        )}
        {/* Cosmos 네임카드 — 유저 이름 새김 */}
        {slot.unlocked && isCosmos && userDisplayName && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: 4,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: HANDWRITE_FONT,
              fontSize: 9,
              color: '#F5D38A',
              letterSpacing: '0.06em',
              textShadow: '0 0 6px rgba(245,211,138,0.50)',
            }}
          >
            ✦ {userDisplayName} ✦
          </div>
        )}
      </div>

      {/* 라벨 영역 — 폴라로이드 하단 손글씨 */}
      <div
        style={{
          padding: '5px 4px 2px',
          textAlign: 'center',
          fontFamily: HANDWRITE_FONT,
          fontSize: 10,
          color: slot.unlocked ? (stage?.level === 5 ? '#5B3F87' : '#5A4030') : '#A89578',
          lineHeight: 1.15,
        }}
      >
        {slot.unlocked ? slot.title : slot.lockedHint}
      </div>
    </motion.div>
  );
}

/**
 * 첫 별명 슬롯 일러스트 — 손글씨 봉투
 */
function NicknameSlotIllustration() {
  return (
    <svg viewBox="0 0 120 120" width={120} height={120} aria-hidden role="img">
      <defs>
        <linearGradient id="env-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCEAD9" />
          <stop offset="100%" stopColor="#F6CFDA" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill="url(#env-bg)" />
      {/* 봉투 */}
      <g transform="translate(60 64)">
        <rect x="-30" y="-22" width="60" height="38" rx="2" fill="#FFFBEE" stroke="#C98AB8" strokeWidth="1" />
        <path d="M -30 -22 L 0 4 L 30 -22" fill="none" stroke="#C98AB8" strokeWidth="1.2" />
        {/* 봉인 씰 */}
        <circle cx="0" cy="5" r="6" fill="#E08AB8" />
        <text x="0" y="8" fontSize="6" textAnchor="middle" fill="#fff" fontFamily="serif">♥</text>
      </g>
      {/* 작은 별 데코 */}
      <circle cx="22" cy="22" r="1.4" fill="#C98AB8" opacity="0.6" />
      <circle cx="98" cy="30" r="1.6" fill="#C98AB8" opacity="0.7" />
      <circle cx="100" cy="98" r="1.2" fill="#C98AB8" opacity="0.5" />
    </svg>
  );
}
