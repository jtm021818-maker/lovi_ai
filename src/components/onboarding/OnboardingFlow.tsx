'use client';

/**
 * 🌌 Onboarding — "별빛 의식 (Starlight Ritual)"
 *
 * 20~30대 여성 타겟 프리미엄 입장 시퀀스.
 * 폼 기입이 아니라 *루나가 당신의 이름을 묻는 한 장면* 으로 연출.
 *
 * 레이어:
 *   L1 우주 그라데이션
 *   L2 부유 별 입자 (CSS keyframe, no lib)
 *   L3 후광 오라 (회전 ring + radial glow)
 *   L4 LunaSprite (setting preset, 49 frames)
 *   L5 헤더 손글씨 텍스트 (per-word stagger)
 *   L6 글래스 인풋 + 핑크 글로우
 *   L7 그라데이션 버튼 + shimmer
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LunaSprite from '@/components/common/LunaSprite';

const GENDERS = [
  {
    id: 'female',
    emoji: '🌸',
    label: '여성',
    desc: '꽃잎처럼 부드러운 결',
    accent: 'from-pink-400/60 to-rose-300/60',
  },
  {
    id: 'male',
    emoji: '✦',
    label: '남성',
    desc: '별처럼 단단한 결',
    accent: 'from-indigo-400/60 to-purple-400/60',
  },
  {
    id: 'other',
    emoji: '✨',
    label: '비밀이에요',
    desc: '말하지 않고도 닿는 결',
    accent: 'from-mystic-glow/50 to-mystic-purple/50',
  },
] as const;

// 별 입자 데이터 생성 (마운트 시 1회만 — 재렌더 시 위치 점프 방지)
function useStars(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const size = Math.random() * 2.4 + 0.8; // 0.8~3.2px
        const left = Math.random() * 100;
        const bottom = Math.random() * 10; // 0~10vh
        const dur = Math.random() * 10 + 12; // 12~22s
        const delay = Math.random() * 14;
        const driftX = (Math.random() - 0.5) * 60;
        const opacity = Math.random() * 0.5 + 0.4;
        const hue = Math.random() > 0.5 ? '255,200,230' : '224,170,255'; // pink / glow purple
        return { i, size, left, bottom, dur, delay, driftX, opacity, hue };
      }),
    [count]
  );
}

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const stars = useStars(18);

  const handleStart = () => {
    if (isLoading) return;
    setIsLoading(true);
    // 짧은 페이드아웃 후 다음 step
    setTimeout(() => {
      setStep(1);
      setIsLoading(false);
    }, 380);
  };

  const handleSituationSelect = async (situationId: string) => {
    setIsExiting(true);
    try {
      const onboardingRes = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname || '익명', situation: situationId }),
      });
      if (!onboardingRes.ok) {
        console.error('온보딩 API 에러:', onboardingRes.status);
      }
      router.push('/chat');
    } catch {
      router.push('/chat');
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6 bg-[#0B0A1D]">
      {/* ─── L1: 우주 그라데이션 ─── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 18%, rgba(157,78,221,0.28) 0%, rgba(255,112,166,0.14) 28%, rgba(11,10,29,0) 55%), radial-gradient(80% 60% at 80% 92%, rgba(255,112,166,0.18) 0%, rgba(11,10,29,0) 60%), linear-gradient(180deg, #0B0A1D 0%, #15112E 70%, #1a1336 100%)',
        }}
      />

      {/* 미세 노이즈 텍스처 (감성 깊이) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '180px 180px',
        }}
      />

      {/* ─── L2: 부유 별 입자 ─── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {stars.map((s) => (
          <span
            key={s.i}
            className="onb-star"
            style={{
              left: `${s.left}%`,
              bottom: `-${s.bottom}vh`,
              width: s.size,
              height: s.size,
              background: `rgba(${s.hue},${s.opacity})`,
              boxShadow: `0 0 ${s.size * 3}px rgba(${s.hue},${s.opacity * 0.9})`,
              ['--star-dur' as any]: `${s.dur}s`,
              ['--star-delay' as any]: `${s.delay}s`,
              ['--drift-x' as any]: `${s.driftX}px`,
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.section
            key="invite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full max-w-[380px] flex flex-col items-center ${
              isLoading ? 'onb-stardust-out' : ''
            }`}
          >
            {/* ─── L3 + L4: 후광 오라 + Luna ─── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-[240px] h-[240px] flex items-center justify-center mb-6"
            >
              {/* 회전 ring (점선) */}
              <div
                aria-hidden
                className="onb-halo-spin absolute top-1/2 left-1/2 w-[230px] h-[230px] rounded-full"
                style={{
                  border: '1px dashed rgba(224,170,255,0.35)',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              {/* radial glow */}
              <div
                aria-hidden
                className="onb-halo-pulse absolute top-1/2 left-1/2 w-[210px] h-[210px] rounded-full"
                style={{
                  background:
                    'radial-gradient(50% 50% at 50% 50%, rgba(255,112,166,0.45) 0%, rgba(157,78,221,0.25) 40%, rgba(11,10,29,0) 75%)',
                  filter: 'blur(2px)',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              {/* 작은 위성 별 */}
              <span
                aria-hidden
                className="onb-star-twinkle absolute -top-1 right-4 text-mystic-glow text-xl drop-shadow-[0_0_8px_rgba(224,170,255,0.8)]"
              >
                ✦
              </span>
              <span
                aria-hidden
                className="onb-star-twinkle absolute bottom-2 -left-2 text-mystic-pink text-sm drop-shadow-[0_0_6px_rgba(255,112,166,0.9)]"
                style={{ animationDelay: '0.9s', animationDuration: '4.4s' }}
              >
                ✧
              </span>

              {/* Luna 스프라이트 */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
                className="relative z-10"
              >
                <LunaSprite
                  preset="setting"
                  size={180}
                  circle={true}
                  speed="normal"
                  style={{
                    filter:
                      'drop-shadow(0 8px 24px rgba(255,112,166,0.35)) drop-shadow(0 0 18px rgba(224,170,255,0.25))',
                    border: '2px solid rgba(255,255,255,0.18)',
                  }}
                />
              </motion.div>
            </motion.div>

            {/* ─── L5: 헤더 + 서브 ─── */}
            <motion.h1
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="text-[26px] font-bold text-white tracking-tight text-center"
              style={{ fontFamily: 'var(--font-handwrite-soft)' }}
            >
              별빛이 닿았어요
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.5 }}
              className="mt-2.5 text-[13.5px] text-mystic-glow/80 text-center leading-relaxed px-2"
              style={{ fontFamily: 'var(--font-korean)' }}
            >
              루나가 당신을 기다리고 있었어요.<br />
              어떻게 불러드릴까요?
            </motion.p>

            {/* ─── L6 + L7: 입력 + 버튼 ─── */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full mt-9 space-y-3.5"
            >
              <div className="relative">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="닉네임 (선택)"
                  maxLength={12}
                  className={`w-full px-5 py-[15px] rounded-2xl bg-white/[0.06] backdrop-blur-xl border text-white text-center text-[15px] placeholder:text-white/35 focus:outline-none transition-all ${
                    inputFocused
                      ? 'border-mystic-pink/60 onb-input-focus'
                      : 'border-white/12'
                  }`}
                  style={{ fontFamily: 'var(--font-korean)' }}
                />
                {/* 좌측 작은 별 데코 */}
                <span
                  aria-hidden
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-mystic-glow/50 text-xs pointer-events-none"
                  style={{ opacity: nickname || inputFocused ? 0 : 1, transition: 'opacity .25s' }}
                >
                  ✦
                </span>
                {nickname && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-mystic-pink text-sm pointer-events-none"
                  >
                    ✨
                  </motion.span>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStart}
                disabled={isLoading}
                className="onb-shimmer relative w-full py-[16px] rounded-2xl overflow-hidden font-bold text-white text-[15.5px] tracking-wide disabled:opacity-60 transition-all"
                style={{
                  background:
                    'linear-gradient(120deg, #FF70A6 0%, #FF92B5 40%, #FFA88A 100%)',
                  boxShadow:
                    '0 10px 32px rgba(255,112,166,0.35), 0 0 0 1px rgba(255,255,255,0.18) inset, 0 1px 0 rgba(255,255,255,0.35) inset',
                  fontFamily: 'var(--font-korean)',
                }}
              >
                <span className="relative z-[1]">
                  {isLoading ? '별의 문이 열려요…' : '여정을 시작할게요'}
                </span>
              </motion.button>

              <p
                className="pt-1 text-center text-[11px] text-white/35 tracking-[0.18em]"
                style={{ fontFamily: 'var(--font-handwrite-soft)' }}
              >
                ✦ &nbsp;잠시 우주의 문을 엽니다&nbsp; ✦
              </p>
            </motion.div>
          </motion.section>
        )}

        {step === 1 && (
          <motion.section
            key="situation"
            initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full max-w-[380px] ${isExiting ? 'onb-stardust-out' : ''}`}
          >
            {/* 상단 작은 Luna */}
            <div className="relative w-[110px] h-[110px] mx-auto mb-4 flex items-center justify-center">
              <div
                aria-hidden
                className="onb-halo-pulse absolute top-1/2 left-1/2 w-[120px] h-[120px] rounded-full"
                style={{
                  background:
                    'radial-gradient(50% 50% at 50% 50%, rgba(255,112,166,0.35) 0%, rgba(11,10,29,0) 70%)',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 3.2 }}
                className="relative z-10"
              >
                <LunaSprite
                  preset="setting"
                  size={92}
                  circle={true}
                  speed="normal"
                  style={{
                    filter: 'drop-shadow(0 6px 16px rgba(255,112,166,0.35))',
                    border: '2px solid rgba(255,255,255,0.18)',
                  }}
                />
              </motion.div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-center text-[22px] font-bold text-white tracking-tight"
              style={{ fontFamily: 'var(--font-handwrite-soft)' }}
            >
              {nickname ? `${nickname}님은, ` : '당신은, '}
              <br />
              어떤 별이신가요?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-center text-[12.5px] text-mystic-glow/70 mt-2 mb-7 px-4 leading-relaxed"
              style={{ fontFamily: 'var(--font-korean)' }}
            >
              루나가 당신에게 꼭 맞는 결을 준비해드릴게요.<br />
              <span className="text-white/40">언제든 바꿀 수 있어요</span>
            </motion.p>

            <div className="space-y-3">
              {GENDERS.map((g, i) => (
                <motion.button
                  key={g.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.09, duration: 0.5 }}
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSituationSelect(g.id)}
                  className="group relative w-full flex items-center gap-4 p-[14px] pl-[16px] rounded-2xl bg-white/[0.045] backdrop-blur-xl border border-white/10 hover:border-mystic-pink/40 text-left overflow-hidden transition-all"
                  style={{
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                  }}
                >
                  {/* 호버 시 글로우 ring */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, transparent 30%, rgba(255,112,166,0.12) 100%)`,
                    }}
                  />
                  {/* 좌측 컬러 닷 */}
                  <span
                    aria-hidden
                    className={`relative w-11 h-11 rounded-full bg-gradient-to-br ${g.accent} flex items-center justify-center text-lg shadow-[0_0_18px_rgba(255,112,166,0.25)] border border-white/15`}
                  >
                    {g.emoji}
                  </span>
                  <div className="relative flex-1">
                    <p
                      className="font-bold text-white text-[14.5px]"
                      style={{ fontFamily: 'var(--font-korean)' }}
                    >
                      {g.label}
                    </p>
                    <p
                      className="text-[11.5px] text-mystic-glow/60 mt-0.5"
                      style={{ fontFamily: 'var(--font-handwrite-soft)' }}
                    >
                      {g.desc}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="relative text-mystic-glow/40 group-hover:text-mystic-pink group-hover:translate-x-0.5 transition-all"
                  >
                    →
                  </span>
                </motion.button>
              ))}
            </div>

            <p
              className="mt-7 text-center text-[11px] text-white/30 tracking-[0.18em]"
              style={{ fontFamily: 'var(--font-handwrite-soft)' }}
            >
              ✦ &nbsp;당신의 결을 기록합니다&nbsp; ✦
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
