'use client';

/**
 * 🎯 v82.11: Luna Strategy Auto-Decision UI
 *
 * BRIDGE phase 진입 시, 기존 5-카드 ModeSelector 대신
 * Luna 가 언니 관점으로 직접 판단 → 자동 선택.
 *
 * 3-Phase 연출:
 *   A) thinking  (0~2.5s)  — 고민 중 애니메이션 + API 병렬 호출
 *   B) reveal    (~4.5s)    — "이걸로 가자!" 결정 카드
 *   C) autoEnter (4.5s~)    — onDecide(mode) 콜백으로 자동 진입
 *
 * Escape: "다른 방법 보여줘" → fallback 로 수동 ModeSelector 표시
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ModeId } from '@/engines/bridge-modes/types';
import LunaSprite from '@/components/common/LunaSprite';

type StrategyMode = 'browse_together' | 'draft' | 'panel' | 'roleplay';


interface StrategyDecision {
  mode: StrategyMode;
  reasoning: string;
  opener: string;
  confidence: number;
}

interface LunaStrategyDecisionProps {
  /** LUNA_STRATEGY 이벤트 data */
  situationSummary: string;
  opener?: string;
  /** 최근 대화 히스토리 (맥락 전달용) */
  recentHistory?: Array<{ role: 'user' | 'ai'; content: string }>;
  /** 결정된 모드로 자동 진입 */
  onDecide: (mode: ModeId, enrichedOpener: string, reasoning: string) => void;
  /** 유저가 "다른 방법 보여줘" 눌렀을 때 */
  onEscape: () => void;
}

// 모드 메타데이터 (아이콘/라벨/색감)
const MODE_META: Record<StrategyMode, { emoji: string; label: string; color: string; bg: string; accent: string }> = {
  browse_together: {
    emoji: '🔍',
    label: '같이 찾아보기',
    color: '#0284c7',
    bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    accent: 'rgba(2,132,199,0.5)',
  },
  draft: {
    emoji: '✏️',
    label: '메시지 초안 짜기',
    color: '#d97706',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    accent: 'rgba(217,119,6,0.5)',
  },
  panel: {
    emoji: '👥',
    label: '3인 패널 의견',
    color: '#059669',
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    accent: 'rgba(5,150,105,0.5)',
  },
  roleplay: {
    emoji: '🎭',
    label: '롤플레이 연습',
    color: '#db2777',
    bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
    accent: 'rgba(219,39,119,0.5)',
  },
};

// Phase A 교체 텍스트
const THINKING_PHRASES = [
  '음...',
  '잠깐, 네 상황 다시 보자',
  '하나 떠올랐어',
  '이걸로 가자!',
];

