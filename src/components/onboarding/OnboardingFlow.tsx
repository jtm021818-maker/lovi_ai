'use client';

/**
 * 🌸 Onboarding — "봄날 첫 만남 (Spring First Meeting)"
 *
 * 20~30대 여성 타겟 · 따뜻한 크림/블러시/라벤더 팔레트
 *
 * 핵심 포인트:
 *   - 루나가 직접 "처음 만나요!" 하고 인사하는 구조
 *   - 스프라이트 로딩 전: 부드러운 핑크 skeleton placeholder 표시
 *   - 스프라이트 로딩 후: 자연스럽게 fade-in
 *   - 꽃잎 파티클 (not 우주별)
 *   - 라이트 테마 전체
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LunaSprite from '@/components/common/LunaSprite';
import { KOREAN_REGIONS, DEFAULT_REGION_CODE } from '@/engines/temporal/region-mapping';

/* ─── 성별 선택 데이터 ─────────────────────────────────── */
const GENDERS = [
  {
    id: 'female',
    emoji: '🌸',
    label: '여성이에요',
    desc: '루나가 더 섬세하게 공감해드릴게요',
    color: '#E8629A',
    bg: '#FFF0F5',
  },
  {
    id: 'male',
    emoji: '🍀',
    label: '남성이에요',
    desc: '루나가 든든하게 곁에 있어드릴게요',
    color: '#7B6FD0',
    bg: '#F3F0FF',
  },
  {
    id: 'other',
    emoji: '✨',
    label: '비밀이에요',
    desc: '말하지 않아도 괜찮아요',
    color: '#B06AB3',
    bg: '#FBF0FF',
  },
] as const;

/* ─── 지역 이모지 매핑 (EditRegionSheet 와 동일) ──────── */
const REGION_EMOJI: Record<string, string> = {
  'KR-11': '🌆', // 서울
  'KR-26': '🌊', // 부산
  'KR-27': '🍎', // 대구
  'KR-28': '✈️', // 인천
  'KR-29': '🌻', // 광주
  'KR-30': '🌳', // 대전
  'KR-31': '🛳️', // 울산
  'KR-50': '🏛️', // 세종
  'KR-41': '🏙️', // 경기
  'KR-42': '⛰️', // 강원
  'KR-43': '🌾', // 충북
  'KR-44': '🌷', // 충남
  'KR-45': '🍚', // 전북
  'KR-46': '🌿', // 전남
  'KR-47': '🍂', // 경북
  'KR-48': '⚓', // 경남
  'KR-49': '🌴', // 제주
};

/* ─── 꽃잎 파티클 데이터 (마운트 1회) ─────────────────── */
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
        // 핑크/라벤더 교차
        color: i % 3 === 0 ? '#F9B3CF' : i % 3 === 1 ? '#D4AAEF' : '#F9C4DE',
        // 꽃잎 모양: 타원 or 둥근 사각
        round: Math.random() > 0.45,
      })),
    [count],
  );
}

