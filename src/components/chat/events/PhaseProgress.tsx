import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConversationPhaseV2 } from '@/types/engine.types';
import type { PersonaMode } from '@/types/persona.types';

// ============================================================================
// 🦊 루나 상담 여정 — 커스텀 SVG 아이콘 & 데이터
// ============================================================================

/** 여우 귀 아이콘 (HOOK: 이야기 듣기) */
const FoxEarIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 여우 귀 */}
    <path d="M10 18 L6 4 L16 12 Z M30 18 L34 4 L24 12 Z"
      fill={active ? '#fda4af' : past ? '#fecdd3' : '#e2e8f0'}
      stroke={active ? '#be123c' : past ? '#fb7185' : '#cbd5e1'}
      strokeWidth="1.5" strokeLinejoin="round" />
    {/* 얼굴 */}
    <circle cx="20" cy="22" r="11"
      fill={active ? '#fff1f2' : past ? '#fef2f2' : '#f8fafc'}
      stroke={active ? '#be123c' : past ? '#fb7185' : '#cbd5e1'}
      strokeWidth="1.5" />
    {/* 눈 */}
    <circle cx="16" cy="21" r="1.5" fill={active ? '#be123c' : past ? '#fb7185' : '#94a3b8'} />
    <circle cx="24" cy="21" r="1.5" fill={active ? '#be123c' : past ? '#fb7185' : '#94a3b8'} />
    {/* 입 */}
    <path d="M18 26 Q20 28 22 26" fill="none"
      stroke={active ? '#be123c' : past ? '#fb7185' : '#94a3b8'} strokeWidth="1.2" strokeLinecap="round" />
    {/* 코 */}
    <circle cx="20" cy="24" r="1" fill={active ? '#fb7185' : past ? '#fda4af' : '#cbd5e1'} />
  </svg>
);

/** 하트 돋보기 아이콘 (MIRROR: 마음 읽기) */
const HeartLensIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 돋보기 손잡이 */}
    <line x1="28" y1="28" x2="36" y2="36"
      stroke={active ? '#a855f7' : past ? '#c084fc' : '#cbd5e1'}
      strokeWidth="3" strokeLinecap="round" />
    {/* 렌즈 원 */}
    <circle cx="20" cy="20" r="13"
      fill={active ? '#faf5ff' : past ? '#fdf4ff' : '#f8fafc'}
      stroke={active ? '#a855f7' : past ? '#c084fc' : '#cbd5e1'}
      strokeWidth="1.5" />
    {/* 하트 */}
    <path d="M20 27 C14 22 11 17 14 14 C17 11 20 14 20 14 C20 14 23 11 26 14 C29 17 26 22 20 27 Z"
      fill={active ? '#f0abfc' : past ? '#e9d5ff' : '#e2e8f0'}
      stroke={active ? '#a855f7' : past ? '#c084fc' : '#cbd5e1'}
      strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

/** 🆕 v38: 작전 보드 + 불꽃 아이콘 (BRIDGE: 같이 준비)
 * 메시지 초안/롤플레이/연참 모드 실행 단계를 상징
 * 클립보드(체크리스트) + 상단 불꽃 = "같이 준비하는 느낌" */
const StrategyBoardIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 상단 불꽃 (작전 에너지) */}
    <path d="M20 3 C18 6 16 8 17 11 C15 10 14 11 15 13 C16 12 18 13 18 15 C18 12 21 11 20 8 C22 9 23 7 22 5 C20 7 20 5 20 3 Z"
      fill={active ? '#fb923c' : past ? '#fed7aa' : '#e2e8f0'}
      stroke={active ? '#ea580c' : past ? '#fb923c' : '#cbd5e1'}
      strokeWidth="1" strokeLinejoin="round" />
    {/* 클립보드 상단 집게 */}
    <rect x="16" y="11" width="8" height="3" rx="0.8"
      fill={active ? '#fb923c' : past ? '#fed7aa' : '#cbd5e1'}
      stroke={active ? '#c2410c' : past ? '#ea580c' : '#94a3b8'}
      strokeWidth="0.8" />
    {/* 클립보드 본체 */}
    <rect x="9" y="13" width="22" height="23" rx="2.5"
      fill={active ? '#fff7ed' : past ? '#fffbeb' : '#f8fafc'}
      stroke={active ? '#ea580c' : past ? '#fb923c' : '#cbd5e1'}
      strokeWidth="1.5" />
    {/* 작전 체크리스트 라인 1 (큰 점 + 선) */}
    <circle cx="13.5" cy="19" r="1.3"
      fill={active ? '#fb923c' : past ? '#fed7aa' : '#e2e8f0'}
      stroke={active ? '#ea580c' : past ? '#fb923c' : '#cbd5e1'}
      strokeWidth="0.6" />
    <line x1="16" y1="19" x2="27" y2="19"
      stroke={active ? '#fb923c' : past ? '#fed7aa' : '#e2e8f0'}
      strokeWidth="1.3" strokeLinecap="round" />
    {/* 체크리스트 라인 2 */}
    <circle cx="13.5" cy="24" r="1.3"
      fill={active ? '#f97316' : past ? '#fdba74' : '#e2e8f0'}
      stroke={active ? '#c2410c' : past ? '#ea580c' : '#cbd5e1'}
      strokeWidth="0.6" />
    <line x1="16" y1="24" x2="25" y2="24"
      stroke={active ? '#fdba74' : past ? '#fed7aa' : '#e2e8f0'}
      strokeWidth="1.3" strokeLinecap="round" />
    {/* 체크리스트 라인 3 (완료 체크) */}
    <path d="M12.5 29 L14 30.5 L16 28"
      fill="none"
      stroke={active ? '#ea580c' : past ? '#fb923c' : '#cbd5e1'}
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="18" y1="29" x2="27" y2="29"
      stroke={active ? '#fdba74' : past ? '#fed7aa' : '#e2e8f0'}
      strokeWidth="1.3" strokeLinecap="round" />
    {/* 작은 반짝이 (활성화 시 에너지 효과) */}
    <circle cx="32" cy="16" r="0.8"
      fill={active ? '#fbbf24' : 'transparent'}
      opacity={active ? 0.9 : 0} />
    <circle cx="7" cy="22" r="0.6"
      fill={active ? '#fbbf24' : 'transparent'}
      opacity={active ? 0.8 : 0} />
  </svg>
);

/** 새싹 아이콘 (SOLVE: 처방전 준비) */
const SproutIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 줄기 */}
    <path d="M20 34 Q20 24 20 20"
      fill="none" stroke={active ? '#22c55e' : past ? '#86efac' : '#cbd5e1'}
      strokeWidth="2.5" strokeLinecap="round" />
    {/* 왼쪽 잎 */}
    <path d="M20 22 C14 20 10 14 14 10 C18 6 20 14 20 22 Z"
      fill={active ? '#bbf7d0' : past ? '#dcfce7' : '#f1f5f9'}
      stroke={active ? '#22c55e' : past ? '#86efac' : '#cbd5e1'}
      strokeWidth="1.2" />
    {/* 오른쪽 잎 */}
    <path d="M20 18 C26 16 30 10 26 7 C22 4 20 12 20 18 Z"
      fill={active ? '#86efac' : past ? '#bbf7d0' : '#f1f5f9'}
      stroke={active ? '#22c55e' : past ? '#86efac' : '#cbd5e1'}
      strokeWidth="1.2" />
    {/* 잎맥 */}
    <path d="M20 22 Q16 16 15 12 M20 18 Q24 12 25 9"
      fill="none" stroke={active ? '#22c55e' : past ? '#86efac' : '#e2e8f0'}
      strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
  </svg>
);

/** 🆕 v105: 채팅 말풍선 아이콘 (DAILY_CHAT: 이야기 듣기 - 가벼운 진입) */
const ChatBubbleIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 말풍선 본체 */}
    <path d="M8 12 Q8 6 14 6 L26 6 Q32 6 32 12 L32 22 Q32 28 26 28 L18 28 L12 33 L13 28 L14 28 Q8 28 8 22 Z"
      fill={active ? '#fce7f3' : past ? '#fdf2f8' : '#f8fafc'}
      stroke={active ? '#ec4899' : past ? '#f9a8d4' : '#cbd5e1'}
      strokeWidth="1.5" strokeLinejoin="round" />
    {/* 도트 3개 */}
    <circle cx="14" cy="17" r="1.5" fill={active ? '#ec4899' : past ? '#f9a8d4' : '#94a3b8'} />
    <circle cx="20" cy="17" r="1.5" fill={active ? '#ec4899' : past ? '#f9a8d4' : '#94a3b8'} />
    <circle cx="26" cy="17" r="1.5" fill={active ? '#ec4899' : past ? '#f9a8d4' : '#94a3b8'} />
  </svg>
);

