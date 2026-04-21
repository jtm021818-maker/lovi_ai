'use client';

/**
 * 🗃️ v85.6: BrowseCandidateCard — 같이 찾기 현재 후보 카드
 *
 * 디자인:
 *   - 상단: 이모지 + 제목 + 카테고리 배지
 *   - 중단: 한 줄 요약 (+ 펼침으로 detail)
 *   - 루나 take: stance 색 배지 + reason 말풍선
 *   - 가격 힌트 + 지도/쇼핑 딥링크
 *   - 반응 버튼 3개: 👎 별로 / 🤔 다음 / 💝 좋아
 *   - 추가 액션: 🏁 결정 · 🔗 출처
 *
 * Framer Motion 으로 카드 등장 spring + 반응 시 오른쪽 swipe exit.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BrowseCandidate, LunaStance } from '@/types/engine.types';

type Reaction = 'love' | 'skip' | 'reject';

interface Props {
  candidate: BrowseCandidate;
  indexLabel: string;                    // "3 / 8"
  onReact: (reaction: Reaction) => void;
  onDecide: () => void;
  disabled?: boolean;
}

const STANCE_META: Record<LunaStance, { label: string; color: string; bg: string; emoji: string }> = {
  love:  { label: '내가 골라도 이거', color: '#be185d', bg: '#fce7f3',  emoji: '💝' },
  good:  { label: '괜찮아 볼만해',    color: '#047857', bg: '#d1fae5',  emoji: '👌' },
  mixed: { label: '좋긴 한데',        color: '#b45309', bg: '#fef3c7',  emoji: '🤔' },
  meh:   { label: '솔직히 패스',      color: '#475569', bg: '#e2e8f0',  emoji: '🤷' },
};

export default function BrowseCandidateCard({
  candidate,
  indexLabel,
  onReact,
  onDecide,
  disabled,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [exitDir, setExitDir] = useState<Reaction | null>(null);

  const stance = STANCE_META[candidate.lunaTake.stance];
  const themeColor = candidate.themeColor ?? '#f59e0b';

  const handleReact = (r: Reaction) => {
    if (disabled) return;
    setExitDir(r);
    // 애니메이션 시간 후 onReact 호출
    window.setTimeout(() => onReact(r), 220);
  };

  const exitVariants = {
    love:   { x: 160, rotate: 8, opacity: 0 },
    skip:   { y: 40, opacity: 0 },
    reject: { x: -160, rotate: -8, opacity: 0 },
  } as const;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={candidate.id}
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={exitDir ? exitVariants[exitDir] : { opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={(_e, info) => {
          if (disabled) return;
          if (info.offset.x > 80) handleReact('love');
          else if (info.offset.x < -80) handleReact('reject');
        }}
        className="mx-3 rounded-2xl overflow-hidden select-none"
        style={{
          background: `linear-gradient(160deg, #fffbed 0%, ${themeColor}15 55%, #ffffff 100%)`,
          border: `1px solid ${themeColor}55`,
          boxShadow: `0 10px 28px ${themeColor}22`,
          cursor: disabled ? 'default' : 'grab',
        }}
      >
        {/* 상단 — 이모지 + 제목 */}
        <div className="px-4 pt-4 pb-2 flex items-start gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[32px] flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, #ffffff 0%, ${themeColor}33 100%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.65), 0 3px 8px ${themeColor}22`,
              filter: `drop-shadow(0 2px 6px ${themeColor}66)`,
            }}
          >
            {candidate.emoji ?? '✨'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-[9.5px] font-bold text-amber-700/80 tracking-[0.15em] mb-0.5">
              <span>NOW SHOWING</span>
              <span className="opacity-60">· {indexLabel}</span>
            </div>
            <h3 className="text-[15px] font-extrabold text-[#3a2418] leading-tight truncate">
              {candidate.title}
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
              {candidate.category && (
                <span
                  className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${themeColor}22`, color: themeColor }}
                >
                  {candidate.category}
                </span>
              )}
              {candidate.priceHint && (
                <span className="text-[9.5px] text-[#7c5738] font-medium">💰 {candidate.priceHint}</span>
              )}
            </div>
          </div>
        </div>

        {/* 한 줄 요약 */}
        <div className="px-4 pb-2">
          <p className="text-[12.5px] text-[#3a2418] leading-relaxed">
            {candidate.oneLine}
          </p>
          {candidate.detail && (
            <button
              onClick={() => setShowDetail((v) => !v)}
              className="mt-1 text-[10.5px] font-semibold text-amber-700/85 hover:text-amber-900"
            >
              {showDetail ? '▲ 접기' : '▼ 자세히 보기'}
            </button>
          )}
          <AnimatePresence>
            {showDetail && candidate.detail && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1.5 text-[11.5px] text-[#5a3e2b] leading-relaxed italic"
              >
                {candidate.detail}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* 루나 take */}
        <div className="mx-3 mb-3 p-3 rounded-2xl"
          style={{
            background: stance.bg,
            border: `1.5px solid ${stance.color}55`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[14px]">{stance.emoji}</span>
            <span className="text-[9.5px] font-black tracking-[0.2em]" style={{ color: stance.color }}>
              루나의 느낌 · {stance.label.toUpperCase()}
            </span>
          </div>
          <p className="text-[12px] italic font-medium" style={{ color: stance.color }}>
            &ldquo;{candidate.lunaTake.reason}&rdquo;
          </p>
        </div>

        {/* 액션 — 외부 링크 */}
        {(candidate.deepLink || candidate.sourceUrl) && (
          <div className="px-3 pb-3 flex items-center gap-1.5">
            {candidate.deepLink && (
              <a
                href={candidate.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-[10.5px] py-1.5 rounded-lg bg-white/80 text-[#3a2418] font-semibold border border-amber-300/60 active:scale-95 transition-transform"
              >
                🔗 자세히 보기
              </a>
            )}
            {candidate.sourceUrl && candidate.sourceUrl !== candidate.deepLink && (
              <a
                href={candidate.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-[10.5px] py-1.5 rounded-lg bg-white/80 text-[#7c5738] font-semibold border border-amber-200/50 active:scale-95 transition-transform"
              >
                📖 후기
              </a>
            )}
          </div>
        )}

        {/* 반응 버튼 3개 */}
        <div
          className="px-3 pt-2 pb-3 flex items-center gap-1.5"
          style={{ borderTop: '1px solid rgba(245,158,11,0.2)' }}
        >
          <ReactBtn
            variant="reject"
            label="별로"
            emoji="👎"
            onClick={() => handleReact('reject')}
            disabled={disabled}
          />
          <ReactBtn
            variant="skip"
            label="다음"
            emoji="🤔"
            onClick={() => handleReact('skip')}
            disabled={disabled}
          />
          <ReactBtn
            variant="love"
            label="좋아"
            emoji="💝"
            onClick={() => handleReact('love')}
            disabled={disabled}
          />
        </div>

        {/* 결정 바로가기 */}
        <div className="px-3 pb-3">
          <button
            onClick={onDecide}
            disabled={disabled}
            className="w-full py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            🏁 이걸로 결정!
          </button>
        </div>

        {/* 힌트 */}
        <div className="pb-3 text-center text-[9px] text-amber-700/60 italic">
          ← 스와이프로 별로 · 오른쪽은 좋아 →
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ReactBtn({
  variant,
  label,
  emoji,
  onClick,
  disabled,
}: {
  variant: Reaction;
  label: string;
  emoji: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const styles: Record<Reaction, { bg: string; color: string; border: string }> = {
    reject: { bg: '#e2e8f0', color: '#475569', border: 'rgba(71,85,105,0.35)' },
    skip:   { bg: '#fef3c7', color: '#b45309', border: 'rgba(180,83,9,0.35)' },
    love:   { bg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', color: '#be185d', border: 'rgba(190,24,93,0.4)' },
  };
  const s = styles[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 transition-all active:scale-93"
      style={{
        background: s.bg,
        color: s.color,
        border: `1.5px solid ${s.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
      }}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