/* ─── 메인 컴포넌트 ────────────────────────────────────── */
export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  // step 1, 2 에서 누적 수집 → step 2 종료 시 한 번에 submit
  const [gender, setGender] = useState<string | null>(null);
  const [regionCode, setRegionCode] = useState<string>(DEFAULT_REGION_CODE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  /**
   * setting 스프라이트(16MB)는 최초 로드에 오래 걸림.
   * avatar 스프라이트는 모듈 레벨에서 이미 프리로드 → 즉시 표시.
   * 백그라운드에서 setting을 로드하고 완료 시 preset 교체.
   */
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

  const petals = usePetals(16);

  const handleStart = () => {
    if (isLoading) return;
    setIsLoading(true);
    setTimeout(() => {
      setStep(1);
      setIsLoading(false);
    }, 380);
  };

  /** step 1: 성별 선택 → state 저장 + step 2 로 진행 (아직 submit X) */
  const handleSituationSelect = (situationId: string) => {
    setGender(situationId);
    setStep(2);
  };

  /** step 2: 지역 확정 → 모든 정보 한 번에 submit + /chat */
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsExiting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname || '익명',
          situation: gender,
          region_code: regionCode,
        }),
      });
      if (!res.ok) console.error('온보딩 API 에러:', res.status);
      router.push('/chat');
    } catch {
      router.push('/chat');
    }
  };

  return (
    /* ─── L1: 따뜻한 크림→블러시→라벤더 그라데이션 ─── */
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6"
      style={{
        background:
          'linear-gradient(165deg, #FFF8FB 0%, #FDF0F7 40%, #F5EEFF 100%)',
      }}
    >
      {/* 미세 노이즈 (질감) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '160px 160px',
        }}
      />

      {/* ─── L2: 꽃잎 파티클 ─── */}
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

      <AnimatePresence mode="wait">
        {/* ══════════════════════════ STEP 0 ══════════════════════════ */}
        {step === 0 && (
          <motion.section
            key="invite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className={`relative w-full max-w-[360px] flex flex-col items-center ${
              isLoading ? 'onb-exit' : ''
            }`}
          >
            {/* ─── 스프라이트 영역 (settings 페이지 구조 동일하게 미러) ─── */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="relative mb-5"
            >
              {/* 카드 — avatar(즉시)→setting(로드 완료 후) 교체 */}
              <div className="onb-mascot-card">
                <div aria-hidden className="onb-mascot-bg" />
                <LunaSprite
                  preset={spritePreset}
                  size={220}
                  circle={false}
                  speed="normal"
                  className="onb-mascot-sprite"
                />
              </div>

              {/* 장식 이모지 */}
              <motion.span
                animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut' }}
                aria-hidden
                className="absolute -top-3 -right-3 text-2xl drop-shadow-sm select-none pointer-events-none"
              >
                🌸
              </motion.span>
              <motion.span
                animate={{ rotate: [0, -10, 8, 0], scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 1.2 }}
                aria-hidden
                className="absolute -bottom-2 -left-3 text-lg drop-shadow-sm select-none pointer-events-none"
              >
                ✨
              </motion.span>
            </motion.div>

            {/* ─── 헤더 텍스트 ─── */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.55 }}
              className="text-[24px] font-bold text-center leading-snug"
              style={{
                fontFamily: 'var(--font-handwrite-soft)',
                color: '#3D2B4E',
              }}
            >
              처음 만나요, 저는 루나예요 🌙
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.5 }}
              className="mt-2 text-[13.5px] text-center leading-relaxed px-4"
              style={{ fontFamily: 'var(--font-korean)', color: '#7A5C8A' }}
            >
              편하게 불러드릴 이름을 알려주세요.<br />
              <span style={{ color: '#B38BC6' }}>닉네임은 언제든 바꿀 수 있어요</span>
            </motion.p>

            {/* ─── 인풋 + 버튼 ─── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.92, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="w-full mt-8 space-y-3.5"
            >
              <div className="relative">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="닉네임을 입력해주세요 (선택)"
                  maxLength={12}
                  className={`w-full px-5 py-[15px] rounded-2xl bg-white border text-center text-[15px] focus:outline-none transition-all ${
                    inputFocused
                      ? 'border-[#E8629A]/60 onb-input-focus'
                      : 'border-[#EDD5E5]'
                  }`}
                  style={{
                    fontFamily: 'var(--font-korean)',
                    color: '#3D2B4E',
                    boxShadow: inputFocused
                      ? undefined
                      : '0 2px 8px rgba(210,100,155,0.08)',
                  }}
                />
                {nickname && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-base pointer-events-none select-none"
                  >
                    🌸
                  </motion.span>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.975 }}
                onClick={handleStart}
                disabled={isLoading}
                className="onb-shimmer w-full py-[16px] rounded-2xl font-bold text-white text-[15.5px] tracking-wide disabled:opacity-55 transition-transform"
                style={{
                  fontFamily: 'var(--font-korean)',
                  background:
                    'linear-gradient(120deg, #E8629A 0%, #EE82B5 55%, #E8A07A 100%)',
                  boxShadow:
                    '0 10px 28px rgba(232,98,154,0.32), 0 1px 0 rgba(255,255,255,0.4) inset',
                }}
              >
                {isLoading ? '루나가 준비하고 있어요…' : '루나에게 인사하기 →'}
              </motion.button>

              <p
                className="text-center text-[11px] tracking-[0.16em] pt-1"
                style={{ fontFamily: 'var(--font-handwrite-soft)', color: '#C4A0CE' }}
              >
                🌸 &nbsp;따뜻한 이야기가 기다려요&nbsp; 🌸
              </p>
            </motion.div>
          </motion.section>
        )}

        {/* ══════════════════════════ STEP 1 ══════════════════════════ */}
        {step === 1 && (
          <motion.section
            key="gender"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full max-w-[360px] ${isExiting ? 'onb-exit' : ''}`}
          >
            {/* 작아진 루나 (settings 구조 동일) */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="onb-mascot-card" style={{ padding: 10 }}>
                  <div aria-hidden className="onb-mascot-bg" />
                  <LunaSprite
                    preset="setting"
                    size={90}
                    circle={false}
                    speed="normal"
                    className="onb-mascot-sprite"
                  />
                </div>
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 2.4 }}
                  aria-hidden
                  className="absolute -top-2 -right-2 text-base select-none pointer-events-none"
                >
                  🌸
                </motion.span>
              </div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5 }}
              className="text-[22px] font-bold text-center leading-snug"
              style={{
                fontFamily: 'var(--font-handwrite-soft)',
                color: '#3D2B4E',
              }}
            >
              {nickname ? `${nickname}님은` : '혹시'}, <br />
              어떤 분이세요? 🍀
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28, duration: 0.45 }}
              className="text-center text-[12.5px] mt-2 mb-6 leading-relaxed px-4"
              style={{ fontFamily: 'var(--font-korean)', color: '#9475A8' }}
            >
              루나가 더 잘 맞는 이야기를 드릴 수 있어요.<br />
              <span style={{ color: '#C4A0CE' }}>나중에 바꿀 수 있어요</span>
            </motion.p>

            <div className="space-y-3">
              {GENDERS.map((g, i) => (
                <motion.button
                  key={g.id}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.38 + i * 0.09, duration: 0.45 }}
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => handleSituationSelect(g.id)}
                  className="w-full flex items-center gap-4 p-[14px] pl-4 rounded-2xl border-[2px] border-white bg-white text-left transition-all hover:shadow-[0_6px_20px_rgba(210,100,155,0.14)] hover:border-[#F9B3D0]"
                  style={{
                    boxShadow: '0 2px 10px rgba(210,100,155,0.08)',
                  }}
                >
                  {/* 컬러 아이콘 원 */}
                  <span
                    className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                    style={{ background: g.bg }}
                  >
                    {g.emoji}
                  </span>
                  <div className="flex-1">
                    <p
                      className="font-bold text-[14.5px]"
                      style={{ fontFamily: 'var(--font-korean)', color: '#3D2B4E' }}
                    >
                      {g.label}
                    </p>
                    <p
                      className="text-[11.5px] mt-0.5"
                      style={{
                        fontFamily: 'var(--font-korean)',
                        color: '#9475A8',
                      }}
                    >
                      {g.desc}
                    </p>
                  </div>
                  <span
                    className="text-[#D4A0C8] text-sm"
                    aria-hidden
                  >
                    →
                  </span>
                </motion.button>
              ))}
            </div>

            <p
              className="mt-7 text-center text-[11px] tracking-[0.14em]"
              style={{ fontFamily: 'var(--font-handwrite-soft)', color: '#C4A0CE' }}
            >
              🌸 &nbsp;마지막 한 가지만 더&nbsp; 🌸
            </p>
          </motion.section>
        )}

        {/* ══════════════════════════ STEP 2 — 거주 지역 ══════════════════════════ */}
        {step === 2 && (
          <motion.section
            key="region"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full max-w-[360px] ${isExiting ? 'onb-exit' : ''}`}
          >
            {/* 작은 루나 (step 1 과 동일) */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="onb-mascot-card" style={{ padding: 10 }}>
                  <div aria-hidden className="onb-mascot-bg" />
                  <LunaSprite
                    preset="setting"
                    size={84}
                    circle={false}
                    speed="normal"
                    className="onb-mascot-sprite"
                  />
                </div>
                <motion.span
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2.4 }}
                  aria-hidden
                  className="absolute -top-2 -right-2 text-base select-none pointer-events-none"
                >
                  🗺️
                </motion.span>
              </div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5 }}
              className="text-[22px] font-bold text-center leading-snug"
              style={{ fontFamily: 'var(--font-handwrite-soft)', color: '#3D2B4E' }}
            >
              있잖아~ 너 어디 살아? 🌸
            </motion.h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.26, duration: 0.45 }}
              className="mt-2 mb-4 px-2"
            >
              {/* 언니 톤 — 카톡 친구처럼 자연스럽게 */}
              <p
                className="text-center text-[13.5px] leading-relaxed"
                style={{ fontFamily: 'var(--font-korean)', color: '#7A5C8A' }}
              >
                같은 비, 같은 햇살 받으면서<br />
                이야기 나누고 싶거든 ☔️
              </p>
              {/* 괄호 속 살짝 흘리는 한마디 — 약관 아니라 옆에서 말 거는 느낌 */}
              <p
                className="text-center text-[11.5px] mt-2"
                style={{ fontFamily: 'var(--font-handwrite-soft)', color: '#B38BC6' }}
              >
                (동네까지 자세히는 안 물어볼게~ ㅎㅎ)
              </p>
            </motion.div>

            {/* 17개 광역시도 — 3-col 그리드 */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.5 }}
              className="grid grid-cols-3 gap-2"
            >
              {KOREAN_REGIONS.map((region) => {
                const active = regionCode === region.code;
                const emoji = REGION_EMOJI[region.code] ?? '📍';
                return (
                  <motion.button
                    key={region.code}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setRegionCode(region.code)}
                    className="relative flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition-all"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, #FFE0EC 0%, #FBB1D0 100%)'
                        : 'rgba(255,255,255,0.92)',
                      border: active
                        ? '2px solid #E8629A'
                        : '2px solid rgba(232, 196, 222, 0.55)',
                      boxShadow: active
                        ? '0 6px 18px rgba(232,98,154,0.28), inset 0 1px 0 rgba(255,255,255,0.7)'
                        : '0 1px 3px rgba(210,140,180,0.08)',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[17px] mb-1"
                      style={{
                        background: active
                          ? 'rgba(255,255,255,0.7)'
                          : 'rgba(248,200,225,0.25)',
                      }}
                    >
                      {emoji}
                    </div>
                    <div
                      className="text-[11.5px] font-bold leading-none"
                      style={{
                        fontFamily: 'var(--font-korean)',
                        color: active ? '#7A1F4F' : '#5B3F6E',
                      }}
                    >
                      {region.shortName}
                    </div>
                    {active && (
                      <span
                        aria-hidden
                        className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                        style={{ background: '#E8629A' }}
                      >
                        ✓
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* 확정 버튼 */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="onb-shimmer w-full mt-5 py-[15px] rounded-2xl font-bold text-white text-[15px] tracking-wide disabled:opacity-55 transition-transform"
              style={{
                fontFamily: 'var(--font-korean)',
                background:
                  'linear-gradient(120deg, #E8629A 0%, #EE82B5 55%, #E8A07A 100%)',
                boxShadow:
                  '0 10px 28px rgba(232,98,154,0.32), 0 1px 0 rgba(255,255,255,0.4) inset',
              }}
            >
              {isSubmitting
                ? '짐 챙기는 중~ 🎒'
                : `${KOREAN_REGIONS.find((r) => r.code === regionCode)?.shortName ?? '여기'}로 갈게! 🌸`}
            </motion.button>

            <p
              className="mt-4 text-center text-[11px] tracking-[0.14em]"
              style={{ fontFamily: 'var(--font-handwrite-soft)', color: '#C4A0CE' }}
            >
              🌸 &nbsp;루나가 함께할게요&nbsp; 🌸
            </p>

            {/* 페이지 맨 아래 작은 기능 설명 — 몰입 안 깨는 톤 */}
            <p
              className="mt-5 text-center text-[10.5px] leading-relaxed px-4"
              style={{
                fontFamily: 'var(--font-korean)',
                color: '#C9B5D4',
              }}
            >
              * 선택한 지역의 날씨 정보를 불러올 때 사용돼요. 정확한 위치는 저장하지 않아요.
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
