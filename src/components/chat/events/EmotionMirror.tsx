'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, EmotionMirrorData, RelationshipScenario } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';
import { useTypewriter } from '@/hooks/useTypewriter';
import TheaterOpening from './TheaterOpening';
import CinematicTransition from './CinematicTransition';
import LunaSprite from '@/components/common/LunaSprite';

// 🆕 v82.8: 루나극장 진입 — 3초 글로우 + 말풍선 모핑 확장
//   `true`  → CinematicTransition (3s pre-glow → bubble morph → film frame → explosion)
//   `false` → TheaterOpening (mp4 비디오 — `/루나극장_오프닝.mp4`)
//   유저 피드백: mp4 는 1초 만에 지나감. 3초 동안 이전 버블 읽고 burst → 필름 확산 원함.
const USE_CINEMATIC_TRANSITION = true;

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

/**
 * [speaker] (지문) 대사 파싱
 * 🆕 v61: characterSetup 전달 시 userLabel/partnerLabel 로 정확한 성별 매핑,
 *        없으면 기존 fallback (speaker 문자열에서 "남"/"여" 추출)
 */
function parseSceneLine(
  line: string,
  characterSetup?: { userLabel?: string; partnerLabel?: string; userGender?: 'male' | 'female'; partnerGender?: 'male' | 'female' },
): { speaker?: string; gender?: 'male' | 'female'; action?: string; dialog: string } {
  const speakerMatch = line.match(/^\[([^\]]+)\]\s*/);
  const speaker = speakerMatch?.[1];
  const rest = speaker ? line.slice(speakerMatch![0].length) : line;
  const actionMatch = rest.match(/^\(([^)]+)\)\s*(.*)$/);

  let gender: 'male' | 'female' | undefined;
  if (speaker) {
    const s = speaker.trim();
    // 1. characterSetup 기반 매핑 (정확)
    if (characterSetup) {
      if (s === characterSetup.userLabel) gender = characterSetup.userGender;
      else if (s === characterSetup.partnerLabel) gender = characterSetup.partnerGender;
    }
    // 2. Fallback: speaker 문자열에서 추출
    if (!gender) {
      if (s === '남자' || s === '남' || s.includes('남')) gender = 'male';
      else if (s === '여자' || s === '여' || s.includes('여')) gender = 'female';
    }
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
  female: '/char_img/event1_luna_girl.webp',
  male: '/char_img/event1_luna_man.webp',
};
const SPRITE_COLS = 4;
const SPRITE_ROWS = 2;
// 프레임 인덱스 (0-8): 0=기본, 1=슬픔, 2=화남, 3=생각, 4=놀람, 5=약간웃음, 6=걱정, 7=당당, 8=매우행복/환희
type SpriteFrame = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * 여자역할 전용 애니메이션 오버라이드 (v88):
 *   0 (기본)       → luna_sprite_nomal_cropped.webp
 *   1 (슬픔)       → luna_sprite_movie_1.webp
 *   5 (약간행복)   → luna_sprite_nomal_cropped.webp (살짝 행복, 설렘)
 *   8 (매우행복)   → luna_sprite_movie_2.webp (감격/환희, LLM이 판단)
 */
const FEMALE_MOVIE_SPRITE: Partial<Record<SpriteFrame, string>> = {
  0: '/splite/luna_sprite_nomal_cropped.webp',
  1: '/splite/luna_sprite_movie_1.webp',
  5: '/splite/luna_sprite_nomal_cropped.webp',
  8: '/splite/luna_sprite_movie_2.webp',
};
const MOVIE_SPRITE_COLS = 7;
const MOVIE_SPRITE_ROWS = 7;
const MOVIE_SPRITE_FRAME_ASPECTS: Partial<Record<SpriteFrame, number>> = {
  0: 192 / 117,
  1: 2400 / 1350,
  5: 192 / 117,
  8: 2400 / 1350,
};

