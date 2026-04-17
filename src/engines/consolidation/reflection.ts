/**
 * 🧠 Consolidation Reflection (v70 Phase C-1)
 *
 * 10턴마다 LLM 이 최근 대화를 상위 추상화.
 * Generative Agents (Park et al.) 의 reflection 단계 차용.
 *
 * 결과:
 *   - session_scratchpad.situation_summary 갱신
 *   - user_primary_stance, unresolved_points 업데이트
 *   - 새로 드러난 테마는 session_threads 에 upsert
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkingMemoryScratchpad } from '@/engines/working-memory';
import { generateWithProvider, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { safeParseLLMJson } from '@/lib/utils/safe-json';

const ENABLED = process.env.LUNA_CONS_V70 !== '0';

interface ReflectionResult {
  situation_summary?: string;
  user_primary_stance?: string;
  main_topic?: string;
  key_characters?: string[];
  unresolved_points?: string[];
  new_themes?: Array<{ theme: string; importance: number }>;
}

/**
 * 10턴 reflection 수행 → scratchpad.session_scratchpad 업데이트 + 새 테마 감지
 * 비용: Gemini 2.5 Flash Lite 1회 (~$0.0001)
 */
export async function performReflection(
  supabase: SupabaseClient | null,
  userId: string,
  sessionId: string,
  scratchpad: WorkingMemoryScratchpad,
): Promise<ReflectionResult | null> {
  if (!ENABLED) {
    console.log('[Memory:Reflection] ⏸️ 비활성 (LUNA_CONS_V70=0)');
    return null;
  }
  if (scratchpad.recent_turns.length < 4) {
    console.log(`[Memory:Reflection] ⏸️ 너무 이름 (recent_turns=${scratchpad.recent_turns.length})`);
    return null;
  }
  console.log(`[Memory:Reflection] 🧠 시작: turn=${scratchpad.turn_idx}, recent=${scratchpad.recent_turns.length}턴, cards=${Object.keys(scratchpad.filled_cards).length}개`);

  // 대화 요약 조립
  const recentLines = scratchpad.recent_turns
    .map(t => `[T${t.turn_idx} ${t.role}] ${t.content.slice(0, 150)}`)
    .join('\n');

  const emotionLine = scratchpad.emotion_trajectory
    .slice(-5)
    .map(e => `T${e.turn}=${e.score}${e.primary_emotion ? `(${e.primary_emotion})` : ''}`)
    .join(' → ');

  const filledCardsText = Object.values(scratchpad.filled_cards)
    .map(c => `${c.key}="${c.value}"`)
    .join(', ');

  const systemPrompt = `너는 상담 대화의 "중간 성찰자" 역할.
최근 10턴 대화를 읽고 상위 수준 요약을 JSON 으로 출력.

## 출력 형식 (순수 JSON, 코드블록 없이)
{
  "situation_summary": "현재 상황 한 문장 (50자 이내)",
  "user_primary_stance": "유저의 핵심 감정/입장 (40자 이내)",
  "main_topic": "핵심 주제 한 단어 (예: '여친과 청소 갈등')",
  "key_characters": ["등장인물 배열"],
  "unresolved_points": ["아직 풀리지 않은 포인트들 최대 3개"],
  "new_themes": [{"theme": "새 장기 테마", "importance": 0.6}]
}

## 규칙
- 이미 filled_cards 에 있는 정보 중복 저장 X
- 유저 단어 그대로 인용 선호
- new_themes 는 세션 종료 후에도 기억할 가치 있는 것만 (평균 0~1개)
- 확신 없으면 빈 배열/null`;

  const userPrompt = `## 최근 대화
${recentLines}

## 감정 궤적
${emotionLine || '(없음)'}

## 이미 파악된 카드
${filledCardsText || '(없음)'}

## 이전 요약 (있을 때)
${scratchpad.session_scratchpad.situation_summary ?? '(없음)'}

위를 종합해서 현재 상황을 정리해. JSON 만 출력.`;

  try {
    const raw = await Promise.race([
      generateWithProvider(
        'gemini',
        systemPrompt,
        [{ role: 'user' as const, content: userPrompt }],
        'haiku',
        600,
        GEMINI_MODELS.FLASH_LITE_25,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('reflection_timeout')), 5000),
      ),
    ]);

    const parsed = safeParseLLMJson(raw, null as any);
    if (!parsed) {
      console.warn('[Reflection] JSON 파싱 실패');
      return null;
    }

    const result: ReflectionResult = {
      situation_summary: safeStr(parsed.situation_summary, 100),
      user_primary_stance: safeStr(parsed.user_primary_stance, 80),
      main_topic: safeStr(parsed.main_topic, 50),
      key_characters: Array.isArray(parsed.key_characters) ? parsed.key_characters.map(String).slice(0, 5) : undefined,
      unresolved_points: Array.isArray(parsed.unresolved_points) ? parsed.unresolved_points.map(String).slice(0, 3) : undefined,
      new_themes: Array.isArray(parsed.new_themes)
        ? parsed.new_themes.map((t: any) => ({
          theme: String(t.theme ?? '').slice(0, 80),
          importance: Math.max(0, Math.min(1, Number(t.importance ?? 0.5))),
        })).filter((t: any) => t.theme.length > 3)
        : undefined,
    };

    // 새 테마 session_threads 에 upsert (fire-and-forget)
    if (supabase && result.new_themes && result.new_themes.length > 0) {
      console.log(`[Memory:Reflection] 🧵 새 테마 ${result.new_themes.length}개 세션 스레드로 저장:`, result.new_themes.map(t => `"${t.theme}"(${t.importance.toFixed(2)})`).join(' | '));
      for (const th of result.new_themes) {
        supabase
          .from('session_threads')
          .insert({
            user_id: userId,
            session_id: sessionId,
            theme: th.theme,
            status: 'open',
            importance: th.importance,
            last_referenced_at: new Date().toISOString(),
            reference_count: 1,
          } as any)
          .then(({ error }) => {
            if (error && !error.message?.includes('duplicate')) {
              console.warn(`[Memory:Reflection] ❌ 스레드 insert 실패 "${th.theme}":`, error.message);
            }
          });
      }
    }

    console.log(`[Memory:Reflection] ✅ 완료 | 주제="${result.main_topic ?? '?'}" | 요약="${result.situation_summary ?? '?'}" | 유저상태="${result.user_primary_stance ?? '?'}" | 미해결=${result.unresolved_points?.length ?? 0}개`);
    return result;
  } catch (e: any) {
    console.warn('[Reflection] 실패:', e?.message);
    return null;
  }
}

function safeStr(v: any, maxLen: number): string | undefined {
  if (typeof v !== 'string' || v.trim().length === 0) return undefined;
  return v.slice(0, maxLen);
}

/**
 * 10턴 간격 판단 (turn_idx % 10 === 0 등)
 * 턴 2, 12, 22, ... 에서 발동.
 */
export function shouldTriggerReflection(turnIdx: number): boolean {
  if (turnIdx < 2) return false;
  // 2, 8, 14, 20 ... 매 6턴 정도로 자주
  return turnIdx >= 2 && (turnIdx - 2) % 6 === 0;
}
