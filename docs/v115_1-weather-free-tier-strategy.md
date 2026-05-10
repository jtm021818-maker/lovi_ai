# v115.1 OpenWeather 무료 한도 전략 — 지역 캐시 공유 아키텍처

> **작성일**: 2026-05-08
> **버전**: v115.1
> **상태**: 계획 (구현 전)
> **읽는 사람**: AI 바이브코딩 워커
> **선행**: v115 시공간 동기화 (`docs/v115-humanization-plan.md`)

---

## 0. Executive Summary

### 문제
v115에서 시공간 동기화를 도입하면서 OpenWeather API를 매 채팅마다 호출하면 무료 한도(1,000회/일)를 즉시 초과해 자동 과금됨.

### 해결
**유저별 호출 X → 지역별 공유 캐시 O.** 한국 17개 광역시도 단위로 1시간마다 1회 호출, DB 캐시. 모든 유저는 자기 지역 캐시를 read.

### 핵심 수치
- 17개 광역시도 × 24시간 = **하루 408회 호출** (무료 한도의 41%)
- 안전 버퍼 59% — 재시도, 디버깅, 향후 시군구 확장 여유
- 0원 운영, 무한 유저 확장 가능

### 작업 범위
- **신규 파일 4개**: weather-cache, region-mapping, weather-cron, region-selector
- **수정 파일 3개**: weather-client (stale-while-revalidate), route.ts, signup flow
- **DB 신규 테이블 2개**: `weather_cache`, `user_profiles.region` 컬럼
- **외부 인프라 0개**: cron 없이 stale-while-revalidate로 자동 갱신

---

## 1. 문제 — 왜 단순 호출은 안 되는가

### 1.1 트래픽 시뮬레이션
```
가정: 일일 활성 유저 100명, 평균 세션당 20턴
→ 일일 채팅 턴: 100 × 20 = 2,000회
→ OpenWeather 호출: 2,000회/일 (캐싱 없을 때)
→ 무료 한도 초과: 1,000회 ✗ (200% 초과)
→ 자동 과금: 초과 1,000회 × $0.0015 = $1.5/일 = $45/월
```

100명 활성 유저로도 월 $45 과금. 1,000명이면 월 $450. **유저당 호출은 절대 불가**.

### 1.2 분당 한도 (60회/분)
```
가정: 동시 접속 100명, 동시 메시지 전송 10명
→ 1초 내 10회 호출 = 600회/분 환산
→ 60/분 한도 즉시 차단 (HTTP 429 Too Many Requests)
→ 채팅 응답 실패 → UX 파괴
```

**유저당 호출은 한도 자체가 비현실적**.

### 1.3 캐싱 안 하는 또 다른 이유
- OpenWeather 데이터는 분 단위로 거의 안 바뀜 (시간 단위 변화가 normal)
- 같은 지역 100명이 같은 1분에 채팅하면 100번의 동일한 응답을 받음 (낭비)
- API 호출 latency (~200~500ms)가 매 채팅 응답에 추가됨 → 응답 느려짐

### 결론: 지역 단위로 공유 캐시 필수

---

## 2. OpenWeather 무료 한도 분석 (2026-05 기준)

### 2.1 공식 한도
출처: https://openweathermap.org/price (2026-05 확인)

| 항목 | 한도 |
|------|------|
| 일일 호출 | 1,000회 |
| 분당 호출 | 60회 |
| 월간 호출 | 1,000,000회 |
| 초과 과금 | 자동 (월말 결제) |

### 2.2 사용 가능 엔드포인트 (Free)
- `GET /data/2.5/weather` — Current weather (우리 사용)
- `GET /data/2.5/forecast` — 5-day / 3-hour forecast
- `GET /geo/1.0/direct` — Geocoding

