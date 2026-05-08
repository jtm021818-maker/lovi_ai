/**
 * v115 Nickname Tag Parser — Luna 응답에서 [NICKNAME_PROPOSE] 태그 추출.
 *
 * 핵심 원칙:
 *   - LLM이 새 애칭을 만들 때 [NICKNAME_PROPOSE name="..." reason="..."] 태그를 본문에 삽입.
 *   - 코드는 태그를 본문에서 제거하고 DB에 저장만 함.
 *   - LLM이 어떤 애칭을 만들지/언제 만들지 코드는 관여 X.
 *
 * 태그 포맷 예시:
 *   [NICKNAME_PROPOSE name="쭁이" reason="유저 말끝이 자주 흐려서"]
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { proposeNickname } from './nickname-state';

// 정규식: name="..." reason="..." 순서 자유, reason 선택사항
const NICKNAME_TAG_RE = /\[NICKNAME_PROPOSE\s+([^\]]+)\]/gi;
const ATTR_RE = /(\w+)="([^"]*)"/g;

export interface ExtractedNickname {
  name: string;
  reason?: string;
  raw: string;
}

export interface NicknameParseResult {
  /** 태그가 제거된 본문 */
  cleanedText: string;
  /** 추출된 애칭들 (LLM은 한 응답에 여러 개 낼 수 있음 — 첫 1개만 권장) */
  proposed: ExtractedNickname[];
}

/**
 * Luna 응답 텍스트에서 NICKNAME_PROPOSE 태그를 추출하고 본문에서 제거.
 */
export function parseNicknameTags(rawText: string): NicknameParseResult {
  const proposed: ExtractedNickname[] = [];

  const cleaned = rawText.replace(NICKNAME_TAG_RE, (match, attrsStr: string) => {
    const attrs: Record<string, string> = {};
    let m: RegExpExecArray | null;
    const re = new RegExp(ATTR_RE.source, 'g');
    while ((m = re.exec(attrsStr)) !== null) {
      attrs[m[1].toLowerCase()] = m[2];
    }
    if (attrs.name && attrs.name.length > 0 && attrs.name.length <= 30) {
      proposed.push({ name: attrs.name, reason: attrs.reason, raw: match });
    }
    return '';
  });

  return {
    cleanedText: cleaned.replace(/\n{3,}/g, '\n\n').trim(),
    proposed,
  };
}

/**
 * 추출된 애칭을 DB에 저장 (사후 비동기 호출).
 *
 * 사용처: orchestrator 가 응답 완료 후 비동기로 호출.
 */
export async function persistProposedNicknames(
  supabase: SupabaseClient,
  params: {
    userId: string;
    sessionId?: string | null;
    proposed: ExtractedNickname[];
  },
): Promise<void> {
  if (params.proposed.length === 0) return;

  // 한 응답에 여러 개 나올 수 있지만 첫 1개만 저장 (가이드 위반 방지)
  const first = params.proposed[0];
  await proposeNickname(supabase, {
    userId: params.userId,
    sessionId: params.sessionId,
    nickname: first.name,
    originContext: first.reason,
  });
}
