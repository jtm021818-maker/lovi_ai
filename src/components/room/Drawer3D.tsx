'use client';

/**
 * 🗄️ v85.2: Drawer3D — 진짜 서랍 열림/닫힘 3D 연출
 *
 * 기존 height:0 → auto 페이드인을 대체.
 * 핵심: CSS perspective + rotateX + translateZ + 그림자 확장 → "앞으로 튀어나오는" 느낌.
 *
 * 사용:
 *   <Drawer3D isOpen={open} onToggle={...} label="SPIRITS · 5">
 *     {children — 정령 슬롯 grid}
 *   </Drawer3D>
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import DrawerHandle from './DrawerHandle';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  label: string;
  /** 서랍 닫힌 상태에서 보여질 서브 텍스트 (예: "N마리 자고 있어") */
  closedHint?: string;
  /** 서랍 열린 상태에서 보여질 서브 텍스트 */
  openHint?: string;
  children: ReactNode;
}

const WOOD_FRONT_BG = `
  linear-gradient(180deg, #8b5a3c 0%, #6b3f26 45%, #5a331e 55%, #4a2817 100%),
  repeating-linear-gradient(
    90deg,
    rgba(0,0,0,0.05) 0px,
    rgba(0,0,0,0.05) 1px,
    transparent 1px,
    transparent 6px
  )
`;

const VELVET_INTERIOR_BG = `
  radial-gradient(ellipse at 50% 0%, #4a1a28 0%, #2e0f18 70%, #1a0810 100%)
`;

export default function Drawer3D({ isOpen, onToggle, label, closedHint, openHint, children }: Props) {
  return (
    <div
      className="relative mt-5"
      style={{
        // 3D 공간 설정
        perspective: '1200px',
        perspectiveOrigin: '50% 0%',
      }}
    >
      {/* 서랍 전면 (닫혀있을 때 보이는 나무 판) — 클릭 영역 */}
      <motion.button
        onClick={onToggle}
        initial={false}
        animate={{
          // 열릴 때 앞으로 튀어나옴
          rotateX: isOpen ? -6 : 0,
          translateZ: isOpen ? 24 : 0,
          y: isOpen ? -2 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 120,
          damping: 18,
          mass: 1.1,
        }}
        whileTap={{ y: 2, transition: { duration: 0.1 } }}
        className="relative w-full flex items-center gap-4 px-4 py-4 rounded-2xl focus:outline-none"
        style={{
          background: WOOD_FRONT_BG,
          backgroundBlendMode: 'overlay',
          transformStyle: 'preserve-3d',
          transformOrigin: '50% 100%',
          boxShadow: isOpen
            ? [
                '0 20px 40px rgba(0,0,0,0.4)',
                '0 8px 12px rgba(0,0,0,0.25)',
                'inset 0 0 0 1px rgba(218,165,32,0.45)',
                'inset 0 2px 2px rgba(255,230,180,0.3)',
                'inset 0 -3px 4px rgba(0,0,0,0.4)',
              ].join(', ')
            : [
                '0 6px 14px rgba(0,0,0,0.25)',
                '0 2px 4px rgba(0,0,0,0.15)',
                'inset 0 0 0 1px rgba(218,165,32,0.35)',
                'inset 0 2px 2px rgba(255,230,180,0.25)',
                'inset 0 -2px 3px rgba(0,0,0,0.3)',
              ].join(', '),
        }}
      >
        {/* 손잡이 */}
        <DrawerHandle isOpen={isOpen} />

        {/* 라벨 플레이트 */}
        <div className="flex-1 text-left">
          <div
            className="inline-block px-2.5 py-1 rounded-sm text-[10px] font-bold tracking-[0.3em] text-amber-100"
            style={{
              background: 'linear-gradient(180deg, #a08824 0%, #6b5a18 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,235,180,0.4), 0 2px 3px rgba(0,0,0,0.3)',
            }}
          >
            {label}
          </div>
          <div className="mt-1 text-[10px] text-amber-100/70 italic">
            {isOpen ? (openHint ?? '정령들이 깨어있어') : (closedHint ?? '톡, 잡아당겨봐')}
          </div>
        </div>

        {/* 화살표 인디케이터 */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.4 }}
          className="text-[16px] text-amber-200/80"
        >
          ▾
        </motion.div>
      </motion.button>

      {/* 서랍 내부 (열릴 때만) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ rotateX: 90, opacity: 0, translateY: -20, translateZ: 0 }}
            animate={{ rotateX: 0, opacity: 1, translateY: 0, translateZ: 20 }}
            exit={{ rotateX: 90, opacity: 0, translateY: -20, translateZ: 0 }}
            transition={{
              type: 'spring',
              stiffness: 140,
              damping: 20,
              mass: 1,
            }}
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: '50% 0%',
            }}
            className="relative mt-2 rounded-2xl overflow-hidden"
          >
            {/* 서랍 내부 벨벳 바닥 */}
            <div
              className="p-3"
              style={{
                background: VELVET_INTERIOR_BG,
                boxShadow: [
                  'inset 0 8px 20px rgba(0,0,0,0.55)',              // 내부 깊이
                  'inset 0 -2px 0 rgba(218,165,32,0.3)',            // 바닥 황동 선
                  'inset 0 2px 0 rgba(0,0,0,0.6)',                  // 안쪽 윗면 어두움 (뚜껑 그림자)
                  '0 8px 20px rgba(0,0,0,0.35)',                    // 서랍 바깥 그림자
                ].join(', '),
                borderRadius: '16px',
              }}
            >
              {/* 벨벳 질감 — 미세한 노이즈 오버레이 */}
              <div
                className="pointer-events-none absolute inset-0 opacity-30 rounded-2xl"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 30%, rgba(255,220,180,0.08), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,180,200,0.06), transparent 50%)',
                }}
              />

              {/* 내부 컨텐츠 (정령 슬롯 grid) */}
              <div className="relative z-10">
                {children}
              </div>
            </div>

            {/* 서랍 측면 그림자 (열린 상태 강조) */}
            <div
              className="pointer-events-none absolute inset-x-0 -top-1 h-2 z-20"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
