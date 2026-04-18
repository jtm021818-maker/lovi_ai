'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import DateDivider from './DateDivider';
import ChatInput from './ChatInput';
import QuickReplyButtons from './QuickReplyButtons';
import InlineSuggestions from './InlineSuggestions';
import PanelBubble from './PanelBubble';
import { useChat } from '@/hooks/useChat';
import { useLunaVoice } from '@/hooks/useLunaVoice';
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
import LunaStrategy from './events/LunaStrategy';
// 🆕 v81: BRIDGE 몰입 모드
import ModeSelector from '@/components/modes/ModeSelector';
import ToneMode from '@/components/modes/tone/ToneMode';
import IdeaMode from '@/components/modes/idea/IdeaMode';
import DraftMode from '@/components/modes/draft/DraftMode';
import PanelMode from '@/components/modes/panel/PanelMode';
import RoleplayMode from '@/components/modes/roleplay/RoleplayMode';
import FxBgmSettings from '@/components/settings/FxBgmSettings';
import DraftsVault from '@/components/drafts/DraftsVault';
import { useModeStore } from '@/engines/bridge-modes/mode-store';
import type { ModeId, ToneOption, DraftOption, PanelPersona, RoleplayState } from '@/engines/bridge-modes/types';
import LunaThoughtHistory from './LunaThoughtHistory';
import SituationTimeline from './SituationTimeline';
// 🆕 v40: 루나 딥리서치 "진짜 고민 중" 로딩 UI
import LunaThinkingDeep from './LunaThinkingDeep';
// 🆕 v48: 캐스케이드 재시도 UI
import LunaRetrying from './LunaRetrying';
// 🆕 v41: 친밀도 레벨업 축하 팝업
import IntimacyLevelUp from '@/components/intimacy/IntimacyLevelUp';
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
  const { messages, isLoading, nudges, stateResult, suggestions, panelData, axesProgress, phaseEvents, currentPhase, phaseProgress, sessionStatus, sessionSummary, sendMessage, pendingEventLock, lunaThinking, understandingLevel, thinkingDeep, retryStatus, intimacyLevelUp, dismissIntimacyLevelUp } = useChat(sessionId);
  // 🆕 v79: 마지막 AI 메시지 ID (bubble FX 매칭용)
  const lastAiMsgId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderType === 'ai' && messages[i].content) return messages[i].id;
    }
    return null;
  })();
  const { toggle: toggleSpeak, isSpeaking, speak, isSupported: ttsSupported, settings: voiceSettings, updateSettings: updateVoiceSettings } = useLunaVoice();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePersona, setActivePersona] = useState<PersonaMode>('luna');
  const prevMsgCountRef = useRef(0);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);

  // 구독 상태 + 잔여 횟수
  const [isPremium, setIsPremium] = useState(true); // 기본 true로 깜빡임 방지
  const FREE_DAILY_LIMIT = 5;
  const userMsgCount = messages.filter(m => m.senderType === 'user').length;
  const remaining = isPremium ? Infinity : Math.max(0, FREE_DAILY_LIMIT - userMsgCount);
  const isLimitReached = !isPremium && remaining <= 0;

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

  // 🆕 v22: AI 응답 완료 시 자동 읽기 (autoSpeak 활성화된 경우)
  useEffect(() => {
    if (!ttsSupported || !voiceSettings.autoSpeak || isLoading) return;
    const aiMessages = messages.filter(m => m.senderType === 'ai' && m.content);
    if (aiMessages.length > prevMsgCountRef.current) {
      const lastAi = aiMessages[aiMessages.length - 1];
      if (lastAi?.content) speak(lastAi.content);
    }
    prevMsgCountRef.current = aiMessages.length;
  }, [messages, isLoading, ttsSupported, voiceSettings.autoSpeak, speak]);

  // 페르소나 모드는 설정에서 선택한 값을 그대로 사용 (강제 변경 없음)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, panelData, suggestions]);

  const quickReplies  = nudges.find((n: NudgeAction) => n.type === 'quick_reply');
  const calmingTimer  = nudges.find((n: NudgeAction) => n.type === 'calming_timer');
  const breathingGuide = nudges.find((n: NudgeAction) => n.type === 'breathing_guide');

  const emotionScore  = stateResult?.emotionScore ?? null;
  const gradient      = getEmotionGradient(emotionScore);
  const messageGroups = groupMessagesByDate(messages);
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

  // 🆕 v81: 몰입 모드 진입 — ModeSelector 에서 호출
  const modeStoreEnter = useModeStore((s) => s.enter);
  const activeMode = useModeStore((s) => s.activeMode);
  const modeState = useModeStore((s) => s.modeState);
  const modeStoreExit = useModeStore((s) => s.exit);
  // 🆕 v81: 설정 / 초안함 토글
  const [showSettings, setShowSettings] = useState(false);
  const [showDraftsVault, setShowDraftsVault] = useState(false);

  async function handleModeEnter(mode: ModeId, strategyData: { opener?: string; situationSummary?: string }) {
    const context = strategyData.situationSummary ?? '';
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
        });
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
        });
      }
    } else if (mode === 'idea') {
      // 🆕 v81: Idea Refine — 빈 입력창으로 바로 진입
      modeStoreEnter('idea', {
        modeId: 'idea',
        original: '',
        refined: null,
        reasons: [],
      });
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
        });
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
        });
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
        modeStoreEnter('roleplay', stateInit);
      } catch (err) {
        console.error('[Mode:roleplay] 생성 실패:', err);
        alert('롤플레이 시나리오 생성 실패 — 잠시 후 다시 시도해줘');
      }
    }
  }

  /** 선택지 클릭 */
  function handleSuggestionSelect(text: string, meta?: SuggestionMeta) {
    // 타로 이벤트 선택은 유저 메시지로 안 보임
    // 내부적으로만 메타데이터 전송 → AI가 자연스럽게 이어감
    const isTarotEvent = meta?.context?.tarotEvent;
    if (isTarotEvent) {
      // 유저 채팅에 안 보이는 숨겨진 메시지 (1글자 공백)
      sendMessage(' ', meta);
    } else {
      sendMessage(text, meta || { source: 'suggestion' });
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
      // 🆕 v81: LUNA_STRATEGY → ModeSelector 로 업그레이드 (몰입 모드 진입 카드)
      case 'LUNA_STRATEGY': {
        const strategyData = event.data as { opener?: string; situationSummary?: string };
        return (
          <ModeSelector
            key={`event-${idx}`}
            opener={strategyData.opener}
            situationSummary={strategyData.situationSummary}
            onSelect={(mode) => handleModeEnter(mode, strategyData)}
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
      default: return null;
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-[url('/kakao_bg.jpeg')] bg-cover bg-center bg-no-repeat bg-fixed font-sans"
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
      <PhaseProgress currentPhase={currentPhase} progress={phaseProgress} persona={activePersona} lunaThinking={lunaThinking} understandingLevel={understandingLevel} />

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
                    <img src="/char_img/taronaang_1_Evt.png" alt="타로냥" className="w-full h-full object-cover" />
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

          {/* 루나: 오프닝 영상 */}
          {messages.length === 0 && activePersona !== 'tarot' && (
            <div className="flex flex-col px-2 mt-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex justify-start mb-3 relative"
              >
                {/* Profile Image (Kakao style) */}
                <div className="relative mr-2 flex-shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-[16px] bg-[#F4EFE6] flex items-center justify-center overflow-hidden border border-[#EACbb3]">
                    <img src="/luna_fox_transparent.png" alt="루나" className="w-full h-full object-cover" />
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
          )}

          {messageGroups.map(({ dateKey, messages: groupMsgs }) => (
            <div key={dateKey}>
              <DateDivider date={groupMsgs[0].createdAt} />
              {groupMsgs.filter((msg) => !(msg.senderType === 'user' && msg.content?.trim() === '')).map((msg) => (
                msg.senderType === ('event' as any) ? (
                  (() => {
                    try {
                      const evt = JSON.parse(msg.content) as PhaseEvent;
                      return renderPhaseEvent(evt, msg.id as any);
                    } catch { return null; }
                  })()
                ) :
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isTyping={isLoading && msg.senderType === 'ai' && !msg.content}
                  onSpeak={ttsSupported && voiceSettings.enabled ? toggleSpeak : undefined}
                  isSpeaking={isSpeaking}
                  isPremium={isPremium}
                  persona={activePersona}
                  // 🆕 v79: 마지막 AI 메시지 식별 → bubble FX 매칭
                  isLastAi={msg.senderType === 'ai' && msg.id === lastAiMsgId}
                />
              ))}
            </div>
          ))}

          {/* 🆕 v25: 이벤트는 메시지 리스트 안에 인라인으로 렌더됨 — 별도 렌더 제거 */}

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

          {/* 🆕 v82: Roleplay 는 채팅 네이티브 — 마지막 말풍선 바로 아래 인라인 렌더 */}
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
              <ChatInput
                onSend={sendMessage}
                onImageAttach={activePersona !== 'tarot' ? handleImageAttach : undefined}
                disabled={isLoading || pendingEventLock}
                placeholder={pendingEventLock ? '위 질문에 답해줘 ↑' : '마음 편하게 다 말해봐...'}
                typingPlaceholder={
                  isLoading 
                    ? (activePersona === 'tarot' ? '타로냥이 카드를 읽고 있어' : '루나가 답장을 고민하고 있어') 
                    : (activePersona !== 'tarot' && openingVideoEnded && messages.length === 0 
                        ? '무슨 고민이야? 연애 얘긴 나한테 다 말해!' 
                        : undefined)
                }
              />
            </div>
          )}
        </div>

        {/* 🆕 v81: BRIDGE 몰입 모드 오버레이 — activeMode 따라 조건 렌더 */}
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
              // 🆕 v81: 확정 초안 자동 저장 (fire-and-forget, 실패해도 UX 안 막음)
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

        {/* 🆕 v81: 우상단 플로팅 — 설정 & 초안함 */}
        <div className="fixed top-3 right-3 z-[8000] flex flex-col gap-1.5 pointer-events-none">
          <button
            onClick={() => setShowDraftsVault(true)}
            className="pointer-events-auto w-9 h-9 rounded-full bg-white/80 backdrop-blur-md border border-[#D5C2A5]/60 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
            title="내 초안함"
          >
            <span className="text-base">📂</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="pointer-events-auto w-9 h-9 rounded-full bg-white/80 backdrop-blur-md border border-[#D5C2A5]/60 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
            title="효과 설정"
          >
            <span className="text-base">⚙️</span>
          </button>
        </div>

        <FxBgmSettings open={showSettings} onClose={() => setShowSettings(false)} />
        <DraftsVault open={showDraftsVault} onClose={() => setShowDraftsVault(false)} />
    </div>
  );
}
