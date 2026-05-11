'use client';

/**
 * 🌸 Signup — "안녕! 처음 만나요" (Spring Greeting)
 *
 * 10~20대 여성 타겟 · 따뜻한 베이지 핑크 팔레트
 * Login 페이지(/luna_login.webp 베이스)와 톤 통일
 *
 * 구조:
 *   1) 상단 — Luna 마스코트 카드 + 인사 카피
 *   2) 중간 — 인앱 브라우저 경고 / Google / 폼
 *   3) 하단 — 로그인 링크 / 돌아가기
 *   4) 인증 메일 발송 후 — 큰 Luna + 💌 + 친근 카피
 */

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import LunaSprite from '@/components/common/LunaSprite';

/* ─── 인앱 브라우저 감지 (카톡/인스타/네이버/라인) ──── */
function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN|Line|DaumApps|SamsungBrowser/i.test(ua);
}

/* ─── 꽃잎 파티클 데이터 (마운트 1회) ─────────────── */
function usePetals(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        i,
        left: Math.random() * 100,
        bottom: Math.random() * 8,
        size: Math.random() * 9 + 5,
        dur: Math.random() * 8 + 12,
        delay: Math.random() * 14,
        driftX: (Math.random() - 0.5) * 90,
        rot: Math.random() * 260 + 90,
        opacity: Math.random() * 0.35 + 0.25,
        color: i % 3 === 0 ? '#F9B3CF' : i % 3 === 1 ? '#FDC9D8' : '#F9C4DE',
        round: Math.random() > 0.45,
      })),
    [count],
  );
}

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'pw' | 'pw2' | null>(null);
  const router = useRouter();
  const petals = usePetals(14);

  // setting 스프라이트(16MB) 백그라운드 로드 → 완료 시 교체
  const [spritePreset, setSpritePreset] = useState<'avatar' | 'setting'>('avatar');
  useEffect(() => {
    const img = new Image();
    if (img.complete && img.naturalWidth > 0) {
      setSpritePreset('setting');
      return;
    }
    img.onload = () => setSpritePreset('setting');
    img.src = '/splite/luna_sprite_setting_1.webp';
    return () => { img.onload = null; };
  }, []);

  useEffect(() => {
    setInApp(isInAppBrowser());
  }, []);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('비밀번호가 서로 달라요. 한 번만 더 확인해 주세요 🌸');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback?next=/onboarding`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // 이메일 인증 비활성화 시 — 세션 즉시 생성 → 온보딩 직행
      window.location.href = '/onboarding';
    } else {
      setEmailSent(true);
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (isInAppBrowser()) {
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
        redirectTo: `${window.location.origin}/callback?next=/onboarding`,
      },
    });
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center px-6 py-8"
      style={{
        background:
          'linear-gradient(165deg, #FFF8FB 0%, #FDE7E8 40%, #FFEBF0 100%)',
      }}
    >
      {/* 미세 노이즈 (감성 질감) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '160px 160px',
        }}
      />

      {/* 꽃잎 파티클 */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {petals.map((p) => (
          <span
            key={p.i}
            className="onb-petal"
            style={{
              left: `${p.left}%`,
              bottom: `-${p.bottom}vh`,
              width: p.size,
              height: p.round ? p.size * 0.65 : p.size,
              backgroundColor: p.color,
              opacity: p.opacity,
              borderRadius: p.round ? '50% 0 50% 0' : '50%',
              ['--petal-dur' as string]: `${p.dur}s`,
              ['--petal-delay' as string]: `${p.delay}s`,
              ['--drift-x' as string]: `${p.driftX}px`,
              ['--petal-rot' as string]: `${p.rot}deg`,
            }}
          />
        ))}
      </div>

      {/* 로딩 오버레이 — Google OAuth 진행 시 */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md"
            style={{ background: 'rgba(255,240,245,0.78)' }}
          >
            <motion.div
              animate={{ scale: [1, 1.12, 1], rotate: [0, 6, -6, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="text-5xl mb-4 drop-shadow-[0_4px_12px_rgba(232,98,154,0.35)]"
            >
              🌸
            </motion.div>
            <p
              className="text-[15px] font-bold tracking-wide"
              style={{ fontFamily: 'var(--font-korean)', color: '#E46B90' }}
            >
              루나가 마중나가는 중이에요…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[360px] flex flex-col items-center"
      >
        <AnimatePresence mode="wait">
          {emailSent ? (
            /* ═════════ 이메일 인증 안내 ═════════ */
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center text-center pt-6"
            >
              {/* 큰 Luna + 떠다니는 💌 */}
              <div className="relative mb-5">
                <div className="onb-mascot-card">
                  <div aria-hidden className="onb-mascot-bg" />
                  <LunaSprite
                    preset={spritePreset}
                    size={180}
                    circle={false}
                    speed="normal"
                    className="onb-mascot-sprite"
                  />
                </div>
                <motion.span
                  animate={{ y: [0, -7, 0], rotate: [0, 6, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  aria-hidden
                  className="absolute -top-4 -right-3 text-3xl drop-shadow-sm pointer-events-none select-none"
                >
                  💌
                </motion.span>
                <motion.span
                  animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 2.6 }}
                  aria-hidden
                  className="absolute -bottom-1 -left-3 text-base pointer-events-none select-none"
                >
                  ✨
                </motion.span>
              </div>

              <h2
                className="text-[22px] font-bold mb-2"
                style={{ fontFamily: 'var(--font-handwrite-soft)', color: '#3D2B4E' }}
              >
                메일함을 확인해 주세요 ✉️
              </h2>
              <p
                className="text-[13.5px] leading-relaxed mb-1.5"
                style={{ fontFamily: 'var(--font-korean)', color: '#7A5C8A' }}
              >
                <span className="font-bold" style={{ color: '#E46B90' }}>{email}</span> 로<br />
                인증 링크를 보냈어요.
              </p>
              <p
                className="text-[12.5px] leading-relaxed mb-2"
                style={{ fontFamily: 'var(--font-korean)', color: '#9475A8' }}
              >
                링크를 톡 누르면<br />바로 루나와 만나요 🌸
              </p>
              <p
                className="text-[11px] mb-6"
                style={{ fontFamily: 'var(--font-handwrite-soft)', color: '#C4A0CE' }}
              >
                ✦ 스팸함도 한 번만 봐주세요 ✦
              </p>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
                className="text-[12px] underline underline-offset-2 transition-colors"
                style={{ color: '#A67C85', fontFamily: 'var(--font-korean)' }}
              >
                다른 이메일로 다시 가입하기
              </button>
            </motion.div>
          ) : (
            /* ═════════ 가입 메인 화면 ═════════ */
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center"
            >
              {/* ─── Luna 마스코트 ─── */}
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative mb-4"
              >
                <div className="onb-mascot-card" style={{ padding: 12 }}>
                  <div aria-hidden className="onb-mascot-bg" />
                  <LunaSprite
                    preset={spritePreset}
                    size={130}
                    circle={false}
                    speed="normal"
                    className="onb-mascot-sprite"
                  />
                </div>
                <motion.span
                  animate={{ rotate: [0, 14, -8, 0], scale: [1, 1.12, 1] }}
                  transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut' }}
                  aria-hidden
                  className="absolute -top-3 -right-2 text-xl drop-shadow-sm pointer-events-none select-none"
                >
                  🌸
                </motion.span>
                <motion.span
                  animate={{ rotate: [0, -12, 6, 0], scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 1.2 }}
                  aria-hidden
                  className="absolute -bottom-2 -left-2 text-base drop-shadow-sm pointer-events-none select-none"
                >
                  ✨
                </motion.span>
              </motion.div>

              {/* ─── 인사 카피 ─── */}
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.5 }}
                className="text-[24px] font-bold text-center leading-tight"
                style={{ fontFamily: 'var(--font-handwrite-soft)', color: '#3D2B4E' }}
              >
                안녕! 처음 만나요 🌸
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.48, duration: 0.5 }}
                className="text-[13px] text-center mt-1.5 mb-6"
                style={{ fontFamily: 'var(--font-korean)', color: '#9475A8' }}
              >
                루나와 함께 시작해볼까요?
              </motion.p>

              {/* ─── 인앱 브라우저 경고 (따뜻한 피치) ─── */}
              <AnimatePresence>
                {inApp && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full mb-3 p-3.5 rounded-2xl text-center"
                    style={{
                      background:
                        'linear-gradient(135deg, #FFF0E0 0%, #FFE0CD 100%)',
                      border: '1.5px solid rgba(232, 160, 122, 0.45)',
                    }}
                  >
                    <p
                      className="text-[12.5px] font-bold mb-1"
                      style={{ fontFamily: 'var(--font-korean)', color: '#B85C2A' }}
                    >
                      🍑 카톡/인스타 브라우저예요
                    </p>
                    <p
                      className="text-[11.5px] leading-relaxed mb-2.5"
                      style={{ fontFamily: 'var(--font-korean)', color: '#A65E3F' }}
                    >
                      여기선 Google 로그인이 막혀 있어요.
                    </p>
                    <button
                      onClick={() => {
                        const url = window.location.href;
                        const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
                        window.location.href = intentUrl;
                      }}
                      className="px-4 py-1.5 rounded-full text-white text-[12px] font-bold shadow-sm"
                      style={{
                        background: 'linear-gradient(120deg, #FFA776 0%, #FF8B57 100%)',
                      }}
                    >
                      Chrome에서 열기 🚀
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Google 가입 버튼 ─── */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.62, duration: 0.5 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full py-[15px] rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center gap-2.5 mb-5 disabled:opacity-55 transition-all"
                style={{
                  fontFamily: 'var(--font-korean)',
                  color: '#554B4D',
                  fontWeight: 700,
                  fontSize: 15,
                  border: '1.5px solid #E1C5C9',
                  boxShadow: '0 4px 14px rgba(239,120,156,0.12)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google로 시작하기
              </motion.button>

              {/* OR 구분선 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.74, duration: 0.4 }}
                className="w-full flex items-center gap-3 mb-5"
              >
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(180,140,170,0.35), transparent)',
                  }}
                />
                <span
                  className="text-[11px] tracking-wider"
                  style={{ fontFamily: 'var(--font-handwrite-soft)', color: '#B38BC6' }}
                >
                  또는 이메일로
                </span>
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(180,140,170,0.35), transparent)',
                  }}
                />
              </motion.div>

              {/* ─── 폼 ─── */}
              <motion.form
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.55 }}
                onSubmit={handleSignUp}
                className="w-full space-y-3"
              >
                <FormInput
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="이메일 주소"
                  icon="📮"
                  focused={focusedField === 'email'}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                />
                <FormInput
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="비밀번호 (6자리 이상)"
                  icon="🔒"
                  focused={focusedField === 'pw'}
                  onFocus={() => setFocusedField('pw')}
                  onBlur={() => setFocusedField(null)}
                  required
                  minLength={6}
                />
                <FormInput
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="비밀번호 한 번 더"
                  icon="🔐"
                  focused={focusedField === 'pw2'}
                  onFocus={() => setFocusedField('pw2')}
                  onBlur={() => setFocusedField(null)}
                  required
                  minLength={6}
                />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[12px] font-medium text-center px-3 py-2 rounded-xl"
                      style={{
                        fontFamily: 'var(--font-korean)',
                        color: '#C53A6A',
                        background: 'rgba(255,220,230,0.65)',
                        border: '1px solid rgba(232,98,154,0.25)',
                      }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.975 }}
                  type="submit"
                  disabled={loading}
                  className="onb-shimmer w-full py-[16px] mt-1 rounded-full font-bold text-white text-[15.5px] tracking-wide disabled:opacity-55 transition-transform"
                  style={{
                    fontFamily: 'var(--font-korean)',
                    background:
                      'linear-gradient(120deg, #EF789C 0%, #EE82B5 55%, #E8A07A 100%)',
                    boxShadow:
                      '0 10px 26px rgba(239,120,156,0.32), 0 1px 0 rgba(255,255,255,0.45) inset',
                  }}
                >
                  이메일로 가입하기 →
                </motion.button>
              </motion.form>

              {/* ─── 푸터 ─── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.05, duration: 0.5 }}
                className="mt-7 flex flex-col items-center gap-3"
              >
                <p
                  className="text-[12.5px]"
                  style={{ fontFamily: 'var(--font-korean)', color: '#9475A8' }}
                >
                  이미 계정이 있나요?{' '}
                  <Link
                    href="/login"
                    className="font-bold hover:underline"
                    style={{ color: '#E46B90' }}
                  >
                    로그인하기
                  </Link>
                </p>
                <button
                  onClick={() => router.push('/welcome')}
                  className="text-[11.5px] transition-colors"
                  style={{ color: '#C4A0CE', fontFamily: 'var(--font-handwrite-soft)' }}
                >
                  ← 처음 화면으로
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ─── Form Input — 이모지 아이콘 + 포커스 글로우 ─── */
interface FormInputProps {
  type: 'email' | 'password';
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  required?: boolean;
  minLength?: number;
}

function FormInput({
  type,
  value,
  onChange,
  placeholder,
  icon,
  focused,
  onFocus,
  onBlur,
  required,
  minLength,
}: FormInputProps) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] pointer-events-none select-none"
      >
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full pl-11 pr-5 py-[14px] rounded-full text-[14.5px] focus:outline-none transition-all"
        style={{
          fontFamily: 'var(--font-korean)',
          color: '#3D2B4E',
          background: 'rgba(255, 255, 255, 0.92)',
          border: focused ? '2px solid #EF789C' : '2px solid rgba(232, 196, 222, 0.55)',
          boxShadow: focused
            ? '0 0 0 4px rgba(239,120,156,0.12), 0 4px 14px rgba(239,120,156,0.14)'
            : '0 1px 4px rgba(210,140,180,0.08)',
        }}
      />
    </div>
  );
}
