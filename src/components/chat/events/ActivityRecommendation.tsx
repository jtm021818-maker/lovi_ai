'use client';

/**
 * 🎪 v85: ActivityRecommendation — 루나가 골라준 체험 데이트 2~3개
 *
 * 디자인: 청록~민트 gradient.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, ActivityRecommendationData, ActivitySearchingData, Activity } from '@/types/engine.types';
import LunaSearching from './LunaSearching';

interface Props {
  event: PhaseEvent;
  disabled?: boolean;
}

export default function ActivityRecommendation({ event }: Props) {
  if (event.type === 'ACTIVITY_SEARCHING') {
    const data = event.data as unknown as ActivitySearchingData;
    return (
      <LunaSearching
        topic="activity"
        label="언니가 같이 할 거 찾는 중"
        subtitle={`${data.area} · ${data.category}`}
      />
    );
  }

  const data = event.data as unknown as ActivityRecommendationData;
  return <ResultCard data={data} />;
}

const CATEGORY_COLORS: Record<string, string> = {
  방탈출: '#ef4444',
  공방: '#14b8a6',
  도예: '#d97706',
  와인: '#7c3aed',
  스파: '#ec4899',
  전시: '#6366f1',
  VR: '#06b6d4',
  암장: '#f97316',
  보드게임: '#10b981',
  클래스: '#84cc16',
  기타: '#14b8a6',
};

function getCategoryColor(cat: string): string {
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (cat.includes(key)) return color;
  }
  return CATEGORY_COLORS['기타'];
}

function ResultCard({ data }: { data: ActivityRecommendationData }) {
  const [showSources, setShowSources] = useState(false);
  const has = data.activities && data.activities.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="my-3 max-w-[92%] ml-auto mr-2 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 60%, #e0f2fe 100%)',
        border: '1px solid rgba(20,184,166,0.25)',
        boxShadow: '0 10px 30px rgba(20,184,166,0.18)',
      }}
    >
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">🎪</span>
          <span className="text-[10px] font-semibold text-teal-600/80 tracking-wide">같이 해볼 거 골라놨어</span>
        </div>
        <p className="text-[14px] text-teal-900 font-semibold leading-snug">{data.openerMsg}</p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-200/60 text-teal-700 font-semibold">{data.area}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-200/60 text-cyan-800 font-semibold">{data.category}</span>
        </div>
      </div>

      {has ? (
        <div className="px-3 pb-1 flex flex-col gap-2.5">
          {data.activities.map((act, idx) => (
            <ActivityItem key={`${act.name}-${idx}`} act={act} idx={idx} />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-2 text-[11.5px] text-teal-600/80 italic">
          지금은 잘 안 떠오르네 ㅠ
        </div>
      )}

      {data.lunaComment && (
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-teal-50/70 text-[11.5px] text-teal-800/90 italic text-center">
          &ldquo;{data.lunaComment}&rdquo;
        </div>
      )}

      {data.sources && data.sources.length > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="text-[10px] text-teal-600/70 hover:text-teal-800 transition-colors"
          >
            {showSources ? '▼' : '▶'} 내가 훑어본 것들 ({data.sources.length})
          </button>
          {showSources && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-1 flex flex-col gap-0.5"
            >
              {data.sources.slice(0, 5).map((uri, i) => (
                <a
                  key={i}
                  href={uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-teal-600/80 hover:text-teal-800 truncate"
                >
                  · {uri.replace(/^https?:\/\//, '').slice(0, 50)}
                </a>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ActivityItem({ act, idx }: { act: Activity; idx: number }) {
  const color = getCategoryColor(act.category);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.15, type: 'spring', stiffness: 260, damping: 22 }}
      className="p-3 rounded-xl bg-white/75"
      style={{ borderLeft: `4px solid ${color}`, border: '1px solid rgba(20,184,166,0.1)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14px] font-bold text-teal-900">{act.name}</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white"
              style={{ background: color }}
            >
              {act.category}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
            {act.address && <div className="text-[10.5px] text-teal-600/80">📍 {act.address}</div>}
            {act.duration && <div className="text-[10.5px] text-teal-600/80">⏱️ {act.duration}</div>}
            {act.priceHint && <div className="text-[10.5px] text-teal-600/80">💰 {act.priceHint}</div>}
          </div>
        </div>
      </div>

      {act.vibe && (
        <div className="mt-2 text-[12px] text-teal-900/90 font-medium">
          &ldquo;{act.vibe}&rdquo;
        </div>
      )}
      {act.reviewSummary && (
        <div className="mt-1.5 text-[11px] text-teal-700/85 leading-snug line-clamp-3">
          {act.reviewSummary}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-1.5">
        <a
          href={act.mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-[11px] py-1.5 rounded-lg bg-teal-500/90 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold transition-colors"
        >
          🗺️ 지도
        </a>
        {act.sourceUri && (
          <a
            href={act.sourceUri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-[11px] py-1.5 rounded-lg bg-cyan-200/80 hover:bg-cyan-300 text-teal-900 font-semibold transition-colors"
          >
            📖 후기
          </a>
        )}
      </div>
    </motion.div>
  );
}
