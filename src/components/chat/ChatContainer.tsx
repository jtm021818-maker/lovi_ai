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
import { CalmingTimer } from '@/components/nudge/CalmingTimer';
import { BreathingGuide } from '@/components/nudge/BreathingGuide';

// 🆕 v8: 7종 이벤트 및 상태 시각화 컴포넌트 임포트
import PhaseProgress from './events/PhaseProgress';
import EmotionThermometer from './events/EmotionThermometer';
import InsightCard from './events/InsightCard';
import ScalingQuestion from './events/ScalingQuestion';
import SolutionPreview from './events/SolutionPreview';
import SolutionCard from './events/SolutionCard';
import MessageDraft from './events/MessageDraft';
import GrowthReport from './events/GrowthReport';

import { RelationshipScenario } from '@/types/engine.types';
import type { NudgeAction, SuggestionMeta, PhaseEvent } from '@/types/engine.types';
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

const PERSONA_TABS: PersonaMode[] = ['counselor', 'friend', 'panel'];

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
};

export default function ChatContainer({ sessionId }: ChatContainerProps) {
  const { messages, isLoading, nudges, stateResult, suggestions, panelData, axesProgress, phaseEvents, currentPhase, phaseProgress, sessionStatus, sessionSummary, sendMessage } = useChat(sessionId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePersona, setActivePersona] = useState<PersonaMode>('counselor');
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isScenarioPanelOpen, setIsScenarioPanelOpen] = useState(false);
  const [userOverrideScenario, setUserOverrideScenario] = useState<RelationshipScenario | null>(null);
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

  // 페이지 로드 시 DB에서 저장된 페르소나 모드 불러오기
  useEffect(() => {
    fetch('/api/user/persona/current')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.persona_mode && ['counselor', 'friend', 'panel'].includes(data.persona_mode)) {
          setActivePersona(data.persona_mode as PersonaMode);
        }
      })
      .catch(() => {});
  }, []);

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
    sendMessage(text, meta || { source: 'suggestion' });
  }

  /** 🆕 이벤트별 렌더러 */
  const renderPhaseEvent = (event: PhaseEvent, idx: number) => {
    console.log(`[ChatContainer] 렌더링 시도 이벤트:`, event.type);
    switch (event.type) {
      case 'EMOTION_THERMOMETER': return <EmotionThermometer key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'INSIGHT_CARD': return <InsightCard key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'SCALING_QUESTION': return <ScalingQuestion key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'SOLUTION_PREVIEW': return <SolutionPreview key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'SOLUTION_CARD': return <SolutionCard key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'MESSAGE_DRAFT': return <MessageDraft key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      case 'GROWTH_REPORT': return <GrowthReport key={`event-${idx}`} event={event} onSelect={handleSuggestionSelect} disabled={isLoading} />;
      default: return null;
    }
  };

  return (
    <motion.div
      className={`flex flex-col h-full bg-gradient-to-b ${gradient}`}
      animate={{ backgroundImage: undefined }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
    >
      {/* 프리미엄 헤더 + 페르소나 드롭다운 + 시나리오 태그 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] z-10 sticky top-0">
        {/* 상단: 뒤로가기 + 아바타 + 이름 + 페르소나 드롭다운 */}
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => window.history.back()}
            className="mr-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-pink-50 hover:text-pink-500 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center mr-3 shadow-sm border border-white"
          >
            <span className="text-xl">{personaInfo.icon}</span>
          </motion.div>
          <div className="flex-1">
            <h1 className="text-[15px] font-bold text-gray-800 tracking-tight">
              마음이 {activePersona === 'counselor' ? '선생님' : activePersona === 'panel' ? '전문가팀' : ''}
            </h1>
            <p className="text-[11px] font-medium text-pink-400">{personaInfo.headerSubtext}</p>
          </div>

          {/* 페르소나 드롭다운 버튼 */}
          <div ref={personaRef} className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPersonaOpen(!isPersonaOpen)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white pl-2.5 pr-2 py-1.5 rounded-xl text-[11px] font-semibold shadow-sm"
            >
              {personaInfo.icon} {personaInfo.label.replace(' 모드', '')}
              <motion.svg
                animate={{ rotate: isPersonaOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </motion.svg>
            </motion.button>

            {/* 드롭다운 메뉴 */}
            <AnimatePresence>
              {isPersonaOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[160px]"
                >
                  {PERSONA_TABS.map((mode) => {
                    const info = PERSONA_INFO[mode];
                    const isActive = activePersona === mode;
                    return (
                      <motion.button
                        key={mode}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handlePersonaChange(mode)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                          isActive
                            ? 'bg-gradient-to-r from-pink-50 to-purple-50 text-pink-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base">{info.icon}</span>
                        <span>{info.label.replace(' 모드', '')}</span>
                        {isActive && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto text-pink-500"
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* emotion indicator */}
          {emotionScore !== null && (
            <div className="flex items-center bg-gray-50/80 px-2.5 py-1.5 rounded-full border border-gray-100 ml-2">
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
                className="flex items-center gap-1.5 bg-blue-50/80 border border-blue-100 px-3 py-1.5 rounded-full"
              >
                <span className="text-sm">{SCENARIO_LABELS[activeScenario!].icon}</span>
                <span className="text-[11px] font-semibold text-blue-600">
                  {SCENARIO_LABELS[activeScenario!].label}
                </span>
                <span className="text-[9px] text-blue-400">으로 분석됨</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </motion.button>
              
              {/* 🆕 축 수집 진행률 표시 (읽씹이고 progress 데이터가 있을 때) */}
              {activeScenario === RelationshipScenario.READ_AND_IGNORED && axesProgress && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-100 px-2.5 py-1 rounded-full shadow-sm ml-0.5"
                >
                  {axesProgress.isComplete ? (
                    <>
                      <span className="text-[10px] font-bold text-indigo-600">진단 완료</span>
                      <motion.span 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ duration: 1, repeat: Infinity }} 
                        className="text-[10px] text-indigo-500"
                      >
                        ✔
                      </motion.span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] font-medium text-indigo-400">분석 중</span>
                      {/* 프로그레스 바 영역 */}
                      <div className="w-12 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(axesProgress.filledCount / axesProgress.totalCount) * 100}%` }}
                          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                          className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full relative overflow-hidden"
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
            <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-100 px-3 py-1.5 rounded-full">
              {messages.length === 0 ? (
                <>
                  <span className="text-sm">💬</span>
                  <span className="text-[11px] font-medium text-gray-400">대화를 시작하면 상황을 분석해요</span>
                </>
              ) : (
                <>
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-sm"
                  >🔍</motion.span>
                  <span className="text-[11px] font-medium text-gray-400">상황 분석 중...</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🆕 구간 진행률 바 (HOOK부터 마지막 EMPOWER까지 상태 시각화) */}
      <PhaseProgress currentPhase={currentPhase} progress={phaseProgress} />

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
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center mb-4 shadow-lg"
            >
              <span className="text-2xl">💝</span>
            </motion.div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              {activePersona === 'friend'
                ? '뭐든 편하게 말해 ~'
                : activePersona === 'panel'
                  ? '전문가 팀이 함께 고민해 드릴게요'
                  : '연애 고민, 편하게 얘기해도 괜찮아요'}
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              {activePersona === 'friend'
                ? '정리 안 돼도 괜찮아! 그냥 막 말해봐 ㅎㅎ'
                : '정리가 안 된 상태여도 괜찮아요.\n무엇이 가장 마음에 걸리시나요?'}
            </p>
          </div>
        )}

        {messageGroups.map(({ dateKey, messages: groupMsgs }) => (
          <div key={dateKey}>
            <DateDivider date={groupMsgs[0].createdAt} />
            {groupMsgs.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isTyping={isLoading && msg.senderType === 'ai' && !msg.content}
              />
            ))}
          </div>
        ))}

        {/* 🆕 이벤트 컴포넌트들 렌더링 (메시지 사이에 들어갈 수도 있지만 일단 채팅 목록 뒤에 배치) */}
        {phaseEvents.map((event, idx) => renderPhaseEvent(event, idx))}

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
      {sessionStatus === 'completed' ? (
        <div className="p-5 bg-white border-t border-pink-100 rounded-t-3xl shadow-[0_-4px_20px_rgb(0,0,0,0.03)] z-10 transition-all">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
              <span className="text-xl">✨</span>
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">상담이 완료되었습니다</h3>
            {sessionSummary ? (
              <p className="text-xs text-gray-500 leading-relaxed px-4 break-keep">
                {sessionSummary}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                수고하셨습니다. 지난 대화를 편하게 돌아보세요.
              </p>
            )}
          </div>
        </div>
      ) : (
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading}
          placeholder={activePersona === 'friend' ? '편하게 말해봐~' : '편하게 이야기해 보세요...'}
        />
      )}
    </motion.div>
  );
}
