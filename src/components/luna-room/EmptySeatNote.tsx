'use client';

/**
 * v104: EmptySeatNote (M3 — 진행 비례 메시지)
 *
 * 루나가 외출 중일 때 캐릭터 자리 표시.
 * 외출 진행도(0~1)에 따라 mid-trip 메시지를 회전시켜 부재의 시간을 채움.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fuzzyDurationLabel } from '@/lib/luna-shopping/shopping-engine';

interface Props {
  minutesRemaining: number;
  departedAt?: string | null;
  returnsAt?: string | null;
  isDark?: boolean;
}

const MID_TRIP_LINES: Array<{ minProgress: number; maxProgress: number; lines: string[] }> = [
  {
    minProgress: 0, maxProgress: 0.2,
    lines: [
      '막 나왔어 — 어디로 갈지 살짝 고민 중.',
      '오늘 어떤 가게 가볼까…',
      '바람이 좋네. 천천히 걸어볼게.',
    ],
  },
  {
    minProgress: 0.2, maxProgress: 0.5,
    lines: [
      '눈에 들어오는 게 있어. 한 번 더 둘러보고.',
      '잠깐 카페에 들어와 있어.',
      '뭐가 너랑 어울릴까 — 자꾸 멈춰서 보게 돼.',
      '오늘 진열장이 너 같아.',
    ],
  },
  {
    minProgress: 0.5, maxProgress: 0.8,
    lines: [
      '발견했어. 좋아할 것 같은 거.',
      '… 이거다 싶은 게 있어. 잠깐만.',
      '두 개 중에 고민 중. 너라면 어떤 걸 골랐을까.',
      '결정했어. 이제 계산만 하면 돼.',
    ],
  },
  {
    minProgress: 0.8, maxProgress: 1,
    lines: [
      '돌아가는 길. 곧 봐.',
      '거의 다 왔어 — 기다려줘.',
      '문 열고 들어갈게. 잠깐만.',
    ],
  },
];

function pickLineByProgress(progress: number): string {
  const seg = MID_TRIP_LINES.find((s) => progress >= s.minProgress && progress < s.maxProgress)
    ?? MID_TRIP_LINES[MID_TRIP_LINES.length - 1];
  // 진행도와 minute 시드로 안정적 회전
  const seed = Math.floor(progress * 100);
  return seg.lines[seed % seg.lines.length];
}

export default function EmptySeatNote({
  minutesRemaining,
  departedAt,
  returnsAt,
  isDark = false,
}: Props) {
  const fuzzy = fuzzyDurationLabel(minutesRemaining);
  const [tick, setTick] = useState(0);

  // 30초마다 mid-trip 메시지 갱신
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // 진행도 계산
  let progress = 0.5;
  if (departedAt && returnsAt) {
    const depMs = new Date(departedAt).getTime();
    const retMs = new Date(returnsAt).getTime();
    const total = retMs - depMs;
    if (total > 0) {
      progress = Math.max(0, Math.min(1, (Date.now() - depMs) / total));
    }
  }
  const midTripLine = pickLineByProgress(progress + tick * 0.0); // tick 으로 리렌더 유도

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative flex flex-col items-center justify-end"
      style={{ width: 220, height: 220 * 1.6 }}
    >
      {/* mid-trip 작은 떠다니는 텍스트 */}
      <motion.div
        key={midTripLine}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute"
        style={{ top: '12%', left: '50%', transform: 'translateX(-50%)', maxWidth: 200 }}
      >
        <div
          className="px-2.5 py-1 rounded-2xl text-center"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(212,175,55,0.25)',
            backdropFilter: 'blur(4px)',
            color: isDark ? '#fde68a' : '#7c5738',
            fontSize: 10,
            fontStyle: 'italic',
            lineHeight: 1.45,
          }}
        >
          “{midTripLine}”
        </div>
      </motion.div>

      {/* 빈 자리 그림자 */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: 110,
          height: 14,
          background: isDark
            ? 'radial-gradient(ellipse, rgba(255,255,255,0.10) 0%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(0,0,0,0.12) 0%, transparent 70%)',
        }}
      />

      {/* 의자 */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-1 select-none"
        style={{ opacity: 0.55, fontSize: 36 }}
      >
        <span aria-hidden>🪑</span>
      </div>

      {/* 흔들리는 쪽지 */}
      <motion.div
        animate={{ rotate: [-2, 2, -2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute"
        style={{
          left: '50%',
          bottom: '36%',
          transform: 'translateX(-50%) rotate(-2deg)',
        }}
      >
        <div
          className="px-3 py-2 rounded-md text-center"
          style={{
            background: '#fff8e7',
            border: '1px solid rgba(212,175,55,0.45)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontFamily: 'serif',
            color: '#5a3e2b',
            fontSize: 11,
            lineHeight: 1.5,
            minWidth: 130,
            maxWidth: 170,
          }}
        >
          <div className="text-[10px] opacity-70 mb-0.5">루나의 쪽지</div>
          <div className="font-semibold">
            나 잠깐 나갔다 올게~
            <br />
            <span className="text-[#7c5738]/80">곧 와 ❤</span>
          </div>
        </div>
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rounded-full"
          style={{ background: '#dc2626', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        />
      </motion.div>

      {/* 진행 칩 + progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="absolute flex flex-col items-center gap-1.5"
        style={{ left: '50%', bottom: 0, transform: 'translateX(-50%)' }}
      >
        <div
          className="px-3 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold"
          style={{
            background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
            color: isDark ? '#fde68a' : '#7c5738',
            backdropFilter: 'blur(6px)',
          }}
        >
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            🛍️
          </motion.span>
          <span>외출 중</span>
          <span className="opacity-50">·</span>
          <span>{fuzzy} 후 도착</span>
        </div>
        {/* 진행 바 */}
        <div
          className="rounded-full overflow-hidden"
          style={{
            width: 120,
            height: 3,
            background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
          }}
        >
          <motion.div
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, #fbbf24, #ec4899)'
                : 'linear-gradient(90deg, #f59e0b, #ec4899)',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
