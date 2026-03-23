'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('입력하신 비밀번호가 서로 다릅니다.');
      return;
    }
    
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.href = '/';
    } else {
      setError('운명의 문이 열렸습니다! 이메일 인증 후 다시 와주세요.');
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-64 h-64 bg-mystic-purple rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-mystic-pink rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* 전체 화면 로딩 오버레이 */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-6xl mb-6 drop-shadow-[0_0_20px_rgba(157,78,221,0.8)]"
            >
              ✨
            </motion.div>
            <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-mystic-purple to-mystic-pink animate-pulse tracking-wide">
              별의 궤적을 그리는 중...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm bg-white/5 backdrop-blur-3xl p-8 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: -5 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-mystic-purple to-mystic-700 border border-white/10 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-mystic-pink/20 text-2xl"
          >
            ✨
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">새로운 여정</h1>
          <p className="text-sm text-mystic-glow mt-2 opacity-80">마음이와 함께 우주를 탐험할 준비가 되셨나요?</p>
        </div>

        {/* Google 로그인 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold shadow-sm hover:bg-white/20 transition-all flex items-center justify-center gap-3 mb-6 disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
        </motion.button>

        {/* OR 구분선 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="text-xs text-gray-400 font-medium">또는 이메일로</span>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 입력"
              required
              className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-mystic-pink focus:border-transparent transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자리 이상)"
              required
              minLength={6}
              className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-mystic-pink focus:border-transparent transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 한 번 더 확인"
              required
              minLength={6}
              className="w-full px-5 py-4 rounded-2xl bg-black/20 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-mystic-pink focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-rose-300 text-center bg-rose-950/50 border border-rose-900/50 py-3 rounded-xl backdrop-blur-md">
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 rounded-2xl bg-gradient-to-r from-mystic-purple to-mystic-pink text-white font-bold shadow-[0_0_15px_rgba(157,78,221,0.3)] hover:shadow-[0_0_25px_rgba(255,112,166,0.5)] disabled:opacity-50 transition-all border border-white/10"
          >
            이메일로 여정 시작하기
          </motion.button>
        </form>

        <div className="mt-8 text-center flex flex-col items-center gap-4">
          <p className="text-sm text-gray-400">
            이미 우주에 기록이 있으신가요?{' '}
            <Link href="/login" className="text-mystic-glow font-bold hover:underline drop-shadow-sm">
              로그인하기
            </Link>
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← 운명의 기로로 돌아가기
          </button>
        </div>
      </motion.div>
    </div>
  );
}

