/**
 * v103: Spirit Drive Profiles
 *
 * 각 정령이 "어떻게 행동하는가" 의 근원.
 * OpenHer-inspired 5-axis personality system.
 *
 * Connection (C): 가까이 있고 싶음 → 인사 따뜻함
 * Novelty (N):    새로움/변화 추구 → 같은 말 반복 안 함
 * Expression (E): 자기를 드러냄 → 감정을 직접 말함
 * Safety (S):     안전 욕구 → 비밀을 늦게 풂
 * Play (P):       장난기 → 농담/이모지 빈도
 *
 * 본드 레벨 ↑ 시 Safety 가 천천히 +5 씩 풀려 점차 솔직해진다.
 */

import type { SpiritId } from '@/types/spirit.types';

export interface DriveProfile {
  connection: number; // 0..100
  novelty: number;
  expression: number;
  safety: number;
  play: number;
}

export const SPIRIT_DRIVE_BASELINE: Record<SpiritId, DriveProfile> = {
  // ─── N 등급 (6) ─────────────────────────────────────
  seed_spirit:    { connection: 80, novelty: 70, expression: 65, safety: 55, play: 75 },
  tear_drop:      { connection: 60, novelty: 25, expression: 40, safety: 80, play: 15 },
  fire_goblin:    { connection: 35, novelty: 80, expression: 90, safety: 20, play: 60 },
  drum_imp:       { connection: 50, novelty: 60, expression: 70, safety: 45, play: 80 },
  book_worm:      { connection: 45, novelty: 65, expression: 30, safety: 75, play: 25 },
  peace_dove:     { connection: 90, novelty: 30, expression: 50, safety: 70, play: 40 },

  // ─── R 등급 (7) ─────────────────────────────────────
  cloud_bunny:    { connection: 60, novelty: 50, expression: 40, safety: 60, play: 90 },
  wind_sprite:    { connection: 55, novelty: 75, expression: 35, safety: 50, play: 65 },
  letter_fairy:   { connection: 70, novelty: 40, expression: 80, safety: 65, play: 30 },
  rose_fairy:     { connection: 75, novelty: 60, expression: 70, safety: 40, play: 70 },
  clown_harley:   { connection: 50, novelty: 85, expression: 75, safety: 35, play: 95 },
  forest_mom:     { connection: 95, novelty: 25, expression: 55, safety: 90, play: 35 },
  moon_rabbit:    { connection: 65, novelty: 40, expression: 55, safety: 70, play: 35 },

  // ─── SR 등급 (5) ─────────────────────────────────────
  cherry_leaf:    { connection: 70, novelty: 50, expression: 65, safety: 50, play: 50 },
  ice_prince:     { connection: 30, novelty: 35, expression: 25, safety: 95, play: 20 },
  lightning_bird: { connection: 45, novelty: 95, expression: 80, safety: 25, play: 70 },
  butterfly_meta: { connection: 60, novelty: 90, expression: 60, safety: 55, play: 60 },
  book_keeper:    { connection: 70, novelty: 40, expression: 50, safety: 75, play: 30 },

  // ─── UR 등급 (2) ─────────────────────────────────────
  queen_elena:    { connection: 65, novelty: 60, expression: 90, safety: 70, play: 50 },
  star_dust:      { connection: 55, novelty: 80, expression: 75, safety: 40, play: 80 },

  // ─── L 등급 (1) ─────────────────────────────────────
  guardian_eddy:  { connection: 100, novelty: 50, expression: 70, safety: 100, play: 45 },
};

/**
 * 본드 레벨 보정 — Safety 만 풀린다 (점점 솔직해짐).
 * 다른 축은 정령의 정체성이라 변하지 않음.
 */
export function applyBondToDrives(baseline: DriveProfile, bondLv: number): DriveProfile {
  const safetyRelease = Math.max(0, bondLv - 1) * 5; // Lv1=0, Lv5=20
  return {
    ...baseline,
    safety: Math.max(0, baseline.safety - safetyRelease),
  };
}

/** 정령의 응답 톤을 결정 — 행동 분기에 사용 */
export type DriveTone = 'guarded' | 'gentle' | 'playful' | 'expressive' | 'intimate';

export function pickDriveTone(d: DriveProfile, mood: number): DriveTone {
  // 본드 ↑ + 무드 ↑ 면 intimate
  if (d.safety < 35 && d.expression > 70 && mood >= 70) return 'intimate';
  if (d.play >= 75) return 'playful';
  if (d.expression >= 75) return 'expressive';
  if (d.safety >= 70) return 'guarded';
  return 'gentle';
}

/** 한 줄 인격 설명 (UI 표시용) */
export function describeDrive(d: DriveProfile): string {
  const high = (Object.entries(d) as Array<[keyof DriveProfile, number]>)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k]) => k);
  const map: Record<keyof DriveProfile, string> = {
    connection: '가까이',
    novelty: '새로움',
    expression: '솔직함',
    safety: '조심스러움',
    play: '장난기',
  };
  return high.map((k) => map[k]).join(' · ');
}
