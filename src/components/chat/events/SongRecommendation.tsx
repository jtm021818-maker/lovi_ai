'use client';

/**
 * 🎵 v84: SongRecommendation — 루나의 노래 추천 이벤트 UI
 *
 * 두 상태를 한 컴포넌트에서 처리:
 *   1. SONG_SEARCHING — "루나가 찾는 중" 진행 애니메이션 (3단계 타이머)
 *   2. SONG_RECOMMENDATION — 3곡 카드 + 유튜브 링크
 *
 * 디자인: 보라~분홍 gradient, 앨범아트 플레이스홀더, Framer Motion stagger
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SongRecommendationData, SongSearchingData } from '@/types/engine.types';

interface Props {
  event: PhaseEvent;
  disabled?: boolean;
}

const SEARCH_STEPS = [
  { at: 0, text: '🔍 찾고 있어…' },
  { at: 700, text: '📖 리뷰 훑는 중…' },
  { at: 1500, text: '💭 너한테 어울리는 거 고르는 중…' },
];

export default function SongRecommendation({ event }: Props) {
  const isSearching = event.type === 'SONG_SEARCHING';

  if (isSearching) {
    const data = event.data as unknown as SongSearchingData;
    return <SearchingCard mood={data.mood} />;
  }

  const data = event.data as unknown as SongRecommendationData;
  return <ResultCard data={data} />;
}

// ============================================================
// 검색 중 카드
// ============================================================

function SearchingCard({ mood }: { mood: string }) {
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
        background: 'linear-gradient(135deg, #f5e1ff 0%, #ffdce5 50%, #e8d4ff 100%)',
        border: '1px solid rgba(168,85,247,0.25)',
        boxShadow: '0 8px 28px rgba(168,85,247,0.15)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{
            background: 'linear-gradient(135deg, #c084fc 0%, #f472b6 100%)',
          }}
        >
          🎵
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-purple-700 tracking-wide">LUNA 가 노래 찾는 중</div>
          <div className="text-[10px] text-purple-500/80 truncate">&ldquo;{mood}&rdquo;</div>
        </div>
      </div>

      {/* 진행 단계 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.25 }}
          className="text-[13px] text-purple-900/85 font-medium"
        >
          {SEARCH_STEPS[stepIdx].text}
        </motion.div>
      </AnimatePresence>

      {/* 도트 애니메이션 */}
      <div className="mt-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-purple-400"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      {/* 푸터 */}
      <div className="mt-3 text-[10px] text-purple-400/70 flex items-center gap-1">
        <span>✨</span>
        <span>인터넷에서 실시간으로 검색 중</span>
      </div>
    </motion.div>
  );
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
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🎵</span>
          <span className="text-[11px] font-bold text-purple-700 tracking-wider">LUNA&apos;S PLAYLIST</span>
        </div>
        <p className="text-[13px] text-purple-900/90 font-medium">{data.openerMsg}</p>
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
                  <div className="mt-0.5 text-[10.5px] text-purple-500/90 line-clamp-1">
                    {song.reason}
                  </div>
                )}
              </div>
              {/* YouTube 아이콘 */}
              <div className="flex-shrink-0 text-[11px] text-purple-400">▶</div>
            </motion.a>
          ))}
        </div>
      ) : (
        <div className="px-4 pb-2 text-[11.5px] text-purple-500/80 italic">
          지금은 결과가 잘 안 나왔어 ㅠ
        </div>
      )}

      {/* 루나 코멘트 */}
      {data.lunaComment && (
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-purple-50/60 text-[11.5px] text-purple-800/90 italic text-center">
          &ldquo;{data.lunaComment}&rdquo;
        </div>
      )}

      {/* 출처 */}
      {data.sources && data.sources.length > 0 && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="text-[10px] text-purple-500/70 hover:text-purple-600 transition-colors"
          >
            {showSources ? '▼' : '▶'} 출처 {data.sources.length}개
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

      {/* ToS — Google Search Suggestions (필수 렌더링) */}
      {data.renderedContent && (
        <div
          className="px-4 pb-3 text-[10px]"
          dangerouslySetInnerHTML={{ __html: data.renderedContent }}
        />
      )}
    </motion.div>
  );
}
