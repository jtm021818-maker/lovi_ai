/**
 * 📱 KBE (Kakao Behavior Engine) — 외부 API
 *
 * 사용:
 *   import { runKBE, KBE_CONFIG } from '@/engines/kbe';
 *
 *   for await (const chunk of runKBE({ ... })) {
 *     if (chunk.type === 'text') yield { type: 'text', data: chunk.data };
 *     if (chunk.type === 'sticker') yield { type: 'sticker', data: chunk.data };
 *     if (chunk.type === 'typing') yield { type: 'typing', data: chunk.data };
 *     if (chunk.type === 'event') yield { type: 'phase_event', data: chunk.data };
 *   }
 */

export {
  runKBE,
  detectUserStyle,
  getKakaoActionPlanOnly,
  type RunKbeParams,
} from './orchestrator';

export {
  planKakaoAction,
} from './kakao-action-planner';

export {
  executeKakaoAction,
  executeKakaoActionTextOnly,
  estimatePlanDuration,
} from './transmission-executor';

export {
  KAKAO_ACTION_SYSTEM_PROMPT,
  buildKbeUserMessage,
} from './kakao-action-prompt';

export {
  KBE_CONFIG,
  logKbeTurn,
  planToLogEntry,
  getKbeStats,
  type KbeLogEntry,
} from './config';

export type {
  Burst,
  StickerId,
  StickerPlan,
  KakaoEventType,
  EventTrigger,
  KakaoActionPlan,
  KbeInput,
  KbeStreamChunk,
} from './types';
