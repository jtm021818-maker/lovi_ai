'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type SessionPreview = {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  session_summary?: string;
  locked_scenario?: string;
  current_phase_v2?: string;
  turn_count: number;
  emotion_start?: number;
  emotion_end?: number;
  emotion_baseline?: number;
  last_message_preview?: string;
  last_message_at?: string;
  is_archived: boolean;
  created_at: string;
  ended_at?: string;
};

// 시나리오 ENUM → { 한국어 라벨, 이모지 } 매핑
const SCENARIO_META: Record<string, { label: string; icon: string }> = {
  READ_AND_IGNORED:        { label: '읽씹 상황', icon: '📱' },
  GHOSTING:                { label: '잠수 이별', icon: '👻' },
  JEALOUSY_CONFLICT:       { label: '질투/갈등', icon: '🔥' },
  JEALOUSY:                { label: '질투', icon: '💚' },
  BREAKUP_CONTEMPLATION:   { label: '이별 고민', icon: '💔' },
  COMMUNICATION_BREAKDOWN: { label: '소통 단절', icon: '🔇' },
  TRUST_ISSUES:            { label: '신뢰 문제', icon: '🕵️' },
  LONG_DISTANCE:           { label: '장거리 연애', icon: '✈️' },
  INFIDELITY:              { label: '외도/바람', icon: '💣' },
  BOREDOM:                 { label: '권태기', icon: '😴' },
  GENERAL:                 { label: '연애 고민', icon: '💜' },
};
function getScenarioDisplay(scenario?: string | null) {
  return SCENARIO_META[scenario || 'GENERAL'] || SCENARIO_META['GENERAL'];
}

// Phase별 5단계 진행도
const PHASE_ORDER = ['HOOK', 'MIRROR', 'BRIDGE', 'GUIDE', 'CLOSE'];
function getPhaseProgress(phase?: string): number {
  if (!phase) return 0;
  const idx = PHASE_ORDER.indexOf(phase);
  return idx >= 0 ? idx + 1 : 0;
}

// 감정 점수 → 이모지
function emotionEmoji(score?: number): string {
  if (score == null) return '😶';
  if (score >= 80) return '😊';
  if (score >= 60) return '🙂';
  if (score >= 40) return '😐';
  if (score >= 20) return '😟';
  return '😢';
}

// 시간 포맷
function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return '어제';
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }
}

type ThemeMode = 'purple' | 'blue' | 'yellow';

const SKETCH_THEMES = {
  purple: {
    fill: '#F0E8FB', stroke: '#B9A4DF', strokeDark: '#8C6FC0',
    text: '#3D2859', badgeText: '#6B4FA0', shadow: '#D1C3EE',
  },
  blue: {
    fill: '#E8F4FC', stroke: '#8CCEF2', strokeDark: '#5AADDA',
    text: '#1D3B50', badgeText: '#3D7EA0', shadow: '#B5DDF2',
  },
  yellow: {
    fill: '#FDF6E0', stroke: '#E8D48A', strokeDark: '#C4AC4E',
    text: '#4D3D10', badgeText: '#957A20', shadow: '#EDE0AA',
  },
} as const;

/**
 * 진짜 손그림 스케치 스타일 필터 라벨
 * - feTurbulence로 선이 떨리는 효과
 * - 이중 윤곽선 (겹펜 드로잉)
 * - 확실히 울퉁불퉁한 path 좌표
 */
