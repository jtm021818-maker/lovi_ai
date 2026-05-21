'use client';

/**
 * v117 — "마음 한 컷" 폴라로이드 4컷 picker
 *
 * SmartReplyBar (분홍 chip) 의 대체.
 * 영상 + 카톡 인사 도착 완료 후 (ready) 등장.
 *
 * 컨셉:
 * - 종이 노트 배경 위 폴라로이드 4컷 (2x2 grid, 각기 다른 회전)
 * - 카드 픽 → 카드 살짝 흔들리며 입력창 위 핀 뱃지로 슝 이동 (layoutId)
 * - 픽한 카드의 placeholderHint 를 onMoodPick 으로 전달 → ChatInput placeholder 변환
 * - "직접 적을래" 작은 escape link → 카드 페이드아웃
 *
 * 자유도 보장:
 * - 입력창은 비어 있음 (mood 만 컨텍스트로)
 * - 픽 안 해도 자유 진입 OK
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { LunaMood, LunaTimeBand } from '@/lib/luna-life/mood';
import {
  pickMindPolaroidCards,
  type MindPolaroidCard,
} from '@/lib/luna-life/mindPolaroidPool';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';

interface Props {
  mood: LunaMood;
  timeBand: LunaTimeBand;
  ageDays: number;
  recentSessionCount24h: number;
  /** 영상 + 인사 메시지 모두 도착 완료 후 true */
  visible: boolean;
  /** 카드 픽 시 호출 — 입력창 placeholder 변환 + 무드 컨텍스트 전달 */
  onPick: (card: MindPolaroidCard) => void;
  /** "직접 적을래" escape — picker 자체 페이드아웃 */
  onDismiss: () => void;
}

// 폴라로이드 회전 각도 (자연스러운 다이어리 느낌)
const ROTATIONS = [-3.2, 2.4, -1.8, 3.0];

/** 폴라로이드 한 장 */
function PolaroidCard({
  card,
  index,
  onClick,
}: {
  card: MindPolaroidCard;
  index: number;
  onClick: () => void;
}) {
  const rotate = ROTATIONS[index % ROTATIONS.length];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 18, rotate: rotate + (rotate > 0 ? 6 : -6) }}
      animate={{ opacity: 1, y: 0, rotate }}
      exit={{ opacity: 0, y: -10, scale: 0.92 }}
      transition={{
        duration: 0.55,
        delay: 0.12 * index,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -3, rotate: rotate * 0.5, scale: 1.025 }}
      whileTap={{ scale: 0.96 }}
      className="relative w-full aspect-[3/3.6] p-2 pb-4 text-left active:scale-95"
      style={{
        background: '#FFFCF7',
        borderRadius: 4,
        boxShadow:
          '0 6px 18px rgba(120, 90, 60, 0.18), 0 1px 3px rgba(120, 90, 60, 0.12), inset 0 0 0 1px rgba(180, 150, 110, 0.10)',
      }}
    >
      {/* 스티커 — 좌상 */}
      <span
        className="absolute -top-1.5 -left-1 text-[14px] rotate-[-12deg] z-10"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
      >
        {card.sticker}
      </span>

      {/* 사진 영역 (emoji + oneLine) */}
      <div
        className="w-full aspect-square rounded-sm flex flex-col items-center justify-center gap-1 overflow-hidden relative"
        style={{
          background: `linear-gradient(155deg, ${card.gradient[0]} 0%, ${card.gradient[1]} 100%)`,
          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.05)',
        }}
      >
        {/* 노이즈 텍스처 (살짝) */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 20%, rgba(0,0,0,0.3) 0, transparent 60%)',
          }}
        />
        <motion.span
          className="text-[42px] leading-none drop-shadow-sm"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: index * 0.4 }}
        >
          {card.emoji}
        </motion.span>
      </div>

      {/* 손글씨 한 줄 */}
      <p
        className="mt-2 text-[12.5px] text-[#5D4037] leading-[1.25] text-center px-0.5"
        style={{
          fontFamily:
            'var(--font-handwrite), Gaegu, "Nanum Pen Script", cursive',
          fontWeight: 700,
          letterSpacing: '-0.3px',
        }}
      >
        {card.oneLine}
      </p>

      {/* 작은 라벨 */}
      <p className="text-[9.5px] text-[#a0784b]/75 text-center mt-0.5 tracking-wide">
        {card.caption}
      </p>
    </motion.button>
  );
}

