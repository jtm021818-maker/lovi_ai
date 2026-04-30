'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { XV2 } from '@/styles/xray-v2-tokens';
import ScanLine from './parts/ScanLine';

interface Props {
  /** 표시 여부 */
  open: boolean;
  /** 미리보기 이미지 (분석 중인 캡처) */
  imageBase64: string | null;
}

/**
 * 시네마틱 스캐너 — 풀스크린 모달.
 * 6단계 텍스트 시퀀스 + 시안 스캔 라인 + 이미지 미리보기.
 *
 * Plan: docs/xray-v2-pro-plan.md §5.5
 *
 * 구조: open 토글 시 Body 가 mount/unmount → useState 자동 리셋.
 */

const PHASES = [
  '이미지 인식 중...',
  '말풍선 추출 중...',
  '감정 매핑 중...',
  '맥락 추론 중...',
  '관계 패턴 분석 중...',
  '진단 마무리 중...',
];

export default function CinematicScanner({ open, imageBase64 }: Props) {
  return (
    <AnimatePresence>
      {open && <ScannerBody imageBase64={imageBase64} />}
    </AnimatePresence>
  );
}

function ScannerBody({ imageBase64 }: { imageBase64: string | null }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      i = Math.min(i + 1, PHASES.length - 1);
      setPhaseIdx(i);
      if (i < PHASES.length - 1) {
        setTimeout(tick, 700);
      }
    };
    const t = setTimeout(tick, 700);
    const longTimer = setTimeout(() => {
      if (!cancelled) setLongWait(true);
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(t);
      clearTimeout(longTimer);
    };
  }, []);

  return (
    <motion.div
      key="scanner"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: 'rgba(10, 14, 39, 0.95)', backdropFilter: 'blur(8px)' }}
    >
      {/* 캡처 미리보기 */}
      {imageBase64 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 0.45, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative overflow-hidden"
          style={{
            maxWidth: '70vw',
            maxHeight: '50vh',
            borderRadius: 16,
            border: `1px solid ${XV2.border}`,
            boxShadow: XV2.glow,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageBase64}
            alt="분석 중"
            style={{ display: 'block', maxWidth: '70vw', maxHeight: '50vh' }}
            draggable={false}
          />
          <ScanLine duration={3.6} thickness={2} />
          {/* 노이즈 그레인 */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay"
            style={{
              opacity: 0.06,
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            }}
          />
        </motion.div>
      )}

      {/* 텍스트 시퀀스 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 text-center"
      >
        <div
          className="text-[10px] uppercase tracking-[0.18em] mb-3"
          style={{ color: XV2.cyan, fontFamily: XV2.fontMono, textShadow: `0 0 8px ${XV2.cyan}` }}
        >
          ⟢ X-RAY SCAN ⟣
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={phaseIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.32 }}
            className="text-[15px] font-bold"
            style={{ color: XV2.text }}
          >
            {PHASES[phaseIdx]}
          </motion.div>
        </AnimatePresence>

        {/* 진행 도트 */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {PHASES.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                background: i <= phaseIdx ? XV2.cyan : `${XV2.cyan}22`,
                boxShadow: i <= phaseIdx ? `0 0 6px ${XV2.cyan}` : 'none',
              }}
              animate={i === phaseIdx ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.6, repeat: i === phaseIdx ? Infinity : 0 }}
            />
          ))}
        </div>

        {longWait && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-[12px]"
            style={{ color: XV2.textDim, fontFamily: XV2.fontMono }}
          >
            조금 더 걸리고 있어요...
          </motion.p>
        )}
      </motion.div>

      {/* 하단 라벨 */}
      <div
        className="absolute bottom-8 left-0 right-0 text-center text-[10px] uppercase tracking-[0.16em]"
        style={{ color: XV2.textMute, fontFamily: XV2.fontMono }}
      >
        powered by 루나 vision · gemini 2.5
      </div>
    </motion.div>
  );
}