function HandDrawnFilterLabel({ 
  label, count, theme, onClick 
}: { 
  label: string; count: number; theme: ThemeMode; onClick: () => void;
}) {
  const t = SKETCH_THEMES[theme];
  const filterId = `sketch-${theme}`;

  // 큰 진폭으로 확실히 울퉁불퉁한 외곽선 (viewBox 160x52)
  const outerPath = `
    M 18,6 
    Q 22,3  40,5 
    Q 60,2  80,4.5 
    Q 100,2 120,5 
    Q 138,3 143,8 
    Q 150,14 148,26 
    Q 150,38 143,44 
    Q 138,50 120,47 
    Q 100,50 80,47.5 
    Q 60,50 40,47 
    Q 22,50 18,46 
    Q 10,40 12,26 
    Q 10,12 18,6 
    Z
  `;
  // 살짝 다른 경로로 이중 윤곽 (떨림)
  const innerPath = `
    M 19,7.5 
    Q 23,4  41,6 
    Q 61,3.5 80,5.5 
    Q 99,3 119,6 
    Q 137,4 142,9 
    Q 148,15 147,26 
    Q 149,37 142,43 
    Q 137,49 119,46.5 
    Q 99,49 80,47 
    Q 61,49.5 41,46.5 
    Q 23,49 19,45 
    Q 12,39 13,26 
    Q 11,13 19,7.5 
    Z
  `;

  // 뱃지용 찌그러진 원
  const blobPath = `
    M 16,2 Q 28,1 30,12 Q 32,24 20,30 Q 8,32 3,20 Q 0,8 16,2 Z
  `;

  return (
    <button 
      onClick={onClick}
      className="relative flex-1 h-[50px] flex justify-center items-center active:scale-95 transition-transform select-none"
    >
      <svg 
        viewBox="0 0 160 52"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ filter: `drop-shadow(1px 3px 0px ${t.shadow})` }}
      >
        <defs>
          {/* 손으로 그린 듯 선이 미세하게 떨리는 필터 */}
          <filter id={filterId}>
            <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="4" seed={theme === 'purple' ? 1 : theme === 'blue' ? 5 : 9} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* 1차 외곽: 두꺼운 배경선 (연필 밑선 느낌) */}
        <path 
          d={outerPath}
          fill={t.fill}
          stroke={t.strokeDark}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />

        {/* 2차 윤곽: 겹펜 (같은 모양을 살짝 다르게 한번 더) */}
        <path 
          d={innerPath}
          fill="none"
          stroke={t.stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
          filter={`url(#${filterId})`}
        />

        {/* 하이라이트 스크래치 (마커펜으로 쓱 그은 듯) */}
        <path 
          d="M 35,13 Q 55,10 75,12 Q 95,10 115,13"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
          filter={`url(#${filterId})`}
        />
      </svg>

      {/* 텍스트 + 뱃지 */}
      <div className="relative z-10 flex items-center justify-center gap-1 w-full px-3">
        <span 
          style={{ color: t.text }} 
          className="font-[900] text-[min(3.8vw,14.5px)] tracking-tight leading-none"
        >
          {label}
        </span>
        
        {/* 찌그러진 손그림 원형 뱃지 */}
        <div className="relative w-[28px] h-[28px] flex items-center justify-center ml-0.5">
          <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full">
            <defs>
              <filter id={`badge-sketch-${theme}`}>
                <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="3" seed={theme === 'purple' ? 3 : theme === 'blue' ? 7 : 11} result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            <path 
              d={blobPath}
              fill="#FFFFFF"
              stroke={t.stroke}
              strokeWidth="1.5"
              strokeLinecap="round"
              filter={`url(#badge-sketch-${theme})`}
            />
          </svg>
          <span 
            style={{ color: t.badgeText }} 
            className="relative z-10 font-[900] text-[12px] leading-none"
          >
            {count}
          </span>
        </div>
      </div>
    </button>
  );
}

// 🆕 v20: 날짜별 그룹핑
function groupByDate(sessions: SessionPreview[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 86400000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const buckets: Record<string, SessionPreview[]> = {
    '오늘': [],
    '어제': [],
    '이번 주': [],
    '이번 달': [],
    '이전': [],
  };

  for (const s of sessions) {
    const d = new Date(s.last_message_at || s.created_at);
    if (d >= today) buckets['오늘'].push(s);
    else if (d >= yesterday) buckets['어제'].push(s);
    else if (d >= thisWeekStart) buckets['이번 주'].push(s);
    else if (d >= thisMonthStart) buckets['이번 달'].push(s);
    else buckets['이전'].push(s);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, sessions: items }));
}

// 🆕 v20: 시간대별 인사말
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '늦은 밤이에요';
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '오후에도 힘내세요';
  return '오늘 하루 수고했어요';
}

