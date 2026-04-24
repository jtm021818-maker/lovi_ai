'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * v88: ActionPlan — 언니가 카톡으로 작전 정리해주는 대화형 UI
 *
 * stiff plan card 제거 → 순차 bubble chain으로 전환.
 * coreAction: dots(500ms) → shimmer reveal (강조 느낌).
 * 나머지 필드: 자연스러운 언니 말투 bubble.
 */

interface ActionPlanOption {
  label: string;
  emoji: string;
  value: 'commit' | 'tweak';
}

interface ActionPlanProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function LunaAvatar() {
  return (
    <div
      className="w-8 h-8 flex-shrink-0 border border-orange-300/60 overflow-hidden bg-white shadow-sm"
      style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
    >
      <img src="/char_img/luna_1_event.webp" alt="루나" className="w-full h-full object-cover" />
    </div>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <span className="flex gap-1 items-center h-5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-orange-400"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

// ─── Bubble variants ──────────────────────────────────────────────────────────
const BUBBLE_STYLE: Record<string, React.CSSProperties> = {
  default: { background: '#F4EFE6', borderColor: '#D5C2A5' },
  core:    { background: 'linear-gradient(135deg, #FFF7ED 0%, #FEF3C7 100%)', borderColor: '#FDBA74' },
  quote:   { background: '#FFFBF5', borderColor: '#E8D8C5' },
  timing:  { background: '#FFFDF0', borderColor: '#FDE68A' },
  planb:   { background: '#F8F9FB', borderColor: '#CBD5E1' },
  joke:    { background: '#FFFBEA', borderColor: '#FDE68A' },
  cheer:   { background: 'linear-gradient(135deg, #FDF2F8 0%, #F5F3FF 100%)', borderColor: '#F9A8D4' },
};

function LunaBubble({
  children,
  delayMs = 0,
  variant = 'default',
  showAvatar = true,
}: {
  children: React.ReactNode;
  delayMs?: number;
  variant?: keyof typeof BUBBLE_STYLE;
  showAvatar?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ delay: delayMs / 1000, type: 'spring', stiffness: 220, damping: 20 }}
      className="flex items-end gap-2"
    >
      {showAvatar ? <LunaAvatar /> : <div className="w-8 shrink-0" />}
      <div
        className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm border max-w-[83%] text-[13px] text-[#4E342E] leading-relaxed"
        style={BUBBLE_STYLE[variant]}
      >
        {children}
      </div>
    </motion.div>
  );
}

// ─── Core action bubble — dots → shimmer reveal ───────────────────────────────
function CoreActionBubble({
  title, coreAction, planType, delayMs,
}: {
  title: string;
  coreAction: string;
  planType: string;
  delayMs: number;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), delayMs + 520);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const PLAN_LABEL: Record<string, string> = {
    kakao_draft: '카톡 작전', roleplay: '롤플 작전', custom: '커스텀 작전',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ delay: delayMs / 1000, type: 'spring', stiffness: 220, damping: 20 }}
      className="flex items-end gap-2"
    >
      <LunaAvatar />
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="dots"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm border min-h-[44px] flex items-center"
            style={BUBBLE_STYLE.core}
          >
            <TypingDots />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative overflow-hidden px-3.5 py-3 rounded-2xl rounded-tl-sm border max-w-[83%]"
            style={{
              ...BUBBLE_STYLE.core,
              boxShadow: '0 2px 14px rgba(249,115,22,0.13)',
            }}
          >
            {/* One-time shimmer sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.12) 50%, transparent 100%)',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: '220%' }}
              transition={{ duration: 1.0, ease: 'easeInOut' }}
            />

            {/* Plan type tag */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] font-bold text-orange-500">🎯 오늘의 작전</span>
              {PLAN_LABEL[planType] && (
                <span className="text-[9px] font-semibold text-orange-400/80 bg-orange-100/70 px-1.5 py-0.5 rounded-full">
                  {PLAN_LABEL[planType]}
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-[14px] font-bold text-gray-800 leading-snug mb-2.5">{title}</p>

            {/* Core action highlight */}
            <div className="bg-orange-100/60 rounded-xl px-3 py-2 border border-orange-200/60">
              <p className="text-[9px] font-bold text-orange-600 mb-0.5 uppercase tracking-wide">핵심 액션</p>
              <p className="text-[13px] text-gray-800 font-semibold leading-relaxed">{coreAction}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── User reply bubble ────────────────────────────────────────────────────────
function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="flex justify-end"
    >
      <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-[#F97316] text-white text-[13px] max-w-[72%] leading-relaxed font-medium">
        {text}
      </div>
    </motion.div>
  );
}

// ─── Chip button ──────────────────────────────────────────────────────────────
function Chip({
  label, emoji, primary = false, disabled = false, onClick,
}: {
  label: string; emoji: string; primary?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.91 } : {}}
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2.5 rounded-2xl text-[13px] font-bold transition-opacity"
      style={primary
        ? { background: '#F97316', color: '#fff', opacity: disabled ? 0.45 : 1 }
        : { background: 'white', color: '#F97316', border: '1.5px solid #FDBA7499', opacity: disabled ? 0.45 : 1 }
      }
    >
      <span className="mr-1">{emoji}</span>{label}
    </motion.button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ActionPlan({ event, onSelect, disabled }: ActionPlanProps) {
  const [userSaid, setUserSaid] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = event.data as {
    planType?: string;
    lunaIntro?: string;
    title?: string;
    coreAction?: string;
    sharedResult?: string;
    planB?: string;
    timingHint?: string;
    lunaJoke?: string;
    lunaCheer?: string;
    options?: ActionPlanOption[];
  };

  const planType    = data.planType    ?? 'custom';
  const lunaIntro   = data.lunaIntro?.trim()  ?? '';
  const title       = data.title       ?? '오늘의 작전';
  const coreAction  = data.coreAction  ?? '';
  const sharedResult = data.sharedResult ?? '';
  const planB       = data.planB       ?? '';
  const timingHint  = data.timingHint  ?? '';
  const lunaJoke    = data.lunaJoke?.trim()   ?? '';
  const lunaCheer   = data.lunaCheer   ?? '해보고 꼭 알려줘!';
  const options     = data.options     ?? [
    { label: '좋아, 해볼래', emoji: '🔥', value: 'commit' as const },
    { label: '조금만 수정', emoji: '✏️', value: 'tweak' as const },
  ];

  // ── Build timing sequence ──
  const GAP = 460; // ms between bubbles
  let t = 0;
  const introDelay  = t; if (lunaIntro)    t += GAP;
  const coreDelay   = t; t += 520 + 500;   // dots(520) + reveal-settle(500)
  const sharedDelay = t; if (sharedResult) t += GAP;
  const timingDelay = t; if (timingHint)   t += GAP - 60;
  const planBDelay  = t; if (planB)        t += GAP - 60;
  const jokeDelay   = t; if (lunaJoke)     t += GAP;
  const cheerDelay  = t; t += GAP;
  const chipsDelay  = t;

  const handleSelect = (option: ActionPlanOption) => {
    if (disabled || userSaid) return;
    const label = `${option.emoji} ${option.label}`;
    setUserSaid(label);
    setTimeout(() => {
      setDone(true);
      onSelect(label, {
        source: 'action_plan' as any,
        context: { choice: option.value, planType, title, coreAction },
      });
    }, 500);
  };

  // Completed state
  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2.5 mx-4 my-3 px-3.5 py-2.5 rounded-2xl border"
        style={{ background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)', borderColor: '#FDBA74' }}
      >
        <motion.span
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 1.4, repeat: 2 }}
          className="text-[18px]"
        >
          🎯
        </motion.span>
        <div>
          <p className="text-[11px] font-bold text-orange-600">작전 확정!</p>
          <p className="text-[12px] text-gray-700 font-semibold">{title}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-3 my-3 space-y-2.5">

      {/* 1. Luna intro — situation summary */}
      {lunaIntro && (
        <LunaBubble delayMs={introDelay}>
          <p className="whitespace-pre-line">{lunaIntro}</p>
        </LunaBubble>
      )}

      {/* 2. Core action — dots → shimmer reveal (the "big moment") */}
      <CoreActionBubble
        title={title}
        coreAction={coreAction}
        planType={planType}
        delayMs={coreDelay}
      />

      {/* 3. Shared result — "우리가 같이 만든 거" */}
      {sharedResult && (
        <LunaBubble delayMs={sharedDelay} variant="quote" showAvatar={false}>
          <p className="text-[10px] font-bold text-orange-400 mb-1">💡 우리가 같이 만든 거야</p>
          <p className="italic text-[12px] text-[#6D4C41] leading-relaxed whitespace-pre-line">
            {sharedResult}
          </p>
        </LunaBubble>
      )}

      {/* 4. Timing hint */}
      {timingHint && (
        <LunaBubble delayMs={timingDelay} variant="timing" showAvatar={false}>
          <span className="text-[12px]">⏰ </span>
          <span className="font-medium">타이밍은 — {timingHint}</span>
        </LunaBubble>
      )}

      {/* 5. Plan B */}
      {planB && (
        <LunaBubble delayMs={planBDelay} variant="planb" showAvatar={false}>
          <p className="text-[10px] font-semibold text-slate-400 mb-0.5">혹시 잘 안 되면 🛟</p>
          <p>{planB}</p>
        </LunaBubble>
      )}

      {/* 6. Luna joke — 긴장 완화 */}
      {lunaJoke && (
        <LunaBubble delayMs={jokeDelay} variant="joke">
          <p className="text-[10px] font-semibold text-amber-500 mb-0.5">😏 솔직히 말하면</p>
          <p>{lunaJoke}</p>
        </LunaBubble>
      )}

      {/* 7. Luna cheer — emotional peak */}
      <LunaBubble delayMs={cheerDelay} variant="cheer">
        <p className="text-[10px] font-bold text-pink-500 mb-1">💜 루나가 믿어</p>
        <p className="italic text-[#6D4C41]">"{lunaCheer}"</p>
      </LunaBubble>

      {/* 8. User reply bubble */}
      <AnimatePresence>
        {userSaid && <UserBubble key="user" text={userSaid} />}
      </AnimatePresence>

      {/* 9. Quick-reply chips */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: chipsDelay / 1000, duration: 0.28, ease: 'easeOut' }}
        className="flex gap-2 ml-10"
      >
        {options.map((opt, idx) => (
          <Chip
            key={opt.value}
            label={opt.label}
            emoji={opt.emoji}
            primary={idx === 0}
            disabled={disabled || !!userSaid}
            onClick={() => handleSelect(opt)}
          />
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: chipsDelay / 1000 + 0.3 }}
        className="text-center text-[9px] text-orange-400/70 pb-1"
      >
        🔥 같이 짠 작전이야 — 넌 혼자가 아니야
      </motion.p>
    </div>
  );
}
