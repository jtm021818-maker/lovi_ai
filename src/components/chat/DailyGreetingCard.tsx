'use client';

/**
 * 🆕 v112: 데일리 인사 카드
 *
 * 컨셉: mood + activity + whisper 한 카드로 표현. 매일/매 진입 다름.
 * - 7가지 mood 별 부드러운 그라데이션 (Pi 톤 + Not Boring Weather mood skin)
 * - typing-like 텍스트 등장 (Pi tiny pause 모방)
 * - 10초 후 살짝 collapse — 영상/Guide 에 자리 양보
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type {
  LunaMood,
  LunaActivity,
  LunaTimeBand,
  LunaWeather,
} from '@/lib/luna-life/mood';
import { ACTIVITY_LABELS } from '@/lib/luna-life/whispers';

interface Props {
  mood: LunaMood;
  activity: LunaActivity;
  whisper: string;
  timeBand: LunaTimeBand;
  weather?: LunaWeather;
  onComplete?: () => void; // 카드 보임 끝났을 때
}

// ─── mood 별 그라데이션 ──────────────────────────────────────────────
const MOOD_GRADIENTS: Record<LunaMood, string> = {
  bright:
    'linear-gradient(160deg, #FFF8DC 0%, #FFE5B4 100%)',
  warm:
    'linear-gradient(160deg, #FFF5EE 0%, #FFE4D6 100%)',
  playful:
    'linear-gradient(160deg, #FFF0F5 0%, #FFD1DC 100%)',
  wistful:
    'linear-gradient(160deg, #FFF0E5 0%, #FFE5D9 100%)',
  sleepy:
    'linear-gradient(160deg, #E8E1F4 0%, #F0E8FF 100%)',
  thoughtful:
    'linear-gradient(160deg, #EDF2F7 0%, #DDE6F0 100%)',
  peaceful:
    'linear-gradient(160deg, #F4F1FF 0%, #EDE5FF 100%)',
};

// ─── mood 별 액센트 컬러 (텍스트/별) ─────────────────────────────────
const MOOD_ACCENT: Record<LunaMood, string> = {
  bright: '#C77A1B',
  warm: '#A0612C',
  playful: '#D8488B',
  wistful: '#B05A3B',
  sleepy: '#5C4B82',
  thoughtful: '#3F546B',
  peaceful: '#7B5DBC',
};

// ─── activity 별 이모지 ──────────────────────────────────────────────
const ACTIVITY_ICON: Record<LunaActivity, string> = {
  sipping_tea: '☕',
  reading: '📖',
  drawing: '🎨',
  gazing_window: '🪟',
  cuddling_cat: '🐱',
  on_phone: '📱',
  stretching: '🙆',
  sleeping: '💤',
};

// ─── timeBand → 한글 라벨 ────────────────────────────────────────────
const TIME_LABEL: Record<LunaTimeBand, string> = {
  dawn: '새벽',
  morning: '아침',
  afternoon: '오후',
  evening: '저녁',
  night: '밤',
};

// ─── weather → 라벨/이모지 ───────────────────────────────────────────
const WEATHER_LABEL: Record<LunaWeather, { icon: string; label: string }> = {
  sunny: { icon: '☀️', label: '맑음' },
  cloudy: { icon: '☁️', label: '흐림' },
  rainy: { icon: '🌧️', label: '비' },
  snowy: { icon: '❄️', label: '눈' },
  starry: { icon: '✨', label: '별 가득' },
};

// ─── 시간 표시 (KST) ────────────────────────────────────────────────
function nowKstHourMin(): string {
  const d = new Date();
  const ms = d.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(ms);
  const h = kst.getUTCHours();
  const m = String(kst.getUTCMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${hh}:${m}`;
}

export default function DailyGreetingCard({
  mood,
  activity,
  whisper,
  timeBand,
  weather,
  onComplete,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [typedText, setTypedText] = useState('');

  // typing-like 텍스트 등장 (한 글자씩, ~50ms)
  useEffect(() => {
    let i = 0;
    let cancelled = false;
    // 첫 호출이 setInterval 콜백 안에서 발생 — useEffect sync setState 회피
    const interval = setInterval(() => {
      if (cancelled) return;
      setTypedText(whisper.slice(0, i));
      if (i >= whisper.length) {
        clearInterval(interval);
        return;
      }
      i += 1;
    }, 55);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [whisper]);

  // 10초 후 살짝 collapse
  useEffect(() => {
    const t = setTimeout(() => {
      setCollapsed(true);
      onComplete?.();
    }, 10000);
    return () => clearTimeout(t);
  }, [onComplete]);

  const accent = MOOD_ACCENT[mood];
  const gradient = MOOD_GRADIENTS[mood];
  const activityLabel = ACTIVITY_LABELS[activity];
  const timeLabel = TIME_LABEL[timeBand];
  const wInfo = weather ? WEATHER_LABEL[weather] : null;
  const time = nowKstHourMin();

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, rotate: -0.6 }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: -0.4,
        scale: collapsed ? 0.93 : 1,
      }}
      transition={{
        duration: 0.55,
        type: 'spring',
        damping: 18,
        stiffness: 130,
      }}
      className="mx-3 mb-3"
    >
      <div
        className="relative rounded-[22px] overflow-hidden"
        style={{
          background: gradient,
          border: `1px solid ${accent}33`,
          boxShadow: `0 6px 22px ${accent}22, inset 0 0 30px rgba(255,255,255,0.35)`,
        }}
      >
        {/* 살짝 종이 텍스처 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent 0 24px, rgba(0,0,0,0.012) 24px 25px)',
          }}
        />

        {/* 상단 — 루나 아이콘 + mood + 활동 */}
        <div className="relative px-4 pt-3.5 pb-1 flex items-center gap-2.5">
          <div
            className="w-9 h-9 flex-shrink-0 overflow-hidden bg-white/90"
            style={{
              borderRadius: '50% 42% 58% 48% / 58% 50% 42% 52%',
              border: `1.5px solid ${accent}66`,
              boxShadow: `0 2px 6px ${accent}22`,
            }}
          >
            <img
              src="/luna_fox_transparent.webp"
              alt="루나"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[13px] leading-tight"
              style={{
                color: accent,
                fontFamily:
                  'var(--font-gaegu), Gaegu, "Nanum Pen Script", cursive',
                fontWeight: 700,
              }}
            >
              루나 · {mood}
            </div>
            <div className="text-[10.5px] mt-0.5" style={{ color: `${accent}cc` }}>
              {ACTIVITY_ICON[activity]} {activityLabel}
            </div>
          </div>
          {/* 별 ✦ — 천천히 펄스 */}
          <motion.span
            animate={{ rotate: [0, 10, -6, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ color: accent }}
            className="text-[14px] drop-shadow-sm"
          >
            ✦
          </motion.span>
        </div>

        {/* 구분선 */}
        <div
          className="mx-4 my-1 h-px"
          style={{ background: `${accent}22` }}
        />

        {/* whisper — typing 등장 */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              key="whisper"
              initial={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="px-4 pt-1 pb-3"
            >
              <p
                className="text-[16px] leading-[1.6] whitespace-pre-line"
                style={{
                  color: '#4b3418',
                  fontFamily:
                    'var(--font-gaegu), Gaegu, "Nanum Pen Script", cursive',
                  letterSpacing: '-0.2px',
                  fontWeight: 400,
                }}
              >
                {'“'}{typedText}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block ml-[1px]"
                  style={{ color: accent }}
                >
                  |
                </motion.span>
                {'”'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 하단 메타 — 오늘 / 시간대 / 날씨 */}
        <div
          className="px-4 pb-2.5 pt-1 text-[10px] flex items-center gap-1.5"
          style={{ color: `${accent}aa` }}
        >
          <span>오늘</span>
          <span>·</span>
          <span>
            {timeLabel} {time}
          </span>
          {wInfo && (
            <>
              <span>·</span>
              <span>
                {wInfo.icon} {wInfo.label}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