export default function ChatListPage() {
  const [sessions, setSessions] = useState<SessionPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const r = await fetch('/api/sessions');
      const data = await r.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '새로운 상담' }),
      });
      const session = await res.json();
      router.push(`/chat/${session.id}`);
    } catch {
      alert("상담 시작에 실패했습니다.");
    }
  };

  // 🆕 v20: 아카이브
  const archiveSession = async (id: string) => {
    await fetch(`/api/sessions/${id}/archive`, { method: 'PATCH' });
    setSessions(prev => prev.filter(s => s.id !== id));
    setSwipedId(null);
  };

  // 🆕 v20: 필터 + 카운트
  const filteredSessions = sessions.filter(s => {
    if (activeFilter === 'active') return s.status === 'active';
    if (activeFilter === 'completed') return s.status === 'completed';
    return true;
  });

  const counts = {
    all: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    completed: sessions.filter(s => s.status === 'completed').length,
  };

  // 🆕 v20: 이어하기 대상
  const lastActiveSession = sessions.find(s => s.status === 'active' && (s.turn_count ?? 0) > 0);

  // 날짜 그룹핑
  const dateGroups = groupByDate(filteredSessions);

  return (
    <div className="flex flex-col h-full relative min-h-[100dvh] overflow-x-hidden font-sans pb-32">

      {/* 벚꽃 배경 이미지 */}
      <div className="fixed inset-0 -z-10">
        <img src="/ui_list_bg.jpeg" className="w-full h-full object-cover" alt="" />
      </div>

      {/* 네이티브 헤더 UI */}
      <div className="relative w-full shrink-0 px-[5%] pt-12 pb-4 z-10">

        {/* 인사말 */}
        <h1 className="text-[28px] font-[900] text-[#5C3A21] tracking-tight drop-shadow-sm mb-6 flex items-center gap-2">
          {getGreeting()} <span className="text-[24px]">☕</span>
        </h1>

        {/* 탭 버튼들 — 실시간 카운트 */}
        <div className="flex justify-between items-center gap-2 mb-4">
          <HandDrawnFilterLabel
            label="전체"
            count={counts.all}
            theme={activeFilter === 'all' ? 'purple' : 'purple'}
            onClick={() => setActiveFilter('all')}
          />
          <HandDrawnFilterLabel
            label="진행 중"
            count={counts.active}
            theme="blue"
            onClick={() => setActiveFilter('active')}
          />
          <HandDrawnFilterLabel
            label="완료됨"
            count={counts.completed}
            theme="yellow"
            onClick={() => setActiveFilter('completed')}
          />
        </div>
      </div>

      {/* 카드 리스트 — 날짜별 그룹핑 */}
      <div className="relative z-10 flex flex-col px-[4%] pb-20">
        {loading ? (
          <div className="text-center py-10 font-[800] text-[#A08B9B]">불러오는 중...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-16 font-[800] text-[#A08B9B]">
            {activeFilter === 'all' ? '아직 상담 내역이 없어요.\n루나와 첫 대화를 시작해보세요!' :
             activeFilter === 'active' ? '진행 중인 상담이 없어요.' : '완료된 상담이 없어요.'}
          </div>
        ) : (
          dateGroups.map(({ label: dateLabel, sessions: groupSessions }) => (
            <div key={dateLabel}>
              {/* 날짜 구분선 */}
              <div className="px-[1%] mt-4 mb-2 flex items-center gap-4">
                <span className="font-[900] text-[#5C3A21] text-[18px]">{dateLabel}</span>
                <div className="flex-1 h-[1.5px] bg-[#D6B5C3]/40"></div>
              </div>

              <AnimatePresence>
                {groupSessions.map((session, i) => {
                  const cardSrcs = [
                    "/ui/list_1_transparent.png",
                    "/ui/list_2_transparent.png",
                    "/ui/list_3_transparent.png",
                  ];
                  const imgSrc = cardSrcs[i % cardSrcs.length];
                  const uniformInsets = "top-[18%] left-[7%] right-[7%] bottom-[10%]";

                  const { label: scenarioLabel, icon: scenarioIcon } = getScenarioDisplay(session.locked_scenario);
                  const phaseProgress = getPhaseProgress(session.current_phase_v2);
                  const emStart = emotionEmoji(session.emotion_start);
                  const emEnd = session.emotion_end != null ? emotionEmoji(session.emotion_end) : emotionEmoji(session.emotion_start);
                  const timeLabel = formatTime(session.last_message_at || session.created_at);

                  let previewText = session.last_message_preview || '';
                  if (!previewText) {
                    if (session.session_summary) {
                      previewText = session.session_summary;
                    } else {
                      previewText = `${scenarioLabel} 관련 상담이 진행 중이에요.`;
                    }
                  }

                  const isCompleted = session.status === 'completed';
                  const isSwiped = swipedId === session.id;

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0, x: isSwiped ? -80 : 0 }}
                      exit={{ opacity: 0, x: -200, transition: { duration: 0.3 } }}
                      transition={{ delay: i * 0.05 }}
                      className="relative w-full cursor-pointer active:scale-[0.98] transition-all -my-2"
                      onClick={() => !isSwiped && router.push(`/chat/${session.id}`)}
                      onTouchStart={(e) => {
                        setTouchStartX(e.touches[0].clientX);
                      }}
                      onTouchMove={(e) => {
                        const diff = touchStartX - e.touches[0].clientX;
                        if (diff > 50) setSwipedId(session.id);
                        else if (diff < -20) setSwipedId(null);
                      }}
                      onTouchEnd={() => {}}
                    >
                      {/* 스와이프 시 아카이브 버튼 */}
                      {isSwiped && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute right-0 top-[20%] bottom-[12%] w-[70px] bg-red-400/90 rounded-2xl flex flex-col items-center justify-center z-20"
                          onClick={(e) => { e.stopPropagation(); archiveSession(session.id); }}
                        >
                          <span className="text-white text-lg">🗑</span>
                          <span className="text-white text-[11px] font-bold mt-1">삭제</span>
                        </motion.button>
                      )}

                      <img src={imgSrc} className="w-full h-auto pointer-events-none drop-shadow-sm" style={{ aspectRatio: '1327/567' }} />

                      <div className={`absolute ${uniformInsets} flex flex-col pointer-events-none`}>

                        {/* Top Row: Scenario Badge & Time */}
                        <div className="flex justify-between items-center px-1 shrink-0">
                          <div className="bg-white/95 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                            <span className="text-[min(4vw,14px)] leading-none">{scenarioIcon}</span>
                            <span className="font-[800] text-[min(3.8vw,14px)] text-[#D94F6E] leading-none">
                              {scenarioLabel}
                            </span>
                          </div>
                          <span className="font-[600] text-[#5C3A21] text-[min(3.5vw,13px)] mt-1.5 mr-1">
                            {timeLabel}
                          </span>
                        </div>

                        {/* Middle Row: Title + Preview */}
                        <div className="px-2 mt-[min(2vw,8px)] flex-grow overflow-hidden flex flex-col justify-center">
                          {session.title !== '새로운 상담' && (
                            <p className="font-[600] text-[#8D6E63] text-[min(3.2vw,12px)] mb-0.5 truncate">{session.title}</p>
                          )}
                          <h3 className="font-[800] text-[#4A3059] text-[min(4vw,15.5px)] line-clamp-2 leading-[1.35]">
                            {previewText}
                          </h3>
                        </div>

                        {/* Separator */}
                        <div className="w-full h-[1.5px] bg-[#4A3059]/10 mt-auto mb-[min(2vw,8px)] shrink-0"></div>

                        {/* Bottom Row */}
                        <div className="flex justify-between items-center px-1 pb-1 shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="bg-white/95 px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                              <span className="text-[min(3.2vw,12px)] leading-none">{emStart}→{emEnd}</span>
                            </div>
                            <span className="font-[800] text-[#4A3059] text-[min(4vw,15px)] leading-none">
                              {session.turn_count}턴
                            </span>
                          </div>

                          <div className="flex gap-1.5 items-center">
                            {PHASE_ORDER.map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${
                                  idx < phaseProgress
                                    ? isCompleted ? 'bg-[#A081F0]' : 'bg-[#FF80B5]'
                                    : 'bg-[#4A3059]/15'
                                }`}
                              ></div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* FAB: 새 상담 + 이어하기 */}
      <div className="fixed bottom-[max(5vh,90px)] right-[5%] z-20 pointer-events-none flex flex-col items-end gap-3">
        {/* 이어하기 버튼 */}
        {lastActiveSession && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/chat/${lastActiveSession.id}`)}
            className="pointer-events-auto px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-sm border border-[#D5C2A5] shadow-lg"
          >
            <span className="font-[800] text-[#5C3A21] text-[14px]">💬 이어하기</span>
          </motion.button>
        )}

        {/* 새 상담 시작 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={createSession}
          className="relative px-6 py-3.5 pointer-events-auto rounded-full overflow-hidden drop-shadow-[0_8px_16px_rgba(255,105,180,0.5)] bg-gradient-to-r from-[#FF7A9C] via-[#DC8AE7] to-[#A081F0]"
        >
          <div className="relative w-full h-full flex items-center justify-center font-[800] text-white text-[17px] tracking-wide gap-1">
            <span className="text-yellow-300">✨</span> 새 상담 시작
          </div>
        </motion.button>
      </div>

    </div>
  );
}
