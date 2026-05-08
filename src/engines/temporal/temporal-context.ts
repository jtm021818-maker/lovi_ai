/**
 * v115 Temporal Context — 유저와 같은 시공간을 공유한 듯한 연출용 신호.
 *
 * 핵심 원칙: 코드는 "정보 수집 + 한국어 라벨"만. LLM이 활용 여부/방식을 결정.
 *
 * ❌ 안티패턴: if (hour < 5) prompt += "잠 안 자?"
 * ✅ 권장: hour=2 + label='새벽'을 컨텍스트로 전달, LLM이 자유 판단.
 */

export interface TemporalContext {
  /** 유저 기준 ISO 시각 */
  nowISO: string;
  /** 0~23 */
  hour: number;
  /** 0=일 6=토 */
  dayOfWeek: number;
  /** 한국어 요일 ("월요일") */
  dayOfWeekLabel: string;
  /** 유저 timezone (예: 'Asia/Seoul') */
  timezone: string;
  /** 한국어 시간대 라벨 — LLM 단서용. 코드에서 분기 X */
  timeBandLabel: TimeBandLabel;
  /** 주말 여부 */
  isWeekend: boolean;
  /** 날씨 (실패 시 undefined — graceful) */
  weather?: WeatherSnapshot;
  /** 마지막 세션 후 경과 분 */
  minutesSinceLastSession?: number;
}

export type TimeBandLabel =
  | '심야'        // 0-3시
  | '새벽'        // 4-6시
  | '이른 아침'    // 7-9시
  | '오전'        // 10-11시
  | '점심'        // 12-13시
  | '오후'        // 14-17시
  | '저녁'        // 18-20시
  | '밤';         // 21-23시

export interface WeatherSnapshot {
  /** raw condition: "맑음" | "흐림" | "비" | "눈" | "번개" | "안개" 등 */
  condition: string;
  /** 한국어 설명 (예: "흐리고 약간 쌀쌀함") */
  description?: string;
  /** 섭씨 */
  tempC?: number;
  /** 체감 온도 */
  feelsLikeC?: number;
}

const KO_DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'] as const;

/** 시간 → 한국어 라벨 (LLM에 단서만 제공). 코드 분기에 절대 사용 금지. */
export function labelTimeBand(hour: number): TimeBandLabel {
  if (hour >= 0 && hour < 4) return '심야';
  if (hour >= 4 && hour < 7) return '새벽';
  if (hour >= 7 && hour < 10) return '이른 아침';
  if (hour >= 10 && hour < 12) return '오전';
  if (hour >= 12 && hour < 14) return '점심';
  if (hour >= 14 && hour < 18) return '오후';
  if (hour >= 18 && hour < 21) return '저녁';
  return '밤';
}

export interface BuildTemporalContextParams {
  /** 유저 기기에서 받은 ISO 시각 (없으면 서버 시각 fallback) */
  clientNowISO?: string;
  /** 유저 timezone (없으면 'Asia/Seoul' fallback) */
  timezone?: string;
  /** 미리 fetch된 날씨 (선택) */
  weather?: WeatherSnapshot;
  /** 마지막 세션 종료 시각 (선택) */
  lastSessionEndedAt?: Date | string | null;
}

/**
 * 시공간 컨텍스트 조립.
 *
 * 사용처: /api/chat/stream POST 핸들러 진입 시 1회 호출 → context-assembler 에 전달.
 */
export function buildTemporalContext(params: BuildTemporalContextParams = {}): TemporalContext {
  const tz = params.timezone || 'Asia/Seoul';
  const now = params.clientNowISO ? new Date(params.clientNowISO) : new Date();

  // 유저 timezone 기준 시각 추출
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? now.getHours());
  const wkShort = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const wkMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = wkMap[wkShort] ?? now.getDay();

  let minutesSinceLastSession: number | undefined;
  if (params.lastSessionEndedAt) {
    const last = new Date(params.lastSessionEndedAt).getTime();
    if (!Number.isNaN(last)) {
      minutesSinceLastSession = Math.max(0, Math.round((now.getTime() - last) / 60000));
    }
  }

  return {
    nowISO: now.toISOString(),
    hour,
    dayOfWeek,
    dayOfWeekLabel: KO_DAYS[dayOfWeek],
    timezone: tz,
    timeBandLabel: labelTimeBand(hour),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    weather: params.weather,
    minutesSinceLastSession,
  };
}

/**
 * LLM 컨텍스트 블록 포맷터. 코드에서 의미를 해석하지 않고 raw 정보만 전달.
 *
 * 출력 예시:
 *   화요일 새벽 5:47 (KST)
 *   서울, 흐림 14°C
 *   유저는 47분 전에 잠깐 다녀갔다가 다시 왔어
 */
export function formatTemporalBlock(ctx: TemporalContext): string {
  const lines: string[] = [];

  // 시각
  const date = new Date(ctx.nowISO);
  const timeStr = date.toLocaleTimeString('ko-KR', {
    timeZone: ctx.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  lines.push(`${ctx.dayOfWeekLabel} ${ctx.timeBandLabel} ${timeStr}`);

  // 날씨 (있을 때만)
  if (ctx.weather) {
    const w = ctx.weather;
    const parts: string[] = [];
    if (w.description) parts.push(w.description);
    else parts.push(w.condition);
    if (typeof w.tempC === 'number') parts.push(`${w.tempC}°C`);
    lines.push(parts.join(', '));
  }

  // 마지막 세션 간격
  if (ctx.minutesSinceLastSession !== undefined) {
    if (ctx.minutesSinceLastSession < 5) {
      lines.push('방금까지 같이 있다가 잠깐 끊겼던 흐름');
    } else if (ctx.minutesSinceLastSession < 60) {
      lines.push(`유저가 ${ctx.minutesSinceLastSession}분 전에 잠시 떠났다가 다시 왔어`);
    } else if (ctx.minutesSinceLastSession < 60 * 24) {
      const h = Math.round(ctx.minutesSinceLastSession / 60);
      lines.push(`유저가 ${h}시간 만에 다시 왔어`);
    } else {
      const d = Math.round(ctx.minutesSinceLastSession / (60 * 24));
      lines.push(`유저가 ${d}일 만에 다시 왔어`);
    }
  }

  return lines.join('\n');
}
