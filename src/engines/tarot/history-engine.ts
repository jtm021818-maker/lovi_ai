/**
 * 🔮 v23: 타로 히스토리 엔진
 *
 * 1. 세션 간 카드 리딩 기록 저장/조회
 * 2. 반복 등장 카드 감지 → "또 이 카드가..." 멘트
 * 3. 일일 타로: 유저+날짜 시드 기반 동일 카드 보장
 */

import { drawCards, interpretCard } from './index';
import type { DrawnCard } from './index';
// types used by callers; no direct use here

// ============================================
// 타로 리딩 히스토리
// ============================================

export interface TarotReadingRecord {
  sessionId: string;
  spreadType: string;
  scenario: string;
  cards: {
    cardId: string;
    cardName: string;
    cardEmoji: string;
    position: string;
    isReversed: boolean;
  }[];
  keyInsight?: string;
  createdAt: string;
}

/**
 * 세션의 카드 리딩을 히스토리에 저장
 */
export async function saveReadingHistory(
  supabase: any,
  _userId: string,
  sessionId: string,
  spreadType: string,
  scenario: string,
  cards: any[],
  keyInsight?: string,
): Promise<void> {
  try {
    // counseling_sessions의 session_metadata에 저장 (별도 테이블 없이)
    const { data: session } = await supabase
      .from('counseling_sessions')
      .select('session_metadata')
      .eq('id', sessionId)
      .single();

    const meta = session?.session_metadata ?? {};
    const history = meta.tarot_history ?? [];
    history.push({
      spreadType,
      scenario,
      cards: cards.map((c: any) => ({
        cardId: c.cardId ?? c.card?.id ?? '',
        cardName: c.cardName ?? c.card?.name ?? '',
        cardEmoji: c.cardEmoji ?? c.card?.emoji ?? '',
        position: c.position ?? '',
        isReversed: c.isReversed ?? false,
      })),
      keyInsight,
      createdAt: new Date().toISOString(),
    });

    await supabase
      .from('counseling_sessions')
      .update({ session_metadata: { ...meta, tarot_history: history } })
      .eq('id', sessionId);
  } catch (e) {
    console.warn('[TarotHistory] 히스토리 저장 실패 (무시):', e);
  }
}

/**
 * 유저의 최근 타로 리딩 히스토리 조회 (최근 N개 세션)
 */
export async function getRecentReadings(
  supabase: any,
  userId: string,
  limit: number = 5,
): Promise<TarotReadingRecord[]> {
  try {
    const { data: sessions } = await supabase
      .from('counseling_sessions')
      .select('id, session_metadata, created_at')
      .eq('user_id', userId)
      .not('session_metadata->tarot', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!sessions?.length) return [];

    const readings: TarotReadingRecord[] = [];
    for (const s of sessions) {
      const tarot = s.session_metadata?.tarot;
      if (tarot?.cards?.length) {
        readings.push({
          sessionId: s.id,
          spreadType: tarot.chosenSpreadType ?? 'unknown',
          scenario: tarot.scenario ?? 'GENERAL',
          cards: tarot.cards.map((c: any) => ({
            cardId: c.cardId ?? c.card?.id ?? '',
            cardName: c.cardName ?? c.card?.name ?? c.cardName ?? '',
            cardEmoji: c.cardEmoji ?? c.card?.emoji ?? '',
            position: c.position ?? '',
            isReversed: c.isReversed ?? false,
          })),
          keyInsight: tarot.keyInsight,
          createdAt: s.created_at,
        });
      }
      // tarot_history 내부 기록도 추가
      const history = s.session_metadata?.tarot_history;
      if (Array.isArray(history)) {
        for (const h of history) {
          readings.push({ ...h, sessionId: s.id });
        }
      }
    }

    return readings.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, limit * 2);
  } catch (e) {
    console.warn('[TarotHistory] 히스토리 조회 실패:', e);
    return [];
  }
}

// ============================================
// 반복 카드 감지
// ============================================

