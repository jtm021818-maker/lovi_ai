'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

/** 카카오톡/인스타/네이버 등 인앱 브라우저(WebView) 감지 */
function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN|Line|DaumApps|SamsungBrowser/i.test(ua);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inApp, setInApp] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setInApp(isInAppBrowser());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('이메일 또는 비밀번호를 다시 확인해 주세요.');
      setLoading(false);
      return;
    }

    // 서버 사이드 인증 검증(proxy.ts, page.tsx)을 확실히 트리거하기 위해 하드 리디렉트 사용
    window.location.href = '/';
  };

  const handleGoogleLogin = async () => {
    // 인앱 브라우저면 외부 브라우저로 열기
    if (isInAppBrowser()) {
      // 외부 브라우저 강제 열기 (intent:// for Android)
      const url = window.location.href;
      const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
      return;
    }
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-end px-6 pb-12 overflow-hidden bg-[#fceae9]">
      
      {/* 
        [배경 이미지 영역] 
        luna_login.webp 등 대표님이 넣어두신 이미지가 화면에 꽉 차게 들어갑니다.
      */}
      <div className="absolute inset-0 z-0 w-full h-full max-w-[500px] mx-auto">
        <Image
          src="/luna_login.webp" // 👈 지정해주신 백그라운드 이미지 파일명
          alt="Luna Login Background"
          fill
          className="object-cover object-top"
          quality={100}
          unoptimized={true}
          priority
        />
        {/* 하단 입력 폼과 텍스트의 가독성을 높여주는 부드러운 오버레이 */}
        <div className="absolute bottom-0 left-0 w-full h-[65%] bg-gradient-to-t from-[#fde7e8] via-[#fceae9]/90 to-transparent pointer-events-none" />
      </div>

      {/* 로딩 오버레이 */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fceae9]/80 backdrop-blur-sm"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-16 h-16 rounded-full border-4 border-[#ee7c9f] border-t-transparent animate-spin mb-4"
            />
            <p className="text-[#e46b90] font-bold text-lg">로그인 중...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 로그인 폼 영역 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] z-10 flex flex-col relative"
      >
        {/* 📱 인앱 브라우저 감지 안내 배너 */}
        <AnimatePresence>
          {inApp && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center"
            >
              <p className="text-amber-800 text-[14px] font-bold mb-2">⚠️ 인앱 브라우저 감지</p>
              <p className="text-amber-700 text-[13px] leading-relaxed">
                카카오톡/인스타그램에서는 Google 로그인이 <br/>제한됩니다.
              </p>
              <button
                onClick={() => {
                  const url = window.location.href;
                  // Android: Chrome으로 강제 열기
                  const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
                  window.location.href = intentUrl;
                }}
                className="mt-3 px-5 py-2.5 rounded-full bg-amber-500 text-white text-[14px] font-bold shadow-sm"
              >
                Chrome에서 열기 🚀
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Google 로그인 버튼 (이미지와 폼 사이 기준점 역할) */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-[16px] rounded-full bg-[#fffcf9]/90 backdrop-blur-md border border-[#e1c5c9] text-[#554b4d] font-bold text-[17px] shadow-sm flex items-center justify-center gap-3 mb-8 transition-all hover:bg-white disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
        </motion.button>

        <form onSubmit={handleLogin} className="space-y-5 w-full">
          <div>
            <label className="block text-[#a67c85] text-[15px] font-bold mb-2 ml-2">이메일 주소</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@pium.garden"
              required
              className="w-full px-6 py-4 rounded-full bg-[#ecf2fa] border border-transparent text-gray-800 placeholder-gray-800 text-[16px] font-medium focus:outline-none focus:border-[#eabac6] focus:ring-1 focus:ring-[#eabac6] transition-all"
            />
          </div>
          <div>
            <label className="block text-[#a67c85] text-[15px] font-bold mb-2 ml-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-6 py-4 rounded-full bg-[#ecf2fa] border border-transparent text-gray-800 placeholder-gray-800 text-[16px] font-medium tracking-widest focus:outline-none focus:border-[#eabac6] focus:ring-1 focus:ring-[#eabac6] transition-all"
            />
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 text-center font-bold mt-2">
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-[18px] mt-2 rounded-[30px] bg-[#ef789c] text-white font-bold text-[17px] shadow-[0_8px_20px_rgba(239,120,156,0.25)] hover:shadow-[0_12px_25px_rgba(239,120,156,0.35)] disabled:opacity-50 transition-all border border-[#eb648b]"
          >
            로그인
          </motion.button>
        </form>

        <div className="mt-8 text-center flex flex-col items-center gap-4">
          <Link href="/" className="text-[#a67c85] text-[15px] font-semibold hover:text-[#e46b90] transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-[#a67c85] after:opacity-50 hover:after:bg-[#e46b90]">
            메인 화면으로
          </Link>
          
          <p className="text-[13px] text-[#b8959d] mt-2">
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className="text-[#e46b90] font-bold hover:underline">
              가입하기
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

