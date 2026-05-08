/**
 * v115 Weather Client — 외부 날씨 API 래퍼.
 *
 * 핵심 원칙:
 *   - 실패해도 에러 던지지 않음. undefined 반환 → LLM이 시간만으로 판단.
 *   - 1.5초 타임아웃. 채팅 응답 지연되면 스킵.
 *   - 캐시 (10분) — 같은 좌표 짧은 시간 내 중복 호출 방지.
 *
 * 환경변수:
 *   OWM_KEY — OpenWeatherMap API key (없으면 모든 호출 즉시 undefined)
 */

import type { WeatherSnapshot } from './temporal-context';

interface CacheEntry {
  data: WeatherSnapshot;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export interface FetchWeatherParams {
  lat?: number;
  lon?: number;
  /** 좌표 없을 때 도시명 fallback (예: 'Seoul') */
  city?: string;
  timeoutMs?: number;
}

/**
 * 좌표/도시 기반으로 현재 날씨 조회.
 *
 * @returns 성공 시 WeatherSnapshot, 실패/키없음/타임아웃 시 undefined
 */
export async function fetchWeather(params: FetchWeatherParams): Promise<WeatherSnapshot | undefined> {
  const apiKey = process.env.OWM_KEY;
  if (!apiKey) return undefined;

  const { lat, lon, city, timeoutMs = 1500 } = params;
  if (!lat && !lon && !city) return undefined;

  const cacheKey = lat && lon ? `${lat.toFixed(2)},${lon.toFixed(2)}` : `city:${city}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const url = lat && lon
    ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`
    : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city!)}&appid=${apiKey}&units=metric&lang=kr`;

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(url, { signal: ac.signal });
    clearTimeout(timer);
    if (!res.ok) return undefined;

    const json = await res.json();
    const snap: WeatherSnapshot = {
      condition: mapCondition(json.weather?.[0]?.main),
      description: json.weather?.[0]?.description,
      tempC: typeof json.main?.temp === 'number' ? Math.round(json.main.temp) : undefined,
      feelsLikeC: typeof json.main?.feels_like === 'number' ? Math.round(json.main.feels_like) : undefined,
    };

    cache.set(cacheKey, { data: snap, expiresAt: Date.now() + CACHE_TTL_MS });
    return snap;
  } catch {
    return undefined;
  }
}

/** OpenWeatherMap 영문 condition → 한국어 raw 라벨. */
function mapCondition(main?: string): string {
  if (!main) return '알 수 없음';
  const m = main.toLowerCase();
  if (m.includes('clear')) return '맑음';
  if (m.includes('clouds')) return '흐림';
  if (m.includes('rain') || m.includes('drizzle')) return '비';
  if (m.includes('snow')) return '눈';
  if (m.includes('thunder')) return '번개';
  if (m.includes('mist') || m.includes('fog') || m.includes('haze')) return '안개';
  if (m.includes('smoke') || m.includes('dust') || m.includes('sand')) return '미세먼지';
  return main;
}
