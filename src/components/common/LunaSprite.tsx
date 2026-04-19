'use client';

/**
 * 🦊 v82.15: Luna Sprite — 재사용 컴포넌트
 *
 * 2026 최적 접근:
 *   - CSS Module + @keyframes + steps() 타이밍
 *   - GPU 가속 힌트 (will-change, translateZ)
 *   - prefers-reduced-motion a11y 지원
 *   - duration / speed mode 외부 제어 가능
 *
 * Usage:
 *   <LunaSprite size={40} />                    // 기본 1.2s
 *   <LunaSprite size={60} speed="slow" />       // 2.4s
 *   <LunaSprite size={32} speed="fast" />       // 0.6s
 *   <LunaSprite size={40} paused />             // 정지 (첫 프레임)
 *   <LunaSprite size={40} duration={1.8} />     // 사용자 지정
 */

import styles from './LunaSprite.module.css';

interface LunaSpriteProps {
  size?: number;
  /** 애니메이션 속도 프리셋 */
  speed?: 'slow' | 'normal' | 'fast';
  /** 초 단위 커스텀 duration (speed 보다 우선) */
  duration?: number;
  /** 정지 (첫 프레임만) */
  paused?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function LunaSprite({
  size = 40,
  speed = 'normal',
  duration,
  paused = false,
  className,
  style,
}: LunaSpriteProps) {
  const speedClass = paused
    ? styles.paused
    : speed === 'slow'
      ? styles.slow
      : speed === 'fast'
        ? styles.fast
        : '';

  const durationStyle: React.CSSProperties = duration
    ? ({ ['--luna-dur' as any]: `${duration}s` } as React.CSSProperties)
    : {};

  return (
    <div
      className={`${styles.container} ${className ?? ''}`}
      style={{ width: size, height: size, ...durationStyle, ...style }}
    >
      <div className={`${styles.sprite} ${speedClass}`} />
    </div>
  );
}
