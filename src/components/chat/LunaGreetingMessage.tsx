'use client';

/**
 * 🆕 v112-rev2: 카톡 친구 톡방 — 루나의 인사 메시지 (1~2개)
 *
 * 컨셉: 영상 끝나면 typing → 첫 인사 → typing → 두 번째 메시지 (선택).
 * 카드 X. 카톡 메시지 버블 그대로. iMessage / WhatsApp / 카카오톡 표준.
 *
 * - 카피: whispers.ts (pickGreeting + pickFollowup) 활용
 * - 타이밍: typing 600ms → 메시지 도착 → typing 500ms → 두 번째 도착
 * - 사운드: tiny ping (메시지 도착)
 * - 햅틱: 메시지 도착 시 .light
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { LunaMood } from '@/lib/luna-life/mood';
import { pickGreeting, pickFollowup } from '@/lib/luna-life/whispers';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';

interface Props {
  mood: LunaMood;
  recentSessionCount24h: number;
  intimacyLevel: number;
  ageDays: number;
  /** 영상 끝나면 true — 시퀀스 시작 트리거 */
  startSequence: boolean;
  /** 1~2개 메시지 모두 도착 후 호출 (SmartReplyBar 등장 트리거) */
  onAllShown?: () => void;
}

// ─── KST hour:min ────────────────────────────────────────────────────
function nowKstHourMin(): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000;
  const d = new Date(ms);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${hh}:${m}`;
}

// ─── Typing indicator (점 3개 통통) ──────────────────────────────────
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

// ─── 카톡 메시지 버블 ────────────────────────────────────────────────
function MessageBubble({
  text,
  showProfile,
  showTime,
}: {
  text: string;
  showProfile: boolean;
  showTime: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-end gap-1.5 mb-1.5"
    >
      {/* 프로필 */}
      {showProfile ? (
        <div className="w-9 h-9 rounded-[14px] bg-[#F4EFE6] flex items-center justify-center overflow-hidden border border-[#EACBB3] flex-shrink-0">
          <img
            src="/luna_fox_transparent.webp"
            alt="루나"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-9 flex-shrink-0" />
      )}

      {/* 버블 + 시간 */}
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
        {showTime && (
          <span className="text-[10px] text-[#A0784B]/60 mb-0.5 whitespace-nowrap">
            {nowKstHourMin()}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Phase ─────────────────────────────────────────────────────────
type Phase = 'idle' | 'typing1' | 'msg1' | 'typing2' | 'msg2' | 'done';

// recurring/frequent 는 follow-up 항상. first 는 60% 확률.
function shouldShowFollowup(args: {
  recentSessionCount24h: number;
  seed: number;
}): boolean {
  if (args.recentSessionCount24h >= 1) return true;
  // 결정형: seed 5/10 = 50%
  return Math.abs(Math.floor(args.seed)) % 10 < 6;
}

export default function LunaGreetingMessage({
  mood,
  recentSessionCount24h,
  intimacyLevel,
  ageDays,
  startSequence,
  onAllShown,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');

  // 결정형 seed (오늘 + ageDays)
  const daySeed =
    Math.floor((Date.now() + 9 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000)) +
    ageDays;

  const greeting = pickGreeting({
    mood,
    recentSessionCount24h,
    seed: daySeed,
  });

  const followup = pickFollowup({
    mood,
    recentSessionCount24h,
    intimacyLevel,
    seed: daySeed + 3,
  });

  const showFollowup = shouldShowFollowup({
    recentSessionCount24h,
    seed: daySeed,
  });

  // 시퀀스 진행
  useEffect(() => {
    if (!startSequence) return;
    if (phase !== 'idle') return;

    const timers: NodeJS.Timeout[] = [];

    // 0.3s: typing 1
    timers.push(setTimeout(() => setPhase('typing1'), 300));
    // 0.9s: 메시지 1 도착
    timers.push(
      setTimeout(() => {
        setPhase('msg1');
        triggerHaptic('light');
        playSound('ping');
      }, 900),
    );

    if (showFollowup) {
      // 1.4s: typing 2
      timers.push(setTimeout(() => setPhase('typing2'), 1400));
      // 2.0s: 메시지 2 도착
      timers.push(
        setTimeout(() => {
          setPhase('msg2');
          triggerHaptic('light');
          playSound('ping');
        }, 2000),
      );
      // 2.4s: 완료
      timers.push(
        setTimeout(() => {
          setPhase('done');
          onAllShown?.();
        }, 2400),
      );
    } else {
      // 1.4s: 완료 (1개 메시지만)
      timers.push(
        setTimeout(() => {
          setPhase('done');
          onAllShown?.();
        }, 1400),
      );
    }

    return () => timers.forEach((t) => clearTimeout(t));
    // 시퀀스 시작은 1회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSequence]);

  const showMsg1 = phase === 'msg1' || phase === 'typing2' || phase === 'msg2' || phase === 'done';
  const showMsg2 = phase === 'msg2' || phase === 'done';
  const showTyping1 = phase === 'typing1';
  const showTyping2 = phase === 'typing2';

  return (
    <div className="flex flex-col px-3 mt-1 mb-2">
      {/* 메시지 1 — 또는 typing */}
      <AnimatePresence mode="wait">
        {showTyping1 && (
          <motion.div
            key="typing1"
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

      {showMsg1 && (
        <MessageBubble
          text={greeting}
          showProfile={true}
          showTime={!showFollowup || phase === 'msg1' || phase === 'typing2'}
        />
      )}

      {/* 메시지 2 — 또는 typing */}
      <AnimatePresence mode="wait">
        {showTyping2 && (
          <motion.div
            key="typing2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-end gap-1.5 mb-1.5"
          >
            <div className="w-9 flex-shrink-0" />
            <TypingDots />
          </motion.div>
        )}
      </AnimatePresence>

      {showMsg2 && (
        <MessageBubble text={followup} showProfile={false} showTime={true} />
      )}
    </div>
  );
}
