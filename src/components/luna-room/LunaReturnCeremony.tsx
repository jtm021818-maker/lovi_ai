'use client';

/**
 * v113.5: LunaReturnCeremony — Polaroid + Handwritten Memo
 *
 * 루나가 외출에서 돌아왔을 때 풀스크린 환영 모먼트.
 * 컨셉: 한국 다이소/아트박스 스테이셔너리 감성. 필름 디벨로핑 + 워시테이프 + 도장 + 손글씨.
 *
 * 핵심 변경 (vs v104):
 * - 🏠/🎁 이모지 centerpiece 제거 → 실제 루나 캐릭터(webp)와 폴라로이드 메타포
 * - 박스 풀기 phase 제거 (마찰) → 한 번에 응집된 시퀀스
 * - 비대칭 레이아웃 (루나 좌하 / 폴라로이드 -3° 틸트 / 노트지 우하 겹침 / CTA 우하)
 * - 손글씨 폰트 + 도장 + 워시테이프 = "AI 안 같음"
 *
 * Peak-End Rule — 도장 찍히는 순간을 햅틱+sparkle 로 강화.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptic';
import { playSound } from '@/lib/audio';

interface Item {
  id: string;
  itemId: string;
  name: string;
  emoji: string;
  rarity: string;
  description: string;
  lunaNote: string | null;
  acquiredDay: number | null;
}

interface Props {
  open: boolean;
  tripId: string;
  item: Item;
  onClose: () => void;
}

// 희귀도별 폴라로이드 사진 영역 + 워시테이프 + 도장 컬러.
// 따뜻한 종이 톤 베이스에 희귀도가 살짝 물든 느낌.
type RarityPalette = {
  /** 사진 영역 그라디언트 (디벨로핑 전 fog 색에 가까운 무드) */
  photo: string;
  /** 워시테이프 메인 컬러 */
  tape: string;
  /** 도장(stamp) 잉크 컬러 — 텍스트도 동일 */
  stamp: string;
  /** 우하 CTA 배지 보더 */
  border: string;
  /** 영문 라벨 */
  label: string;
};