export default function LunaStrategyDecision({
  situationSummary,
  recentHistory,
  onDecide,
  onEscape,
}: LunaStrategyDecisionProps) {
  const [phase, setPhase] = useState<'thinking' | 'reveal' | 'entering'>('thinking');
  const [decision, setDecision] = useState<StrategyDecision | null>(null);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [apiError, setApiError] = useState(false);
  const calledRef = useRef(false);

  // Phase A: API 호출 + 교체 텍스트 로테이션
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    // 교체 텍스트 타이머 (600ms 간격)
    const phraseTimers: ReturnType<typeof setTimeout>[] = [];
    THINKING_PHRASES.forEach((_, i) => {
      if (i === 0) return;
      phraseTimers.push(setTimeout(() => setPhraseIdx(i), i * 600));
    });

    // API 호출 (병렬)
    fetch('/api/mode/strategy/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ situationSummary, recentHistory: recentHistory ?? [] }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((d: StrategyDecision) => {
        setDecision(d);
      })
      .catch((e) => {
        console.warn('[LunaStrategyDecision] API 실패 — draft 폴백:', e);
        setDecision({
          mode: 'draft',
          reasoning: '실제 보낼 말 같이 써보자',
          opener: '자 이제 같이 써보자',
          confidence: 0.5,
        });
        setApiError(true);
      });

    return () => { phraseTimers.forEach(clearTimeout); };
  }, [situationSummary, recentHistory]);

  // Phase A → B 전환 (최소 2초 + API 완료). thinking 페이즈가 너무 오래 끌면 유저가 답답함.
  useEffect(() => {
    if (!decision) return;
    const timer = setTimeout(() => setPhase('reveal'), 1800);
    return () => clearTimeout(timer);
  }, [decision]);

  // 🆕 v82.12: Phase B → C 자동 진입 시간 2s → 8s 로 대폭 늘림.
  //   유저가 이모지/타이틀/라벨/reasoning 순차 등장 다 읽고 "바로 시작" 탭할 시간 확보.
  //   또는 카운트다운 진행 바가 채워지면 자동 진입.
  const AUTO_ENTER_MS = 8000;
  useEffect(() => {
    if (phase !== 'reveal' || !decision) return;
    const timer = setTimeout(() => {
      setPhase('entering');
      onDecide(decision.mode as ModeId, decision.opener, decision.reasoning);
    }, AUTO_ENTER_MS);
    return () => clearTimeout(timer);
  }, [phase, decision, onDecide]);

  const meta = decision ? MODE_META[decision.mode] : null;

  return (
    <div className="my-3 max-w-[92%] mx-auto">
      <AnimatePresence mode="wait">
        {/* ─────────── Phase A: thinking ─────────── */}
        {phase === 'thinking' && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="flex items-start gap-2"
          >
            {/* Luna 아바타 (생각 중 애니) */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative shrink-0 mt-1"
            >
              <LunaSprite className="border border-[#EACbb3]" />
              {/* 생각 버블 이모지 */}
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="absolute -top-1 -right-1 text-[14px]"
              >
                💭
              </motion.div>
            </motion.div>

            <div className="flex-1">
              <div className="text-[11px] font-bold text-[#5D4037] ml-1 mb-1">루나 작전회의 중</div>
              <motion.div
                className="px-4 py-3 rounded-[20px] rounded-tl-[4px] border shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #fffaf0 0%, #fef3c7 100%)',
                  borderColor: 'rgba(217,119,6,0.3)',
                }}
              >
                {/* 교체 텍스트 */}
                <div className="flex items-center gap-2 min-h-[24px]">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={phraseIdx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      className="text-[13.5px] font-bold text-[#4E342E]"
                    >
                      {THINKING_PHRASES[phraseIdx]}
                    </motion.span>
                  </AnimatePresence>

                  {/* 3-dot bouncing */}
                  <div className="flex gap-0.5 ml-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        className="w-1.5 h-1.5 rounded-full bg-amber-500"
                      />
                    ))}
                  </div>
                </div>

                {/* 주변 파티클 */}
                <div className="relative h-0">
                  {['✨', '💡', '🦊'].map((p, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], x: [0, 20 - i * 10, 30 - i * 20], y: [0, -10, -20] }}
                      transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                      className="absolute text-[12px] pointer-events-none"
                      style={{ left: `${30 + i * 25}%`, top: 0 }}
                    >
                      {p}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ─────────── Phase B: reveal (결정 카드) ─────────── */}
        {phase === 'reveal' && decision && meta && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="flex items-start gap-2"
          >
            {/* Luna 아바타 (당당 모드) */}
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: [0, -6, 6, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="relative shrink-0 mt-1"
            >
              <LunaSprite className="border-2" size={40} style={{ borderColor: meta.accent }} />
              {/* 결정 배지 */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, delay: 0.2 }}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm"
                style={{ background: meta.color }}
              >
                ✓
              </motion.div>
            </motion.div>

            <div className="flex-1">
              <div className="text-[11px] font-bold ml-1 mb-1" style={{ color: meta.color }}>
                루나 결정 · confidence {Math.round(decision.confidence * 100)}%
              </div>

              <motion.div
                className="rounded-[20px] rounded-tl-[4px] border-2 shadow-md overflow-hidden"
                style={{ background: meta.bg, borderColor: meta.accent }}
                initial={{ boxShadow: `0 0 0 ${meta.accent}` }}
                animate={{ boxShadow: [`0 0 0 ${meta.accent}`, `0 0 24px ${meta.accent}`, `0 0 8px ${meta.accent}`] }}
                transition={{ duration: 1.2 }}
              >
                {/* 상단 — 큼지막한 이모지 + 타이틀 */}
                <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: [0, 1.3, 1], rotate: [0, 10, 0] }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.15 }}
                    className="text-4xl"
                  >
                    {meta.emoji}
                  </motion.div>
                  <div className="flex-1">
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-[10px] tracking-[0.25em] uppercase font-bold"
                      style={{ color: meta.color, opacity: 0.7 }}
                    >
                      이걸로 가자!
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-[15px] font-extrabold leading-tight"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </motion.div>
                  </div>
                </div>

                {/* 이유 (Luna reasoning) */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="mx-3 mb-2 px-3 py-2 rounded-xl text-[12.5px] leading-relaxed font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.55)',
                    color: '#3f2a20',
                    border: `1px solid ${meta.accent}`,
                  }}
                >
                  <span className="text-[10px] font-bold mr-1.5" style={{ color: meta.color }}>🦊 루나</span>
                  {decision.reasoning}
                </motion.div>

                {/* 🆕 v82.12: 카운트다운 진행 바 — 유저가 "얼마 남았는지" 시각적으로 알 수 있게 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.4 }}
                  className="px-4"
                >
                  <div className="relative h-[3px] rounded-full overflow-hidden" style={{ background: `${meta.accent}22` }}>
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: AUTO_ENTER_MS / 1000, ease: 'linear' }}
                      className="absolute left-0 top-0 bottom-0 rounded-full"
                      style={{ background: meta.color, boxShadow: `0 0 8px ${meta.accent}` }}
                    />
                  </div>
                </motion.div>

                {/* 하단 CTA + 여유 멘트 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  className="px-4 py-3 flex items-center justify-between gap-2"
                >
                  <div className="text-[10.5px] font-semibold" style={{ color: meta.color, opacity: 0.85 }}>
                    ⏱ 준비 되면 탭해
                  </div>
                  <button
                    onClick={() => {
                      setPhase('entering');
                      onDecide(decision.mode as ModeId, decision.opener, decision.reasoning);
                    }}
                    className="px-4 py-2 rounded-full text-[12px] font-bold text-white active:scale-95 transition-transform"
                    style={{ background: meta.color, boxShadow: `0 2px 12px ${meta.accent}` }}
                  >
                    바로 시작 →
                  </button>
                </motion.div>
              </motion.div>

              {/* Escape — 다른 방법 보여줘 */}
              <button
                onClick={onEscape}
                className="mt-1.5 ml-1 text-[10px] text-[#6D4C41]/60 hover:text-[#B56576] underline underline-offset-2"
              >
                다른 방법으로 할래
              </button>

              {apiError && (
                <div className="ml-1 mt-0.5 text-[9px] text-amber-700/60">⚠️ 자동 판단 실패 → 기본 전략 선택</div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─────────── Phase C: entering (사라짐) ─────────── */}
        {phase === 'entering' && (
          <motion.div
            key="entering"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-4"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
