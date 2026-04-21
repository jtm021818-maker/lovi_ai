'use client';

/**
 * 🛍️ v85.4.1: ShopIcon — 하단 네비 상점 아이콘 (unisex 감성)
 *
 * v85.4 피드백: 리본·하트가 너무 여성향 → 톤다운.
 *   - 리본 손잡이 → 담백한 둥근 손잡이
 *   - 하트 태그 → 작은 별 태그 (감성 유지 + 중성)
 *   - 팔레트: 핫핑크 → 코랄/피치 크림 (따뜻하지만 덜 달달)
 *   - 스파클은 유지 (활성 강조용, 금색 톤)
 */

interface Props {
  active?: boolean;
  size?: number;
}

export default function ShopIcon({ active = false, size = 36 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        filter: active
          ? 'drop-shadow(0 2px 6px rgba(236,120,100,0.4))'
          : 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
        transform: active ? 'translateY(-1px) scale(1.06)' : 'none',
        transition: 'transform 0.25s ease, filter 0.25s ease',
      }}
    >
      <defs>
        {/* 본체 — 크림 → 코랄 (중성 감성) */}
        <linearGradient id="bagBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#fff4e6' : '#fff8ef'} />
          <stop offset="55%" stopColor={active ? '#ffcfae' : '#ffdcc1'} />
          <stop offset="100%" stopColor={active ? '#e97462' : '#dc8a75'} />
        </linearGradient>
        {/* 손잡이 — 담백한 갈색톤 */}
        <linearGradient id="handle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a86b52" />
          <stop offset="100%" stopColor="#6e4432" />
        </linearGradient>
        {/* 상단 하이라이트 */}
        <linearGradient id="highlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/* 별 태그 */}
        <linearGradient id="starTag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe9b0" />
          <stop offset="100%" stopColor="#e9a94a" />
        </linearGradient>
      </defs>

      {/* 손잡이 — 담백한 둥근 고리 (리본 제거) */}
      <g>
        <path
          d="M 13 14 C 13 8.5, 15.5 6.5, 20 6.5 C 24.5 6.5, 27 8.5, 27 14"
          stroke="url(#handle)"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* 손잡이 끝 미세한 접점 */}
        <circle cx="13" cy="14" r="0.9" fill="#6e4432" />
        <circle cx="27" cy="14" r="0.9" fill="#6e4432" />
      </g>

      {/* 쇼핑백 본체 */}
      <path
        d="M 10 14 L 30 14 L 32 34 C 32 35.5, 30.8 36.5, 29.4 36.5 L 10.6 36.5 C 9.2 36.5, 8 35.5, 8 34 Z"
        fill="url(#bagBody)"
        stroke="rgba(140,70,50,0.45)"
        strokeWidth="0.6"
      />

      {/* 본체 상단 하이라이트 */}
      <path
        d="M 11 15 L 29 15 L 29 19 C 29 19, 20 21, 11 19 Z"
        fill="url(#highlight)"
        opacity="0.85"
      />

      {/* 바닥 접이선 */}
      <path
        d="M 8.5 32.5 L 31.5 32.5"
        stroke="rgba(140,70,50,0.25)"
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      {/* 중앙 포인트 — 작은 별 태그 (중성) */}
      <g transform="translate(20 26)">
        <path
          d="M 0 -4 L 1.1 -1.3 L 4 -1 L 1.8 1 L 2.4 3.8 L 0 2.3 L -2.4 3.8 L -1.8 1 L -4 -1 L -1.1 -1.3 Z"
          fill="url(#starTag)"
          stroke="rgba(140,70,30,0.5)"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </g>

      {/* 스파클 — 활성일 때만, 금색 톤으로 */}
      {active && (
        <>
          <g opacity="0.9">
            <path
              d="M 6 9 L 6.5 10.5 L 8 11 L 6.5 11.5 L 6 13 L 5.5 11.5 L 4 11 L 5.5 10.5 Z"
              fill="#ffe4a6"
            >
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </path>
          </g>
          <g opacity="0.85">
            <path
              d="M 33 10 L 33.5 11.3 L 35 11.8 L 33.5 12.3 L 33 13.6 L 32.5 12.3 L 31 11.8 L 32.5 11.3 Z"
              fill="#ffe4a6"
            >
              <animate
                attributeName="opacity"
                values="1;0.3;1"
                dur="2s"
                repeatCount="indefinite"
              />
            </path>
          </g>
          <circle cx="15" cy="8.5" r="0.8" fill="#fff4cc">
            <animate
              attributeName="opacity"
              values="0.4;1;0.4"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}
    </svg>
  );
}
