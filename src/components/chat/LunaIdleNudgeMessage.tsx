'use client';

/**
 * v117.6 — Idle Nudge
 *
 * 영상+카톡 인사 시퀀스 끝나고 (readyForReply=true) 사용자가 10초+ 입력 없으면
 * 루나가 typing... 후 따뜻한 한 줄 더 보냄.
 *
 * 진짜 카톡 친구가 답장 안 오면 한 번 더 보내는 자연스러운 패턴.
 *
 * 규칙:
 * - 세션당 1회만 발동 (firedRef 영구 락)
 * - 사용자가 답장 보냈으면 (suppress) 발동 X / 진행 중이면 표시까지는 진행
 * - tarot 페르소나 등 → disabled
 * - 백그라운드 탭이면 메시지는 표시하되 사운드/햅틱 스킵
 *
 * 시각 톤: LunaGreetingMessage 와 동일한 카톡 버블 (avatar + bubble + 시간) 재현 — 자연스럽게 다음 메시지처럼.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { LunaMood } from '@/lib/luna-life/mood';
import { pickIdleNudge } from '@/lib/luna-life/whispers';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';

interface Props {
  mood: LunaMood;
  recentSessionCount24h: number;
  intimacyLevel: number;
  ageDays: number;
  /** 인사 시퀀스 모두 도착 (readyForReply=true) → 10초 idle 카운트 시작 */
  startTimer: boolean;
  /** messages.length > 0 등 — 사용자가 이미 응답 → nudge 영구 비활성 */
  suppress: boolean;
  /** tarot 페르소나 등 — 발동 X */
  disabled?: boolean;
}

const IDLE_MS = 10_000;
const TYPING_MS = 700;

type SlotState = 'hidden' | 'typing' | 'shown';

function nowKstHourMin(): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000;
  const d = new Date(ms);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${hh}:${m}`;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 bg-white rounded-[18px] rounded-tl-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E8DCC9]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-[6px] h-[6px] rounded-full bg-[#A0784B]/60"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export default function LunaIdleNudgeMessage({
  mood,
  recentSessionCount24h,
  intimacyLevel,
  // ageDays 는 향후 후속 v117.7 (긴 함께한 일수 톤 보강) 에서 사용 예정
  ageDays: _ageDays,
  startTimer,
  suppress,
  disabled,
}: Props) {
  const [state, setState] = useState<SlotState>('hidden');
  const [text, setText] = useState<string>('');
  const firedRef = useRef(false);

  // suppress → 영구 락 (재발동 방지)
  useEffect(() => {
    if (suppress) {
      firedRef.current = true;
    }
  }, [suppress]);

  // 메인 타이머
  useEffect(() => {
    if (disabled) return;
    if (suppress) return;
    if (!startTimer) return;
    if (firedRef.current) return;
    if (state !== 'hidden') return;

    let typingTimer: ReturnType<typeof setTimeout> | null = null;

    const idleTimer = setTimeout(() => {
      // 발동 직전 재확인 — suppress 가 됐으면 패스
      if (firedRef.current) return;
      firedRef.current = true;

      const nudge = pickIdleNudge({
        mood,
        recentSessionCount24h,
        intimacyLevel,
        seed: Math.floor(Date.now() / 1000),
      });
      setText(nudge);
      setState('typing');

      typingTimer = setTimeout(() => {
        setState('shown');
        // 백그라운드 탭이면 알림 자체는 표시되 사운드/햅틱은 스킵
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          triggerHaptic('light');
          playSound('ping');
        }
      }, TYPING_MS);
    }, IDLE_MS);

    return () => {
      clearTimeout(idleTimer);
      if (typingTimer) clearTimeout(typingTimer);
    };
    // state 는 의존성에서 제외 — hidden→typing 전환 시 effect 재실행 방지 (타이머 새로 안 걸리도록)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTimer, suppress, disabled, mood, recentSessionCount24h, intimacyLevel]);

  if (state === 'hidden') return null;

  return (
    <div className="flex flex-col px-3 mt-1 mb-2">
      <AnimatePresence mode="wait">
        {state === 'typing' && (
          <motion.div
            key="nudge-typing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-end gap-1.5 mb-1.5"
          >
            <div className="w-9 h-9 rounded-[14px] bg-[#F4EFE6] flex items-center justify-center overflow-hidden border border-[#EACBB3] flex-shrink-0">
              <img
                src="/luna_fox_transparent.webp"
                alt="루나"
                className="w-full h-full object-cover"
              />
            </div>
            <TypingDots />
          </motion.div>
        )}
      </AnimatePresence>

      {state === 'shown' && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end gap-1.5 mb-1.5"
        >
          <div className="w-9 h-9 rounded-[14px] bg-[#F4EFE6] flex items-center justify-center overflow-hidden border border-[#EACBB3] flex-shrink-0">
            <img
              src="/luna_fox_transparent.webp"
              alt="루나"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-end gap-1.5">
            <div
              className="px-3.5 py-2 bg-white rounded-[18px] rounded-tl-[6px] border border-[#E8DCC9] max-w-[280px]"
              style={{ boxShadow: '0 1px 3px rgba(180,140,90,0.08)' }}
            >
              <p
                className="text-[14px] text-[#3A2B1A] leading-[1.45]"
                style={{ wordBreak: 'keep-all' }}
              >
                {text}
              </p>
            </div>
            <span className="text-[10px] text-[#A0784B]/60 mb-0.5 whitespace-nowrap">
              {nowKstHourMin()}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
