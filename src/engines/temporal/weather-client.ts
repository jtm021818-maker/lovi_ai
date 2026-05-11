/**
 * v115.2 Weather Client — 외부 날씨 API 래퍼.
 *
 * 우선순위:
 *   1. OWM_KEY 환경변수가 있으면 OpenWeatherMap 사용.
 *   2. OWM_KEY 없으면 Open-Meteo 사용 (완전 무료, API 키 불필요).
 *
 * 핵심 원칙:
 *   - 실패해도 에러 던지지 않음. undefined 반환 → LLM이 시간만으로 판단.
 *   - 2초 타임아웃. 채팅 응답 지연되면 스킵.
 *   - 인메모리 캐시 (10분) — 같은 좌표 짧은 시간 내 중복 호출 방지.
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
  /** OWM 전용 — 좌표 없을 때 도시명 fallback */
  city?: string;
  timeoutMs?: number;
}

/**
 * 좌표/도시 기반으로 현재 날씨 조회.
 *
 * @returns 성공 시 WeatherSnapshot, 실패/타임아웃 시 undefined
 */
export async function fetchWeather(params: FetchWeatherParams): Promise<WeatherSnapshot | undefined> {
  const { lat, lon, city, timeoutMs = 2000 } = params;
  if (!lat && !lon && !city) return undefined;

  const cacheKey = lat && lon ? `${lat.toFixed(2)},${lon.toFixed(2)}` : `city:${city}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const apiKey = process.env.OWM_KEY;
  const snap = apiKey
    ? await fetchFromOWM({ lat, lon, city, timeoutMs, apiKey })
    : await fetchFromOpenMeteo({ lat, lon, timeoutMs });

  if (!snap) return undefined;
  cache.set(cacheKey, { data: snap, expiresAt: Date.now() + CACHE_TTL_MS });
  return snap;
}

// ─── OpenWeatherMap ───────────────────────────────────────────

async function fetchFromOWM(params: {
  lat?: number; lon?: number; city?: string; timeoutMs: number; apiKey: string;
}): Promise<WeatherSnapshot | undefined> {
  const { lat, lon, city, timeoutMs, apiKey } = params;
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
    return {
      condition: mapOwmCondition(json.weather?.[0]?.main),
      description: json.weather?.[0]?.description,
      tempC: typeof json.main?.temp === 'number' ? Math.round(json.main.temp) : undefined,
      feelsLikeC: typeof json.main?.feels_like === 'number' ? Math.round(json.main.feels_like) : undefined,
    };
  } catch {
    return undefined;
  }
}

function mapOwmCondition(main?: string): string {
  if (!main) return '알 수 없음';
  const m = main.toLowerCase();
  if (m.includes('clear'))  return '맑음';
  if (m.includes('clouds')) return '흐림';
  if (m.includes('rain') || m.includes('drizzle')) return '비';
  if (m.includes('snow'))   return '눈';
  if (m.includes('thunder')) return '번개';
  if (m.includes('mist') || m.includes('fog') || m.includes('haze')) return '안개';
  if (m.includes('smoke') || m.includes('dust') || m.includes('sand')) return '미세먼지';
  return main;
}

// ─── Open-Meteo (keyless) ─────────────────────────────────────

async function fetchFromOpenMeteo(params: {
  lat?: number; lon?: number; timeoutMs: number;
}): Promise<WeatherSnapshot | undefined> {
  const { lat, lon, timeoutMs } = params;
  if (!lat || !lon) return undefined;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code` +
    `&timezone=Asia%2FSeoul`;

  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(url, { signal: ac.signal });
    clearTimeout(timer);
    if (!res.ok) return undefined;

    const json = await res.json();
    const cur = json.current;
    if (!cur) return undefined;

    const { condition, description } = mapWmoCode(cur.weather_code ?? 0);
    return {
      condition,
      description,
      tempC: typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : undefined,
      feelsLikeC: typeof cur.apparent_temperature === 'number' ? Math.round(cur.apparent_temperature) : undefined,
    };
  } catch {
    return undefined;
  }
}

/** WMO weather codes → 한국어 condition + description. */
function mapWmoCode(code: number): { condition: string; description: string } {
  if (code === 0)             return { condition: '맑음',  description: '하늘이 맑아요' };
  if (code === 1)             return { condition: '맑음',  description: '대체로 맑아요' };
  if (code === 2)             return { condition: '흐림',  description: '구름이 조금 있어요' };
  if (code === 3)             return { condition: '흐림',  description: '잔뜩 흐려요' };
  if (code === 45 || code === 48) return { condition: '안개', description: '안개가 껴있어요' };
  if (code >= 51 && code <= 55)  return { condition: '비',   description: '이슬비가 내려요' };
  if (code === 56 || code === 57) return { condition: '비',  description: '어는 이슬비가 내려요' };
  if (code === 61)            return { condition: '비',   description: '비가 조금 내려요' };
  if (code === 63)            return { condition: '비',   description: '비가 내려요' };
  if (code === 65)            return { condition: '비',   description: '비가 많이 와요' };
  if (code === 66 || code === 67) return { condition: '비', description: '어는 비가 내려요' };
  if (code === 71)            return { condition: '눈',   description: '눈이 조금 내려요' };
  if (code === 73)            return { condition: '눈',   description: '눈이 내려요' };
  if (code === 75)            return { condition: '눈',   description: '눈이 많이 내려요' };
  if (code === 77)            return { condition: '눈',   description: '싸락눈이 내려요' };
  if (code === 80)            return { condition: '비',   description: '소나기가 내려요' };
  if (code === 81)            return { condition: '비',   description: '제법 강한 소나기예요' };
  if (code === 82)            return { condition: '비',   description: '폭우가 쏟아져요' };
  if (code === 85 || code === 86) return { condition: '눈', description: '눈소나기가 내려요' };
  if (code === 95)            return { condition: '번개', description: '천둥번개가 쳐요' };
  if (code >= 96)             return { condition: '번개', description: '우박을 동반한 천둥번개예요' };
  return { condition: '알 수 없음', description: '' };
}
