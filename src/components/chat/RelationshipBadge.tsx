'use client';

/**
 * 🆕 v112: 관계 누적 배지 — Snapchat streak + Finch investment loop
 *
 * 한 줄 compact 표시:
 *   "13일째 함께 · 추억 7개 · 🔥 5일"
 *
 * 친밀도 + ageDays 결합 카피 변형 — 처음 만난 사람이 아니라
 * "함께한 시간이 쌓이는 친구" 라는 누적감.
 *
 * 끊겨도 페널티 X — Snapchat 처럼 *압박* 이 아니라 *축적의 자랑*.
 */

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { triggerHaptic } from '@/lib/haptic';

interface Props {
  ageDays: number;
  intimacyLevel?: number;     // 0~5
  memoryCount?: number;       // luna_memories 누적
  streakDays?: number;        // 연속 방문 일수
  onTap?: () => void;
}

/**
 * intimacy 0~1 (정중) / 2~3 (친구) / 4~5 (절친) × ageDays 단계 별 톤.
 */
function pickAgePhrase(ageDays: number, intimacy: number): string {
  if (ageDays === 0) return '오늘부터 함께 ✨';

  // 100일 마지막
  if (ageDays >= 100) {
    if (intimacy >= 4) return `100일… ㅠㅠ 고마워`;
    if (intimacy >= 2) return `100일 ✨ 우리 진짜 친구다`;
    return '백일을 함께 채웠어 💜';
  }

  // 31~99일
  if (ageDays >= 31) {
    if (intimacy >= 4) return `${ageDays}일째 ㅎㅎ 시간 빠르다`;
    if (intimacy >= 2) return `${ageDays}일… 우리 진짜 친해`;
    return `${ageDays}일째, 더 깊어지는 중`;
  }

  // 8~30일
  if (ageDays >= 8) {
    if (intimacy >= 4) return `${ageDays}일째라니 ㅋㅋ`;
    if (intimacy >= 2) return `${ageDays}일 같이 보냈네`;
    return `함께한 지 ${ageDays}일`;
  }

  // 1~7일
  if (intimacy >= 4) return `우리 ${ageDays}일째 ㅎ`;
  if (intimacy >= 2) return `${ageDays}일째 ✨`;
  return `${ageDays}일째 함께 ✨`;
}

export default function RelationshipBadge({
  ageDays,
  intimacyLevel = 0,
  memoryCount = 0,
  streakDays = 0,
  onTap,
}: Props) {
  const router = useRouter();

  const agePhrase = pickAgePhrase(ageDays, intimacyLevel);
  const showMemory = memoryCount > 0;
  const showStreak = streakDays >= 3;

  const handleTap = useCallback(() => {
    triggerHaptic('light');
    if (onTap) {
      onTap();
    } else {
      router.push('/luna-room');
    }
  }, [onTap, router]);

  return (
    <motion.button
      type="button"
      onClick={handleTap}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      whileTap={{ scale: 0.97 }}
      className="mx-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full"
      style={{
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,240,250,0.7))',
        border: '1px solid rgba(255,182,210,0.55)',
        boxShadow: '0 2px 10px rgba(192,132,252,0.15)',
      }}
      aria-label="관계 누적 정보"
    >
      {/* age 별 */}
      <motion.span
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.12, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="text-[11px] text-[#e8a43e]"
      >
        ✦
      </motion.span>
      <span
        className="text-[12px] font-bold text-[#5D4037] whitespace-nowrap"
        style={{
          fontFamily:
            'var(--font-gaegu), Gaegu, "Nanum Pen Script", cursive',
          letterSpacing: '-0.2px',
        }}
      >
        {agePhrase}
      </span>

      {/* 추억 갯수 */}
      {showMemory && (
        <>
          <span className="text-[10px] text-[#a0784b]/60">·</span>
          <span className="text-[11px] text-[#7b5239] whitespace-nowrap">
            추억 {memoryCount}개
          </span>
        </>
      )}

      {/* streak 🔥 — 3일 이상만 */}
      {showStreak && (
        <>
          <span className="text-[10px] text-[#a0784b]/60">·</span>
          <motion.span
            animate={{ rotate: [0, -6, 6, -3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5 }}
            className="text-[11px] whitespace-nowrap text-[#e85a3b] font-bold"
          >
            🔥 {streakDays}일
          </motion.span>
        </>
      )}
    </motion.button>
  );
}
