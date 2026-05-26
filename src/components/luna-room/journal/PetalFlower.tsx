'use client';

/**
 * v119.5 — 4꽃잎 SVG 차트 정성화.
 *
 * v114 기본 teardrop → 4-point Bezier 자연 꽃잎 path
 * + 꽃잎 내부 그라데이션 + 광택 하이라이트
 * + 중심 원에 단계 아이콘(StageIcon) 표시
 * + 4축 라벨 옆 Phosphor 아이콘 (HandHeart/Flower/Link/Crown)
 * + 꽃잎 위 Sparkles 5개 흩어짐
 *
 * 4축 (trust / openness / bond / respect):
 *   - score 0~100 → 꽃잎 길이/투명도 (숫자 노출 X, v119 결정 유지)
 */

import { motion } from 'framer-motion';
import { HandHeart, Flower, Link as LinkIcon, Crown } from '@phosphor-icons/react';
import { BOND_TOKENS, BOND_EASE, HANDWRITE_FONT, getStageColor } from '@/lib/luna-life/relationship-tokens';
import StageIcon from './StageIcon';
import Sparkles from './effects/Sparkles';

interface Props {
  trust: number;       // 0~100
  openness: number;
  bond: number;
  respect: number;
  show: boolean;
  /** 시퀀스 시작 지연 (ms) */
  delay?: number;
  /** 현재 친밀도 레벨 — 중심 단계 아이콘 + 단계 컬러 글로우 */
  level?: number;
}

interface PetalDef {
  key: 'trust' | 'openness' | 'bond' | 'respect';
  label: string;
  score: number;
  color: string;
  gradId: string;
  rotation: number;     // deg
  Icon: typeof HandHeart;
}

const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE / 2;
const MAX_LEN = 76;
const MIN_LEN = 12;
const PETAL_W = 28;

/**
 * 자연스러운 꽃잎 — 4점 Cubic Bezier.
 * 중심(0,0)에서 위쪽 (0, -length) 끝점으로 자라는, 살짝 둥근 마름모 형태.
 *
 * 곡선:
 *   M 0,0
 *   C (+wHalf*1.05, -length*0.30)  (+wHalf*0.75, -length*0.85)  (0, -length)
 *   C (-wHalf*0.75, -length*0.85)  (-wHalf*1.05, -length*0.30)  (0, 0)
 *   Z
 */
function petalPath(length: number): string {
  const w = PETAL_W;
  const wh = w / 2;
  const l = length;
  return [
    `M 0 0`,
    `C ${(wh * 1.05).toFixed(2)} ${(-l * 0.3).toFixed(2)}`,
    `${(wh * 0.75).toFixed(2)} ${(-l * 0.85).toFixed(2)}`,
    `0 ${(-l).toFixed(2)}`,
    `C ${(-wh * 0.75).toFixed(2)} ${(-l * 0.85).toFixed(2)}`,
    `${(-wh * 1.05).toFixed(2)} ${(-l * 0.3).toFixed(2)}`,
    `0 0`,
    `Z`,
  ].join(' ');
}

/** 꽃잎 안쪽 하이라이트 — 한 줄 가벼운 광택 */
function highlightPath(length: number): string {
  const l = length;
  return `M 0 ${-l * 0.18} Q ${PETAL_W * 0.18} ${-l * 0.5} 0 ${-l * 0.82}`;
}

