'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { XV2 } from '@/styles/xray-v2-tokens';

interface Props {
  data: {
    intimacy: number;
    responsiveness: number;
    powerBalance: number;     // -100 ~ +100, abs 로 환산
    emotionIntensity: number; // 메시지 평균 intensity
    warmth: number;           // 메시지 평균 temperature → 0-100
  };
}

/**
 * 5축 레이더: 친밀도 / 응답성 / 균형 / 감정강도 / 따뜻함
 */
export default function EmotionRadar({ data }: Props) {
  const balanceScore = Math.max(0, 100 - Math.abs(data.powerBalance));

  const radarData = [
    { axis: '친밀도',   value: data.intimacy },
    { axis: '응답성',   value: data.responsiveness },
    { axis: '균형',     value: balanceScore },
    { axis: '감정 강도', value: data.emotionIntensity },
    { axis: '따뜻함',   value: data.warmth },
  ];

  return (
    <div className="w-full" style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} outerRadius="72%">
          <PolarGrid
            gridType="polygon"
            stroke={`${XV2.cyan}22`}
            radialLines={true}
          />
          <PolarAngleAxis
            dataKey="axis"
            tick={{
              fill: XV2.textDim,
              fontSize: 11,
              fontFamily: XV2.fontMono,
            }}
          />
          <Radar
            dataKey="value"
            stroke={XV2.cyan}
            strokeWidth={1.5}
            fill={XV2.cyan}
            fillOpacity={0.18}
            isAnimationActive
            animationDuration={900}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
