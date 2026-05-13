/**
 * 🆕 v117: MemoryCardWriter — 레벨업 시 기억 카드 1장 생성 + DB 삽입.
 *
 * fire-and-forget. 실패해도 channel 자체는 안 깨짐.
 * 호출 위치: src/app/api/chat/stream/route.ts (intimacy_level_up 이벤트 옆).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  synthesizeMemoryCaption,
  getMemorySlotForLevel,
} from '@/lib/ai/memory-caption-synthesizer';

interface CreateMemoryCardArgs {
  supabase: SupabaseClient;
  userId: string;
  persona: 'luna' | 'tarot';
  newLevel: number;
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * 기억 카드 fire-and-forget 생성.
 *
 * 흐름:
 *   1. newLevel 에 매핑되는 메모리 슬롯/트리거 조회
 *   2. 이미 그 슬롯이 있으면 skip (중복 방지)
 *   3. LLM 캡션 생성 (Gemini Flash-Lite)
 *   4. relationship_memories 에 upsert
 */
export async function createMemoryCardForLevelUp(args: CreateMemoryCardArgs): Promise<void> {
  const { supabase, userId, persona, newLevel, recentTurns } = args;

  try {
    const mapping = getMemorySlotForLevel(newLevel);
    if (!mapping) {
      console.log(`[MemoryCard] Lv.${newLevel} — 매핑된 슬롯 없음, skip`);
      return;
    }

    // 중복 방지 — 이미 그 슬롯에 카드 있으면 skip
    const { data: existing } = await supabase
      .from('relationship_memories')
      .select('id')
      .eq('user_id', userId)
      .eq('persona', persona)
      .eq('slot_index', mapping.slot)
      .maybeSingle();

    if (existing) {
      console.log(`[MemoryCard] 슬롯 ${mapping.slot} 이미 존재 — skip`);
      return;
    }

    // LLM 캡션 생성
    const synthesized = await synthesizeMemoryCaption({
      triggerType: mapping.trigger,
      level: newLevel,
      recentTurns,
    });

    const { error } = await supabase
      .from('relationship_memories')
      .insert({
        user_id: userId,
        persona,
        slot_index: mapping.slot,
        level: newLevel,
        trigger_type: mapping.trigger,
        llm_caption: synthesized.caption,
        source_summary: synthesized.summary,
      });

    if (error) {
      console.warn('[MemoryCard] insert 실패:', error.message);
      return;
    }

    console.log(
      `[MemoryCard] 🎴 슬롯 ${mapping.slot} 생성: "${synthesized.caption.slice(0, 40)}..." (Lv.${newLevel} / ${mapping.trigger})`,
    );
  } catch (e) {
    console.warn('[MemoryCard] 예외:', (e as Error).message);
  }
}

/**
 * 첫 메모리 카드 (first_meet) 생성 — 채팅 1턴째 fire-and-forget.
 * (레벨 1 부터 시작이라 별도 트리거 필요)
 */
export async function ensureFirstMeetCard(args: CreateMemoryCardArgs): Promise<void> {
  // newLevel 강제로 1 로 — 슬롯 1 (first_meet) 대상
  await createMemoryCardForLevelUp({ ...args, newLevel: 1 });
}