### 2.3 v115.1 호출 예산
```
일일 한도: 1,000회
필요 호출 (17 광역시도 × 24시간):    408회 (40.8%)
재시도 버퍼 (실패 1회당 즉시 retry):  +50회 (5.0%)
운영 버퍼 (디버깅, 수동 호출):         +50회 (5.0%)
향후 확장 여유 (시군구 추가 시):       +492회 (49.2%)
```

**408회는 안전 마진**. 시군구 단위(228개)로 확장해도 24시간이 아닌 6시간 주기면 228 × 4 = 912회 → 한도 안에 들어감.

---

## 3. 해결 전략 — 지역 캐시 공유

### 3.1 핵심 아이디어
```
[기존 v115 설계 — 위험]
유저 A 채팅 → /api/chat/stream → fetchWeather(서울 좌표) → OpenWeather 호출
유저 B 채팅 → /api/chat/stream → fetchWeather(서울 좌표) → OpenWeather 호출 (중복!)
→ 같은 지역 N명이면 N배 호출

[v115.1 설계 — 안전]
유저 A 채팅 → /api/chat/stream → readWeatherCache('서울특별시') → DB cache 반환
유저 B 채팅 → /api/chat/stream → readWeatherCache('서울특별시') → DB cache 반환 (호출 X)
→ 같은 지역은 1번만 호출 (1시간마다 갱신)
```

### 3.2 데이터 흐름
```
┌─────────────────────────────────────────┐
│ 백그라운드: 시간당 1회 자동 갱신         │
│  refreshWeatherCache()                   │
│   → 17개 광역시도 순회                   │
│   → OpenWeather API 호출                 │
│   → weather_cache 테이블 UPSERT          │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ 채팅 (유저 N명, 매 턴)                   │
│  /api/chat/stream                        │
│   → user_profiles.region 조회             │
│   → weather_cache WHERE region=X 조회     │
│   → buildTemporalContext({weather})      │
│   → ACE prompt → LLM                     │
│  ※ OpenWeather 호출 없음                 │
└─────────────────────────────────────────┘
```

### 3.3 갱신 주기 결정

| 주기 | 일일 호출 | UX 영향 |
|------|----------|---------|
| 30분 | 17 × 48 = 816회 | 너무 잦음, 한도 위험 |
| **1시간** ✅ | 17 × 24 = 408회 | 적정 (날씨 정상 변동) |
| 2시간 | 17 × 12 = 204회 | 매우 안전 |
| 3시간 | 17 × 8 = 136회 | 보수적, 날씨 변동 놓침 |

**1시간 권장.** 한국 날씨 변동성(특히 여름 소나기) 고려.

---

## 4. 한국 행정구역 매핑

### 4.1 광역시도 17개 (Primary 단위)
| 코드 | 이름 | 좌표 (대표지점) |
|------|------|----------------|
| KR-11 | 서울특별시 | 37.5665, 126.9780 |
| KR-26 | 부산광역시 | 35.1796, 129.0756 |
| KR-27 | 대구광역시 | 35.8714, 128.6014 |
| KR-28 | 인천광역시 | 37.4563, 126.7052 |
| KR-29 | 광주광역시 | 35.1595, 126.8526 |
| KR-30 | 대전광역시 | 36.3504, 127.3845 |
| KR-31 | 울산광역시 | 35.5384, 129.3114 |
| KR-50 | 세종특별자치시 | 36.4800, 127.2890 |
| KR-41 | 경기도 | 37.4138, 127.5183 (수원) |
| KR-42 | 강원특별자치도 | 37.8228, 128.1555 (춘천) |
| KR-43 | 충청북도 | 36.6357, 127.4912 (청주) |
| KR-44 | 충청남도 | 36.6588, 126.6728 (홍성) |
| KR-45 | 전북특별자치도 | 35.8242, 127.1480 (전주) |
| KR-46 | 전라남도 | 34.8161, 126.4630 (무안) |
| KR-47 | 경상북도 | 36.5760, 128.5056 (안동) |
| KR-48 | 경상남도 | 35.4606, 128.2132 (창원) |
| KR-49 | 제주특별자치도 | 33.4996, 126.5312 |

