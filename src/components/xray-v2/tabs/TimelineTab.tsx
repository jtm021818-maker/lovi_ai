'use client';

import { motion } from 'framer-motion';
import { XV2 } from '@/styles/xray-v2-tokens';
import GlassCard from '../parts/GlassCard';
import EmotionArc from '../parts/EmotionArc';
import type { XRayResultV2 } from '@/lib/xray/types-v2';

interface Props {
  result: XRayResultV2;
}

export default function TimelineTab({ result }: Props) {
  const meIntensityAvg = avg(result.messages.filter((m) => m.sender === 'me').map((m) => m.intensity));
  const otherIntensityAvg = avg(result.messages.filter((m) => m.sender === 'other').map((m) => m.intensity));

  const meTempAvg = avg(result.messages.filter((m) => m.sender === 'me').map((m) => m.temperature));
  const otherTempAvg = avg(result.messages.filter((m) => m.sender === 'other').map((m) => m.temperature));

  return (
    <div className="space-y-4">
      {/* 감정 곡선 */}
      <GlassCard
        glow="cyan"
        motionProps={{
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5 },
        }}
      >
        <SectionHeader title="감정 곡선" sub="시간순 valence" />
        <EmotionArc
          arc={result.emotionArc}
          messages={result.messages}
          powerBalance={result.powerBalance}
        />
        <p className="mt-3 text-[11px]" style={{ color: XV2.textMute, fontFamily: XV2.fontMono }}>
          ↑ 따뜻함 / ↓ 차가움 · 점선=권력 균형 ({result.powerBalance > 0 ? '나' : result.powerBalance < 0 ? '상대' : '중립'} 우위)
        </p>
      </GlassCard>

      {/* 메트릭 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="친밀도"
          value={result.intimacyScore}
          unit="%"
          color={XV2.cyan}
          delay={0.1}
        />
        <Metric
          label="응답성 균형"
          value={result.responsivenessScore}
          unit="%"
          color={XV2.purple}
          delay={0.15}
        />
        <Metric
          label="권력 균형"
          value={result.powerBalance}
          unit=""
          rangeText={result.powerBalance > 10 ? '나 우위' : result.powerBalance < -10 ? '상대 우위' : '균형'}
          color={XV2.amber}
          delay={0.2}
          signed
        />
        <Metric
          label="화해 가능성"
          value={result.reconciliationScore}
          unit="%"
          color={
            result.reconciliationScore >= 70 ? XV2.green :
            result.reconciliationScore >= 40 ? XV2.amber :
            XV2.magenta
          }
          delay={0.25}
        />
      </div>

      {/* 발화자별 통계 */}
      <GlassCard
        motionProps={{
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.3, duration: 0.5 },
        }}
      >
        <SectionHeader title="발화자 통계" />
        <div className="grid grid-cols-2 gap-4 mt-2">
          <SpeakerStat label="나" intensity={meIntensityAvg} temperature={meTempAvg} color={XV2.cyan} />
          <SpeakerStat label="상대" intensity={otherIntensityAvg} temperature={otherTempAvg} color={XV2.magenta} />
        </div>
      </GlassCard>
    </div>
  );
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h3
        className="text-[12px] font-bold uppercase tracking-[0.14em]"
        style={{ color: XV2.cyan, fontFamily: XV2.fontMono, textShadow: `0 0 6px ${XV2.cyan}55` }}
      >
        {title}
      </h3>
      {sub && (
        <span
          className="text-[10px]"
          style={{ color: XV2.textMute, fontFamily: XV2.fontMono }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

function Metric({
  label, value, unit, color, delay, rangeText, signed,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  delay: number;
  rangeText?: string;
  signed?: boolean;
}) {
  const display = signed ? `${value > 0 ? '+' : ''}${value}` : `${value}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl p-4"
      style={{
        background: XV2.glassBg,
        backdropFilter: XV2.glassBlur,
        WebkitBackdropFilter: XV2.glassBlur,
        border: `1px solid ${color}33`,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.12em] mb-1"
        style={{ color: XV2.textMute, fontFamily: XV2.fontMono }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-[28px] font-black leading-none"
          style={{ color, textShadow: `0 0 12px ${color}55`, fontFamily: XV2.fontMono }}
        >
          {display}
        </span>
        <span
          className="text-[12px] font-bold"
          style={{ color: XV2.textDim, fontFamily: XV2.fontMono }}
        >
          {unit}
        </span>
      </div>
      {rangeText && (
        <div
          className="text-[10px] mt-1"
          style={{ color: XV2.textDim }}
        >
          {rangeText}
        </div>
      )}
    </motion.div>
  );
}

function SpeakerStat({
  label, intensity, temperature, color,
}: {
  label: string;
  intensity: number;
  temperature: number;
  color: string;
}) {
  return (
    <div>
      <div className="text-[12px] font-bold mb-2" style={{ color }}>
        {label}
      </div>
      <div className="space-y-1.5">
        <Bar label="강도" value={intensity} max={100} color={color} />
        <Bar label="온도" value={temperature + 100} max={200} color={color} display={`${temperature > 0 ? '+' : ''}${temperature}`} />
      </div>
    </div>
  );
}

function Bar({ label, value, max, color, display }: { label: string; value: number; max: number; color: string; display?: string }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[10px]" style={{ color: XV2.textMute, fontFamily: XV2.fontMono }}>{label}</span>
        <span className="text-[10px]" style={{ color: XV2.textDim, fontFamily: XV2.fontMono }}>{display ?? value}</span>
      </div>
      <div style={{ height: 4, background: `${color}22`, borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
    </div>
  );
}
