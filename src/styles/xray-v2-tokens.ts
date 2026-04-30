/**
 * X-Ray v2 디자인 토큰
 * Plan: docs/xray-v2-pro-plan.md §5.1
 *
 * 컬러 톤: 심야 응급실 의료 진단 패널 + Z세대 카톡 미감
 * 베이스 다크 + 네온 시안/자홍 강조.
 */

export const XV2 = {
  // 베이스
  bg:        '#0A0E27',
  bgGrad:    'linear-gradient(180deg, #0A0E27 0%, #0E1339 50%, #0A0E27 100%)',
  surface:   '#11173B',
  surface2:  '#1A2050',
  border:    'rgba(0, 240, 255, 0.18)',
  borderSoft:'rgba(255, 255, 255, 0.08)',
  glow:      '0 0 32px rgba(0, 240, 255, 0.35)',
  glowSoft:  '0 0 16px rgba(0, 240, 255, 0.20)',
  glowMagenta: '0 0 24px rgba(255, 61, 127, 0.40)',

  // 텍스트
  text:      '#E8EBFF',
  textDim:   '#9AA3D4',
  textMute:  '#6068A0',

  // 강조 (의미 매핑)
  cyan:      '#00F0FF',  // 사용자 / 긍정 / 스캔 라인
  magenta:   '#FF3D7F',  // 상대 / 위험 / 갈등
  amber:     '#FFC940',  // 경고 / 톤 시프트
  green:     '#3DFFB8',  // 안전 / 안정형
  blue:      '#5AA9FF',  // 차가움 / 회피형
  purple:    '#B388FF',  // 루나 / 심리 / 진단

  // 위험 레벨 매핑 (메시지)
  riskGreen: '#3DFFB8',
  riskAmber: '#FFC940',
  riskRed:   '#FF3D7F',
  riskBlue:  '#5AA9FF',

  // 애착 스타일 매핑
  attachment: {
    secure:       '#3DFFB8',
    anxious:      '#FFC940',
    avoidant:     '#5AA9FF',
    disorganized: '#FF3D7F',
  } as const,

  // 글래스
  glassBg:   'rgba(17, 23, 59, 0.55)',
  glassBlur: 'blur(20px) saturate(140%)',

  // 폰트
  fontMono:  '"JetBrains Mono", ui-monospace, monospace',
  fontSans:  'Pretendard, system-ui, sans-serif',
} as const;

export type XV2Token = typeof XV2;

// 위험 레벨 → 컬러
export function riskColor(risk: 'safe' | 'caution' | 'conflict' | 'cold'): string {
  switch (risk) {
    case 'safe':     return XV2.riskGreen;
    case 'caution':  return XV2.riskAmber;
    case 'conflict': return XV2.riskRed;
    case 'cold':     return XV2.riskBlue;
  }
}

// temperature(-100~+100) → 컬러 그라데
// 차가움(blue) → 중립(purple) → 따뜻함(magenta)
export function temperatureColor(t: number): string {
  const clamped = Math.max(-100, Math.min(100, t));
  if (clamped < -33) return XV2.blue;
  if (clamped <  33) return XV2.purple;
  return XV2.magenta;
}

// 애착 스타일 → 라벨
export const ATTACHMENT_LABELS = {
  secure:       { ko: '안정형',   icon: '⚖️', tagline: '신호가 차분하고 일관돼' },
  anxious:      { ko: '불안형',   icon: '🌀', tagline: '연결을 갈망하는 신호' },
  avoidant:     { ko: '회피형',   icon: '🚪', tagline: '거리를 두는 신호' },
  disorganized: { ko: '혼란형',   icon: '⚡', tagline: '오락가락하는 신호' },
} as const;

// 관계 단계 → 라벨
export const RELATIONSHIP_STAGE_LABELS = {
  early_dating: { ko: '초기 데이트',   tone: 'cyan'    },
  committed:    { ko: '안정기',        tone: 'green'   },
  crisis:       { ko: '위기',          tone: 'magenta' },
  recovery:     { ko: '회복기',        tone: 'amber'   },
  postbreakup:  { ko: '이별 이후',     tone: 'blue'    },
} as const;
