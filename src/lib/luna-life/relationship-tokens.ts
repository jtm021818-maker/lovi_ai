/**
 * v114 Bond/Relationship 디자인 토큰
 *
 * 컨셉: 여행 일지 / 폴라로이드 스크랩북.
 * v113.5 외출 복귀 UI 와 동일한 비주얼 어휘 (cream paper / 워시테이프 / 손글씨 / 도장).
 */

export const BOND_TOKENS = {
  // ─── 베이스 종이 ───
  paper: '#FAF6F0',
  paperEdge: '#E8DCC9',
  paperGrain: 'rgba(45,32,19,0.04)',

  // ─── 잉크 / 텍스트 ───
  ink: '#2D2013',
  inkSoft: '#6B5744',
  inkPale: 'rgba(45,32,19,0.45)',
  inkLine: 'rgba(45,32,19,0.18)',

  // ─── 워시테이프 ───
  washiPurple: '#C4A8D4',
  washiPeach: '#F2C9A0',
  washiSage: '#B8D4C8',

  // ─── 4축 페탈 색 ───
  petalTrust: '#E8B4C8',     // 더스티 로즈 — 신뢰
  petalOpenness: '#B8D4C8',  // 세이지 그린 — 개방
  petalBond: '#F5D4A0',      // 웜 앰버 — 유대
  petalRespect: '#B4C4E8',   // 페리윙클 — 존경

  // ─── 도장 잉크 ───
  stampInk: '#7B5EA7',
  stampInkDeep: '#5B3F87',

  // ─── 진행도 잉크 바 ───
  inkBarFill: '#7B5EA7',
  inkBarFillEnd: '#5B3F87',
  inkBarTrack: 'rgba(123,94,167,0.12)',
} as const;

/** 일지 타이틀/강조 — 붓 손글씨 (SIL OFL, 상업적 이용 안전) */
export const HANDWRITE_FONT = 'var(--font-handwrite-brush)';

/** 일지 카피/캡션 — 둥글고 부드러운 한글 */
export const SOFT_HANDWRITE_FONT = 'var(--font-handwrite-soft)';

/** 숫자·날짜 — 한국 명조 포인트 */
export const NUMERIC_FONT = 'var(--font-serif-kr)';

/** 이즈 / 지속 */
export const BOND_EASE = {
  petalGrow: [0.34, 1.56, 0.64, 1] as const,
  polaroidSlide: [0.22, 1, 0.36, 1] as const,
  stampPress: [0.68, -0.55, 0.27, 1.55] as const,
  captionInk: [0.16, 1, 0.3, 1] as const,
  starGlow: [0.22, 0.61, 0.36, 1] as const,
  cardLift: [0.16, 1, 0.3, 1] as const,
  galaxyDrift: [0.45, 0, 0.55, 1] as const,
} as const;

// ============================================================
// 🆕 v119.5 별·달·은하 메타포 — 단계별 컬러/파티클/시퀀스
// ============================================================

export interface StageColor {
  /** 카드 배경 그라데이션 (3 stop) */
  bg: readonly [string, string, string];
  /** 액센트 (테두리/별/연결선) */
  accent: string;
  /** 큰 잉크 텍스트 컬러 */
  ink: string;
  /** 빛 하이라이트 (글로우용) */
  glow: string;
  /** 파티클 색상 */
  particle: string;
  /** 도장 잉크 컬러 */
  stamp: string;
}

/**
 * 5단계 컬러 시스템.
 *   Lv.1 새벽   — 라이트 핑크/피치 (조심스러운 첫 빛)
 *   Lv.2 황혼   — 코랄/라일락 (별이 막 보이는 하늘)
 *   Lv.3 달밤   — 라벤더/달빛 보라 (반달이 뜬 밤)
 *   Lv.4 별밤   — 딥 인디고/플럼 (별똥별이 흐르는 밤)
 *   Lv.5 은하   — 미드나잇 + 골드 (우리만의 우주)
 */
export const STAGE_COLORS: readonly [null, StageColor, StageColor, StageColor, StageColor, StageColor] = [
  null,
  // Lv.1 — 새벽
  {
    bg: ['#FFF4EC', '#FFE6E2', '#F8D7DD'] as const,
    accent: '#E8A4B8',
    ink: '#7A3550',
    glow: '#FFD6E0',
    particle: '#F5B8C8',
    stamp: '#B8638E',
  },
  // Lv.2 — 황혼
  {
    bg: ['#FCEAD9', '#F6CFDA', '#E8C2E4'] as const,
    accent: '#C98AB8',
    ink: '#5A2A5A',
    glow: '#F0C0E0',
    particle: '#D89AC4',
    stamp: '#8E4A8E',
  },
  // Lv.3 — 달밤 (개화)
  {
    bg: ['#F1E5FA', '#E0D0F0', '#C9B5E8'] as const,
    accent: '#8C6AC4',
    ink: '#3F2A75',
    glow: '#D7C5F0',
    particle: '#A88AD6',
    stamp: '#5B3F87',
  },
  // Lv.4 — 별밤
  {
    bg: ['#D8CFF0', '#9890D0', '#5C5BA0'] as const,
    accent: '#7A6FC4',
    ink: '#F5F0FF',
    glow: '#C4B8E6',
    particle: '#E0D0FF',
    stamp: '#2D2475',
  },
  // Lv.5 — 은하 + 골드
  {
    bg: ['#1B1A4A', '#3A2E78', '#5B3F87'] as const,
    accent: '#F5D38A',
    ink: '#FAF6E8',
    glow: '#FFE9B8',
    particle: '#FFE188',
    stamp: '#F5D38A',
  },
] as const;

export function getStageColor(level: number): StageColor {
  const idx = Math.min(Math.max(level, 1), 5);
  return STAGE_COLORS[idx]!;
}

export interface StageParticleSpec {
  /** Sparkles 개수 */
  count: number;
  /** 파티클 색 (STAGE_COLORS.particle 기본값과 오버라이드 가능) */
  color?: string;
  /** 파티클 크기 (min, max) px */
  size: readonly [number, number];
  /** 평균 속도(px/s) — 부드러움 조절 */
  speed: number;
}

export const STAGE_PARTICLES: readonly [null, StageParticleSpec, StageParticleSpec, StageParticleSpec, StageParticleSpec, StageParticleSpec] = [
  null,
  { count: 12, size: [0.4, 1.0], speed: 0.4 },
  { count: 18, size: [0.5, 1.2], speed: 0.5 },
  { count: 24, size: [0.6, 1.5], speed: 0.6 },
  { count: 32, size: [0.7, 1.8], speed: 0.75 },
  { count: 48, size: [0.8, 2.4], speed: 0.95 },
] as const;

export function getStageParticles(level: number): StageParticleSpec {
  const idx = Math.min(Math.max(level, 1), 5);
  return STAGE_PARTICLES[idx]!;
}

/**
 * 풀스크린 단계 전환 모먼트 길이 (ms).
 * Lv.5 가 가장 길고 의식적, Lv.2 는 가볍게.
 */
export const MOMENT_DURATIONS: Readonly<Record<number, { total: number; reveal: number; confetti: number; hold: number }>> = {
  2: { total: 2800, reveal: 600, confetti: 800, hold: 1400 },
  3: { total: 3400, reveal: 700, confetti: 900, hold: 1800 },
  4: { total: 3800, reveal: 800, confetti: 1100, hold: 1900 },
  5: { total: 4400, reveal: 900, confetti: 1400, hold: 2100 },
};
