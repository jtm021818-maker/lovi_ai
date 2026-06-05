'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
// 🆕 v88: 루나 대화형 "같이 찾기" 블록 렌더러
import BrowseBlockBubble from './BrowseBlockBubble';
import DateDivider from './DateDivider';
import ChatInput from './ChatInput';
import QuickReplyButtons from './QuickReplyButtons';
import InlineSuggestions from './InlineSuggestions';
import PanelBubble from './PanelBubble';
import { useChat } from '@/hooks/useChat';
import { useLunaVoice } from '@/hooks/useLunaVoice';
import { useSessionAutoComplete } from '@/hooks/useSessionAutoComplete';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { CalmingTimer } from '@/components/nudge/CalmingTimer';
import { BreathingGuide } from '@/components/nudge/BreathingGuide';

// 🆕 v8: 7종 이벤트 및 상태 시각화 컴포넌트 임포트
import PhaseProgress from './events/PhaseProgress';
import EmotionThermometer from './events/EmotionThermometer';
import MindReading from './events/MindReading';
import InsightCard from './events/InsightCard';
import EmotionMirror from './events/EmotionMirror';
import LunaStory from './events/LunaStory';
// 🆕 v84: 루나 자율 판단형 인터넷 검색 이벤트
import SongRecommendation from './events/SongRecommendation';
import DateSpotRecommendation from './events/DateSpotRecommendation';
// 🆕 v85: 2026 연애 검색 트렌드 확장 4종
import GiftRecommendation from './events/GiftRecommendation';
import ActivityRecommendation from './events/ActivityRecommendation';
import AnniversaryRecommendation from './events/AnniversaryRecommendation';
import MovieRecommendation from './events/MovieRecommendation';
// 🆕 v85.6: 같이 찾기 (멀티턴 탐색 전략)
import BrowseTogether from './events/BrowseTogether';
import LunaStrategy from './events/LunaStrategy';
// 🆕 v81: BRIDGE 몰입 모드
import LunaStrategyDecision from '@/components/modes/LunaStrategyDecision';
import ToneMode from '@/components/modes/tone/ToneMode';
import IdeaMode from '@/components/modes/idea/IdeaMode';
import DraftMode from '@/components/modes/draft/DraftMode';
import PanelMode from '@/components/modes/panel/PanelMode';
import RoleplayMode from '@/components/modes/roleplay/RoleplayMode';
import BagSheet from '@/components/luna-room/BagSheet';
import { useModeStore } from '@/engines/bridge-modes/mode-store';
import type { ModeId, ToneOption, DraftOption, PanelPersona, RoleplayState } from '@/engines/bridge-modes/types';
import LunaThoughtHistory from './LunaThoughtHistory';
import SituationTimeline from './SituationTimeline';
// 🆕 v40: 루나 딥리서치 "진짜 고민 중" 로딩 UI
import LunaThinkingDeep from './LunaThinkingDeep';
import LunaThoughtBubble from './LunaThoughtBubble';
// 🆕 v48: 캐스케이드 재시도 UI
import LunaRetrying from './LunaRetrying';
// 🆕 v41: 친밀도 레벨업 축하 팝업
import IntimacyLevelUp from '@/components/intimacy/IntimacyLevelUp';
import IntimacyDeltaHint from '@/components/intimacy/IntimacyDeltaHint';
// 🆕 v112-rev2: 카톡 친구 톡방 — 메시지 버블 + Smart Reply
//   rev1 의 카드 7개 (RoomGlimpse / GreetingCard / Badge / Guide / Ambience / IdleCharacter / Orchestrator-w-ambience)
//   는 사용 중단 (파일 보존, 롤백 가능). EntryRitualOrchestrator 만 시퀀스/사운드 용으로 유지.
import EntryRitualOrchestrator from './EntryRitualOrchestrator';
import LunaGreetingMessage from './LunaGreetingMessage';
// 🆕 v117.6: 사용자 10초+ 입력 없으면 루나가 한 줄 더 (세션당 1회, 부드러운 신호)
import LunaIdleNudgeMessage from './LunaIdleNudgeMessage';
// 🆕 v117.5: 진입 UI 자체 완전 제거.
//   사용자 피드백: chip/카드 (분홍 chip, polaroid 픽 등) 모두 "선택지 미니게임" 같아서
//   "언니/누나 카톡 대화하듯" 자연스러운 흐름을 끊음.
//   → 루나의 LLM 인사 메시지 1~3개 + 빈 입력창 + mood 별 placeholder 만 남김.
//   "세 번째 메시지에 살짝 질문성" 가이드는 greeting API SYSTEM 에 inline 으로 들어감.
//   기존 SmartReplyBar / MindPolaroidPicker / MoodPinBadge 는 모두 호출 제거.
import { useStreakDays } from '@/hooks/useStreakDays';
import {
  computeLiveStateLocal,
  type LunaLiveState,
} from '@/lib/luna-life/mood';
import {
  getAgeDays,
  getLifeStageInfo,
} from '@/lib/luna-life';
import { preloadSounds } from '@/lib/audio';
// 🆕 v35: 모드별 SOLVE 이벤트 UI
import ToneSelector from './events/ToneSelector';
import DraftWorkshop from './events/DraftWorkshop';
import RoleplayFeedback from './events/RoleplayFeedback';
import PanelReport from './events/PanelReport';
import IdeaRefine from './events/IdeaRefine';
// 🆕 v39: SOLVE/EMPOWER 재설계 이벤트 UI
import ActionPlan from './events/ActionPlan';
import WarmWrap from './events/WarmWrap';
import PatternMirrorCard from './events/PatternMirrorCard';
import SolutionPreview from './events/SolutionPreview';
import SolutionCard from './events/SolutionCard';
import MessageDraft from './events/MessageDraft';
import GrowthReport from './events/GrowthReport';
import SessionSummary from './events/SessionSummary';
import HomeworkCard from './events/HomeworkCard';

import TarotDraw from './events/TarotDraw';
import TarotAxisCollect from './events/TarotAxisCollect';
import TarotInsight from './events/TarotInsight';
import XRayInlineCard from './events/XRayInlineCard';
// 🆕 v104: Spirit Random Events (20개 정령 카드)
import RageLetter from './events/spirits/RageLetter';
import ThinkFrame from './events/spirits/ThinkFrame';
import CryTogether from './events/spirits/CryTogether';
import FirstBreath from './events/spirits/FirstBreath';
import RhythmCheck from './events/spirits/RhythmCheck';
import OliveBranch from './events/spirits/OliveBranch';
import CloudReframe from './events/spirits/CloudReframe';
import LetterBridge from './events/spirits/LetterBridge';
import WindowOpen from './events/spirits/WindowOpen';
import NightConfession from './events/spirits/NightConfession';
import ReverseRole from './events/spirits/ReverseRole';
import ButterflyDiary from './events/spirits/ButterflyDiary';
import RootedHug from './events/spirits/RootedHug';
import FallenPetals from './events/spirits/FallenPetals';
import FreezeFrame from './events/spirits/FreezeFrame';
import BoltCard from './events/spirits/BoltCard';
import Metamorphosis from './events/spirits/Metamorphosis';
import MemoryKey from './events/spirits/MemoryKey';
import CrownReclaim from './events/spirits/CrownReclaim';
import WishGrant from './events/spirits/WishGrant';
// 🆕 v104.2: 모든 정령 이벤트 공통 컷인 wrapper
import { SpiritEventWithCutIn } from './events/spirits/SpiritEventWithCutIn';
import type { SpiritId } from '@/types/spirit.types';
import type { BoltCardData as SpiritBoltCardData } from '@/engines/spirits/spirit-event-types';
import type { XRayResult } from '@/app/api/xray/analyze/route';
import { RelationshipScenario } from '@/types/engine.types';
import type { NudgeAction, SuggestionMeta, PhaseEvent, TarotAxisCollectData, TarotInsightData } from '@/types/engine.types';
import type { ChatMessage } from '@/types/chat.types';
import { PERSONA_INFO, type PersonaMode } from '@/types/persona.types';

interface ChatContainerProps {
  sessionId: string;
}

/** Returns Tailwind gradient classes based on emotionScore */
function getEmotionGradient(score: number | null): string {
  if (score === null) return 'from-pink-50/40 via-white to-purple-50/30';
  if (score >= 3)  return 'from-pink-100/60 via-rose-50/40 to-pink-50/20';   // positive
  if (score >= 0)  return 'from-pink-50/40 via-white to-purple-50/30';        // neutral
  if (score >= -3) return 'from-blue-50/50 via-indigo-50/30 to-purple-50/30'; // negative
  return 'from-blue-100/60 via-indigo-100/40 to-slate-50/30';                 // serious
}