/** 🆕 v105: 꽃잎 채팅 아이콘 (DAILY_CHAT: 수다 중) */
const FlowerChatIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 5장 꽃잎 */}
    {[0, 72, 144, 216, 288].map((deg) => (
      <ellipse
        key={deg}
        cx="20" cy="11" rx="4" ry="7"
        fill={active ? '#fda4af' : past ? '#fecdd3' : '#e2e8f0'}
        stroke={active ? '#e11d48' : past ? '#f43f5e' : '#cbd5e1'}
        strokeWidth="1" strokeLinejoin="round"
        transform={`rotate(${deg} 20 20)`}
      />
    ))}
    {/* 꽃 중심 */}
    <circle cx="20" cy="20" r="3"
      fill={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'}
      stroke={active ? '#f59e0b' : past ? '#fbbf24' : '#cbd5e1'}
      strokeWidth="0.8" />
    {/* 작은 잎 */}
    <path d="M30 32 Q34 28 32 24 Q28 28 30 32 Z"
      fill={active ? '#86efac' : past ? '#bbf7d0' : '#e2e8f0'}
      stroke={active ? '#22c55e' : past ? '#86efac' : '#cbd5e1'}
      strokeWidth="0.8" />
  </svg>
);

/** 반짝이 별 아이콘 (EMPOWER: 변화 응원) */
const SparkleIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 큰 별 */}
    <path d="M20 4 L23 15 L34 15 L25 22 L28 33 L20 26 L12 33 L15 22 L6 15 L17 15 Z"
      fill={active ? '#fef08a' : past ? '#fef9c3' : '#f1f5f9'}
      stroke={active ? '#eab308' : past ? '#facc15' : '#cbd5e1'}
      strokeWidth="1.2" strokeLinejoin="round" />
    {/* 작은 반짝이 */}
    <circle cx="32" cy="8" r="1.5" fill={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'} />
    <circle cx="8" cy="10" r="1" fill={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'} />
    <circle cx="34" cy="30" r="1" fill={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'} />
  </svg>
);

// ============================================================================
// 🐱 타로냥 전용 SVG 아이콘 (4단계)
// ============================================================================

/** 고양이 귀 아이콘 (HOOK: 이야기 듣기) */
const CatEarIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    <path d="M10 20 L7 5 L16 14 Z M30 20 L33 5 L24 14 Z"
      fill={active ? '#c4b5fd' : past ? '#ddd6fe' : '#e2e8f0'}
      stroke={active ? '#7c3aed' : past ? '#a78bfa' : '#cbd5e1'}
      strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="20" cy="23" r="11"
      fill={active ? '#f5f3ff' : past ? '#faf5ff' : '#f8fafc'}
      stroke={active ? '#7c3aed' : past ? '#a78bfa' : '#cbd5e1'}
      strokeWidth="1.5" />
    <circle cx="16" cy="22" r="1.5" fill={active ? '#7c3aed' : past ? '#a78bfa' : '#94a3b8'} />
    <circle cx="24" cy="22" r="1.5" fill={active ? '#7c3aed' : past ? '#a78bfa' : '#94a3b8'} />
    <path d="M18 27 Q20 29 22 27" fill="none"
      stroke={active ? '#7c3aed' : past ? '#a78bfa' : '#94a3b8'} strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10" y1="22" x2="4" y2="20" stroke={active ? '#a78bfa' : past ? '#c4b5fd' : '#cbd5e1'} strokeWidth="0.8" />
    <line x1="10" y1="24" x2="4" y2="24" stroke={active ? '#a78bfa' : past ? '#c4b5fd' : '#cbd5e1'} strokeWidth="0.8" />
    <line x1="30" y1="22" x2="36" y2="20" stroke={active ? '#a78bfa' : past ? '#c4b5fd' : '#cbd5e1'} strokeWidth="0.8" />
    <line x1="30" y1="24" x2="36" y2="24" stroke={active ? '#a78bfa' : past ? '#c4b5fd' : '#cbd5e1'} strokeWidth="0.8" />
  </svg>
);

/** 타로 카드 아이콘 (BRIDGE: 카드 리딩) */
const TarotCardIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    <rect x="10" y="4" width="20" height="32" rx="3"
      fill={active ? '#faf5ff' : past ? '#fdf4ff' : '#f8fafc'}
      stroke={active ? '#7c3aed' : past ? '#a78bfa' : '#cbd5e1'}
      strokeWidth="1.5" />
    <rect x="13" y="7" width="14" height="26" rx="1.5"
      fill="none" stroke={active ? '#c4b5fd' : past ? '#ddd6fe' : '#e2e8f0'}
      strokeWidth="0.8" />
    <path d="M20 14 L21.5 18 L26 18 L22.5 21 L24 25 L20 22.5 L16 25 L17.5 21 L14 18 L18.5 18 Z"
      fill={active ? '#a78bfa' : past ? '#c4b5fd' : '#cbd5e1'} />
    <circle cx="16" cy="10" r="1" fill={active ? '#d4af37' : past ? '#e9d5ff' : '#e2e8f0'} />
    <circle cx="24" cy="30" r="1" fill={active ? '#d4af37' : past ? '#e9d5ff' : '#e2e8f0'} />
  </svg>
);

