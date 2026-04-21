'use client';

/**
 * 💌 v85: AnniversaryRecommendation — 루나가 짜준 기념일 이벤트 아이디어 2~3개
 *
 * 디자인: 골드~크림 gradient, 체크리스트 카드 (steps 번호 목록).
 * 장소/상품 링크 없음 — 실행 가이드 중심.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, AnniversaryRecommendationData, AnniversarySearchingData, AnniversaryIdea } from '@/types/engine.types';
import LunaSearching from './LunaSearching';

interface Props {
  event: PhaseEvent;
  disabled?: boolean;
}

export default function AnniversaryRecommendation({ event }: Props) {
  if (event.type === 'ANNIVERSARY_SEARCHING') {
    const data = event.data as unknown as AnniversarySearchingData;
    return (
      <LunaSearching
        topic="anniversary"
        label="언니가 이벤트 짜주는 중"
        subtitle={`${data.milestone} · ${data.style}`}
      />
    );
  }

  const data = event.data as unknown as AnniversaryRecommendationData;
  return <ResultCard data={data} />;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  쉬움: '#10b981',
  중간: '#f59e0b',
  공들임: '#ef4444',
};

function ResultCard({ data }: { data: AnniversaryRecommendationData }) {
  const [showSources, setShowSources] = useState(false);
  const has = data.ideas && data.ideas.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="my-3 max-w-[92%] ml-auto mr-2 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 60%, #fef3c7 100%)',
        border: '1px solid rgba(234,179,8,0.25)',
        boxShadow: '0 10px 30px rgba(234,179,8,0.18)',
      }}
    >
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">💌</span>
          <span className="text-[10px] font-semibold text-amber-600/80 tracking-wide">언니가 진짜 효과 본 것들</span>
        </div>
        <p className="text-[14px] text-amber-900 font-semibold leading-snug">{data.openerMsg}</p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200/60 text-amber-800 font-semibold">{data.milestone}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-200/60 text-yellow-800 font-semibold">{data.relation}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-200/60 text-orange-800 font-semibold">{data.style}</span>
        </div>
      </div>

      {has ? (
        <div className="px-3 pb-1 flex flex-col gap-2.5">
          {data.ideas.map((idea, idx) => (
            <IdeaItem key={`${idea.title}-${idx}`} idea={idea} idx={idx} />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-2 text-[11.5px] text-amber-700/80 italic">
          더 좋은 거 생각나면 알려줄게 ㅠ
        </div>
      )}

      {data.lunaComment && (
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-amber-50/80 text-[11.5px] text-amber-800/90 italic text-center">
          &ldquo;{data.lunaComment}&rdquo;
        </div>
      )}

      {data.sources && data.sources.length > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="text-[10px] text-amber-600/70 hover:text-amber-800 transition-colors"
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
                  className="text-[10px] text-amber-600/80 hover:text-amber-800 truncate"
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

function IdeaItem({ idea, idx }: { idea: AnniversaryIdea; idx: number }) {
  const diffColor = idea.difficulty ? DIFFICULTY_COLORS[idea.difficulty] ?? '#eab308' : '#eab308';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.15, type: 'spring', stiffness: 260, damping: 22 }}
      className="p-3.5 rounded-xl bg-white/80"
      style={{ borderLeft: `4px solid ${diffColor}`, border: '1px solid rgba(234,179,8,0.12)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14px] font-bold text-amber-900">{idea.title}</span>
            {idea.difficulty && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: diffColor }}>
                {idea.difficulty}
              </span>
            )}
          </div>
          {idea.estimatedCost && (
            <div className="mt-0.5 text-[10.5px] text-amber-700/80">🎯 {idea.estimatedCost}</div>
          )}
        </div>
      </div>

      {/* 실행 체크리스트 */}
      {idea.steps && idea.steps.length > 0 && (
        <ol className="mt-2.5 flex flex-col gap-1">
          {idea.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-[11.5px] text-amber-900/90">
              <span
                className="flex-shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: diffColor }}
              >
                {i + 1}
              </span>
              <span className="leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      )}

      {/* 준비물 */}
      {idea.materials && idea.materials.length > 0 && (
        <div className="mt-2.5 text-[10.5px] text-amber-700/80">
          <span className="font-semibold">준비물:</span> {idea.materials.join(', ')}
        </div>
      )}

      {/* 루나 팁 */}
      {idea.lunaTip && (
        <div className="mt-2.5 p-2 rounded-lg bg-amber-50/80 text-[11px] text-amber-800/95 italic">
          💛 {idea.lunaTip}
        </div>
      )}
    </motion.div>
  );
}