### 4.2 왜 광역시도 단위인가
- 1시간 단위 갱신에서 서울/경기 차이는 의미 있음 (서울 비, 경기 흐림 등)
- 그러나 강남/마포 차이는 의미 없음 (둘 다 같은 분위기)
- 따라서 시군구는 과잉, 광역시도가 sweet spot

### 4.3 향후 확장 (Phase 2)
필요 시 7대 특별/광역시는 시군구 단위로 분할:
- 서울 25개 자치구 → 25개 row 추가
- 부산 16개 자치구 → 16개 row 추가
- 합산: 17 + 41(7대 도시 시군구) = 58개 row × 1시간 = 1,392회/일 → 2시간 주기로 696회/일

---

## 5. 데이터베이스 스키마

### 5.1 `weather_cache` 테이블 (신규)
```sql
CREATE TABLE public.weather_cache (
  region_code   TEXT PRIMARY KEY,           -- 'KR-11' (광역시도 ISO)
  region_name   TEXT NOT NULL,              -- '서울특별시'
  lat           NUMERIC(8, 5) NOT NULL,
  lon           NUMERIC(8, 5) NOT NULL,
  -- 날씨 데이터
  condition     TEXT,                        -- '맑음' | '흐림' | '비' | ...
  description   TEXT,                        -- '약간의 구름' (한국어)
  temp_c        SMALLINT,                    -- 섭씨
  feels_like_c  SMALLINT,
  humidity_pct  SMALLINT,                    -- 습도 (분위기 메타포용)
  -- 메타
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetch_status  TEXT NOT NULL DEFAULT 'ok',  -- 'ok' | 'stale' | 'error'
  fetch_error   TEXT
);

CREATE INDEX idx_weather_fetched_at ON public.weather_cache(fetched_at);

-- 모든 유저가 read 가능 (RLS 없음 — 공개 데이터)
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY weather_cache_read_all ON public.weather_cache FOR SELECT USING (true);
-- service_role 만 write
CREATE POLICY weather_cache_write_service ON public.weather_cache FOR ALL USING (auth.role() = 'service_role');
```

### 5.2 `user_profiles.region` 컬럼 (확장)
```sql
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS region_code TEXT REFERENCES public.weather_cache(region_code);

-- 기본값: 서울 (가장 많을 거고 IP geo도 안 되면 fallback)
UPDATE public.user_profiles SET region_code = 'KR-11' WHERE region_code IS NULL;
```

### 5.3 마이그레이션 시드 데이터
17개 광역시도 row를 INSERT (좌표 포함, fetched_at NULL).
첫 cron 실행 시 모두 fetch.

---

## 6. 캐시 갱신 메커니즘 — 3가지 옵션 비교

### 옵션 A: Vercel Cron (Pro 플랜만)
```
장점: 공식 지원, 안정적
단점: Hobby 플랜은 daily만 — 시간당 호출 불가
비용: Pro $20/월 추가 발생
```

### 옵션 B: Supabase pg_cron + Edge Function
```
장점: Supabase 무료 플랜 포함
       SQL로 직접 스케줄링
단점: Edge Function 매 시 호출 = 720회/월 (무료 500K calls 안에 들어감)
        설정 복잡 (확장 활성화 필요)
비용: 0원
```

### 옵션 C (권장): Stale-While-Revalidate
```
원리: 채팅이 cache 읽을 때 fetched_at 체크
      → < 1시간: 그대로 반환
      → >= 1시간: 즉시 stale 반환 + 백그라운드에서 fetch (non-blocking)

장점: 외부 인프라 0개 (Supabase pg_cron, Vercel cron 모두 X)
       유저 트래픽이 자연스럽게 갱신 트리거
       응답 지연 없음 (백그라운드 fetch)
단점: 새벽 트래픽 0이면 갱신 X (다음 첫 트래픽까지 stale)
       동시 fetch 2명 발생 시 중복 호출 (분당 60회 한도 안에 있어 무해)

비용: 0원
```

