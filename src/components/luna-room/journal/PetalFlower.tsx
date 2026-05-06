'use client';

/**
 * v114 — 4꽃잎 SVG 차트 (radar 대체).
 *
 * 4축 (trust / openness / bond / respect) 을 4개의 꽃잎으로 시각화.
 * 라디안 폴리곤이 아니라 각 꽃잎이 독립 — 비대칭, 자연스러움.
 *
 * 스코어 → 길이: length = (score / 100) * 70 + 8 (최소 8 보장)
 */

import { motion } from 'framer-motion';
import { BOND_TOKENS, BOND_EASE, HANDWRITE_FONT } from '@/lib/luna-life/relationship-tokens';

interface Props {
  trust: number;     // 0~100
  openness: number;
  bond: number;
  respect: number;
  show: boolean;
  /** 시퀀스 시작 지연 (ms) */
  delay?: number;
}

interface PetalDef {
  key: 'trust' | 'openness' | 'bond' | 'respect';
  label: string;
  score: number;
  color: string;
  rotation: number; // deg
}

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_LEN = 70;
const MIN_LEN = 8;
const PETAL_W = 22;

function petalPath(length: number): string {
  // 중심에서 위쪽으로 자라는 teardrop 형태.
  const half = PETAL_W / 2;
  const tip = -length;
  // M cx,cy  Q (cx+half, cy + tip/2)  cx, cy+tip   Q (cx-half, cy+tip/2) cx,cy
  return `M 0 0 Q ${half} ${tip / 2} 0 ${tip} Q ${-half} ${tip / 2} 0 0 Z`;
}

export default function PetalFlower({ trust, openness, bond, respect, show, delay = 800 }: Props) {
  const petals: PetalDef[] = [
    { key: 'trust',    label: '신뢰', score: trust,    color: BOND_TOKENS.petalTrust,    rotation: 0 },
    { key: 'respect',  label: '존경', score: respect,  color: BOND_TOKENS.petalRespect,  rotation: 90 },
    { key: 'bond',     label: '유대', score: bond,     color: BOND_TOKENS.petalBond,     rotation: 180 },
    { key: 'openness', label: '개방', score: openness, color: BOND_TOKENS.petalOpenness, rotation: 270 },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* 꽃잎 */}
        {petals.map((p, i) => {
          const len = Math.max(MIN_LEN, Math.min(1, p.score / 100) * MAX_LEN + MIN_LEN);
          const d = petalPath(len);
          return (
            <g key={p.key} transform={`translate(${CX}, ${CY}) rotate(${p.rotation})`}>
              <motion.path
                d={d}
                fill={p.color}
                fillOpacity={0.6}
                stroke={p.color}
                strokeOpacity={0.85}
                strokeWidth={1.5}
                initial={{ scale: 0, opacity: 0 }}
                animate={show ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{
                  delay: (delay + i * 80) / 1000,
                  duration: 0.6,
                  ease: BOND_EASE.petalGrow,
                }}
                style={{ transformOrigin: '0 0' }}
              />
              {/* 점수 라벨 — 꽃잎 끝 안쪽 */}
              <motion.text
                x={0}
                y={-len + 14}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill={BOND_TOKENS.ink}
                opacity={0.65}
                fontFamily={HANDWRITE_FONT}
                initial={{ opacity: 0 }}
                animate={show ? { opacity: 0.65 } : { opacity: 0 }}
                transition={{ delay: (delay + i * 80 + 400) / 1000, duration: 0.4 }}
                transform={`rotate(${-p.rotation})`}
              >
                {Math.round(p.score)}
              </motion.text>
            </g>
          );
        })}

        {/* 중심 원 */}
        <motion.circle
          cx={CX}
          cy={CY}
          r={9}
          fill="#FDF6EC"
          stroke={BOND_TOKENS.stampInk}
          strokeWidth={1.5}
          initial={{ scale: 0 }}
          animate={show ? { scale: 1 } : { scale: 0 }}
          transition={{ delay: (delay - 100) / 1000, duration: 0.4, ease: BOND_EASE.petalGrow }}
        />

        {/* 외부 라벨 (4축 이름) */}
        {petals.map((p) => {
          const labelDist = MAX_LEN + 22;
          const rad = ((p.rotation - 90) * Math.PI) / 180;
          const lx = CX + Math.cos(rad) * labelDist;
          const ly = CY + Math.sin(rad) * labelDist;
          return (
            <motion.text
              key={`l-${p.key}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill={BOND_TOKENS.inkSoft}
              fontFamily={HANDWRITE_FONT}
              initial={{ opacity: 0 }}
              animate={show ? { opacity: 0.85 } : { opacity: 0 }}
              transition={{ delay: (delay + 600) / 1000, duration: 0.4 }}
            >
              {p.label}
            </motion.text>
          );
        })}
      </svg>
    </div>
  );
}
