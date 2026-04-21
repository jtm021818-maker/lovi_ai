'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import ShopIcon from './ShopIcon';

interface NavItem {
  href: string;
  label: string;
  image?: string;
  emoji?: string;
  /** 🆕 v85.4: 커스텀 SVG 아이콘 컴포넌트 — active prop 을 받아 상태별 스타일링 */
  Icon?: ComponentType<{ active?: boolean; size?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/chat', label: '상담', image: '/ui/bottom_menu_1.png' },
  { href: '/xray', label: '엑스레이', image: '/ui/bottom_menu_4.png' },
  { href: '/room', label: '마음의방', emoji: '🏡' },
  // 🆕 v85.4: 상점 — 10~20대 여성 감성 커스텀 SVG (리본 쇼핑백 + 하트 태그 + 스파클)
  { href: '/shop', label: '상점', Icon: ShopIcon },
  { href: '/settings', label: '설정', image: '/ui/bottom_menu_2.png' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-pink-100 safe-area-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors relative ${
                isActive ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.image ? (
                <Image src={item.image} alt={item.label} width={36} height={36} className="w-9 h-9" />
              ) : item.Icon ? (
                <div
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-100/80 to-amber-100/80 shadow-sm scale-105'
                      : ''
                  }`}
                >
                  <item.Icon active={isActive} size={32} />
                </div>
              ) : (
                <div
                  className={`w-9 h-9 flex items-center justify-center text-2xl rounded-full transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-pink-200 to-rose-200 shadow-sm scale-105'
                      : 'bg-pink-50/50'
                  }`}
                >
                  {item.emoji}
                </div>
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
