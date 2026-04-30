'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { XV2 } from '@/styles/xray-v2-tokens';
import type { XRayMessageV2 } from '@/lib/xray/types-v2';

interface Props {
  arc: { msgIndex: number; valence: number }[];
  messages: XRayMessageV2[];
  powerBalance?: number;
}

/**
 * 감정 곡선 — 시간순 valence(-100~+100)
 * 시안→자홍 그라데이션 fill, hover 시 메시지 텍스트 툴팁.
 */
export default function EmotionArc({ arc, messages, powerBalance }: Props) {
  const data = arc.map((p) => ({
    idx: p.msgIndex + 1,
    valence: p.valence,
    text: messages[p.msgIndex]?.text ?? '',
    sender: messages[p.msgIndex]?.sender ?? 'me',
    surfaceEmotion: messages[p.msgIndex]?.surfaceEmotion ?? '',
  }));

  return (
    <div className="w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="emotionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={XV2.magenta} stopOpacity={0.6} />
              <stop offset="50%" stopColor={XV2.purple}  stopOpacity={0.3} />
              <stop offset="100%" stopColor={XV2.blue}    stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={`${XV2.cyan}10`} strokeDasharray="2 4" />
          <XAxis
            dataKey="idx"
            tick={{ fill: XV2.textMute, fontSize: 10, fontFamily: XV2.fontMono }}
            axisLine={{ stroke: `${XV2.cyan}33` }}
            tickLine={false}
          />
          <YAxis
            domain={[-100, 100]}
            tick={{ fill: XV2.textMute, fontSize: 10, fontFamily: XV2.fontMono }}
            axisLine={{ stroke: `${XV2.cyan}33` }}
            tickLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ stroke: XV2.cyan, strokeWidth: 1, strokeDasharray: '3 3' }}
            content={<EmotionTooltip />}
          />
          <ReferenceLine y={0} stroke={`${XV2.textMute}55`} strokeDasharray="2 2" />
          {typeof powerBalance === 'number' && (
            <ReferenceLine
              y={powerBalance}
              stroke={XV2.amber}
              strokeWidth={1}
              strokeDasharray="4 4"
              label={{
                value: `power ${powerBalance > 0 ? '+' : ''}${powerBalance}`,
                position: 'right',
                fill: XV2.amber,
                fontSize: 10,
                fontFamily: XV2.fontMono,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="valence"
            stroke={XV2.cyan}
            strokeWidth={2}
            fill="url(#emotionGrad)"
            isAnimationActive
            animationDuration={1100}
            dot={{ fill: XV2.cyan, stroke: XV2.cyan, r: 2 }}
            activeDot={{ r: 5, fill: XV2.cyan, stroke: '#fff', strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      idx: number;
      valence: number;
      text: string;
      sender: 'me' | 'other';
      surfaceEmotion: string;
    };
  }>;
}

function EmotionTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        background: XV2.surface,
        border: `1px solid ${XV2.border}`,
        borderRadius: 12,
        padding: 12,
        boxShadow: XV2.glowSoft,
        maxWidth: 240,
      }}
    >
      <div
        style={{
          color: XV2.cyan,
          fontFamily: XV2.fontMono,
          fontSize: 10,
          marginBottom: 4,
        }}
      >
        msg #{p.idx}
      </div>
      <div
        style={{
          color: p.sender === 'me' ? XV2.cyan : XV2.magenta,
          fontWeight: 700,
          fontSize: 12,
          marginBottom: 2,
        }}
      >
        {p.sender === 'me' ? '나' : '상대'} · {p.surfaceEmotion}
      </div>
      <div style={{ color: XV2.textDim, fontSize: 11 }}>
        {p.text.slice(0, 60)}
      </div>
      <div style={{ color: XV2.textMute, fontSize: 10, marginTop: 4, fontFamily: XV2.fontMono }}>
        valence: {p.valence}
      </div>
    </div>
  );
}
