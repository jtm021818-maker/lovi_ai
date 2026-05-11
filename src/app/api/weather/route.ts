import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getWeatherWithCold } from '@/engines/temporal/weather-cache';
import { fetchWeather } from '@/engines/temporal/weather-client';
import { getRegionByCode, DEFAULT_REGION_CODE, KOREAN_REGIONS } from '@/engines/temporal/region-mapping';
import type { WeatherSnapshot } from '@/engines/temporal/temporal-context';

const VALID_CODES = new Set(KOREAN_REGIONS.map((r) => r.code));

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = req.nextUrl.searchParams.get('region_code') ?? DEFAULT_REGION_CODE;
  const regionCode = VALID_CODES.has(raw) ? raw : DEFAULT_REGION_CODE;
  const region = getRegionByCode(regionCode);

  // 1차: DB 캐시 경유 (weather_cache 테이블이 있고 데이터가 있으면 즉시 반환)
  let weather: WeatherSnapshot | undefined;
  try {
    weather = await getWeatherWithCold(supabase, regionCode);
  } catch {
    // DB 테이블 없거나 기타 에러 → 직접 fetch로 fallback
  }

  // 2차: 캐시 실패 시 Open-Meteo 직접 호출 (API 키 불필요)
  if (!weather) {
    weather = await fetchWeather({ lat: region.lat, lon: region.lon });
  }

  return NextResponse.json({
    region_code: region.code,
    region_name: region.name,
    weather: weather ?? null,
  });
}
