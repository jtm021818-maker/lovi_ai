/**
 * v110 Decay Engine — Ebbinghaus 망각 곡선 + 회상 강화.
 *
 *   R(t) = exp(-t / S)
 *   S    = 7 + importance + 14 * recall_count   (단위: 일)
 *
 * 일 1회 cron (run_episode_decay) 으로 decay_strength 갱신.
 * 회상 시 reinforce_episodes RPC 가 strength += 0.1, recall_count += 1.
 *
 * 클라이언트 코드는 보통 이 모듈 안 부르고 RPC 만 사용. 단위 테스트/시뮬레이션용.
 */

import type { LunaEpisode } from './types';

export function stabilityDays(importance: number, recallCount: number): number {
  return 7 + importance + 14 * recallCount;
}

export function daysBetween(from: Date | string, to: Date | string = new Date()): number {
  const a = typeof from === 'string' ? new Date(from) : from;
  const b = typeof to === 'string' ? new Date(to) : to;
  return Math.max(0, (b.getTime() - a.getTime()) / 86400_000);
}

/**
 * 현재 강도 (0~1). recall 한 번이라도 있으면 last_recalled_at 기준,
 * 아니면 created_at 기준으로 t 측정.
 */
export function currentStrength(ep: Pick<LunaEpisode,
  'importance' | 'recall_count' | 'last_recalled_at' | 'created_at'
>, now: Date = new Date()): number {
  const anchor = ep.last_recalled_at ?? ep.created_at;
  const t = daysBetween(anchor, now);
  const S = stabilityDays(ep.importance, ep.recall_count);
  return Math.max(0, Math.min(1, Math.exp(-t / S)));
}

/** decay 후 검색에서 제외해도 되는지 (검색 가중치 0 처리용) */
export function isPracticallyForgotten(ep: Pick<LunaEpisode,
  'decay_strength' | 'importance'
>): boolean {
  return ep.decay_strength < 0.05 && ep.importance < 4;
}
