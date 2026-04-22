'use client';

/**
 * v85.4: WanderingSpirit — 마음의방 내 배회하는 정령
 *
 * useWandering으로 상태/위치 관리 + SpiritSprite로 프레임 렌더링.
 * 유저 탭 시 react 애니메이션 발동.
 */

import { forwardRef, useImperativeHandle, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import type { SpiritMaster } from '@/types/spirit.types';
import SpiritSprite from './SpiritSprite';
import { useWandering } from '@/hooks/useWandering';

export interface WanderingSpiritHandle {
  triggerReact: () => void;
}

interface Props {
  spirit: SpiritMaster;
  /** 방의 픽셀 크기 */
  roomWidth: number;
  roomHeight: number;
  /** 초기 normalized 좌표 (0~1) */
  initialX: number;
  initialY: number;
  /** 배회 off (편집 모드) */
  disabled?: boolean;
  onTap?: () => void;
  /** 삭제 모드 배지 */
  showRemoveBadge?: boolean;
  /** Drag 활성 (편집 모드) */
  editMode?: boolean;
  onDragEnd?: (x: number, y: number) => void;
}

const WanderingSpirit = forwardRef<WanderingSpiritHandle, Props>(function WanderingSpirit(
  {
    spirit,
    roomWidth,
    roomHeight,
    initialX,
    initialY,
    disabled,
    onTap,
    showRemoveBadge,
    editMode,
    onDragEnd,
  },
  ref,
) {
  const {
    state,
    x,
    y,
    targetX,
    targetY,
    walkDuration,
    facingLeft,
    triggerReact,
    wakeUp,
    handleArriveComplete,
    handleReactComplete,
  } = useWandering({
    initialX,
    initialY,
    enabled: !disabled && !editMode,
  });

  useImperativeHandle(ref, () => ({ triggerReact }), [triggerReact]);

  const controls = useAnimationControls();

  // 등장 애니메이션 (마운트 시 한 번)
  useEffect(() => {
    controls.start({ opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 편집 모드에서는 배회 멈추고 현재 위치 유지
  useEffect(() => {
    if (editMode) {
      controls.stop();
      controls.set({
        left: x * roomWidth,
        top: y * roomHeight,
      });
    }
  }, [editMode, controls, x, y, roomWidth, roomHeight]);

  // 상태별 위치 애니메이션
  useEffect(() => {
    if (editMode) return;
    if (state === 'walk') {
      controls.start({
        left: targetX * roomWidth,
        top: targetY * roomHeight,
        transition: { duration: walkDuration / 1000, ease: 'easeInOut' },
      });
    } else {
      controls.start({
        left: x * roomWidth,
        top: y * roomHeight,
        transition: { duration: 0.2 },
      });
    }
  }, [state, targetX, targetY, x, y, walkDuration, controls, roomWidth, roomHeight, editMode]);

  const handleTap = () => {
    if (state === 'sleep') {
      wakeUp();
      return;
    }
    onTap?.();
    // 탭 시 react 한 번 재생
    triggerReact();
  };

  const onSpriteStateComplete = () => {
    if (state === 'arrive') handleArriveComplete();
    else if (state === 'react') handleReactComplete();
  };

  return (
    <motion.div
      drag={editMode}
      dragMomentum={false}
      dragConstraints={{ left: 0, top: 0, right: roomWidth, bottom: roomHeight }}
      onDragEnd={(_e, info) => {
        if (!onDragEnd) return;
        const nx = Math.max(0, Math.min(1, (x * roomWidth + info.offset.x) / roomWidth));
        const ny = Math.max(0, Math.min(1, (y * roomHeight + info.offset.y) / roomHeight));
        onDragEnd(nx, ny);
      }}
      initial={{ left: initialX * roomWidth, top: initialY * roomHeight, opacity: 0, scale: 0.5 }}
      animate={controls}
      whileTap={{ scale: 0.92 }}
      onClick={handleTap}
      className="absolute cursor-pointer select-none z-30"
      style={{
        width: 48,
        height: 48,
        marginLeft: -24,
        marginTop: -24,
        opacity: 1,
      }}
      transition={{ duration: 0.3 }}
    >
      <SpiritSprite
        spirit={spirit}
        state={state}
        facingLeft={facingLeft}
        onStateComplete={onSpriteStateComplete}
      />
      {showRemoveBadge && (
        <div className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-black shadow-md z-10">
          ×
        </div>
      )}
      {state === 'sleep' && (
        <div
          className="absolute -top-3 -right-2 text-[14px] pointer-events-none"
          style={{ animation: 'float-z 2.5s ease-in-out infinite' }}
        >
          💤
        </div>
      )}
      <style jsx>{`
        @keyframes float-z {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.85; }
          50% { transform: translateY(-4px) scale(1.1); opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
});

export default WanderingSpirit;