### 결정: 옵션 C (Stale-While-Revalidate)

이유:
1. 외부 인프라 의존 0
2. 무한 유저 확장 가능
3. 새벽 stale 문제는 사용자 체감 X (어차피 동시 시간대니 분위기 동일)

---

## 7. Stale-While-Revalidate 상세 설계

### 7.1 read 함수
```typescript
async function getWeatherForRegion(
  supabase: SupabaseClient,
  regionCode: string,
): Promise<WeatherSnapshot | undefined> {
  const { data } = await supabase
    .from('weather_cache')
    .select('condition, description, temp_c, feels_like_c, fetched_at')
    .eq('region_code', regionCode)
    .maybeSingle();

  if (!data) return undefined;

  const ageMin = (Date.now() - new Date(data.fetched_at).getTime()) / 60000;

  // stale 판정: 65분 (60분 + 5분 grace)
  if (ageMin > 65) {
    // 백그라운드 갱신 (non-blocking, 응답 지연 X)
    void refreshWeatherForRegion(supabase, regionCode);
  }

  // 너무 오래되면 (24시간) 폐기 — LLM에 잘못된 정보 전달 방지
  if (ageMin > 60 * 24) return undefined;

  return {
    condition: data.condition,
    description: data.description,
    tempC: data.temp_c,
    feelsLikeC: data.feels_like_c,
  };
}
```

### 7.2 백그라운드 갱신
```typescript
const refreshLocks = new Map<string, Promise<void>>();

async function refreshWeatherForRegion(
  supabase: SupabaseClient,
  regionCode: string,
): Promise<void> {
  // 동일 region 중복 fetch 방지 (in-flight lock)
  if (refreshLocks.has(regionCode)) return refreshLocks.get(regionCode);

  const p = doFetch(supabase, regionCode).finally(() => {
    refreshLocks.delete(regionCode);
  });
  refreshLocks.set(regionCode, p);
  return p;
}

async function doFetch(supabase: SupabaseClient, regionCode: string) {
  const region = REGION_BY_CODE[regionCode];
  if (!region) return;

  const weather = await fetchFromOpenWeather(region.lat, region.lon);
  if (!weather) {
    // 실패 시 에러 기록만, fetched_at 갱신 X (재시도 가능 상태 유지)
    await supabase.from('weather_cache').update({
      fetch_status: 'error',
      fetch_error: 'fetch failed',
    }).eq('region_code', regionCode);
    return;
  }

  await supabase.from('weather_cache').upsert({
    region_code: regionCode,
    region_name: region.name,
    lat: region.lat,
    lon: region.lon,
    condition: weather.condition,
    description: weather.description,
    temp_c: weather.tempC,
    feels_like_c: weather.feelsLikeC,
    humidity_pct: weather.humidity,
    fetched_at: new Date().toISOString(),
    fetch_status: 'ok',
    fetch_error: null,
  });
}
```

### 7.3 첫 채팅 fallback
- 신규 유저가 처음 채팅 → 그 지역 cache 비어있을 수 있음
- 비어있으면 즉시 fetch 시도 (한 번만, blocking 1.5초)
- 실패 시 weather=undefined → LLM은 시간만 사용

```typescript
async function getWeatherWithCold(supabase, regionCode) {
  const cached = await getWeatherForRegion(supabase, regionCode);
  if (cached) return cached;

  // cold cache: 즉시 fetch (1.5초 timeout)
  await refreshWeatherForRegion(supabase, regionCode);
  return getWeatherForRegion(supabase, regionCode);
}
```

---

## 8. 유저 프로필 — 지역 수집

### 8.1 어디서 받을까

**옵션 A: 신규 가입 시 필수**
- 장점: 100% 정확
- 단점: 가입 friction 증가

