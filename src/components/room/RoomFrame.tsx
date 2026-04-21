'use client';

/**
 * 🏡 v85.2: RoomFrame — 방 바깥 2중 테두리 + 따뜻한 조명 오버레이
 *
 * 느낌: 인형의 집 / 미니어처 방을 들여다보는 느낌.
 *   - 외측: 호두나무 질감 (linear-gradient) 두꺼운 테두리 → 액자 느낌
 *   - 내측: 황동 선 (얇은 골드 라이너)
 *   - 위쪽 조명: radial-gradient 로 따뜻한 햇살 느낌
 *   - 바닥 vignette: 아래쪽 살짝 어둡게 (공간감)
 */

import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  width: number;
  height: number;
}

export default function RoomFrame({ children, width, height }: Props) {
  // 호두나무 질감 — 어두운 갈색 + 미세한 woodgrain 라인
  const woodTexture = `
    linear-gradient(135deg, #5a3e2b 0%, #7c5738 25%, #6b4a2f 50%, #7c5738 75%, #5a3e2b 100%),
    repeating-linear-gradient(
      90deg,
      rgba(0,0,0,0.05) 0px,
      rgba(0,0,0,0.05) 1px,
      transparent 1px,
      transparent 4px
    )
  `;

  return (
    <div
      className="relative mx-auto"
      style={{
        // 외측 프레임 (나무 액자) 포함 크기
        width: width + 28,
        height: height + 28,
        background: woodTexture,
        backgroundBlendMode: 'overlay',
        borderRadius: '28px',
        padding: '10px',
        boxShadow: [
          // 바깥 그림자 (깊이)
          '0 24px 60px rgba(0,0,0,0.35)',
          '0 8px 20px rgba(0,0,0,0.2)',
          // 내부 윤곽 (황동 하이라이트)
          'inset 0 0 0 1px rgba(218,165,32,0.45)',
          // 내부 상단 하이라이트 (빛 반사)
          'inset 0 2px 4px rgba(255,230,180,0.35)',
          // 내부 하단 그림자
          'inset 0 -3px 6px rgba(0,0,0,0.3)',
        ].join(', '),
      }}
    >
      {/* 내측 황동 라이너 */}
      <div
        className="relative overflow-hidden"
        style={{
          width,
          height,
          borderRadius: '20px',
          boxShadow: [
            'inset 0 0 0 2px rgba(212,175,55,0.6)',  // 황동 내측 테두리
            'inset 0 0 0 3px rgba(0,0,0,0.3)',        // 그림자 구분선
          ].join(', '),
        }}
      >
        {children}

        {/* 위쪽 따뜻한 햇살 조명 */}
        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background:
              'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,220,150,0.35) 0%, rgba(255,220,150,0.12) 40%, transparent 70%)',
          }}
        />

        {/* 바닥 vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background:
              'radial-gradient(ellipse 90% 50% at 50% 100%, rgba(80,40,20,0.25) 0%, transparent 60%)',
          }}
        />

        {/* 전체 미세한 vignette (모서리) */}
        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.25)',
            borderRadius: '20px',
          }}
        />
      </div>

      {/* 프레임 상단 장식 — 작은 황동 네임플레이트 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-30 px-3 py-0.5 text-[9px] font-bold tracking-[0.3em] text-amber-100"
        style={{
          top: -6,
          background: 'linear-gradient(180deg, #d4af37 0%, #a08824 100%)',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
          letterSpacing: '0.25em',
        }}
      >
        MIND ROOM
      </div>
    </div>
  );
}
