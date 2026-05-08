'use client';

/**
 * v115 MessageWithEdit — 루나의 자기수정 연출.
 *
 * LLM이 응답에 `[EDIT before="아니 진" after="아니 진짜 너무하네"]` 태그를 넣으면
 * UI가 이 컴포넌트로 렌더해서:
 *   1. before 텍스트가 잠깐 보임 (typing 중인 것처럼)
 *   2. 살짝 옅어지면서 line-through (지우는 느낌)
 *   3. after 텍스트로 자연스럽게 fade-in
 *
 * 핵심 원칙:
 *   - LLM이 자율 결정 (코드는 렌더만)
 *   - 한 메시지 안에서 여러 번 등장 가능 (각각 독립 타이밍)
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  before: string;
  after: string;
  /** 자기수정까지 보여주는 시간 (ms) */
  showBeforeMs?: number;
  /** 지우는 효과 시간 (ms) */
  eraseMs?: number;
  /** 첫 렌더 후 지연 (메시지 등장 직후 어색함 방지) */
  initialDelayMs?: number;
}

type Phase = 'before' | 'erasing' | 'after';

export default function MessageWithEdit({
  before,
  after,
  showBeforeMs = 700,
  eraseMs = 280,
  initialDelayMs = 120,
}: Props) {
  const [phase, setPhase] = useState<Phase>('before');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('erasing'), initialDelayMs + showBeforeMs);
    const t2 = setTimeout(() => setPhase('after'), initialDelayMs + showBeforeMs + eraseMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [showBeforeMs, eraseMs, initialDelayMs]);

  if (phase === 'before') {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.95 }}
        transition={{ duration: 0.18 }}
        className="inline"
      >
        {before}
        <span
          className="inline-block w-[1px] h-[1em] bg-current align-middle ml-[1px] animate-pulse opacity-60"
          aria-hidden
        />
      </motion.span>
    );
  }

  if (phase === 'erasing') {
    return (
      <motion.span
        initial={{ opacity: 0.95 }}
        animate={{ opacity: 0.35 }}
        transition={{ duration: 0.22 }}
        className="line-through opacity-40 italic"
      >
        {before}
      </motion.span>
    );
  }

  return (
    <motion.span
      initial={{ opacity: 0, y: 1 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="inline"
    >
      {after}
    </motion.span>
  );
}

/**
 * 텍스트 안에 박힌 [EDIT before="..." after="..."] 패턴을 찾아
 * 일반 텍스트 + MessageWithEdit 컴포넌트 배열로 분할.
 */
export const EDIT_TAG_RE = /\[EDIT\s+before="([^"]*)"\s+after="([^"]*)"\]/g;

export interface EditSegment {
  type: 'text' | 'edit';
  text?: string;
  before?: string;
  after?: string;
}

export function parseEditSegments(input: string): EditSegment[] {
  const segments: EditSegment[] = [];
  let lastIdx = 0;
  const re = new RegExp(EDIT_TAG_RE.source, 'g');
  let m: RegExpExecArray | null;

  while ((m = re.exec(input)) !== null) {
    if (m.index > lastIdx) {
      segments.push({ type: 'text', text: input.slice(lastIdx, m.index) });
    }
    segments.push({ type: 'edit', before: m[1], after: m[2] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < input.length) {
    segments.push({ type: 'text', text: input.slice(lastIdx) });
  }
  return segments;
}
