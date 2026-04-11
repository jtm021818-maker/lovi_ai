'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 v39: 🎯 ACTION_PLAN — "오늘의 작전" 카드 (SOLVE 마무리)
 *
 * BRIDGE에서 모드별로 같이 만든 결과(카톡 초안/롤플 멘트/연참 조언/유저 아이디어)를
 * 한 장의 실전 작전 카드로 확정. 친한 언니가 같이 짜준 느낌.
 *
 * UX 포인트:
 * - 주황/라임 계열 gradient (에너지 있는 "자 해보자" 톤)
 * - 🎯 타이틀 → 핵심 액션 → 같이 만든 내용 → (플랜B) → (타이밍) → 루나 응원
 * - 2 선택지: "좋아 해볼래" / "조금만 수정"
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

export default function ActionPlan({ event, onSelect, disabled }: ActionPlanProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const data = event.data as {
    planType?: 'kakao_draft' | 'roleplay' | 'panel' | 'custom';
    title?: string;
    coreAction?: string;
    sharedResult?: string;
    planB?: string;
    timingHint?: string;
    lunaCheer?: string;
    options?: ActionPlanOption[];
  };

  const planType = data.planType ?? 'custom';
  const title = data.title ?? '오늘의 작전';
  const coreAction = data.coreAction ?? '';
  const sharedResult = data.sharedResult ?? '';
  const planB = data.planB ?? '';
  const timingHint = data.timingHint ?? '';
  const lunaCheer = data.lunaCheer ?? '해보고 꼭 알려줘!';
  const options = data.options ?? [
    { label: '좋아, 해볼래', emoji: '🔥', value: 'commit' as const },
    { label: '조금만 수정', emoji: '✏️', value: 'tweak' as const },
  ];

  const handleSelect = (option: ActionPlanOption) => {
    if (disabled || done) return;
    setSelected(option.value);
    setTimeout(() => {
      setDone(true);
      onSelect(
        option.value === 'commit'
          ? '🔥 좋아, 해볼래!'
          : '✏️ 조금만 수정하자',
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
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.2 }}
      className="mx-4 my-4"
    >
      <div
        className="relative rounded-3xl border-2 shadow-xl overflow-hidden p-5"
        style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, #fef3c7 100%)',
          borderColor: 'rgba(249, 115, 22, 0.45)',
        }}
      >
        {/* 배경 에너지 스파크 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-orange-400/40"
              style={{ left: `${12 + i * 14}%`, top: `${18 + (i % 3) * 28}%` }}
              animate={{
                opacity: [0.2, 0.7, 0.2],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>

        {/* 헤더 — 루나 + 작전 배지 */}
        <div className="relative flex items-center gap-2.5 mb-4">
          <div className="relative">
            <div
              className="w-11 h-11 flex-shrink-0 border-2 border-orange-400 overflow-hidden bg-white shadow-md"
              style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
            >
              <img src="/char_img/luna_1_event.png" alt="루나" className="w-full h-full object-cover" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="absolute -right-1 -top-1 text-[10px] bg-orange-500 text-white rounded-full px-1.5 py-0.5 font-bold shadow"
            >
              🎯
            </motion.div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-orange-700 flex items-center gap-1.5">
              <span>🎯 오늘의 작전</span>
              <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                {PLAN_ICON[planType]} {PLAN_LABEL[planType]}
              </span>
            </div>
            <div className="text-[11px] text-orange-500/90 truncate">같이 짠 작전이야 — 해보자</div>
          </div>
        </div>

        {/* 타이틀 */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 mb-3 border border-orange-200/60 shadow-sm"
        >
          <div className="text-[10px] font-bold text-orange-500 mb-1 flex items-center gap-1">
            <span>📌</span>
            <span>작전 이름</span>
          </div>
          <p className="text-[14px] font-bold text-gray-800 leading-snug">{title}</p>
        </motion.div>

        {/* 핵심 액션 */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-gradient-to-r from-orange-100/80 to-amber-100/80 rounded-2xl p-3 mb-3 border border-orange-300/50"
        >
          <div className="text-[10px] font-bold text-orange-700 mb-1 flex items-center gap-1">
            <span>🔥</span>
            <span>핵심 액션</span>
          </div>
          <p className="text-[13px] text-gray-800 leading-relaxed font-semibold">
            {coreAction}
          </p>
        </motion.div>

        {/* 같이 만든 내용 */}
        {sharedResult && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/70 rounded-2xl p-3 mb-3 border border-orange-200/50"
          >
            <div className="text-[10px] font-bold text-orange-600 mb-1 flex items-center gap-1">
              <span>💡</span>
              <span>우리가 같이 만든 거</span>
            </div>
            <p className="text-[12px] text-gray-700 leading-relaxed italic whitespace-pre-line">
              {sharedResult}
            </p>
          </motion.div>
        )}

        {/* 타이밍 힌트 */}
        {timingHint && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="bg-yellow-50/80 rounded-2xl px-3 py-2 mb-2 border border-yellow-200/50 flex items-center gap-2"
          >
            <span className="text-sm">⏰</span>
            <p className="text-[11px] text-yellow-800 leading-relaxed flex-1">{timingHint}</p>
          </motion.div>
        )}

        {/* 플랜 B */}
        {planB && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="bg-slate-50/80 rounded-2xl px-3 py-2 mb-3 border border-slate-200/50 flex items-start gap-2"
          >
            <span className="text-sm mt-0.5">🛟</span>
            <div className="flex-1">
              <div className="text-[10px] font-bold text-slate-500 mb-0.5">만약 잘 안 되면</div>
              <p className="text-[11px] text-slate-700 leading-relaxed">{planB}</p>
            </div>
          </motion.div>
        )}

        {/* 루나 응원 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0 }}
          className="bg-gradient-to-r from-pink-50/70 to-purple-50/70 rounded-2xl p-3 mb-4 border border-pink-200/50"
        >
          <div className="text-[10px] font-bold text-pink-600 mb-1 flex items-center gap-1">
            <span>💜</span>
            <span>루나의 한마디</span>
          </div>
          <p className="text-[12px] text-pink-800 leading-relaxed italic">&ldquo;{lunaCheer}&rdquo;</p>
        </motion.div>

        {/* 선택 옵션 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15 }}
          className="flex gap-2"
        >
          {options.map((option, idx) => (
            <motion.button
              key={option.value}
              whileHover={!disabled && !done ? { scale: 1.02 } : {}}
              whileTap={!disabled && !done ? { scale: 0.98 } : {}}
              onClick={() => handleSelect(option)}
              disabled={disabled || done}
              className={`flex-1 py-3 rounded-2xl font-bold text-[13px] transition-all ${
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

        <div className="text-center mt-3">
          <span className="text-[9px] text-orange-500/80">🔥 같이 짠 작전이야 — 넌 혼자가 아니야</span>
        </div>
      </div>
    </motion.div>
  );
}
