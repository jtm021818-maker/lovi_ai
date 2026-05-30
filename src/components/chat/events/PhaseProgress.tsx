import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { ConversationPhaseV2 } from '@/types/engine.types';
import type { PersonaMode } from '@/types/persona.types';
import LunaSprite from '@/components/common/LunaSprite';

// ============================================================================
// 🦊 v118 — 단계별 컬러 토큰 (LUNA_PHASES & TAROT)
// "한 화면 = 한 감정" 원칙. 활성 단계 컬러가 컴포넌트 전체 톤을 지배.
// ============================================================================

type PhaseColor = { primary: string; secondary: string; glow: string; soft: string };

const LUNA_PHASE_COLORS: Record<string, PhaseColor> = {
  HOOK:    { primary: '#fb7185', secondary: '#fbcfe8', glow: 'rgba(251,113,133,0.45)', soft: 'rgba(255,247,251,0.96)' },
  MIRROR:  { primary: '#a855f7', secondary: '#e9d5ff', glow: 'rgba(168,85,247,0.42)',  soft: 'rgba(252,247,255,0.96)' },
  BRIDGE:  { primary: '#f97316', secondary: '#fed7aa', glow: 'rgba(249,115,22,0.45)',  soft: 'rgba(255,250,243,0.96)' },
  SOLVE:   { primary: '#22c55e', secondary: '#bbf7d0', glow: 'rgba(34,197,94,0.40)',   soft: 'rgba(245,253,247,0.96)' },
  EMPOWER: { primary: '#eab308', secondary: '#fef08a', glow: 'rgba(234,179,8,0.45)',   soft: 'rgba(254,252,232,0.96)' },
};

const TAROT_PHASE_COLOR: PhaseColor = {
  primary: '#7c3aed',
  secondary: '#c4b5fd',
  glow: 'rgba(124,58,237,0.40)',
  soft: 'rgba(252,247,255,0.96)',
};

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
  // 🆕 v121: 대화 레인. ASSIST(추천/검색)면 일상 스텝퍼 대신 "같이 찾는 중" 트랙 렌더.
  conversationMode?: 'COUNSELING' | 'CASUAL' | 'ASSIST' | null;
}

// ============================================================================
// 🆕 v118 — 분기 트랜지션 시스템
//   HOOK → (일상/상담) 점프 시점 감지 + 1.6초 셀러브레이션 오버레이 + 영구 배지
// ============================================================================

type BranchDirection = 'consult' | 'daily';

const CASUAL_PHASE_IDS = ['GREET', 'CATCHUP', 'BANTER', 'LINGER', 'FAREWELL', 'DAILY_CHAT'] as const;

function isCasualPhase(p: ConversationPhaseV2 | null): boolean {
  return p !== null && (CASUAL_PHASE_IDS as readonly string[]).includes(p);
}

/** HOOK → 분기 점프 감지 훅. branchEvent 가 1.6초 동안 살아있다가 자동 소멸. */
function usePhaseTransition(currentPhase: ConversationPhaseV2 | null) {
  const [prevPhase, setPrevPhase] = useState<ConversationPhaseV2 | null>(currentPhase);
  const [branchEvent, setBranchEvent] = useState<{ direction: BranchDirection; timestamp: number } | null>(null);
  // 한 번이라도 분기됐는지 (배지 표시용)
  const [branchedTo, setBranchedTo] = useState<BranchDirection | null>(() => {
    if (currentPhase && currentPhase !== 'HOOK') {
      return isCasualPhase(currentPhase) ? 'daily' : 'consult';
    }
    return null;
  });

  useEffect(() => {
    if (prevPhase === 'HOOK' && currentPhase && currentPhase !== 'HOOK') {
      const direction: BranchDirection = isCasualPhase(currentPhase) ? 'daily' : 'consult';
      const ts = Date.now();
      setBranchEvent({ direction, timestamp: ts });
      setBranchedTo(direction);
      const timer = setTimeout(() => {
        setBranchEvent((prev) => (prev && prev.timestamp === ts ? null : prev));
      }, 1700);
      setPrevPhase(currentPhase);
      return () => clearTimeout(timer);
    }
    // HOOK 으로 되돌아가면 배지/이벤트 리셋
    if (currentPhase === 'HOOK' && prevPhase !== 'HOOK') {
      setBranchedTo(null);
      setBranchEvent(null);
    }
    setPrevPhase(currentPhase);
  }, [currentPhase, prevPhase]);

  return { branchEvent, branchedTo };
}

// ── 분기 컬러 토큰 ──────────────────────────────────────────────
const BRANCH_THEME: Record<BranchDirection, { primary: string; secondary: string; glow: string; label: string; emoji: string; particleFills: string[]; }> = {
  consult: {
    primary: '#ec4899',
    secondary: '#fbcfe8',
    glow: 'rgba(236,72,153,0.45)',
    label: '상담 모드',
    emoji: '💕',
    particleFills: ['#fda4af', '#f472b6', '#fbbf24', '#fef08a', '#fff'],
  },
  daily: {
    primary: '#22c55e',
    secondary: '#bbf7d0',
    glow: 'rgba(34,197,94,0.42)',
    label: '일상 모드',
    emoji: '🍃',
    particleFills: ['#86efac', '#bbf7d0', '#fbbf24', '#fda4af', '#fff'],
  },
};

