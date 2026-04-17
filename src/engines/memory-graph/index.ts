/**
 * 🧠 Memory Graph — HippoRAG (v70 Phase D)
 *
 * 인간 해마 CA3 영역의 패턴 연상 모방.
 * 개념 노드 + 엣지로 구성된 그래프.
 *
 * 사용:
 *   // 회상
 *   const nodes = await recallFromGraph(supabase, queryEmbedding, userId);
 *
 *   // 저장 (Phase 전환/reflection 시)
 *   await upsertNode(supabase, { userId, concept, nodeType, embedding });
 *   await upsertEdge(supabase, { sourceNode, targetNode, relation });
 *
 * Phase D 는 기반 인프라만 제공. 실제 추출/저장은 Phase E 이후.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const ENABLED = process.env.LUNA_GRAPH_V70 !== '0';

export type NodeType = 'person' | 'event' | 'emotion' | 'place' | 'object' | 'theme' | 'action';

export interface MemoryNode {
  id: string;
  user_id: string;
  concept: string;
  node_type: NodeType;
  importance: number;
  retention_score: number;
  access_count: number;
}

export interface RecallResult {
  node_id: string;
  concept: string;
  node_type: NodeType;
  score: number;
  hop: number;
}

// ============================================================
// 회상 — RPC recall_memory_graph 호출
// ============================================================

export async function recallFromGraph(
  supabase: SupabaseClient | null,
  queryEmbedding: number[],
  userId: string,
  topK = 8,
  seedK = 3,
): Promise<RecallResult[]> {
  if (!ENABLED || !supabase || !queryEmbedding || queryEmbedding.length !== 768) return [];

  try {
    const { data, error } = await supabase.rpc('recall_memory_graph', {
      query_embedding: queryEmbedding,
      p_user_id: userId,
      top_k: topK,
      seed_k: seedK,
    });

    if (error) {
      // 마이그레이션 아직 안 됐거나 함수 없으면 조용히 빈 배열
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        console.log('[Memory:Graph] 🔗 RPC 없음 (마이그레이션 미적용)');
        return [];
      }
      console.warn('[Memory:Graph] ❌ recall RPC 실패:', error.message);
      return [];
    }

    const results = (data as any[] | null) ?? [];
    if (results.length > 0) {
      console.log(`[Memory:Graph] 🔗 HippoRAG 회상 ${results.length}건 (seeds=${seedK}, topK=${topK}): ${results.map((r: any) => `${r.concept}[${r.node_type}/${r.hop === 0 ? '직접' : '연상'}]`).join(' | ')}`);
    }
    return results;
  } catch (e: any) {
    console.warn('[MemoryGraph] recallFromGraph 예외:', e?.message);
    return [];
  }
}

// ============================================================
// RIF 스코어 에피소드 회상 (message_memories 기반)
// ============================================================

export async function recallEpisodesRIF(
  supabase: SupabaseClient | null,
  queryEmbedding: number[],
  userId: string,
  matchCount = 5,
): Promise<Array<{ id: string; content: string; rif_score: number; days_ago: number; sender_type: string }>> {
  if (!ENABLED || !supabase || !queryEmbedding) return [];

  try {
    const { data, error } = await supabase.rpc('recall_episodes_rif', {
      query_embedding: queryEmbedding,
      p_user_id: userId,
      match_count: matchCount,
    });

    if (error) {
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        return [];
      }
      console.warn('[MemoryGraph] RIF RPC 실패:', error.message);
      return [];
    }

    return (data as any[] | null) ?? [];
  } catch (e: any) {
    console.warn('[MemoryGraph] recallEpisodesRIF 예외:', e?.message);
    return [];
  }
}

// ============================================================
// 노드 upsert — 중복 시 access_count 증가 + importance 갱신
// ============================================================

export async function upsertNode(
  supabase: SupabaseClient | null,
  params: {
    userId: string;
    concept: string;
    nodeType: NodeType;
    embedding?: number[];
    importance?: number;
  },
): Promise<{ success: boolean; nodeId?: string }> {
  if (!ENABLED || !supabase) return { success: false };

  const { userId, concept, nodeType, embedding, importance } = params;
  const cleanConcept = String(concept ?? '').trim().slice(0, 80);
  if (!cleanConcept) return { success: false };

  try {
    // UNIQUE(user_id, concept, node_type) 로 upsert
    const { data, error } = await supabase
      .from('memory_nodes')
      .upsert(
        {
          user_id: userId,
          concept: cleanConcept,
          node_type: nodeType,
          embedding: embedding ?? null,
          importance: importance ?? 0.5,
          last_accessed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,concept,node_type' },
      )
      .select('id')
      .single();

    if (error) {
      console.warn('[MemoryGraph] node upsert 실패:', error.message);
      return { success: false };
    }

    // access_count 증가 (fire-and-forget)
    if (data?.id) {
      supabase.rpc('increment_node_access', { node_id: data.id }).then(() => {});
    }

    return { success: true, nodeId: data?.id };
  } catch (e: any) {
    console.warn('[MemoryGraph] upsertNode 예외:', e?.message);
    return { success: false };
  }
}

// ============================================================
// 엣지 upsert — 중복 시 strengthen_count 증가 + weight 강화
// ============================================================

export async function upsertEdge(
  supabase: SupabaseClient | null,
  params: {
    userId: string;
    sourceNode: string;
    targetNode: string;
    relationType: string;
    weight?: number;
  },
): Promise<{ success: boolean }> {
  if (!ENABLED || !supabase) return { success: false };

  try {
    const { error } = await supabase
      .from('memory_edges')
      .upsert(
        {
          user_id: params.userId,
          source_node: params.sourceNode,
          target_node: params.targetNode,
          relation_type: params.relationType.slice(0, 40),
          weight: params.weight ?? 0.5,
          strengthened_at: new Date().toISOString(),
        },
        { onConflict: 'source_node,target_node,relation_type' },
      );

    if (error) {
      console.warn('[MemoryGraph] edge upsert 실패:', error.message);
      return { success: false };
    }

    return { success: true };
  } catch (e: any) {
    console.warn('[MemoryGraph] upsertEdge 예외:', e?.message);
    return { success: false };
  }
}

// ============================================================
// 좌뇌 컨텍스트용 포맷터
// ============================================================

export function formatGraphRecallForContext(results: RecallResult[]): string {
  if (!results || results.length === 0) return '';
  const lines = ['## 🔗 연관 개념 (HippoRAG 회상)'];
  for (const r of results.slice(0, 8)) {
    lines.push(`  - ${r.concept} [${r.node_type}] (${r.hop === 0 ? '직접' : '연상'}, score=${r.score.toFixed(2)})`);
  }
  return lines.join('\n');
}
