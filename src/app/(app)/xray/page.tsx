'use client';

/**
 * /xray — 카톡 엑스레이 v2 업로드 페이지
 *
 * Plan: docs/xray-v2-pro-plan.md §5
 *
 * 흐름:
 *  1. 파일 선택 → base64 + 이미지 dimension 측정
 *  2. CinematicScanner 띄움
 *  3. POST /api/xray/v2/analyze
 *  4. 응답 받으면 sessionStorage 에 이미지 저장 + /xray/result/[id] 로 push
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import CinematicScanner from '@/components/xray-v2/CinematicScanner';
import { XV2 } from '@/styles/xray-v2-tokens';

interface AnalyzeResponse {
  id: string | null;
  result: unknown;
  modelUsed: string;
  latencyMs: number;
  imageWidth: number;
  imageHeight: number;
}

export default function XRayPageV2() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();
      setIsPremium(data?.is_premium ?? false);
    })();
  }, []);

  /** 이미지 dim 측정 */
  const measureImage = (b64: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = b64;
    });

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('이미지가 5MB 를 넘어. 더 작은 캡처로 다시 올려줘');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target?.result as string;
      setImageBase64(b64);

      try {
        const { width, height } = await measureImage(b64);
        setScanning(true);

        const res = await fetch('/api/xray/v2/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: b64, imageWidth: width, imageHeight: height }),
        });

        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          setScanning(false);
          setError(data?.upgrade ? 'upgrade' : '오늘 무료 분석을 다 사용했어');
          return;
        }
        if (res.status === 422) {
          setScanning(false);
          setError('캡처에서 메시지를 찾지 못했어. 카톡 화면이 또렷하게 나왔는지 확인해줘');
          return;
        }
        if (!res.ok) {
          setScanning(false);
          setError('분석에 실패했어. 다시 시도해줘');
          return;
        }

        const data = (await res.json()) as AnalyzeResponse;

        // 이미지 + 결과를 sessionStorage 에 저장 (결과 페이지에서 즉시 표시)
        if (data.id) {
          try {
            sessionStorage.setItem(`xray-v2-image-${data.id}`, b64);
            sessionStorage.setItem(`xray-v2-result-${data.id}`, JSON.stringify(data));
          } catch {
            // quota 초과 시 그냥 무시 — 결과 페이지에서 DB fetch
          }
          router.push(`/xray/result/${data.id}`);
        } else {
          // DB insert 실패한 경우 — 임시 키로 저장하고 결과 페이지로
          const tmpId = 'tmp-' + Date.now();
          sessionStorage.setItem(`xray-v2-image-${tmpId}`, b64);
          sessionStorage.setItem(`xray-v2-result-${tmpId}`, JSON.stringify(data));
          router.push(`/xray/result/${tmpId}`);
        }
      } catch (err) {
        setScanning(false);
        setError((err as Error)?.message || '분석 중 오류가 발생했어');
      }
    };
    reader.readAsDataURL(file);
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFileSelect(file);
  }, [handleFileSelect]);

  return (
    <div
      className="min-h-full relative overflow-hidden flex flex-col"
      style={{
        background: XV2.bgGrad,
        color: XV2.text,
        fontFamily: XV2.fontSans,
      }}
    >
      {/* 그리드 백드롭 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(${XV2.cyan}11 1px, transparent 1px),
            linear-gradient(90deg, ${XV2.cyan}11 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }}
      />

      {/* 헤더 */}
      <div className="relative z-10 pt-[60px] pb-6 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block mb-2 px-3 py-1 rounded-full"
          style={{
            background: `${XV2.cyan}11`,
            border: `1px solid ${XV2.cyan}55`,
            color: XV2.cyan,
            fontFamily: XV2.fontMono,
            fontSize: 10,
            letterSpacing: '0.16em',
            textShadow: `0 0 6px ${XV2.cyan}`,
          }}
        >
          ⟢ X-RAY v2 ⟣
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[28px] font-black"
          style={{ color: XV2.text, letterSpacing: '-0.01em' }}
        >
          카톡 엑스레이
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[13px] mt-2"
          style={{ color: XV2.textDim }}
        >
          캡처본을 올리면 루나가 의료 진단처럼 풀어줄게
        </motion.p>
      </div>

      {/* 업로드 카드 */}
      <div className="relative z-10 px-5 flex-1 flex items-center justify-center">
        {!scanning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="w-full max-w-[420px] rounded-[24px] cursor-pointer relative overflow-hidden"
            style={{
              background: XV2.glassBg,
              backdropFilter: XV2.glassBlur,
              WebkitBackdropFilter: XV2.glassBlur,
              border: `1.5px dashed ${XV2.cyan}66`,
              padding: '64px 24px',
              boxShadow: XV2.glowSoft,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${XV2.cyan}0a, transparent 70%)`,
              }}
            />

            <div className="relative text-center">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-5xl mb-4"
              >
                📲
              </motion.div>
              <p
                className="text-[16px] font-extrabold mb-1"
                style={{ color: XV2.text }}
              >
                캡처본 올리기
              </p>
              <p
                className="text-[12px]"
                style={{ color: XV2.textDim }}
              >
                탭하거나 끌어다 놔 · PNG / JPEG / WebP (최대 5MB)
              </p>

              <div
                className="mt-5 inline-flex gap-2 px-3 py-1 rounded-full"
                style={{
                  background: `${XV2.cyan}11`,
                  border: `1px solid ${XV2.cyan}33`,
                  fontFamily: XV2.fontMono,
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  color: XV2.cyan,
                }}
              >
                {isPremium ? 'PREMIUM · UNLIMITED' : 'FREE · 1/DAY'}
              </div>
            </div>
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
      </div>

      {/* 에러 */}
      <AnimatePresence>
        {error && error !== 'upgrade' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="relative z-10 mx-5 mb-24 p-4 rounded-2xl"
            style={{
              background: `${XV2.magenta}11`,
              border: `1px solid ${XV2.magenta}66`,
              color: XV2.text,
              boxShadow: XV2.glowMagenta,
            }}
          >
            <p className="text-[13px] font-bold">{error}</p>
            <button
              onClick={() => { setError(null); setImageBase64(null); }}
              className="mt-2 text-[11px] underline"
              style={{ color: XV2.magenta }}
            >
              다시 시도
            </button>
          </motion.div>
        )}
        {error === 'upgrade' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="relative z-10 mx-5 mb-24 p-5 rounded-2xl text-center"
            style={{
              background: XV2.glassBg,
              backdropFilter: XV2.glassBlur,
              WebkitBackdropFilter: XV2.glassBlur,
              border: `1px solid ${XV2.cyan}55`,
              boxShadow: XV2.glow,
            }}
          >
            <p className="text-[13px] font-bold mb-1" style={{ color: XV2.text }}>
              오늘 무료 분석을 다 사용했어요
            </p>
            <p className="text-[11px] mb-3" style={{ color: XV2.textDim }}>
              프리미엄이면 무제한 분석 가능!
            </p>
            <Link
              href="/subscription"
              className="inline-block px-5 py-2 rounded-full text-[12px] font-extrabold no-underline"
              style={{
                background: `linear-gradient(135deg, ${XV2.cyan}, ${XV2.purple})`,
                color: XV2.bg,
                boxShadow: XV2.glow,
              }}
            >
              프리미엄 시작
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanner */}
      <CinematicScanner open={scanning} imageBase64={imageBase64} />
    </div>
  );
}