// ── 입자 1개 SVG ───────────────────────────────────────────────
function ConfettiParticle({ kind, color, delay, angle, distance, size }: {
  kind: 'star' | 'heart' | 'petal' | 'dot';
  color: string;
  delay: number;
  angle: number;
  distance: number;
  size: number;
}) {
  const rad = (angle * Math.PI) / 180;
  const tx = Math.cos(rad) * distance;
  const ty = Math.sin(rad) * distance;
  return (
    <motion.svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      className="absolute pointer-events-none"
      style={{ left: '50%', top: '50%', marginLeft: -size / 2, marginTop: -size / 2 }}
      initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
      animate={{ x: tx, y: ty, opacity: [0, 1, 1, 0], rotate: angle + 180, scale: [0.4, 1.1, 1, 0.6] }}
      transition={{ duration: 1.5, delay, ease: [0.22, 1, 0.36, 1], times: [0, 0.18, 0.7, 1] }}
    >
      {kind === 'star' && (
        <path
          d="M10 1 L12 7 L18 7 L13.2 11 L15 17 L10 13.5 L5 17 L6.8 11 L2 7 L8 7 Z"
          fill={color}
        />
      )}
      {kind === 'heart' && (
        <path
          d="M10 17s-6-4-7.5-7.5C1.2 6.6 3.2 4 6 4c1.6 0 2.8 1 4 2.2C11.2 5 12.4 4 14 4c2.8 0 4.8 2.6 3.5 5.5C16 13 10 17 10 17z"
          fill={color}
        />
      )}
      {kind === 'petal' && (
        <ellipse cx="10" cy="10" rx="3" ry="6" fill={color} />
      )}
      {kind === 'dot' && (
        <circle cx="10" cy="10" r="3.5" fill={color} />
      )}
    </motion.svg>
  );
}