/** 감정/상황에 맞는 스프라이트 프레임 선택 (LLM 프레임 없을 때 폴백) */
function pickSpriteFrame(emotion: string, isReveal: boolean): SpriteFrame {
  if (isReveal) return 3;
  const lower = emotion.toLowerCase();
  if (lower.includes('화') || lower.includes('짜증') || lower.includes('분노')) return 2;
  if (lower.includes('슬') || lower.includes('울') || lower.includes('아프')) return 1;
  if (lower.includes('불안') || lower.includes('걱정') || lower.includes('무서')) return 6;
  if (lower.includes('놀') || lower.includes('헐') || lower.includes('충격')) return 4;
  if (lower.includes('감격') || lower.includes('환희') || lower.includes('너무좋') || lower.includes('너무 좋')) return 8;
  if (lower.includes('웃') || lower.includes('행복') || lower.includes('좋') || lower.includes('설렘')) return 5;
  if (lower.includes('당당') || lower.includes('자신') || lower.includes('용기')) return 7;
  return 0;
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

type ScenePhase = 'intro' | 'intro_video' | 'playing' | 'reveal' | 'message' | 'choice' | 'correction' | 'closing' | 'closed';

/** 🆕 v82.10: 정정 메시지 마커 — MessageBubble 에서 감지해서 특화 스타일 적용 */
export const MIRROR_CORRECTION_MARKER = '📝 내 진짜 마음은 이래: ';

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

  function handleConfirmSelect() {
    if (disabled || submitted) return;
    setSubmitted(true);
    onSelect('어... 맞아, 그런 것 같아', {
      source: 'emotion_mirror',
      context: { confirmed: true, reveal: data.reveal, lunaHunch: data.lunaHunch },
    });
  }

  /** 🆕 v82.10: 정정 제출 — 유저가 적은 실제 마음 + 루나 틀린 부분 함께 전달 */
  function handleCorrectionSubmit(correctionText: string) {
    if (disabled || submitted) return;
    const clean = correctionText.trim();
    if (!clean) return;
    setSubmitted(true);
    // 루나 프롬프트에 충분한 맥락: 루나가 추리한 게 뭐였고 / 실제는 뭔지.
    const richText = `${MIRROR_CORRECTION_MARKER}${clean}`;
    onSelect(richText, {
      source: 'emotion_mirror',
      context: {
        confirmed: false,
        correction: true,
        userCorrection: clean,
        lunaGuessed: data.reveal,
        lunaHunch: data.lunaHunch,
      },
    });
  }

  // ─────────────────────────────────────────
  // v49: Visual Novel 모드 (풀스크린 → 채팅 복귀)
  // ─────────────────────────────────────────
  if (hasScene) {
    return (
      <VNScene
        data={data}
        onConfirm={handleConfirmSelect}
        onCorrect={handleCorrectionSubmit}
        disabled={disabled}
        submitted={submitted}
      />
    );
  }

  // ─────────────────────────────────────────
  // 레거시 폴백 (sceneLines 없을 때)
  // ─────────────────────────────────────────
  return <LegacyMirror data={data} onConfirm={handleConfirmSelect} onCorrect={handleCorrectionSubmit} disabled={disabled} submitted={submitted} />;
}

// ============================================================
// VN Scene 컴포넌트
// ============================================================

