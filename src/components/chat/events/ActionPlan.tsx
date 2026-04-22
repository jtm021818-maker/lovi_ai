'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 v86: 🎯 ACTION_PLAN — 말풍선 체인 + 미니 작전카드
 *
 * 이전(v39)의 큼직한 단일 카드 → "루나가 정리해주는 카톡 대화" 느낌.
 * - 루나 말풍선(lunaIntro: 대화 종합) → 작전 미니 카드 → 농담 말풍선 → 응원 말풍선 → 선택 버튼
 * - 말풍선은 기본 Luna 메시지 톤(크림 배경, rounded-2xl) 유지.
 * - 중앙 "오늘의 작전" 미니 카드만 orange 살짝 강조 — 정리되는 느낌.
 * - Framer Motion 으로 순차 등장 (진짜 채팅 받는 느낌).
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

const PLAN_ICON: Record<string, string> = {
  kakao_draft: '💬',
  roleplay: '🎭',
  panel: '🍿',
  custom: '🤔',
};

const PLAN_LABEL: Record<string, string> = {
  kakao_draft: '카톡 작전',
  roleplay: '롤플 작전',
  panel: '연참 작전',
  custom: '내 작전',
};

/** 루나 아바타 + 말풍선 한 덩어리 */
function LunaBubble({
  children,
  delay,
  tone = 'default',
  tag,
}: {
  children: React.ReactNode;
  delay: number;
  tone?: 'default' | 'joke' | 'cheer';
  tag?: string;
}) {
  const toneClasses =
    tone === 'joke'
      ? 'bg-amber-50/90 border-amber-200/60 text-amber-900'
      : tone === 'cheer'
      ? 'bg-gradient-to-br from-pink-50/90 to-purple-50/90 border-pink-200/60 text-pink-900'
      : 'bg-white/90 border-orange-100/70 text-gray-800';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', damping: 22, stiffness: 280 }}
      className="flex items-end gap-2 mb-2.5"
    >
      <div
        className="w-8 h-8 flex-shrink-0 border border-orange-300/60 overflow-hidden bg-white shadow-sm"
        style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
      >
        <img src="/char_img/luna_1_event.webp" alt="루나" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col max-w-[85%]">
        {tag && (
          <span className="text-[10px] font-bold text-orange-500/90 ml-1 mb-0.5">
            {tag}
          </span>
        )}
        <div
          className={`rounded-2xl rounded-bl-sm border px-3.5 py-2.5 shadow-sm ${toneClasses}`}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export default function ActionPlan({ event, onSelect, disabled }: ActionPlanProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = event.data as {
    planType?: 'kakao_draft' | 'roleplay' | 'panel' | 'custom';
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

  const planType = data.planType ?? 'custom';
  const lunaIntro = data.lunaIntro?.trim() ?? '';
  const title = data.title ?? '오늘의 작전';
  const coreAction = data.coreAction ?? '';
  const sharedResult = data.sharedResult ?? '';
  const planB = data.planB ?? '';
  const timingHint = data.timingHint ?? '';
  const lunaJoke = data.lunaJoke?.trim() ?? '';
  const lunaCheer = data.lunaCheer ?? '해보고 꼭 알려줘!';
  const options = data.options ?? [
    { label: '좋아, 해볼래', emoji: '🔥', value: 'commit' as const },
    { label: '조금만 수정', emoji: '✏️', value: 'tweak' as const },
  ];

  // 순차 등장 타이밍
  let t = 0.1;
  const introDelay = t; if (lunaIntro) t += 0.4;
  const cardDelay = t;  t += 0.5;
  const jokeDelay = t;  if (lunaJoke) t += 0.35;
  const cheerDelay = t; t += 0.35;
  const buttonsDelay = t;

  const handleSelect = (option: ActionPlanOption) => {
    if (disabled || done) return;
    setSelected(option.value);
    setTimeout(() => {
      setDone(true);
      onSelect(
        option.value === 'commit' ? '🔥 좋아, 해볼래!' : '✏️ 조금만 수정하자',
        {
          source: 'action_plan' as any,
          context: {
            choice: option.value,
            planType,
            title,
            coreAction,
          },
        },
      );
    }, 400);
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-orange-50/80 to-amber-50/80 rounded-2xl border border-orange-200/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-[12px] font-bold text-orange-700">
            오늘의 작전 — {selected === 'commit' ? '확정! 해보자' : '조금 수정 중'}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-3 my-3">
      {/* lunaIntro — 대화 종합 (언니톤 정리) */}
      {lunaIntro && (
        <LunaBubble delay={introDelay} tag="💬 자 정리해줄게">
          <p className="text-[13px] leading-relaxed whitespace-pre-line">
            {lunaIntro}
          </p>
        </LunaBubble>
      )}

      {/* 미니 작전 카드 — UI 살짝 가미 */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: cardDelay, type: 'spring', damping: 22, stiffness: 260 }}
        className="ml-10 mr-2 my-2"
      >
        <div
          className="relative rounded-2xl border shadow-md overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 60%, #fef3c7 100%)',
            borderColor: 'rgba(249, 115, 22, 0.4)',
          }}
        >
          {/* 헤더 */}
          <div className="flex items-center gap-2 px-3.5 py-2 border-b border-orange-200/40 bg-white/40">
            <motion.span
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-base"
            >
              🎯
            </motion.span>
            <span className="text-[12px] font-bold text-orange-700">오늘의 작전</span>
            <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full ml-auto">
              {PLAN_ICON[planType]} {PLAN_LABEL[planType]}
            </span>
          </div>

          {/* 제목 */}
          <div className="px-3.5 pt-3 pb-2">
            <div className="text-[10px] font-bold text-orange-500 mb-0.5 flex items-center gap-1">
              <span>📌</span><span>작전 이름</span>
            </div>
            <p className="text-[14px] font-bold text-gray-800 leading-snug">{title}</p>
          </div>

          {/* 핵심 액션 */}
          <div className="mx-3 mb-2 bg-gradient-to-r from-orange-100/70 to-amber-100/70 rounded-xl px-3 py-2 border border-orange-300/40">
            <div className="text-[10px] font-bold text-orange-700 mb-0.5 flex items-center gap-1">
              <span>🔥</span><span>핵심 액션</span>
            </div>
            <p className="text-[13px] text-gray-800 leading-relaxed font-semibold">
              {coreAction}
            </p>
          </div>

          {/* 같이 만든 내용 */}
          {sharedResult && (
            <div className="mx-3 mb-2 bg-white/70 rounded-xl px-3 py-2 border border-orange-200/40">
              <div className="text-[10px] font-bold text-orange-600 mb-0.5 flex items-center gap-1">
                <span>💡</span><span>우리가 같이 만든 거</span>
              </div>
              <p className="text-[12px] text-gray-700 leading-relaxed italic whitespace-pre-line">
                {sharedResult}
              </p>
            </div>
          )}

          {/* timing + planB — 나란히 */}
          {(timingHint || planB) && (
            <div className="flex flex-wrap gap-1.5 mx-3 mb-3">
              {timingHint && (
                <div className="flex-1 min-w-[45%] bg-yellow-50/80 rounded-lg px-2.5 py-1.5 border border-yellow-200/50 flex items-center gap-1.5">
                  <span className="text-xs">⏰</span>
                  <p className="text-[11px] text-yellow-800 leading-tight flex-1">{timingHint}</p>
                </div>
              )}
              {planB && (
                <div className="flex-1 min-w-[45%] bg-slate-50/80 rounded-lg px-2.5 py-1.5 border border-slate-200/50 flex items-start gap-1.5">
                  <span className="text-xs mt-0.5">🛟</span>
                  <div className="flex-1">
                    <div className="text-[9px] font-bold text-slate-500">플랜 B</div>
                    <p className="text-[11px] text-slate-700 leading-tight">{planB}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* 농담 말풍선 — 긴장 풀어주기 */}
      {lunaJoke && (
        <LunaBubble delay={jokeDelay} tone="joke" tag="😏 근데 솔직히">
          <p className="text-[13px] leading-relaxed">{lunaJoke}</p>
        </LunaBubble>
      )}

      {/* 루나 응원 말풍선 */}
      <LunaBubble delay={cheerDelay} tone="cheer" tag="💜 루나의 한마디">
        <p className="text-[13px] leading-relaxed italic">&ldquo;{lunaCheer}&rdquo;</p>
      </LunaBubble>

      {/* 선택 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: buttonsDelay }}
        className="flex gap-2 ml-10 mr-2 mt-1"
      >
        {options.map((option, idx) => (
          <motion.button
            key={option.value}
            whileHover={!disabled && !done ? { scale: 1.02 } : {}}
            whileTap={!disabled && !done ? { scale: 0.98 } : {}}
            onClick={() => handleSelect(option)}
            disabled={disabled || done}
            className={`flex-1 py-2.5 rounded-2xl font-bold text-[13px] transition-all ${
              selected === option.value
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl scale-105'
                : idx === 0
                ? 'bg-gradient-to-r from-orange-400 to-amber-400 text-white hover:shadow-md'
                : 'bg-white border-2 border-orange-200 text-orange-600 hover:bg-orange-50'
            }`}
          >
            <span className="mr-1">{option.emoji}</span>
            {option.label}
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: buttonsDelay + 0.2 }}
        className="text-center mt-2"
      >
        <span className="text-[9px] text-orange-500/80">🔥 같이 짠 작전이야 — 넌 혼자가 아니야</span>
      </motion.div>
    </div>
  );
}
