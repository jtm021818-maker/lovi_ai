import Navigation from '@/components/layout/Navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex flex-col bg-purple-50/30 relative">
      <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)] hide-scrollbar">
        {children}
      </main>
      <Navigation />
    </div>
  );
}
