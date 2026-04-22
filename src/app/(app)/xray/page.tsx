'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import XRayHeatmap from '@/components/xray/XRayHeatmap';
import XRayResultCard from '@/components/xray/XRayResultCard';
import { createClient } from '@/lib/supabase/client';
import type { XRayResult } from '@/app/api/xray/analyze/route';

// ─── 커스텀 SVG 배경 장식 ─────────────────────────────────────────

function StarDecorations() {
  const stars = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: Math.random() * 90 + 5,
        y: Math.random() * 50 + 5,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 2,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 초승달 (Crescent Moon SVG) */}
      <motion.div
        className="absolute text-[#FFE993] w-[22px] h-[22px]"
        style={{ top: '10%', right: '12%' }}
        animate={{ rotate: [-5, 10, -5], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.93.566-3.725 1.542-5.182A9.752 9.752 0 003 11.25a9.75 9.75 0 0013.784 8.91 9.715 9.715 0 004.968-5.158z" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute text-[#FFE993] w-[18px] h-[18px]"
        style={{ top: '28%', left: '8%' }}
        animate={{ rotate: [5, -10, 5], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.93.566-3.725 1.542-5.182A9.752 9.752 0 003 11.25a9.75 9.75 0 0013.784 8.91 9.715 9.715 0 004.968-5.158z" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute text-[#FFE993] w-[14px] h-[14px]"
        style={{ top: '48%', right: '18%' }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.93.566-3.725 1.542-5.182A9.752 9.752 0 003 11.25a9.75 9.75 0 0013.784 8.91 9.715 9.715 0 004.968-5.158z" />
        </svg>
      </motion.div>

      {/* 동그란 별 파티클 */}
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: s.size > 5 ? '#FFF8D6' : '#FFFFFF',
          }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* ✨ 십자 반짝이 (Sparkle SVG) */}
      <motion.div
        className="absolute text-white w-[18px] h-[18px]"
        style={{ top: '12%', left: '20%' }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
        transition={{ duration: 2.2, repeat: Infinity, delay: 0.2 }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute text-white w-[16px] h-[16px]"
        style={{ top: '22%', right: '22%' }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 1.2 }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute text-white w-[12px] h-[12px]"
        style={{ top: '40%', left: '15%' }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" />
        </svg>
      </motion.div>
    </div>
  );
}

// ─── 메인 컴포넌트 ──────────────────────────────────────

export default function XRayPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [result, setResult] = useState<XRayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(true);
  
  // 사용하지 않지만 호환성을 위해 남겨둠 (이제 UI를 통합)
  const [persona, setPersona] = useState<string>('luna');

  useEffect(() => {
    async function checkProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_profiles').select('is_premium, persona_mode').eq('id', user.id).single();
      setIsPremium(data?.is_premium ?? false);
      setPersona(data?.persona_mode ?? 'luna');
    }
    checkProfile();
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImageBase64(base64);
      setLoading(true);

      try {
        const res = await fetch('/api/xray/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        if (res.status === 429) throw new Error('upgrade');
        if (!res.ok) throw new Error('분석에 실패했어요');

        const data: XRayResult = await res.json();
        setResult(data);
      } catch (err: any) {
        setError(err.message || '분석 중 오류가 발생했어요');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleSimulate = useCallback(() => {
    if (!isPremium) return;
    if (result) {
      sessionStorage.setItem('xray-result', JSON.stringify(result));
      router.push('/xray/simulate');
    }
  }, [result, router, isPremium]);

  return (
    <div
      className="h-full relative overflow-x-hidden flex flex-col"
      style={{
        backgroundColor: '#C8B5F5',
      }}
    >
      <StarDecorations />

      {/* 상단 텍스트 헤더 */}
      <div className="relative z-10 pt-[60px] pb-6 px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[34px] font-black tracking-tight text-white flex items-center justify-center gap-1"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.08), 0 0 4px rgba(255,255,255,0.7)' }}
        >
          카톡 엑스레이 <span className="text-[26px]">🔬</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[14px] mt-2 font-bold"
          style={{ color: '#5C458A' }}
        >
          캡처본 올리면 루나가 심리 분석해줄게
        </motion.p>
      </div>

      {/* 메인 뷰 (결과 없음 & 업로드 전) */}
      {!result && !loading && (
        <div className="relative z-10 flex flex-col flex-1">
          {/* 업로드 카드 영역 */}
          <div className="px-5 mt-2">
            {!imageBase64 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="bg-[#FFFFFF] rounded-[24px] px-6 py-[60px] text-center cursor-pointer relative shadow-lg"
                style={{
                  boxShadow: '0 12px 40px rgba(107, 70, 193, 0.12)',
                }}
              >
                <p className="text-[18px] font-bold tracking-tight" style={{ color: '#6D549B' }}>
                  여기에 대화 내용을
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <p className="text-[18px] font-bold tracking-tight" style={{ color: '#6D549B' }}>
                    공유해줘!
                  </p>
                  <span className="text-[22px] leading-none mb-1">🖼️</span>
                </div>
              </motion.div>
            )}

            {/* 업로드 이미지 미리보기 */}
            {imageBase64 && (
              <div className="bg-white rounded-[24px] p-4 shadow-lg">
                <img src={imageBase64} alt="uploaded" className="rounded-xl w-full" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 숨겨진 파일 인풋 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />

      {/* 로딩 뷰 */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 text-center py-20 flex-1"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="inline-block text-5xl mb-4"
          >
            🔮
          </motion.div>
          <p className="text-[16px] font-bold" style={{ color: '#5C458A' }}>
            루나가 집중해서 분석하는 중...
          </p>
          <p className="text-[13px] mt-2 opacity-80" style={{ color: '#5C458A' }}>
            숨겨진 맥락을 파악하고 있어요
          </p>
        </motion.div>
      )}

      {/* 에러 / 구독뷰 */}
      {error === 'upgrade' ? (
        <div className="relative z-10 mx-5 mt-4 bg-white/90 rounded-2xl p-6 text-center shadow-lg">
          <p className="text-sm font-bold mb-1" style={{ color: '#6D549B' }}>
            오늘 무료 분석을 다 사용했어요
          </p>
          <p className="text-xs mb-4" style={{ color: '#8874AB' }}>
            프리미엄이면 무제한 분석 가능!
          </p>
          <Link
            href="/subscription"
            className="inline-block px-6 py-2.5 rounded-full text-white text-sm font-bold no-underline shadow-md"
            style={{ background: 'linear-gradient(135deg, #8b6db5 0%, #d4af37 100%)' }}
          >
            프리미엄 시작하기
          </Link>
        </div>
      ) : error && (
        <div className="relative z-10 mx-5 mt-4 bg-white/90 rounded-2xl p-5 text-center shadow-lg">
          <p className="text-sm font-bold text-red-500">{error}</p>
          <button
            onClick={() => { setError(null); setImageBase64(null); }}
            className="mt-3 text-xs text-red-400 underline font-medium"
          >
            다시 시도하기
          </button>
        </div>
      )}

      {/* 결과 뷰 */}
      <AnimatePresence>
        {result && imageBase64 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 px-4 py-6 space-y-6 flex-1 pb-40"
          >
            <XRayHeatmap imageBase64={imageBase64} messages={result.messages} />
            <XRayResultCard
              overallAnalysis={result.overallAnalysis}
              keyInsight={result.keyInsight}
              suggestedResponse={result.suggestedResponse}
              reconciliationScore={result.reconciliationScore}
              onSimulate={isPremium ? handleSimulate : undefined}
            />
            <button
              onClick={() => { setResult(null); setImageBase64(null); }}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-transform active:scale-95"
              style={{
                background: '#FFFFFF',
                color: '#6D549B',
                boxShadow: '0 4px 14px rgba(107, 70, 193, 0.1)',
              }}
            >
              다른 캡처 분석하기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 하단 마스코트 레이아웃 (결과화면 아닐 때만 노출) */}
      {!result && !loading && (
        <>
          {/* 타로냥 마스코트 - fixed로 네비바 바로 위 고정 (네비바보다 앞쪽에 위치하도록 z-[45]) */}
          <motion.div
            initial={{ opacity: 0, y: 60, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            transition={{ delay: 0.4, duration: 0.8, type: 'spring', stiffness: 150 }}
            className="fixed left-1/2 z-[45] pointer-events-none flex flex-col justify-end items-center w-full max-w-[500px]"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom) + 50px)', // 더 큼직해진 만큼 살짝 더 내려서 안착감 강화
            }}
          >
            <Image
              src="/char_img/taronaang_xray.webp"
              width={480}
              height={480}
              alt="분석냥"
              className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.15)] origin-bottom w-[95%] h-auto"
              priority
            />
          </motion.div>
          {/* 타로냥 뒤로 깔리는 그라데이션 - 자연스러운 배경 블렌딩 */}
          <div 
            className="fixed left-0 right-0 h-[80px] z-[30] pointer-events-none"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom) + 64px)',
              background: 'linear-gradient(to bottom, transparent, #BCA1EE)', 
            }}
          />
        </>
      )}
    </div>
  );
}
