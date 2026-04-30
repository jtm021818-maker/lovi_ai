'use client';

import { motion } from 'framer-motion';
import { XV2 } from '@/styles/xray-v2-tokens';
import GlassCard from '../parts/GlassCard';
import AttachmentBadge from '../parts/AttachmentBadge';
import EmotionRadar from '../parts/EmotionRadar';
import type { XRayResultV2 } from '@/lib/xray/types-v2';

interface Props {
  result: XRayResultV2;
}

const CULTURAL_PATTERN_META: Record<string, { icon: string; tone: string; desc: string }> = {
  '잠수': { icon: '🌊', tone: XV2.blue,    desc: '연락이 끊긴 패턴' },
  '읽씹': { icon: '📭', tone: XV2.amber,   desc: '읽고 답 안 함' },
  '톤시프트': { icon: '🔀', tone: XV2.magenta, desc: '말투가 바뀜' },
  '감정노동 비대칭': { icon: '⚖️', tone: XV2.purple,  desc: '한쪽이 더 노력' },
};

export default function PatternsTab({ result }: Props) {
  // 레이더 데이터 계산
  const intensityAvg = avg(result.messages.map((m) => m.intensity));
  const tempAvg = avg(result.messages.map((m) => m.temperature));
  const warmth = Math.round(((tempAvg + 100) / 200) * 100);

  return (
    <div className="space-y-4">
      {/* 애착 스타일 — 나/상대 */}
      <div>
        <h3
          className="text-[12px] font-bold uppercase tracking-[0.14em] mb-2"
          style={{ color: XV2.cyan, fontFamily: XV2.fontMono, textShadow: `0 0 6px ${XV2.cyan}55` }}
        >
          애착 스타일
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <AttachmentBadge who="나" read={result.attachmentStyle.user} delay={0.05} />
          <AttachmentBadge who="상대" read={result.attachmentStyle.partner} delay={0.15} />
        </div>
      </div>

      {/* 5축 레이더 */}
      <GlassCard
        glow="purple"
        motionProps={{
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.25, duration: 0.5 },
        }}
      >
        <h3
          className="text-[12px] font-bold uppercase tracking-[0.14em] mb-2"
          style={{ color: XV2.cyan, fontFamily: XV2.fontMono, textShadow: `0 0 6px ${XV2.cyan}55` }}
        >
          관계 레이더
        </h3>
        <EmotionRadar
          data={{
            intimacy: result.intimacyScore,
            responsiveness: result.responsivenessScore,
            powerBalance: result.powerBalance,
            emotionIntensity: intensityAvg,
            warmth,
          }}
        />
      </GlassCard>

      {/* 문화 패턴 */}
      {result.culturalPatterns.length > 0 && (
        <GlassCard
          motionProps={{
            initial: { opacity: 0, y: 12 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.4, duration: 0.5 },
          }}
        >
          <h3
            className="text-[12px] font-bold uppercase tracking-[0.14em] mb-3"
            style={{ color: XV2.cyan, fontFamily: XV2.fontMono, textShadow: `0 0 6px ${XV2.cyan}55` }}
          >
            감지된 패턴
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.culturalPatterns.map((p, i) => {
              const meta = CULTURAL_PATTERN_META[p] ?? { icon: '🔍', tone: XV2.textDim, desc: '' };
              return (
                <motion.div
                  key={p}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 + i * 0.07 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{
                    background: `${meta.tone}1a`,
                    border: `1px solid ${meta.tone}55`,
                    color: meta.tone,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{meta.icon}</span>
                  <div className="leading-tight">
                    <div className="text-[12px] font-bold">{p}</div>
                    <div className="text-[9px]" style={{ color: XV2.textMute, fontFamily: XV2.fontMono }}>
                      {meta.desc}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}
