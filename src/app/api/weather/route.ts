import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getWeatherWithCold } from '@/engines/temporal/weather-cache';
import { getRegionByCode, DEFAULT_REGION_CODE, KOREAN_REGIONS } from '@/engines/temporal/region-mapping';

const VALID_CODES = new Set(KOREAN_REGIONS.map((r) => r.code));

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = req.nextUrl.searchParams.get('region_code') ?? DEFAULT_REGION_CODE;
  const regionCode = VALID_CODES.has(raw) ? raw : DEFAULT_REGION_CODE;
  const region = getRegionByCode(regionCode);

  const weather = await getWeatherWithCold(supabase, regionCode);

  return NextResponse.json({
    region_code: region.code,
    region_name: region.name,
    weather: weather ?? null,
  });
}
