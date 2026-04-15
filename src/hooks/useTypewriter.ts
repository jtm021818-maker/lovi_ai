'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * v49: 타이프라이터 효과 훅
 *
 * 글자 하나씩 순차적으로 표시하는 애니메이션.
 * VN 스타일 대사 연출에 사용.
 */

interface UseTypewriterReturn {
  /** 현재까지 표시된 텍스트 */
  displayedText: string;
  /** 전체 텍스트 표시 완료 여부 */
  isComplete: boolean;
  /** 즉시 전체 텍스트 표시 (탭으로 스킵) */
  skip: () => void;
}

export function useTypewriter(
  text: string,
  speed: number = 40,
  enabled: boolean = true,
): UseTypewriterReturn {
  const [charIndex, setCharIndex] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 텍스트가 바뀌면 리셋
  useEffect(() => {
    setCharIndex(0);
    setSkipped(false);
  }, [text]);

  // 타이프라이터 인터벌
  useEffect(() => {
    if (!enabled || skipped || charIndex >= text.length) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCharIndex((prev) => {
        if (prev >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, speed, enabled, skipped, charIndex]);

  const skip = useCallback(() => {
    setSkipped(true);
    setCharIndex(text.length);
  }, [text.length]);

  const isComplete = skipped || charIndex >= text.length;
  const displayedText = isComplete ? text : text.slice(0, charIndex);

  return { displayedText, isComplete, skip };
}
