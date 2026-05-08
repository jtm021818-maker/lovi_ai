/**
 * v110 Context Assembler — 매 턴 호출되어 L0~L3 메모리를 토큰 예산 안에 분배 + 조립.
 *
 * 출력: { systemBlocks, userContent } 형태로 prompt-cache-builder 가 만든 구조.
 * 호출자(ACE v5 / dual-brain orchestrator) 는 이 결과를 Claude/Gemini 에 그대로 전달.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { recall } from './recall-orchestrator';
import { buildCachedPrompt, estimateTokens, type CacheBuildResult } from './prompt-cache-builder';
import {
  DEFAULT_BUDGET,
  type MemoryBudget,
  type LunaPersonaFact,
  type LunaSelfState,
  type RecallHit,
} from './types';
// 🆕 v115 인간화 컨텍스트 — 시공간/애칭 (LLM이 활용 여부 자율 결정)
import type { TemporalContext } from '../temporal/temporal-context';
import { formatTemporalBlock } from '../temporal/temporal-context';
import {
  loadNicknameSnapshot,
  formatNicknameBlock,
  type NicknameSnapshot,
} from '../relationship/nickname-state';

export interface AssembleParams {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  userMessage: string;
  systemPrompt: string;
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
  budget?: Partial<MemoryBudget>;
  /** 🆕 v115: 시공간 컨텍스트 (없으면 블록 생략) */
  temporal?: TemporalContext;
  /** 🆕 v115: 애칭 스냅샷을 미리 로드해 넘기는 경우. 없으면 내부에서 supabase 조회 */
  nicknameSnapshot?: NicknameSnapshot;
}

export interface AssembleResult {
  prompt: CacheBuildResult;
  recalledEpisodes: RecallHit[];
  stats: {
    estTokensSystem: number;
    estTokensSelf: number;
    estTokensPersona: number;
    estTokensEpisodes: number;
    estTokensCompressed: number;
    estTokensRecent: number;
  };
}

export async function assembleContext(params: AssembleParams): Promise<AssembleResult> {
  const {
    supabase, userId, sessionId, userMessage,
    systemPrompt, recentTurns,
    budget: budgetOverride,
    temporal,
    nicknameSnapshot: providedNicknameSnap,
  } = params;

  const budget = { ...DEFAULT_BUDGET, ...budgetOverride };

  // 병렬 로드: L1 recall, L2 persona, L3 self, L0 압축 턴 (+ 🆕 v115 애칭 스냅샷)
  const [episodes, personaBlock, selfBlock, compressedBlock, nicknameSnap] = await Promise.all([
    recall({ supabase, userId, userMessage, topK: 4 }),
    loadPersonaBlock(supabase, userId, budget.L2_persona),
    loadSelfStateBlock(supabase, userId, budget.L3_self),
    loadCompressedBlock(supabase, sessionId, budget.L0_compressed),
    providedNicknameSnap ? Promise.resolve(providedNicknameSnap) : loadNicknameSnapshot(supabase, userId),
  ]);

  const episodesBlock = formatEpisodes(episodes, budget.L1_episodes);
  const recentBlock = formatRecent(recentTurns, budget.L0_recent);

  // 🆕 v115 인간화 블록 (LLM은 무시할 자유 있음)
  const temporalBlock = temporal ? formatTemporalBlock(temporal) : '';
  const nicknameBlock = nicknameSnap ? formatNicknameBlock(nicknameSnap) : '';

  const liveBlock = [
    temporalBlock && `[지금 이 순간]\n${temporalBlock}\n※ 이 정보는 참고용. 매 턴 언급할 필요 없고, 분위기로만 흡수해도 됨.`,
    nicknameBlock && `${nicknameBlock}\n※ 새 애칭 만들지/기존 사용/안 부르기 모두 자유. 강요 X.`,
    episodesBlock && `[떠오른 기억들]\n${episodesBlock}\n※ 회상은 선택. 흐름에 안 맞으면 무시. 자기 말로 풀어 — 사실 나열 X.`,
    compressedBlock && `[이번 세션 앞부분 흐름]\n${compressedBlock}`,
    `[방금 대화]\n${recentBlock}`,
    `[유저]\n${userMessage}`,
  ].filter(Boolean).join('\n\n');

  const prompt = buildCachedPrompt({
    systemPrompt,
    selfStateBlock: selfBlock,
    personaFactsBlock: personaBlock,
    liveBlock,
    cacheTTL: '1h',
  });

  return {
    prompt,
    recalledEpisodes: episodes,
    stats: {
      estTokensSystem: estimateTokens(systemPrompt),
      estTokensSelf: estimateTokens(selfBlock ?? ''),
      estTokensPersona: estimateTokens(personaBlock ?? ''),
      estTokensEpisodes: estimateTokens(episodesBlock),
      estTokensCompressed: estimateTokens(compressedBlock ?? ''),
      estTokensRecent: estimateTokens(recentBlock),
    },
  };
}

