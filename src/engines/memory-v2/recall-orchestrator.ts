/**
 * v110 Recall Orchestrator — 매 유저 메시지마다 Hybrid 검색 + IRR 가중 + MMR 다양화.
 *
 * 파이프라인:
 *   1. 짧은 인사 류는 검색 스킵
 *   2. embed (768d Gemini)
 *   3. dense (match_luna_episodes RPC) + keyword (search_luna_episodes_keyword RPC) 병렬
 *   4. RRF (Reciprocal Rank Fusion) 로 통합
 *   5. IRR 가중: score = α·recency + β·importance + γ·relevance + δ·decay
 *   6. MMR 다양화 → 상위 3~5개
 *   7. reinforce_episodes RPC 로 강화 (decay_strength += 0.1, recall_count += 1)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { embed } from './embedder';
import { daysBetween } from './decay-engine';
import {
  DEFAULT_WEIGHTS,
  type RecallHit,
  type RecallWeights,
} from './types';

export interface RecallParams {
  supabase: SupabaseClient;
  userId: string;
  userMessage: string;
  topK?: number;
  weights?: RecallWeights;
  reinforce?: boolean;
  recencyTau?: number;        // days, recency 감쇠 시정수
  mmrLambda?: number;         // 0~1, 유사도 vs 다양성 (0.65 권장)
}

export async function recall(params: RecallParams): Promise<RecallHit[]> {
  const {
    supabase,
    userId,
    userMessage,
    topK = 4,
    weights = DEFAULT_WEIGHTS,
    reinforce: doReinforce = true,
    recencyTau = 14,
    mmrLambda = 0.65,
  } = params;

  // 1. 짧은 인사 류는 스킵
  if (shouldSkipRecall(userMessage)) return [];

  // 2. 임베딩
  const emb = await embed(userMessage);
  if (!emb) return [];

  // 3. 병렬 검색
  const [denseRes, sparseRes] = await Promise.all([
    supabase.rpc('match_luna_episodes', {
      query_embedding: emb.embedding,
      p_user_id: userId,
      match_threshold: 0.3,
      match_count: 20,
    }),
    supabase.rpc('search_luna_episodes_keyword', {
      p_user_id: userId,
      p_keywords: userMessage.slice(0, 200),
      match_count: 20,
    }),
  ]);

  const dense = ((denseRes.data ?? []) as RecallHit[]).map((h, i) => ({ hit: h, rank: i + 1 }));
  const sparse = ((sparseRes.data ?? []) as RecallHit[]).map((h, i) => ({ hit: h, rank: i + 1 }));

  // 4. RRF (k = 60)
  const fused = rrfFuse(dense, sparse, 60).slice(0, 10);

  // 5. IRR 재스코어링
  const now = new Date();
  const scored = fused.map((ep) => {
    const recency = expDecay(daysBetween(ep.created_at, now), recencyTau);
    const importance = ep.importance / 10;
    const relevance = ep.similarity ?? 0; // dense cosine
    const decay = ep.decay_strength;
    const score =
      weights.recency * recency +
      weights.importance * importance +
      weights.relevance * relevance +
      weights.decay * decay;
    return { ...ep, score };
  }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // 6. MMR 다양화
  const picked = mmr(scored, topK, mmrLambda);

  // 7. 강화
  if (doReinforce && picked.length > 0) {
    const ids = picked.map((p) => p.id);
    supabase.rpc('reinforce_episodes', {
      p_user_id: userId,
      p_ids: ids,
      p_bump: 0.1,
    }).then(({ error }) => {
      if (error) console.warn('[memory-v2/recall] reinforce 실패:', error);
    });
  }

  return picked;
}

function shouldSkipRecall(msg: string): boolean {
  const t = msg.trim();
  if (t.length < 6) return true;
  // 명확한 인사/감탄 한두 단어 패턴은 스킵 (보수적: 길이만 본다 — 키워드 분기 금지 원칙 준수)
  return false;
}

function expDecay(days: number, tau: number): number {
  return Math.exp(-days / tau);
}

/** Reciprocal Rank Fusion — 두 랭킹을 합산 */
function rrfFuse(
  a: Array<{ hit: RecallHit; rank: number }>,
  b: Array<{ hit: RecallHit; rank: number }>,
  k = 60,
): RecallHit[] {
  const map = new Map<string, { hit: RecallHit; score: number }>();
  for (const { hit, rank } of a) {
    const cur = map.get(hit.id) ?? { hit, score: 0 };
    cur.score += 1 / (k + rank);
    map.set(hit.id, cur);
  }
  for (const { hit, rank } of b) {
    const cur = map.get(hit.id) ?? { hit, score: 0 };
    cur.score += 1 / (k + rank);
    map.set(hit.id, cur);
  }
  return Array.from(map.values())
    .sort((x, y) => y.score - x.score)
    .map((x) => x.hit);
}

/**
 * MMR — 이미 뽑힌 결과와 너무 유사한 후보는 페널티.
 * 본격 임베딩 비교 대신 day_number / tags / related_people 겹침으로 근사.
 */
function mmr(scored: RecallHit[], k: number, lambda = 0.65): RecallHit[] {
  if (scored.length <= k) return scored;
  const picked: RecallHit[] = [];
  const remaining = [...scored];

  while (picked.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const rel = cand.score ?? 0;
      const sim = picked.length === 0
        ? 0
        : Math.max(...picked.map((p) => surrogateSim(cand, p)));
      const mmrVal = lambda * rel - (1 - lambda) * sim;
      if (mmrVal > bestVal) {
        bestVal = mmrVal;
        bestIdx = i;
      }
    }
    picked.push(remaining.splice(bestIdx, 1)[0]);
  }
  return picked;
}

function surrogateSim(a: RecallHit, b: RecallHit): number {
  let s = 0;
  if (a.day_number === b.day_number) s += 0.3;
  if (a.emotion_label && a.emotion_label === b.emotion_label) s += 0.2;
  s += jaccard(a.tags, b.tags) * 0.3;
  s += jaccard(a.related_people, b.related_people) * 0.2;
  return Math.min(1, s);
}

function jaccard(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  A.forEach((x) => { if (B.has(x)) inter++; });
  return inter / (A.size + B.size - inter);
}
