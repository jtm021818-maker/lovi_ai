'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { PhaseEvent, EmotionMirrorData, RelationshipScenario } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';
import { useTypewriter } from '@/hooks/useTypewriter';

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
function parseSceneLine(line: string): { speaker?: string; action?: string; dialog: string } {
  const speakerMatch = line.match(/^\[([^\]]+)\]\s*/);
  const speaker = speakerMatch?.[1];
  const rest = speaker ? line.slice(speakerMatch![0].length) : line;
  const actionMatch = rest.match(/^\(([^)]+)\)\s*(.*)$/);
  if (actionMatch) return { speaker, action: actionMatch[1], dialog: actionMatch[2] };
  return { speaker, dialog: rest };
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

/** 캐릭터 스프라이트 경로 */
const SPRITE = {
  female: '/char_img/event1_luna_girl.png',
  male: '/char_img/event1_luna_man.png',
};

// ============================================================
// 타입
// ============================================================

interface EmotionMirrorProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type ScenePhase = 'intro' | 'playing' | 'reveal' | 'message' | 'choice';

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
      {/* Speaker 태그 */}
      {isDuo && parsed.speaker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-1"
        >
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isOpponent
                ? 'bg-blue-500/30 text-blue-200'
                : 'bg-rose-500/30 text-rose-200'
            }`}
          >
            {isOpponent ? '💬 상대' : '🎭 나'}
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
  // v49: Visual Novel 모드
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

  // intro → playing 자동 전환
  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => setPhase('playing'), 1200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

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

  // 현재 대사의 파싱 결과 (speaker 확인용)
  const currentParsed = phase === 'playing' ? parseSceneLine(lines[lineIndex]) : null;
  const isCurrentOpponent = currentParsed?.speaker === '상대';

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

  // 배경 스타일
  const bgStyle = data.backgroundImageBase64
    ? { backgroundImage: `url(data:image/jpeg;base64,${data.backgroundImageBase64})` }
    : { background: (scenario && SCENARIO_GRADIENTS[scenario]) || DEFAULT_GRADIENT };

  // 스프라이트 결정
  const gender = data.characterSetup?.userGender || 'female';
  const mainSprite = SPRITE[gender] || SPRITE.female;
  const opponentSprite = gender === 'male' ? SPRITE.female : SPRITE.male;

  // 겉감정/속마음 라인 구분 (전환점 기준)
  const transitionIdx = Math.max(Math.floor(lines.length * 0.6), 2);
  const isSurfaceLine = lineIndex < transitionIdx;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="my-4 max-w-[92%] ml-auto overflow-hidden rounded-2xl shadow-2xl"
    >
      {/* VN 씬 컨테이너 */}
      <div
        className="relative overflow-hidden cursor-pointer select-none"
        style={{ aspectRatio: '9/14', maxHeight: '65vh', minHeight: '380px' }}
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

        {/* 캐릭터 스프라이트 */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {isDuo ? (
            <>
              {/* 나 (왼쪽) */}
              <motion.div
                animate={{
                  y: [0, -3, 0],
                  opacity: isCurrentOpponent ? 0.4 : 1,
                  filter: isCurrentOpponent ? 'brightness(0.5)' : 'brightness(1)',
                }}
                transition={{
                  y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                  opacity: { duration: 0.4 },
                  filter: { duration: 0.4 },
                }}
                className="absolute bottom-[8%] left-[2%] h-[55%] w-auto"
              >
                <Image
                  src={mainSprite}
                  alt="나"
                  width={300}
                  height={500}
                  className="h-full w-auto object-contain drop-shadow-2xl"
                  preload
                />
              </motion.div>
              {/* 상대 (오른쪽) */}
              <motion.div
                animate={{
                  y: [0, -3, 0],
                  opacity: isCurrentOpponent ? 1 : 0.4,
                  filter: isCurrentOpponent ? 'brightness(1)' : 'brightness(0.5)',
                }}
                transition={{
                  y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
                  opacity: { duration: 0.4 },
                  filter: { duration: 0.4 },
                }}
                className="absolute bottom-[8%] right-[2%] h-[55%] w-auto"
                style={{ transform: 'scaleX(-1)' }}
              >
                <Image
                  src={opponentSprite}
                  alt="상대"
                  width={300}
                  height={500}
                  className="h-full w-auto object-contain drop-shadow-2xl"
                  preload
                />
              </motion.div>
            </>
          ) : (
            /* Solo 모드 — 중앙 */
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-[8%] left-1/2 -translate-x-1/2 h-[55%] w-auto"
            >
              <Image
                src={mainSprite}
                alt="캐릭터"
                width={300}
                height={500}
                className="h-full w-auto object-contain drop-shadow-2xl"
                priority
              />
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

            {/* Message */}
            {phase === 'message' && (
              <motion.div
                key="message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-black/60 backdrop-blur-md rounded-t-2xl py-4 px-4"
              >
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[13px] font-bold text-white/80 text-center"
                >
                  {data.lunaMessage}
                </motion.p>
              </motion.div>
            )}

            {/* Intro 로딩 */}
            {phase === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-black/50 backdrop-blur-sm rounded-t-2xl py-5 px-4"
              >
                <div className="flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      className="w-2 h-2 rounded-full bg-white/60"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 선택 버튼 (씬 밖, 하단) */}
      <AnimatePresence>
        {phase === 'choice' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 p-3 bg-[#faf9f5]"
          >
            {submitted ? (
              <div className="w-full py-3 text-center text-[13px] font-bold text-slate-500 bg-slate-100 rounded-xl">
                ✓ 루나가 기억해둘게!
              </div>
            ) : (
              data.choices.map((choice, idx) => (
                <motion.button
                  key={choice.value}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelect(choice.value)}
                  disabled={disabled}
                  className={`py-3 rounded-xl font-bold text-[12.5px] transition-all ${
                    idx === 0
                      ? 'flex-1 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'flex-[1.5] bg-purple-500 text-white border-2 border-purple-600 hover:bg-purple-600'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                >
                  {choice.label}
                </motion.button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
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