export default function PetalFlower({ trust, openness, bond, respect, show, delay = 800, level }: Props) {
  const petals: PetalDef[] = [
    {
      key: 'trust',    label: '신뢰', score: trust,
      color: BOND_TOKENS.petalTrust,    gradId: 'petal-trust',
      rotation: 0,   Icon: HandHeart,
    },
    {
      key: 'respect',  label: '존경', score: respect,
      color: BOND_TOKENS.petalRespect,  gradId: 'petal-respect',
      rotation: 90,  Icon: Crown,
    },
    {
      key: 'bond',     label: '유대', score: bond,
      color: BOND_TOKENS.petalBond,     gradId: 'petal-bond',
      rotation: 180, Icon: LinkIcon,
    },
    {
      key: 'openness', label: '개방', score: openness,
      color: BOND_TOKENS.petalOpenness, gradId: 'petal-openness',
      rotation: 270, Icon: Flower,
    },
  ];

  const stageColor = level ? getStageColor(level) : null;

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden role="img">
        <defs>
          {petals.map((p) => (
            <radialGradient
              key={p.gradId}
              id={p.gradId}
              cx="50%" cy="80%" r="70%"
            >
              <stop offset="0%"  stopColor={p.color} stopOpacity={0.95} />
              <stop offset="65%" stopColor={p.color} stopOpacity={0.70} />
              <stop offset="100%" stopColor={p.color} stopOpacity={0.30} />
            </radialGradient>
          ))}
          {stageColor && (
            <radialGradient id="petal-core" cx="50%" cy="50%" r="60%">
              <stop offset="0%"  stopColor={stageColor.glow} stopOpacity={0.95} />
              <stop offset="100%" stopColor={stageColor.accent} stopOpacity={0.65} />
            </radialGradient>
          )}
          <filter id="petal-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {/* 꽃잎 */}
        {petals.map((p, i) => {
          const len = Math.max(MIN_LEN, Math.min(1, p.score / 100) * MAX_LEN + MIN_LEN);
          const d = petalPath(len);
          const hi = highlightPath(len);
          return (
            <g key={p.key} transform={`translate(${CX}, ${CY}) rotate(${p.rotation})`}>
              <motion.path
                d={d}
                fill={`url(#${p.gradId})`}
                stroke={p.color}
                strokeOpacity={0.85}
                strokeWidth={1.2}
                strokeLinejoin="round"
                filter="url(#petal-shadow)"
                initial={{ scale: 0, opacity: 0 }}
                animate={show ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{
                  delay: (delay + i * 90) / 1000,
                  duration: 0.7,
                  ease: BOND_EASE.petalGrow,
                }}
                style={{ transformOrigin: '0 0' }}
              />
              {/* 광택 하이라이트 */}
              <motion.path
                d={hi}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.55}
                strokeWidth={0.9}
                strokeLinecap="round"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={show ? { opacity: 0.55, pathLength: 1 } : { opacity: 0 }}
                transition={{ delay: (delay + i * 90 + 400) / 1000, duration: 0.6 }}
              />
            </g>
          );
        })}

        {/* 중심 원 — 단계 컬러 글로우 */}
        <motion.circle
          cx={CX} cy={CY} r={14}
          fill={stageColor ? 'url(#petal-core)' : '#FDF6EC'}
          stroke={stageColor ? stageColor.stamp : BOND_TOKENS.stampInk}
          strokeWidth={1.4}
          strokeOpacity={0.85}
          initial={{ scale: 0 }}
          animate={show ? { scale: 1 } : { scale: 0 }}
          transition={{ delay: (delay - 100) / 1000, duration: 0.5, ease: BOND_EASE.petalGrow }}
          style={
            stageColor
              ? { filter: `drop-shadow(0 0 6px ${stageColor.glow}99)` }
              : undefined
          }
        />
      </svg>

      {/* 중심 단계 아이콘 — SVG foreignObject 우회 (절대위치 오버레이) */}
      {level && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.4 }}
          animate={show ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          transition={{ delay: (delay + 200) / 1000, duration: 0.5, ease: BOND_EASE.petalGrow }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          <StageIcon level={level} size={16} weight="duotone" />
        </motion.div>
      )}

      {/* 4축 라벨 + Phosphor 아이콘 — 외곽 절대위치 */}
      {petals.map((p) => {
        const labelDist = MAX_LEN + 26;
        const rad = ((p.rotation - 90) * Math.PI) / 180;
        const lx = CX + Math.cos(rad) * labelDist;
        const ly = CY + Math.sin(rad) * labelDist;
        return (
          <motion.div
            key={`l-${p.key}`}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={show ? { opacity: 0.92 } : { opacity: 0 }}
            transition={{ delay: (delay + 600) / 1000, duration: 0.5 }}
            style={{
              position: 'absolute',
              left: lx, top: ly,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.55)',
              border: `1px solid ${p.color}88`,
              fontFamily: HANDWRITE_FONT,
              fontSize: 10.5,
              color: BOND_TOKENS.inkSoft,
              boxShadow: `0 1px 3px ${p.color}33`,
              whiteSpace: 'nowrap',
            }}
          >
            <p.Icon size={11} weight="duotone" color={p.color} />
            <span>{p.label}</span>
          </motion.div>
        );
      })}

      {/* 꽃잎 위 Sparkles */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        <Sparkles
          count={6}
          color={stageColor ? stageColor.glow : '#F5D4A0'}
          sizeRange={[0.4, 1.1]}
          opacityRange={[0.2, 0.8]}
          twinkleDuration={2.8}
          seed={level ?? 5}
        />
      </div>
    </div>
  );
}
