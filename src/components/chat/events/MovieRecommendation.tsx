'use client';

/**
 * 🎬 v85: MovieRecommendation — 루나가 골라준 영화/드라마 3편
 *
 * 디자인: 남색~보라 gradient, 플랫폼별 배지 컬러 (넷플릭스 빨강 등).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, MovieRecommendationData, MovieSearchingData, MovieCard } from '@/types/engine.types';
import LunaSearching from './LunaSearching';

interface Props {
  event: PhaseEvent;
  disabled?: boolean;
}

export default function MovieRecommendation({ event }: Props) {
  if (event.type === 'MOVIE_SEARCHING') {
    const data = event.data as unknown as MovieSearchingData;
    return (
      <LunaSearching
        topic="movie"
        label="언니가 오늘 밤 볼 거 찾는 중"
        subtitle={data.mood}
      />
    );
  }

  const data = event.data as unknown as MovieRecommendationData;
  return <ResultCard data={data} />;
}

/** 플랫폼별 배지 컬러 */
const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  넷플릭스: { bg: '#e50914', text: '#ffffff' },
  티빙: { bg: '#ff0558', text: '#ffffff' },
  '디즈니+': { bg: '#1f3a8a', text: '#ffffff' },
  웨이브: { bg: '#2b5cff', text: '#ffffff' },
  왓챠: { bg: '#ff0558', text: '#ffffff' },
  쿠팡플레이: { bg: '#f43f5e', text: '#ffffff' },
  기타: { bg: '#6366f1', text: '#ffffff' },
};

function getPlatformColor(platform: string): { bg: string; text: string } {
  for (const [key, val] of Object.entries(PLATFORM_COLORS)) {
    if (platform.includes(key)) return val;
  }
  return PLATFORM_COLORS['기타'];
}

function ResultCard({ data }: { data: MovieRecommendationData }) {
  const [showSources, setShowSources] = useState(false);
  const has = data.movies && data.movies.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="my-3 max-w-[92%] ml-auto mr-2 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 60%, #ddd6fe 100%)',
        border: '1px solid rgba(99,102,241,0.22)',
        boxShadow: '0 10px 30px rgba(99,102,241,0.18)',
      }}
    >
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">🎬</span>
          <span className="text-[10px] font-semibold text-indigo-600/80 tracking-wide">언니가 오늘 너한테 골라줌</span>
        </div>
        <p className="text-[14px] text-indigo-900 font-semibold leading-snug">{data.openerMsg}</p>
        {data.mood && (
          <p className="mt-1 text-[11px] text-indigo-500/80 italic">#{data.mood}</p>
        )}
      </div>

      {has ? (
        <div className="px-3 pb-1 flex flex-col gap-2">
          {data.movies.map((movie, idx) => (
            <MovieItem key={`${movie.title}-${idx}`} movie={movie} idx={idx} />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-2 text-[11.5px] text-indigo-600/80 italic">
          지금은 머릿속이 비었네 ㅠ
        </div>
      )}

      {data.lunaComment && (
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-indigo-50/70 text-[11.5px] text-indigo-800/90 italic text-center">
          &ldquo;{data.lunaComment}&rdquo;
        </div>
      )}

      {data.sources && data.sources.length > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="text-[10px] text-indigo-500/70 hover:text-indigo-700 transition-colors"
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
                  className="text-[10px] text-indigo-500/80 hover:text-indigo-700 truncate"
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

function MovieItem({ movie, idx }: { movie: MovieCard; idx: number }) {
  const p = getPlatformColor(movie.platform);

  return (
    <motion.a
      href={movie.searchLink}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.15, type: 'spring', stiffness: 260, damping: 22 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/75 hover:bg-white/90 active:bg-white transition-colors"
      style={{ border: '1px solid rgba(99,102,241,0.1)' }}
    >
      {/* 포스터 플레이스홀더 */}
      <div
        className="w-12 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{
          background: `linear-gradient(135deg, ${['#6366f1', '#8b5cf6', '#a78bfa'][idx % 3]} 0%, ${['#a78bfa', '#c084fc', '#8b5cf6'][idx % 3]} 100%)`,
        }}
      >
        🎞️
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-bold text-indigo-900">{movie.title}</span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: p.bg, color: p.text }}
          >
            {movie.platform}
          </span>
        </div>
        <div className="text-[10.5px] text-indigo-600/85">
          {movie.type}{movie.year ? ` · ${movie.year}` : ''}{movie.genre ? ` · ${movie.genre}` : ''}
        </div>
        {movie.reason && (
          <div className="mt-0.5 text-[11px] text-indigo-700/90 leading-snug line-clamp-2">
            {movie.reason}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 text-[11px] text-indigo-400">▶</div>
    </motion.a>
  );
}
