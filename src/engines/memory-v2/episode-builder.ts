/**
 * v110 Episode Builder — 세션 종료 시 luna_episodes row 1개를 생성.
 *
 * 입력: 세션 ID + 요약(generate-summary) + 최근 메시지들 + scenario
 * 출력: { id } 또는 null
 *
 * 무료 캐스케이드. 기존 generate-summary 결과를 받아 importance/emotion/tags 만 추가 추출.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { embed } from './embedder';
import { scoreImportance } from './importance-scorer';

interface BuildParams {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  dayNumber: number;
  title: string;             // extract-luna-memory-card 의 title 재사용
  summaryShort: string;      // 1줄 (≤80자)
  summaryLong: string;       // generate-summary 결과 (200~400자)
  rawTurnsRef?: string[];    // message id 들
  scenario?: string;
}

export async function buildEpisode(params: BuildParams): Promise<{ id: string } | null> {
  const {
    supabase, userId, sessionId, dayNumber,
    title, summaryShort, summaryLong, rawTurnsRef, scenario,
  } = params;

  if (!summaryLong || summaryLong.trim().length < 20) return null;

  // 1. importance + emotion + tags
  const score = await scoreImportance({ summary: summaryLong, scenario });

  // 2. 임베딩 (title + summary_long 결합 → 회상 시 정확도 ↑)
  const embText = `${title}\n${summaryShort}\n${summaryLong}`;
  const emb = await embed(embText);

  // 3. INSERT
  const { data, error } = await supabase
    .from('luna_episodes')
    .insert({
      user_id: userId,
      session_id: sessionId,
      day_number: dayNumber,
      title: title.slice(0, 30),
      summary_short: summaryShort.slice(0, 100),
      summary_long: summaryLong.slice(0, 800),
      emotion_label: score.emotion_label,
      emotion_scores: score.emotion_scores,
      importance: score.importance,
      decay_strength: 1.0,
      recall_count: 0,
      tags: score.tags,
      related_people: score.related_people,
      embedding: emb?.embedding ?? null,
      raw_turns_ref: rawTurnsRef ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[memory-v2/episode-builder] INSERT 실패:', error);
    return null;
  }

  return { id: data.id };
}
