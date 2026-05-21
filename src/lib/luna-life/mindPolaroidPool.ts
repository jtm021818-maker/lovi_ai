/**
 * v117 — "마음 한 컷" 폴라로이드 카드 풀
 *
 * 채팅 진입 시 SmartReplyBar (분홍 chip) 대체.
 * 정적 chip 답장 추천 → 24장 카드 풀에서 4장 시드 픽 (mood × time × ageDays weight).
 *
 * 자유도 보장:
 * - 카드 픽은 무드 시드만 전달 (실제 입력은 사용자 자유)
 * - 픽 후 입력창은 비어 있음 (placeholder 만 카드 톤으로 변환)
 * - 픽 안 해도 자유 입력 OK
 */
import type { LunaMood, LunaTimeBand } from './mood';

export type MoodColor =
  | 'sun' | 'cloud' | 'rain' | 'moon' | 'star' | 'tea'
  | 'flower' | 'candle' | 'tulip' | 'midnight' | 'wilt' | 'balloon'
  | 'mirror' | 'wave' | 'thought' | 'longing' | 'sparkle' | 'heavy'
  | 'fire' | 'foam' | 'pink' | 'leaf' | 'white' | 'bolt';

export interface MindPolaroidCard {
  id: MoodColor;
  emoji: string;
  /** 폴라로이드 사진 영역 위 손글씨 (10자 내외) */
  oneLine: string;
  /** 사진 영역 하단 작은 라벨 (5~7자) */
  caption: string;
  /** 픽 시 ChatInput placeholder 로 변환되는 문장 */
  placeholderHint: string;
  /** 잘 맞는 mood 들 — 시드 픽 weight 에 사용 */
  moodAffinity: LunaMood[];
  /** 잘 맞는 시간대 — 시드 픽 weight 에 사용 */
  timeAffinity: LunaTimeBand[];
  /** 사진 영역 배경 그라디언트 (start, end) */
  gradient: readonly [string, string];
  /** 스티커/핀 이모지 (좌상 마스킹테이프 옆 작은 디테일) */
  sticker: string;
}