/** Group messages by calendar date for DateDivider */
function groupMessagesByDate(messages: ChatMessage[]): Array<{ dateKey: string; messages: ChatMessage[] }> {
  const groups: Array<{ dateKey: string; messages: ChatMessage[] }> = [];
  for (const msg of messages) {
    const dateKey = msg.createdAt.slice(0, 10); // YYYY-MM-DD
    const last = groups[groups.length - 1];
    if (last && last.dateKey === dateKey) {
      last.messages.push(msg);
    } else {
      groups.push({ dateKey, messages: [msg] });
    }
  }
  return groups;
}

const PERSONA_TABS: PersonaMode[] = ['luna', 'counselor', 'friend', 'panel'];

/** 시나리오 한글 레이블 + 아이콘 */
const SCENARIO_LABELS: Record<RelationshipScenario, { icon: string; label: string }> = {
  [RelationshipScenario.READ_AND_IGNORED]: { icon: '📱', label: '읽씹 상황' },
  [RelationshipScenario.GHOSTING]: { icon: '👻', label: '잠수/고스팅' },
  [RelationshipScenario.LONG_DISTANCE]: { icon: '🌐', label: '장거리 연애' },
  [RelationshipScenario.JEALOUSY]: { icon: '💚', label: '질투/집착' },
  [RelationshipScenario.INFIDELITY]: { icon: '💔', label: '바람/외도' },
  [RelationshipScenario.BREAKUP_CONTEMPLATION]: { icon: '🔄', label: '이별 고민' },
  [RelationshipScenario.BOREDOM]: { icon: '😐', label: '권태기' },
  [RelationshipScenario.GENERAL]: { icon: '💬', label: '일반 고민' },
  [RelationshipScenario.UNREQUITED_LOVE]: { icon: '💘', label: '짝사랑' },
  [RelationshipScenario.RECONNECTION]: { icon: '🔁', label: '재회/연락' },
  [RelationshipScenario.FIRST_MEETING]: { icon: '✨', label: '새 만남/썸' },
  [RelationshipScenario.COMMITMENT_FEAR]: { icon: '🚪', label: '연애 공포증' },
  [RelationshipScenario.RELATIONSHIP_PACE]: { icon: '⏩', label: '진도 차이' },
  [RelationshipScenario.ONLINE_LOVE]: { icon: '📲', label: '온라인 만남' },
};

