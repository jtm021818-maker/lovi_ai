/**
 * v115.1 Weather Cache — 지역별 공유 캐시 + Stale-While-Revalidate.
 *
 * 핵심 원칙:
 *   - 매 채팅마다 OpenWeather 호출 X → DB cache read O
 *   - 17개 광역시도 단위로 캐싱 (시군구 X — 한도 초과)
 *   - 1시간 stale → 백그라운드 fetch (응답 지연 0)
 *   - 동일 region 동시 fetch lock (중복 호출 방지)
 *   - 24시간 초과 stale → undefined 반환 (LLM 시간만 사용)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { WeatherSnapshot } from './temporal-context';
import { fetchWeather } from './weather-client';
import { getRegionByCode } from './region-mapping';

/** stale 판정 기준 (분) — 60분 + 5분 grace */
const STALE_AFTER_MIN = 65;
/** 폐기 기준 (분) — 24시간 */
const EXPIRY_MIN = 60 * 24;

/** 동일 region 동시 fetch 방지 — 모듈 레벨 lock */
const refreshLocks = new Map<string, Promise<void>>();

interface WeatherCacheRow {
  region_code: string;
  region_name: string;
  lat: number;
  lon: number;
  condition: string | null;
  description: string | null;
  temp_c: number | null;
  feels_like_c: number | null;
  humidity_pct: number | null;
  fetched_at: string | null;
  fetch_status: string;
  fetch_error: string | null;
}

/**
 * 지역 코드로 날씨 read.
 *
 *   - cache hit (< 65분):  즉시 반환
 *   - stale (65분~24시간): stale 반환 + 백그라운드 갱신 (non-blocking)
 *   - expired (> 24시간):   undefined + 백그라운드 갱신
 *   - cold (없음):          undefined + 백그라운드 갱신 (다음 호출에서 hit)
 *
 * @returns WeatherSnapshot | undefined — 응답 항상 즉시 (fetch 안 기다림)
 */
export async function getWeatherForRegion(
  supabase: SupabaseClient,
  regionCode: string,
): Promise<WeatherSnapshot | undefined> {
  const { data, error } = await supabase
    .from('weather_cache')
    .select(
      'region_code, region_name, lat, lon, condition, description, temp_c, feels_like_c, humidity_pct, fetched_at, fetch_status, fetch_error',
    )
    .eq('region_code', regionCode)
    .maybeSingle<WeatherCacheRow>();

  if (error || !data) {
    // cold cache — 백그라운드 fetch (다음 호출 위해)
    void refreshWeatherForRegion(supabase, regionCode);
    return undefined;
  }

  const ageMin = data.fetched_at
    ? (Date.now() - new Date(data.fetched_at).getTime()) / 60000
    : Infinity;

  // stale → 백그라운드 갱신 트리거 (응답은 stale 데이터 그대로)
  if (ageMin > STALE_AFTER_MIN) {
    void refreshWeatherForRegion(supabase, regionCode);
  }

  // 폐기 기준 초과 → LLM에 잘못된 데이터 전달 방지
  if (ageMin > EXPIRY_MIN || !data.condition) return undefined;

  return {
    condition: data.condition,
    description: data.description ?? undefined,
    tempC: data.temp_c ?? undefined,
    feelsLikeC: data.feels_like_c ?? undefined,
  };
}

/**
 * Cold cache 대응 — 즉시 fetch 후 read 재시도 (1.5초 timeout 내).
 * 신규 region 첫 채팅에서 한 번만 호출됨.
 */
export async function getWeatherWithCold(
  supabase: SupabaseClient,
  regionCode: string,
): Promise<WeatherSnapshot | undefined> {
  const cached = await getWeatherForRegion(supabase, regionCode);
  if (cached) return cached;

  // cold cache: blocking fetch 1회만 시도
  await refreshWeatherForRegion(supabase, regionCode);
  return getWeatherForRegion(supabase, regionCode);
}

/**
 * 백그라운드 갱신 (non-blocking).
 * 동일 region 동시 호출 시 첫 호출만 실제 fetch, 나머지는 await 공유.
 */
export async function refreshWeatherForRegion(
  supabase: SupabaseClient,
  regionCode: string,
): Promise<void> {
  const existing = refreshLocks.get(regionCode);
  if (existing) return existing;

  const p = doFetch(supabase, regionCode).finally(() => {
    refreshLocks.delete(regionCode);
  });
  refreshLocks.set(regionCode, p);
  return p;
}

async function doFetch(supabase: SupabaseClient, regionCode: string): Promise<void> {
  const region = getRegionByCode(regionCode);
  const weather = await fetchWeather({ lat: region.lat, lon: region.lon });

  if (!weather) {
    // 실패 시 status만 업데이트 (fetched_at 유지 — 다음 stale 트리거 시 재시도)
    await supabase
      .from('weather_cache')
      .upsert(
        {
          region_code: region.code,
          region_name: region.name,
          lat: region.lat,
          lon: region.lon,
          fetch_status: 'error',
          fetch_error: 'fetch_failed_or_no_key',
        },
        { onConflict: 'region_code' },
      )
      .then(({ error }) => {
        if (error) console.warn('[weather-cache] error update fail', error.message);
      });
    return;
  }

  await supabase
    .from('weather_cache')
    .upsert(
      {
        region_code: region.code,
        region_name: region.name,
        lat: region.lat,
        lon: region.lon,
        condition: weather.condition,
        description: weather.description ?? null,
        temp_c: weather.tempC ?? null,
        feels_like_c: weather.feelsLikeC ?? null,
        humidity_pct: null, // weather-client 가 humidity 안 받으므로 미사용
        fetched_at: new Date().toISOString(),
        fetch_status: 'ok',
        fetch_error: null,
      },
      { onConflict: 'region_code' },
    )
    .then(({ error }) => {
      if (error) console.warn('[weather-cache] upsert fail', error.message);
    });
}
