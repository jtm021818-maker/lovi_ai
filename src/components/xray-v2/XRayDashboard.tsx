'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { XV2 } from '@/styles/xray-v2-tokens';
import ScanTab from './tabs/ScanTab';
import TimelineTab from './tabs/TimelineTab';
import PatternsTab from './tabs/PatternsTab';
import InsightsTab from './tabs/InsightsTab';
import SimulatorTab from './tabs/SimulatorTab';
import type { XRayResultV2 } from '@/lib/xray/types-v2';

interface Props {
  /** 분석 결과 */
  result: XRayResultV2;
  /** 분석 ID — 시뮬레이터 진입 시 sessionStorage 키로 사용 */
  analysisId: string | null;
  /** 캡처 이미지 (DB 미저장 시 null) */
  imageBase64: string | null;
  /** 프리미엄 여부 — 시뮬레이터 게이트 */
  isPremium: boolean;
}

type TabKey = 'scan' | 'timeline' | 'patterns' | 'insights' | 'simulator';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'scan',      label: 'SCAN',      icon: '🔬' },
  { key: 'timeline',  label: 'TIME',      icon: '📈' },
  { key: 'patterns',  label: 'PATTERN',   icon: '🧬' },
  { key: 'insights',  label: 'INSIGHT',   icon: '💡' },
  { key: 'simulator', label: 'SIM',       icon: '🎭' },
];

export default function XRayDashboard({ result, analysisId, imageBase64, isPremium }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<TabKey>('insights');

  const handleSimulate = useCallback(() => {
    if (!isPremium) return;
    // sessionStorage에 결과 저장 (기존 simulate 페이지 호환)
    sessionStorage.setItem('xray-result', JSON.stringify(result));
    if (analysisId) {
      router.push(`/xray/simulate?analysisId=${analysisId}`);
    } else {
      router.push('/xray/simulate');
    }
  }, [result, analysisId, isPremium, router]);

  return (
    <div className="w-full max-w-[480px] mx-auto pb-32">
      {/* 탭 네비 */}
      <div
        className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-2"
        style={{
          background: 'linear-gradient(180deg, rgba(10,14,39,0.95) 0%, rgba(10,14,39,0.65) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <LayoutGroup>
          <div
            className="flex items-center gap-1 p-1 rounded-2xl"
            style={{
              background: XV2.glassBg,
              border: `1px solid ${XV2.borderSoft}`,
            }}
          >
            {TABS.map((t) => {
              const isActive = active === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className="relative flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors"
                  style={{
                    color: isActive ? XV2.bg : XV2.textDim,
                    fontFamily: XV2.fontMono,
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="xv2-active-tab"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: XV2.cyan,
                        boxShadow: XV2.glow,
                      }}
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    />
                  )}
                  <span style={{ position: 'relative', fontSize: 16 }}>{t.icon}</span>
                  <span style={{ position: 'relative', marginTop: 2, letterSpacing: '0.08em' }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {/* 탭 본문 */}
      <div className="mt-4 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {active === 'scan' && (
              <ScanTab imageBase64={imageBase64} messages={result.messages} />
            )}
            {active === 'timeline' && <TimelineTab result={result} />}
            {active === 'patterns' && <PatternsTab result={result} />}
            {active === 'insights' && (
              <InsightsTab
                result={result}
                onSimulate={handleSimulate}
                isPremium={isPremium}
              />
            )}
            {active === 'simulator' && (
              <SimulatorTab onLaunch={handleSimulate} isPremium={isPremium} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
