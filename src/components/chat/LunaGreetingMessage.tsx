'use client';

/**
 * 🆕 v114: 카톡 친구 톡방 — 루나의 LLM-driven 첫 톡 N개 (1~3개)
 *
 * 컨셉: 영상 끝나면 typing → 첫 메시지 → typing → 다음 메시지 ... (LLM 이 결정한 개수만큼)
 * 카드 X. 카톡 메시지 버블 그대로. 친구가 카톡 빠르게 연달아 보낼 때처럼.
 *
 * - 본문: /api/luna-room/greeting (LLM 본인 사고로 1~3개 결정)
 * - 폴백: whispers.ts (pickGreeting + pickFollowup) — 안전장치만
 * - 타이밍: typing 600ms → 메시지 도착 → typing 500ms → 다음 ...
 * - 사운드/햅틱: 메시지 도착마다
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
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
  /** 모든 메시지 도착 후 호출 (SmartReplyBar 등장 트리거) */
  onAllShown?: () => void;
}

// ─── v113: 최근 인사 localStorage (반복 방지 — 첫 줄만 저장) ──────────
const RECENT_KEY = 'luna:recentGreetings';
const RECENT_MAX = 8;

function loadRecentGreetings(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((s: unknown): s is string => typeof s === 'string').slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

function pushRecentGreeting(g: string): void {
  if (typeof window === 'undefined' || !g) return;
  try {
    const cur = loadRecentGreetings();
    const next = [g, ...cur.filter((x) => x !== g)].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
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

// ─── 메시지 N개 시퀀스 진행 ──────────────────────────────────────────
//   각 메시지마다 typing(600ms) → 메시지 도착(haptic+ping) → 짧은 갭(500ms) → 다음 메시지의 typing
type SlotState = 'hidden' | 'typing' | 'shown';

const TYPING_MS = 600;
const GAP_MS = 500;
const FINAL_MS = 400;

export default function LunaGreetingMessage({
  mood,
  recentSessionCount24h,
  intimacyLevel,
  ageDays,
  startSequence,
  onAllShown,
}: Props) {
  // 결정형 seed (오늘 + ageDays) — LLM 실패 시 폴백 용
  const daySeed =
    Math.floor((Date.now() + 9 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000)) +
    ageDays;

  // 결정형 폴백 메시지 (LLM 도착 전/실패 시)
  const fallbackMessages = (() => {
    const g = pickGreeting({ mood, recentSessionCount24h, seed: daySeed });
    const f = pickFollowup({ mood, recentSessionCount24h, intimacyLevel, seed: daySeed + 3 });
    // first 진입은 폴백도 1개로 (자연스러움)
    if (recentSessionCount24h === 0 && daySeed % 10 < 4) return [g];
    return f ? [g, f] : [g];
  })();

  // ─── v114: LLM 메시지 fetch ────────────────────────────────────────
  const [llmMessages, setLlmMessages] = useState<string[] | null>(null);
  const fetchStartedRef = useRef(false);

  useEffect(() => {
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;

    const ac = new AbortController();
    const recent = loadRecentGreetings();

    fetch('/api/luna-room/greeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastGreetings: recent, intimacyLevel }),
      signal: ac.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { messages?: unknown } | null) => {
        if (!data || !Array.isArray(data.messages)) return;
        const cleaned = data.messages
          .map((m: unknown) => (typeof m === 'string' ? m.trim() : ''))
          .filter((m: string) => m.length > 0)
          .slice(0, 3);
        if (cleaned.length === 0) return;
        setLlmMessages(cleaned);
        pushRecentGreeting(cleaned[0]);
      })
      .catch(() => {
        /* 네트워크/abort — 폴백 사용 */
      });

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = llmMessages ?? fallbackMessages;

  // 각 슬롯 상태: hidden → typing → shown
  const [slots, setSlots] = useState<SlotState[]>(() => messages.map(() => 'hidden'));
  const sequenceStartedRef = useRef(false);
  const allShownFiredRef = useRef(false);

  // messages 길이 바뀌면 (LLM 도착) slots 리셋 — 단, 시퀀스 시작 전에만
  useEffect(() => {
    if (sequenceStartedRef.current) return;
    setSlots(messages.map(() => 'hidden'));
  }, [messages]);

  // 시퀀스 진행
  useEffect(() => {
    if (!startSequence) return;
    if (sequenceStartedRef.current) return;
    sequenceStartedRef.current = true;

    const timers: NodeJS.Timeout[] = [];
    const total = messages.length;

    let cursor = 300; // 첫 typing 까지 약간의 텀

    for (let i = 0; i < total; i++) {
      const idx = i;
      // typing 시작
      timers.push(setTimeout(() => {
        setSlots((prev) => {
          const next = [...prev];
          next[idx] = 'typing';
          return next;
        });
      }, cursor));
      cursor += TYPING_MS;

      // 메시지 도착
      timers.push(setTimeout(() => {
        setSlots((prev) => {
          const next = [...prev];
          next[idx] = 'shown';
          return next;
        });
        triggerHaptic('light');
        playSound('ping');
      }, cursor));

      // 다음 typing 까지 갭 (마지막은 짧게)
      cursor += idx === total - 1 ? FINAL_MS : GAP_MS;
    }

    timers.push(setTimeout(() => {
      if (allShownFiredRef.current) return;
      allShownFiredRef.current = true;
      onAllShown?.();
    }, cursor));

    return () => timers.forEach((t) => clearTimeout(t));
    // 시퀀스 시작은 1회. messages 길이는 시작 전에만 영향.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSequence]);

  return (
    <div className="flex flex-col px-3 mt-1 mb-2">
      {messages.map((text, i) => {
        const state = slots[i] ?? 'hidden';
        const showProfile = i === 0;
        const isLastShown = state === 'shown'
          && (i === messages.length - 1 || (slots[i + 1] ?? 'hidden') === 'hidden');

        return (
          <div key={`slot-${i}`}>
            <AnimatePresence mode="wait">
              {state === 'typing' && (
                <motion.div
                  key={`typing-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-end gap-1.5 mb-1.5"
                >
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
                  <TypingDots />
                </motion.div>
              )}
            </AnimatePresence>

            {state === 'shown' && (
              <MessageBubble
                text={text}
                showProfile={showProfile}
                showTime={isLastShown}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
