/**
 * 🎲 시드 기반 결정론적 랜덤
 * 같은 시드 + 같은 입력 = 항상 같은 결과
 * API 호출 0회로 이벤트/스토리/감정을 결정
 */

/** 문자열 → 정수 해시 */
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit 정수 변환
  }
  return Math.abs(hash);
}

/** 시드 + 오프셋 → 0~1 결정론적 랜덤 */
export function seededRandom(seed: number, offset: number): number {
  const x = Math.sin(seed * 9301 + offset * 49297 + 233280) * 49297;
  return x - Math.floor(x);
}

/** 시드 기반으로 배열에서 1개 선택 */
export function seededPick<T>(arr: T[], seed: number, offset: number): T {
  const idx = Math.floor(seededRandom(seed, offset) * arr.length);
  return arr[idx];
}

/** 시드 기반으로 확률 체크 (0~1) */
export function seededChance(seed: number, offset: number, probability: number): boolean {
  return seededRandom(seed, offset) < probability;
}

/** 오늘 날짜 → 시드 */
export function todaySeed(userId?: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return hashCode(`${userId ?? 'default'}-${today}`);
}
