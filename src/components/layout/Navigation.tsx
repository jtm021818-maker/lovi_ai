'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/chat', label: '상담', icon: null, image: '/ui/bottom_menu_1.png' },
  { href: '/xray', label: '엑스레이', icon: null, image: '/ui/bottom_menu_4.png' },
  { href: '/lounge', label: '라운지', icon: null, image: '/ui/bottom_menu_3.png' },
  { href: '/settings', label: '설정', icon: null, image: '/ui/bottom_menu_2.png' },
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
              className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-colors ${
                isActive ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.image ? (
                <Image src={item.image} alt={item.label} width={36} height={36} className="w-9 h-9" />
              ) : (
                <span className="text-xl">{item.icon}</span>
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