**옵션 B (권장): 가입 직후 onboarding에서 받기**
- 첫 채팅 진입 전 1회 question
- 기본값 '서울특별시', 변경 가능
- 설정 페이지에서 언제든 수정

**옵션 C: IP geolocation 자동 추정**
- Vercel `req.geo.region` 활용 (무료)
- 한국 IP면 시도 추정 가능
- 정확도 80% (모바일 IP는 부정확)
- + B 조합: 자동 추정 후 유저가 확인/수정

### 8.2 구현
```typescript
// onboarding 단계
<RegionSelector
  defaultValue={geoEstimate ?? 'KR-11'}
  onSelect={(code) => updateProfile({ region_code: code })}
/>
```

지역 선택 컴포넌트:
- 17개 광역시도 dropdown
- 라벨: "지금 어디에 있어?" (친근한 톤)
- 도움말: "루나가 같은 시간대·날씨를 공유한 듯 자연스럽게 대화해요"

### 8.3 변경 가능성
- 출장/여행으로 지역 바뀔 수 있음 → 설정에서 변경
- 기기 timezone 자동 감지로 region 추천 (e.g. KST면 한국)
- 향후: GPS 권한 받으면 자동 갱신 (선택사항)

---

## 9. 읽기 경로 — chat/stream 통합

### 9.1 v115에 어떻게 끼어드는가

기존 v115 route.ts:
```typescript
temporalContext: buildTemporalContext({
  clientNowISO,
  timezone: clientTimezone,
  weather: clientWeather,  // ← 클라이언트가 보낸 날씨 (현재 미사용)
  lastSessionEndedAt: sessionData.last_message_at,
}),
```

v115.1로 변경:
```typescript
// 1. user_profiles 에서 region 조회 (병렬 로드에 추가)
const { data: profile } = await supabase
  .from('user_profiles')
  .select('region_code')
  .eq('id', user.id)
  .single();

// 2. weather_cache 에서 read (stale-while-revalidate)
const weather = await getWeatherWithCold(supabase, profile?.region_code ?? 'KR-11');

// 3. temporalContext 에 주입
temporalContext: buildTemporalContext({
  clientNowISO,
  timezone: clientTimezone,
  weather,  // ← cache에서 읽은 데이터
  lastSessionEndedAt: sessionData.last_message_at,
}),
```

### 9.2 latency 영향
- weather_cache SELECT: ~5ms (인덱스 PK)
- 백그라운드 fetch는 응답 지연 X
- 콜드 cache 첫 호출: +1.5초 (1회만, 이후 cache hit)

### 9.3 기존 v115 weather-client.ts 처리
- 기존 직접 OpenWeather 호출 함수는 유지 (cache 갱신용)
- 채팅 path에서는 호출 X
- export로 weather-cache.ts 내부 사용만

---

## 10. 장애 대응

### 10.1 OpenWeather API 다운
- fetch 실패 → cache.fetch_status='error' 기록
- 다음 stale 트리거 시 재시도
- 채팅 read는 stale 데이터 계속 반환 (24시간까지)
- 24시간 초과 시 weather=undefined → LLM 시간만 사용 (graceful)

### 10.2 일일 한도 초과 (만일의 사고)
- HTTP 429 감지 → fetch_status='quota_exceeded'
- 다음날 자정까지 fetch 시도 X
- 모든 cache stale → 24h 후 weather=undefined
- 알림: console.error + Sentry/Discord webhook

### 10.3 분당 한도 (60회/분)
- in-flight lock으로 동시 fetch 방지
- 17개 region 순차 fetch 시 17초 (1초 간격) — 60/분 안에 안전

### 10.4 신규 region 추가 (시군구 확장)
- INSERT into weather_cache (region_code, name, lat, lon)
- fetched_at NULL → 첫 채팅 시 cold fetch 트리거

### 10.5 모니터링
```typescript
// 일일 호출 카운터 (Redis 또는 Supabase RPC)
async function trackOpenWeatherCall() {
  const today = new Date().toISOString().slice(0, 10);
  await supabase.rpc('increment_weather_call', { date: today });
}

// 800회 도달 시 경고 (한도 80%)
// 1000회 도달 시 차단 (cache only)
```

