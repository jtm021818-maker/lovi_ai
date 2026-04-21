'use client';

/**
 * 🌙 v85: LunaSearching — 6종 검색 이벤트 공통 "루나가 고르는 중" UI
 *
 * 기존 SongRecommendation/DateSpotRecommendation 내부 SearchingCard 중복 제거.
 * "언니 톤" — 기계적 "검색 중" → "잠깐만 나 생각 중" 인간적 독백으로 멘트 교체.
 *
 * 각 이벤트별로 이모지/팔레트/서브타이틀만 주입, 애니메이션/멘트 4단계는 공통.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type LunaSearchingTopic =
  | 'song' | 'date-spot' | 'gift' | 'activity' | 'anniversary' | 'movie' | 'browse';

interface Palette {
  emoji: string;
  /** 배경 그라데이션 (linear-gradient CSS 값) */
  background: string;
  /** 박스 테두리 색 */
  border: string;
  /** box-shadow 색 */
  shadow: string;
  /** 아이콘 원 그라데이션 */
  iconBg: string;
  /** 라벨 / 서브타이틀 텍스트 컬러 */
  labelClass: string;
  subClass: string;
  /** 본문 멘트 텍스트 컬러 */
  stepClass: string;
  /** 도트/프로그레스 바 컬러 */
  accent: string;
  /** 언니 한마디 "인터넷 찾고 있어" 대체 푸터 */
  footer: string;
}

const PALETTES: Record<LunaSearchingTopic, Palette> = {
  'song': {
    emoji: '🎵',
    background: 'linear-gradient(135deg, #f5e1ff 0%, #ffdce5 50%, #e8d4ff 100%)',
    border: 'rgba(168,85,247,0.25)',
    shadow: 'rgba(168,85,247,0.15)',
    iconBg: 'linear-gradient(135deg, #c084fc 0%, #f472b6 100%)',
    labelClass: 'text-purple-700',
    subClass: 'text-purple-500/80',
    stepClass: 'text-purple-900/85',
    accent: 'bg-purple-400',
    footer: '너 생각하면서 고르는 중',
  },
  'date-spot': {
    emoji: '📍',
    background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 60%, #fef3c7 100%)',
    border: 'rgba(251,146,60,0.3)',
    shadow: 'rgba(251,146,60,0.15)',
    iconBg: 'linear-gradient(135deg, #fb923c 0%, #fbbf24 100%)',
    labelClass: 'text-orange-700',
    subClass: 'text-orange-600/80',
    stepClass: 'text-orange-900/85',
    accent: 'bg-orange-400',
    footer: '좋은 데 골라보는 중',
  },
  'gift': {
    emoji: '🎁',
    background: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 50%, #ffd1dc 100%)',
    border: 'rgba(244,63,94,0.28)',
    shadow: 'rgba(244,63,94,0.15)',
    iconBg: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)',
    labelClass: 'text-rose-700',
    subClass: 'text-rose-500/80',
    stepClass: 'text-rose-900/85',
    accent: 'bg-rose-400',
    footer: '네 마음 담길 거 찾는 중',
  },
  'activity': {
    emoji: '🎪',
    background: 'linear-gradient(135deg, #ccfbf1 0%, #a7f3d0 50%, #e0f2fe 100%)',
    border: 'rgba(20,184,166,0.28)',
    shadow: 'rgba(20,184,166,0.15)',
    iconBg: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
    labelClass: 'text-teal-700',
    subClass: 'text-teal-600/80',
    stepClass: 'text-teal-900/85',
    accent: 'bg-teal-400',
    footer: '같이 해볼 거 고르는 중',
  },
  'anniversary': {
    emoji: '💌',
    background: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 50%, #fef3c7 100%)',
    border: 'rgba(234,179,8,0.3)',
    shadow: 'rgba(234,179,8,0.15)',
    iconBg: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
    labelClass: 'text-amber-700',
    subClass: 'text-amber-600/80',
    stepClass: 'text-amber-900/85',
    accent: 'bg-amber-400',
    footer: '효과 좋을 것만 골라보는 중',
  },
  'movie': {
    emoji: '🎬',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #ddd6fe 100%)',
    border: 'rgba(99,102,241,0.28)',
    shadow: 'rgba(99,102,241,0.15)',
    iconBg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    labelClass: 'text-indigo-700',
    subClass: 'text-indigo-500/80',
    stepClass: 'text-indigo-900/85',
    accent: 'bg-indigo-400',
    footer: '오늘 밤 너한테 맞는 거 찾는 중',
  },
  'browse': {
    emoji: '🔍',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 40%, #fbcfe8 100%)',
    border: 'rgba(236,72,153,0.28)',
    shadow: 'rgba(236,72,153,0.18)',
    iconBg: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
    labelClass: 'text-amber-800',
    subClass: 'text-amber-700/80',
    stepClass: 'text-amber-900/85',
    accent: 'bg-amber-400',
    footer: '같이 볼 거 8개 뽑는 중',
  },
};

/** 공통 4단계 "언니가 고르는 중" 멘트 */
const SEARCH_STEPS = [
  { at: 0, text: '잠깐만, 너 이런 기분이지?' },
  { at: 900, text: '아 이거 있잖아...' },
  { at: 1800, text: '이건 아니고... 이건 어떨까' },
  { at: 2700, text: '응 이거 너 줘도 될 것 같아' },
];

interface Props {
  topic: LunaSearchingTopic;
  /** 헤더 라벨 (예: "LUNA 가 노래 고르는 중") */
  label: string;
  /** 서브타이틀 (예: mood/area/occasion 한 줄) */
  subtitle: string;
}

export default function LunaSearching({ topic, label, subtitle }: Props) {
  const palette = PALETTES[topic];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timers = SEARCH_STEPS.slice(1).map((step, i) =>
      window.setTimeout(() => setStepIdx(i + 1), step.at),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 max-w-[88%] ml-auto mr-2 p-4 rounded-2xl overflow-hidden"
      style={{
        background: palette.background,
        border: `1px solid ${palette.border}`,
        boxShadow: `0 8px 28px ${palette.shadow}`,
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: palette.iconBg }}>
          <span>{palette.emoji}</span>
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: palette.border }}
            animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-bold tracking-wide ${palette.labelClass}`}>{label}</div>
          <div className={`text-[10px] truncate ${palette.subClass}`}>{subtitle}</div>
        </div>
      </div>

      {/* 언니 독백 (4단계 교체) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.25 }}
          className={`text-[13px] font-medium italic ${palette.stepClass}`}
        >
          &ldquo;{SEARCH_STEPS[stepIdx].text}&rdquo;
        </motion.div>
      </AnimatePresence>

      {/* 도트 */}
      <div className="mt-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${palette.accent}`}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      {/* 푸터 */}
      <div className={`mt-3 text-[10px] flex items-center gap-1 ${palette.subClass}`}>
        <span>✨</span>
        <span>{palette.footer}</span>
      </div>
    </motion.div>
  );
}
