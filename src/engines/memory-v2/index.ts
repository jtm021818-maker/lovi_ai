/**
 * v110 Long-term Memory System — barrel export.
 * 설계서: docs/luna-longterm-memory-v110-plan.md
 *
 * 사용 예 (세션 종료):
 *   import { runSessionEndPipeline } from '@/engines/memory-v2';
 *   await runSessionEndPipeline({ supabase, userId, sessionId, dayNumber, ... });
 *
 * 사용 예 (응답 생성 시 컨텍스트 조립):
 *   import { assembleContext } from '@/engines/memory-v2';
 *   const { prompt, recalledEpisodes } = await assembleContext({
 *     supabase, userId, sessionId, userMessage, systemPrompt, recentTurns,
 *   });
 *   // prompt.systemBlocks → Claude system 파라미터
 *   // prompt.userContent  → 마지막 user 메시지 content
 */

export * from './types';
export { embed, embedMany, EMBEDDING_DIM } from './embedder';
export { currentStrength, daysBetween, isPracticallyForgotten, stabilityDays } from './decay-engine';
export { recall } from './recall-orchestrator';
export { scoreImportance } from './importance-scorer';
export { buildEpisode } from './episode-builder';
export { distillPersona } from './persona-distiller';
export { updateSelfState } from './self-state-updater';
export { compressTurns } from './turn-compressor';
export { weeklyReflection } from './reflection';
export { buildCachedPrompt, estimateTokens } from './prompt-cache-builder';
export { assembleContext } from './context-assembler';
export { runSessionEndPipeline } from './tier-router';
