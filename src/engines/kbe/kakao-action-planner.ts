/**
 * 📱 Kakao Action Planner
 *
 * Gemini 2.5 Flash Lite 가 "친구라면 이걸 어떻게 보낼까?" 판단.
 * 비용 턴당 ~$0.0001 (저렴).
 *
 * 실패 시 fallback: Claude 원문을 그대로 한 버스트로 전송 (최악 시나리오 대비).
 */

import { generateWithProvider, GEMINI_MODELS } from '@/lib/ai/provider-registry';
import { KAKAO_ACTION_SYSTEM_PROMPT, buildKbeUserMessage } from './kakao-action-prompt';
import type {
  KakaoActionPlan,
  KbeInput,
  StickerId,
  KakaoEventType,
  Burst,
  StickerPlan,
  EventTrigger,
} from './types';

// ============================================================
// 메인 플래너
// ============================================================

export async function planKakaoAction(
  input: KbeInput,
): Promise<{ plan: KakaoActionPlan; latencyMs: number; usedFallback: boolean }> {
  const t0 = Date.now();

  try {
    const userMessage = buildKbeUserMessage(input);

    const raw = await Promise.race([
      generateWithProvider(
        'gemini',
        KAKAO_ACTION_SYSTEM_PROMPT,
        [{ role: 'user' as const, content: userMessage }],
        'haiku',
        800,
        GEMINI_MODELS.FLASH_LITE_25,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('kbe_timeout')), 4000),
      ),
    ]);

    const parsed = parseKakaoPlan(raw, input);
    if (!parsed) {
      // JSON 파싱 실패 → fallback
      return {
        plan: buildFallbackPlan(input),
        latencyMs: Date.now() - t0,
        usedFallback: true,
      };
    }

    // 가드레일 적용 (최소 규칙)
    const guarded = applyGuardrails(parsed, input);

    return {
      plan: guarded,
      latencyMs: Date.now() - t0,
      usedFallback: false,
    };
  } catch {
    return {
      plan: buildFallbackPlan(input),
      latencyMs: Date.now() - t0,
      usedFallback: true,
    };
  }
}

// ============================================================
// JSON 파싱 + 검증
// ============================================================

function parseKakaoPlan(raw: string, input: KbeInput): KakaoActionPlan | null {
  if (!raw) return null;

  let text = raw.trim();
  text = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '');
  text = text.replace(/^```\s*/, '').replace(/\s*```\s*$/, '');

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;

  try {
    const p = JSON.parse(text.slice(firstBrace, lastBrace + 1));

    // bursts 파싱
    const bursts: Burst[] = Array.isArray(p.bursts)
      ? p.bursts
          .filter((b: any) => b && typeof b.text === 'string' && b.text.trim())
          .map((b: any) => ({
            text: String(b.text).trim(),
            delay_before_ms: clamp(Number(b.delay_before_ms ?? 1500), 0, 60000),
            show_typing: Boolean(b.show_typing),
          }))
      : [];

    // silence=true 면 bursts 필요 없음
    const silence = Boolean(p.silence);

    // sticker 파싱
    let sticker: StickerPlan | null = null;
    if (p.sticker && typeof p.sticker === 'object') {
      const valid: StickerId[] = ['heart', 'cry', 'angry', 'proud', 'comfort', 'celebrate', 'think', 'fighting'];
      if (valid.includes(p.sticker.sticker_id)) {
        sticker = {
          sticker_id: p.sticker.sticker_id,
          placement: ['before_bursts', 'after_bursts', 'standalone'].includes(p.sticker.placement)
            ? p.sticker.placement
            : 'after_bursts',
          delay_ms: clamp(Number(p.sticker.delay_ms ?? 500), 0, 5000),
        };
      }
    }

    // event 파싱
    let event: EventTrigger | null = null;
    if (p.event && typeof p.event === 'object') {
      const validEvents: KakaoEventType[] = ['VN_THEATER', 'LUNA_STORY', 'TAROT', 'ACTION_PLAN', 'WARM_WRAP'];
      if (validEvents.includes(p.event.event_type) && typeof p.event.transition_line === 'string') {
        event = {
          event_type: p.event.event_type,
          transition_line: p.event.transition_line,
          delay_ms: clamp(Number(p.event.delay_ms ?? 1000), 0, 10000),
        };
      }
    }

    // 버스트 비었는데 silence 도 false → 최소 1개 보장
    if (!silence && bursts.length === 0) {
      bursts.push({
        text: input.claude_response.replace(/\|\|\|/g, ' ').trim() || '음...',
        delay_before_ms: 1500,
        show_typing: false,
      });
    }

    const validMoods = ['crisis_receiving', 'heavy_empathy', 'playful_chat', 'excited_celebration', 'serious_discussion', 'thoughtful_pause', 'warm_closing'];

    return {
      bursts,
      sticker,
      silence,
      event,
      reasoning: String(p.reasoning ?? '').slice(0, 200),
      mood_label: validMoods.includes(p.mood_label) ? p.mood_label : 'playful_chat',
    };
  } catch {
    return null;
  }
}