// ── DivergenceCelebration : 1.6초 분기 셀러브레이션 오버레이 ──
function DivergenceCelebration({ direction }: { direction: BranchDirection }) {
  const theme = BRANCH_THEME[direction];
  const reduceMotion = useReducedMotion() ?? false;

  // 22개 입자 — 별/하트/꽃잎/도트 믹스
  const particles = Array.from({ length: 22 }, (_, i) => {
    const angleBase = (i / 22) * 360;
    const angleJitter = (Math.random() - 0.5) * 24;
    const angle = angleBase + angleJitter;
    const distance = 70 + Math.random() * 80;
    const size = 9 + Math.random() * 7;
    const delay = Math.random() * 0.18;
    const kinds: Array<'star' | 'heart' | 'petal' | 'dot'> = ['star', 'heart', 'petal', 'dot'];
    const kind = kinds[i % kinds.length];
    const color = theme.particleFills[i % theme.particleFills.length];
    return { kind, color, delay, angle, distance, size };
  });

  if (reduceMotion) {
    // 모션 줄이기 모드 — 정적 배너만 1.6초 표시
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
        style={{ background: `${theme.glow}` }}
      >
        <span
          className="px-4 py-1.5 rounded-full text-white font-bold text-sm shadow-lg"
          style={{ background: theme.primary, fontFamily: '"Gowun Dodum", system-ui' }}
        >
          {theme.emoji} {theme.label} 시작
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-30 pointer-events-none overflow-hidden"
    >
      {/* 배경 컬러 flash (0.4초 강했다가 fade) */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.55, 0.15] }}
        transition={{ duration: 1.4, times: [0, 0.18, 1], ease: 'easeOut' }}
        style={{
          background: `radial-gradient(ellipse at ${direction === 'consult' ? '15% 50%' : '85% 50%'}, ${theme.glow}, transparent 70%)`,
        }}
      />

      {/* 분기 방향 sweep ray — 한쪽으로 빛이 흐르는 효과 */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
        initial={{ x: direction === 'consult' ? '40%' : '40%', width: 8, opacity: 0 }}
        animate={{
          x: direction === 'consult' ? ['40%', '0%'] : ['40%', '85%'],
          width: [8, 220],
          opacity: [0, 0.9, 0],
        }}
        transition={{ duration: 0.85, ease: 'easeOut', times: [0, 0.4, 1] }}
        style={{
          left: 0,
          background: `linear-gradient(${direction === 'consult' ? '270deg' : '90deg'}, transparent, ${theme.primary}, transparent)`,
          filter: `blur(2px) drop-shadow(0 0 8px ${theme.primary})`,
        }}
      />

      {/* 폭죽 입자 22개 — 중앙(메달리온 자리) 에서 방사 */}
      <div className="absolute left-1/2 top-1/2">
        {particles.map((p, i) => (
          <ConfettiParticle key={i} {...p} />
        ))}
      </div>

      {/* 손글씨 배너 — 위에서 떨어져 spring bounce */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: '38%' }}
        initial={{ y: -40, opacity: 0, rotate: -8, scale: 0.7 }}
        animate={{
          y: [-40, 8, -2, 0, 0, 0, -10],
          opacity: [0, 1, 1, 1, 1, 1, 0],
          rotate: [-8, 3, -2, 1, -1, 0, 5],
          scale: [0.7, 1.12, 0.96, 1.04, 1, 1, 0.92],
        }}
        transition={{ duration: 1.7, times: [0, 0.15, 0.28, 0.4, 0.5, 0.85, 1], ease: 'easeOut' }}
      >
        <div
          className="px-4 py-1.5 rounded-2xl shadow-lg flex items-center gap-1.5"
          style={{
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
            boxShadow: `0 8px 24px ${theme.glow}, 0 2px 6px ${theme.primary}66`,
            border: '2px solid rgba(255,255,255,0.85)',
          }}
        >
          <span className="text-base leading-none">{theme.emoji}</span>
          <span
            className="text-white whitespace-nowrap"
            style={{
              fontFamily: '"Gowun Dodum", system-ui',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              textShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }}
          >
            {theme.label} 시작!
          </span>
        </div>
        {/* 배너 아래 sparkle 2개 */}
        <motion.div
          className="absolute -bottom-1 left-3"
          animate={{ scale: [0, 1.2, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 0.9, delay: 0.3, repeat: 1 }}
        >
          <svg viewBox="0 0 12 12" width={10} height={10}>
            <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="#fef08a" />
          </svg>
        </motion.div>
        <motion.div
          className="absolute -bottom-2 right-2"
          animate={{ scale: [0, 1, 0], rotate: [0, -180, -360] }}
          transition={{ duration: 0.9, delay: 0.5, repeat: 1 }}
        >
          <svg viewBox="0 0 12 12" width={8} height={8}>
            <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="#fff" />
          </svg>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── BranchBadge : 분기 후 트랙 우상단 칩 (영구 표시) ─────────
function BranchBadge({ direction, justArrived }: { direction: BranchDirection; justArrived: boolean }) {
  const theme = BRANCH_THEME[direction];
  return (
    <motion.div
      initial={justArrived ? { opacity: 0, scale: 0.6, y: -6 } : { opacity: 1, scale: 1, y: 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 14, stiffness: 220, delay: justArrived ? 1.5 : 0 }}
      className="absolute top-1.5 right-2 z-20 inline-flex items-center gap-1 pointer-events-none"
      style={{
        background: `linear-gradient(135deg, ${theme.primary}, ${theme.primary}d0)`,
        borderRadius: 999,
        padding: '2px 8px 2px 7px',
        boxShadow: `0 2px 8px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.45)`,
        border: '1px solid rgba(255,255,255,0.7)',
      }}
    >
      <span style={{ fontSize: 9, lineHeight: 1 }}>{theme.emoji}</span>
      <span
        style={{
          fontFamily: '"Gowun Dodum", system-ui',
          fontSize: '9.5px',
          fontWeight: 800,
          color: 'white',
          letterSpacing: '-0.01em',
          textShadow: '0 1px 1px rgba(0,0,0,0.12)',
          whiteSpace: 'nowrap',
        }}
      >
        {theme.label}
      </span>
    </motion.div>
  );
}

// ============================================================================
// 🆕 v118 — LiveLunaMedallion : 살아있는 루나 메달리온
// 7×7 luna_sprite_setting_1.webp 풀 루프 + 단계 컬러 글로우 + 우상단 둥둥 하트
// 단계 전환 시 scale bump 으로 "넘어왔어!" 신호.
// ============================================================================
function LiveLunaMedallion({
  persona,
  color,
  phaseKey,
  reduceMotion,
  size = 44,
}: {
  persona: PersonaMode;
  color: PhaseColor;
  phaseKey: string;
  reduceMotion: boolean;
  size?: number;
}) {
  const isTarot = persona === 'tarot';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* 외곽 글로우 펄스 (호흡) */}
      <motion.div
        className="absolute inset-[-10px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color.glow}, transparent 65%)` }}
        animate={reduceMotion ? {} : { scale: [1, 1.22, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 메달리온 본체 — 단계 변경 시 살짝 튕김 */}
      <motion.div
        key={phaseKey}
        initial={reduceMotion ? false : { scale: 0.92, rotate: -3 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200 }}
        className="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: `0 4px 16px ${color.glow}, inset 0 1px 2px rgba(255,255,255,0.95)`,
          border: `1.6px solid ${color.secondary}`,
        }}
      >
        {isTarot ? (
          // 타로 페르소나: 전용 sprite 없어서 SVG 고양이 아이콘
          <div className="w-[78%] h-[78%]">
            <CatEarIcon active={true} past={false} />
          </div>
        ) : (
          // 루나: 7×7 라이브 픽셀 sprite
          <LunaSprite
            preset="setting"
            size={Math.round(size * 0.84)}
            speed={reduceMotion ? 'slow' : 'normal'}
            paused={reduceMotion}
            circle={false}
          />
        )}
      </motion.div>

      {/* 우상단 둥둥 하트 — "누나가 보고 있어" 시그널 */}
      <motion.svg
        viewBox="0 0 24 24"
        width={15}
        height={15}
        className="absolute -top-1 -right-1.5 pointer-events-none"
        animate={reduceMotion ? {} : { y: [0, -2, 0], rotate: [-10, 5, -10] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0 1.5px 2.5px ${color.glow})` }}
      >
        <path
          d="M12 21s-7-4.5-9-9c-1.5-3.5 1-7 4.5-7 2 0 3.5 1.2 4.5 2.5C13 6.2 14.5 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.5-9 9-9 9z"
          fill={color.primary}
          stroke="white"
          strokeWidth="1.5"
        />
      </motion.svg>
    </div>
  );
}

// ============================================================================
// 🆕 v118 — FloatingPetals : 떠다니는 손그림 꽃잎 6장
// 모든 상담 단계에서 배경 무드로 항상 떠있음 (BranchedTrack 의 매력 보존)
// ============================================================================
function FloatingPetals({ color, reduceMotion }: { color: PhaseColor; reduceMotion: boolean }) {
  const petals = [
    { l: '5%',  t: '14%', size: 14, rot: -22, delay: 0.0 },
    { l: '22%', t: '72%', size: 11, rot: 30,  delay: 0.7 },
    { l: '44%', t: '12%', size: 10, rot: -8,  delay: 1.1 },
    { l: '64%', t: '76%', size: 12, rot: 18,  delay: 0.3 },
    { l: '82%', t: '18%', size: 9,  rot: -28, delay: 1.6 },
    { l: '92%', t: '62%', size: 13, rot: 12,  delay: 0.9 },
  ];

  if (reduceMotion) return null;

  return (
    <>
      {petals.map((p, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 20 20"
          width={p.size}
          height={p.size}
          className="absolute pointer-events-none"
          style={{ left: p.l, top: p.t }}
          animate={{
            y: [0, -6, 0],
            rotate: [p.rot, p.rot + 10, p.rot],
            opacity: [0.35, 0.85, 0.35],
          }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        >
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="10" cy="5.5" rx="2.3" ry="3.8"
              fill={color.secondary}
              stroke={color.primary}
              strokeWidth="0.5"
              opacity="0.7"
              transform={`rotate(${deg} 10 10)`}
            />
          ))}
          <circle cx="10" cy="10" r="1.6" fill="#fde68a" opacity="0.85" />
        </motion.svg>
      ))}
    </>
  );
}

// ============================================================================
// 🆕 v118 — ListeningMoment : HOOK (상담↔일상 분기 전) 전용 트랙
//  - "조용히 듣고 있어" 모먼트 + 좌우 양 갈래 path 시각화
//  - 중앙 큰 라이브 루나 메달리온 (sprite 50×50) + 떠다니는 꽃잎 + 둥둥 하트 + 타이핑 도트
//  - 좌측 path 끝: 💕 상담 / 우측 path 끝: 🍃 일상  (둘 다 옅게 — 아직 결정 안 됨)
//  - 클릭 X — 어디로 갈지는 LLM/유저의 다음 메시지가 결정 (v117.5 anti-chip)
// ============================================================================
function ListeningMoment({
  lunaThinking,
  persona,
}: {
  lunaThinking?: string;
  persona: PersonaMode;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const isTarot = persona === 'tarot';
  const color: PhaseColor = isTarot ? TAROT_PHASE_COLOR : LUNA_PHASE_COLORS.HOOK;

  const fallback = isTarot ? '카드 펼치는 중 🐱' : '조용히 듣고 있어';
  const displayText = (lunaThinking && lunaThinking.trim()) ? lunaThinking : fallback;
  const typedStatus = useTypewriter(displayText, 70);

  // 일상 경로 컬러 (분기 힌트용)
  const dailyColor = isTarot ? color.primary : '#22c55e';
  const dailyGlow = isTarot ? color.glow : 'rgba(34,197,94,0.22)';

  return (
    <div className="w-full sticky top-[60px] z-10"
      role="status" aria-live="polite"
      aria-label="이야기 듣는 중 — 다음 흐름 결정 전">
      <div
        className="h-[1px]"
        style={{ background: `linear-gradient(to right, transparent, ${color.primary}55, transparent)` }}
      />

      <div
        className="relative overflow-hidden backdrop-blur-xl border-b"
        style={{
          background: `linear-gradient(135deg, ${color.soft} 0%, rgba(255,255,255,0.94) 100%)`,
          borderColor: `${color.primary}1a`,
          boxShadow: `0 2px 18px ${color.primary}12`,
          paddingTop: 12,
          paddingBottom: 14,
          paddingLeft: 14,
          paddingRight: 14,
        }}
      >
        <FloatingPetals color={color} reduceMotion={reduceMotion} />

        {/* Y자 분기 path SVG */}
        <svg
          viewBox="0 0 400 60"
          className="absolute left-0 right-0 mx-auto pointer-events-none"
          style={{ top: 28, width: '100%', height: 60, opacity: 0.55 }}
          preserveAspectRatio="none"
        >
          <motion.path
            d="M200 22 Q140 22 100 12 Q70 6 40 10"
            fill="none"
            stroke={color.primary}
            strokeWidth="1.4"
            strokeDasharray="3 4"
            strokeLinecap="round"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
          <motion.path
            d="M200 22 Q260 22 300 32 Q330 38 360 36"
            fill="none"
            stroke={dailyColor}
            strokeWidth="1.4"
            strokeDasharray="3 4"
            strokeLinecap="round"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.18 }}
          />
        </svg>

        {/* 메인 행: 좌측 상담힌트 — 중앙 큰 메달리온 — 우측 일상힌트 */}
        <div className="relative flex items-center justify-between gap-2 min-h-[64px]">
          {/* 좌측: 상담 흐름 힌트 */}
          <motion.div
            className="flex flex-col items-center flex-shrink-0"
            initial={reduceMotion ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 0.8, x: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center p-1"
              style={{
                background: 'rgba(255,255,255,0.78)',
                border: `1px dashed ${color.primary}66`,
                boxShadow: `0 1px 6px ${color.primary}22`,
              }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path
                  d="M12 21s-7-4.5-9-9c-1.5-3.5 1-7 4.5-7 2 0 3.5 1.2 4.5 2.5C13 6.2 14.5 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.5-9 9-9 9z"
                  fill={color.primary}
                  opacity="0.88"
                />
              </svg>
            </div>
            <span
              className="mt-1 whitespace-nowrap"
              style={{
                fontFamily: '"Gowun Dodum", system-ui',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: `${color.primary}d0`,
                opacity: 0.9,
              }}
            >
              상담
            </span>
          </motion.div>

          {/* 중앙: 큰 라이브 루나 메달리온 */}
          <div className="relative flex-shrink-0" style={{ width: 60, height: 60 }}>
            <motion.div
              className="absolute inset-[-12px] rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${color.glow}, transparent 65%)` }}
              animate={reduceMotion ? {} : { scale: [1, 1.18, 1], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              initial={reduceMotion ? false : { scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 180 }}
              className="relative w-full h-full rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.94)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: `0 6px 20px ${color.glow}, inset 0 1px 3px rgba(255,255,255,0.95)`,
                border: `2px solid ${color.secondary}`,
              }}
            >
              {isTarot ? (
                <div className="w-[80%] h-[80%]">
                  <CatEarIcon active={true} past={false} />
                </div>
              ) : (
                <LunaSprite
                  preset="setting"
                  size={50}
                  speed={reduceMotion ? 'slow' : 'normal'}
                  paused={reduceMotion}
                  circle={false}
                />
              )}
            </motion.div>
            {/* 우상단 둥둥 하트 */}
            <motion.svg
              viewBox="0 0 24 24" width={17} height={17}
              className="absolute -top-1.5 -right-2 pointer-events-none"
              animate={reduceMotion ? {} : { y: [0, -3, 0], rotate: [-10, 8, -10], scale: [1, 1.08, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: `drop-shadow(0 2px 3px ${color.glow})` }}
            >
              <path
                d="M12 21s-7-4.5-9-9c-1.5-3.5 1-7 4.5-7 2 0 3.5 1.2 4.5 2.5C13 6.2 14.5 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.5-9 9-9 9z"
                fill={color.primary}
                stroke="white"
                strokeWidth="1.5"
              />
            </motion.svg>
            {/* 하단 타이핑 도트 3개 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-[3px]">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block rounded-full"
                  style={{
                    width: 4, height: 4,
                    background: color.primary,
                    boxShadow: `0 0 4px ${color.glow}`,
                  }}
                  animate={reduceMotion ? {} : { y: [0, -2, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </div>

          {/* 우측: 일상 흐름 힌트 */}
          <motion.div
            className="flex flex-col items-center flex-shrink-0"
            initial={reduceMotion ? false : { opacity: 0, x: 4 }}
            animate={{ opacity: 0.8, x: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center p-1"
              style={{
                background: 'rgba(255,255,255,0.78)',
                border: `1px dashed ${dailyColor}77`,
                boxShadow: `0 1px 6px ${dailyGlow}`,
              }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M12 20 Q12 14 12 12" fill="none" stroke={dailyColor} strokeWidth="1.5" strokeLinecap="round" />
                <path
                  d="M12 13 C8 12 5 8 7 5 C10 3 12 8 12 13 Z"
                  fill={isTarot ? color.secondary : '#bbf7d0'}
                  stroke={dailyColor}
                  strokeWidth="1"
                  opacity="0.9"
                />
                <path
                  d="M12 11 C16 10 19 6 17 3 C14 1 12 6 12 11 Z"
                  fill={isTarot ? color.secondary : '#86efac'}
                  stroke={dailyColor}
                  strokeWidth="1"
                  opacity="0.9"
                />
              </svg>
            </div>
            <span
              className="mt-1 whitespace-nowrap"
              style={{
                fontFamily: '"Gowun Dodum", system-ui',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: isTarot ? `${color.primary}d0` : '#15803dd0',
                opacity: 0.9,
              }}
            >
              일상
            </span>
          </motion.div>
        </div>

        {/* 상태 카피 (typewriter) */}
        <div className="text-center mt-3">
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-0.5"
            style={{
              fontFamily: '"Nanum Pen Script", "Gowun Dodum", system-ui',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '-0.005em',
              background: `linear-gradient(90deg, ${color.primary} 0%, ${color.primary}cc 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {typedStatus}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block ml-0.5 w-[1.5px] h-[13px] align-middle rounded-full"
              style={{ background: color.primary }}
            />
          </motion.span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 🆕 v118 — ConsultStepperTrack : 분기 후 상담 4단계 통합 트랙
//  - MIRROR → BRIDGE → SOLVE → EMPOWER (HOOK 는 ListeningMoment 가 담당)
//  - 좌측: LiveLunaMedallion (단계 컬러 글로우)
//  - 우측: 5단계 stepper (HOOK 도 dot 으로 포함 — 첫 단계는 ✓ 처리)
//  - 하단: typewriter 상태 카피 + 떠다니는 꽃잎
// ============================================================================
function ConsultStepperTrack({
  currentPhase,
  steps,
  currentIndex,
  totalPercent,
  persona,
  lunaThinking,
  fallbackText,
  branchOverlay,
}: {
  currentPhase: ConversationPhaseV2;
  steps: PhaseStep[];
  currentIndex: number;
  totalPercent: number;
  persona: PersonaMode;
  lunaThinking?: string;
  fallbackText: string;
  branchOverlay?: ReactNode;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const isTarot = persona === 'tarot';
  const phaseColor: PhaseColor = isTarot
    ? TAROT_PHASE_COLOR
    : LUNA_PHASE_COLORS[currentPhase] ?? LUNA_PHASE_COLORS.HOOK;

  const displayText = (lunaThinking && lunaThinking.trim()) ? lunaThinking : fallbackText;
  const typedStatus = useTypewriter(displayText, 70);

  // 진행바 슬롯 계산 (justify-between 대응)
  const iconCount = steps.length;
  const slotWidth = 100 / iconCount;
  const startOffset = slotWidth / 2;
  const barRange = 100 - slotWidth;

  return (
    <div className="w-full sticky top-[60px] z-10" role="progressbar"
      aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={currentIndex + 1}
      aria-label={`상담 단계 ${currentIndex + 1} / ${steps.length}: ${steps[currentIndex]?.label ?? ''}`}>
      {/* 상단 얇은 그라데이션 라인 */}
      <div
        className="h-[1px]"
        style={{
          background: `linear-gradient(to right, transparent, ${phaseColor.primary}55, transparent)`,
        }}
      />

      <motion.div
        className="relative overflow-hidden backdrop-blur-xl border-b"
        animate={{
          background: `linear-gradient(135deg, ${phaseColor.soft} 0%, rgba(255,255,255,0.94) 100%)`,
        }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{
          borderColor: `${phaseColor.primary}1a`,
          boxShadow: `0 2px 18px ${phaseColor.primary}12`,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        {/* 떠다니는 꽃잎 (배경) */}
        <FloatingPetals color={phaseColor} reduceMotion={reduceMotion} />

        {/* Row 1: 메달리온 + 스테퍼 */}
        <div className="relative flex items-start gap-3">
          <LiveLunaMedallion
            persona={persona}
            color={phaseColor}
            phaseKey={currentPhase}
            reduceMotion={reduceMotion}
            size={44}
          />

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex justify-between items-start w-full relative">
              {/* 진행선 배경 */}
              <div
                className="absolute top-[13px] h-[2.5px] rounded-full z-0"
                style={{
                  left: `${startOffset}%`,
                  width: `${barRange}%`,
                  background: `${phaseColor.secondary}66`,
                }}
              />
              {/* 진행선 활성 + 끝 글로우 점 */}
              <motion.div
                className="absolute top-[13px] h-[2.5px] z-[1] rounded-full"
                style={{
                  left: `${startOffset}%`,
                  background: `linear-gradient(to right, ${phaseColor.primary}, ${phaseColor.primary}dd)`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${totalPercent * (barRange / 100)}%` }}
                transition={{ type: 'spring', damping: 20, stiffness: 80 }}
              >
                <motion.div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full"
                  style={{ background: phaseColor.primary }}
                  animate={reduceMotion ? {} : {
                    boxShadow: [`0 0 4px 2px ${phaseColor.glow}`, `0 0 8px 4px ${phaseColor.glow}`, `0 0 4px 2px ${phaseColor.glow}`],
                    scale: [1, 1.3, 1],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>

              {steps.map((step, idx) => {
                const isPast = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                const StepIcon = step.Icon;
                const stepColor: PhaseColor = isTarot
                  ? TAROT_PHASE_COLOR
                  : LUNA_PHASE_COLORS[step.id] ?? phaseColor;

                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                    <div className="relative">
                      {/* 현재 단계 드로잉 ring */}
                      {isCurrent && (
                        <motion.svg
                          viewBox="0 0 44 44"
                          className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] z-20"
                        >
                          <motion.circle
                            cx="22" cy="22" r="20"
                            fill="none"
                            stroke={stepColor.primary}
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
                        animate={isCurrent && !reduceMotion ? { y: [0, -2, 0] } : {}}
                        transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                        className="w-7 h-7 rounded-full flex items-center justify-center p-0.5 transition-all duration-500"
                        style={{
                          background: isCurrent
                            ? 'rgba(255,255,255,0.85)'
                            : isPast
                              ? `${stepColor.secondary}88`
                              : 'rgba(248,250,252,0.65)',
                          boxShadow: isCurrent
                            ? `0 2px 12px ${stepColor.glow}`
                            : isPast
                              ? `0 1px 4px ${stepColor.glow.replace('0.4', '0.15')}`
                              : 'none',
                          transform: isCurrent ? 'scale(1.12)' : 'scale(1)',
                          opacity: isCurrent ? 1 : isPast ? 0.95 : 0.4,
                          backdropFilter: isCurrent ? 'blur(6px)' : undefined,
                        }}
                      >
                        <StepIcon active={isCurrent} past={isPast} />
                      </motion.div>

                      {/* 완료 체크 스탬프 */}
                      <AnimatePresence>
                        {isPast && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center z-30 shadow-sm"
                            style={{ background: stepColor.primary }}
                          >
                            <svg viewBox="0 0 12 12" className="w-2 h-2">
                              <path d="M2 6 L5 9 L10 3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* 라벨 (10.5px, Gowun Dodum) */}
                    <div className="text-center mt-1.5 w-full">
                      <span
                        className="block transition-all duration-300 whitespace-nowrap"
                        style={{
                          fontFamily: '"Gowun Dodum", system-ui',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          letterSpacing: '-0.01em',
                          color: isCurrent ? stepColor.primary : isPast ? `${stepColor.primary}cc` : '#cbd5e1',
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: 손글씨 상태 카피 (typewriter) */}
        <div className="text-center mt-1.5" aria-live="polite">
          <motion.span
            key={currentPhase + '-status'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="inline-flex items-center gap-0.5"
            style={{
              fontFamily: '"Nanum Pen Script", "Gowun Dodum", system-ui',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '-0.005em',
              color: phaseColor.primary,
              opacity: 0.9,
            }}
          >
            {typedStatus}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block ml-0.5 w-[1.5px] h-[12px] align-middle rounded-full"
              style={{ background: phaseColor.primary }}
            />
          </motion.span>
        </div>
        {branchOverlay}
      </motion.div>
    </div>
  );
}


// ============================================================================
// 🆕 v116: 일상 5-Phase 보조 아이콘 (LINGER 달 / FAREWELL 손 흔들기)
// ============================================================================

/** 작은 달 아이콘 (LINGER: 톤 다운, pre-closing) */
const SmallMoonIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 초승달 */}
    <path d="M26 6 C18 6 12 12 12 20 C12 28 18 34 26 34 C20 31 16 26 16 20 C16 14 20 9 26 6 Z"
      fill={active ? '#ddd6fe' : past ? '#ede9fe' : '#f1f5f9'}
      stroke={active ? '#7c3aed' : past ? '#a78bfa' : '#cbd5e1'}
      strokeWidth="1.5" strokeLinejoin="round" />
    {/* 작은 별 */}
    <circle cx="30" cy="10" r="1.2" fill={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'} />
    <circle cx="32" cy="22" r="0.8" fill={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'} />
  </svg>
);

/** 손 흔들기 아이콘 (FAREWELL: 작별 인사) */
const WaveHandIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 손바닥 (둥근 사각형) */}
    <path d="M14 16 Q14 10 18 10 L24 10 Q28 10 28 16 L28 26 Q28 32 22 32 L18 32 Q14 32 14 26 Z"
      fill={active ? '#fed7aa' : past ? '#ffedd5' : '#f1f5f9'}
      stroke={active ? '#ea580c' : past ? '#fb923c' : '#cbd5e1'}
      strokeWidth="1.5" strokeLinejoin="round" />
    {/* 손가락 4개 디테일 */}
    <line x1="17" y1="14" x2="17" y2="20" stroke={active ? '#ea580c' : past ? '#fb923c' : '#94a3b8'} strokeWidth="0.8" />
    <line x1="20" y1="13" x2="20" y2="20" stroke={active ? '#ea580c' : past ? '#fb923c' : '#94a3b8'} strokeWidth="0.8" />
    <line x1="23" y1="13" x2="23" y2="20" stroke={active ? '#ea580c' : past ? '#fb923c' : '#94a3b8'} strokeWidth="0.8" />
    <line x1="26" y1="14" x2="26" y2="20" stroke={active ? '#ea580c' : past ? '#fb923c' : '#94a3b8'} strokeWidth="0.8" />
    {/* 작은 흔들림 표시 (양옆 곡선) */}
    <path d="M8 14 Q5 16 8 18" fill="none" stroke={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'} strokeWidth="1" strokeLinecap="round" />
    <path d="M32 14 Q35 16 32 18" fill="none" stroke={active ? '#fbbf24' : past ? '#fde68a' : '#e2e8f0'} strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/** 작은 컵 아이콘 (CATCHUP: 안부 - 일상 한 잔) */
const TeaCupIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 컵 본체 */}
    <path d="M10 14 L10 28 Q10 32 14 32 L24 32 Q28 32 28 28 L28 14 Z"
      fill={active ? '#bbf7d0' : past ? '#dcfce7' : '#f1f5f9'}
      stroke={active ? '#16a34a' : past ? '#86efac' : '#cbd5e1'}
      strokeWidth="1.5" strokeLinejoin="round" />
    {/* 손잡이 */}
    <path d="M28 18 Q34 18 34 22 Q34 26 28 26" fill="none"
      stroke={active ? '#16a34a' : past ? '#86efac' : '#cbd5e1'}
      strokeWidth="1.5" strokeLinecap="round" />
    {/* 김 */}
    <path d="M16 10 Q15 7 16 4 M20 10 Q19 7 20 4 M24 10 Q23 7 24 4"
      fill="none" stroke={active ? '#86efac' : past ? '#bbf7d0' : '#e2e8f0'}
      strokeWidth="1" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// ============================================================================
// 🆕 v116: CasualPhaseTrack — 일상 5-Phase 전용 트랙
// (DAILY_CHAT 호환 alias 도 같이 처리)
// ============================================================================
type CasualPhaseId = 'GREET' | 'CATCHUP' | 'BANTER' | 'LINGER' | 'FAREWELL';

type CasualIcon = typeof ChatBubbleIcon;
const CASUAL_STEPS: ReadonlyArray<{
  id: CasualPhaseId;
  label: string;
  status: string;
  Icon: CasualIcon;
  activeColor: string;
}> = [
  { id: 'GREET',    label: '인사',  status: '왔어~ 👋',         Icon: ChatBubbleIcon, activeColor: 'text-pink-600' },
  { id: 'CATCHUP',  label: '안부',  status: '오늘 어땠어 🍃',   Icon: TeaCupIcon,     activeColor: 'text-emerald-600' },
  { id: 'BANTER',   label: '수다',  status: '재밌게 노는 중 🎈', Icon: FlowerChatIcon, activeColor: 'text-rose-600' },
  { id: 'LINGER',   label: '여운',  status: '톤 다운 🌙',        Icon: SmallMoonIcon,  activeColor: 'text-violet-600' },
  { id: 'FAREWELL', label: '작별',  status: '또 봐~ ✨',         Icon: WaveHandIcon,   activeColor: 'text-orange-600' },
];

function CasualPhaseTrack({ currentPhase, lunaThinking, branchOverlay }: { currentPhase: CasualPhaseId; lunaThinking?: string; branchOverlay?: ReactNode }) {
  const currentIdx = CASUAL_STEPS.findIndex(s => s.id === currentPhase);
  const safeIdx = currentIdx < 0 ? 0 : currentIdx;
  const currentStep = CASUAL_STEPS[safeIdx];
  const displayText = lunaThinking || currentStep.status;
  const typedStatus = useTypewriter(displayText, 70);

  const iconCount = CASUAL_STEPS.length;
  const slotWidth = 100 / iconCount;
  const startOffset = slotWidth / 2;
  const barRange = 100 - slotWidth;
  const basePercent = (safeIdx / (iconCount - 1)) * 100;

  return (
    <div className="w-full sticky top-[60px] z-10">
      <div className="h-[1px] bg-gradient-to-r from-pink-200/60 via-rose-300/40 to-amber-200/60" />
      <div className="relative overflow-hidden bg-gradient-to-r from-pink-50/80 via-white/90 to-amber-50/80 border-b border-pink-100/40 shadow-[0_4px_20px_rgba(244,114,182,0.06)] backdrop-blur-xl px-2 py-3">
        <div className="flex justify-between items-start w-full px-1 mb-1.5 relative">
          {/* 진행선 배경 */}
          <div
            className="absolute top-[14px] h-[3px] bg-pink-50/80 z-0 rounded-full"
            style={{ left: `${startOffset}%`, width: `${barRange}%` }}
          />
          {/* 진행선 활성 */}
          <motion.div
            className="absolute top-[14px] h-[3px] bg-gradient-to-r from-pink-300 via-rose-300 to-amber-300 z-[1] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${basePercent * (barRange / 100)}%` }}
            style={{ left: `${startOffset}%` }}
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

          {CASUAL_STEPS.map((step, idx) => {
            const isPast = idx < safeIdx;
            const isCurrent = idx === safeIdx;
            const StepIcon = step.Icon;
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                <div className="relative">
                  {isCurrent && (
                    <motion.svg viewBox="0 0 44 44" className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] z-20">
                      <motion.circle
                        cx="22" cy="22" r="20"
                        fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeDasharray="0 1"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    </motion.svg>
                  )}
                  <motion.div
                    animate={isCurrent ? { y: [0, -2, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center p-1 ${
                      isCurrent ? 'bg-white/70 backdrop-blur-sm shadow-[0_2px_12px_rgba(236,72,153,0.25)] scale-110'
                                : isPast ? 'bg-rose-50 shadow-sm' : 'bg-white/40'
                    }`}
                  >
                    <StepIcon active={isCurrent} past={isPast} />
                  </motion.div>
                  {isPast && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-400 rounded-full flex items-center justify-center z-30 shadow-sm"
                    >
                      <svg viewBox="0 0 12 12" className="w-2 h-2">
                        <path d="M2 6 L5 9 L10 3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  )}
                </div>
                <div className="text-center mt-1.5 w-full">
                  <span className={`text-[9px] font-bold block whitespace-nowrap ${
                    isCurrent ? step.activeColor : isPast ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
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
        {branchOverlay}
      </div>
    </div>
  );
}


// ============================================================================
// 🆕 v121 — AssistTrack : 추천/검색 "같이 찾기" 전용 트랙
//  - ASSIST 레인은 CASUAL phase(GREET 등)로 라우팅되지만, 일상 스텝퍼는 맥락에 안 맞음.
//  - 대신 돋보기 모티프 + 라이브 루나 메달리온 + "같이 골라보는 중 🔍" 배너.
//  - 스텝퍼 없음 (browse 는 이벤트 기반이라 단계가 의미 없음).
// ============================================================================
const ASSIST_COLOR: PhaseColor = {
  primary: '#0ea5b7',
  secondary: '#a5f3fc',
  glow: 'rgba(14,165,183,0.40)',
  soft: 'rgba(240,253,255,0.96)',
};

function AssistTrack({
  lunaThinking,
  persona,
  branchOverlay,
}: {
  lunaThinking?: string;
  persona: PersonaMode;
  branchOverlay?: ReactNode;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const color = ASSIST_COLOR;
  const displayText = (lunaThinking && lunaThinking.trim()) ? lunaThinking : '같이 골라보는 중 🔍';
  const typedStatus = useTypewriter(displayText, 70);

  return (
    <div className="w-full sticky top-[60px] z-10" role="status" aria-live="polite" aria-label="같이 찾는 중">
      <div className="h-[1px]" style={{ background: `linear-gradient(to right, transparent, ${color.primary}55, transparent)` }} />
      <div
        className="relative overflow-hidden backdrop-blur-xl border-b"
        style={{
          background: `linear-gradient(135deg, ${color.soft} 0%, rgba(255,255,255,0.94) 100%)`,
          borderColor: `${color.primary}1a`,
          boxShadow: `0 2px 18px ${color.primary}12`,
          paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12,
        }}
      >
        <FloatingPetals color={color} reduceMotion={reduceMotion} />

        <div className="relative flex items-center gap-3">
          <LiveLunaMedallion persona={persona} color={color} phaseKey="ASSIST" reduceMotion={reduceMotion} size={44} />

          <div className="flex-1 min-w-0">
            {/* 라벨 행 */}
            <div className="flex items-center gap-1.5">
              {/* 돋보기 아이콘 */}
              <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
                <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke={color.primary} strokeWidth="2" />
                <line x1="15.5" y1="15.5" x2="21" y2="21" stroke={color.primary} strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              <span
                className="whitespace-nowrap"
                style={{
                  fontFamily: '"Gowun Dodum", system-ui',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  color: color.primary,
                }}
              >
                같이 찾는 중
              </span>
              {/* 진행 점 3개 (browse 흐름 ongoing 표시) */}
              <div className="flex items-center gap-[3px] ml-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="block rounded-full"
                    style={{ width: 4, height: 4, background: color.primary, boxShadow: `0 0 4px ${color.glow}` }}
                    animate={reduceMotion ? {} : { y: [0, -2, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            </div>

            {/* 상태 카피 (typewriter) */}
            <div className="mt-1" aria-live="polite">
              <span
                className="inline-flex items-center gap-0.5"
                style={{
                  fontFamily: '"Nanum Pen Script", "Gowun Dodum", system-ui',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: `${color.primary}cc`,
                }}
              >
                {typedStatus}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block ml-0.5 w-[1.5px] h-[12px] align-middle rounded-full"
                  style={{ background: color.primary }}
                />
              </span>
            </div>
          </div>
        </div>
        {branchOverlay}
      </div>
    </div>
  );
}

// ============================================================================
// 🆕 v118 — PhaseProgress main entry (간결 라우터)
//  - 상담 5단계 (HOOK/MIRROR/BRIDGE/SOLVE/EMPOWER) → ConsultStepperTrack (통합)
//  - 일상 5단계 (GREET/CATCHUP/BANTER/LINGER/FAREWELL) → CasualPhaseTrack
//  - DAILY_CHAT (legacy alias) → CasualPhaseTrack(BANTER)
// ============================================================================
export default function PhaseProgress({ currentPhase, progress, persona = 'luna', lunaThinking, understandingLevel, conversationMode }: PhaseProgressProps) {
  // 🆕 v118 — 분기 트랜지션 훅 (HOOK 일 때도 호출 → React Hook 규칙)
  const { branchEvent, branchedTo } = usePhaseTransition(currentPhase);

  if (!currentPhase) return null;

  // 🆕 v121 — ASSIST(추천/검색) 레인: 일상/상담 스텝퍼 대신 "같이 찾는 중" 트랙.
  //   단, HOOK(분기 전)에선 아직 듣는 중이므로 ListeningMoment 유지 → ASSIST 트랙은 분기 후부터.
  if (conversationMode === 'ASSIST' && currentPhase !== 'HOOK') {
    return <AssistTrack lunaThinking={lunaThinking} persona={persona} />;
  }

  // 🆕 v118 — 분기 후 트랙에 얹을 overlay (배지 + 셀러브레이션)
  const branchOverlay: ReactNode = branchedTo ? (
    <>
      <BranchBadge direction={branchedTo} justArrived={!!branchEvent} />
      <AnimatePresence>
        {branchEvent && <DivergenceCelebration key={branchEvent.timestamp} direction={branchEvent.direction} />}
      </AnimatePresence>
    </>
  ) : null;

  // 일상 5-Phase 트랙 (분기 후)
  if (currentPhase === 'GREET' || currentPhase === 'CATCHUP' || currentPhase === 'BANTER'
      || currentPhase === 'LINGER' || currentPhase === 'FAREWELL') {
    return <CasualPhaseTrack currentPhase={currentPhase} lunaThinking={lunaThinking} branchOverlay={branchOverlay} />;
  }
  if (currentPhase === 'DAILY_CHAT') {
    return <CasualPhaseTrack currentPhase="BANTER" lunaThinking={lunaThinking} branchOverlay={branchOverlay} />;
  }

  // 🆕 v118 — HOOK = 상담↔일상 분기 전 모먼트. 5단계 stepper 띄우지 않음
  if (currentPhase === 'HOOK') {
    return <ListeningMoment lunaThinking={lunaThinking} persona={persona} />;
  }

  // 분기 후 상담 4단계 (MIRROR/BRIDGE/SOLVE/EMPOWER) — 통합 stepper 트랙
  const steps = persona === 'tarot' ? TAROT_STEPS : LUNA_STEPS;
  const currentIndex = steps.findIndex(p => p.id === currentPhase);
  // 타로냥은 MIRROR 단계 스킵 → HOOK 인덱스로 매핑
  const adjustedIndex = currentIndex === -1 && persona === 'tarot' && currentPhase === 'MIRROR'
    ? steps.findIndex(p => p.id === 'HOOK')
    : currentIndex;
  const idx = adjustedIndex === -1 ? 0 : adjustedIndex;

  const currentStep = steps[idx];

  // intra-step 진행률 (understandingLevel 우선, 없으면 progress)
  const iconCount = steps.length;
  const basePercent = (idx / (iconCount - 1)) * 100;
  const nextPercent = idx < iconCount - 1 ? ((idx + 1) / (iconCount - 1)) * 100 : basePercent;
  const intraStepProgress = (persona !== 'tarot' && understandingLevel !== undefined)
    ? (understandingLevel / 100)
    : (progress / 100);
  const totalPercent = Math.min(100, Math.max(0, basePercent + (nextPercent - basePercent) * intraStepProgress));

  return (
    <ConsultStepperTrack
      currentPhase={currentPhase}
      steps={steps}
      currentIndex={idx}
      totalPercent={totalPercent}
      persona={persona}
      lunaThinking={lunaThinking}
      fallbackText={currentStep.statusText}
      branchOverlay={branchOverlay}
    />
  );
}
