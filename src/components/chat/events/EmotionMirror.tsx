'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, EmotionMirrorData, RelationshipScenario } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';
import { useTypewriter } from '@/hooks/useTypewriter';
import CinematicIntro from './CinematicIntro';

/**
 * v49: 루나의 1인/2인 연극 — Visual Novel 스타일
 *
 * - Imagen 배경 + Ken Burns 카메라
 * - 캐릭터 스프라이트 (solo/duo)
 * - 말풍선 대사 + 타이프라이터 효과
 * - 탭으로 진행하는 인터랙티브 씬
 * - Reveal 드라마틱 연출
 */

// ============================================================
// 파서 & 상수
// ============================================================

/** [speaker] (지문) 대사 파싱 */
function parseSceneLine(line: string): { speaker?: string; gender?: 'male' | 'female'; action?: string; dialog: string } {
  const speakerMatch = line.match(/^\[([^\]]+)\]\s*/);
  const speaker = speakerMatch?.[1];
  const rest = speaker ? line.slice(speakerMatch![0].length) : line;
  const actionMatch = rest.match(/^\(([^)]+)\)\s*(.*)$/);

  // speaker → 성별 매핑 ([남자] → male, [여자] → female)
  let gender: 'male' | 'female' | undefined;
  if (speaker) {
    const s = speaker.trim();
    if (s === '남자' || s === '남' || s.includes('남')) gender = 'male';
    else if (s === '여자' || s === '여' || s.includes('여')) gender = 'female';
  }

  if (actionMatch) return { speaker, gender, action: actionMatch[1], dialog: actionMatch[2] };
  return { speaker, gender, dialog: rest };
}

/** 시나리오별 CSS 그라디언트 폴백 */
const SCENARIO_GRADIENTS: Record<string, string> = {
  READ_AND_IGNORED: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  GHOSTING: 'linear-gradient(180deg, #0d1117 0%, #161b22 50%, #21262d 100%)',
  JEALOUSY: 'linear-gradient(180deg, #2d1b2e 0%, #1a1625 50%, #1e1b3a 100%)',
  LONG_DISTANCE: 'linear-gradient(180deg, #0c1445 0%, #1a237e 50%, #283593 100%)',
  INFIDELITY: 'linear-gradient(180deg, #1a0a0a 0%, #2d1f1f 50%, #3d2c2c 100%)',
  BREAKUP_CONTEMPLATION: 'linear-gradient(180deg, #1a1510 0%, #2d2520 50%, #3d342c 100%)',
  BOREDOM: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #3d3d3d 100%)',
  UNREQUITED_LOVE: 'linear-gradient(180deg, #1a1025 0%, #2d1b3d 50%, #3d2650 100%)',
  RECONNECTION: 'linear-gradient(180deg, #1a1510 0%, #2d2015 50%, #3d2d1c 100%)',
  FIRST_MEETING: 'linear-gradient(180deg, #1a0f1f 0%, #2d1530 50%, #3d1c40 100%)',
};
const DEFAULT_GRADIENT = 'linear-gradient(180deg, #1a1025 0%, #0f0a1a 50%, #1a0a2e 100%)';

/** 캐릭터 스프라이트 시트 (4열 x 2행 = 8프레임, 각 344x384) */
const SPRITE_SHEET = {
  female: '/char_img/event1_luna_girl.png',
  male: '/char_img/event1_luna_man.png',
};
const SPRITE_COLS = 4;
const SPRITE_ROWS = 2;
// 프레임 인덱스 (0-7): 0=기본, 1=슬픔, 2=화남, 3=생각, 4=놀람, 5=웃음, 6=걱정, 7=당당
type SpriteFrame = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 감정/상황에 맞는 스프라이트 프레임 선택 */
function pickSpriteFrame(emotion: string, isReveal: boolean): SpriteFrame {
  if (isReveal) return 3; // 생각/깨달음
  const lower = emotion.toLowerCase();
  if (lower.includes('화') || lower.includes('짜증') || lower.includes('분노')) return 2;
  if (lower.includes('슬') || lower.includes('울') || lower.includes('아프')) return 1;
  if (lower.includes('불안') || lower.includes('걱정') || lower.includes('무서')) return 6;
  if (lower.includes('놀') || lower.includes('헐') || lower.includes('충격')) return 4;
  if (lower.includes('웃') || lower.includes('행복') || lower.includes('좋')) return 5;
  if (lower.includes('당당') || lower.includes('자신') || lower.includes('용기')) return 7;
  return 0; // 기본
}

