/**
 * 🎭 대화 재생 엔진
 *
 * Daily Plan의 대화 세트를 시간 기반으로 재생
 * LLM 호출 0회 — 미리 생성된 대화를 타이머로 순차 표시
 */

import type { CharacterDailyState } from './daily-state-engine';

// ─── Types ──────────────────────────────────────────────

export interface QueuedMessage {
  speaker: 'luna' | 'tarot';
  text: string;
  scheduledDelay: number; // ms
}

export interface ScheduleEntry {
  hour: number;
  activity: string;
  location: 'lounge' | 'away' | 'sleeping';
  statusEmoji: string;
}

// ─── 시간대별 스케줄 생성 (LLM 없이) ─────────────────────

export function generateDefaultSchedule(character: 'luna' | 'tarot'): ScheduleEntry[] {
  if (character === 'luna') {
    return [
      { hour: 6, activity: '자고 있음', location: 'sleeping', statusEmoji: '💤' },
      { hour: 9, activity: '커피 마시며 정리', location: 'lounge', statusEmoji: '☕' },
      { hour: 11, activity: '책 읽기', location: 'lounge', statusEmoji: '📖' },
      { hour: 13, activity: '점심 먹으러', location: 'away', statusEmoji: '🍽️' },
      { hour: 14, activity: '상담 노트 보기', location: 'lounge', statusEmoji: '📋' },
      { hour: 17, activity: '타로냥이랑 수다', location: 'lounge', statusEmoji: '💬' },
      { hour: 19, activity: '저녁 산책', location: 'away', statusEmoji: '🌇' },
      { hour: 20, activity: '돌아옴', location: 'lounge', statusEmoji: '🏠' },
      { hour: 22, activity: '일기 쓰기', location: 'lounge', statusEmoji: '📔' },
      { hour: 23, activity: '잠자리 준비', location: 'sleeping', statusEmoji: '🌙' },
    ];
  }
  return [
    { hour: 7, activity: '자고 있음', location: 'sleeping', statusEmoji: '😺💤' },
    { hour: 10, activity: '카드 셔플 연습', location: 'lounge', statusEmoji: '🃏' },
    { hour: 12, activity: '낮잠', location: 'lounge', statusEmoji: '😴' },
    { hour: 14, activity: '카드 가게 구경', location: 'away', statusEmoji: '🛍️' },
    { hour: 15, activity: '돌아옴', location: 'lounge', statusEmoji: '🃏' },
    { hour: 16, activity: '오늘의 카드 뽑기', location: 'lounge', statusEmoji: '🔮' },
    { hour: 18, activity: '루나랑 수다', location: 'lounge', statusEmoji: '💬' },
    { hour: 20, activity: '달빛 카드 명상', location: 'lounge', statusEmoji: '🌙' },
    { hour: 22, activity: '카드 위에서 졸기', location: 'lounge', statusEmoji: '😺' },
    { hour: 0, activity: '잠듦', location: 'sleeping', statusEmoji: '💤' },
  ];
}

// ─── 현재 캐릭터 상태 조회 ───────────────────────────────

export function getCurrentStatus(
  schedule: ScheduleEntry[],
  currentHour: number,
): { activity: string; location: string; emoji: string } {
  // 현재 시간 이하의 가장 마지막 엔트리
  let current = schedule[0];
  for (const entry of schedule) {
    if (entry.hour <= currentHour) current = entry;
  }
  return {
    activity: current.activity,
    location: current.location,
    emoji: current.statusEmoji,
  };
}

// ─── 외출/복귀 시스템 메시지 ─────────────────────────────

export function getStatusChangeMessages(
  schedule: ScheduleEntry[],
  character: 'luna' | 'tarot',
  currentHour: number,
): string[] {
  const charName = character === 'luna' ? '루나' : '타로냥';
  const messages: string[] = [];

  const current = schedule.find(s => s.hour === currentHour);
  const prev = schedule.find(s => s.hour === currentHour - 1);

  if (prev && current) {
    if (prev.location === 'lounge' && current.location === 'away') {
      messages.push(`${charName}가 ${current.activity}하러 나갔어요 ${current.statusEmoji}`);
    }
    if (prev.location === 'away' && current.location === 'lounge') {
      messages.push(`${charName}가 돌아왔어요! ${current.statusEmoji}`);
    }
    if (prev.location !== 'sleeping' && current.location === 'sleeping') {
      messages.push(`${charName}가 잠들었어요 ${current.statusEmoji}`);
    }
    if (prev.location === 'sleeping' && current.location !== 'sleeping') {
      messages.push(`${charName}가 일어났어요! ${current.statusEmoji}`);
    }
  }

  return messages;
}

// ─── crossTalk → 재생 큐 변환 ────────────────────────────

export function crossTalkToQueue(
  dailyState: CharacterDailyState,
): QueuedMessage[] {
  const lines = dailyState.crossTalk?.lines;
  if (!lines || lines.length === 0) return [];

  const queue: QueuedMessage[] = [];
  let cumDelay = 2000; // 2초 후 시작

  for (const line of lines) {
    const typingDelay = 1200 + line.text.length * 40; // 타이핑 시뮬레이션
    cumDelay += typingDelay;
    queue.push({
      speaker: line.speaker,
      text: line.text,
      scheduledDelay: cumDelay,
    });
    cumDelay += 800; // 메시지 간 간격
  }

  return queue;
}