export interface RecurringCard {
  cardId: string;
  cardName: string;
  cardEmoji: string;
  count: number;
  /** 타로냥 톤의 멘트 */
  message: string;
}

/**
 * 최근 리딩에서 2회 이상 등장한 카드 감지
 */
export function detectRecurringCards(
  readings: TarotReadingRecord[],
  minCount: number = 2,
): RecurringCard[] {
  const cardCounts = new Map<string, { name: string; emoji: string; count: number }>();

  for (const reading of readings) {
    // 세션 내 중복 제거 (같은 세션에서 같은 카드 2번은 1번으로)
    const seenInSession = new Set<string>();
    for (const card of reading.cards) {
      const id = card.cardId;
      if (!id || seenInSession.has(id)) continue;
      seenInSession.add(id);

      const existing = cardCounts.get(id);
      if (existing) {
        existing.count++;
      } else {
        cardCounts.set(id, { name: card.cardName, emoji: card.cardEmoji, count: 1 });
      }
    }
  }

  const recurring: RecurringCard[] = [];
  for (const [cardId, info] of cardCounts) {
    if (info.count >= minCount) {
      const messages: Record<number, string> = {
        2: `냥~ ${info.emoji} ${info.name} 카드가 또 나왔어. 이 카드가 계속 너한테 말을 걸고 있어 🔮`,
        3: `${info.emoji} ${info.name}... 세 번째야. 이 카드가 정말 전하고 싶은 메시지가 있나봐 냥~ 🐱`,
        4: `${info.emoji} 네 번째 ${info.name}! 이건 우연이 아니야. 이 에너지를 진지하게 받아들여봐 🔮✨`,
      };
      recurring.push({
        cardId,
        cardName: info.name,
        cardEmoji: info.emoji,
        count: info.count,
        message: messages[Math.min(info.count, 4)] ?? messages[4]!,
      });
    }
  }

  return recurring.sort((a, b) => b.count - a.count);
}

/**
 * 반복 카드를 프롬프트 컨텍스트로 변환
 */
export function getRecurringCardsPrompt(recurring: RecurringCard[]): string {
  if (recurring.length === 0) return '';

  const lines = recurring.map(r =>
    `- ${r.cardEmoji} ${r.cardName}: ${r.count}회 등장 → "${r.message}"`
  );

  return `\n\n## 반복 등장 카드 (자연스럽게 언급해)\n${lines.join('\n')}\n"또 이 카드가 나왔네...", "이 카드가 계속 말을 걸고 있어..." 식으로 자연스럽게.`;
}

// ============================================
// 일일 타로
// ============================================

export interface DailyTarotResult {
  card: DrawnCard;
  dailyMessage: string;
  loveFocus: string;
  date: string;
}

/**
 * 일일 타로 — 유저+날짜 시드 기반 (같은 날 같은 카드)
 */
export function getDailyTarot(
  userId: string,
  date?: string,
): DailyTarotResult {
  const today = date ?? new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = hashCode(`${userId}-daily-${today}`);

  // 🆕 v23: 시드 기반 카드 선택 (Math.random 오염 없이)
  // 시드로 카드 인덱스 결정 → drawCards 대신 직접 선택
  const { TAROT_CARDS } = require('./cards');
  const totalCards = TAROT_CARDS.length;
  const cardIndex = seed % totalCards;
  const selectedCard = TAROT_CARDS[cardIndex];

  // 역방향 여부도 시드로 결정
  const isReversed = ((seed >> 8) % 100) < 30; // 30% 확률

  const drawn = {
    card: selectedCard,
    isReversed,
  } as ReturnType<typeof drawCards>[number];

  const interpretation = interpretCard(drawn.card, drawn.isReversed);

  return {
    card: {
      ...drawn,
      position: '오늘의 카드',
      interpretation,
    },
    dailyMessage: `오늘의 카드: ${drawn.card.emoji} ${drawn.card.name} ${drawn.isReversed ? '(역방향)' : ''}`,
    loveFocus: drawn.isReversed ? drawn.card.loveReversed : drawn.card.loveUpright,
    date: today,
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}
