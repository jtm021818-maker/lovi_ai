'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  image?: string;
  emoji?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/chat', label: '상담', image: '/ui/bottom_menu_1.png' },
  { href: '/xray', label: '엑스레이', image: '/ui/bottom_menu_4.png' },
  { href: '/room', label: '마음의방', emoji: '🏡' },
  { href: '/shop', label: '상점', image: '/ui/bottom_menu_3.png' },
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