---

## 11. 구현 로드맵

### Phase 1 — Foundation (1일)
- [ ] DB migration: `weather_cache` 테이블 + 17개 region seed
- [ ] DB migration: `user_profiles.region_code` 컬럼
- [ ] `engines/temporal/region-mapping.ts` — 17개 region 상수 + 좌표
- [ ] `engines/temporal/weather-cache.ts` — read + stale-while-revalidate
- [ ] `engines/temporal/weather-client.ts` 리팩터 — fetchFromOpenWeather export

### Phase 2 — Integration (4시간)
- [ ] `app/api/chat/stream/route.ts` — region 조회 + cache read 통합
- [ ] 기존 v115의 client weather 코드 제거 (cache로 대체)
- [ ] 콜드 fetch lock 메커니즘 검증

### Phase 3 — UX (3시간)
- [ ] `components/onboarding/RegionSelector.tsx` — 광역시도 선택 UI
- [ ] 설정 페이지에 지역 변경 추가
- [ ] IP geolocation fallback (`req.geo.region`)

### Phase 4 — 모니터링 (2시간)
- [ ] OpenWeather 호출 카운터 RPC
- [ ] 800회 임계 console.warn
- [ ] Discord webhook 알림 (선택)

### Phase 5 — 검증 (1일)
- [ ] 17개 region 모두 fetch 성공 확인
- [ ] 동일 region 동시 채팅 시 호출 1번만 확인
- [ ] 1시간 후 자동 갱신 확인
- [ ] OpenWeather 일일 호출 수 < 500 확인

---

## 12. 안티패턴 — 절대 피해야 할 것

| ❌ 안티패턴 | 왜 안 되는가 | ✅ 대안 |
|---|---|---|
| 매 채팅마다 OpenWeather 호출 | 1,000회/일 즉시 초과 | 지역 단위 캐시 |
| 좌표 단위 캐싱 (lat,lon 키) | 같은 동네인데 키 다르면 중복 호출 | region_code 단위 |
| 동기 fetch (blocking) | 응답 지연 +500ms | stale-while-revalidate |
| Vercel Hobby cron | daily만 지원 | stale-while-revalidate |
| API 실패 시 채팅 차단 | UX 파괴 | weather=undefined → 시간만 사용 |
| 시군구 단위로 캐싱 | 226개 × 24 = 5,424회/일 (한도 초과) | 광역시도 17개 단위 |
| OpenWeather 직접 호출 path 노출 | 키 도용/quota 폭주 위험 | server-only 라우트 + 이미 server에서만 호출 |

---

## 13. 측정 지표 (성공 판정)

### 13.1 정량
| 지표 | 목표 |
|------|------|
| 일일 OpenWeather 호출 | < 500회 (한도의 50% 이하) |
| 평균 cache hit rate | > 99% |
| 평균 cache age | < 30분 |
| Cold start fetch 빈도 | < 5%/일 |
| 채팅 latency 영향 | +10ms 이하 |

### 13.2 정성
- LLM이 날씨 적절히 활용 (세션당 0~1회 자연 언급)
- 유저 프로필에 region 입력 비율 > 80%
- 지역 변경 사용 빈도 측정 (출장/여행)

---

## 14. 결론

OpenWeather 무료 한도 1,000회/일은 단순 호출로는 100명만 넘어도 초과한다.
**지역 단위 공유 캐시 + stale-while-revalidate 패턴**으로 0원에 무한 확장 가능.

핵심 트릭:
- 17개 region × 1시간 = 408회/일 (한도의 41%)
- 외부 cron 없이 유저 트래픽이 자연 갱신
- 동일 region 동시 fetch 방지 lock

다음 단계: 이 계획서대로 Phase 1부터 구현.

— 끝 —
