'use client';

/**
 * 📊 v85.6: BrowseProgressRail — 같이 찾기 상단 진행 rail
 *
 * 본 카드/스킵/좋아/별로 반응 기록을 색 dot 으로 시각화.
 * "1 / 8 보는 중" 진행률 + dot 타임라인.
 */

import type { BrowseCandidate } from '@/types/engine.types';

export type ReactionMap = Record<string, 'love' | 'skip' | 'reject' | null>;

interface Props {
  candidates: BrowseCandidate[];
  currentIndex: number;
  reactions: ReactionMap;
  topicLabel: string;
}

const DOT_COLOR: Record<'love' | 'skip' | 'reject' | 'unseen' | 'current', string> = {
  love:    '#ec4899',
  skip:    '#94a3b8',
  reject:  '#64748b',
  unseen:  'rgba(0,0,0,0.12)',
  current: '#f59e0b',
};

export default function BrowseProgressRail({ candidates, currentIndex, reactions, topicLabel }: Props) {
  const total = candidates.length;
  const seenCount = candidates.filter((c, i) => i < currentIndex || reactions[c.id]).length;

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px]">🔍</span>
          <span className="text-[11px] font-bold text-amber-800 tracking-wide truncate max-w-[180px]">
            {topicLabel}
          </span>
        </div>
        <div className="text-[10.5px] font-bold text-amber-700/80 tabular-nums">
          {Math.min(currentIndex + 1, total)} / {total}
        </div>
      </div>

      {/* Dot 타임라인 */}
      <div className="flex items-center gap-1">
        {candidates.map((c, i) => {
          const reaction = reactions[c.id];
          let color: string;
          let isCurrent = i === currentIndex && !reaction;
          if (isCurrent) color = DOT_COLOR.current;
          else if (reaction) color = DOT_COLOR[reaction];
          else color = DOT_COLOR.unseen;
          return (
            <div
              key={c.id}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{
                background: color,
                boxShadow: isCurrent ? `0 0 4px ${color}, 0 0 8px ${color}` : 'none',
                transform: isCurrent ? 'scaleY(1.6)' : 'scaleY(1)',
              }}
            />
          );
        })}
      </div>

      {/* 범례 (작게) */}
      <div className="mt-1.5 flex items-center gap-2.5 text-[8.5px] text-amber-800/60">
        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: DOT_COLOR.love }} />좋아</span>
        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: DOT_COLOR.skip }} />패스</span>
        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: DOT_COLOR.reject }} />별로</span>
        <span className="ml-auto text-amber-700/70 italic">{seenCount} 훑음</span>
      </div>
    </div>
  );
}