/** 수정구슬+눈 아이콘 (SOLVE: 카드 해석) */
const TarotInsightIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    <circle cx="20" cy="18" r="13"
      fill={active ? '#f5f3ff' : past ? '#faf5ff' : '#f8fafc'}
      stroke={active ? '#7c3aed' : past ? '#a78bfa' : '#cbd5e1'}
      strokeWidth="1.5" />
    <ellipse cx="14" cy="13" rx="3" ry="2" fill={active ? '#c4b5fd' : past ? '#ddd6fe' : '#e2e8f0'} opacity="0.7" />
    <circle cx="20" cy="18" r="4" fill="none"
      stroke={active ? '#d4af37' : past ? '#c4b5fd' : '#cbd5e1'} strokeWidth="1.5" />
    <circle cx="20" cy="18" r="1.5" fill={active ? '#d4af37' : past ? '#c4b5fd' : '#cbd5e1'} />
    <path d="M13 32 L27 32 L24 28 L16 28 Z"
      fill={active ? '#ede9fe' : past ? '#f3e8ff' : '#f1f5f9'}
      stroke={active ? '#7c3aed' : past ? '#a78bfa' : '#cbd5e1'}
      strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

/** 달+별 아이콘 (EMPOWER: 카드 응원) */
const MoonStarIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    <path d="M24 8 C16 8 10 14 10 22 C10 30 16 36 24 36 C18 33 14 27 14 22 C14 17 18 11 24 8 Z"
      fill={active ? '#e9d5ff' : past ? '#f3e8ff' : '#f1f5f9'}
      stroke={active ? '#7c3aed' : past ? '#a78bfa' : '#cbd5e1'}
      strokeWidth="1.5" />
    <path d="M30 10 L31 13 L34 13 L31.5 15 L32.5 18 L30 16 L27.5 18 L28.5 15 L26 13 L29 13 Z"
      fill={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'} />
    <circle cx="33" cy="24" r="1.2" fill={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'} />
    <circle cx="28" cy="28" r="0.8" fill={active ? '#d4af37' : past ? '#fde68a' : '#e2e8f0'} />
  </svg>
);

// ============================================================================
// 📊 단계 데이터 정의
// ============================================================================

interface PhaseStep {
  id: ConversationPhaseV2;
  label: string;
  statusText: string;
  Icon: React.FC<{ active: boolean; past: boolean }>;
}

// 🆕 v38: BRIDGE는 모드 실행 단계 (메시지 초안/롤플레이/연참/커스텀)
//          SOLVE는 "실행 계획 확정" (모드 끝난 후 최종 커밋)
const LUNA_STEPS: PhaseStep[] = [
  { id: 'HOOK',    label: '이야기 듣기',  statusText: '이야기 듣는 중 🦊',         Icon: FoxEarIcon },
  { id: 'MIRROR',  label: '마음 읽기',    statusText: '마음을 읽는 중 💕',         Icon: HeartLensIcon },
  { id: 'BRIDGE',  label: '같이 준비',    statusText: '같이 준비하는 중 🔥',       Icon: StrategyBoardIcon },
  { id: 'SOLVE',   label: '실행 계획',    statusText: '실행 계획 정리 중 🌿',      Icon: SproutIcon },
  { id: 'EMPOWER', label: '변화 응원',    statusText: '응원 메시지 준비 중 ✨',    Icon: SparkleIcon }
];

const TAROT_STEPS: PhaseStep[] = [
  { id: 'HOOK',    label: '이야기 듣기',  statusText: '타로냥이 듣고 있어 🐱',    Icon: CatEarIcon },
  { id: 'BRIDGE',  label: '카드 리딩',    statusText: '카드를 펼치는 중 🃏',      Icon: TarotCardIcon },
  { id: 'SOLVE',   label: '카드 해석',    statusText: '카드가 말하는 중 🔮',      Icon: TarotInsightIcon },
  { id: 'EMPOWER', label: '카드 응원',    statusText: '카드의 메시지 정리 중 ✨',  Icon: MoonStarIcon },
];

// ============================================================================
// 🎬 타이핑 효과 훅
// ============================================================================
function useTypewriter(text: string, speed = 80) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

// ============================================================================
// 🧩 메인 컴포넌트
// ============================================================================

interface PhaseProgressProps {
  currentPhase: ConversationPhaseV2 | null;
  progress: number;
  persona?: PersonaMode;
  lunaThinking?: string;
  understandingLevel?: number;
}

// ============================================================================
// 🆕 v105: BranchedTrack — HOOK 단계 Y자 분기 시각화
// 위쪽 path = 💕 상담 흐름 / 아래쪽 path = 🍃 일상 수다
// 두 갈래로 갈라지는 SVG 곡선 + 분기점 펄스 글로우
// ============================================================================

function BranchedTrack({
  lunaThinking,
  persona,
}: { lunaThinking?: string; persona: PersonaMode }) {
  const displayText = lunaThinking || (persona === 'tarot' ? '카드 펼치는 중 🐱' : '이야기 듣는 중 🦊');
  const typedStatus = useTypewriter(displayText, 70);

  return (
    <div className="w-full sticky top-[60px] z-10">
      {/* 상단 그라디언트 라인 (3색 — 분기 암시) */}
      <div className="h-[1px] bg-gradient-to-r from-rose-200/60 via-pink-300/40 via-50% to-amber-200/60" />

      <div className="relative bg-gradient-to-br from-rose-50/85 via-white/90 to-amber-50/85 border-b border-pink-100/40 shadow-[0_4px_20px_rgba(236,72,153,0.06)] backdrop-blur-xl px-3 py-3 overflow-hidden">

        {/* 떠다니는 작은 입자 (분위기) */}
        {[
          { x: '88%', y: '20%', delay: 0 },
          { x: '70%', y: '60%', delay: 1.2 },
          { x: '95%', y: '50%', delay: 2.4 },
        ].map((p, i) => (
          <motion.span
            key={i}
            className="absolute text-pink-300/40 select-none pointer-events-none text-[8px]"
            style={{ left: p.x, top: p.y }}
            animate={{ opacity: [0.2, 0.7, 0.2], scale: [1, 1.4, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: p.delay }}
          >
            ✦
          </motion.span>
        ))}

        {/* 분기 SVG */}
        <div className="relative" style={{ height: 72 }}>
          <svg
            viewBox="0 0 400 80"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              {/* 위쪽 상담 그라디언트 (핑크 → 바이올렛) */}
              <linearGradient id="counselGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f9a8d4" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.55" />
              </linearGradient>
              {/* 아래쪽 일상 그라디언트 (핑크 → 앰버) */}
              <linearGradient id="casualGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f9a8d4" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.55" />
              </linearGradient>
              {/* 분기점 글로우 */}
              <radialGradient id="branchGlow">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 위쪽 path (상담) — HOOK 원에서 위로 갈라지는 부드러운 곡선 */}
            <motion.path
              d="M 60 40 Q 95 40 115 22 L 380 22"
              stroke="url(#counselGrad)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="5,4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
            {/* 위쪽 path 끝 화살촉 */}
            <motion.polyline
              points="372,17 380,22 372,27"
              stroke="#c084fc"
              strokeOpacity="0.55"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            />

            {/* 아래쪽 path (일상) — HOOK 원에서 아래로 갈라지는 곡선 */}
            <motion.path
              d="M 60 40 Q 95 40 115 58 L 380 58"
              stroke="url(#casualGrad)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="5,4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
            />
            <motion.polyline
              points="372,53 380,58 372,63"
              stroke="#fbbf24"
              strokeOpacity="0.55"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
            />

            {/* 분기점 글로우 (펄스) */}
            <motion.circle
              cx="100"
              cy="40"
              fill="url(#branchGlow)"
              animate={{ r: [12, 18, 12], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* 분기점 코어 */}
            <motion.circle
              cx="100"
              cy="40"
              r="4"
              fill="#fbbf24"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* 분기점에서 위/아래로 작은 별 입자 */}
            {[
              { dx: 14, dy: -18, delay: 0.4 },
              { dx: 24, dy: 0, delay: 1.0 },
              { dx: 14, dy: 18, delay: 1.6 },
            ].map((p, i) => (
              <motion.circle
                key={i}
                cx="100"
                cy="40"
                r="1.6"
                fill="#fbbf24"
                initial={{ opacity: 0 }}
                animate={{
                  cx: [100, 100 + p.dx],
                  cy: [40, 40 + p.dy],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 1.6, delay: p.delay, repeat: Infinity }}
              />
            ))}
          </svg>

          {/* HOOK 큰 원 (좌측 고정) */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14 }}
            className="absolute"
            style={{ left: '2%', top: '50%', transform: 'translateY(-50%)' }}
          >
            <div className="relative">
              {/* 글로우 링 */}
              <motion.div
                className="absolute inset-[-4px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(244,114,182,0.4), transparent 70%)',
                }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* HOOK 아이콘 */}
              <div className="relative w-12 h-12 rounded-full bg-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] flex items-center justify-center p-2 ring-2 ring-pink-400/50">
                {persona === 'tarot' ? (
                  <CatEarIcon active={true} past={false} />
                ) : (
                  <FoxEarIcon active={true} past={false} />
                )}
              </div>
            </div>
          </motion.div>

          {/* 위쪽 라벨 — 상담 흐름 */}
          <motion.div
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="absolute right-2 top-[2px] flex items-center gap-1.5"
          >
            <span className="text-[12px]">💕</span>
            <motion.span
              animate={{ opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="text-[10px] font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent whitespace-nowrap"
            >
              상담 흐름
            </motion.span>
            <span className="text-[10px] text-violet-400/60">↗</span>
          </motion.div>

          {/* 아래쪽 라벨 — 일상 수다 */}
          <motion.div
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="absolute right-2 bottom-[6px] flex items-center gap-1.5"
          >
            <span className="text-[12px]">🍃</span>
            <motion.span
              animate={{ opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: 0.5 }}
              className="text-[10px] font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-amber-500 bg-clip-text text-transparent whitespace-nowrap"
            >
              일상 수다
            </motion.span>
            <span className="text-[10px] text-amber-400/60">↘</span>
          </motion.div>

          {/* 분기점 위에 "분기 중" 미니 라벨 */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8 }}
            className="absolute"
            style={{ left: '24.5%', top: '50%', transform: 'translate(-50%, 6px)' }}
          >
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="text-[8px] italic font-bold text-amber-600 whitespace-nowrap"
            >
              ✨ 분기 중
            </motion.span>
          </motion.div>

          {/* HOOK 라벨 (왼쪽 하단) */}
          <p
            className="absolute text-[9px] font-bold text-pink-600 whitespace-nowrap"
            style={{ left: '4%', bottom: -2 }}
          >
            이야기 듣기
          </p>
        </div>

        {/* 상태 텍스트 */}
        <div className="text-center h-4 mt-1">
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-[10px] font-semibold tracking-tight bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 bg-clip-text text-transparent"
          >
            {typedStatus}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block ml-0.5 w-[1px] h-[10px] bg-pink-300 align-middle"
            />
          </motion.span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 🆕 v105: DailyChatTrack — 일상 대화 모드 전용 트랙 (2단계, 가벼운 톤)
// ============================================================================

function DailyChatTrack({ lunaThinking }: { lunaThinking?: string }) {
  const displayText = lunaThinking || '가볍게 얘기 중 🍃';
  const typedStatus = useTypewriter(displayText, 70);

  return (
    <div className="w-full sticky top-[60px] z-10">
      <div className="h-[1px] bg-gradient-to-r from-pink-200/60 via-rose-300/40 to-amber-200/60" />
      <div className="bg-gradient-to-r from-pink-50/80 via-white/90 to-amber-50/80 border-b border-pink-100/40 shadow-[0_4px_20px_rgba(244,114,182,0.06)] backdrop-blur-xl px-2 py-3">
        <div className="flex items-start w-full px-1 mb-1.5 relative">
          {/* 진행선 배경 */}
          <div className="absolute top-[14px] h-[3px] bg-pink-50/80 z-0 rounded-full" style={{ left: '25%', width: '50%' }} />
          {/* 진행선 활성 */}
          <motion.div
            className="absolute top-[14px] h-[3px] bg-gradient-to-r from-pink-300 via-rose-300 to-amber-300 z-[1] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '50%' }}
            style={{ left: '25%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          >
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-rose-400"
              animate={{
                boxShadow: ['0 0 4px 2px rgba(244,114,182,0.4)', '0 0 8px 4px rgba(244,114,182,0.6)', '0 0 4px 2px rgba(244,114,182,0.4)'],
                scale: [1, 1.3, 1],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* 1단계: 이야기 듣기 (완료) */}
          <div className="relative z-10 flex flex-col items-center" style={{ width: '50%' }}>
            <div className="relative">
              <motion.div className="w-8 h-8 rounded-full flex items-center justify-center p-1 bg-rose-50 shadow-sm">
                <ChatBubbleIcon active={false} past={true} />
              </motion.div>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-400 rounded-full flex items-center justify-center z-30 shadow-sm"
              >
                <svg viewBox="0 0 12 12" className="w-2 h-2">
                  <path d="M2 6 L5 9 L10 3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            </div>
            <div className="text-center mt-1.5 w-full">
              <span className="text-[9px] font-bold block whitespace-nowrap text-rose-400">이야기 듣기</span>
            </div>
          </div>

          {/* 2단계: 수다 중 (현재) */}
          <div className="relative z-10 flex flex-col items-center" style={{ width: '50%' }}>
            <div className="relative">
              <motion.svg viewBox="0 0 44 44" className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] z-20">
                <motion.circle
                  cx="22" cy="22" r="20"
                  fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeDasharray="0 1"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </motion.svg>
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-8 h-8 rounded-full flex items-center justify-center p-1 bg-white/70 backdrop-blur-sm shadow-[0_2px_12px_rgba(236,72,153,0.25)] scale-110"
              >
                <FlowerChatIcon active={true} past={false} />
              </motion.div>
            </div>
            <div className="text-center mt-1.5 w-full">
              <span className="text-[9px] font-bold block whitespace-nowrap text-pink-600">수다 중</span>
            </div>
          </div>

          {/* 분기 힌트 */}
          <div className="absolute right-[2%] top-[8px] flex flex-col items-center opacity-30 pointer-events-none">
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="text-[8px] text-slate-400 italic"
            >
              ↗ 깊은 얘기?
            </motion.div>
          </div>
        </div>

        {/* 상태 문구 */}
        <div className="text-center h-4">
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] font-semibold text-pink-400/80 tracking-tight"
          >
            {typedStatus}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block ml-0.5 w-[1px] h-[10px] bg-pink-300 align-middle"
            />
          </motion.span>
        </div>
      </div>
    </div>
  );
}

export default function PhaseProgress({ currentPhase, progress, persona = 'luna', lunaThinking, understandingLevel }: PhaseProgressProps) {
  if (!currentPhase) return null;

  // 🆕 v105: HOOK — Y자 분기 시각화 (두 갈래 path)
  if (currentPhase === 'HOOK') {
    return <BranchedTrack lunaThinking={lunaThinking} persona={persona} />;
  }
  // 🆕 v105: DAILY_CHAT — 일상 수다 모드 트랙
  if (currentPhase === 'DAILY_CHAT') {
    return <DailyChatTrack lunaThinking={lunaThinking} />;
  }

  const steps = persona === 'tarot' ? TAROT_STEPS : LUNA_STEPS;
  const currentIndex = steps.findIndex(p => p.id === currentPhase);
  // 타로냥: MIRROR phase → HOOK으로 매핑 (MIRROR 스킵하므로)
  const adjustedIndex = currentIndex === -1 && persona === 'tarot' && currentPhase === 'MIRROR'
    ? steps.findIndex(p => p.id === 'HOOK')
    : currentIndex;
  const idx = adjustedIndex === -1 ? 0 : adjustedIndex;

  const currentStep = steps[idx];
  // 🆕 ACE v4: lunaThinking이 있으면 AI 생각을 표시, 없으면 기존 statusText
  const displayText = (persona !== 'tarot' && lunaThinking) ? lunaThinking : currentStep.statusText;
  const typedStatus = useTypewriter(displayText, 70);

  // 🆕 ACE v4.1: 아이콘 개수에 따라 유동적으로 시작 오프셋과 전체 너비 계산 (justify-between 대응)
  const iconCount = steps.length;
  const slotWidth = 100 / iconCount; // 한 슬롯의 너비 (예: 5단계면 20%)
  const startOffset = slotWidth / 2; // 첫 아이콘의 중심점 (예: 10%)
  const barRange = 100 - slotWidth;  // 첫 아이콘 중심 ~ 마지막 아이콘 중심 거리 (예: 80%)

  const basePercent = (idx / (iconCount - 1)) * 100;
  const nextPercent = idx < iconCount - 1 ? ((idx + 1) / (iconCount - 1)) * 100 : basePercent;
  
  const intraStepProgress = (persona !== 'tarot' && understandingLevel !== undefined)
    ? (understandingLevel / 100)
    : (progress / 100);

  const totalPercent = Math.min(100, Math.max(0, basePercent + (nextPercent - basePercent) * intraStepProgress));

  return (
    <div className="w-full sticky top-[60px] z-10">
      {/* 상단 프리미엄 그라디언트 라인 */}
      <div className={`h-[1px] bg-gradient-to-r ${persona === 'tarot' ? 'from-violet-200/60 via-purple-300/40 to-indigo-200/60' : 'from-rose-200/60 via-pink-300/40 to-violet-200/60'}`} />

      <div className={`bg-gradient-to-r ${persona === 'tarot' ? 'from-violet-50/80 via-white/90 to-indigo-50/80 border-b border-violet-100/40 shadow-[0_4px_20px_rgba(124,58,237,0.06)]' : 'from-rose-50/80 via-white/90 to-violet-50/80 border-b border-pink-100/40 shadow-[0_4px_20px_rgba(236,72,153,0.06)]'} backdrop-blur-xl px-2 py-3`}>
        
        {/* 5단계 스텝퍼 영역 */}
        <div className="flex justify-between items-start w-full px-1 mb-1.5 relative">
          
          {/* 진행선 배경 (비활성) */}
          <div 
            className={`absolute top-[14px] h-[3px] ${persona === 'tarot' ? 'bg-violet-50/80' : 'bg-pink-50/80'} z-0 rounded-full`}
            style={{ left: `${startOffset}%`, width: `${barRange}%` }}
          />

          {/* 진행선 활성 (파스텔 그라디언트 + 현재 위치 글로우 점) */}
          <motion.div
            className={`absolute top-[14px] h-[3px] bg-gradient-to-r ${persona === 'tarot' ? 'from-violet-300 via-purple-400 to-indigo-400' : 'from-rose-300 via-pink-400 to-violet-400'} z-[1] rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${totalPercent * (barRange / 100)}%` }}
            style={{ left: `${startOffset}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          >
            {/* 진행 끝 글로우 dot */}
            <motion.div
              className={`absolute right-0 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full ${persona === 'tarot' ? 'bg-violet-400' : 'bg-pink-400'}`}
              animate={{
                boxShadow: persona === 'tarot'
                  ? ['0 0 4px 2px rgba(139,92,246,0.4)', '0 0 8px 4px rgba(139,92,246,0.6)', '0 0 4px 2px rgba(139,92,246,0.4)']
                  : ['0 0 4px 2px rgba(244,114,182,0.4)', '0 0 8px 4px rgba(244,114,182,0.6)', '0 0 4px 2px rgba(244,114,182,0.4)'],
                scale: [1, 1.3, 1]
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          {steps.map((step, idx) => {
            const isPast = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;
            const StepIcon = step.Icon;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                
                {/* 아이콘 컨테이너 */}
                <div className="relative">
                  {/* 현재 단계: pathLength 드로잉 링 */}
                  {isCurrent && (
                    <motion.svg
                      viewBox="0 0 44 44"
                      className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] z-20"
                    >
                      <motion.circle
                        cx="22" cy="22" r="20"
                        fill="none"
                        stroke={persona === 'tarot' ? '#a78bfa' : '#f472b6'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="0 1"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    </motion.svg>
                  )}

                  <motion.div
                    animate={isCurrent ? { y: [0, -2, 0] } : {}}
                    transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                    className={`w-8 h-8 rounded-full flex items-center justify-center p-1 transition-all duration-500 ${
                      isPast
                        ? (persona === 'tarot' ? 'bg-violet-50 shadow-sm' : 'bg-rose-50 shadow-sm')
                        : isCurrent
                          ? (persona === 'tarot' ? 'bg-white/70 backdrop-blur-sm shadow-[0_2px_12px_rgba(124,58,237,0.25)] scale-110' : 'bg-white/70 backdrop-blur-sm shadow-[0_2px_12px_rgba(236,72,153,0.25)] scale-110')
                          : 'bg-slate-50/60 opacity-35'
                    }`}
                  >
                    <StepIcon active={isCurrent} past={isPast} />
                  </motion.div>

                  {/* 완료 체크 오버레이 */}
                  <AnimatePresence>
                    {isPast && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${persona === 'tarot' ? 'bg-violet-400' : 'bg-rose-400'} rounded-full flex items-center justify-center z-30 shadow-sm`}
                      >
                        <svg viewBox="0 0 12 12" className="w-2 h-2">
                          <path d="M2 6 L5 9 L10 3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 라벨 */}
                <div className="text-center mt-1.5 w-full relative">
                  <span className={`text-[9px] font-bold block transition-all duration-300 whitespace-nowrap ${
                    isCurrent ? (persona === 'tarot' ? 'text-violet-600' : 'text-pink-600') : isPast ? (persona === 'tarot' ? 'text-violet-400' : 'text-rose-400') : 'text-slate-300'
                  }`}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 현재 단계 캐릭터 상태 문구 (타이핑 효과) */}
        <div className="text-center h-4">
          <motion.span
            key={currentPhase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`text-[10px] font-semibold ${persona === 'tarot' ? 'text-violet-400/80' : 'text-pink-400/80'} tracking-tight`}
          >
            {typedStatus}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className={`inline-block ml-0.5 w-[1px] h-[10px] ${persona === 'tarot' ? 'bg-violet-300' : 'bg-pink-300'} align-middle`}
            />
          </motion.span>
        </div>
      </div>
    </div>
  );
}
