/**
 * 🎬 v79: FX 태그 파서
 *
 * LLM 출력에서 [FX:id] / [FX:id]text[/FX] 태그 추출.
 * 두 가지 형태:
 *   1. 단일 발동: [FX:shake.soft]  → 즉시 효과
 *   2. 텍스트 범위: [FX:text.wave]ㅎㅎㅎ[/FX] → 해당 글자에만 효과
 *
 * Pipeline 에서 버스트 텍스트 파싱 시 호출.
 */

import { isValidFxId } from './fx-catalog';

export interface ParsedFx {
  /** 단일 발동 FX 리스트 (순서대로 발동) */
  singleFx: string[];
  /** 텍스트 범위 FX — 원본 텍스트 기준 start/end */
  rangeFx: Array<{ id: string; start: number; end: number; text: string }>;
  /** FX 태그 제거된 클린 텍스트 (유저 표시용) */
  cleanText: string;
}

/**
 * 버스트 텍스트에서 FX 태그 파싱
 */
export function parseFxTags(input: string): ParsedFx {
  const singleFx: string[] = [];
  const rangeFx: Array<{ id: string; start: number; end: number; text: string }> = [];

  // 1단계: 범위 태그 먼저 — [FX:id]content[/FX]
  //   content 안에 또 다른 태그가 있으면 복잡해지니 단순 greedy X, lazy match
  const RANGE_RE = /\[FX:([a-z_]+\.[a-z_]+)\]([^\[]+?)\[\/FX\]/gi;
  let cleanText = input;
  // clean text 에서의 위치를 추적하려면 순차 처리
  const matches: Array<{ match: RegExpExecArray; range: boolean }> = [];
  let m: RegExpExecArray | null;
  while ((m = RANGE_RE.exec(input)) !== null) {
    matches.push({ match: m, range: true });
  }

  // 범위 태그 제거 + 범위 정보 기록 (cleanText 기준 offset 계산)
  let cleaned = '';
  let lastEnd = 0;
  let offset = 0;
  for (const { match } of matches) {
    const [full, id, inner] = match;
    const matchStart = match.index;

    // 앞부분 추가
    cleaned += input.slice(lastEnd, matchStart);

    // range 기록 — cleanText 기준 start/end
    if (isValidFxId(id)) {
      const startInClean = cleaned.length;
      rangeFx.push({
        id,
        start: startInClean,
        end: startInClean + inner.length,
        text: inner,
      });
    }

    // inner 자체는 유지
    cleaned += inner;
    lastEnd = matchStart + full.length;
    offset += full.length - inner.length;
  }
  cleaned += input.slice(lastEnd);

  // 2단계: 단일 태그 — [FX:id]
  const SINGLE_RE = /\[FX:([a-z_]+\.[a-z_]+)\]/gi;
  cleaned = cleaned.replace(SINGLE_RE, (_full, id: string) => {
    if (isValidFxId(id)) singleFx.push(id);
    return ''; // 제거
  });

  cleanText = cleaned;

  return { singleFx, rangeFx, cleanText };
}

/**
 * 확장형 — 버스트 배열 전체에서 FX 추출 (버스트 간 번호 유지)
 */
export function parseFxTagsFromBursts(bursts: string[]): Array<ParsedFx & { burstIndex: number }> {
  return bursts.map((b, i) => ({ ...parseFxTags(b), burstIndex: i }));
}
