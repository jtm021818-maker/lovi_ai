/**
 * ↩️ 재요청 + 자기정정 핸들러
 *
 * Claude 출력에서 다음 패턴 감지:
 *   1. [REQUEST_REANALYSIS:이유] — 좌뇌 재분석 요청
 *   2. 자기정정 표현 ("아 그게 아니라", "잠깐 다시" 등)
 *   3. [SUPPRESS_TAGS] — 태그 자동첨부 끄기 옵션
 */

import { SELF_CORRECTION_MARKERS } from './types';

// ============================================================
// 재요청 감지 + 파싱
// ============================================================

const REANALYSIS_PATTERN = /\[REQUEST_REANALYSIS:([^\]]+)\]/i;

// 🆕 v57: 우뇌가 다음 턴 좌뇌에 남기는 힌트
const LEFT_BRAIN_HINT_PATTERN = /\[LEFT_BRAIN_HINT:([^\]]+)\]/gi;

export interface ReanalysisRequest {
  detected: boolean;
  reason: string;
  /** 재요청 태그를 제거한 깨끗한 텍스트 (재요청 안 한 부분이 있으면) */
  cleanText: string;
}

/**
 * Claude 응답에서 [REQUEST_REANALYSIS:...] 추출
 */
export function detectReanalysisRequest(rawText: string): ReanalysisRequest {
  const match = rawText.match(REANALYSIS_PATTERN);

  if (!match) {
    return { detected: false, reason: '', cleanText: rawText };
  }

  return {
    detected: true,
    reason: match[1].trim(),
    cleanText: rawText.replace(REANALYSIS_PATTERN, '').trim(),
  };
}

// ============================================================
// 🆕 v57: LEFT_BRAIN_HINT 추출 (우뇌 → 다음 턴 좌뇌)
// ============================================================

export interface LeftBrainHints {
  hints: string[];
  /** 힌트 태그 제거된 깨끗한 텍스트 */
  cleanText: string;
}

/**
 * Claude/Gemini 응답에서 [LEFT_BRAIN_HINT:...] 모두 추출.
 * 한 응답에 여러 개 가능.
 */
export function detectLeftBrainHints(rawText: string): LeftBrainHints {
  const hints: string[] = [];
  let cleanText = rawText;

  const matches = [...rawText.matchAll(LEFT_BRAIN_HINT_PATTERN)];
  for (const m of matches) {
    const hint = m[1].trim();
    if (hint.length > 0 && hint.length <= 200) {
      hints.push(hint);
    }
  }

  // 태그 모두 제거
  cleanText = cleanText.replace(LEFT_BRAIN_HINT_PATTERN, '').trim();

  return { hints, cleanText };
}

// ============================================================
// 자기정정 감지
// ============================================================

export interface SelfCorrectionInfo {
  detected: boolean;
  /** 발견된 정정 마커들 */
  markers: string[];
  /** 정정이 자연스러운 범위인가 (1-2개는 OK, 3개 이상은 과도) */
  naturalness: 'natural' | 'excessive' | 'none';
}

/**
 * 응답에 자기정정 표현이 있는지 감지
 */
export function detectSelfCorrection(text: string): SelfCorrectionInfo {
  const markers: string[] = [];

  for (const marker of SELF_CORRECTION_MARKERS) {
    if (text.includes(marker)) {
      markers.push(marker);
    }
  }

  if (markers.length === 0) {
    return { detected: false, markers: [], naturalness: 'none' };
  }

  return {
    detected: true,
    markers,
    naturalness: markers.length <= 2 ? 'natural' : 'excessive',
  };
}

// ============================================================
// 응답 후처리: 부수 텍스트/메타 제거
// ============================================================

/** Claude가 가끔 출력하는 메타 발화 패턴 (제거 필요) */
const META_PATTERNS = [
  /^\s*\[?(트랙|후보|선택)\s*[A-Z\d]+[^\]]*\]?\s*$/gim,  // "트랙 A:", "후보 1:", "[선택]"
  /^\s*###\s*.+$/gim,                                      // 마크다운 헤더
  /^\s*\*\*[^*]+\*\*\s*$/gim,                              // 단독 볼드 줄
  /^\s*최종\s*[:：]\s*/gim,                                // "최종:" 접두
  /^\s*\(.+사고.+\)\s*$/gim,                              // "(머릿속 사고)" 등
];