/** 24장 카드 풀 */
export const MIND_POLAROID_POOL: readonly MindPolaroidCard[] = [
  {
    id: 'sun', emoji: '☀️', oneLine: '햇살 한 줌', caption: '맑음',
    placeholderHint: '오늘 빛났던 거 한 줄로 적어볼래…',
    moodAffinity: ['bright', 'playful'], timeAffinity: ['morning', 'afternoon'],
    gradient: ['#FFF7D6', '#FFE6B0'], sticker: '✨',
  },
  {
    id: 'cloud', emoji: '☁️', oneLine: '구름 한 덩이', caption: '흐림',
    placeholderHint: '마음에 낀 구름… 천천히 적어볼래?',
    moodAffinity: ['thoughtful', 'wistful'], timeAffinity: ['afternoon', 'evening'],
    gradient: ['#EDF2F7', '#D6E0EA'], sticker: '🩶',
  },
  {
    id: 'rain', emoji: '🌧️', oneLine: '비 오는 창 너머', caption: '쏟아져',
    placeholderHint: '오늘 어떤 비가 내렸어…?',
    moodAffinity: ['wistful', 'thoughtful'], timeAffinity: ['evening', 'night'],
    gradient: ['#D6E4F0', '#A8C0D9'], sticker: '💧',
  },
  {
    id: 'moon', emoji: '🌙', oneLine: '조용한 밤 한 페이지', caption: '잔잔',
    placeholderHint: '오늘 밤은 어떤 한 페이지였어…',
    moodAffinity: ['peaceful', 'thoughtful', 'sleepy'], timeAffinity: ['evening', 'night', 'dawn'],
    gradient: ['#E8E4F5', '#C9C0E5'], sticker: '🌛',
  },
  {
    id: 'star', emoji: '💫', oneLine: '이상한 하루였어', caption: '얼떨떨',
    placeholderHint: '뭐가 이상했는지 한 줄로 풀어볼래…',
    moodAffinity: ['playful', 'thoughtful'], timeAffinity: ['afternoon', 'evening'],
    gradient: ['#F5E8FF', '#DBC7F0'], sticker: '⭐',
  },
  {
    id: 'tea', emoji: '🍵', oneLine: '차 한잔 하고싶어', caption: '쉼',
    placeholderHint: '차 한잔 옆에 두고… 천천히 얘기해줘',
    moodAffinity: ['peaceful', 'warm'], timeAffinity: ['afternoon', 'evening'],
    gradient: ['#F0E8DC', '#D9CAA8'], sticker: '🤍',
  },
  {
    id: 'flower', emoji: '🌸', oneLine: '예쁘게 흘러갔어', caption: '봄',
    placeholderHint: '오늘 어떤 예쁜 게 있었어…',
    moodAffinity: ['bright', 'peaceful'], timeAffinity: ['morning', 'afternoon'],
    gradient: ['#FFE4EE', '#FFC7DC'], sticker: '🌷',
  },
  {
    id: 'candle', emoji: '🕯️', oneLine: '촛불처럼 잔잔해', caption: '고요',
    placeholderHint: '잔잔한 그 마음… 한 줄만 적어줘',
    moodAffinity: ['peaceful', 'thoughtful'], timeAffinity: ['evening', 'night'],
    gradient: ['#FAF0E0', '#E8D0A8'], sticker: '🕊️',
  },
  {
    id: 'tulip', emoji: '🌷', oneLine: '두근거리는 날', caption: '설렘',
    placeholderHint: '뭐가 너 두근거리게 했어…',
    moodAffinity: ['bright', 'playful'], timeAffinity: ['morning', 'afternoon', 'evening'],
    gradient: ['#FFE4F0', '#FFB3D1'], sticker: '💕',
  },
  {
    id: 'midnight', emoji: '🌃', oneLine: '잠 안 오는 새벽', caption: '뒤척',
    placeholderHint: '새벽에 떠오른 그 마음… 적어볼래',
    moodAffinity: ['sleepy', 'wistful', 'thoughtful'], timeAffinity: ['night', 'dawn'],
    gradient: ['#2E2A4A', '#5B5478'], sticker: '🌌',
  },
  {
    id: 'wilt', emoji: '🥀', oneLine: '한구석이 쉬어가', caption: '시들',
    placeholderHint: '오늘은 어디가 좀 쉬어갔어…',
    moodAffinity: ['wistful', 'thoughtful'], timeAffinity: ['evening', 'night'],
    gradient: ['#F0DCDC', '#D9A8A8'], sticker: '🍂',
  },
  {
    id: 'balloon', emoji: '🎈', oneLine: '별일 없는데 좋아', caption: '둥실',
    placeholderHint: '왠지 좋은 그 기분… 한 줄로 적어줘',
    moodAffinity: ['bright', 'peaceful', 'playful'], timeAffinity: ['afternoon', 'evening'],
    gradient: ['#FFF0E0', '#FFD4B5'], sticker: '🎀',
  },
  {
    id: 'mirror', emoji: '🪞', oneLine: '내가 좀 헷갈려', caption: '흐릿',
    placeholderHint: '나 자신이 헷갈리는 그 부분… 적어볼래',
    moodAffinity: ['thoughtful', 'wistful'], timeAffinity: ['evening', 'night'],
    gradient: ['#E8E0F0', '#C5B8D9'], sticker: '🌫️',
  },
  {
    id: 'wave', emoji: '🌊', oneLine: '감정이 출렁여', caption: '파도',
    placeholderHint: '어떤 감정이 출렁였어…',
    moodAffinity: ['wistful', 'playful'], timeAffinity: ['afternoon', 'evening', 'night'],
    gradient: ['#D6ECF0', '#9AC4D1'], sticker: '🐚',
  },
  {
    id: 'thought', emoji: '💭', oneLine: '생각이 많아져', caption: '복잡',
    placeholderHint: '머릿속 그 생각들… 천천히 풀어볼래',
    moodAffinity: ['thoughtful'], timeAffinity: ['evening', 'night', 'dawn'],
    gradient: ['#E5E5F0', '#B8B8D1'], sticker: '✏️',
  },
  {
    id: 'longing', emoji: '🥺', oneLine: '그냥 너 보고 싶어', caption: '그리움',
    placeholderHint: '오늘 무슨 일이 있었길래…',
    moodAffinity: ['warm', 'wistful'], timeAffinity: ['evening', 'night'],
    gradient: ['#FFE0E8', '#FFB8C9'], sticker: '💗',
  },
  {
    id: 'sparkle', emoji: '✨', oneLine: '오늘 좀 특별해', caption: '반짝',
    placeholderHint: '뭐가 너 오늘 특별하게 만들었어…',
    moodAffinity: ['bright', 'playful'], timeAffinity: ['morning', 'afternoon', 'evening'],
    gradient: ['#FFF6D6', '#FFD9A8'], sticker: '🌟',
  },
  {
    id: 'heavy', emoji: '🌒', oneLine: '마음이 좀 무거워', caption: '내려앉음',
    placeholderHint: '어떤 게 너 무겁게 누르고 있어…',
    moodAffinity: ['wistful', 'thoughtful'], timeAffinity: ['evening', 'night'],
    gradient: ['#D4D0DC', '#8A85A0'], sticker: '🌑',
  },
  {
    id: 'fire', emoji: '🔥', oneLine: '누구한테 한마디 하고싶어', caption: '욱',
    placeholderHint: '뭐가 너 그렇게 만들었어…',
    moodAffinity: ['playful', 'wistful'], timeAffinity: ['afternoon', 'evening'],
    gradient: ['#FFE0D6', '#FF9B7D'], sticker: '💢',
  },
  {
    id: 'foam', emoji: '🫧', oneLine: '아무 생각 없어', caption: '멍',
    placeholderHint: '그 멍한 마음 그대로 적어도 돼…',
    moodAffinity: ['sleepy', 'peaceful'], timeAffinity: ['afternoon', 'evening'],
    gradient: ['#E8F5F5', '#B8DCDC'], sticker: '🌬️',
  },
  {
    id: 'pink', emoji: '🩷', oneLine: '설레는 일이 있어', caption: '간질',
    placeholderHint: '뭐가 너 설레게 했어…',
    moodAffinity: ['bright', 'playful'], timeAffinity: ['afternoon', 'evening', 'night'],
    gradient: ['#FFD9E8', '#FFA3C2'], sticker: '💞',
  },
  {
    id: 'leaf', emoji: '🍂', oneLine: '옛 생각이 떠올라', caption: '회상',
    placeholderHint: '누가 떠올랐어…?',
    moodAffinity: ['wistful', 'thoughtful'], timeAffinity: ['evening', 'night'],
    gradient: ['#F0DCC5', '#D9A878'], sticker: '🍁',
  },
  {
    id: 'white', emoji: '🤍', oneLine: '그냥 들어줄래', caption: '쉼표',
    placeholderHint: '말 못 했던 거… 다 쏟아도 돼',
    moodAffinity: ['warm', 'peaceful', 'thoughtful'], timeAffinity: ['afternoon', 'evening', 'night'],
    gradient: ['#F8F4F0', '#E0D8D0'], sticker: '🤍',
  },
  {
    id: 'bolt', emoji: '⚡', oneLine: '화가 좀 나', caption: '번쩍',
    placeholderHint: '뭐가 너 화나게 했어…',
    moodAffinity: ['playful', 'wistful'], timeAffinity: ['afternoon', 'evening'],
    gradient: ['#FFEFC2', '#FFC04D'], sticker: '⚡',
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function dayBucket(): number {
  return Math.floor((Date.now() + KST_OFFSET_MS) / DAY_MS);
}

/**
 * (Mulberry32) 결정형 PRNG — seed 한 정수로 매번 동일한 시퀀스.
 * 같은 날 + 같은 mood 면 같은 4장 → "오늘의 카드" 느낌.
 */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PickArgs {
  mood: LunaMood;
  timeBand: LunaTimeBand;
  ageDays: number;
  /** 추가 시드 (예: recentSessionCount24h) */
  extraSeed?: number;
}

/**
 * 24장 풀에서 4장 시드 픽.
 * - mood/time 매칭 카드는 가중치 +3
 * - 매칭 안 되는 카드도 1점은 받아서 다양성 보장
 * - 같은 날 같은 입력 → 동일 4장 (deterministic)
 */
export function pickMindPolaroidCards(args: PickArgs): MindPolaroidCard[] {
  const moodHash = args.mood.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const timeHash = args.timeBand.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const seed =
    dayBucket() * 1009 +
    moodHash * 31 +
    timeHash * 17 +
    args.ageDays * 7 +
    (args.extraSeed ?? 0);

  const rng = makeRng(seed);

  // 1. 카드별 weight 계산
  const weighted = MIND_POLAROID_POOL.map((card) => {
    let w = 1;
    if (card.moodAffinity.includes(args.mood)) w += 3;
    if (card.timeAffinity.includes(args.timeBand)) w += 2;
    // jitter 로 동점 깨기 (deterministic)
    return { card, weight: w + rng() * 0.5 };
  });

  // 2. weighted 정렬 후 상위 12장에서 4장 셔플 (다양성 + 매칭 우선)
  weighted.sort((a, b) => b.weight - a.weight);
  const pool = weighted.slice(0, 12).map((x) => x.card);

  // Fisher-Yates with seeded rng
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 4);
}
