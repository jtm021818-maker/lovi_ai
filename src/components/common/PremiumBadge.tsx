'use client';

import Link from 'next/link';

interface Props {
  /** 배지 위에 표시할 라벨 (기본: PRO) */
  label?: string;
  /** 블러 오버레이로 콘텐츠를 가릴지 */
  overlay?: boolean;
  /** 오버레이 대상 children */
  children?: React.ReactNode;
  /** 작은 인라인 배지 모드 */
  inline?: boolean;
}

/**
 * 프리미엄 기능 잠금 표시
 * - inline: 작은 PRO 배지 (버튼 옆에 사용)
 * - overlay: children을 블러 처리하고 잠금 표시
 */
export default function PremiumBadge({ label = 'PRO', overlay, children, inline }: Props) {
  if (inline) {
    return (
      <Link
        href="/subscription"
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-orange-400 text-[9px] font-bold text-white no-underline"
      >
        🔒 {label}
      </Link>
    );
  }

  if (overlay && children) {
    return (
      <div className="relative">
        <div className="blur-[6px] pointer-events-none select-none opacity-60">
          {children}
        </div>
        <Link
          href="/subscription"
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 no-underline"
        >
          <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-sm shadow-lg">
            🔒 {label} 기능
          </div>
          <p className="text-xs text-gray-500">탭하여 프리미엄 알아보기</p>
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/subscription"
      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold no-underline shadow-sm"
    >
      🔒 {label}
    </Link>
  );
}