export interface CleanedResponse {
  text: string;
  metaRemoved: boolean;
  removedSegments: string[];
}

/**
 * 응답에서 메타 발화/사고 노출 제거
 * Claude 가 후보/트랙을 출력하지 말라고 했어도 가끔 새어나감
 */
export function cleanResponseText(rawText: string): CleanedResponse {
  let text = rawText;
  const removedSegments: string[] = [];

  for (const pattern of META_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      removedSegments.push(...matches);
      text = text.replace(pattern, '');
    }
  }

  // 빈 줄 정리
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // ||| 정리 (앞뒤 공백, 빈 말풍선)
  text = text.split('|||').map(s => s.trim()).filter(Boolean).join('|||');

  return {
    text,
    metaRemoved: removedSegments.length > 0,
    removedSegments,
  };
}

// ============================================================
// 응답 검증 (간단한 quality gate)
// ============================================================

export interface ValidationResult {
  passed: boolean;
  issues: string[];
}

const FORBIDDEN_PATTERNS = [
  /하셨군요/,
  /느끼시는\s*건/,
  /충분히\s*그러/,
  /어떤\s*감정이\s*드/,
  /인지\s*왜곡/,
  /투사하/,
  /방어기제/,
  /라고\s*분석/,
  /로\s*판단됩니/,
];

const META_FORBIDDEN = [
  /저는\s*(AI|인공지능|어시스턴트|언어\s*모델)/,
  /도와드릴게요/,
];

export function validateAceResponse(text: string): ValidationResult {
  const issues: string[] = [];
  const trimmed = text.trim();

  if (!trimmed) {
    return { passed: false, issues: ['빈 응답'] };
  }

  if (trimmed.length > 350) {
    issues.push(`너무 김 (${trimmed.length}자)`);
  }

  for (const p of FORBIDDEN_PATTERNS) {
    const m = trimmed.match(p);
    if (m) issues.push(`상담사 말투: ${m[0]}`);
  }

  for (const p of META_FORBIDDEN) {
    const m = trimmed.match(p);
    if (m) issues.push(`AI 메타 발화: ${m[0]}`);
  }

  // 존댓말 과다 검사
  const formals = trimmed.match(/습니다|십니다/g);
  if (formals && formals.length >= 2) {
    issues.push(`존댓말 과다 (${formals.length}회)`);
  }

  // JSON 누출
  if (/^\s*[{[]/.test(trimmed) || /"[a-z_]+":\s*"/.test(trimmed)) {
    return { passed: false, issues: ['JSON 누출'] };
  }

  return {
    passed: issues.length === 0 || !issues.some(i => i.includes('JSON') || i.includes('AI 메타')),
    issues,
  };
}

// ============================================================
// 태그 자동 첨부 (좌뇌 태그를 응답 끝에)
// ============================================================

export function appendTagsToResponse(
  responseText: string,
  tags: {
    SITUATION_READ: string;
    LUNA_THOUGHT: string;
    PHASE_SIGNAL: string;
    SITUATION_CLEAR: string | null;
  },
): string {
  // 🆕 v66: LLM 이 응답 본문에 이미 태그를 출력했으면 코드 append 스킵
  //   → 같은 태그 두 번 박히는 중복 버그 차단
  const trimmed = responseText.trim();
  const hasSituationRead = /\[SITUATION_READ:[^\]]*\]/i.test(trimmed);
  const hasLunaThought = /\[LUNA_THOUGHT:[^\]]*\]/i.test(trimmed);
  const hasPhaseSignal = /\[PHASE_SIGNAL:[^\]]*\]/i.test(trimmed);
  const hasSituationClear = /\[SITUATION_CLEAR:[^\]]*\]/i.test(trimmed);

  const parts: string[] = [trimmed];
  if (!hasSituationRead) parts.push(`[SITUATION_READ:${tags.SITUATION_READ}]`);
  if (!hasLunaThought) parts.push(`[LUNA_THOUGHT:${tags.LUNA_THOUGHT}]`);
  if (!hasPhaseSignal) parts.push(`[PHASE_SIGNAL:${tags.PHASE_SIGNAL}]`);
  if (tags.SITUATION_CLEAR && !hasSituationClear) {
    parts.push(`[SITUATION_CLEAR:${tags.SITUATION_CLEAR}]`);
  }
  return parts.join('');
}
