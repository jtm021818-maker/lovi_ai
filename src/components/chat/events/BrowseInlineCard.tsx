'use client';

/**
 * 🔍 v85.7: BrowseInlineCard — 루나 말풍선 사이에 끼는 미니카드
 *
 * 카드 UI 느낌 최소화, 말풍선 흐름 방해 안 하는 톤.
 */

import type { BrowseCandidate } from '@/types/engine.types';

interface Props {
  candidate: BrowseCandidate;
}

export default function BrowseInlineCard({ candidate }: Props) {
  const { emoji, themeColor, title, category, oneLine, priceHint, deepLink } = candidate;
  const color = themeColor ?? '#d97706';

  return (
    <div
      className="my-2 rounded-2xl px-3 py-2.5 flex items-start gap-3"
      style={{
        background: `linear-gradient(135deg, ${color}14 0%, ${color}06 100%)`,
        border: `1px solid ${color}38`,
      }}
    >
      {/* 이모지 원형 */}
      <div
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[20px]"
        style={{
          background: `linear-gradient(135deg, ${color}22 0%, ${color}10 100%)`,
          border: `1px solid ${color}38`,
        }}
      >
        {emoji ?? '✨'}
      </div>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[13.5px] font-extrabold text-[#2a1a10] truncate">{title}</span>
          {category && (
            <span
              className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${color}22`, color }}
            >
              {category}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11.5px] text-[#4a2f1a] leading-snug">{oneLine}</p>
        {priceHint && (
          <div className="mt-1 text-[10.5px] font-semibold" style={{ color }}>
            💸 {priceHint}
          </div>
        )}
        {deepLink && (
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-bold underline-offset-2 hover:underline"
            style={{ color }}
          >
            자세히 열기 →
          </a>
        )}
      </div>
    </div>
  );
}