async function loadPersonaBlock(
  supabase: SupabaseClient,
  userId: string,
  budgetTokens: number,
): Promise<string> {
  const { data } = await supabase
    .from('luna_persona_facts')
    .select('category, key, value, confidence')
    .eq('user_id', userId)
    .is('valid_until', null)
    .gte('confidence', 0.5)
    .order('confidence', { ascending: false })
    .limit(20);

  if (!data || data.length === 0) return '';
  const lines: string[] = [];
  let tokens = 0;
  for (const f of data as LunaPersonaFact[]) {
    const line = `- [${f.category}] ${f.key}: ${f.value}`;
    const t = estimateTokens(line);
    if (tokens + t > budgetTokens) break;
    lines.push(line);
    tokens += t;
  }
  return lines.join('\n');
}

async function loadSelfStateBlock(
  supabase: SupabaseClient,
  userId: string,
  budgetTokens: number,
): Promise<string> {
  const { data } = await supabase
    .from('luna_self_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return '';
  const s = data as LunaSelfState;
  const parts: string[] = [];
  if (s.tone_summary) parts.push(`톤: ${s.tone_summary}`);
  if (s.current_arc) parts.push(`현재 호: ${s.current_arc}`);
  if (s.what_works.length) parts.push(`잘 통하는 것: ${s.what_works.slice(-5).join(', ')}`);
  if (s.what_fails.length) parts.push(`피해야 할 것: ${s.what_fails.slice(-3).join(', ')}`);
  const block = parts.join('\n');
  if (estimateTokens(block) <= budgetTokens) return block;
  return block.slice(0, Math.floor(budgetTokens / 1.3));
}

async function loadCompressedBlock(
  supabase: SupabaseClient,
  sessionId: string,
  budgetTokens: number,
): Promise<string> {
  const { data } = await supabase
    .from('session_compressed_turns')
    .select('one_liner')
    .eq('session_id', sessionId)
    .order('turn_start_idx', { ascending: true });

  if (!data || data.length === 0) return '';
  const lines: string[] = [];
  let tokens = 0;
  for (const r of data as Array<{ one_liner: string }>) {
    const t = estimateTokens(r.one_liner);
    if (tokens + t > budgetTokens) break;
    lines.push(r.one_liner);
    tokens += t;
  }
  return lines.join('\n');
}

function formatEpisodes(episodes: RecallHit[], budgetTokens: number): string {
  if (!episodes.length) return '';
  const lines: string[] = [];
  let tokens = 0;
  for (const ep of episodes) {
    const tag = ep.tags?.length ? ` (${ep.tags.slice(0, 3).join('·')})` : '';
    const line = `- Day ${ep.day_number} · ${ep.title}${tag}: ${ep.summary_short}`;
    const t = estimateTokens(line);
    if (tokens + t > budgetTokens) break;
    lines.push(line);
    tokens += t;
  }
  return lines.join('\n');
}

function formatRecent(
  turns: Array<{ role: 'user' | 'assistant'; content: string }>,
  budgetTokens: number,
): string {
  if (!turns.length) return '';
  const lines: string[] = [];
  let tokens = 0;
  // 끝(최근)부터 채워서 역순으로 모음
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    const role = t.role === 'user' ? '유저' : '루나';
    const line = `${role}: ${t.content}`;
    const tk = estimateTokens(line);
    if (tokens + tk > budgetTokens) break;
    lines.unshift(line);
    tokens += tk;
  }
  return lines.join('\n');
}
