/**
 * 🧚 v104: Spirit Event Signal
 *
 * LLM 본문에서 [SPIRIT_<EVENT_TYPE>:k=v,k=v] 태그 추출/제거.
 *
 * 예:
 *   [SPIRIT_RAGE_LETTER:rage=상사_갑질,trigger=약속파기]
 *   [SPIRIT_THINK_FRAME:distortion=mind_reading]
 *   [SPIRIT_CRY_TOGETHER]
 */

import { ALL_SPIRIT_EVENT_TYPES, type SpiritEventType, type SpiritTag } from './spirit-event-types';

const VALID = new Set<string>(ALL_SPIRIT_EVENT_TYPES);

// 본문 어디에 있든 매칭. 옵션 파라미터 1회.
const SPIRIT_TAG_REGEX = /\[SPIRIT_([A-Z_]+)(?::([^\]]*))?\]/g;

/**
 * 본문에서 [SPIRIT_*] 태그 모두 추출.
 * 알 수 없는 event_type 은 무시.
 */
export function parseSpiritTags(text: string): SpiritTag[] {
  if (!text || typeof text !== 'string') return [];
  const tags: SpiritTag[] = [];
  // exec 루프 사용 (다중 매치)
  const re = new RegExp(SPIRIT_TAG_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const candidate = `SPIRIT_${match[1]}`;
    if (!VALID.has(candidate)) continue;
    const eventType = candidate as SpiritEventType;

    // 파라미터 파싱
    const params: Record<string, string> = {};
    if (match[2]) {
      for (const part of match[2].split(',')) {
        const eq = part.indexOf('=');
        if (eq <= 0) {
          // value 없는 키만: { key: '' }
          const k = part.trim();
          if (k) params[k] = '';
        } else {
          const k = part.slice(0, eq).trim();
          const v = part.slice(eq + 1).trim();
          if (k) params[k] = v;
        }
      }
    }

    tags.push({
      eventType,
      params,
      raw: match[0],
      rawSpan: { start: match.index, end: match.index + match[0].length },
    });
  }
  return tags;
}

/**
 * 본문에서 모든 [SPIRIT_*] 태그 제거 + 연속 빈 줄 정리.
 * Pipeline 이 yield 하기 전 메시지 본문에 적용.
 */
export function stripSpiritTags(text: string): string {
  if (!text) return text;
  const cleaned = text.replace(SPIRIT_TAG_REGEX, '');
  // 연속 빈 줄 → 1개
  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * 첫 유효 태그 1개만 채택 (한 응답 = 카드 1개 정책).
 */
export function pickFirstValidTag(tags: SpiritTag[]): SpiritTag | null {
  return tags.length > 0 ? tags[0] : null;
}
