/**
 * v110 Tier Router — 세션 종료 시 메모리 파이프라인을 정해진 순서로 실행.
 *
 * 호출자(예: complete/route.ts) 는 이 한 함수만 부르면 됨:
 *   await runSessionEndPipeline({ supabase, userId, sessionId, ... })
 *
 * 내부 순서:
 *   1. episode-builder → luna_episodes INSERT (importance/emotion/tags 포함)
 *   2. persona-distiller → luna_persona_facts (bi-temporal)
 *   3. self-state-updater → luna_self_state (tone/works/fails)
 *   4. weekly reflection — day % 7 == 0 또는 importance ≥ 8 시 비동기
 *
 * 모든 단계는 try/catch 로 감싸 부분 실패 허용 (한 단계 실패 → 다음 단계 계속).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildEpisode } from './episode-builder';
import { distillPersona } from './persona-distiller';
import { updateSelfState } from './self-state-updater';
import { weeklyReflection } from './reflection';
import type { LunaEpisode } from './types';

export interface SessionEndParams {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  dayNumber: number;
  title: string;
  summaryShort: string;
  summaryLong: string;
  rawTurnsRef?: string[];
  scenario?: string;
}

export interface SessionEndResult {
  episodeId: string | null;
  personaInserted: number;
  personaSuperseded: number;
  weeklyDigestId: string | null;
}

export async function runSessionEndPipeline(p: SessionEndParams): Promise<SessionEndResult> {
  const result: SessionEndResult = {
    episodeId: null,
    personaInserted: 0,
    personaSuperseded: 0,
    weeklyDigestId: null,
  };

  // 1. Episode
  try {
    const ep = await buildEpisode({
      supabase: p.supabase,
      userId: p.userId,
      sessionId: p.sessionId,
      dayNumber: p.dayNumber,
      title: p.title,
      summaryShort: p.summaryShort,
      summaryLong: p.summaryLong,
      rawTurnsRef: p.rawTurnsRef,
      scenario: p.scenario,
    });
    result.episodeId = ep?.id ?? null;
  } catch (err) {
    console.warn('[memory-v2/tier-router] episode 단계 실패:', err);
  }

  // 2. Persona facts (episode 가 만들어졌을 때만)
  if (result.episodeId) {
    try {
      const persona = await distillPersona({
        supabase: p.supabase,
        userId: p.userId,
        sourceEpisodeId: result.episodeId,
        summary: p.summaryLong,
        scenario: p.scenario,
      });
      result.personaInserted = persona.inserted;
      result.personaSuperseded = persona.superseded;
    } catch (err) {
      console.warn('[memory-v2/tier-router] persona 단계 실패:', err);
    }
  }

  // 3. Self state
  try {
    await updateSelfState({
      supabase: p.supabase,
      userId: p.userId,
      summary: p.summaryLong,
      dayNumber: p.dayNumber,
      scenario: p.scenario,
    });
  } catch (err) {
    console.warn('[memory-v2/tier-router] self-state 단계 실패:', err);
  }

  // 4. Weekly reflection (조건: day % 7 == 0)
  if (p.dayNumber % 7 === 0 && p.dayNumber > 0) {
    try {
      const weekStart = p.dayNumber - 6;
      const { data: epRows } = await p.supabase
        .from('luna_episodes')
        .select('day_number, title, summary_short, emotion_label, importance')
        .eq('user_id', p.userId)
        .gte('day_number', weekStart)
        .lte('day_number', p.dayNumber)
        .order('day_number', { ascending: true });

      const eps = (epRows ?? []) as Array<Pick<LunaEpisode,
        'day_number' | 'title' | 'summary_short' | 'emotion_label' | 'importance'
      >>;
      if (eps.length > 0) {
        const w = await weeklyReflection({
          supabase: p.supabase,
          userId: p.userId,
          weekStartDay: weekStart,
          episodes: eps,
        });
        result.weeklyDigestId = w?.id ?? null;
      }
    } catch (err) {
      console.warn('[memory-v2/tier-router] weekly reflection 실패:', err);
    }
  }

  return result;
}
