'use client';

import { motion } from 'framer-motion';

/**
 * 🆕 v41: 4축 미니 레이더 (SVG)
 *
 * 신뢰 / 개방 / 유대 / 존경을 4각형 레이더로 시각화.
 * 크기: 160x160 (settings 카드에 들어가는 사이즈)
 */

interface IntimacyRadarProps {
  trust: number;     // 0~100
  openness: number;
  bond: number;
  respect: number;
  /** 라벨 색상 (페르소나별 커스터마이징) */
  accentColor?: string;
  /** 크기 (기본 160) */
  size?: number;
}

export default function IntimacyRadar({
  trust,
  openness,
  bond,
  respect,
  accentColor = '#a855f7',
  size = 160,
}: IntimacyRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  // 4축 좌표 (위 → 오른쪽 → 아래 → 왼쪽)
  const axisPoints = [
    { x: cx, y: cy - radius, label: '🛡️', name: '신뢰', value: trust },
    { x: cx + radius, y: cy, label: '⭐', name: '존경', value: respect },
    { x: cx, y: cy + radius, label: '🦊', name: '유대', value: bond },
    { x: cx - radius, y: cy, label: '💜', name: '개방', value: openness },
  ];

  // 값 기반 실제 좌표 (중심에서 value/100만큼)
  const valuePoints = axisPoints.map((p) => ({
    ...p,
    vx: cx + (p.x - cx) * (p.value / 100),
    vy: cy + (p.y - cy) * (p.value / 100),
  }));

  // SVG polygon 경로
  const polygonPath = valuePoints.map((p) => `${p.vx},${p.vy}`).join(' ');

  // 배경 가이드라인 (25%, 50%, 75%, 100%)
  const guides = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* 배경 가이드 */}
      {guides.map((scale, i) => {
        const pts = axisPoints
          .map((p) => {
            const gx = cx + (p.x - cx) * scale;
            const gy = cy + (p.y - cy) * scale;
            return `${gx},${gy}`;
          })
          .join(' ');
        return (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke={accentColor}
            strokeOpacity={0.1 + i * 0.03}
            strokeWidth={1}
          />
        );
      })}

      {/* 4축 선 */}
      {axisPoints.map((p, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke={accentColor}
          strokeOpacity={0.2}
          strokeWidth={1}
        />
      ))}

      {/* 실제 값 polygon */}
      <motion.polygon
        points={polygonPath}
        fill={accentColor}
        fillOpacity={0.25}
        stroke={accentColor}
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
      />

      {/* 값 포인트 (꼭짓점 점) */}
      {valuePoints.map((p, i) => (
        <motion.circle
          key={`pt-${i}`}
          cx={p.vx}
          cy={p.vy}
          r={3.5}
          fill={accentColor}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 + i * 0.08, type: 'spring' }}
        />
      ))}

      {/* 축 라벨 (이모지 + 수치) */}
      {axisPoints.map((p, i) => {
        // 라벨 위치 — 각 축 바깥쪽으로 살짝
        const labelOffset = 16;
        let lx = p.x;
        let ly = p.y;
        if (p.y < cy) ly -= labelOffset; // 위
        if (p.y > cy) ly += labelOffset; // 아래
        if (p.x > cx) lx += labelOffset; // 오른쪽
        if (p.x < cx) lx -= labelOffset; // 왼쪽

        return (
          <g key={`lb-${i}`}>
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              fontSize={14}
              dominantBaseline="middle"
            >
              {p.label}
            </text>
            <text
              x={lx}
              y={ly + 14}
              textAnchor="middle"
              fontSize={10}
              fill="#666"
              fontWeight={600}
              dominantBaseline="middle"
            >
              {Math.round(p.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
