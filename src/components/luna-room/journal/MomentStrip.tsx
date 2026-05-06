'use client';

/**
 * v114 — 폴라로이드 가로 스트립 (3개 미만 가능).
 * 각 카드 = 한 메트릭 (함께 N일 / 총 N회 / 연속 N일).
 * 살짝씩 겹치고 ±2~3° 기울어짐.
 */

import Polaroid from './Polaroid';

interface Props {
  daysSinceFirst: number;
  totalSessions: number;
  consecutiveDays: number;
  show: boolean;
}

const TILTS = [-3, 2, -1.5] as const;

export default function MomentStrip({
  daysSinceFirst,
  totalSessions,
  consecutiveDays,
  show,
}: Props) {
  const cards: { label: string; value: number; unit: string }[] = [
    { label: '함께한', value: daysSinceFirst, unit: '일' },
    { label: '쌓은 대화', value: totalSessions, unit: '회' },
  ];
  if (consecutiveDays >= 2) {
    cards.push({ label: '연속', value: consecutiveDays, unit: '일' });
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: -8,
        flexWrap: 'wrap',
      }}
    >
      {cards.map((c, i) => (
        <div key={c.label} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: cards.length - i }}>
          <Polaroid
            label={c.label}
            value={c.value}
            unit={c.unit}
            tilt={TILTS[i] ?? 0}
            index={i}
            show={show}
          />
        </div>
      ))}
    </div>
  );
}
