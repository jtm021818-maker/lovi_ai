/**
 * 🏠 NPC Life Engine — 통합 엔진
 * 감정 FSM + 이벤트 풀 + 미니 스토리를 합쳐서
 * 매 분마다 캐릭터가 살아있는 것처럼 동작
 * API 호출 0회 — 시드 기반 결정론적 시뮬레이션
 */

import { todaySeed, seededRandom } from './seeded-random';
import { type EmotionalState, getTimeBasedMood, applyEmotionEffect, emotionToEmoji, emotionToKorean } from './emotion-fsm';
import { getHourlyEvent } from './event-pool';
import { selectTodayStory, type MiniStory } from './mini-stories';
import type { DailyEvent } from './daily-state-engine';
import { generateDefaultSchedule, getCurrentStatus } from './conversation-player';
import type { LoungeMessageType } from '@/components/lounge/LoungeMessage';

// ─── Types ──────────────────────────────────────────────

export interface CharacterLiveStatus {
  activity: string;
  emoji: string;
  location: string;
  emotion: EmotionalState;
  emotionEmoji: string;
  emotionLabel: string;
}

export interface TickResult {
  messages: LoungeMessageType[];
  luna: CharacterLiveStatus;
  tarot: CharacterLiveStatus;
  storyTitle?: string;
}

// ─── Engine ─────────────────────────────────────────────

export class NpcLifeEngine {
  private seed: number;
  private userName: string;
  private story: MiniStory;
  private lunaBaseMood: number;
  private tarotBaseMood: number;
  private lunaEmotion: EmotionalState;
  private tarotEmotion: EmotionalState;
  private firedStoryBeats = new Set<number>();
  private firedEvents = new Set<string>();
  private llmEvents: DailyEvent[] = [];
  private firedLlmEvents = new Set<number>();

  constructor(userId: string, userName: string, lunaBaseMood?: number, tarotBaseMood?: number, dailyEvents?: DailyEvent[]) {
    this.seed = todaySeed(userId);
    this.userName = userName;
    this.lunaBaseMood = lunaBaseMood ?? seededRandom(this.seed, 1) * 0.6; // 0~0.6
    this.tarotBaseMood = tarotBaseMood ?? seededRandom(this.seed, 2) * 0.4 - 0.1; // -0.1~0.3
    this.story = selectTodayStory(this.seed, userName);
    this.llmEvents = dailyEvents ?? [];

    const hour = new Date().getHours();
    this.lunaEmotion = getTimeBasedMood(hour, this.lunaBaseMood);
    this.tarotEmotion = getTimeBasedMood(hour, this.tarotBaseMood);
  }

  /** 오늘의 미니 스토리 제목 */
  getStoryTitle(): string {
    return this.story.title;
  }

  /** 매 분 호출 — 새 메시지/상태 변화 반환 */
  tick(hour: number, minute: number): TickResult {
    const messages: LoungeMessageType[] = [];

    // 1. 시간 기반 감정 업데이트
    this.lunaEmotion = getTimeBasedMood(hour, this.lunaBaseMood);
    this.tarotEmotion = getTimeBasedMood(hour, this.tarotBaseMood);

    // 2. 미니 스토리 비트 (정각 0~4분에 발동)
    if (minute < 5) {
      const beat = this.story.beats.find(b => b.hour === hour && !this.firedStoryBeats.has(b.hour));
      if (beat) {
        this.firedStoryBeats.add(beat.hour);
        if (beat.systemMessage) {
          messages.push({ type: 'system', text: beat.systemMessage });
        }
        for (const line of beat.dialogue) {
          messages.push({ type: 'character', speaker: line.speaker, text: line.text });
        }
        if (beat.emotionEffect) {
          this.lunaEmotion = applyEmotionEffect(this.lunaEmotion, beat.emotionEffect);
          this.tarotEmotion = applyEmotionEffect(this.tarotEmotion, beat.emotionEffect);
        }
      }
    }

    // 3. 이벤트: LLM 생성 이벤트 우선, 없으면 시드 기반 폴백
    const eventMinute = Math.floor(seededRandom(this.seed, hour * 7) * 40) + 10;
    if (Math.abs(minute - eventMinute) < 3) {
      // LLM이 생성한 오늘의 이벤트 먼저 체크
      const llmEvent = this.llmEvents.find(e => e.hour === hour);
      if (llmEvent && !this.firedLlmEvents.has(hour)) {
        this.firedLlmEvents.add(hour);
        if (llmEvent.systemMessage) {
          messages.push({ type: 'system', text: llmEvent.systemMessage });
        }
        for (const line of llmEvent.dialogue) {
          messages.push({ type: 'character', speaker: line.speaker, text: line.text });
        }
      } else {
        // LLM 이벤트 없으면 → 시드 기반 폴백
        for (const character of ['luna', 'tarot'] as const) {
          const eventKey = `${character}_${hour}`;
          if (this.firedEvents.has(eventKey)) continue;

          const event = getHourlyEvent(this.seed, hour, character, this.userName);
          if (!event) continue;

          this.firedEvents.add(eventKey);
          if (event.systemMessage) {
            messages.push({ type: 'system', text: event.systemMessage });
          }
          for (const line of event.dialogue) {
            messages.push({ type: 'character', speaker: line.speaker, text: line.text });
          }
          if (event.emotionEffect) {
            if (event.character === 'luna' || event.character === 'both') {
              this.lunaEmotion = applyEmotionEffect(this.lunaEmotion, event.emotionEffect);
            }
            if (event.character === 'tarot' || event.character === 'both') {
              this.tarotEmotion = applyEmotionEffect(this.tarotEmotion, event.emotionEffect);
            }
          }
          break;
        }
      }
    }

    // 4. 캐릭터 현재 상태
    const lunaSchedule = generateDefaultSchedule('luna');
    const tarotSchedule = generateDefaultSchedule('tarot');
    const lunaStatus = getCurrentStatus(lunaSchedule, hour);
    const tarotStatus = getCurrentStatus(tarotSchedule, hour);

    return {
      messages,
      luna: {
        activity: lunaStatus.activity,
        emoji: lunaStatus.emoji,
        location: lunaStatus.location,
        emotion: this.lunaEmotion,
        emotionEmoji: emotionToEmoji(this.lunaEmotion),
        emotionLabel: emotionToKorean(this.lunaEmotion),
      },
      tarot: {
        activity: tarotStatus.activity,
        emoji: tarotStatus.emoji,
        location: tarotStatus.location,
        emotion: this.tarotEmotion,
        emotionEmoji: emotionToEmoji(this.tarotEmotion),
        emotionLabel: emotionToKorean(this.tarotEmotion),
      },
      storyTitle: this.story.title,
    };
  }

  /** 유저 방문 시 감정 반응 */
  onUserVisit(): void {
    this.lunaEmotion = applyEmotionEffect(this.lunaEmotion, { valence: 0.2, arousal: 0.15 });
    this.tarotEmotion = applyEmotionEffect(this.tarotEmotion, { valence: 0.1, arousal: 0.1 });
  }
}
