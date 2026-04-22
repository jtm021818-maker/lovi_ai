'use client';

/**
 * 🔍 v85.7: BrowseSearchingLive — 대화형 브라우징 검색 중 UI
 *
 * "루나가 이곳저곳 돌며 찾는 중" 느낌.
 *   - 스테이지 텍스트 로테이션 (네이버 맵 → 블로그 → 인스타)
 *   - URL 티커 (위로 스크롤되는 가짜/실제 URL 리스트)
 *   - 돋보기 + 펄스 애니메이션
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BrowseSessionData } from '@/types/engine.types';

interface Props {
  topic: BrowseSessionData['topic'];
  topicLabel: string;
}

const TOPIC_STAGES: Record<BrowseSessionData['topic'], string[]> = {
  gift: [
    '🛍️ 선물 쇼핑몰 둘러보는 중',
    '💬 취향 맞을만한 것 추리는 중',
    '⭐ 리뷰 높은 순서로 정렬 중',
    '📦 가격대 맞는 것만 골라내는 중',
  ],
  'date-spot': [
    '🗺️ 네이버 맵 체크 중',
    '📝 블로그 후기 훑는 중',
    '📸 인스타 태그 보는 중',
    '⭐ 평점 높은 곳만 추리는 중',
  ],
  activity: [
    '🎪 체험 예약 사이트 둘러보는 중',
    '📝 후기 꼼꼼히 보는 중',
    '💸 가격대 비교 중',
    '📍 접근성 체크 중',
  ],
  movie: [
    '🎬 넷플릭스/왓챠 훑는 중',
    '⭐ 평점 + 리뷰 보는 중',
    '🎭 분위기 맞는 거 추리는 중',
    '📺 지금 볼 수 있는 것만 정리',
  ],
  anniversary: [
    '💌 기념일 이벤트 아이디어 모으는 중',
    '🎁 인기 프로그램 보는 중',
    '📝 실제 후기 읽는 중',
    '✨ 특별한 것만 골라내는 중',
  ],
  general: [
    '🔍 이것저것 둘러보는 중',
    '📝 후기 보는 중',
    '⭐ 괜찮은 것만 추리는 중',
    '✨ 정리하는 중',
  ],
};

const FAKE_URLS: Record<BrowseSessionData['topic'], string[]> = {
  gift: [
    'search.shopping.naver.com/...',
    'm.coupang.com/...',
    'ohou.se/reviews/...',
    'brand.naver.com/...',
    '29cm.co.kr/...',
  ],
  'date-spot': [
    'map.naver.com/v5/...',
    'blog.naver.com/...',
    'kakaomap.com/...',
    'instagram.com/explore/tags/...',
    'catchtable.co.kr/...',
  ],
  activity: [
    'frip.co.kr/...',
    'onoffmix.com/...',
    'naver.com/search?q=...',
    'instagram.com/explore/tags/...',
    'taling.me/...',
  ],
  movie: [
    'netflix.com/search?q=...',
    'watcha.com/...',
    'tving.com/...',
    'movie.naver.com/...',
    'rottentomatoes.com/...',
  ],
  anniversary: [
    'blog.naver.com/anniversary/...',
    'instagram.com/explore/tags/...',
    'pinterest.co.kr/...',
    'eventus.kr/...',
    'idus.com/...',
  ],
  general: [
    'google.com/search?q=...',
    'naver.com/search?q=...',
    'blog.naver.com/...',
    'instagram.com/...',
    'youtube.com/results?q=...',
  ],
};

export default function BrowseSearchingLive({ topic, topicLabel }: Props) {
  const stages = TOPIC_STAGES[topic] ?? TOPIC_STAGES.general;
  const urls = FAKE_URLS[topic] ?? FAKE_URLS.general;

  const [stageIdx, setStageIdx] = useState(0);
  const [urlTick, setUrlTick] = useState(0);

  useEffect(() => {
    const t1 = setInterval(() => setStageIdx((i) => (i + 1) % stages.length), 1100);
    const t2 = setInterval(() => setUrlTick((i) => i + 1), 380);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [stages.length]);

  // 표시할 URL 3개 (스크롤 효과)
  const visibleUrls = [
    urls[urlTick % urls.length],
    urls[(urlTick + 1) % urls.length],
    urls[(urlTick + 2) % urls.length],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-3 max-w-[94%] ml-auto mr-2 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #fffbf2 0%, #fff3e4 100%)',
        border: '1px solid rgba(245,158,11,0.32)',
        boxShadow: '0 10px 26px rgba(245,158,11,0.18)',
      }}
    >
      {/* 헤더 — 돋보기 펄스 */}
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-2.5">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-[22px]"
        >
          🔍
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold tracking-wide text-amber-600/80">
            LUNA · 둘러보는 중
          </div>
          <div className="text-[12.5px] font-bold text-[#3a2418] truncate">
            {topicLabel}
          </div>
        </div>
        {/* 3-dot */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
              className="w-1.5 h-1.5 rounded-full bg-amber-500"
            />
          ))}
        </div>
      </div>

      {/* 현재 스테이지 */}
      <div className="px-4 pb-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={stageIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="text-[13px] font-semibold text-[#6e3f12]"
          >
            {stages[stageIdx]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* URL 티커 */}
      <div
        className="mx-3 mb-3 rounded-xl px-3 py-2 overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(245,158,11,0.18)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleUrls.map((u, i) => (
            <motion.div
              key={`${urlTick}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1 - i * 0.3, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="text-[10.5px] text-[#8a5a20] truncate leading-[1.6]"
            >
              <span className="text-amber-600/60">›</span> {u}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