export default function ChatContainer({ sessionId }: ChatContainerProps) {
  const { messages, isLoading, nudges, stateResult, suggestions, panelData, axesProgress, phaseEvents, currentPhase, conversationMode, phaseProgress, sessionStatus, sessionSummary, sendMessage, pendingEventLock, lunaThinking, understandingLevel, thinkingDeep, retryStatus, lunaThoughtBubble, intimacyLevelUp, dismissIntimacyLevelUp, intimacyDerived, intimacyDelta,
    // 🆕 v88: 루나 대화형 "같이 찾기"
    handleBrowseDecision, resolvedBrowsePrompts, browseTypingDot,
    // 🆕 v105.2: DAILY_CHAT 작별 시그널
    casualFarewellSignal,
  } = useChat(sessionId);
  const { toggle: toggleSpeak, isSpeaking, speak, isSupported: ttsSupported, settings: voiceSettings, updateSettings: updateVoiceSettings } = useLunaVoice();
  const scrollRef = useRef<HTMLDivElement>(null);
  // 🆕 스크롤: 마지막 AI 메시지 상단으로 이동하기 위한 ref
  const lastAiMsgRef = useRef<HTMLDivElement>(null);
  const prevAiScrollCountRef = useRef(0);
  // 말풍선이 있을 때 AI 응답 스크롤을 말풍선 사라진 후로 미루는 플래그
  const scrollToAiTopPendingRef = useRef(false);
  const [activePersona, setActivePersona] = useState<PersonaMode>('luna');
  const prevMsgCountRef = useRef(0);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  // 🆕 v123: TTS 순차 노출 상태
  const [visibleMessageIds, setVisibleMessageIds] = useState<Set<string>>(new Set());
  const ttsRevealQueueRef = useRef<ChatMessage[]>([]);
  const isRevealingRef = useRef(false);
  // 큐에 이미 적재된 AI 메시지 ID — 재진입 effect 의 중복 적재 방지 (음성 반복 버그 수정)
  const enqueuedIdsRef = useRef<Set<string>>(new Set());

  // 🆕 v123: 화면에 보일 메시지 필터링
  // 🔧 fix: 로딩 중 전체 블랭크(`if (isLoading) return []`) 제거.
  //   기존 코드는 응답 대기(isLoading)마다 이전 대화 전체를 빈 화면으로 만들고,
  //   응답이 끝나야 다시 보이는 회귀를 유발했음.
  //   이제 "음성 순차 노출 대기 중인 AI 메시지"만 숨기고(=visibleMessageIds 에 들어오면 노출),
  //   이전 대화·방금 보낸 유저 메시지·스트리밍 버블은 로딩 중에도 그대로 유지한다.
  const visibleMessages = useMemo(() => {
    if (visibleMessageIds.size === 0) return messages; // 초기화 전 폴백
    return messages.filter((m) => {
      if (visibleMessageIds.has(m.id)) return true;
      // 아직 reveal 되지 않은 메시지: 음성 ON + AI 메시지만 순차 노출 대상 → 숨김.
      // 그 외(유저 메시지, 음성 OFF 시 모든 메시지)는 즉시 노출.
      const pendingTtsReveal = voiceSettings.enabled && m.senderType === 'ai';
      return !pendingTtsReveal;
    });
  }, [messages, visibleMessageIds, voiceSettings.enabled]);

  // 🆕 v79: 마지막 AI 메시지 ID (bubble FX 매칭용)
  const lastAiMsgId = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      if (visibleMessages[i].senderType === 'ai' && visibleMessages[i].content) return visibleMessages[i].id;
    }
    return null;
  }, [visibleMessages]);

  // 구독 상태 + 잔여 횟수
  const [isPremium, setIsPremium] = useState(true); // 기본 true로 깜빡임 방지
  const FREE_DAILY_LIMIT = 5;
  const userMsgCount = messages.filter(m => m.senderType === 'user').length;

  // 🆕 v90: 세션 자동 종료 트리거 (visibility/unload/idle/manual)
  //   → memory_profile, user_memories, session_summary 자동 갱신 보장
  const { manualComplete: completeSessionNow } = useSessionAutoComplete({
    sessionId,
    turnCount: userMsgCount,
    disabled: sessionStatus === 'completed',
  });
  const remaining = isPremium ? Infinity : Math.max(0, FREE_DAILY_LIMIT - userMsgCount);
  const isLimitReached = !isPremium && remaining <= 0;

  // 🆕 v105.2: DAILY_CHAT 작별 시그널 수신 → 5초 후 silent 세션 종료
  //   ACE 가 [CASUAL_BYE] 태그 출력 시 pipeline 이 casualFarewellSignal 발행.
  //   상담의 isFarewellIntent 와 동일한 5초 딜레이로 마지막 말풍선 읽을 시간 확보.
  //   UI 카드/요약 없이 카톡 친구 작별처럼 자연스러운 fade-out.
  useEffect(() => {
    if (!casualFarewellSignal) return;
    if (sessionStatus === 'completed') return;
    console.log('[ChatContainer:v105.2] 🌙 작별 시그널 — 5초 후 세션 종료 예약');
    const timer = setTimeout(() => {
      completeSessionNow();
    }, 5000);
    return () => clearTimeout(timer);
  }, [casualFarewellSignal, sessionStatus, completeSessionNow]);

  useEffect(() => {
    async function checkPremiumAndPersona() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_profiles').select('is_premium, persona_mode').eq('id', user.id).single();
      setIsPremium(data?.is_premium ?? false);
      if (data?.persona_mode) setActivePersona(data.persona_mode as PersonaMode);
    }
    checkPremiumAndPersona();
  }, []);
  const [isScenarioPanelOpen, setIsScenarioPanelOpen] = useState(false);
  const [userOverrideScenario, setUserOverrideScenario] = useState<RelationshipScenario | null>(null);
  const [isThoughtHistoryOpen, setIsThoughtHistoryOpen] = useState(false);
  const [openingVideoEnded, setOpeningVideoEnded] = useState(false);

  // 🆕 v112: 진입 의식 데이터 (streak / 24h 세션수 / birthDate / memoryCount)
  const entry = useStreakDays();

  // 🆕 v112: 사운드 미리 로드 (autoplay 정책 회피 위해 사용자 인터랙션 전에 시도)
  useEffect(() => {
    preloadSounds();
  }, []);

  // 🆕 v112: 루나 라이프 컨텍스트 (ageDays + stage + liveState)
  const lunaAgeDays = useMemo(() => {
    if (!entry.birthDate) return 0;
    return getAgeDays(new Date(entry.birthDate));
  }, [entry.birthDate]);

  const lifeStageInfo = useMemo(() => getLifeStageInfo(lunaAgeDays), [lunaAgeDays]);

  // liveState — mood / activity / timeBand / weather (결정형, 외부 호출 X)
  const liveState: LunaLiveState = useMemo(() => {
    return computeLiveStateLocal({
      ageDays: lunaAgeDays,
      stage: lifeStageInfo.stage,
      serverNowMs: Date.now(),
      recentSessionWithin24h: entry.recentSessionCount24h > 0,
      recentMessageCount24h: 0, // 정확한 카운트 필요 X (mood 영향 미미)
      isDeceased: lifeStageInfo.stage === 'star',
    });
  }, [lunaAgeDays, lifeStageInfo.stage, entry.recentSessionCount24h]);

  // 🆕 v112-rev2 / v117.5: LunaGreetingMessage 도착 완료 ready 플래그.
  //   원래 SmartReplyBar / MindPolaroidPicker 노출 트리거였으나 v117.5 부터 둘 다 제거.
  //   현재는 미사용 상태지만 후속 진입 nudge 등에서 재사용 가능하므로 보존.
  const [readyForReply, setReadyForReply] = useState(false);
  const [xrayResult, setXrayResult] = useState<XRayResult | null>(null);
  const [xrayLoading, setXrayLoading] = useState(false);
  const [isInsightCollapsed, setIsInsightCollapsed] = useState(false);
  const personaRef = useRef<HTMLDivElement>(null);


  // 페르소나 드롭다운 바깥 클릭 처리
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) {
        setIsPersonaOpen(false);
      }
    }
    if (isPersonaOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPersonaOpen]);

  const triggerNextReveal = useCallback(async () => {
    if (isRevealingRef.current || ttsRevealQueueRef.current.length === 0) return;
    isRevealingRef.current = true;

    while (ttsRevealQueueRef.current.length > 0) {
      const nextMsg = ttsRevealQueueRef.current.shift();
      if (!nextMsg) break;

      // 1. 화면에 메시지 노출
      setVisibleMessageIds((prev) => {
        const next = new Set(prev);
        next.add(nextMsg.id);
        return next;
      });

      // 2. 음성 재생 및 완료 대기
      if (nextMsg.content && ttsSupported && voiceSettings.enabled) {
        try {
          await speak(nextMsg.content);
        } catch (err) {
          console.error('[ChatContainer] TTS 재생 실패:', err);
        }
      }
    }

    isRevealingRef.current = false;
  }, [speak, ttsSupported, voiceSettings.enabled]);

  // 1. 초기 메시지 로드 시 visibleMessageIds 설정
  useEffect(() => {
    if (isLoading) return;
    if (visibleMessageIds.size === 0 && messages.length > 0) {
      setVisibleMessageIds(new Set(messages.map((m) => m.id)));
    }
  }, [messages, isLoading, visibleMessageIds.size]);

  // 2. 신규 메시지가 올 때 순차 reveal 제어
  useEffect(() => {
    if (isLoading || messages.length === 0) return;

    // 이미 노출 완료된 ID는 스킵
    const newMessages = messages.filter((m) => !visibleMessageIds.has(m.id));
    if (newMessages.length === 0) return;

    const hasAiMessage = newMessages.some((m) => m.senderType === 'ai');

    // 음성 비활성화 상태이거나, 신규 메시지 중 AI 메시지가 없다면 즉시 노출
    if (!voiceSettings.enabled || !hasAiMessage) {
      setVisibleMessageIds((prev) => {
        const next = new Set(prev);
        newMessages.forEach((m) => next.add(m.id));
        return next;
      });
      return;
    }

    // 음성 활성화 상태이고 신규 AI 메시지가 존재할 때:
    // 유저 메시지나 이벤트 등은 즉시 노출
    const nonAiMessages = newMessages.filter((m) => m.senderType !== 'ai');
    if (nonAiMessages.length > 0) {
      setVisibleMessageIds((prev) => {
        const next = new Set(prev);
        nonAiMessages.forEach((m) => next.add(m.id));
        return next;
      });
    }

    // 신규 AI 메시지들은 큐에 적재하고 순차 reveal 시작.
    // 아직 visible 되지 않은 큐 대기 메시지가 effect 재진입 시 중복 적재되지 않도록
    // enqueuedIdsRef 로 한 번만 적재되도록 보장 (음성 반복/꼬임/지연 버그 수정)
    const newAiMessages = newMessages.filter(
      (m) => m.senderType === 'ai' && !enqueuedIdsRef.current.has(m.id),
    );
    if (newAiMessages.length > 0) {
      newAiMessages.forEach((m) => enqueuedIdsRef.current.add(m.id));
      ttsRevealQueueRef.current = [...ttsRevealQueueRef.current, ...newAiMessages];
      triggerNextReveal();
    }
  }, [messages, isLoading, voiceSettings.enabled, visibleMessageIds, triggerNextReveal]);

  // 페르소나 모드는 설정에서 선택한 값을 그대로 사용 (강제 변경 없음)

  useEffect(() => {
    const aiMsgs = visibleMessages.filter(m => m.senderType === 'ai' && m.content);
    const newAiCount = aiMsgs.length;

    if (newAiCount > prevAiScrollCountRef.current) {
      prevAiScrollCountRef.current = newAiCount;
      if (!lunaThoughtBubble) {
        // 말풍선 없음 → 즉시 응답 상단으로
        requestAnimationFrame(() => {
          lastAiMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else {
        // 말풍선이 아직 있음 → 사라진 후에 스크롤하도록 플래그 세팅
        scrollToAiTopPendingRef.current = true;
      }
    } else if (visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1].senderType === 'user') {
      // 유저 메시지 전송 직후 → 하단으로 (thinking indicator / 말풍선 표시)
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
    // 스트리밍 업데이트 / panelData / suggestions → 스크롤 위치 유지
  }, [visibleMessages, panelData, suggestions, lunaThoughtBubble]);

  // 말풍선이 사라지는 순간 → 대기 중이던 응답 상단 스크롤 실행
  useEffect(() => {
    if (!lunaThoughtBubble && scrollToAiTopPendingRef.current) {
      scrollToAiTopPendingRef.current = false;
      requestAnimationFrame(() => {
        lastAiMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [lunaThoughtBubble]);

  const quickReplies  = nudges.find((n: NudgeAction) => n.type === 'quick_reply');
  const calmingTimer  = nudges.find((n: NudgeAction) => n.type === 'calming_timer');
  const breathingGuide = nudges.find((n: NudgeAction) => n.type === 'breathing_guide');

  const emotionScore  = stateResult?.emotionScore ?? null;
  const gradient      = getEmotionGradient(emotionScore);
  const messageGroups = groupMessagesByDate(visibleMessages);
  const personaInfo   = PERSONA_INFO[activePersona];

  // 시나리오: 유저 오버라이드 > AI 분류
  const detectedScenario = stateResult?.scenario ?? null;
  const activeScenario = userOverrideScenario ?? detectedScenario;
  // 🆕 v38: situationRead 우선 — 시나리오 분류가 없어도 대화 시작되면 상황 태그 영역 표시
  const showScenarioTag = !!stateResult?.situationRead || (activeScenario && activeScenario !== RelationshipScenario.GENERAL) || userMsgCount >= 1;

  /** 페르소나 변경 시 DB 업데이트 */
  function handlePersonaChange(mode: PersonaMode) {
    const prevMode = activePersona;
    setActivePersona(mode);
    setIsPersonaOpen(false);
    fetch('/api/user/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona_mode: mode }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error('[Persona] DB 저장 실패:', res.status, body);
          setActivePersona(prevMode);
        } else {
          console.log(`[Persona] ✅ "${mode}" 저장 완료`);
        }
      })
      .catch((err) => {
        console.error('[Persona] 네트워크 오류:', err);
        setActivePersona(prevMode);
      });
  }

  /** 🆕 v22: 이미지 첨부 → XRay 인라인 분석 */
  async function handleImageAttach(imageBase64: string) {
    setXrayLoading(true);
    setXrayResult(null);
    try {
      const res = await fetch('/api/xray/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      if (res.ok) {
        const data: XRayResult = await res.json();
        setXrayResult(data);
      }
    } catch (err) {
      console.error('[XRay] 인라인 분석 실패:', err);
    } finally {
      setXrayLoading(false);
    }
  }

  /** 시나리오 수정 — 사용자가 직접 바꾸면 locked_scenario도 업데이트 */
  function handleScenarioOverride(scenario: RelationshipScenario) {
    setUserOverrideScenario(scenario === RelationshipScenario.GENERAL ? null : scenario);
    setIsScenarioPanelOpen(false);
    
    // 🆕 v9: DB에 locked_scenario도 업데이트 (fire-and-forget)
    fetch(`/api/sessions/${sessionId}/scenario`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenario === RelationshipScenario.GENERAL ? null : scenario }),
    }).catch(err => console.error('[Scenario] DB 업데이트 실패:', err));
  }

  // 🆕 v82.11: Luna 자동 전략 결정 — "다른 방법으로 할래" 누른 이벤트는 수동 ModeSelector 로 폴백
  const [manualStrategyOverride, setManualStrategyOverride] = useState<Record<string, boolean>>({});

  // 🆕 v81: 몰입 모드 진입 — ModeSelector 에서 호출
  const modeStoreEnter = useModeStore((s) => s.enter);
  const activeModeRaw = useModeStore((s) => s.activeMode);
  const modeStateRaw = useModeStore((s) => s.modeState);
  const modeSessionId = useModeStore((s) => s.modeSessionId);
  const modeStoreExit = useModeStore((s) => s.exit);
  const modeEnsureSession = useModeStore((s) => s.ensureSession);

  // 🆕 v82.3: 세션 교체 시 이전 세션 모드 잔상 제거 (mount 및 sessionId 변경 시)
  useEffect(() => {
    modeEnsureSession(sessionId);
  }, [sessionId, modeEnsureSession]);

  // 🆕 v82.3: 렌더 시 sessionId 가드 — hydration race 방지.
  //   persist 된 modeSessionId 가 현재 세션과 일치할 때만 활성화된 것으로 간주.
  const activeMode = modeSessionId === sessionId ? activeModeRaw : null;
  const modeState = modeSessionId === sessionId ? modeStateRaw : null;
  // v119: 우상단 플로팅 — 가방(인벤토리) 토글
  const [showBag, setShowBag] = useState(false);

  async function handleModeEnter(mode: ModeId | 'browse_together', strategyData: { opener?: string; situationSummary?: string }) {
    const context = strategyData.situationSummary ?? '';
    if (mode === 'browse_together') {
      // 🆕 v85.7: luna_strategy 소스 + browseQuery 전달 → 파이프라인 즉시 트리거
      sendMessage('🔍 같이 둘러보면서 찾아볼래', {
        source: 'luna_strategy' as any,
        context: {
          strategyType: 'browse_together',
          browseQuery: strategyData.situationSummary ?? '',
          browseTopic: 'general',
        } as any,
      });
      return;
    }
    if (mode === 'tone') {
      // 🆕 v81: LLM 으로 3톤 실시간 생성
      try {
        const res = await fetch('/api/mode/tone/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context }),
        });
        const data = await res.json();
        const options: ToneOption[] = data.options ?? [];
        if (options.length < 3) throw new Error('톤 생성 실패');
        modeStoreEnter('tone', {
          modeId: 'tone',
          context,
          options,
          selectedId: null,
        }, sessionId);
      } catch (err) {
        console.error('[Mode:tone] 생성 실패, 폴백:', err);
        modeStoreEnter('tone', {
          modeId: 'tone',
          context,
          options: [
            { id: 'soft',   label: '부드럽게', emoji: '💐', content: '부드럽게 얘기해볼게', intensity: 28 },
            { id: 'honest', label: '솔직하게', emoji: '🔍', content: '솔직히 얘기해볼게', intensity: 55 },
            { id: 'firm',   label: '단호하게', emoji: '🔥', content: '확실히 말해볼게', intensity: 82 },
          ],
          selectedId: null,
        }, sessionId);
      }
    } else if (mode === 'idea') {
      // 🆕 v81: Idea Refine — 빈 입력창으로 바로 진입
      modeStoreEnter('idea', {
        modeId: 'idea',
        original: '',
        refined: null,
        reasons: [],
      }, sessionId);
    } else if (mode === 'draft') {
      // 🆕 v81: Draft Workshop — LLM 으로 3초안 생성
      try {
        const res = await fetch('/api/mode/draft/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, intent: '' }),
        });
        const data = await res.json();
        const drafts: DraftOption[] = data.drafts ?? [];
        if (drafts.length < 3) throw new Error('초안 생성 실패');
        modeStoreEnter('draft', {
          modeId: 'draft',
          context,
          intent: '',
          drafts,
          selectedId: null,
          edits: [],
        }, sessionId);
      } catch (err) {
        console.error('[Mode:draft] 생성 실패:', err);
        alert('초안 생성 실패 — 잠시 후 다시 시도해줘');
      }
    } else if (mode === 'panel') {
      // 🆕 v81: Panel Report — 3 페르소나 관점 생성
      try {
        const res = await fetch('/api/mode/panel/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context }),
        });
        const data = await res.json();
        const personas: PanelPersona[] = data.personas ?? [];
        if (personas.length < 3) throw new Error('패널 생성 실패');
        modeStoreEnter('panel', {
          modeId: 'panel',
          context,
          personas,
          chosenPersonaId: null,
          deepenTurns: [],
        }, sessionId);
      } catch (err) {
        console.error('[Mode:panel] 생성 실패:', err);
        alert('패널 생성 실패 — 잠시 후 다시 시도해줘');
      }
    } else if (mode === 'roleplay') {
      // 🆕 v81: Roleplay — 시나리오 시작
      try {
        const res = await fetch('/api/mode/roleplay/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context }),
        });
        const data = await res.json();
        if (!data.scenario) throw new Error('시나리오 생성 실패');
        const stateInit: RoleplayState & { modeId: 'roleplay' } = {
          modeId: 'roleplay',
          context,
          scenario: data.scenario,
          history: [],
        };
        modeStoreEnter('roleplay', stateInit, sessionId);
      } catch (err) {
        console.error('[Mode:roleplay] 생성 실패:', err);
        alert('롤플레이 시나리오 생성 실패 — 잠시 후 다시 시도해줘');
      }
    }
  }

  /** 선택지 클릭 */
  function handleSuggestionSelect(text: string, meta?: SuggestionMeta) {
    // 🆕 v104: 정령 카드 선택은 fire-and-forget DB 갱신 (보관함/소원 영구 저장)
    if (meta?.source === 'spirit_event') {
      const ctx = meta.context ?? {};
      const spiritId = ctx.spiritId as string | undefined;
      const eventType = ctx.eventType as string | undefined;
      const choice = ctx.choice as string | undefined;
      if (spiritId && eventType && choice) {
        // input 으로 묶어 보관 — body/items/values/wish 등 자유 필드
        const input: Record<string, unknown> = {};
        if (typeof ctx.body === 'string') input.body = ctx.body;
        if (Array.isArray(ctx.items)) input.items = ctx.items;
        if (Array.isArray(ctx.values)) input.values = ctx.values;
        if (typeof ctx.recipient === 'string') input.recipient = ctx.recipient;
        if (typeof ctx.originalWish === 'string') input.originalWish = ctx.originalWish;
        if (typeof ctx.ifPhrase === 'string') input.ifPhrase = ctx.ifPhrase;
        if (typeof ctx.thenPhrase === 'string') input.thenPhrase = ctx.thenPhrase;
        if (typeof ctx.target === 'string') input.target = ctx.target;
        // fire-and-forget
        fetch('/api/spirits/event/choose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            spiritId,
            eventType,
            choice,
            input: Object.keys(input).length > 0 ? input : undefined,
          }),
        }).catch((err) => console.warn('[spirit-event/choose] POST fail', err));
      }
    }

    // 타로 이벤트 선택은 유저 메시지로 안 보임
    // 내부적으로만 메타데이터 전송 → AI가 자연스럽게 이어감
    const isTarotEvent = meta?.context?.tarotEvent;
    if (isTarotEvent) {
      // 유저 채팅에 안 보이는 숨겨진 메시지 (1글자 공백)
      sendMessage(' ', meta);
    } else {
      sendMessage(text, meta || { source: 'suggestion' });
    }

    // 🆕 v110.1: 마무리 의도 표현 → 루나 마지막 응답 끝나면 세션 자동 종료
    //   GrowthReport "내일 또 올게 고마워!" / WarmWrap 마무리 CTA 가 그냥 메시지로
    //   처리되어 complete/route.ts 호출 누락 → session_summary / luna_memories /
    //   v110 메모리 파이프라인 모두 미발동 버그 수정.
    //
    //   completeSessionNow 자체에 inFlight/completed/turn<2 guard 있어 중복 안전.
    //   페이지를 5초 안에 떠나도 useSessionAutoComplete 의 beforeunload/pagehide 가 받쳐줌.
    const isFarewellIntent =
      meta?.source === 'growth_report_promise' ||
      (meta?.source as string) === 'warm_wrap' ||
      // 🆕 v110.2: SESSION_SUMMARY 하단 세션종료 버튼
      (meta?.source as string) === 'session_summary_end';
    if (isFarewellIntent) {
      setTimeout(() => completeSessionNow(), 5000);
    }
  }

  /** 🆕 이벤트별 렌더러 */
  const renderPhaseEvent = (event: PhaseEvent, idx: number) => {
    console.log(`[ChatContainer] 렌더링 시도 이벤트:`, event.type);
    switch (event.type) {
      case 'EMOTION_THERMOMETER': return <EmotionThermometer key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'MIND_READING': return <MindReading key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'INSIGHT_CARD': return <InsightCard key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'EMOTION_MIRROR': return <EmotionMirror key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'LUNA_STORY': return <LunaStory key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      // 🆕 v82.11: LUNA_STRATEGY → Luna 가 4전략 중 자동 선택 + 수동 escape 시 ModeSelector 폴백
      case 'LUNA_STRATEGY': {
        const strategyData = event.data as { opener?: string; situationSummary?: string };
        const eventKey = String(idx);
        const isOverride = manualStrategyOverride[eventKey];

        if (isOverride) {
          return (
            <LunaStrategy
              key={`event-${idx}-manual`}
              event={event}
              onSelect={(text, meta) => {
                const strategyType = meta?.context?.strategyType as string | undefined;
                const situationSummary = (meta?.context?.situationSummary as string | undefined) ?? '';
                if (strategyType === 'roleplay') {
                  handleModeEnter('roleplay', { situationSummary });
                } else if (strategyType === 'message_draft') {
                  handleModeEnter('draft', { situationSummary });
                } else {
                  handleSuggestionSelect(text, meta);
                }
              }}
              disabled={isLoading}
            />
          );
        }

        // 최근 대화 맥락 (맨 뒤 8턴) — Luna 가 전략 결정할 때 참고
        const recent = messages
          .filter((m) => m.senderType === 'user' || m.senderType === 'ai')
          .slice(-8)
          .map((m) => ({ role: m.senderType as 'user' | 'ai', content: m.content }));

        return (
          <LunaStrategyDecision
            key={`event-${idx}`}
            situationSummary={strategyData.situationSummary ?? ''}
            opener={strategyData.opener}
            recentHistory={recent}
            onDecide={(mode, enrichedOpener, reasoning) => {
              // Luna 결정 멘트를 opener 로 보강
              handleModeEnter(mode, {
                ...strategyData,
                opener: enrichedOpener,
                situationSummary: strategyData.situationSummary ?? '',
              });
              console.log(`[LunaStrategy] 자동 선택: ${mode} — ${reasoning}`);
            }}
            onEscape={() => setManualStrategyOverride((prev) => ({ ...prev, [eventKey]: true }))}
          />
        );
      }
      // 🆕 v35: 모드별 SOLVE 이벤트 렌더링
      case 'TONE_SELECT': return <ToneSelector key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'DRAFT_WORKSHOP': return <DraftWorkshop key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'ROLEPLAY_FEEDBACK': return <RoleplayFeedback key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'PANEL_REPORT': return <PanelReport key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'IDEA_REFINE': return <IdeaRefine key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      // 🆕 v39: SOLVE 마무리 + EMPOWER 재설계 이벤트
      case 'ACTION_PLAN': return <ActionPlan key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'WARM_WRAP': return <WarmWrap key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'PATTERN_MIRROR': return <PatternMirrorCard key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'SOLUTION_PREVIEW': return <SolutionPreview key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'SOLUTION_CARD': return <SolutionCard key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'MESSAGE_DRAFT': return <MessageDraft key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'GROWTH_REPORT': return <GrowthReport key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'SESSION_SUMMARY': return <SessionSummary key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'HOMEWORK_CARD': return <HomeworkCard key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'TAROT_DRAW': return <TarotDraw key={`event-${idx}`} data={event.data as any} onChoice={(val) => handleSuggestionSelect(val, { source: 'suggestion', context: { tarotEvent: 'TAROT_DRAW' } })} />;
      case 'TAROT_AXIS_COLLECT': return <TarotAxisCollect key={`event-${idx}`} data={event.data as unknown as TarotAxisCollectData} onChoice={(val) => handleSuggestionSelect(val, { source: 'suggestion', context: { tarotEvent: 'TAROT_AXIS_COLLECT', spreadType: val } })} disabled={isLoading} />;
      case 'TAROT_INSIGHT': return <TarotInsight key={`event-${idx}`} data={event.data as unknown as TarotInsightData} disabled={isLoading} />;
      // 🆕 v84: 루나 자율 판단형 인터넷 검색 이벤트 (전 Phase)
      case 'SONG_SEARCHING':
      case 'SONG_RECOMMENDATION':
        return <SongRecommendation key={`event-${idx}`} event={event} disabled={isLoading} />;
      case 'DATE_SPOT_SEARCHING':
      case 'DATE_SPOT_RECOMMENDATION':
        return <DateSpotRecommendation key={`event-${idx}`} event={event} disabled={isLoading} />;
      // 🆕 v85: 2026 연애 검색 트렌드 확장 4종
      case 'GIFT_SEARCHING':
      case 'GIFT_RECOMMENDATION':
        return <GiftRecommendation key={`event-${idx}`} event={event} disabled={isLoading} />;
      case 'ACTIVITY_SEARCHING':
      case 'ACTIVITY_RECOMMENDATION':
        return <ActivityRecommendation key={`event-${idx}`} event={event} disabled={isLoading} />;
      case 'ANNIVERSARY_SEARCHING':
      case 'ANNIVERSARY_RECOMMENDATION':
        return <AnniversaryRecommendation key={`event-${idx}`} event={event} disabled={isLoading} />;
      case 'MOVIE_SEARCHING':
      case 'MOVIE_RECOMMENDATION':
        return <MovieRecommendation key={`event-${idx}`} event={event} disabled={isLoading} />;
      // 🆕 v85.6: 같이 찾기 (멀티턴 탐색)
      case 'BROWSE_SEARCHING':
      case 'BROWSE_SESSION':
      case 'BROWSE_FINAL':
        return (
          <BrowseTogether
            key={`event-${idx}`}
            event={event}
            disabled={isLoading}
            onSelect={(text, meta) => handleSuggestionSelect(text, meta)}
          />
        );
      // 🆕 v104.2: Spirit Random Events — 모든 케이스를 SpiritEventWithCutIn으로 자동 wrap
      case 'SPIRIT_RAGE_LETTER': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'fire_goblin' as SpiritId}><RageLetter event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_THINK_FRAME': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'book_worm' as SpiritId}><ThinkFrame event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_CRY_TOGETHER': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'tear_drop' as SpiritId}><CryTogether event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_FIRST_BREATH': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'seed_spirit' as SpiritId}><FirstBreath event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_RHYTHM_CHECK': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'drum_imp' as SpiritId}><RhythmCheck event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_OLIVE_BRANCH': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'peace_dove' as SpiritId}><OliveBranch event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_CLOUD_REFRAME': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'cloud_bunny' as SpiritId}><CloudReframe event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_LETTER_BRIDGE': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'letter_fairy' as SpiritId}><LetterBridge event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_WINDOW_OPEN': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'wind_sprite' as SpiritId}><WindowOpen event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_NIGHT_CONFESSION': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'moon_rabbit' as SpiritId}><NightConfession event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_REVERSE_ROLE': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'clown_harley' as SpiritId}><ReverseRole event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_BUTTERFLY_DIARY': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'rose_fairy' as SpiritId}><ButterflyDiary event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_ROOTED_HUG': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'forest_mom' as SpiritId}><RootedHug event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_FALLEN_PETALS': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'cherry_leaf' as SpiritId}><FallenPetals event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_FREEZE_FRAME': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'ice_prince' as SpiritId}><FreezeFrame event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_METAMORPHOSIS': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'butterfly_meta' as SpiritId}><Metamorphosis event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_MEMORY_KEY': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'book_keeper' as SpiritId}><MemoryKey event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_CROWN_RECLAIM': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'queen_elena' as SpiritId} subtitle="너의 왕관, 다시 씌워주마"><CrownReclaim event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      case 'SPIRIT_WISH_GRANT': return <SpiritEventWithCutIn key={`event-${idx}`} spiritId={'star_dust' as SpiritId} subtitle="너의 소원, 들어줄게"><WishGrant event={event} onChoose={handleSuggestionSelect} disabled={isLoading} /></SpiritEventWithCutIn>;
      // ⚡ BoltCard — 0.8초 핏치 입장 후 inner picked card 재귀 렌더
      case 'SPIRIT_BOLT_CARD': {
        const boltData = event.data as unknown as SpiritBoltCardData;
        const innerEvent: PhaseEvent = {
          type: boltData.pickedEventType as PhaseEvent['type'],
          phase: event.phase,
          data: boltData.pickedEventData as unknown as Record<string, unknown>,
        };
        return (
          <BoltCard key={`event-${idx}`} event={event}>
            {renderPhaseEvent(innerEvent, idx + 10000)}
          </BoltCard>
        );
      }
      default: return null;
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-[url('/kakao_bg.webp')] bg-cover bg-center bg-no-repeat bg-fixed font-sans"
    >
      {/* 프리미엄 헤더 (루나 상담실) + 시나리오 태그 */}
      <div className="bg-white/40 border-b border-white/30 z-10 sticky top-0 shadow-sm">
        {/* 상단: 뒤로가기 + 타이틀 */}
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="mr-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/60 text-[#5D4037] hover:bg-white/90 transition-colors shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div className="flex-1 flex items-center gap-1.5">
            <h1 className="text-[22px] font-extrabold text-[#795548] tracking-tight drop-shadow-sm">
              {activePersona === 'tarot' ? '타로냥 상담실' : '루나 상담실'}
            </h1>
            <span className="text-2xl drop-shadow-sm">{activePersona === 'tarot' ? '🔮' : '☕️'}</span>
          </div>

          {/* 친밀도 미니 배지 */}
          {intimacyDerived && (
            <div className="relative ml-1">
              <motion.div
                animate={intimacyDelta ? {
                  boxShadow: ['0 0 0px rgba(192,132,252,0)', '0 0 12px rgba(192,132,252,0.6)', '0 0 0px rgba(192,132,252,0)'],
                } : {}}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm"
              >
                <span className="text-base leading-none">{intimacyDerived.levelEmoji}</span>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[10px] font-bold text-[#795548] leading-none">{intimacyDerived.levelName}</span>
                  <div className="w-14 h-1 bg-white/40 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: `${intimacyDerived.progressPercent}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      style={{ background: 'linear-gradient(90deg, #c084fc, #f472b6)' }}
                    />
                  </div>
                </div>
              </motion.div>
              <IntimacyDeltaHint delta={intimacyDelta} />
            </div>
          )}

        </div>

        {/* 🆕 v28.6: 시나리오 + 감정 + 깊이 (왼쪽) / 루나 사고 상태 (오른쪽) */}
        <div className="flex items-start justify-between px-4 pb-2 gap-2">
          {/* 🆕 v36: 동적 인사이트 위젯 (왼쪽) - 루나의 상황 인식 & 속마음 */}
          <div className="flex flex-col items-start gap-1 flex-1 min-w-0 pr-1">
            {showScenarioTag ? (
              <div className="flex flex-col items-start gap-1 w-full relative">
                {/* 1. 상황 인식 (SITUATION_READ) + 토글 버튼 */}
                <div className="flex items-center gap-1.5 w-full max-w-full">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setIsScenarioPanelOpen(true)}
                    className="flex items-center gap-1.5 bg-white/70 backdrop-blur-md border border-white/60 px-2.5 py-1.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] w-fit flex-shrink"
                    style={{ maxWidth: 'calc(100% - 32px)' }}
                  >
                    <div className="flex items-center justify-center bg-violet-50/80 rounded-full w-[18px] h-[18px] shadow-inner shrink-0">
                      <span className="text-[10px]">🔍</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#6D4C41] truncate tracking-tight">
                      {stateResult?.situationRead || '상황 듣는 중...'}
                    </span>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#A1887F" strokeWidth="3" strokeLinecap="round" className="opacity-80 shrink-0">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </motion.button>

                  <button 
                    onClick={() => setIsInsightCollapsed(!isInsightCollapsed)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-sm border border-white/40 text-[#A1887F] hover:bg-white/80 transition-colors shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isInsightCollapsed ? 'rotate-180' : ''}`}>
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  </button>
                </div>

                {/* 2. 루나의 속마음 (LUNA_THOUGHT) — 토글 시 보임/숨김 */}
                <AnimatePresence>
                  {!isInsightCollapsed && stateResult?.lunaThought && (
                    <motion.button
                      initial={{ opacity: 0, height: 0, marginTop: -4, scale: 0.95 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 0, scale: 1 }}
                      exit={{ opacity: 0, height: 0, marginTop: -4, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setIsThoughtHistoryOpen(true)}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-pink-50/90 to-purple-50/90 backdrop-blur-md border border-pink-100/60 px-2.5 py-1.5 rounded-2xl shadow-[0_2px_12px_rgba(236,72,153,0.05)] w-fit max-w-full overflow-hidden text-left"
                    >
                      <motion.div 
                        animate={{ opacity: [0.5, 1, 0.5] }} 
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="shrink-0 flex items-center justify-center"
                      >
                        <span className="text-[11px]">💭</span>
                      </motion.div>
                      <span className="text-[10.5px] font-semibold text-pink-500/90 truncate tracking-tight">
                        {stateResult.lunaThought}
                      </span>
                      {(stateResult.lunaThoughtHistory?.length ?? 0) > 1 && (
                        <span className="text-[8px] text-pink-300 shrink-0 ml-0.5">
                          +{(stateResult.lunaThoughtHistory?.length ?? 1) - 1}
                        </span>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white/70 backdrop-blur-md border border-white/60 px-2.5 py-1.5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] w-fit max-w-full">
                {messages.length === 0 ? (
                  <>
                    <div className="flex items-center justify-center bg-gray-50/80 rounded-full w-[18px] h-[18px] shadow-inner shrink-0">
                      <span className="text-[10px]">💬</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#8D6E63] tracking-tight">첫 마디를 기다려요 ✨</span>
                  </>
                ) : (
                  <>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="shrink-0">
                      <div className="flex items-center justify-center bg-violet-50/80 rounded-full w-[18px] h-[18px] shadow-inner">
                        <span className="text-[10px]">🔍</span>
                      </div>
                    </motion.div>
                    <span className="text-[11px] font-bold text-[#8D6E63] tracking-tight">상황을 분석하고 있어요...</span>
                  </>
                )}
              </div>
            )}
          </div>


        </div>
      </div>

      {/* 🆕 구간 진행률 바 (HOOK부터 마지막 EMPOWER까지 상태 시각화) */}
      <PhaseProgress currentPhase={currentPhase} conversationMode={conversationMode} progress={phaseProgress} persona={activePersona} lunaThinking={lunaThinking} understandingLevel={understandingLevel} />

      {/* v28.7: 깊이 조정 패널 제거 — AI 자체 판단(PHASE_SIGNAL)으로 대체 */}

      {/* 🆕 v37: 루나의 속마음 타임라인 모달 */}
      <LunaThoughtHistory
        open={isThoughtHistoryOpen}
        onClose={() => setIsThoughtHistoryOpen(false)}
        history={stateResult?.lunaThoughtHistory ?? []}
      />

      {/* 🆕 v37: 루나의 상황 인식 패널 (현재 이해 + 타임라인 + 수정 입력) */}
      <SituationTimeline
        open={isScenarioPanelOpen}
        onClose={() => setIsScenarioPanelOpen(false)}
        history={stateResult?.situationReadHistory ?? []}
        current={stateResult?.situationRead ?? null}
        onCorrect={(correction) => {
          // 유저가 "루나가 잘못 이해했으면" 입력창에 쓴 내용을 대화로 전송
          // → 루나가 다음 턴에 이해를 업데이트
          sendMessage(`아 참, 내 상황을 다시 알려줄게: ${correction}`, {
            source: 'typed',
            context: { situationCorrection: true },
          });
        }}
      />

      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
          {/* 타로냥: 오프닝 영상 */}
          {messages.length === 0 && activePersona === 'tarot' && (
            <div className="flex flex-col px-2 mt-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex justify-start mb-3 relative"
              >
                <div className="relative mr-2 flex-shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-[16px] bg-[#F4EFE6] flex items-center justify-center overflow-hidden border border-[#EACbb3]">
                    <img src="/char_img/taronaang_1_Evt.webp" alt="타로냥" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="flex flex-col items-start max-w-[75%]">
                  <span className="text-[12px] text-[#5D4037] mb-1 ml-1 font-bold">타로냥</span>
                  <div className="relative rounded-[20px] rounded-tl-[4px] overflow-hidden bg-[#F4EFE6] shadow-sm border border-[#D5C2A5]">
                    <video
                      src="/opening_taronaang.mp4"
                      autoPlay
                      playsInline
                      onPlay={() => {
                        if (typeof navigator !== 'undefined' && navigator.vibrate) {
                          navigator.vibrate(50);
                        }
                      }}
                      onEnded={() => setOpeningVideoEnded(true)}
                      className="w-full object-cover"
                      style={{ maxHeight: '260px', objectPosition: 'center top' }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* 🆕 v112-rev2: 카톡 친구 톡방 — 영상 + 메시지 버블 (카드 X) */}
          {messages.length === 0 && activePersona !== 'tarot' && (
            <EntryRitualOrchestrator>
              {/* 영상 — 카톡 비디오 메시지처럼 */}
              <div className="flex flex-col px-2 mt-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex justify-start mb-3 relative"
                >
                  <div className="relative mr-2 flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-[16px] bg-[#F4EFE6] flex items-center justify-center overflow-hidden border border-[#EACbb3]">
                      <img
                        src="/luna_fox_transparent.webp"
                        alt="루나"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-start max-w-[75%]">
                    <span className="text-[12px] text-[#5D4037] mb-1 ml-1 font-bold">루나</span>

                    {/* Video Bubble */}
                    <div className="relative rounded-[20px] rounded-tl-[4px] overflow-hidden bg-[#F4EFE6] shadow-sm border border-[#D5C2A5]">
                      <video
                        src="/opening.mp4"
                        autoPlay
                        playsInline
                        onPlay={() => {
                          if (typeof navigator !== 'undefined' && navigator.vibrate) {
                            navigator.vibrate(50);
                          }
                        }}
                        onEnded={() => setOpeningVideoEnded(true)}
                        className="w-full object-cover"
                        style={{ maxHeight: '260px', objectPosition: 'center top' }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* 영상 끝나면 → 카톡 인사 메시지 1~2개 도착 */}
              <LunaGreetingMessage
                mood={liveState.mood}
                recentSessionCount24h={entry.recentSessionCount24h}
                intimacyLevel={intimacyDerived?.level ?? 0}
                ageDays={lunaAgeDays}
                startSequence={openingVideoEnded}
                onAllShown={() => setReadyForReply(true)}
              />

              {/* 🆕 v117.6: 인사 도착 후 10초 idle 이면 루나가 한 줄 더 (세션당 1회).
                  이 블록은 이미 activePersona !== 'tarot' 로 가드되어 있어서 별도 disabled 불필요. */}
              <LunaIdleNudgeMessage
                mood={liveState.mood}
                recentSessionCount24h={entry.recentSessionCount24h}
                intimacyLevel={intimacyDerived?.level ?? 0}
                ageDays={lunaAgeDays}
                startTimer={readyForReply}
                suppress={messages.length > 0}
              />
            </EntryRitualOrchestrator>
          )}

          {messageGroups.map(({ dateKey, messages: groupMsgs }) => (
            <div key={dateKey}>
              <DateDivider date={groupMsgs[0].createdAt} />
              {(() => {
                const visible = groupMsgs.filter((msg) => !(msg.senderType === 'user' && msg.content?.trim() === ''));
                return visible.map((msg, idx) => {
                  if (msg.senderType === ('event' as any)) {
                    try {
                      const evt = JSON.parse(msg.content) as PhaseEvent;
                      return renderPhaseEvent(evt, msg.id as any);
                    } catch {
                      return null;
                    }
                  }

                  // 🆕 v88: 루나 대화형 "같이 찾기" 블록
                  if (msg.renderAs === 'browse_block' && msg.browseBlock) {
                    // 직전 메시지가 같은 브라우징 세션의 루나 블록이면 avatar 생략
                    const prev = visible[idx - 1];
                    const hideAvatar =
                      !!prev &&
                      prev.senderType === 'ai' &&
                      prev.renderAs === 'browse_block' &&
                      prev.browseContext?.sessionId === msg.browseContext?.sessionId;
                    const block = msg.browseBlock;
                    const resolved =
                      block.type === 'decision_prompt'
                        ? resolvedBrowsePrompts.has(block.promptId)
                        : false;
                    return (
                      <BrowseBlockBubble
                        key={msg.id}
                        message={msg}
                        hideAvatar={hideAvatar}
                        resolved={resolved}
                        onDecision={handleBrowseDecision}
                      />
                    );
                  }

                  const isLastAiMsg = msg.senderType === 'ai' && msg.id === lastAiMsgId;
                  return (
                    <div key={msg.id} ref={isLastAiMsg ? lastAiMsgRef : undefined}>
                      <MessageBubble
                        message={msg}
                        isTyping={isLoading && msg.senderType === 'ai' && !msg.content}
                        onSpeak={ttsSupported && voiceSettings.enabled ? toggleSpeak : undefined}
                        isSpeaking={isSpeaking}
                        isPremium={isPremium}
                        persona={activePersona}
                        isLastAi={isLastAiMsg}
                      />
                    </div>
                  );
                });
              })()}
              {/* 🆕 v88: 브라우징 타이핑 dot */}
              {browseTypingDot && (
                <div className="flex items-end gap-1.5 max-w-[88%] my-1 ml-9 pl-0">
                  <div className="px-3 py-2 rounded-2xl rounded-bl-[4px] bg-gradient-to-b from-[#fffdf5] to-[#fff5e0] border border-amber-200 shadow-sm">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 🆕 v25: 이벤트는 메시지 리스트 안에 인라인으로 렌더됨 — 별도 렌더 제거 */}

          {/* 좌뇌 생각 말풍선 — 우뇌 응답 전 루나의 내면 생각 */}
          <AnimatePresence mode="wait">
            {lunaThoughtBubble && (
              <LunaThoughtBubble key="thought-bubble" thought={lunaThoughtBubble} />
            )}
          </AnimatePresence>

          {/* 🆕 v40: 루나 딥리서치 — "진짜 고민 중" 로딩 UI (Gemini Grounding) */}
          {thinkingDeep && (
            <LunaThinkingDeep
              phrases={thinkingDeep.phrases}
              done={!thinkingDeep.active}
            />
          )}

          {/* 🆕 v48: 캐스케이드 재시도 — "다시 생각하는 중" UI */}
          {retryStatus && (
            <LunaRetrying
              retries={retryStatus.retries}
              done={!retryStatus.active}
            />
          )}

          {/* 🆕 v41: 친밀도 레벨업 축하 팝업 (전체 화면 오버레이) */}
          {intimacyLevelUp && (
            <IntimacyLevelUp
              oldLevel={intimacyLevelUp.oldLevel}
              newLevel={intimacyLevelUp.newLevel}
              newLevelName={intimacyLevelUp.newLevelName}
              onDismiss={dismissIntimacyLevelUp}
            />
          )}

          {/* XRay 인라인 분석 결과 */}
          {xrayLoading && (
            <div className="flex justify-start mb-3 ml-12">
              <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 text-xs text-purple-600 font-medium">
                🔬 루나가 캡처를 분석하고 있어...
              </div>
            </div>
          )}
          {xrayResult && <XRayInlineCard result={xrayResult} />}

          {/* 패널 모드: 3인 전문가 버블 */}
          {panelData && <PanelBubble panel={panelData} />}

          {/* Nudge 컴포넌트 */}
          <AnimatePresence>
            {calmingTimer && (
              <CalmingTimer duration={(calmingTimer.data?.durationMinutes as number) ?? 20} />
            )}
            {breathingGuide && <BreathingGuide />}
          </AnimatePresence>

          {/* 인라인 선택지 (AI가 동적 생성) */}
          {suggestions.length > 0 && !isLoading && (
            <InlineSuggestions
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
            />
          )}

          {quickReplies && (
            <QuickReplyButtons
              options={(quickReplies.data?.options as string[]) ?? []}
              onSelect={sendMessage}
            />
          )}

          {/* 🆕 v82: 채팅 네이티브 몰입 모드 — 마지막 말풍선 바로 아래 인라인 렌더 */}
          {activeMode === 'tone' && modeState?.modeId === 'tone' && (
            <ToneMode
              initial={modeState}
              onComplete={(chosen) => {
                modeStoreExit(`톤 '${chosen.label}' 선택됨 — "${chosen.content.slice(0, 30)}..."`);
                handleSuggestionSelect(
                  `톤은 '${chosen.label}' 으로 갈게. 예시: "${chosen.content}"`,
                  { source: 'tone_mode' as any, context: { tone: chosen.id, content: chosen.content, bridgeCompleted: true } as any }
                );
              }}
            />
          )}

          {activeMode === 'idea' && modeState?.modeId === 'idea' && (
            <IdeaMode
              initial={modeState}
              onRefine={async (original) => {
                const res = await fetch('/api/mode/idea/refine', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ original, context: modeState.original ?? '' }),
                });
                return await res.json();
              }}
              onComplete={({ final, source }) => {
                modeStoreExit(`아이디어 확정 (${source}): "${final.slice(0, 40)}"`);
                handleSuggestionSelect(
                  `이 아이디어로 갈게: "${final}"`,
                  { source: 'idea_mode' as any, context: { final, source, bridgeCompleted: true } as any }
                );
              }}
            />
          )}

          {activeMode === 'draft' && modeState?.modeId === 'draft' && (
            <DraftMode
              initial={modeState}
              onComplete={({ draft, finalContent }) => {
                fetch('/api/mode/draft/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tone: draft.tone,
                    content: finalContent,
                    context: modeState.context,
                    sessionId,
                  }),
                }).catch((e) => console.warn('[Draft] 저장 실패 (무시):', e));

                modeStoreExit(`초안 '${draft.label}' 확정: "${finalContent.slice(0, 40)}..."`);
                handleSuggestionSelect(
                  `초안 확정했어 (${draft.label}): "${finalContent}" (초안함에 저장해뒀어)`,
                  { source: 'draft_mode' as any, context: { draftId: draft.id, tone: draft.tone, content: finalContent, bridgeCompleted: true } as any }
                );
              }}
            />
          )}

          {activeMode === 'panel' && modeState?.modeId === 'panel' && (
            <PanelMode
              initial={modeState}
              onComplete={(persona) => {
                modeStoreExit(`'${persona.name}' 관점 선택: "${persona.opinion.slice(0, 40)}..."`);
                handleSuggestionSelect(
                  `${persona.emoji} ${persona.name} 관점이 제일 와닿았어: "${persona.opinion}"`,
                  { source: 'panel_mode' as any, context: { personaId: persona.id, opinion: persona.opinion, bridgeCompleted: true } as any }
                );
              }}
            />
          )}

          {activeMode === 'roleplay' && modeState?.modeId === 'roleplay' && (
            <RoleplayMode
              initial={modeState}
              onTurn={async (userChoice, history) => {
                const res = await fetch('/api/mode/roleplay/turn', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ scenario: modeState.scenario, history, userChoice }),
                });
                return await res.json();
              }}
              onComplete={(summary, history) => {
                modeStoreExit(`롤플레이 완료 — ${summary}`);
                const userLines = history.filter((h) => h.role === 'user').map((h) => h.content).slice(-3);
                handleSuggestionSelect(
                  `롤플레이 연습 끝. 핵심은: ${summary}. 내가 시도해본 대사: ${userLines.join(' / ')}`,
                  { source: 'roleplay_mode' as any, context: { summary, turns: history.length, bridgeCompleted: true } as any }
                );
              }}
            />
          )}
        </div>

      {/* 하단 영역: 완료된 세션 vs 입력창 */}
      <div className={`z-10 pt-4 pb-2 ${activePersona === 'tarot' ? 'bg-gradient-to-t from-[#0d0d2b]/90 via-[#1a1a3e]/70 to-transparent' : 'bg-gradient-to-t from-white/90 via-white/70 to-transparent'}`}>
          {sessionStatus === 'completed' ? (
            <div className="p-5 bg-white/90 backdrop-blur-md border-t border-[#D5C2A5] rounded-t-3xl shadow-[0_-4px_20px_rgb(0,0,0,0.03)] z-10 transition-all mx-2 mb-2">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-[#FFF3E0] text-[#795548] border border-[#FFE0B2] shadow-sm rounded-full flex items-center justify-center mb-3">
                  <span className="text-xl">✨</span>
                </div>
                <h3 className="text-sm font-bold text-[#5D4037] mb-1">상담이 완료되었습니다</h3>
                {sessionSummary ? (
                  <p className="text-xs text-[#795548] leading-relaxed px-4 break-keep">
                    {sessionSummary}
                  </p>
                ) : (
                  <p className="text-xs text-[#8D6E63]">
                    수고하셨습니다. 지난 대화를 편하게 돌아보세요.
                  </p>
                )}
              </div>
            </div>
          ) : isLimitReached ? (
            <div className="px-4 py-5 bg-gradient-to-t from-white via-white to-transparent">
              <div className="text-center p-4 rounded-2xl bg-purple-50 border border-purple-200">
                <p className="text-sm text-purple-700 font-medium mb-1">오늘 무료 상담을 다 사용했어</p>
                <p className="text-xs text-purple-500 mb-3">프리미엄이면 무제한으로 대화할 수 있어!</p>
                <Link
                  href="/subscription"
                  className="inline-block px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold no-underline shadow-md"
                >
                  프리미엄 시작하기
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {!isPremium && activePersona !== 'tarot' && (
                <div className="text-center py-1">
                  <span className="text-[10px] text-gray-400">
                    오늘 남은 상담 <span className="font-bold text-purple-500">{remaining}</span>/{FREE_DAILY_LIMIT}
                  </span>
                </div>
              )}
              {/* 🆕 v117.5: chip/카드 진입 UI 전부 제거 — 빈 입력창 + mood placeholder 만 */}
              {/* 🆕 v118: ChatInput 의 (text, boosters) → sendMessage(content, undefined meta, boosters) 매핑 */}
              <ChatInput
                onSend={(text, boosters) => sendMessage(text, undefined, boosters)}
                onImageAttach={activePersona !== 'tarot' ? handleImageAttach : undefined}
                disabled={isLoading || pendingEventLock}
                placeholder={
                  pendingEventLock
                    ? '위 질문에 답해줘 ↑'
                    : (activePersona !== 'tarot' && openingVideoEnded && messages.length === 0)
                      ? (liveState.mood === 'wistful'
                          ? '한 줄이면 충분해…'
                          : liveState.mood === 'playful'
                            ? '오늘은 뭐 얘기할까 ✨'
                            : liveState.mood === 'sleepy'
                              ? '가만히 적어도 돼'
                              : liveState.mood === 'thoughtful'
                                ? '천천히 적어줘…'
                                : liveState.mood === 'warm'
                                  ? '무슨 일이야, 말해봐'
                                  : '한 줄만 적어봐 ✨')
                      : '마음 편하게 다 말해봐...'
                }
                typingPlaceholder={
                  isLoading
                    ? (activePersona === 'tarot' ? '타로냥이 카드를 읽고 있어' : '루나가 답장을 고민하고 있어')
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {/* v119: 우상단 플로팅 — 가방(인벤토리). 가방 시트가 열려 있으면 숨김
            (열린 동안 시트의 닫기 버튼을 가리지 않도록 — 나가기 버튼 클릭 가로채기 방지) */}
        {!showBag && (
          <div className="fixed top-3 right-3 z-[8000] flex flex-col gap-1.5 pointer-events-none">
            <button
              onClick={() => setShowBag(true)}
              className="pointer-events-auto w-9 h-9 rounded-full bg-white/80 backdrop-blur-md border border-[#D5C2A5]/60 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
              title="내 가방"
              aria-label="가방 열기"
            >
              <span className="text-base">🎒</span>
            </button>
          </div>
        )}

        <BagSheet open={showBag} onClose={() => setShowBag(false)} />
    </div>
  );
}
