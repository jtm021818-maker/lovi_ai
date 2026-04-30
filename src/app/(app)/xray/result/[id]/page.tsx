'use client';

/**
 * /xray/result/[id] — 카톡 엑스레이 v2 결과 페이지
 *
 * Plan: docs/xray-v2-pro-plan.md §5.4
 *
 * 우선순위:
 *  1. sessionStorage 에서 즉시 로드 (방금 분석한 경우)
 *  2. 없으면 DB fetch (/api/xray/v2/[id])
 *  3. 둘 다 실패하면 빈 상태
 *
 * 이미지는 DB 미저장 → sessionStorage 에서만 (없으면 SCAN 탭이 IMAGE NOT AVAILABLE 표시)
 */

import { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { XV2 } from '@/styles/xray-v2-tokens';
import XRayDashboard from '@/components/xray-v2/XRayDashboard';
import { isValidResultV2 } from '@/lib/xray/types-v2';
import type { XRayResultV2 } from '@/lib/xray/types-v2';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';

interface ApiResp {
  id: string;
  createdAt?: string;
  imageWidth: number;
  imageHeight: number;
  result: XRayResultV2;
  modelUsed: string;
  latencyMs: number;
  schemaVersion?: number;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function XRayResultPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [result, setResult] = useState<XRayResultV2 | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // 프리미엄 여부
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

  // 결과 로드
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. sessionStorage 우선
      try {
        const cachedRaw = sessionStorage.getItem(`xray-v2-result-${id}`);
        const cachedImg = sessionStorage.getItem(`xray-v2-image-${id}`);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { result: unknown };
          if (isValidResultV2(cached.result)) {
            if (!cancelled) {
              setResult(cached.result);
              setImageBase64(cachedImg);
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // ignore
      }

      // 2. tmp- 로 시작하면 DB 에 없음 → 404
      if (id.startsWith('tmp-')) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      // 3. DB fetch
      try {
        const res = await fetch(`/api/xray/v2/${id}`);
        if (!res.ok) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }
        const data = (await res.json()) as ApiResp;
        if (isValidResultV2(data.result)) {
          if (!cancelled) {
            setResult(data.result);
            // 이미지는 sessionStorage 에 있을 수도
            const cachedImg = sessionStorage.getItem(`xray-v2-image-${id}`);
            setImageBase64(cachedImg);
            setLoading(false);
          }
        } else {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
        }
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  return (
    <div
      className="min-h-full relative"
      style={{
        background: XV2.bgGrad,
        color: XV2.text,
        fontFamily: XV2.fontSans,
      }}
    >
      {/* 그리드 백드롭 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(${XV2.cyan}0a 1px, transparent 1px),
            linear-gradient(90deg, ${XV2.cyan}0a 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* 상단 바 */}
      <div className="relative z-20 flex items-center justify-between pt-12 px-4 pb-2">
        <button
          onClick={() => router.push('/xray')}
          className="rounded-full"
          style={{
            width: 36,
            height: 36,
            background: `${XV2.cyan}11`,
            border: `1px solid ${XV2.cyan}33`,
            color: XV2.cyan,
            fontSize: 14,
          }}
          aria-label="새로 분석"
        >
          ←
        </button>
        <div
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: XV2.cyan, fontFamily: XV2.fontMono, textShadow: `0 0 6px ${XV2.cyan}` }}
        >
          ⟢ DIAGNOSIS REPORT ⟣
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* 본문 */}
      <div className="relative z-10">
        {loading && (
          <div className="text-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              className="inline-block text-3xl mb-3"
            >
              ⚙
            </motion.div>
            <p className="text-[12px]" style={{ color: XV2.textDim, fontFamily: XV2.fontMono }}>
              loading report...
            </p>
          </div>
        )}

        {notFound && !loading && (
          <div className="text-center py-20 px-6">
            <p className="text-[14px] font-bold mb-2" style={{ color: XV2.text }}>
              분석을 찾을 수 없어
            </p>
            <p className="text-[12px] mb-5" style={{ color: XV2.textDim }}>
              다시 캡처를 올려서 분석해보자
            </p>
            <button
              onClick={() => router.push('/xray')}
              className="px-5 py-2 rounded-full text-[12px] font-extrabold"
              style={{
                background: `linear-gradient(135deg, ${XV2.cyan}, ${XV2.purple})`,
                color: XV2.bg,
                boxShadow: XV2.glow,
              }}
            >
              새로 분석하기
            </button>
          </div>
        )}

        {result && !loading && !notFound && (
          <XRayDashboard
            result={result}
            analysisId={id.startsWith('tmp-') ? null : id}
            imageBase64={imageBase64}
            isPremium={isPremium}
          />
        )}
      </div>
    </div>
  );
}
