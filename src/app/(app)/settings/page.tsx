'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/welcome');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative min-h-screen">
      <div className="pt-16 pb-8 px-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-b-[40px] shadow-sm mb-6">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 tracking-tight">설정</h1>
        <p className="text-gray-500 font-medium mt-2">앱 관리 및 계정 설정</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 space-y-4">
        <div className="p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between hover:border-pink-200 transition-colors">
          <div>
            <p className="font-bold text-gray-800 text-base">프로필</p>
            <p className="text-xs text-gray-400 mt-1">닉네임, 상담 설정 관리</p>
          </div>
          <span className="text-2xl">👤</span>
        </div>

        <div className="p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between hover:border-pink-200 transition-colors">
          <div>
            <p className="font-bold text-gray-800 text-base">알림</p>
            <p className="text-xs text-gray-400 mt-1">감정 체크 리마인더 설정</p>
          </div>
          <span className="text-2xl">🔔</span>
        </div>

        <div className="p-5 bg-white rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between hover:border-pink-200 transition-colors">
          <div>
            <p className="font-bold text-gray-800 text-base">데이터 관리</p>
            <p className="text-xs text-gray-400 mt-1">상담 기록 내보내기, 삭제</p>
          </div>
          <span className="text-2xl">📂</span>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full p-5 bg-white rounded-[24px] border border-rose-100 shadow-sm flex items-center justify-between hover:bg-rose-50 transition-colors text-left"
        >
          <div>
            <p className="font-bold text-rose-500 text-base">로그아웃</p>
            <p className="text-xs text-rose-400 mt-1">기기에서 로그아웃합니다</p>
          </div>
          <span className="text-2xl">👋</span>
        </button>

        <div className="mt-10 text-center">
          <p className="text-xs font-bold text-gray-300">Love AI v2.0.0</p>
          <p className="text-xs text-gray-300 mt-1">마음이와 함께하는 관계 상담 💜</p>
        </div>
      </div>
    </div>
  );
}
