'use client';

/**
 * 🎯 v85.2: DrawerHandle — 황동 손잡이 SVG
 *
 * 진짜 서랍 손잡이 느낌. 빛 반사 + 그림자로 입체감.
 * 서랍 열림 상태에 따라 살짝 "당겨진" 것처럼 위치 이동.
 */

interface Props {
  isOpen?: boolean;
  label?: string;
}

export default function DrawerHandle({ isOpen = false, label }: Props) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 transition-transform duration-300"
      style={{
        transform: isOpen ? 'translateY(2px)' : 'translateY(0)',
      }}
    >
      <svg width="64" height="18" viewBox="0 0 64 18" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="brassBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4d279" />
            <stop offset="30%" stopColor="#d4af37" />
            <stop offset="70%" stopColor="#8f6f1c" />
            <stop offset="100%" stopColor="#5f4a15" />
          </linearGradient>
          <linearGradient id="brassScrew" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8e4a1" />
            <stop offset="100%" stopColor="#8b6d1a" />
          </linearGradient>
          <filter id="handleShadow" x="-10%" y="-10%" width="120%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
            <feOffset dx="0" dy="1.5" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.45" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 손잡이 바 본체 */}
        <rect
          x="10"
          y="6"
          width="44"
          height="7"
          rx="3.5"
          fill="url(#brassBar)"
          filter="url(#handleShadow)"
        />
        {/* 상단 하이라이트 */}
        <rect x="12" y="7" width="40" height="1.2" rx="0.6" fill="rgba(255,245,200,0.8)" />

        {/* 좌측 나사 */}
        <circle cx="8" cy="9" r="4.5" fill="url(#brassScrew)" />
        <circle cx="8" cy="9" r="2" fill="rgba(0,0,0,0.25)" />
        <rect x="5.5" y="8.5" width="5" height="1" rx="0.3" fill="rgba(0,0,0,0.5)" />

        {/* 우측 나사 */}
        <circle cx="56" cy="9" r="4.5" fill="url(#brassScrew)" />
        <circle cx="56" cy="9" r="2" fill="rgba(0,0,0,0.25)" />
        <rect x="53.5" y="8.5" width="5" height="1" rx="0.3" fill="rgba(0,0,0,0.5)" />
      </svg>

      {label && (
        <div
          className="px-2 py-0.5 text-[8px] font-bold tracking-[0.25em] text-amber-50"
          style={{
            background: 'linear-gradient(180deg, #a08824 0%, #6b5a18 100%)',
            borderRadius: '2px',
            boxShadow: 'inset 0 1px 0 rgba(255,235,180,0.4), 0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