function VNScene({
  data,
  onConfirm,
  onCorrect,
  disabled,
  submitted,
}: {
  data: EmotionMirrorData;
  onConfirm: () => void;
  onCorrect: (correctionText: string) => void;
  disabled?: boolean;
  submitted: boolean;
}) {
  const lines = data.sceneLines!;
  const isDuo = data.characterSetup?.mode === 'duo';
  const scenario = (data as any).scenario as RelationshipScenario | undefined;

  const [phase, setPhase] = useState<ScenePhase>('intro');
  const [lineIndex, setLineIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  // 🆕 v82.10: 정정 입력 상태
  const [correctionInput, setCorrectionInput] = useState('');
  const [bgImageLoaded, setBgImageLoaded] = useState(false);

  // Portal mount (SSR 방지)
  useEffect(() => { setMounted(true); }, []);

  // 배경 이미지 preload — 디코딩 완료 전까지 gradient 유지, 완료 시 fade in
  useEffect(() => {
    if (!data.backgroundImageBase64) return;
    setBgImageLoaded(false);
    const img = new Image();
    img.onload = () => setBgImageLoaded(true);
    img.src = `data:image/jpeg;base64,${data.backgroundImageBase64}`;
  }, [data.backgroundImageBase64]);

  // intro → playing: TheaterOpening 완료 시 전환 (콜백으로)
  const handleIntroComplete = useCallback(() => setPhase('playing'), []);

  // 🆕 v82.6: reveal/message 는 탭으로 넘기도록 변경 — 자동 타이머 제거.
  //   기존: reveal 2.5s → message 2s → choice  (글 읽기도 전에 지나감)
  //   지금: 탭으로 reveal → message → choice. 안전망으로 15s 지나면 자동 진행.
  useEffect(() => {
    if (phase === 'reveal' || phase === 'message') {
      const timer = setTimeout(() => {
        setPhase(phase === 'reveal' ? 'message' : 'choice');
      }, 15000);
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

  // 🆕 v82.10: confirm 은 즉시 종료, different 는 correction phase 로 전환
  const handleChoice = useCallback((value: string) => {
    if (value === 'confirm') {
      onConfirm();
      setTimeout(() => setPhase('closing'), 300);
    } else {
      // "다른 느낌" → 즉시 종료 X. 유저가 "진짜 마음" 을 적을 기회를 먼저 줌.
      setPhase('correction');
    }
  }, [onConfirm]);

  // 🆕 v82.10: 정정 제출
  const handleCorrectionSend = useCallback(() => {
    const clean = correctionInput.trim();
    if (!clean) return;
    onCorrect(clean);
    setTimeout(() => setPhase('closing'), 300);
  }, [correctionInput, onCorrect]);

  // 🆕 v82.10: 정정 건너뛰기 — 유저가 적을 말 없으면 그냥 닫기 (이전 프리팹 폴백)
  const handleCorrectionSkip = useCallback(() => {
    onCorrect('루나 짐작이 좀 어긋났어');
    setTimeout(() => setPhase('closing'), 300);
  }, [onCorrect]);

  // 스프라이트 시트 결정 — [남자] → man, [여자] → girl 고정 매핑
  const gender = data.characterSetup?.userGender || 'female';
  const mainSheet = SPRITE_SHEET[gender] || SPRITE_SHEET.female;
  const maleSheet = SPRITE_SHEET.male;   // event1_luna_man.webp
  const femaleSheet = SPRITE_SHEET.female; // event1_luna_girl.webp

  // 현재 대사의 파싱 결과 (speaker + 성별 확인용) — v61: characterSetup 으로 라벨 기반 정확 매핑
  const currentParsed = phase === 'playing' ? parseSceneLine(lines[lineIndex], data.characterSetup) : null;
  // 현재 대사의 캐릭터가 어느 쪽인지 (성별 기반 스프라이트 선택)
  const currentLineGender = currentParsed?.gender;
  // (보존: 추후 좌우 반전/스프라이트 결정용)
  void (isDuo && currentLineGender !== undefined && currentLineGender !== gender);
  void (currentLineGender === 'male' ? SPRITE_SHEET.male : currentLineGender === 'female' ? SPRITE_SHEET.female : mainSheet);

  // 탭으로 진행 — 🆕 v82.6: reveal/message 도 탭으로 넘김
  const handleTap = useCallback(() => {
    if (phase === 'playing') {
      if (lineIndex < lines.length - 1) {
        setLineIndex((i) => i + 1);
      } else {
        setPhase('reveal');
      }
    } else if (phase === 'reveal') {
      setPhase('message');
    } else if (phase === 'message') {
      setPhase('choice');
    }
  }, [phase, lineIndex, lines.length]);

  const bgGradient = (scenario && SCENARIO_GRADIENTS[scenario]) || DEFAULT_GRADIENT;

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
      if (llmFrame !== undefined) return Math.min(8, Math.max(0, llmFrame)) as SpriteFrame;
      return pickSpriteFrame(parseSceneLine(lines[lineIndex], data.characterSetup).dialog, false);
    }
    return 0;
  })();
  // 솔로/듀오 모두 520px — 화면을 꽉 채우는 Heroic VN 느낌
  const spriteSize = 520;

  // Duo 모드: 현재 화자 스프라이트 시트 결정 (한 명씩 교체)
  const activeDuoSheet = (() => {
    if (!isDuo) return mainSheet;
    if (currentLineGender === 'male') return maleSheet;
    if (currentLineGender === 'female') return femaleSheet;
    return mainSheet; // 화자 미지정 fallback
  })();
  // 화자 전환 감지 키 (AnimatePresence용)
  const duoSpeakerKey = isDuo ? (currentLineGender ?? 'unknown') : 'solo';

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
        {/* 🆕 v80: 언니 감 보조 멘트 (선택) */}
        {data.lunaHunch && (
          <p className="text-[11px] text-purple-700/70 leading-snug italic mb-1">
            {data.lunaHunch}
          </p>
        )}
        <p className="text-[10px] text-purple-400">
          {submitted ? '✓ 루나가 기억해둘게!' : (data.imperfectionDisclaimer ?? data.lunaMessage)}
        </p>
      </motion.div>
    );
  }

  // 풀스크린 VN 씬 (Portal → document.body) — v50 영화관 컨셉
  const vnContent = (
    <>
      {/* 🆕 v82.13: 2-stage 인트로 체인
          Stage 1: 말풍선 글로우 + 버스트 (CinematicTransition, mode='glow-only')
          Stage 2: mp4 오프닝 영상 (TheaterOpening)
          Stage 3: VN 씬 (phase='playing')
          유저 피드백: 글로우 연출이 예쁘니 유지 + 오프닝 영상도 재생 후 VN 진행. */}
      {phase === 'intro' && USE_CINEMATIC_TRANSITION && (
        <CinematicTransition
          mode="glow-only"
          onComplete={() => setPhase('intro_video')}
          tagline={data.sceneTitle}
        />
      )}
      {phase === 'intro_video' && (
        <TheaterOpening onComplete={handleIntroComplete} />
      )}

      <AnimatePresence>
        <motion.div
          key="vn-fullscreen"
          initial={{ opacity: 0 }}
          // 🆕 v82.13: intro/intro_video 동안엔 VN 백드롭 opacity=0 유지 — 각 stage 가 각자 렌더.
          animate={{ opacity: (phase === 'closing' || phase === 'intro' || phase === 'intro_video') ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: phase === 'closing' ? 0.5 : 0.4 }}
          className="fixed inset-0 z-40 bg-black"
          style={{ height: '100dvh' }}
        >
          {/* 🎬 fallback (cinematic 비활성 시 mp4 오프닝만) */}
          {phase === 'intro' && !USE_CINEMATIC_TRANSITION && (
            <TheaterOpening onComplete={handleIntroComplete} />
          )}

          {/* 씬 컨테이너 (풀스크린) */}
          <motion.div
            animate={phase === 'closing' ? { scale: 0.85, opacity: 0, borderRadius: '24px' } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="relative w-full h-full overflow-hidden cursor-pointer select-none"
            onClick={handleTap}
          >
        {/* 배경 gradient 기저 레이어 — 이미지 로드 전/없을 때 항상 표시 */}
        <div className="absolute inset-0" style={{ background: bgGradient }} />
        {/* 배경 이미지 + Ken Burns — preload 완료 후 fade in (컬러박스 플래시 방지) */}
        {data.backgroundImageBase64 && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: bgImageLoaded ? 1 : 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(data:image/jpeg;base64,${data.backgroundImageBase64})` }}
              animate={bgImageLoaded ? {
                scale: [1.0, 1.08, 1.05, 1.0],
                x: ['0%', '-1.5%', '1%', '0%'],
                y: ['0%', '-1%', '-0.5%', '0%'],
              } : undefined}
              transition={bgImageLoaded ? {
                duration: 25,
                repeat: Infinity,
                ease: 'easeInOut',
              } : undefined}
            />
          </motion.div>
        )}

        {/* 🎬 시네마 비네팅 (영화관 느낌) */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)' }}
        />

        {/* 하단 어둡게 (대사 가독성) — 더 영화적으로 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

        {/* 🎬 시네마 레터박스 (상단/하단 검은 바) */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: phase === 'intro' ? 0 : 28 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute top-0 left-0 right-0 z-[2] bg-black"
        />
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: phase === 'intro' ? 0 : 28 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute bottom-0 left-0 right-0 z-[2] bg-black"
        />

        {/* Reveal 시 스포트라이트 효과 */}
        <AnimatePresence>
          {(phase === 'reveal' || phase === 'message') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(147,51,234,0.15) 0%, rgba(0,0,0,0.6) 70%)' }}
            />
          )}
        </AnimatePresence>

        {/* 🎬 장면 타이틀 — 영화 자막 스타일 */}
        <AnimatePresence>
          {phase !== 'intro' && phase !== 'closing' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute top-[34px] left-0 right-0 z-20 flex justify-center"
            >
              <div className="flex items-center gap-2 px-4 py-1.5"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.7) 20%, rgba(0,0,0,0.7) 80%, transparent 100%)',
                }}>
                <div className="w-5 h-[1px] bg-gradient-to-r from-transparent to-amber-400/60" />
                <span className="text-[9px] tracking-[0.25em] uppercase text-amber-300/70 font-medium">
                  Scene
                </span>
                <span className="text-[12px] font-bold text-white/90 tracking-wide">
                  {data.sceneTitle || '너의 그 순간'}
                </span>
                <div className="w-5 h-[1px] bg-gradient-to-l from-transparent to-amber-400/60" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🎬 캐릭터 스프라이트 — VN 히어로 스타일 (한 번에 한 명) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* 솔로/듀오 공통: 중앙 한 명만 렌더링 */}
          <motion.div
            animate={{
              scale: [1, 1.03, 1],
              y: [0, -6, 0],
            }}
            transition={{
              scale: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute bottom-[24%] left-1/2"
            style={{
              marginLeft: -(spriteSize / 2),
              filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.6))',
            }}
          >
            <AnimatePresence mode="wait">
              {(phase === 'message' || phase === 'choice') ? (
                /* 🆕 v82.17: 메시지/선택지 — 애니메이션 되는 LunaSprite 로 교체 (8프레임 순환) */
                <motion.div
                  key="special-luna"
                  initial={{ scale: 0.5, opacity: 0, y: 60 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 30 }}
                  transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <LunaSprite
                    size={spriteSize}
                    circle={false}
                    speed="normal"
                  />
                </motion.div>
              ) : (activeDuoSheet === femaleSheet && FEMALE_MOVIE_SPRITE[currentFrame]) ? (
                /* 🆕 여자역할 기본(0)/슬픔(1)/웃음(5) — 49프레임 애니메이션 스프라이트로 교체 */
                <motion.div
                  key={`movie-${duoSpeakerKey}-${currentFrame}`}
                  initial={{ opacity: 0, scale: 0.88, x: currentLineGender === 'male' ? -30 : 30 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.88, x: currentLineGender === 'male' ? 30 : -30 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{
                    width: spriteSize,
                    height: spriteSize * (384 / 344),
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    filter: 'brightness(1.05) saturate(1.1)',
                  }}
                >
                  <LunaSprite
                    size={spriteSize * (384 / 344) / (MOVIE_SPRITE_FRAME_ASPECTS[currentFrame] || 1.778)}
                    src={FEMALE_MOVIE_SPRITE[currentFrame]!}
                    cols={MOVIE_SPRITE_COLS}
                    rows={MOVIE_SPRITE_ROWS}
                    frameAspect={MOVIE_SPRITE_FRAME_ASPECTS[currentFrame] || 1.778}
                    circle={false}
                    speed="normal"
                  />
                </motion.div>
              ) : (
                /* playing/reveal: 현재 화자 스프라이트 (솔로/듀오 모두) */
                <motion.div
                  key={`speaker-${duoSpeakerKey}-${currentFrame}`}
                  initial={{ opacity: 0, scale: 0.88, x: currentLineGender === 'male' ? -30 : 30 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.88, x: currentLineGender === 'male' ? 30 : -30 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{
                    ...getSpriteStyle(currentFrame, activeDuoSheet, spriteSize),
                    filter: 'brightness(1.05) saturate(1.1)',
                  }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* 🎬 대화 영역 — 시네마 자막 패널 */}
        <div className="absolute bottom-[28px] left-0 right-0 z-20">
          <AnimatePresence mode="wait">
            {/* Playing: 대사 — 영화 자막 스타일 */}
            {phase === 'playing' && (
              <motion.div
                key={`line-${lineIndex}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mx-3 rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(10,6,15,0.85) 0%, rgba(15,10,25,0.95) 100%)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {/* 필름 프레임 카운터 상단 바 */}
                <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
                  {/* 필름 스트립 프로그레스 */}
                  <div className="flex items-center gap-1">
                    {lines.map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          backgroundColor: i < lineIndex ? 'rgba(251,191,36,0.8)' : i === lineIndex ? '#ffffff' : 'rgba(255,255,255,0.12)',
                          scale: i === lineIndex ? 1.3 : 1,
                        }}
                        className="w-1.5 h-1.5 rounded-full"
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-amber-300/60 tracking-wider">
                      {String(lineIndex + 1).padStart(2, '0')}/{String(lines.length).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* 구분선 */}
                <div className="mx-4 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.2), transparent)' }} />

                {/* 대사 */}
                <div className="pt-2 pb-1">
                  <DialogueLine
                    key={`dl-${lineIndex}`}
                    line={lines[lineIndex]}
                    isActive={true}
                    isDuo={isDuo}
                  />
                </div>

                {/* 탭 힌트 — 시네마틱 */}
                <motion.div
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center justify-center gap-1.5 pb-2.5"
                >
                  <div className="w-3 h-[1px] bg-white/20" />
                  <span className="text-white/30 text-[9px] tracking-widest uppercase font-medium">tap</span>
                  <div className="w-3 h-[1px] bg-white/20" />
                </motion.div>
              </motion.div>
            )}

            {/* Reveal — 스포트라이트 + 시네마 프레임 */}
            {phase === 'reveal' && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-3 rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(15,5,30,0.9) 0%, rgba(25,10,50,0.95) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(168,85,247,0.3)',
                  boxShadow: '0 0 60px rgba(147,51,234,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <div className="px-5 py-5">
                  {/* 이모지 — 프로젝터 빔 효과 */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                    className="text-center mb-3 relative"
                  >
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-20 h-20 rounded-full" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)' }} />
                    </motion.div>
                    <span className="relative text-4xl">{data.deepEmoji}</span>
                  </motion.div>

                  {/* 라벨 */}
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="flex items-center justify-center gap-2 mb-3"
                  >
                    <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4))' }} />
                    <span className="text-[9px] tracking-[0.3em] uppercase text-purple-300/70 font-medium">루나 감으로는</span>
                    <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(270deg, transparent, rgba(168,85,247,0.4))' }} />
                  </motion.div>

                  {/* Reveal 텍스트 — 질문/추측 톤 */}
                  <motion.p
                    initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="text-[15px] font-bold text-white text-center leading-relaxed"
                    style={{ textShadow: '0 0 30px rgba(168,85,247,0.3)' }}
                  >
                    &ldquo;{data.reveal}&rdquo;
                  </motion.p>

                  {/* 🆕 v80: lunaHunch (선택) — "그냥 감인데..." 보조 한마디 */}
                  {data.lunaHunch && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 0.75, y: 0 }}
                      transition={{ delay: 0.9, duration: 0.5 }}
                      className="text-[12px] text-purple-200/80 text-center leading-relaxed mt-3 italic"
                    >
                      {data.lunaHunch}
                    </motion.p>
                  )}

                  {/* 🆕 v80: imperfectionDisclaimer — 인간미 한마디 */}
                  {data.imperfectionDisclaimer && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.55 }}
                      transition={{ delay: 1.1, duration: 0.4 }}
                      className="text-[10px] text-purple-300/60 text-center mt-2"
                    >
                      — {data.imperfectionDisclaimer}
                    </motion.p>
                  )}

                  {/* 🆕 v82.6: 탭 힌트 — 자동 넘김 제거돼서 유저가 직접 탭해야 함 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.6, 0.3, 0.6] }}
                    transition={{ delay: 1.5, duration: 2.5, repeat: Infinity }}
                    className="flex items-center justify-center gap-1.5 mt-4"
                  >
                    <div className="w-3 h-[1px] bg-purple-300/40" />
                    <span className="text-purple-200/60 text-[9px] tracking-widest uppercase font-medium">tap</span>
                    <div className="w-3 h-[1px] bg-purple-300/40" />
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Message — 시네마 중앙 텍스트 */}
            {phase === 'message' && (
              <motion.div
                key="message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/50"
                />
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                  className="relative z-10 px-7 py-5 rounded-2xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15,5,30,0.9), rgba(25,10,50,0.95))',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(147,51,234,0.15)',
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-4 h-[1px] bg-amber-400/40" />
                    <span className="text-[8px] tracking-[0.3em] uppercase text-amber-300/50 font-medium">혹시...</span>
                    <div className="w-4 h-[1px] bg-amber-400/40" />
                  </div>
                  <p className="text-[15px] font-bold text-white text-center leading-relaxed"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                    {data.lunaMessage}
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Intro — 빈 상태 (TheaterOpening이 덮고 있음) */}
            {phase === 'intro' && (
              <motion.div key="intro" className="py-5" />
            )}

            {/* 🆕 v82.10: 정정 입력 — "다른 느낌" 눌렀을 때 유저의 실제 마음 받기 */}
            {phase === 'correction' && (
              <motion.div
                key="correction"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="mx-3 rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(35,15,55,0.95) 0%, rgba(45,20,70,0.97) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(217,70,239,0.45)',
                  boxShadow: '0 0 60px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                <div className="px-5 py-4">
                  {/* 헤더 — 루나 틀린 걸 인정 */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-4 h-[1px] bg-fuchsia-400/50" />
                    <span className="text-[9px] tracking-[0.3em] uppercase text-fuchsia-300/80 font-medium">내 진짜 마음은</span>
                    <div className="w-4 h-[1px] bg-fuchsia-400/50" />
                  </div>

                  {/* 루나가 짐작한 것 (틀린 것) — 회색톤 strikethrough 느낌 */}
                  <p className="text-[11px] text-white/45 text-center mb-2 leading-relaxed line-through">
                    루나 짐작: &ldquo;{data.reveal}&rdquo;
                  </p>

                  {/* 입력 라벨 */}
                  <p className="text-[12px] text-fuchsia-200 text-center mb-2 leading-relaxed">
                    ✏️ 어디가 달랐어? 네 버전으로 얘기해줘
                  </p>

                  {/* 정정 textarea */}
                  <textarea
                    autoFocus
                    value={correctionInput}
                    onChange={(e) => setCorrectionInput(e.target.value)}
                    placeholder="예: 분노보다는 허탈함에 가까워..."
                    className="w-full min-h-[80px] p-3 rounded-xl text-[13px] leading-relaxed text-white placeholder-white/30 focus:outline-none resize-none"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(217,70,239,0.3)',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCorrectionSend();
                    }}
                  />

                  {/* 버튼들 */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleCorrectionSkip}
                      disabled={disabled || submitted}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white/60 disabled:opacity-40"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      그냥 넘길래
                    </button>
                    <button
                      onClick={handleCorrectionSend}
                      disabled={!correctionInput.trim() || disabled || submitted}
                      className="flex-[1.6] py-2.5 rounded-xl text-[12.5px] font-bold text-white disabled:opacity-40 active:scale-[0.98] transition-transform"
                      style={{
                        background: 'linear-gradient(135deg, #c026d3, #a21caf)',
                        border: '1px solid rgba(217,70,239,0.6)',
                        boxShadow: '0 4px 20px rgba(192,38,211,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                      }}
                    >
                      루나한테 알려주기
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 🎬 선택 버튼 — 시네마 티켓 스타일 */}
        <AnimatePresence>
          {phase === 'choice' && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="absolute bottom-[28px] left-0 right-0 z-30 px-4"
              style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex gap-3">
                {data.choices.map((choice, idx) => (
                  <motion.button
                    key={choice.value}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.12, type: 'spring', stiffness: 300 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleChoice(choice.value)}
                    disabled={disabled || submitted}
                    className={`py-3.5 rounded-xl font-bold text-[13px] transition-all relative overflow-hidden ${
                      idx === 0
                        ? 'flex-1 text-white/80'
                        : 'flex-[1.5] text-white'
                    } ${disabled || submitted ? 'opacity-50' : ''}`}
                    style={{
                      background: idx === 0
                        ? 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))'
                        : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                      border: idx === 0
                        ? '1px solid rgba(255,255,255,0.15)'
                        : '1px solid rgba(168,85,247,0.5)',
                      boxShadow: idx === 0
                        ? 'none'
                        : '0 4px 20px rgba(147,51,234,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                  >
                    {choice.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🎬 필름 그레인 오버레이 (전체 씬에 항상 적용) */}
        <div className="pointer-events-none absolute inset-0 z-[3] opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)',
          }}
        />

        {/* 비네팅 상단 */}
        <div className="pointer-events-none absolute inset-0 z-[3]"
          style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)' }}
        />

          </motion.div>
        </motion.div>
    </AnimatePresence>
    </>
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
  onConfirm,
  onCorrect,
  disabled,
  submitted,
}: {
  data: EmotionMirrorData;
  onConfirm: () => void;
  onCorrect: (correctionText: string) => void;
  disabled?: boolean;
  submitted: boolean;
}) {
  // 🆕 v82.10: 레거시 UI 는 정정 textarea 없음 → confirm/different 만 구분해서 라우팅
  const handleLegacyChoice = (value: string) => {
    if (value === 'confirm') onConfirm();
    else onCorrect('루나 짐작이 좀 어긋났어');
  };
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
          <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-800">루나가 보기에... 🦊</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">네 마음을 좀 들여다봤어</p>
        </div>
      </div>

      {/* 🆕 v80: 이분법(겉/속) 제거 → 언니 감으로 짐작한 고민 한 카드 + (선택)hunch */}
      <div className="space-y-3 mb-5 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="flex items-start gap-3 p-3 bg-purple-50/60 border-2 border-slate-700/15"
          style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', transform: 'rotate(-0.3deg)' }}
        >
          <span className="text-2xl flex-shrink-0 mt-0.5">{data.deepEmoji || '💭'}</span>
          <div>
            <p className="text-[11px] font-bold text-purple-400 mb-0.5">혹시 이런 고민 아니야?</p>
            <p className="text-[13px] font-bold text-slate-800 leading-snug">
              &ldquo;{data.reveal || data.deepEmotion}&rdquo;
            </p>
          </div>
        </motion.div>

        {/* 선택적 보조 멘트 */}
        {data.lunaHunch && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ delay: 0.5 }}
            className="text-[12px] text-slate-600 leading-relaxed px-2 italic"
          >
            {data.lunaHunch}
          </motion.p>
        )}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-[12px] font-bold text-slate-500 text-center mb-4 relative z-10"
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        {data.imperfectionDisclaimer ?? data.lunaMessage}
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
                  onClick={() => handleLegacyChoice(choice.value)}
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