// ============================================================
// 가드레일 (최소 규칙)
// ============================================================

function applyGuardrails(plan: KakaoActionPlan, input: KbeInput): KakaoActionPlan {
  // 1. 세션당 스티커 2개 제한 (하드 제한)
  if (input.session_meta.stickers_used_this_session >= 2) {
    plan.sticker = null;
  }

  // 2. 같은 스티커 5턴 내 반복 금지
  if (plan.sticker && input.session_meta.last_sticker_turns_ago >= 0 && input.session_meta.last_sticker_turns_ago < 5) {
    plan.sticker = null;
  }

  // 3. 친밀도 1 이면 스티커 X (낯섦)
  if (input.session_meta.intimacy_level < 2) {
    plan.sticker = null;
  }

  // 4. 위기 신호면 침묵 절대 금지
  if (plan.silence && input.left_brain_summary.crisis) {
    plan.silence = false;
    // bursts 비어있으면 Claude 원문으로 복원
    if (plan.bursts.length === 0) {
      plan.bursts.push({
        text: input.claude_response.replace(/\|\|\|/g, ' ').trim(),
        delay_before_ms: 500,
        show_typing: false,
      });
    }
  }

  // 5. 같은 이벤트 3턴 내 반복 금지
  if (plan.event && input.session_meta.last_event_turns_ago >= 0 && input.session_meta.last_event_turns_ago < 3) {
    plan.event = null;
  }

  // 6. 이미 이번 세션에 같은 이벤트 발동했으면 다시 X (WARM_WRAP 제외)
  if (plan.event && plan.event.event_type !== 'WARM_WRAP' &&
      input.session_meta.events_fired_session.includes(plan.event.event_type)) {
    plan.event = null;
  }

  // 7. 최대 버스트 수 안전장치 (8개)
  if (plan.bursts.length > 8) {
    plan.bursts = plan.bursts.slice(0, 8);
  }

  // 8. 첫 버스트 지연 너무 길면 자름 (30초 이상)
  if (plan.bursts.length > 0 && plan.bursts[0].delay_before_ms > 30000) {
    plan.bursts[0].delay_before_ms = 30000;
  }

  return plan;
}

// ============================================================
// 실패 시 Fallback Plan (Claude 원문 그대로)
// ============================================================

function buildFallbackPlan(input: KbeInput): KakaoActionPlan {
  // Claude 원문을 ||| 기준으로 쪼개서 기본 지연으로 전송
  const parts = input.claude_response
    .split('|||')
    .map(s => s.trim())
    .filter(Boolean);

  const bursts: Burst[] = parts.map((text, i) => ({
    text,
    delay_before_ms: i === 0 ? 800 : 1200,
    show_typing: text.length > 20,
  }));

  return {
    bursts: bursts.length > 0 ? bursts : [
      { text: input.claude_response, delay_before_ms: 1000, show_typing: false },
    ],
    sticker: null,
    silence: false,
    event: null,
    reasoning: 'KBE fallback (LLM 실패)',
    mood_label: 'playful_chat',
  };
}

// ============================================================
// 헬퍼
// ============================================================

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
