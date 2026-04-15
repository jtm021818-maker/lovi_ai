'use client';

import { motion } from 'framer-motion';
import IntimacyRadar from './IntimacyRadar';

/**
 * 🆕 v41: 친밀도 카드 — 설정 페이지의 캐릭터 카드 하단에 표시
 *
 * 구성:
 *  - 상단: 레벨 배지 (🌺 개화 Lv.3) + 관계 라벨
 *  - 중간: 다음 레벨까지 프로그레스 바
 *  - 중간: 4축 미니 레이더 차트
 *  - 하단: 함께한 일수 + 총 상담 횟수 + 연속 방문 스트릭
 */

interface IntimacyCardProps {
  /** 현재 레벨 (1~5) */
  level: number;
  /** 레벨 이모지 */
  levelEmoji: string;
  /** 레벨 이름 */
  levelName: string;
  /** 관계 라벨 ("같이 고민 나누는 사이") */
  levelLabel: string;
  /** 4축 수치 */
  trust: number;
  openness: number;
  bond: number;
  respect: number;
  /** 평균 점수 */
  avgScore: number;
  /** 다음 레벨까지 % */
  progressPercent: number;
  /** 함께한 일수 */
  daysSinceFirst: number;
  /** 총 상담 횟수 */
  totalSessions: number;
  /** 연속 방문 일수 */
  consecutiveDays: number;
  /** 페르소나 ('luna' | 'tarot') */
  persona?: 'luna' | 'tarot';
}

export default function IntimacyCard({
  level,
  levelEmoji,
  levelName,
  levelLabel,
  trust,
  openness,
  bond,
  respect,
  avgScore,
  progressPercent,
  daysSinceFirst,
  totalSessions,
  consecutiveDays,
  persona = 'luna',
}: IntimacyCardProps) {
  const isTarot = persona === 'tarot';
  const accentColor = isTarot ? '#ffd54f' : '#a855f7';
  const bgGradient = isTarot
    ? 'linear-gradient(135deg, #1a1a3e 0%, #2d1b69 100%)'
    : 'linear-gradient(135deg, #fce7f3 0%, #ede9fe 50%, #fdf4ff 100%)';
  const textColor = isTarot ? '#e8d5f5' : '#4a148c';
  const subtleText = isTarot ? 'rgba(232, 213, 245, 0.7)' : 'rgba(74, 20, 140, 0.7)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: bgGradient,
        borderRadius: 20,
        padding: 16,
        border: `1px solid ${isTarot ? 'rgba(255, 213, 79, 0.3)' : 'rgba(168, 85, 247, 0.25)'}`,
        boxShadow: isTarot
          ? '0 4px 16px rgba(26, 26, 62, 0.3)'
          : '0 4px 16px rgba(168, 85, 247, 0.15)',
      }}
    >
      {/* 헤더: 캐릭터 아바타 + 친밀도 + 레벨 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <img
            src={isTarot ? '/taronaong_kakao.png' : '/luna_fox_transparent.png'}
            alt={isTarot ? '타로냥' : '루나'}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `1.5px solid ${isTarot ? 'rgba(255, 213, 79, 0.5)' : 'rgba(168, 85, 247, 0.4)'}`,
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: 0.5 }}>
            친밀도
          </span>
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: subtleText,
            background: isTarot ? 'rgba(255, 213, 79, 0.15)' : 'rgba(168, 85, 247, 0.12)',
            padding: '2px 8px',
            borderRadius: 10,
          }}
        >
          Lv.{level}
        </div>
      </div>

      {/* 레벨 배지 + 라벨 */}
      <div
        style={{
          background: isTarot ? 'rgba(255, 213, 79, 0.08)' : 'rgba(255, 255, 255, 0.55)',
          borderRadius: 14,
          padding: '10px 12px',
          marginBottom: 12,
          border: `1px solid ${isTarot ? 'rgba(255, 213, 79, 0.15)' : 'rgba(168, 85, 247, 0.15)'}`,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: textColor, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>{levelEmoji}</span>
          <span>{levelName}</span>
        </div>
        <div style={{ fontSize: 11, color: subtleText, marginTop: 2, fontStyle: 'italic' }}>
          &ldquo;{levelLabel}&rdquo;
        </div>
      </div>

      {/* 다음 레벨까지 프로그레스 */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4, color: subtleText }}>
          <span>다음 레벨까지</span>
          <span style={{ fontWeight: 600 }}>{Math.round(avgScore)}/100</span>
        </div>
        <div
          style={{
            height: 6,
            background: isTarot ? 'rgba(255, 213, 79, 0.12)' : 'rgba(168, 85, 247, 0.12)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: isTarot
                ? 'linear-gradient(90deg, #ffd54f, #ff9800)'
                : 'linear-gradient(90deg, #a855f7, #ec4899)',
              borderRadius: 3,
            }}
          />
        </div>
      </div>

      {/* 4축 레이더 차트 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <IntimacyRadar
          trust={trust}
          openness={openness}
          bond={bond}
          respect={respect}
          accentColor={accentColor}
          size={150}
        />
      </div>

      {/* 하단 스탯 — 함께한 날, 총 세션, 연속 방문 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 6,
          paddingTop: 10,
          borderTop: `1px solid ${isTarot ? 'rgba(255, 213, 79, 0.15)' : 'rgba(168, 85, 247, 0.15)'}`,
        }}
      >
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 10, color: subtleText }}>📅 함께한 지</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: textColor }}>
            {daysSinceFirst}일
          </div>
        </div>
        <div style={{ width: 1, background: isTarot ? 'rgba(255, 213, 79, 0.12)' : 'rgba(168, 85, 247, 0.12)' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 10, color: subtleText }}>💬 총</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: textColor }}>
            {totalSessions}회
          </div>
        </div>
        {consecutiveDays >= 2 && (
          <>
            <div style={{ width: 1, background: isTarot ? 'rgba(255, 213, 79, 0.12)' : 'rgba(168, 85, 247, 0.12)' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 10, color: subtleText }}>🔥 연속</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: textColor }}>
                {consecutiveDays}일
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
