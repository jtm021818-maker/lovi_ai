/**
 * v115.7 Nickname Tag Parser — Luna 응답에서 [NICKNAME_PROPOSE] 태그 추출.
 *
 * 핵심 원칙:
 *   - LLM이 새 애칭을 만들 때 추억 앵커 강제.
 *   - 코드는 태그를 본문에서 제거하고 검증 후 DB에 저장.
 *
 * v115.7 포맷:
 *   [NICKNAME_PROPOSE name="..." anchorEpisodeId="<UUID>" anchorQuote="..." reason="..."]
 *
 * 검증 (파서):
 *   - name 1~30자
 *   - anchorEpisodeId 가 메모리 컨텍스트의 episode 목록에 존재
 *   - anchorQuote 1~80자
 *   - 부정 어근 차단 (nickname-gate.ts containsTeasingRoot)
 *   - 게이트가 통과한 상태여야 함 (호출자가 보장)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { proposeNickname } from './nickname-state';
import { containsTeasingRoot, MIN_INTIMACY_LEVEL } from './nickname-gate';

const NICKNAME_TAG_RE = /\[NICKNAME_PROPOSE\s+([^\]]+)\]/gi;
const ATTR_RE = /(\w+)="([^"]*)"/g;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ExtractedNickname {
  name: string;
  anchorEpisodeId?: string;
  anchorQuote?: string;
  reason?: string;
  raw: string;
  /** 파서가 폐기한 이유 (있으면 저장 안 됨) */
  rejectedReason?: string;
}

export interface NicknameParseResult {
  /** 태그가 제거된 본문 */
  cleanedText: string;
  /** 추출된 애칭들 — rejectedReason 있는 건 저장 X */
  proposed: ExtractedNickname[];
}

/**
 * Luna 응답 텍스트에서 NICKNAME_PROPOSE 태그를 추출하고 본문에서 제거.
 *
 * @param allowedEpisodeIds  컨텍스트에 실제 노출된 episode UUID 목록.
 *                            anchor 가 이 안에 없으면 폐기.
 * @param intimacyLevel       부정 어근 통과 판정용 (Lv.4+ 통과).
 */
export function parseNicknameTags(
  rawText: string,
  allowedEpisodeIds?: string[],
  intimacyLevel?: number,
): NicknameParseResult {
  const proposed: ExtractedNickname[] = [];
  const allowed = new Set((allowedEpisodeIds ?? []).map((id) => id.toLowerCase()));

  const cleaned = rawText.replace(NICKNAME_TAG_RE, (match, attrsStr: string) => {
    const attrs: Record<string, string> = {};
    let m: RegExpExecArray | null;
    const re = new RegExp(ATTR_RE.source, 'g');
    while ((m = re.exec(attrsStr)) !== null) {
      attrs[m[1].toLowerCase()] = m[2];
    }

    const name = (attrs.name ?? '').trim();
    const anchorEpisodeId = (attrs.anchorepisodeid ?? '').trim();
    const anchorQuote = (attrs.anchorquote ?? '').trim();
    const reason = (attrs.reason ?? '').trim() || undefined;

    const entry: ExtractedNickname = {
      name,
      anchorEpisodeId: anchorEpisodeId || undefined,
      anchorQuote: anchorQuote || undefined,
      reason,
      raw: match,
    };

    // 검증
    if (!name || name.length > 30) {
      entry.rejectedReason = 'name 누락 또는 30자 초과';
    } else if (!anchorEpisodeId || !UUID_RE.test(anchorEpisodeId)) {
      entry.rejectedReason = 'anchorEpisodeId UUID 누락/형식 오류';
    } else if (allowed.size > 0 && !allowed.has(anchorEpisodeId.toLowerCase())) {
      entry.rejectedReason = `anchorEpisodeId(${anchorEpisodeId}) 가 컨텍스트 episode 에 없음 — 환각 가능성`;
    } else if (!anchorQuote || anchorQuote.length > 80) {
      entry.rejectedReason = 'anchorQuote 누락 또는 80자 초과';
    } else if (containsTeasingRoot(name) && (intimacyLevel ?? 0) < 4) {
      entry.rejectedReason = `놀림형 어근 포함 (Lv.${intimacyLevel} < 4 차단)`;
    }

    proposed.push(entry);
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
 * rejectedReason 있는 entry 는 스킵.
 */
export async function persistProposedNicknames(
  supabase: SupabaseClient,
  params: {
    userId: string;
    sessionId?: string | null;
    proposed: ExtractedNickname[];
  },
): Promise<void> {
  // 첫 valid 한 1개만 저장 (한 응답 다중 작명은 안티패턴)
  const first = params.proposed.find((p) => !p.rejectedReason);
  if (!first || !first.anchorEpisodeId || !first.anchorQuote) return;

  await proposeNickname(supabase, {
    userId: params.userId,
    sessionId: params.sessionId,
    nickname: first.name,
    originContext: first.reason,
    anchorEpisodeId: first.anchorEpisodeId,
    anchorQuote: first.anchorQuote,
  });
}

// 미사용 import 경고 방지용 re-export
export { MIN_INTIMACY_LEVEL };
