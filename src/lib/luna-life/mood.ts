/**
 * Luna Mood / Activity engine — v100
 *
 * 결정형(deterministic) 1차 엔진.
 * 같은 입력 → 같은 출력. 외부 호출 없음.
 *
 * 휴리스틱 안전망 (메모리 룰: feedback_llm_judgment.md).
 * 본격적 톤은 LLM whisper 보강(/api/luna-room/whisper)이 담당.
 */

import type { LifeStage } from './index';

export type LunaMood =
  | 'bright'
  | 'warm'
  | 'playful'
  | 'wistful'
  | 'sleepy'
  | 'thoughtful'
  | 'peaceful';

export type LunaActivity =
  | 'sipping_tea'
  | 'reading'
  | 'drawing'
  | 'gazing_window'
  | 'cuddling_cat'
  | 'on_phone'
  | 'stretching'
  | 'sleeping';

export type LunaTimeBand =
  | 'dawn'
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night';

export type LunaWeather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'starry';

export interface LunaLiveState {
  mood: LunaMood;
  activity: LunaActivity;
  rationale: string;
  whisper: string | null;
  validUntil: number;
  timeBand: LunaTimeBand;
  weather: LunaWeather;
}

export interface ComputeArgs {
  ageDays: number;
  stage: LifeStage;
  /** 서버 타임 (Asia/Seoul 기준 ms) */
  serverNowMs: number;
  recentSessionWithin24h: boolean;
  recentMessageCount24h: number;
  isDeceased: boolean;
}

// ─── KST hour helper ──────────────────────────────────────────────────────────

function kstHour(serverNowMs: number): number {
  // Asia/Seoul = UTC+9 (DST 없음)
  const kstMs = serverNowMs + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  return d.getUTCHours();
}

function timeBandFromHour(hour: number): LunaTimeBand {
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ─── Seeded pick (결정형) ──────────────────────────────────────────────────────

function seededPick<T>(arr: readonly T[], seed: number): T {
  if (arr.length === 0) throw new Error('seededPick on empty');
  const idx = Math.abs(Math.floor(seed)) % arr.length;
  return arr[idx];
}

// ─── Activity table ───────────────────────────────────────────────────────────

const ACTIVITY_BY_HOUR: { fromInclusive: number; toExclusive: number; activities: LunaActivity[] }[] = [
  { fromInclusive: 3, toExclusive: 6,  activities: ['sleeping'] },
  { fromInclusive: 6, toExclusive: 9,  activities: ['stretching', 'sipping_tea'] },
  { fromInclusive: 9, toExclusive: 12, activities: ['drawing', 'reading', 'sipping_tea'] },
  { fromInclusive: 12, toExclusive: 17, activities: ['reading', 'gazing_window', 'drawing'] },
  { fromInclusive: 17, toExclusive: 21, activities: ['cuddling_cat', 'on_phone', 'sipping_tea'] },
  { fromInclusive: 21, toExclusive: 23, activities: ['sipping_tea', 'reading', 'cuddling_cat'] },
  { fromInclusive: 23, toExclusive: 24, activities: ['gazing_window', 'sleeping'] },
  { fromInclusive: 0, toExclusive: 3,  activities: ['sleeping', 'gazing_window'] },
];

function pickActivity(hour: number, daySeed: number, stage: LifeStage): LunaActivity {
  const band = ACTIVITY_BY_HOUR.find((b) => hour >= b.fromInclusive && hour < b.toExclusive);
  const base = band?.activities ?? (['warm'] as never);

  // stage별 가중치 — twilight/star 외에는 base 그대로
  if (stage === 'star') return 'sleeping';
  if (stage === 'twilight') {
    // 차분한 활동 선호: drawing/on_phone 회피
    const calm = base.filter((a) => a !== 'on_phone');
    return seededPick(calm.length > 0 ? calm : base, daySeed);
  }
  return seededPick(base, daySeed);
}

// ─── Mood table ───────────────────────────────────────────────────────────────

function pickMood(args: {
  hour: number;
  stage: LifeStage;
  recentSessionWithin24h: boolean;
  daySeed: number;
}): LunaMood {
  const { hour, stage, recentSessionWithin24h, daySeed } = args;

  if (stage === 'star') return 'peaceful';
  if (stage === 'twilight') return 'peaceful';

  // 기본 시간대 무드
  let pool: LunaMood[];
  if (hour >= 23 || hour < 6) pool = ['sleepy'];
  else if (hour >= 6 && hour < 9) pool = ['bright', 'warm'];
  else if (hour >= 9 && hour < 17) pool = ['warm', 'playful'];
  else if (hour >= 17 && hour < 21) pool = ['warm', 'playful'];
  else pool = ['thoughtful', 'warm'];

  // 계절 보정
  if (stage === 'autumn') pool = pool.concat(['wistful', 'thoughtful']);
  if (stage === 'winter') pool = pool.concat(['thoughtful', 'wistful']);
  if (stage === 'spring' || stage === 'dawn') pool = pool.concat(['bright']);
  if (stage === 'summer') pool = pool.concat(['playful']);

  // 최근 대화 가중치
  if (recentSessionWithin24h) pool = pool.concat(['playful', 'warm']);

  return seededPick(pool, daySeed + 7);
}

// ─── Weather (6시간 버킷) ──────────────────────────────────────────────────────

function pickWeather(args: { stage: LifeStage; serverNowMs: number; hour: number }): LunaWeather {
  const { stage, serverNowMs, hour } = args;

  const bucket = Math.floor(serverNowMs / (6 * 60 * 60 * 1000));
  const isNight = hour < 6 || hour >= 21;

  if (stage === 'star' || stage === 'twilight') return 'starry';
  if (stage === 'winter') {
    return seededPick(['snowy', 'cloudy', 'sunny'], bucket);
  }
  if (stage === 'autumn') {
    return seededPick(['cloudy', 'sunny', 'rainy'], bucket);
  }
  if (stage === 'spring') {
    return seededPick(['sunny', 'sunny', 'cloudy', 'rainy'], bucket);
  }
  if (stage === 'summer') {
    return seededPick(['sunny', 'sunny', 'cloudy', 'rainy'], bucket);
  }
  if (stage === 'dawn') {
    return seededPick(['sunny', 'cloudy'], bucket);
  }

  return isNight ? 'starry' : 'sunny';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeLiveStateLocal(args: ComputeArgs): LunaLiveState {
  const { ageDays, stage, serverNowMs, recentSessionWithin24h, isDeceased } = args;

  const hour = kstHour(serverNowMs);
  const timeBand = timeBandFromHour(hour);

  // 매일 새 시드 (KST 자정 기준)
  const dayBucket = Math.floor((serverNowMs + 9 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000));
  const daySeed = dayBucket + ageDays;

  const activity = isDeceased ? 'sleeping' : pickActivity(hour, daySeed, stage);
  const mood = isDeceased
    ? 'peaceful'
    : pickMood({ hour, stage, recentSessionWithin24h, daySeed });
  const weather = pickWeather({ stage, serverNowMs, hour });

  // validUntil = 다음 시간대 변경 또는 6시간 (whichever sooner)
  const nextHourMs = (60 - new Date(serverNowMs).getMinutes()) * 60 * 1000;
  const validUntil = serverNowMs + Math.min(nextHourMs, 60 * 60 * 1000);

  return {
    mood,
    activity,
    rationale: `${stage}/${timeBand}/${hour}h`,
    whisper: null, // caller가 whispers.ts에서 채움
    validUntil,
    timeBand,
    weather,
  };
}