const RARITY: Record<string, RarityPalette> = {
  N:  { photo: 'linear-gradient(135deg,#EFE6D3,#C9B89A)', tape: '#E8CEAD', stamp: '#7C5A3A', border: '#7C5A3A', label: 'common' },
  R:  { photo: 'linear-gradient(135deg,#D6E8FA,#7FB1E2)', tape: '#A8C8E4', stamp: '#2E5F9C', border: '#2E5F9C', label: 'rare' },
  SR: { photo: 'linear-gradient(135deg,#EBD9FB,#B58FE3)', tape: '#D4B8E8', stamp: '#6A3F95', border: '#6A3F95', label: 'super rare' },
  UR: { photo: 'linear-gradient(135deg,#FFEDB8,#F5C45C)', tape: '#F2DDA0', stamp: '#8B5C0E', border: '#8B5C0E', label: 'ultra rare' },
  L:  { photo: 'linear-gradient(135deg,#C7F2EE,#5DC7CC)', tape: '#A8E0E2', stamp: '#0F5F62', border: '#0F5F62', label: 'legend' },
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** 손글씨 폰트 스택 — Nanum Pen Script 가 있으면 사용, 없으면 시스템 cursive */
const HANDWRITE_FONT =
  '"Nanum Pen Script", "Caveat", "Gowun Dodum", "Comic Sans MS", cursive';

/** Polaroid 카드 + 워시테이프 + 사진 + 도장 + 손글씨 캡션 */
function PolaroidCard({
  item,
  rarity,
  show,
}: {
  item: Item;
  rarity: RarityPalette;
  show: boolean;
}) {
  return (
    <motion.div
      initial={{ y: -340, rotate: -14, opacity: 0 }}
      animate={
        show
          ? { y: 0, rotate: -3, opacity: 1 }
          : { y: -340, rotate: -14, opacity: 0 }
      }
      transition={{ type: 'spring', stiffness: 220, damping: 18, mass: 0.9 }}
      className="relative mx-auto"
      style={{
        filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.55))',
        width: 268,
      }}
    >
      {/* 폴라로이드 종이 */}
      <div className="relative bg-[#FDF6EC] p-3 pb-12 rounded-[3px]">
        {/* 사진 영역 */}
        <div
          className="relative w-full aspect-square rounded-[2px] overflow-hidden"
          style={{ background: rarity.photo }}
        >
          {/* 종이 그레인 */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 60%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.15) 0%, transparent 50%)',
            }}
          />

          {/* 디벨로핑 fog — show 되면 페이드아웃 */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={show ? { opacity: 0 } : { opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.9, ease: EASE_OUT }}
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #D4B896, #C4A886)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* item emoji — 사진처럼 큰 사이즈 */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={show ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
            transition={{ delay: 0.9, duration: 0.5, ease: EASE_OUT }}
            className="absolute inset-0 flex items-center justify-center text-[110px] select-none"
            style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.18))' }}
          >
            {item.emoji}
          </motion.div>

          {/* 도장 (DAY +N) — 우하단 */}
          {item.acquiredDay != null && (
            <motion.div
              initial={{ scale: 1.6, opacity: 0, rotate: 4 }}
              animate={
                show
                  ? { scale: 1, opacity: 0.92, rotate: -8 }
                  : { scale: 1.6, opacity: 0, rotate: 4 }
              }
              transition={{
                delay: 1.05,
                type: 'spring',
                stiffness: 380,
                damping: 14,
              }}
              className="absolute bottom-2 right-2 px-2 py-1 select-none"
              style={{
                border: `2px solid ${rarity.stamp}`,
                color: rarity.stamp,
                background: 'rgba(255,253,247,0.55)',
                borderRadius: 4,
              }}
            >
              <div className="text-[9px] font-black tracking-[0.18em] leading-none">
                DAY {item.acquiredDay}
              </div>
            </motion.div>
          )}
        </div>

        {/* 화이트 보더 — 손글씨 캡션 (item.name + 희귀도) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={show ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="absolute left-0 right-0 bottom-2 px-3 text-center"
        >
          <div
            className="text-[#3a2418] text-[20px] leading-[1.05] truncate"
            style={{ fontFamily: HANDWRITE_FONT }}
          >
            {item.name}
          </div>
          <div
            className="text-[9px] mt-0.5 tracking-[0.22em] uppercase"
            style={{ color: rarity.stamp, opacity: 0.65 }}
          >
            {rarity.label}
          </div>
        </motion.div>
      </div>

      {/* 워시테이프 #1 — 좌상 */}
      <motion.div
        initial={{ y: -16, opacity: 0, rotate: -8 }}
        animate={
          show
            ? { y: 0, opacity: 0.9, rotate: -2 }
            : { y: -16, opacity: 0, rotate: -8 }
        }
        transition={{ delay: 0.85, type: 'spring', stiffness: 260, damping: 18 }}
        className="absolute -top-2 left-5 w-16 h-5 rounded-[1px]"
        style={{
          background: `repeating-linear-gradient(45deg, ${rarity.tape}, ${rarity.tape} 6px, ${rarity.tape}cc 6px, ${rarity.tape}cc 12px)`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
        }}
      />
      {/* 워시테이프 #2 — 우하 (살짝 다른 각도) */}
      <motion.div
        initial={{ y: 16, opacity: 0, rotate: 12 }}
        animate={
          show
            ? { y: 0, opacity: 0.82, rotate: 6 }
            : { y: 16, opacity: 0, rotate: 12 }
        }
        transition={{ delay: 0.95, type: 'spring', stiffness: 260, damping: 18 }}
        className="absolute -bottom-1 right-4 w-14 h-4 rounded-[1px]"
        style={{
          background: rarity.tape,
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      />
    </motion.div>
  );
}

/** 누런 메모지 노트 — 폴라로이드 우하단에 살짝 겹쳐서 등장 */
function MemoNote({
  text,
  show,
  rarity,
}: {
  text: string;
  show: boolean;
  rarity: RarityPalette;
}) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0, rotate: 8 }}
      animate={
        show ? { y: 0, opacity: 1, rotate: 4 } : { y: 60, opacity: 0, rotate: 8 }
      }
      transition={{ delay: 1.35, type: 'spring', stiffness: 200, damping: 22 }}
      className="relative mx-auto p-4 pb-3"
      style={{
        background: 'linear-gradient(180deg, #FFFAEB 0%, #FFF4D8 100%)',
        border: '1px dashed rgba(124,87,56,0.28)',
        boxShadow: '0 12px 24px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.2)',
        borderRadius: 4,
        width: 240,
        marginTop: -28,
        marginRight: -40,
      }}
    >
      {/* 핀(스티커) — 좌상 */}
      <div
        className="absolute -top-1.5 left-3 w-3 h-3 rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${rarity.tape}, ${rarity.stamp})`,
          boxShadow: '0 1.5px 3px rgba(0,0,0,0.4)',
        }}
      />
      <div
        className="text-[16px] text-[#3a2418] leading-[1.55]"
        style={{ fontFamily: HANDWRITE_FONT }}
      >
        “{text}”
      </div>
      <div
        className="mt-1.5 text-right text-[10px] tracking-[0.15em]"
        style={{ color: rarity.stamp, opacity: 0.7, fontFamily: HANDWRITE_FONT }}
      >
        — 루나
      </div>
    </motion.div>
  );
}

