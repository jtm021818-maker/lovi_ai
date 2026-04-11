/**
 * 🆕 v42: 배치 메시지 타입 — "가짜 실시간" 라운지 핵심
 *
 * 하루 1회 LLM 호출로 30~50개 메시지를 미리 생성.
 * 클라이언트에서 시간에 맞춰 카톡처럼 하나씩 표시 (Drip Feed).
 */

// ─── 예약 메시지 (하나의 대화 버블) ────────────────────

export interface ScheduledMessage {
  /** 고유 ID (uuid or index) */
  id: string;
  /** 표시 시간 (시) */
  hour: number;
  /** 표시 시간 (분) */
  minute: number;
  /** 메시지 타입 */
  type: 'character' | 'system' | 'action';
  /** 캐릭터 메시지일 때 화자 */
  speaker?: 'luna' | 'tarot';
  /** 메시지 본문 */
  text: string;
  /** 유저 관련 대화인지 (인앱 알림 트리거) */
  isAboutUser: boolean;
  /** 클라이언트에서 이미 표시했는지 */
  delivered: boolean;
}

// ─── 하루치 배치 데이터 ────────────────────────────────

export interface BatchDailyMessages {
  /** 생성 날짜 (YYYY-MM-DD) */
  generatedDate: string;
  /** 생성 시각 (ISO) */
  generatedAt: string;
  /** 미리 생성된 메시지 목록 (시간순 정렬) */
  messages: ScheduledMessage[];
  /** 유저 입장 시 인사 */
  proactiveGreeting: string;
  /** 오늘의 분위기 키워드 */
  todayTheme: string;
  /** 루나 기상 시간 */
  lunaWakeHour: number;
  /** 루나 취침 시간 (1~3시 랜덤) */
  lunaSleepHour: number;
  /** 타로냥 취침 시간 (3~5시 랜덤) */
  tarotSleepHour: number;
}

// ─── 재생 큐 아이템 (클라이언트 타이머용) ──────────────

export interface PlaybackItem {
  /** 원본 메시지 */
  message: ScheduledMessage;
  /** 재생까지 남은 ms (현재 시간 기준) */
  delayMs: number;
}

// ─── 시간 유틸 ─────────────────────────────────────────

/** 메시지의 절대 분 (0~1439) */
export function messageMinute(msg: ScheduledMessage): number {
  return msg.hour * 60 + msg.minute;
}

/** 현재 시간의 절대 분 */
export function currentMinute(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** 배치 메시지를 과거/미래로 분리 */
export function splitByTime(
  messages: ScheduledMessage[],
  now: Date = new Date(),
): { past: ScheduledMessage[]; future: ScheduledMessage[] } {
  const cm = currentMinute(now);
  return {
    past: messages.filter(m => messageMinute(m) <= cm),
    future: messages.filter(m => messageMinute(m) > cm),
  };
}

/** 미래 메시지 → 재생 큐 변환 (각각 정확한 딜레이 계산) */
export function buildPlaybackQueue(
  futureMessages: ScheduledMessage[],
  now: Date = new Date(),
): PlaybackItem[] {
  const cm = currentMinute(now);
  const nowSeconds = now.getSeconds();

  return futureMessages.map(msg => {
    const msgMin = messageMinute(msg);
    const diffMin = msgMin - cm;
    // ms 단위 딜레이: 분 차이 * 60000 - 이미 지난 초
    const delayMs = Math.max(0, diffMin * 60000 - nowSeconds * 1000);
    return { message: msg, delayMs };
  });
}

/** 카톡 스타일 시간 포맷 ("오전 9:12") */
export function formatChatTime(hour: number, minute: number): string {
  const period = hour < 12 ? '오전' : '오후';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${h12}:${String(minute).padStart(2, '0')}`;
}

/** 두 메시지 사이 5분 이상 간격인지 (시간 표시 여부 결정) */
export function shouldShowTime(
  prev: ScheduledMessage | null,
  curr: ScheduledMessage,
): boolean {
  if (!prev) return true;
  return messageMinute(curr) - messageMinute(prev) >= 5;
}
