/**
 * v115.1 Korean Region Mapping — 17개 광역시도 + 좌표.
 *
 * OpenWeather API 호출의 단위. 시군구가 아닌 광역시도 단위로 캐싱하는 이유:
 *   - 강남↔마포 날씨 차이는 LLM 분위기 메타포에 무의미
 *   - 17개 × 1시간 = 408회/일 (무료 한도 1000의 41%)
 *
 * 좌표는 각 광역시도의 대표지점 (도청/시청 또는 대표 도시).
 */

export interface KoreanRegion {
  /** ISO 3166-2 region code (KR-11 = 서울) */
  code: string;
  /** 한국어 정식 명칭 */
  name: string;
  /** 짧은 표시명 (UI 드롭다운용) */
  shortName: string;
  /** 대표지점 위도 */
  lat: number;
  /** 대표지점 경도 */
  lon: number;
}

export const KOREAN_REGIONS: KoreanRegion[] = [
  { code: 'KR-11', name: '서울특별시',         shortName: '서울',     lat: 37.5665, lon: 126.9780 },
  { code: 'KR-26', name: '부산광역시',         shortName: '부산',     lat: 35.1796, lon: 129.0756 },
  { code: 'KR-27', name: '대구광역시',         shortName: '대구',     lat: 35.8714, lon: 128.6014 },
  { code: 'KR-28', name: '인천광역시',         shortName: '인천',     lat: 37.4563, lon: 126.7052 },
  { code: 'KR-29', name: '광주광역시',         shortName: '광주',     lat: 35.1595, lon: 126.8526 },
  { code: 'KR-30', name: '대전광역시',         shortName: '대전',     lat: 36.3504, lon: 127.3845 },
  { code: 'KR-31', name: '울산광역시',         shortName: '울산',     lat: 35.5384, lon: 129.3114 },
  { code: 'KR-50', name: '세종특별자치시',     shortName: '세종',     lat: 36.4800, lon: 127.2890 },
  { code: 'KR-41', name: '경기도',             shortName: '경기',     lat: 37.4138, lon: 127.5183 },
  { code: 'KR-42', name: '강원특별자치도',     shortName: '강원',     lat: 37.8228, lon: 128.1555 },
  { code: 'KR-43', name: '충청북도',           shortName: '충북',     lat: 36.6357, lon: 127.4912 },
  { code: 'KR-44', name: '충청남도',           shortName: '충남',     lat: 36.6588, lon: 126.6728 },
  { code: 'KR-45', name: '전북특별자치도',     shortName: '전북',     lat: 35.8242, lon: 127.1480 },
  { code: 'KR-46', name: '전라남도',           shortName: '전남',     lat: 34.8161, lon: 126.4630 },
  { code: 'KR-47', name: '경상북도',           shortName: '경북',     lat: 36.5760, lon: 128.5056 },
  { code: 'KR-48', name: '경상남도',           shortName: '경남',     lat: 35.4606, lon: 128.2132 },
  { code: 'KR-49', name: '제주특별자치도',     shortName: '제주',     lat: 33.4996, lon: 126.5312 },
];

export const DEFAULT_REGION_CODE = 'KR-11'; // 서울 fallback

const REGION_BY_CODE: Record<string, KoreanRegion> = Object.fromEntries(
  KOREAN_REGIONS.map((r) => [r.code, r]),
);

export function getRegionByCode(code: string | null | undefined): KoreanRegion {
  if (code && REGION_BY_CODE[code]) return REGION_BY_CODE[code];
  return REGION_BY_CODE[DEFAULT_REGION_CODE];
}

/**
 * Vercel `req.geo.region` (ISO-3166-2 형식) 또는 timezone 기반 추정.
 * 실패 시 DEFAULT_REGION_CODE 반환.
 */
export function inferRegionFromHints(hints: {
  vercelGeoRegion?: string | null;
  timezone?: string | null;
}): string {
  // Vercel은 'KR-11' 형식으로 ISO 코드 직접 제공
  if (hints.vercelGeoRegion && REGION_BY_CODE[hints.vercelGeoRegion]) {
    return hints.vercelGeoRegion;
  }
  // timezone 'Asia/Seoul' = 한국 → 서울 fallback
  if (hints.timezone === 'Asia/Seoul') return DEFAULT_REGION_CODE;
  return DEFAULT_REGION_CODE;
}
