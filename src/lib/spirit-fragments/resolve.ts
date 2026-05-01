/**
 * v102 (rev2): 정령 fragment resolver
 *
 * userId + spiritId → 유저의 실제 세션/추억/프로필 데이터에서 카테고리에 맞는 1건을 추출
 * → 2인칭 templated body 생성. 매칭 실패 시 정적 폴백.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getFragmentTemplate, type SpiritFragmentTemplate } from '@/data/spirit-fragment-templates';

export interface ResolvedFragment {
  spiritId: string;
  title: string;
  body: string;
  sourceLabel: string;
  bridgeOneLiner: string;
  matched: boolean;
}

function fmtKoreanDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  } catch { return ''; }
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

export async function resolveSpiritFragment(
  supabase: SupabaseClient,
  userId: string,
  spiritId: string,
  spiritName: string,
): Promise<ResolvedFragment> {
  const template = getFragmentTemplate(spiritId);
  if (!template) {
    return {
      spiritId,
      title: `내 마음의 페이지 — ${spiritName}`,
      body: '아직 너에게서 떨어져 나오지 않은 결이 있어.\n언젠가 흘러나오면, 그땐 내가 받을게.',
      sourceLabel: '(매칭된 세션 없음)',
      bridgeOneLiner: '',
      matched: false,
    };
  }

  const vars: Record<string, string> = {
    nickname: '너',
    emotion: '그 마음',
    issue: '그 일',
    summary: '',
    date: '',
    sessionTotal: '0',
    lateNightCount: '0',
    actionPlanCount: '0',
    empowerHits: '0',
    lunaImpression: '',
    firstMemoryTitle: '',
    lastMemoryTitle: '',
    wishUsed: '0',
  };

  let matched = false;
  let sourceLabel = '(매칭된 세션 없음 — 너 안에 있는 결로 보냄)';

  // 공통: profile + 닉네임
  const { data: profile } = await supabase
    .from('user_profiles').select('memory_profile, nickname').eq('id', userId).single();
  const mp: any = profile?.memory_profile ?? {};
  if (profile?.nickname) vars.nickname = profile.nickname;
  vars.lunaImpression = mp?.lunaImpression ?? '';
  const dominantEmotions: string[] = mp?.emotionPatterns?.dominantEmotions ?? mp?.dominantEmotions ?? [];
  const mainIssues: string[] = mp?.relationshipContext?.mainIssues ?? mp?.mainIssues ?? [];
  vars.emotion = dominantEmotions[0] ?? '그 마음';
  vars.issue = mainIssues[0] ?? '그 일';

  try {
    switch (template.category) {
      case 'first_step': {
        const { data } = await supabase
          .from('counseling_sessions')
          .select('session_summary, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1);
        const row = data?.[0];
        if (row?.session_summary) {
          vars.date = fmtKoreanDate(row.created_at);
          vars.summary = String(row.session_summary).slice(0, 80);
          matched = true;
          sourceLabel = `참조: ${vars.date} 첫 상담`;
        }
        break;
      }
      case 'late_night': {
        const { data } = await supabase
          .from('counseling_sessions')
          .select('id, created_at')
          .eq('user_id', userId);
        const lateNight = (data ?? []).filter((r: any) => {
          const h = new Date(r.created_at).getHours();
          return h >= 0 && h < 5;
        });
        vars.lateNightCount = String(lateNight.length);
        if (lateNight.length > 0) {
          matched = true;
          sourceLabel = `참조: 새벽 세션 ${lateNight.length}회`;
        }
        break;
      }
      case 'meta_total': {
        const { count } = await supabase
          .from('counseling_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        vars.sessionTotal = String(count ?? 0);
        if ((count ?? 0) > 0) {
          matched = true;
          sourceLabel = `참조: 총 ${count}회 상담`;
        }
        break;
      }
      default: {
        // 카테고리 키워드 매칭 — luna_feeling / session_summary / luna_memories 어느 쪽에서든
        const keywordMap: Record<string, string[]> = {
          comfort_grief: ['슬픔', '눈물', '울', '위로'],
          anger: ['분노', '화', '억울', '짜증'],
          pacing: ['흔들', '박자', '템포', '리듬'],
          analysis: ['분석', '정리', '리프레임', '생각'],
          reaching_out: ['먼저', '연락', '재회', '용기'],
          lightness: ['가벼', '웃', '편안', '쉬'],
          mood_shift: ['환기', '바꿔', '분위기', '환'],
          letter_draft: ['편지', '초안', '쓸까', '쓸지'],
          romance_excite: ['설렘', '두근', '좋아해', '빠짐'],
          roleplay: ['역할', '롤플', '입장'],
          long_session: ['길게', '오래', '한참'],
          breakup: ['이별', '헤어짐', '끝났', '이별 위기'],
          crisis_calm: ['끓어', '진정', '폭발', '위기'],
          decision: ['결단', '결심', 'action', '행동'],
          empower: ['empower', '성장', '한 단계', '벗어'],
          memory_recall: ['기억', '회상', '잊지', '추억'],
          self_esteem: ['자존감', '내가 왜', '내 잘못', '자책'],
          wish: ['소원', '바람', '빌었', '되었으면'],
        };
        const kws = keywordMap[template.category] ?? [];
        if (kws.length > 0) {
          // counseling_sessions 에서 가장 최근 매칭 1건
          const { data: rows } = await supabase
            .from('counseling_sessions')
            .select('session_summary, created_at')
            .eq('user_id', userId)
            .not('session_summary', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20);
          const hit = (rows ?? []).find((r: any) =>
            kws.some((k) => String(r.session_summary).includes(k))
          );
          if (hit?.session_summary) {
            vars.date = fmtKoreanDate(hit.created_at);
            vars.summary = String(hit.session_summary).slice(0, 80);
            matched = true;
            sourceLabel = `참조: ${vars.date} 상담`;
          } else {
            // user_memories.luna_feeling 도 시도
            const { data: m } = await supabase
              .from('user_memories')
              .select('luna_feeling, created_at')
              .eq('user_id', userId)
              .not('luna_feeling', 'is', null)
              .order('created_at', { ascending: false })
              .limit(20);
            const mhit = (m ?? []).find((r: any) =>
              kws.some((k) => String(r.luna_feeling).includes(k))
            );
            if (mhit?.luna_feeling) {
              vars.date = fmtKoreanDate(mhit.created_at);
              vars.summary = String(mhit.luna_feeling).slice(0, 80);
              matched = true;
              sourceLabel = `참조: ${vars.date} 추억`;
            }
          }
        }
        break;
      }
    }
  } catch (err) {
    console.warn('[fragment.resolve] error', err);
  }

  const body = matched ? fillTemplate(template.matched, vars) : template.fallback;

  return {
    spiritId,
    title: `내 마음의 페이지 — ${spiritName}`,
    body,
    sourceLabel,
    bridgeOneLiner: template.bridgeOneLiner,
    matched,
  };
}

export type { SpiritFragmentTemplate };