/** CSS background-image로 스프라이트 시트에서 특정 프레임 표시 (div 기반, 크롭 확실) */
function getSpriteStyle(frame: SpriteFrame, sheet: string, displaySize: number): React.CSSProperties {
  const col = frame % SPRITE_COLS;
  const row = Math.floor(frame / SPRITE_COLS);
  const scale = displaySize / 344; // 원본 344px 기준 스케일
  return {
    width: displaySize,
    height: displaySize * (384 / 344), // 비율 유지
    backgroundImage: `url(${sheet})`,
    backgroundSize: `${1376 * scale}px ${768 * scale}px`, // 전체 시트 스케일
    backgroundPosition: `-${col * 344 * scale}px -${row * 384 * scale}px`,
    backgroundRepeat: 'no-repeat',
  };
}

// ============================================================
// 타입
// ============================================================

interface EmotionMirrorProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type ScenePhase = 'intro' | 'playing' | 'reveal' | 'message' | 'choice' | 'closing' | 'closed';

// ============================================================
// VN 씬 대사 컴포넌트
// ============================================================

function DialogueLine({
  line,
  isActive,
  isDuo,
}: {
  line: string;
  isActive: boolean;
  isDuo: boolean;
}) {
  const parsed = parseSceneLine(line);
  const isOpponent = parsed.speaker === '상대';
  const typewriter = useTypewriter(parsed.dialog, 35, isActive);

  return (
    <div className="px-4 pb-3">
      {/* Speaker 태그 — 성별 기반 */}
      {isDuo && parsed.speaker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-1"
        >
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
              parsed.gender === 'male'
                ? 'bg-blue-500/30 text-blue-200'
                : 'bg-rose-500/30 text-rose-200'
            }`}
          >
            {parsed.gender === 'male' ? '👦 남자' : '👧 여자'}
          </span>
        </motion.div>
      )}

      {/* 지문 (이탤릭) */}
      {parsed.action && (
        <motion.p
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 0.7, x: 0 }}
          transition={{ duration: 0.3 }}
          className="text-[11px] italic text-white/50 mb-1"
        >
          ({parsed.action})
        </motion.p>
      )}

      {/* 대사 — 말풍선 스타일 */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`relative inline-block max-w-[92%] px-3.5 py-2.5 rounded-2xl text-[14px] font-medium leading-relaxed shadow-lg ${
          isOpponent
            ? 'bg-white/15 text-white/90 ml-auto rounded-tr-sm'
            : 'bg-white/20 text-white rounded-tl-sm'
        }`}
        style={{
          backdropFilter: 'blur(8px)',
          borderLeft: isOpponent ? 'none' : '3px solid rgba(244,114,182,0.5)',
          borderRight: isOpponent ? '3px solid rgba(96,165,250,0.5)' : 'none',
        }}
      >
        {typewriter.displayedText}
        {!typewriter.isComplete && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-block w-[2px] h-[14px] bg-white/80 ml-0.5 align-middle"
          />
        )}
      </motion.div>
    </div>
  );
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function EmotionMirror({ event, onSelect, disabled }: EmotionMirrorProps) {
  const data = event.data as unknown as EmotionMirrorData;
  const [submitted, setSubmitted] = useState(false);

  // VN 모드 여부
  const hasScene = data.sceneLines && data.sceneLines.length > 0 && data.reveal;

  function handleSelect(value: string) {
    if (disabled || submitted) return;
    setSubmitted(true);
    const text = value === 'confirm'
      ? `맞아, ${(data.reveal || data.deepEmotion).slice(0, 20)}... 그런 느낌이야`
      : '음 좀 다른 느낌인데, 내가 말해볼게';
    onSelect(text, {
      source: 'emotion_mirror',
      context: { confirmed: value === 'confirm', surfaceEmotion: data.surfaceEmotion, deepEmotion: data.deepEmotion },
    });
  }

  // ─────────────────────────────────────────
  // v49: Visual Novel 모드 (풀스크린 → 채팅 복귀)
  // ─────────────────────────────────────────
  if (hasScene) {
    return (
      <VNScene
        data={data}
        onSelect={handleSelect}
        disabled={disabled}
        submitted={submitted}
      />
    );
  }

  // ─────────────────────────────────────────
  // 레거시 폴백 (sceneLines 없을 때)
  // ─────────────────────────────────────────
  return <LegacyMirror data={data} onSelect={handleSelect} disabled={disabled} submitted={submitted} />;
}

// ============================================================
// VN Scene 컴포넌트
// ============================================================

function VNScene({
  data,
  onSelect,
  disabled,
  submitted,
}: {
  data: EmotionMirrorData;
  onSelect: (value: string) => void;
  disabled?: boolean;
  submitted: boolean;
}) {
  const lines = data.sceneLines!;
  const isDuo = data.characterSetup?.mode === 'duo';
  const scenario = (data as any).scenario as RelationshipScenario | undefined;

  const [phase, setPhase] = useState<ScenePhase>('intro');
  const [lineIndex, setLineIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Portal mount (SSR 방지)
  useEffect(() => { setMounted(true); }, []);

  // intro → playing: CinematicIntro 완료 시 전환 (콜백으로)
  const handleIntroComplete = useCallback(() => setPhase('playing'), []);

  // reveal → message 자동 전환
  useEffect(() => {
    if (phase === 'reveal') {
      const timer = setTimeout(() => setPhase('message'), 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // message → choice 자동 전환
  useEffect(() => {
    if (phase === 'message') {
      const timer = setTimeout(() => setPhase('choice'), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // closing → closed 자동 전환
  useEffect(() => {
    if (phase === 'closing') {
      const timer = setTimeout(() => setPhase('closed'), 600);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // 선택 후 closing 트리거
  const handleChoice = useCallback((value: string) => {
    onSelect(value);
    setTimeout(() => setPhase('closing'), 300);
  }, [onSelect]);

  // 현재 대사의 파싱 결과 (speaker + 성별 확인용)
  const currentParsed = phase === 'playing' ? parseSceneLine(lines[lineIndex]) : null;
  // 현재 대사의 캐릭터가 어느 쪽인지 (성별 기반 스프라이트 선택)
  const currentLineGender = currentParsed?.gender;
  const isCurrentOpponent = isDuo && currentLineGender !== undefined && currentLineGender !== gender;
  // 현재 표시할 스프라이트 시트 (대사별 성별에 따라)
  const activeSheet = currentLineGender === 'male' ? SPRITE_SHEET.male : currentLineGender === 'female' ? SPRITE_SHEET.female : mainSheet;

  // 탭으로 진행
  const handleTap = useCallback(() => {
    if (phase === 'playing') {
      if (lineIndex < lines.length - 1) {
        setLineIndex((i) => i + 1);
      } else {
        setPhase('reveal');
      }
    }
  }, [phase, lineIndex, lines.length]);

  // 배경 스타일 (Pollinations = JPEG)
  const bgStyle = data.backgroundImageBase64
    ? { backgroundImage: `url(data:image/jpeg;base64,${data.backgroundImageBase64})` }
    : { background: (scenario && SCENARIO_GRADIENTS[scenario]) || DEFAULT_GRADIENT };

  // 스프라이트 시트 결정 — [남자] → man, [여자] → girl 고정 매핑
  const gender = data.characterSetup?.userGender || 'female';
  const mainSheet = SPRITE_SHEET[gender] || SPRITE_SHEET.female;
  const maleSheet = SPRITE_SHEET.male;   // event1_luna_man.png
  const femaleSheet = SPRITE_SHEET.female; // event1_luna_girl.png

  // 겉감정/속마음 라인 구분 (전환점 기준)
  const transitionIdx = Math.max(Math.floor(lines.length * 0.6), 2);
  const isSurfaceLine = lineIndex < transitionIdx;

  // 대사별 스프라이트 프레임 결정 (LLM 지정 우선, 없으면 키워드 폴백)
  const currentFrame: SpriteFrame = (() => {
    if (phase === 'reveal') {
      return (data.revealFrame ?? pickSpriteFrame(data.deepEmotion, true)) as SpriteFrame;
    }
    if (phase === 'playing') {
      const llmFrame = data.sceneFrames?.[lineIndex];
      if (llmFrame !== undefined) return Math.min(7, Math.max(0, llmFrame)) as SpriteFrame;
      return pickSpriteFrame(parseSceneLine(lines[lineIndex]).dialog, false);
    }
    return 0;
  })();
  // Solo: 480px, Duo: 300px (화면 꽉 채우기 - VN 느낌 극대화)
  const spriteSize = isDuo ? 300 : 480;

  // closed 상태 → 인라인 요약 카드 (채팅에 남김)
  if (phase === 'closed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="my-3 max-w-[85%] ml-auto p-3 rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '1px solid rgba(168,85,247,0.2)' }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm">🎭</span>
          <span className="text-[12px] font-bold text-purple-700">{data.sceneTitle || '루나의 연극'}</span>
        </div>
        <p className="text-[12px] text-purple-900/80 leading-snug mb-1">
          {data.deepEmoji} &ldquo;{data.reveal}&rdquo;
        </p>
        <p className="text-[10px] text-purple-400">{submitted ? '✓ 루나가 기억해둘게!' : data.lunaMessage}</p>
      </motion.div>
    );
  }

  // 풀스크린 VN 씬 (Portal → document.body)
  const vnContent = (
    <AnimatePresence>
        <motion.div
          key="vn-fullscreen"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'closing' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: phase === 'closing' ? 0.5 : 0.4 }}
          className="fixed inset-0 z-50 bg-black"
          style={{ height: '100dvh' }}
        >
          {/* 🎬 영화 필름 인트로 (intro phase에서만) */}
          {phase === 'intro' && (
            <CinematicIntro title={data.sceneTitle} onComplete={handleIntroComplete} />
          )}

          {/* 씬 컨테이너 (풀스크린) */}
          <motion.div
            animate={phase === 'closing' ? { scale: 0.85, opacity: 0, borderRadius: '24px' } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="relative w-full h-full overflow-hidden cursor-pointer select-none"
            onClick={handleTap}
          >
        {/* 배경 이미지 + Ken Burns (framer-motion) */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={bgStyle}
          animate={data.backgroundImageBase64 ? {
            scale: [1.0, 1.08, 1.05, 1.0],
            x: ['0%', '-1.5%', '1%', '0%'],
            y: ['0%', '-1%', '-0.5%', '0%'],
          } : undefined}
          transition={data.backgroundImageBase64 ? {
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          } : undefined}
        />

        {/* 하단 어둡게 (대사 가독성) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Reveal 시 추가 어둡게 */}
        <AnimatePresence>
          {(phase === 'reveal' || phase === 'message') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30"
            />
          )}
        </AnimatePresence>

        {/* 장면 타이틀 배지 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-3 left-3 right-3 z-20"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
            <span className="text-[11px]">🎭</span>
            <span className="text-[11px] font-bold text-white/90">
              {data.sceneTitle || '너의 그 순간'}
            </span>
          </div>
        </motion.div>

        {/* 캐릭터 스프라이트 — 종이연극 스타일 (background-image 크롭 + 회전 전환 + 호흡) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {isDuo && phase !== 'message' && phase !== 'choice' ? (
            <>
              {/* 남자 (왼쪽) */}
              <motion.div
                animate={{
                  scale: currentLineGender === 'male' ? [1, 1.03, 1] : [1, 0.97, 1],
                  y: currentLineGender === 'male' ? [0, -6, 0] : [0, 2, 0],
                  opacity: currentLineGender === 'male' ? 1 : 0.5,
                  filter: currentLineGender === 'male' ? 'brightness(1) saturate(1)' : 'brightness(0.5) saturate(0.7)',
                }}
                transition={{
                  scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                  y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                  opacity: { duration: 0.5 },
                  filter: { duration: 0.5 },
                }}
                className="absolute bottom-[2%] left-[2%] drop-shadow-2xl"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`main-${currentFrame}`}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -90, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={getSpriteStyle(currentFrame, maleSheet, spriteSize)}
                  />
                </AnimatePresence>
              </motion.div>
              {/* 여자 (오른쪽) */}
              <motion.div
                animate={{
                  scale: currentLineGender === 'female' ? [1, 1.03, 1] : [1, 0.97, 1],
                  y: currentLineGender === 'female' ? [0, -6, 0] : [0, 2, 0],
                  opacity: currentLineGender === 'female' ? 1 : 0.5,
                  filter: currentLineGender === 'female' ? 'brightness(1) saturate(1)' : 'brightness(0.5) saturate(0.7)',
                }}
                transition={{
                  scale: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
                  y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
                  opacity: { duration: 0.5 },
                  filter: { duration: 0.5 },
                }}
                className="absolute bottom-[2%] right-[2%] drop-shadow-2xl"
                style={{ transform: 'scaleX(-1)' }}
              >
                <div style={getSpriteStyle(0, femaleSheet, spriteSize)} />
              </motion.div>
            </>
          ) : (
            /* Solo 모드 혹은 특별 단계 (message/choice) — 중앙 배치 */
            <motion.div
              animate={{
                scale: [1, 1.04, 1],
                y: [0, -5, 0],
                rotate: [0, -0.5, 0.5, 0],
              }}
              transition={{
                scale: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
                y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="absolute bottom-[2%] left-1/2 drop-shadow-2xl"
              style={{ marginLeft: -(spriteSize / 2) }}
            >
              <AnimatePresence mode="wait">
                {(phase === 'message' || phase === 'choice') ? (
                  /* 🆕 v49: 해결 단계 전용 igmg.png (풀 캐릭터 스프라이트) */
                  <motion.div
                    key="special-luna"
                    initial={{ scale: 0, rotate: -10, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.15, 1], 
                      rotate: [-10, 5, 0], 
                      opacity: 1 
                    }}
                    transition={{ 
                      duration: 0.8, 
                      ease: [0.34, 1.56, 0.64, 1],
                      times: [0, 0.6, 1]
                    }}
                    style={{
                      width: spriteSize,
                      height: spriteSize * (384 / 344),
                      backgroundImage: 'url(/char_img/igmg.png)',
                      backgroundSize: 'contain',
                      backgroundPosition: 'center bottom',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                ) : (
                  /* 일반 단계 스프라이트 */
                  <motion.div
                    key={`solo-${currentFrame}`}
                    initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                    exit={{ rotateY: -90, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    style={getSpriteStyle(currentFrame, mainSheet, spriteSize)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* 대화 영역 */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <AnimatePresence mode="wait">
            {/* Playing: 대사 */}
            {phase === 'playing' && (
              <motion.div
                key={`line-${lineIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
                className="bg-black/60 backdrop-blur-md rounded-t-2xl pt-3 pb-4"
                style={{
                  borderTop: `2px solid ${isSurfaceLine ? 'rgba(244,114,182,0.4)' : 'rgba(168,85,247,0.4)'}`,
                }}
              >
                {/* 진행 인디케이터 */}
                <div className="flex items-center justify-between px-4 mb-2">
                  <div className="flex gap-1">
                    {lines.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                          i < lineIndex ? 'bg-purple-400' : i === lineIndex ? 'bg-white' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-white/40 font-medium">
                    {lineIndex + 1}/{lines.length}
                  </span>
                </div>

                <DialogueLine
                  key={`dl-${lineIndex}`}
                  line={lines[lineIndex]}
                  isActive={true}
                  isDuo={isDuo}
                />

                {/* 탭 힌트 */}
                <motion.div
                  animate={{ y: [0, 3, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="flex justify-center mt-1"
                >
                  <span className="text-white/30 text-[10px]">▼ 탭하여 진행</span>
                </motion.div>
              </motion.div>
            )}

            {/* Reveal */}
            {phase === 'reveal' && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-black/70 backdrop-blur-lg rounded-t-2xl pt-4 pb-5 px-4"
                style={{
                  borderTop: '2px solid rgba(168,85,247,0.5)',
                  boxShadow: '0 -4px 30px rgba(147,51,234,0.25)',
                }}
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                  className="text-center mb-3"
                >
                  <span className="text-4xl">{data.deepEmoji}</span>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="text-[11px] font-bold text-purple-300 text-center mb-2"
                >
                  루나가 느끼기에...
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  transition={{ delay: 0.8, duration: 0.6, type: 'spring' }}
                  className="text-[15px] font-bold text-white text-center leading-relaxed"
                >
                  &ldquo;{data.reveal}&rdquo;
                </motion.p>
              </motion.div>
            )}

            {/* Message — 텍스트만 표시 (이미지는 하단 스피터 영역에 배치됨) */}
            {phase === 'message' && (
              <motion.div
                key="message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6"
              >
                {/* 배경 살짝 더 어둡게 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/50"
                />
                
                {/* 메시지 텍스트 — 아래에서 올라옴 */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                  className="relative z-10 px-6 py-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
                >
                  <p className="text-[15px] font-bold text-white text-center leading-relaxed">
                    {data.lunaMessage}
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Intro — 빈 상태 (CinematicIntro가 Portal로 덮고 있음) */}
            {phase === 'intro' && (
              <motion.div key="intro" className="py-5" />
            )}
          </AnimatePresence>
        </div>

        {/* 선택 버튼 (풀스크린 하단, safe area 대응) */}
        <AnimatePresence>
          {phase === 'choice' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-0 left-0 right-0 z-30 flex gap-2.5 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              {data.choices.map((choice, idx) => (
                <motion.button
                  key={choice.value}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChoice(choice.value)}
                  disabled={disabled || submitted}
                  className={`py-3.5 rounded-2xl font-bold text-[13px] transition-all ${
                    idx === 0
                      ? 'flex-1 bg-white/15 backdrop-blur-sm text-white/90 border border-white/20'
                      : 'flex-[1.5] bg-purple-500 text-white border border-purple-400 shadow-lg shadow-purple-500/30'
                  } ${disabled || submitted ? 'opacity-50' : 'active:scale-[0.97]'}`}
                >
                  {choice.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

          </motion.div>
        </motion.div>
    </AnimatePresence>
  );

  // Portal로 body에 렌더 (모바일 풀스크린)
  if (!mounted) return null;
  return createPortal(vnContent, document.body);
}

// ============================================================
// 레거시 폴백 컴포넌트
// ============================================================

function LegacyMirror({
  data,
  onSelect,
  disabled,
  submitted,
}: {
  data: EmotionMirrorData;
  onSelect: (value: string) => void;
  disabled?: boolean;
  submitted: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, rotate: -0.5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
      className="bg-[#faf9f5] border-[2.5px] border-slate-700 p-5 my-4 max-w-[88%] ml-auto overflow-hidden relative"
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />

      <div className="flex items-start gap-3 mb-5 relative z-10">
        <div className="w-10 h-10 flex-shrink-0 border-2 border-slate-700 overflow-hidden"
             style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}>
          <img src="/luna_fox_transparent.png" alt="루나" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-800">루나가 보기에... 🦊</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">네 마음을 좀 들여다봤어</p>
        </div>
      </div>

      <div className="space-y-3 mb-5 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="flex items-start gap-3 p-3 bg-rose-50/60 border-2 border-slate-700/15"
          style={{ borderRadius: '15px 225px 15px 255px/255px 15px 225px 15px', transform: 'rotate(0.3deg)' }}
        >
          <span className="text-2xl flex-shrink-0 mt-0.5">{data.surfaceEmoji}</span>
          <div>
            <p className="text-[11px] font-bold text-rose-400 mb-0.5">겉으로는</p>
            <p className="text-[13px] font-bold text-slate-800 leading-snug">&ldquo;{data.surfaceEmotion}&rdquo;</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="flex justify-center"
        >
          <span className="text-slate-400 text-lg">↓</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="flex items-start gap-3 p-3 bg-purple-50/60 border-2 border-slate-700/15"
          style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', transform: 'rotate(-0.3deg)' }}
        >
          <span className="text-2xl flex-shrink-0 mt-0.5">{data.deepEmoji}</span>
          <div>
            <p className="text-[11px] font-bold text-purple-400 mb-0.5">속마음은</p>
            <p className="text-[13px] font-bold text-slate-800 leading-snug">&ldquo;{data.deepEmotion}&rdquo;</p>
          </div>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-[12px] font-bold text-slate-500 text-center mb-4 relative z-10"
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        {data.lunaMessage}
      </motion.p>

      <div className="flex gap-2.5 relative z-10">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full py-3 text-center text-[13px] font-bold text-slate-500 bg-slate-100 border-2 border-slate-200"
              style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
            >
              ✓ 루나가 기억해둘게!
            </motion.div>
          ) : (
            <>
              {data.choices.map((choice, idx) => (
                <motion.button
                  key={choice.value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + idx * 0.1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelect(choice.value)}
                  disabled={disabled}
                  className={`py-3 font-bold text-[12.5px] transition-all border-[2.5px] ${
                    idx === 0
                      ? 'flex-1 bg-white border-slate-700/30 text-slate-600 hover:bg-slate-50'
                      : 'flex-[1.5] bg-pink-400 text-white border-slate-700 hover:bg-pink-500'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                  style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
                >
                  {choice.label}
                </motion.button>
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
