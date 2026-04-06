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

// ─── 별/달 장식 ─────────────────────────────────────────

function StarDecorations() {
  const stars = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 60,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 2,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 초승달들 */}
      <motion.div
        className="absolute text-[22px]"
        style={{ top: '8%', right: '12%' }}
        animate={{ rotate: [0, 10, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        🌙
      </motion.div>
      <motion.div
        className="absolute text-[16px]"
        style={{ top: '25%', left: '8%' }}
        animate={{ rotate: [0, -10, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        🌙
      </motion.div>
      <motion.div
        className="absolute text-[14px]"
        style={{ bottom: '35%', right: '6%' }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        🌙
      </motion.div>

      {/* 별 파티클 */}
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: s.size > 4 ? '#fbbf24' : '#d4af37',
          }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [0.7, 1.2, 0.7],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* ✨ 반짝이 */}
      <motion.div
        className="absolute text-[10px]"
        style={{ top: '12%', left: '25%' }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      >
        ✦
      </motion.div>
      <motion.div
        className="absolute text-[12px]"
        style={{ top: '18%', right: '28%' }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 1.5 }}
      >
        ✦
      </motion.div>
      <motion.div
        className="absolute text-[8px]"
        style={{ top: '6%', left: '60%' }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 }}
      >
        ✧
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

  const isTarot = persona === 'tarot';

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

  // ─── 타로냥 버전 렌더링 ───────────────────────────────

  if (isTarot) {
    return (
      <div
        className="min-h-screen relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #e8dff5 0%, #c9b8e8 30%, #a78bca 60%, #8b6db5 100%)',
        }}
      >
        <StarDecorations />

        {/* 헤더 */}
        <div className="relative z-10 pt-12 pb-4 px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[26px] font-black tracking-tight"
            style={{ color: '#3d2066' }}
          >
            카톡 엑스레이 🔬
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[13px] mt-1 font-medium"
            style={{ color: '#5b3d8a' }}
          >
            캡처본 올리면 타로냥이 심리 분석해줄게
          </motion.p>
        </div>

        {/* 업로드 영역 */}
        <div className="relative z-10 px-6 mt-2">
          {!imageBase64 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="bg-white/90 backdrop-blur-sm rounded-[24px] px-6 py-10 text-center cursor-pointer shadow-lg"
              style={{
                border: '2px dashed rgba(139, 109, 181, 0.3)',
                boxShadow: '0 8px 32px rgba(107, 70, 193, 0.15)',
              }}
            >
              <p className="text-[16px] font-bold" style={{ color: '#3d2066' }}>
                여기에 대화 내용을
              </p>
              <p className="text-[16px] font-bold" style={{ color: '#3d2066' }}>
                공유해줘! 📱
              </p>
            </motion.div>
          )}

          {/* 업로드된 이미지 미리보기 */}
          {imageBase64 && !result && !loading && (
            <div className="bg-white/90 rounded-[24px] p-4 shadow-lg">
              <img src={imageBase64} alt="uploaded" className="rounded-xl w-full" />
            </div>
          )}
        </div>

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

        {/* 로딩 */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 text-center py-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="inline-block text-4xl mb-3"
            >
              🔮
            </motion.div>
            <p className="text-[14px] font-bold" style={{ color: '#3d2066' }}>
              타로냥이 분석하고 있어...
            </p>
            <p className="text-[12px] mt-1" style={{ color: '#5b3d8a' }}>
              카드로 숨겨진 감정을 읽고 있어 🃏
            </p>
          </motion.div>
        )}

        {/* 에러 */}
        {error === 'upgrade' ? (
          <div className="relative z-10 mx-6 mt-4 bg-white/80 rounded-xl p-5 text-center">
            <p className="text-sm font-medium mb-1" style={{ color: '#3d2066' }}>
              오늘 무료 분석을 다 사용했어
            </p>
            <p className="text-xs mb-3" style={{ color: '#5b3d8a' }}>
              프리미엄이면 무제한 분석 가능!
            </p>
            <Link
              href="/subscription"
              className="inline-block px-5 py-2 rounded-full text-white text-sm font-bold no-underline shadow-md"
              style={{ background: 'linear-gradient(135deg, #8b6db5 0%, #d4af37 100%)' }}
            >
              프리미엄 시작하기
            </Link>
          </div>
        ) : error && (
          <div className="relative z-10 mx-6 mt-4 bg-red-50/80 rounded-xl p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => { setError(null); setImageBase64(null); }}
              className="mt-2 text-xs text-red-500 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 결과 */}
        <AnimatePresence>
          {result && imageBase64 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative z-10 px-4 py-5 space-y-5"
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
                className="w-full py-3 rounded-xl text-sm font-medium"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#3d2066',
                }}
              >
                다른 캡처 분석하기
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 타로냥 캐릭터 — 네비 바 위에 올라탄 느낌 (fixed) */}
        {!result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed left-1/2 z-50 pointer-events-none"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 65px)',
              transform: 'translateX(-50%)',
            }}
          >
            <Image
              src="/char_img/taronaang_xray.png"
              width={240}
              height={240}
              alt="타로냥"
              className="drop-shadow-[0_4px_24px_rgba(107,70,193,0.35)]"
              priority
            />
          </motion.div>
        )}
      </div>
    );
  }

  // ─── 기존 루나 버전 (변경 없음) ────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/50 via-white to-pink-50/30">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-purple-100 px-5 py-4">
        <h1 className="text-xl font-black text-purple-900">카톡 엑스레이 🔬</h1>
        <p className="text-xs text-gray-500 mt-0.5">캡처본 올리면 루나가 심리 분석해줄게</p>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
        {/* 업로드 영역 */}
        {!imageBase64 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-purple-200 rounded-2xl p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all"
          >
            <div className="text-5xl mb-3">📱</div>
            <p className="text-sm font-bold text-purple-700 mb-1">카톡 캡처본을 올려주세요</p>
            <p className="text-xs text-gray-400">클릭하거나 드래그해서 업로드</p>
          </motion.div>
        )}

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

        {/* 로딩 */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="inline-block text-4xl mb-3"
            >
              🔬
            </motion.div>
            <p className="text-sm font-bold text-purple-700">루나가 분석하고 있어...</p>
            <p className="text-xs text-gray-400 mt-1">메시지의 숨겨진 감정을 읽고 있어요</p>
          </motion.div>
        )}

        {/* 에러 / 구독 유도 */}
        {error === 'upgrade' ? (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 text-center">
            <p className="text-sm text-purple-700 font-medium mb-1">오늘 무료 XRay 분석을 다 사용했어</p>
            <p className="text-xs text-purple-500 mb-3">프리미엄이면 무제한으로 분석할 수 있어!</p>
            <Link
              href="/subscription"
              className="inline-block px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold no-underline shadow-md"
            >
              프리미엄 시작하기
            </Link>
          </div>
        ) : error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => { setError(null); setImageBase64(null); }}
              className="mt-2 text-xs text-red-500 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 결과 */}
        <AnimatePresence>
          {result && imageBase64 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
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
                className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
              >
                다른 캡처 분석하기
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