export default function MindPolaroidPicker({
  mood,
  timeBand,
  ageDays,
  recentSessionCount24h,
  visible,
  onPick,
  onDismiss,
}: Props) {
  const [picked, setPicked] = useState<MindPolaroidCard | null>(null);

  const cards = useMemo(
    () =>
      pickMindPolaroidCards({
        mood,
        timeBand,
        ageDays,
        extraSeed: recentSessionCount24h,
      }),
    [mood, timeBand, ageDays, recentSessionCount24h],
  );

  function handlePick(card: MindPolaroidCard) {
    if (picked) return;
    setPicked(card);
    triggerHaptic('medium');
    playSound('sparkle');
    // 카드 슝 애니메이션 시간 + 살짝 갭
    setTimeout(() => onPick(card), 420);
  }

  function handleDismiss() {
    triggerHaptic('light');
    onDismiss();
  }

  // 헤드카피 — 친밀도/방문에 따라 톤 변화는 v117.1 로 미룸. 일단 단순.
  const head =
    recentSessionCount24h >= 3
      ? { line1: '오늘 마음 한 컷,', line2: '오늘은 어떤 컷이야' }
      : recentSessionCount24h >= 1
      ? { line1: '또 왔네 —', line2: '지금 마음 한 컷 골라줘' }
      : { line1: '오늘 마음 한 컷,', line2: '뭐랑 가장 닮았어?' };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="mind-polaroid-picker"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mx-3 mb-3 relative"
        >
          {/* 종이 노트 배경 */}
          <div
            className="relative rounded-[20px] overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, #FFFDF8 0%, #FCF5EC 100%)',
              border: '1px solid rgba(200, 170, 130, 0.32)',
              boxShadow:
                '0 8px 28px rgba(160, 120, 75, 0.14), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            {/* 마스킹 테이프 — 좌상 */}
            <div
              className="absolute -top-2 left-6 w-14 h-5 rotate-[-7deg] z-10"
              style={{
                background:
                  'repeating-linear-gradient(45deg, rgba(255,200,150,0.55) 0 5px, rgba(255,180,200,0.45) 5px 10px)',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            />
            {/* 마스킹 테이프 — 우상 */}
            <div
              className="absolute -top-2 right-7 w-10 h-4 rotate-[8deg] z-10"
              style={{
                background:
                  'repeating-linear-gradient(45deg, rgba(200,220,180,0.5) 0 4px, rgba(180,210,200,0.4) 4px 8px)',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            />

            {/* 점선 테두리 (다이어리 느낌) */}
            <div
              className="absolute inset-2 rounded-[14px] pointer-events-none"
              style={{
                border: '1px dashed rgba(200, 170, 130, 0.35)',
              }}
            />

            {/* 헤드카피 */}
            <div className="px-5 pt-6 pb-2 flex items-start gap-2 relative">
              <motion.span
                animate={{
                  rotate: [0, 12, -8, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-[18px] flex-shrink-0 mt-0.5"
              >
                ✦
              </motion.span>
              <div className="flex-1">
                <p
                  className="text-[19px] leading-[1.35] text-[#5D4037]"
                  style={{
                    fontFamily:
                      'var(--font-handwrite), Gaegu, "Nanum Pen Script", cursive',
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                  }}
                >
                  {head.line1}
                </p>
                <p
                  className="text-[19px] leading-[1.35] text-[#5D4037] mt-0.5"
                  style={{
                    fontFamily:
                      'var(--font-handwrite), Gaegu, "Nanum Pen Script", cursive',
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                  }}
                >
                  {head.line2}
                </p>
              </div>
              <span
                className="text-[11px] text-[#a0784b]/85 italic mt-1"
                style={{
                  fontFamily:
                    'var(--font-handwrite), Gaegu, "Nanum Pen Script", cursive',
                }}
              >
                — 루나 🦊
              </span>
            </div>

            {/* 폴라로이드 4컷 */}
            <div className="px-4 pt-1 pb-2 grid grid-cols-2 gap-3 relative">
              {cards.map((card, i) => (
                <PolaroidCard
                  key={card.id}
                  card={card}
                  index={i}
                  onClick={() => handlePick(card)}
                />
              ))}
            </div>

            {/* 하단 안내 + escape */}
            <div className="px-5 pb-3 pt-1 flex items-center justify-between">
              <span className="text-[10.5px] text-[#a0784b]/65">
                고른 컷은 마음 시드일 뿐 — 자유롭게 적어도 돼 ✏️
              </span>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[11px] text-[#c084fc] hover:text-[#a855f7] active:scale-95 transition-all underline underline-offset-2 decoration-dotted"
                style={{
                  fontFamily:
                    'var(--font-handwrite), Gaegu, "Nanum Pen Script", cursive',
                  fontWeight: 600,
                }}
              >
                그냥 적을래 →
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
