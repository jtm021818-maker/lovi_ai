/**
 * 🦊 Luna Identity Drift — 외부 API
 *
 * 사용:
 *   import { loadLunaIdentity, applyIdentityUpdate, saveLunaIdentity, buildIdentityHandoff } from '@/engines/luna-identity';
 *
 *   // 세션 시작 시
 *   const identity = await loadLunaIdentity(supabase, userId);
 *   const handoff = buildIdentityHandoff(identity);
 *
 *   // 좌뇌 input.personalProfile 에 주입
 *   const additions = identityToPersonalProfileAdditions(identity);
 *
 *   // 세션 중 업데이트
 *   const next = applyIdentityUpdate(identity, {
 *     trait_deltas: { '유머': 0.05 },
 *     increment_shared: true,
 *   });
 *
 *   // 세션 종료 시 저장
 *   await saveLunaIdentity(supabase, next);
 */

export {
  loadLunaIdentity,
  saveLunaIdentity,
  applyIdentityUpdate,
  buildIdentityHandoff,
  identityToPersonalProfileAdditions,
} from './store';

export type {
  LunaIdentityWithUser,
  RelationshipPhase,
  InsideJoke,
  LunaPerception,
  IdentityUpdateInput,
  IdentityHandoff,
} from './types';
