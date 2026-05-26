'use client';

/**
 * v119.5 — 단계별 메인 카드. Love and Deepspace 패턴 차용.
 *
 * 좌측: StageIllustration (단계별 밤하늘 SVG)
 * 우측: "지금 우리는" 라벨 + 큰 호칭 + 부제 + 다음 단계 티저
 * 배경: STAGE_COLORS 그라데이션
 * 데코: Sparkles + 단계 컬러 글로우
 *
 * 기존 CharacterCard 를 격상해 페이지 최상단 메인 시각 앵커로 사용.
 */

import { motion } from 'framer-motion';
import { HANDWRITE_FONT, getStageColor } from '@/lib/luna-life/relationship-tokens';
import StageIllustration from './StageIllustration';
import Sparkles from './effects/Sparkles';
import type { StageLabel } from './level-unlocks';

interface Props {
  show: boolean;
  stage: StageLabel;
  nextStage: StageLabel;
  isSeed: boolean;
  isMax: boolean;
}

export default function StageCard({ show, stage, nextStage, isSeed, isMax }: Props) {
  const c = getStageColor(stage.level);
  const isCosmos = stage.level === 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={show ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.97 }}
      transition={{ delay: 0.45, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        padding: '20px 18px 22px',
        marginBottom: 20,
        background: `linear-gradient(150deg, ${c.bg[0]} 0%, ${c.bg[1]} 55%, ${c.bg[2]} 100%)`,
        border: `1.5px solid ${c.accent}55`,
        borderRadius: 22,
        boxShadow: isCosmos
          ? `0 8px 26px ${c.stamp}66, 0 2px 6px rgba(0,0,0,0.18), inset 0 0 0 1px ${c.accent}44, inset 0 0 50px ${c.glow}20`
          : `0 6px 18px ${c.accent}26, 0 2px 4px ${c.accent}18, inset 0 0 0 1px rgba(255,255,255,0.45)`,
        overflow: 'hidden',
      }}
    >
      {/* 배경 Sparkles */}
      <Sparkles
        count={isCosmos ? 28 : 14}
        color={c.particle}
        sizeRange={[0.4, isCosmos ? 1.8 : 1.2]}
        opacityRange={[0.2, 0.85]}
        seed={stage.level * 13}
        twinkleDuration={3.0}
      />

      {/* 콘텐츠 그리드 */}
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: 14,
          alignItems: 'center',
        }}
      >
        {/* 좌측 일러스트 */}
        <div
          style={{
            position: 'relative',
            width: 120,
            height: 120,
            borderRadius: 18,
            overflow: 'hidden',
            border: `1px solid ${c.accent}44`,
            background: isCosmos ? '#0F0E2A' : `${c.bg[2]}cc`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.18), 0 4px 10px ${c.accent}30`,
          }}
        >
          <StageIllustration level={stage.level} size={120} variant="card" show={show} />
        </div>

        {/* 우측 텍스트 */}
        <div style={{ position: 'relative', minWidth: 0 }}>
          {/* 작은 라벨 — 지금 우리는 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 6,
              padding: '3px 9px 4px',
              background: isCosmos ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)',
              border: `1px solid ${c.accent}55`,
              borderRadius: 999,
              fontFamily: HANDWRITE_FONT,
              fontSize: 10.5,
              color: isCosmos ? c.accent : c.stamp,
              letterSpacing: '0.04em',
              backdropFilter: 'blur(4px)',
            }}
          >
            지금 우리는
          </div>

          {/* 큰 호칭 */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={show ? { opacity: 1, y: 0 } : { opacity: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            style={{
              fontFamily: HANDWRITE_FONT,
              fontSize: 26,
              fontWeight: 700,
              color: c.ink,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              textShadow: isCosmos
                ? `0 0 16px ${c.glow}88, 0 1px 0 rgba(0,0,0,0.25)`
                : `0 1px 0 rgba(255,255,255,0.6)`,
              marginBottom: 5,
            }}
          >
            {isSeed ? '아직 모르는 사이' : stage.title}
          </motion.div>

          {/* 부제 — 하늘 풍경 카피 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={show ? { opacity: 0.9 } : { opacity: 0 }}
            transition={{ delay: 0.85, duration: 0.5 }}
            style={{
              fontFamily: HANDWRITE_FONT,
              fontSize: 12.5,
              color: isCosmos ? `${c.accent}dd` : `${c.ink}aa`,
              lineHeight: 1.5,
              marginBottom: 8,
            }}
          >
            {stage.sky}
          </motion.div>

          {/* 다음 단계 티저 */}
          {!isMax && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={show ? { opacity: 1, x: 0 } : { opacity: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px 3px',
                background: isCosmos ? 'rgba(245,211,138,0.18)' : 'rgba(255,255,255,0.45)',
                border: `1px dashed ${c.accent}55`,
                borderRadius: 999,
                fontFamily: HANDWRITE_FONT,
                fontSize: 10.5,
                color: isCosmos ? c.glow : c.ink,
                opacity: 0.85,
              }}
            >
              <span aria-hidden style={{ fontSize: 9 }}>↗</span>
              곧 <strong style={{ fontWeight: 600 }}>{nextStage.title}</strong> 사이로
            </motion.div>
          )}
          {isMax && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={show ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 9px 3px',
                background: 'linear-gradient(135deg, #F5D38A 0%, #E8B068 100%)',
                borderRadius: 999,
                fontFamily: HANDWRITE_FONT,
                fontSize: 10.5,
                color: '#3A2E78',
                fontWeight: 600,
                boxShadow: '0 2px 6px rgba(245,211,138,0.50)',
              }}
            >
              우리만의 우주
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
