'use client';

/**
 * 🎵 v85: SongRecommendation — 루나가 골라준 노래 3곡
 *
 * v84 대비 변경:
 *   - SearchingCard → 공통 <LunaSearching topic="song" />
 *   - 헤더 라벨("LUNA'S PLAYLIST") → openerMsg 중심 재배치
 *   - sources 항상 하단 + 접힌 상태
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, SongRecommendationData, SongSearchingData } from '@/types/engine.types';
import LunaSearching from './LunaSearching';

interface Props {
  event: PhaseEvent;
  disabled?: boolean;
}

export default function SongRecommendation({ event }: Props) {
  if (event.type === 'SONG_SEARCHING') {
    const data = event.data as unknown as SongSearchingData;
    return (
      <LunaSearching
        topic="song"
        label="언니가 들려주고 싶은 거 고르는 중"
        subtitle={data.mood}
      />
    );
  }

  const data = event.data as unknown as SongRecommendationData;
  return <ResultCard data={data} />;
}

// ============================================================
// 결과 카드
// ============================================================

function ResultCard({ data }: { data: SongRecommendationData }) {
  const [showSources, setShowSources] = useState(false);
  const hasSongs = data.songs && data.songs.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="my-3 max-w-[92%] ml-auto mr-2 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #faf0ff 0%, #fff0f6 60%, #f3e8ff 100%)',
        border: '1px solid rgba(168,85,247,0.22)',
        boxShadow: '0 10px 30px rgba(168,85,247,0.18)',
      }}
    >
      {/* 헤더 — openerMsg 중심 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">🎵</span>
          <span className="text-[10px] font-semibold text-purple-600/80 tracking-wide">언니가 너한테 들려주고 싶은 거</span>
        </div>
        <p className="text-[14px] text-purple-900 font-semibold leading-snug">{data.openerMsg}</p>
        {data.mood && (
          <p className="mt-1 text-[11px] text-purple-500/80 italic">#{data.mood}</p>
        )}
      </div>

      {/* 곡 카드들 */}
      {hasSongs ? (
        <div className="px-3 pb-1 flex flex-col gap-2">
          {data.songs.map((song, idx) => (
            <motion.a
              key={`${song.title}-${idx}`}
              href={song.searchLink}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.15, type: 'spring', stiffness: 260, damping: 22 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/60 hover:bg-white/80 active:bg-white/90 transition-colors"
              style={{ border: '1px solid rgba(168,85,247,0.1)' }}
            >
              {/* 앨범 플레이스홀더 */}
              <div
                className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-lg font-bold"
                style={{
                  background: `linear-gradient(135deg, ${['#c084fc', '#f472b6', '#a78bfa'][idx % 3]} 0%, ${['#e879f9', '#fb7185', '#c084fc'][idx % 3]} 100%)`,
                }}
              >
                {idx + 1}
              </div>
              {/* 메타 */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-purple-900 truncate">{song.title}</div>
                <div className="text-[11px] text-purple-600/90 truncate">{song.artist}{song.year ? ` · ${song.year}` : ''}</div>
                {song.reason && (
                  <div className="mt-0.5 text-[10.5px] text-purple-700/90 line-clamp-2 italic">
                    {song.reason}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-[11px] text-purple-400">▶</div>
            </motion.a>
          ))}
        </div>
      ) : (
        <div className="px-4 pb-2 text-[11.5px] text-purple-500/80 italic">
          지금은 잘 안 떠오르네 ㅠ
        </div>
      )}

      {/* 루나 코멘트 */}
      {data.lunaComment && (
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-purple-50/60 text-[11.5px] text-purple-800/90 italic text-center">
          &ldquo;{data.lunaComment}&rdquo;
        </div>
      )}

      {/* 출처 — 하단 + 접힌 상태 */}
      {data.sources && data.sources.length > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="text-[10px] text-purple-500/70 hover:text-purple-700 transition-colors"
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
                  className="text-[10px] text-purple-500/80 hover:text-purple-700 truncate"
                >
                  · {uri.replace(/^https?:\/\//, '').slice(0, 50)}
                </a>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* ToS — Google 호환 (Brave 는 필요 없지만 하위 호환) */}
      {data.renderedContent && (
        <div
          className="px-4 pb-3 text-[10px]"
          dangerouslySetInnerHTML={{ __html: data.renderedContent }}
        />
      )}
    </motion.div>
  );
}
