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

/** 수정구슬 아이콘 (BRIDGE: 원인 발견) */
const CrystalBallIcon = ({ active, past }: { active: boolean; past: boolean }) => (
  <svg viewBox="0 0 40 40" className="w-full h-full">
    {/* 구슬 */}
    <circle cx="20" cy="18" r="13"
      fill={active ? '#eff6ff' : past ? '#f0f9ff' : '#f8fafc'}
      stroke={active ? '#3b82f6' : past ? '#93c5fd' : '#cbd5e1'}
      strokeWidth="1.5" />
    {/* 구슬 반짝임 */}
    <ellipse cx="14" cy="13" rx="3" ry="2" fill={active ? '#bfdbfe' : past ? '#dbeafe' : '#e2e8f0'} opacity="0.7" />
    {/* 별 */}
    <path d="M20 14 L21 17 L24 17 L22 19 L23 22 L20 20 L17 22 L18 19 L16 17 L19 17 Z"
      fill={active ? '#60a5fa' : past ? '#93c5fd' : '#cbd5e1'}
      stroke="none" />
    {/* 받침대 */}
    <path d="M13 32 L27 32 L24 28 L16 28 Z"
      fill={active ? '#dbeafe' : past ? '#e0f2fe' : '#f1f5f9'}
      stroke={active ? '#3b82f6' : past ? '#93c5fd' : '#cbd5e1'}
      strokeWidth="1.2" strokeLinejoin="round" />
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

const LUNA_STEPS: PhaseStep[] = [
  { id: 'HOOK',    label: '이야기 듣기',  statusText: '루나가 듣고 있어 🦊',      Icon: FoxEarIcon },
  { id: 'MIRROR',  label: '마음 읽기',    statusText: '마음을 읽는 중 💕',        Icon: HeartLensIcon },
  { id: 'BRIDGE',  label: '원인 발견',    statusText: '원인을 찾고 있어 🔮',      Icon: CrystalBallIcon },
  { id: 'SOLVE',   label: '처방전 준비',  statusText: '처방전 쓰는 중 🌿',        Icon: SproutIcon },
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
}

export default function PhaseProgress({ currentPhase, progress, persona = 'luna' }: PhaseProgressProps) {
  if (!currentPhase) return null;

  const steps = persona === 'tarot' ? TAROT_STEPS : LUNA_STEPS;
  const currentIndex = steps.findIndex(p => p.id === currentPhase);
  // 타로냥: MIRROR phase → HOOK으로 매핑 (MIRROR 스킵하므로)
  const adjustedIndex = currentIndex === -1 && persona === 'tarot' && currentPhase === 'MIRROR'
    ? steps.findIndex(p => p.id === 'HOOK')
    : currentIndex;
  const idx = adjustedIndex === -1 ? 0 : adjustedIndex;

  const currentStep = steps[idx];
  const typedStatus = useTypewriter(currentStep.statusText, 70);

  // 전체 진행도 계산 (N phase × 등분)
  const stepSize = 100 / steps.length;
  const basePercent = idx * stepSize;
  const phasePercent = (progress / 100) * stepSize;
  const totalPercent = Math.min(100, Math.max(0, basePercent + phasePercent));

  return (
    <div className="w-full sticky top-[60px] z-10">
      {/* 상단 프리미엄 그라디언트 라인 */}
      <div className={`h-[1px] bg-gradient-to-r ${persona === 'tarot' ? 'from-violet-200/60 via-purple-300/40 to-indigo-200/60' : 'from-rose-200/60 via-pink-300/40 to-violet-200/60'}`} />

      <div className={`bg-gradient-to-r ${persona === 'tarot' ? 'from-violet-50/80 via-white/90 to-indigo-50/80 border-b border-violet-100/40 shadow-[0_4px_20px_rgba(124,58,237,0.06)]' : 'from-rose-50/80 via-white/90 to-violet-50/80 border-b border-pink-100/40 shadow-[0_4px_20px_rgba(236,72,153,0.06)]'} backdrop-blur-xl px-2 py-3`}>
        
        {/* 5단계 스텝퍼 영역 */}
        <div className="flex justify-between items-start w-full px-1 mb-1.5 relative">
          
          {/* 진행선 배경 (비활성) */}
          <div className={`absolute left-[10%] right-[10%] top-[14px] h-[3px] ${persona === 'tarot' ? 'bg-violet-50/80' : 'bg-pink-50/80'} z-0 rounded-full`} />

          {/* 진행선 활성 (파스텔 그라디언트 + 현재 위치 글로우 점) */}
          <motion.div
            className={`absolute left-[10%] top-[14px] h-[3px] bg-gradient-to-r ${persona === 'tarot' ? 'from-violet-300 via-purple-400 to-indigo-400' : 'from-rose-300 via-pink-400 to-violet-400'} z-[1] rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, totalPercent - 10)}%` }}
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
