import Navigation from '@/components/layout/Navigation';
import LoungeToast from '@/components/lounge/LoungeToast';
import LoungeBackgroundTimer from '@/components/lounge/LoungeBackgroundTimer';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // 미들웨어에서 이미 인증 통제를 하므로 별도 클라이언트 검증은 생략
  return (
    <div className="h-full flex flex-col bg-purple-50/30 relative">
      <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)] hide-scrollbar">
        {children}
      </main>
      <Navigation />
      {/* 🆕 v42: 전역 인앱 알림 + 배경 타이머 */}
      <LoungeToast />
      <LoungeBackgroundTimer />
    </div>
  );
}
