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
import InsightCard from './events/InsightCard';
import EmotionMirror from './events/EmotionMirror';
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
  const { messages, isLoading, nudges, stateResult, suggestions, panelData, axesProgress, phaseEvents, currentPhase, phaseProgress, sessionStatus, sessionSummary, sendMessage } = useChat(sessionId);
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
  const [openingVideoEnded, setOpeningVideoEnded] = useState(false);
  const [xrayResult, setXrayResult] = useState<XRayResult | null>(null);
  const [xrayLoading, setXrayLoading] = useState(false);
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
  const showScenarioTag = activeScenario && activeScenario !== RelationshipScenario.GENERAL;

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
      case 'INSIGHT_CARD': return <InsightCard key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'EMOTION_MIRROR': return <EmotionMirror key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
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

          {/* emotion indicator */}
          {emotionScore !== null && (
            <div className="flex items-center bg-white/70 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/50 ml-2 shadow-sm">
              <motion.div
                key={gradient}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-1.5 h-1.5 rounded-full mr-1.5 shadow-sm"
                style={{
                  background:
                    emotionScore >= 3  ? '#f472b6' :
                    emotionScore >= 0  ? '#c084fc' :
                    emotionScore >= -3 ? '#60a5fa' :
                                         '#6366f1',
                }}
              />
              <span className="text-[10px] font-bold text-gray-500">
                {emotionScore >= 3  ? '긍정적' :
                 emotionScore >= 0  ? '중립' :
                 emotionScore >= -3 ? '힘든 중' :
                                      '많이 힘들어요'}
              </span>
            </div>
          )}
        </div>

        {/* 🆕 시나리오 태그 (항상 표시 — 미분석 시 "분석 중…") */}
        <div className="flex items-center px-4 pb-2 gap-2">
          {showScenarioTag ? (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsScenarioPanelOpen(true)}
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-[#D5C2A5] px-3 py-1.5 rounded-full shadow-sm"
              >
                <span className="text-sm">{SCENARIO_LABELS[activeScenario!].icon}</span>
                <span className="text-[11px] font-semibold text-[#5D4037]">
                  {SCENARIO_LABELS[activeScenario!].label}
                </span>
                <span className="text-[9px] text-[#8D6E63] font-medium">으로 분석됨</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#795548" strokeWidth="3" strokeLinecap="round">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </motion.button>
              
              {/* 🆕 축 수집 진행률 표시 (읽씹이고 progress 데이터가 있을 때) */}
              {activeScenario === RelationshipScenario.READ_AND_IGNORED && axesProgress && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-[#D5C2A5] px-2.5 py-1 rounded-full shadow-sm ml-0.5"
                >
                  {axesProgress.isComplete ? (
                    <>
                      <span className="text-[10px] font-bold text-[#5D4037]">진단 완료</span>
                      <motion.span 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ duration: 1, repeat: Infinity }} 
                        className="text-[10px] text-[#A1887F]"
                      >
                        ✔
                      </motion.span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-bold text-[#8D6E63]">분석 중</span>
                      {/* 프로그레스 바 영역 */}
                      <div className="w-12 h-1.5 bg-[#EAE1D0] rounded-full overflow-hidden border border-[#D5C2A5]/50">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(axesProgress.filledCount / axesProgress.totalCount) * 100}%` }}
                          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                          className="h-full bg-gradient-to-r from-[#D7CCC8] to-[#8D6E63] rounded-full relative overflow-hidden"
                        >
                          <motion.div 
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-white/30 w-1/2 skew-x-12"
                          />
                        </motion.div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {userOverrideScenario && (
                <button
                  onClick={() => setUserOverrideScenario(null)}
                  className="text-[10px] text-gray-400 hover:text-gray-600"
                >
                  AI 분류로 되돌리기
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-[#D5C2A5] shadow-sm px-3 py-1.5 rounded-full">
              {messages.length === 0 ? (
                <>
                  <span className="text-sm">💬</span>
                  <span className="text-[11px] font-semibold text-[#8D6E63]">대화를 시작하면 상황을 분석해요</span>
                </>
              ) : (
                <>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-sm"
                  >🔍</motion.span>
                  <span className="text-[11px] font-semibold text-[#8D6E63]">상황 분석 중...</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🆕 구간 진행률 바 (HOOK부터 마지막 EMPOWER까지 상태 시각화) */}
      <PhaseProgress currentPhase={currentPhase} progress={phaseProgress} persona={activePersona} />

      {/* 🆕 시나리오 수정 바텀시트 */}
      <AnimatePresence>
        {isScenarioPanelOpen && (
          <>
            {/* 배경 딩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScenarioPanelOpen(false)}
              className="fixed inset-0 bg-black/30 z-40"
            />
            {/* 바텀시트 */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[60vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />
              <div className="px-5 pb-2">
                <h3 className="text-[15px] font-bold text-gray-800">상황 수정하기</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">AI가 잘못 분류했다면 직접 선택해주세요</p>
              </div>
              <div className="px-3 pb-6 grid grid-cols-2 gap-2">
                {Object.entries(SCENARIO_LABELS).map(([key, { icon, label }]) => {
                  const scenario = key as RelationshipScenario;
                  const isActive = activeScenario === scenario;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleScenarioOverride(scenario)}
                      className={`flex items-center gap-2 px-3.5 py-3 rounded-2xl text-[13px] font-medium transition-all border ${
                        isActive
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                          : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg">{icon}</span>
                      <span>{label}</span>
                      {isActive && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                />
              ))}
            </div>
          ))}

          {/* 🆕 v25: 이벤트는 메시지 리스트 안에 인라인으로 렌더됨 — 별도 렌더 제거 */}

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
                disabled={isLoading}
                placeholder="마음 편하게 다 말해봐..."
                typingPlaceholder={activePersona !== 'tarot' && openingVideoEnded && messages.length === 0 ? '무슨 고민이야? 연애 얘긴 나한테 다 말해!' : undefined}
              />
            </div>
          )}
        </div>
    </div>
  );
}