export default function LunaReturnCeremony({ open, tripId, item, onClose }: Props) {
  const rarity = RARITY[item.rarity] ?? RARITY.N;
  const [show, setShow] = useState(false);
  const playedRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // 시퀀스 트리거
  useEffect(() => {
    if (!open) {
      playedRef.current = false;
      setShow(false);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      return;
    }
    if (playedRef.current) return;
    playedRef.current = true;

    triggerHaptic('light'); // 배경 페이드인

    const t = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
    };

    t(700, () => {
      setShow(true);
      playSound('paper'); // 폴라로이드 떨어짐
    });
    t(1750, () => {
      triggerHaptic('medium'); // 도장 찍기
      playSound('sparkle');
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [open]);

  async function handleClose() {
    triggerHaptic('selection');
    try {
      await fetch(`/api/luna-room/shopping/${tripId}/seen`, { method: 'POST' });
    } catch {
      /* silent */
    }
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[300] overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse at 30% 18%, #4A3520 0%, #2C1F14 55%, #1A1108 100%)',
          }}
        >
          {/* 배경: 부드러운 보케 점 */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 18% 28%, white 1.5px, transparent 2.5px), radial-gradient(circle at 72% 62%, white 1px, transparent 2px), radial-gradient(circle at 48% 82%, white 1.2px, transparent 2.2px), radial-gradient(circle at 88% 22%, white 1px, transparent 2px)',
              backgroundSize: '160px 160px, 110px 110px, 130px 130px, 90px 90px',
              backgroundPosition: '0 0, 40px 30px, 80px 60px, 20px 90px',
            }}
          />

          {/* 종이 그레인 텍스처 (매우 약하게) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")",
            }}
          />

          {/* 루나 캐릭터 (좌하단) + 말풍선 */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: EASE_OUT }}
            className="absolute left-2 bottom-2 z-[10] pointer-events-none"
          >
            <div className="relative">
              <motion.img
                src="/luna_fox_transparent.webp"
                alt="루나"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-[120px] h-[120px] object-contain"
                style={{
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.55))',
                }}
              />
              {/* 말풍선 */}
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{
                  delay: 0.55,
                  type: 'spring',
                  stiffness: 320,
                  damping: 18,
                }}
                className="absolute -top-1 left-[100px] px-3 py-1.5 bg-white rounded-2xl rounded-bl-[4px] text-[12px] text-[#3a2418] font-bold whitespace-nowrap"
                style={{
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                다녀왔어!
                {/* 말풍선 꼬리 */}
                <span
                  className="absolute -bottom-[5px] left-2 w-2.5 h-2.5 bg-white"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                  }}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* 메인 콘텐츠 — 폴라로이드 + 노트지 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-24">
            <PolaroidCard item={item} rarity={rarity} show={show} />
            {item.lunaNote && (
              <MemoNote text={item.lunaNote} rarity={rarity} show={show} />
            )}
          </div>

          {/* CTA — 우하단 비대칭 배지 */}
          <motion.button
            initial={{ y: 30, opacity: 0 }}
            animate={show ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
            transition={{ delay: 1.7, duration: 0.5, ease: EASE_OUT }}
            onClick={handleClose}
            className="absolute right-4 bottom-5 z-[20] active:scale-[0.96] transition-transform"
          >
            <div
              className="px-5 py-2.5 rounded-[6px] bg-[#FDF6EC] text-[#3a2418] font-bold text-[12.5px] flex items-center gap-1.5"
              style={{
                boxShadow: '0 6px 16px rgba(0,0,0,0.4), inset 0 -2px 0 rgba(0,0,0,0.06)',
                border: `1.5px solid ${rarity.border}`,
              }}
            >
              <span>가방에 넣을게</span>
              <span style={{ color: rarity.border, fontSize: 14 }}>↘</span>
            </div>
          </motion.button>

          {/* 좌상단 sparkle 한 점 — 외출 마무리 분위기 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={show ? { opacity: [0, 1, 0.6] } : { opacity: 0 }}
            transition={{ delay: 1.0, duration: 1.4 }}
            className="absolute top-12 right-10 text-yellow-100/80 text-[18px] pointer-events-none select-none"
          >
            ✦
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={show ? { opacity: [0, 0.9, 0.4] } : { opacity: 0 }}
            transition={{ delay: 1.2, duration: 1.6 }}
            className="absolute top-24 left-8 text-yellow-100/80 text-[12px] pointer-events-none select-none"
          >
            ✦
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
