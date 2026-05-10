-- v115.1 Weather Cache — 지역별 공유 캐시 (OpenWeather 1000회/일 한도 절약)
-- 2026-05-08
--
-- 핵심: 17개 광역시도 단위로 1시간마다 1회 호출 (총 408회/일).
-- Stale-while-revalidate 패턴 — 외부 cron 불필요.

-- ============================================================
-- 1. weather_cache — 지역별 날씨 캐시
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weather_cache (
  region_code   TEXT PRIMARY KEY,                  -- 'KR-11' (ISO 3166-2)
  region_name   TEXT NOT NULL,                     -- '서울특별시'
  lat           NUMERIC(8, 5) NOT NULL,
  lon           NUMERIC(8, 5) NOT NULL,
  -- 날씨 데이터
  condition     TEXT,                               -- '맑음' | '흐림' | '비' | ...
  description   TEXT,                               -- '약간의 구름' (한국어)
  temp_c        SMALLINT,
  feels_like_c  SMALLINT,
  humidity_pct  SMALLINT,
  -- 메타
  fetched_at    TIMESTAMPTZ,
  fetch_status  TEXT NOT NULL DEFAULT 'pending',   -- 'ok' | 'error' | 'pending' | 'quota_exceeded'
  fetch_error   TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_fetched_at ON public.weather_cache(fetched_at);

-- 모든 유저가 read 가능 (공개 데이터)
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weather_cache_read_all ON public.weather_cache;
CREATE POLICY weather_cache_read_all ON public.weather_cache
  FOR SELECT USING (true);

-- service_role 만 write (route.ts 가 service_role 키 사용 시)
DROP POLICY IF EXISTS weather_cache_write_service ON public.weather_cache;
CREATE POLICY weather_cache_write_service ON public.weather_cache
  FOR ALL USING (auth.role() = 'service_role');

-- 인증 유저도 write 가능 (cold start 캐시 채우기용 — anon key 환경 대응)
DROP POLICY IF EXISTS weather_cache_write_authenticated ON public.weather_cache;
CREATE POLICY weather_cache_write_authenticated ON public.weather_cache
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS weather_cache_update_authenticated ON public.weather_cache;
CREATE POLICY weather_cache_update_authenticated ON public.weather_cache
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 2. 17개 광역시도 시드 (좌표 포함, 첫 채팅이 cold-fetch 트리거)
-- ============================================================
INSERT INTO public.weather_cache (region_code, region_name, lat, lon, fetch_status) VALUES
  ('KR-11', '서울특별시',         37.5665, 126.9780, 'pending'),
  ('KR-26', '부산광역시',         35.1796, 129.0756, 'pending'),
  ('KR-27', '대구광역시',         35.8714, 128.6014, 'pending'),
  ('KR-28', '인천광역시',         37.4563, 126.7052, 'pending'),
  ('KR-29', '광주광역시',         35.1595, 126.8526, 'pending'),
  ('KR-30', '대전광역시',         36.3504, 127.3845, 'pending'),
  ('KR-31', '울산광역시',         35.5384, 129.3114, 'pending'),
  ('KR-50', '세종특별자치시',     36.4800, 127.2890, 'pending'),
  ('KR-41', '경기도',             37.4138, 127.5183, 'pending'),
  ('KR-42', '강원특별자치도',     37.8228, 128.1555, 'pending'),
  ('KR-43', '충청북도',           36.6357, 127.4912, 'pending'),
  ('KR-44', '충청남도',           36.6588, 126.6728, 'pending'),
  ('KR-45', '전북특별자치도',     35.8242, 127.1480, 'pending'),
  ('KR-46', '전라남도',           34.8161, 126.4630, 'pending'),
  ('KR-47', '경상북도',           36.5760, 128.5056, 'pending'),
  ('KR-48', '경상남도',           35.4606, 128.2132, 'pending'),
  ('KR-49', '제주특별자치도',     33.4996, 126.5312, 'pending')
ON CONFLICT (region_code) DO NOTHING;

-- ============================================================
-- 3. user_profiles.region_code — 유저 지역 (가입 시 수집)
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS region_code TEXT;

-- FK 제약 (weather_cache 삭제 방지)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_profiles_region_code_fkey'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_region_code_fkey
      FOREIGN KEY (region_code) REFERENCES public.weather_cache(region_code) ON DELETE SET NULL;
  END IF;
END $$;

-- 기존 유저 기본값: 서울 (가장 많을 거고 모르면 fallback)
UPDATE public.user_profiles SET region_code = 'KR-11' WHERE region_code IS NULL;

COMMENT ON COLUMN public.user_profiles.region_code IS
  'v115.1: 유저 거주/현재 지역 (ISO 3166-2). weather_cache 와 join 해서 시공간 동기화.';
