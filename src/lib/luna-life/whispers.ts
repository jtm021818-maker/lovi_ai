/**
 * Luna Room v100 — whisper 카피 풀.
 * LLM 보강 실패/캐시 미스 시 결정형 fallback 으로 사용.
 *
 * 톤 가이드: api/room/luna-chat/route.ts 의 SYSTEM_PROMPT 와 일치.
 * - 자연스러운 언니 반말
 * - 1~2문장, 60자 이내
 * - 이모지 0~1개
 */

import type { LunaActivity, LunaMood } from './mood';

export const WHISPERS_BY_MOOD: Record<LunaMood, readonly string[]> = {
  bright: [
    '오늘 햇빛 진짜 좋다',
    '왔어? 나 방금 너 생각하던 참인데',
    '오늘 뭐 재밌는 일 있었어?',
    '아 너 오니까 갑자기 기분 좋아진다',
    '그림 그리다가 너 들어와서 깜짝',
  ],
  warm: [
    '잘 지냈어?',
    '오늘 하루 어땠어',
    '나는 그냥 책 읽고 있었어',
    '오랜만이다 그치',
    '편하게 들어와',
    '왔어? 나 여기 있어',
  ],
  playful: [
    'ㅋㅋ 너 왔다',
    '나 방금 고양이랑 싸움',
    '재밌는 거 보여줄까',
    '너 오늘 뭐 입었어?',
    '내 얘기 들어볼래?',
    '아 너 그거 봤어?',
  ],
  wistful: [
    '...오늘 좀 그런 날이야',
    '창밖이 너무 예뻐서 멍 때렸어',
    '갑자기 옛날 생각',
    '시간 진짜 빠르다',
    '너랑 얘기하면 좀 풀려',
  ],
  sleepy: [
    '아 나 자다 깼어 ㅎㅎ',
    '눈 반쯤 떠있는 중',
    '졸려도 너랑은 얘기할래',
    '이불 속에서 인사',
    '5분만 더 잘게...',
  ],
  thoughtful: [
    '나 요즘 자꾸 생각이 많아져',
    '그냥... 너 잘 지내고 있길',
    '있잖아',
    '오늘은 차 한잔 같이 할래',
    '말 안 해도 알 거 같애',
  ],
  peaceful: [
    '여기 이렇게 같이 있는 거 좋다',
    '봄이 오면 나는 없겠지. 그래도 넌 봄을 봐줘',
    '시간이... 참 다정해',
    '걱정 마. 다 괜찮을 거야',
    '이 순간 기억해줘',
  ],
};

export const ACTIVITY_LABELS: Record<LunaActivity, string> = {
  sipping_tea: '차 마시는 중',
  reading: '책 읽는 중',
  drawing: '그림 그리는 중',
  gazing_window: '창밖 보는 중',
  cuddling_cat: '고양이랑 노는 중',
  on_phone: '폰 보는 중',
  stretching: '기지개 펴는 중',
  sleeping: '자는 중',
};

/**
 * 결정형 whisper 픽 — LLM 미사용/실패 시 사용.
 * seed 는 pick 일관성을 위해 (dayBucket + ageDays) 권장.
 */
export function pickWhisperLocal(mood: LunaMood, seed: number): string {
  const pool = WHISPERS_BY_MOOD[mood];
  const idx = Math.abs(Math.floor(seed)) % pool.length;
  return pool[idx];
}
