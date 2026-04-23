import Navigation from '@/components/layout/Navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-purple-50/30 relative">
      {/* 🆕 v82.19: Luna 스프라이트 preload — 대용량 이미지 조기 다운로드로 첫 등장 지연 최소화 */}
      <link rel="preload" as="image" href="/splite/luna_sprite_1.webp" fetchPriority="high" />
      <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)] hide-scrollbar">
        {children}
      </main>
      <Navigation />
    </div>
  );
}
