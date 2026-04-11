'use client';

/**
 * 🏠 v42: 라운지 — "가짜 실시간" 단톡방
 *
 * 핵심 변경:
 * - 배치 메시지 점적 재생 (Drip Feed)
 * - 읽지 않은 메시지 구분선
 * - 카톡 스타일 시간 표시
 * - 유저 발화 시 LLM 호출 → 배치 재생 일시정지 → 응답 후 재개
 * - NPC Life Engine은 배치 실패 시 폴백으로만 유지
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LoungeBackground, { getTimeOfDay } from '@/components/lounge/LoungeBackground';
import LoungeMessage, { type LoungeMessageType } from '@/components/lounge/LoungeMessage';
import LoungeInput from '@/components/lounge/LoungeInput';
import MoodCheckIn from '@/components/lounge/MoodCheckIn';
import type { CharacterDailyState } from '@/engines/lounge/daily-state-engine';
import { moodToEmoji } from '@/engines/lounge/daily-state-engine';
import type { ScheduledMessage, BatchDailyMessages } from '@/engines/lounge/batch-message-types';
import { splitByTime, buildPlaybackQueue, formatChatTime, shouldShowTime, messageMinute } from '@/engines/lounge/batch-message-types';
import { crossTalkToQueue, generateDefaultSchedule, getCurrentStatus } from '@/engines/lounge/conversation-player';
import { NpcLifeEngine, type CharacterLiveStatus } from '@/engines/lounge/npc-life-engine';
import { useLoungeStore } from '@/lib/stores/lounge-store';
import { createClient } from '@/lib/supabase/client';

export default function LoungePage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dailyState, setDailyState] = useState<CharacterDailyState | null>(null);
  const [persona, setPersona] = useState<'luna' | 'tarot'>('luna');
  const [messages, setMessages] = useState<LoungeMessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [userJoined, setUserJoined] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [userName, setUserName] = useState('나');
  const [lunaLive, setLunaLive] = useState<CharacterLiveStatus | null>(null);
  const [tarotLive, setTarotLive] = useState<CharacterLiveStatus | null>(null);
  const [storyTitle, setStoryTitle] = useState('');
  const engineRef = useRef<NpcLifeEngine | null>(null);
  const initRef = useRef(false);

  // 🆕 v42: 배치 관련 상태
  const [batchData, setBatchData] = useState<BatchDailyMessages | null>(null);
  const [unreadLine, setUnreadLine] = useState(-1); // 읽지 않은 메시지 구분선 인덱스
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  const [isPausedByUser, setIsPausedByUser] = useState(false); // 유저 발화로 배치 일시정지

  // Zustand 연동
  const setOnLounge = useLoungeStore(s => s.setOnLounge);
  const clearUnread = useLoungeStore(s => s.clearUnread);
  const setBatchMessages = useLoungeStore(s => s.setBatchMessages);

  const timeOfDay = getTimeOfDay();
  const isNight = timeOfDay === 'night' || timeOfDay === 'lateNight';
  const currentHour = new Date().getHours();

  // 라운지 진입 시 Zustand 동기화
  useEffect(() => {
    setOnLounge(true);
    clearUnread();
    return () => setOnLounge(false);
  }, [setOnLounge, clearUnread]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  }, []);

  const addMsg = useCallback((msg: LoungeMessageType) => {
    setMessages(prev => [...prev, msg]);
    scrollToBottom();
  }, [scrollToBottom]);

  // 히스토리 저장 (디바운스)
  const saveHistoryRef = useRef<NodeJS.Timeout | null>(null);
  const saveHistory = useCallback((msgs: LoungeMessageType[], played: boolean) => {
    if (saveHistoryRef.current) clearTimeout(saveHistoryRef.current);
    saveHistoryRef.current = setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      const serializable = msgs
        .filter(m => m.type !== 'typing')
        .map(m => ({ type: m.type, speaker: (m as any).speaker, text: (m as any).text, date: today }));
      fetch('/api/lounge/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: serializable, crossTalkPlayed: played }),
      }).catch(() => {});
    }, 2000);
  }, []);

  // ─── 🆕 v42: 배치 메시지 → 화면에 표시 ──────────────

  const renderBatchMessage = useCallback((msg: ScheduledMessage) => {
    if (msg.type === 'system') {
      addMsg({ type: 'system', text: msg.text });
    } else if (msg.type === 'action') {
      addMsg({ type: 'action', speaker: msg.speaker ?? 'luna', text: msg.text });
    } else {
      // character: typing → 1초 후 메시지
      setMessages(prev => [...prev, { type: 'typing', speaker: msg.speaker ?? 'luna' }]);
      scrollToBottom();
      setTimeout(() => {
        setMessages(prev => {
          const clean = prev.filter(m => m.type !== 'typing');
          return [...clean, {
            type: 'character' as const,
            speaker: msg.speaker ?? 'luna',
            text: msg.text,
            time: formatChatTime(msg.hour, msg.minute),
          }];
        });
        scrollToBottom();
      }, 800 + Math.min(msg.text.length * 20, 1500));
    }
  }, [addMsg, scrollToBottom]);

  // 미래 메시지 예약
  const scheduleFutureMessages = useCallback((futureMessages: ScheduledMessage[]) => {
    // 기존 타이머 정리
    activeTimersRef.current.forEach(t => clearTimeout(t));
    activeTimersRef.current = [];

    const queue = buildPlaybackQueue(futureMessages);

    for (const item of queue) {
      const timer = setTimeout(() => {
        if (isPausedByUser) return; // 유저 대화 중이면 스킵
        renderBatchMessage(item.message);
        // 히스토리 저장
        setMessages(prev => { saveHistory(prev, true); return prev; });
      }, item.delayMs);
      activeTimersRef.current.push(timer);
    }
  }, [renderBatchMessage, saveHistory, isPausedByUser]);

  // ─── 초기화 ───────────────────────────────────────────

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      try {
        const res = await fetch('/api/lounge/state');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setDailyState(data.state);
        setPersona(data.persona === 'tarot' ? 'tarot' : 'luna');
        setCheckedIn(data.todayCheckedIn);
        setStreakDays(data.streakDays);
        if (data.nickname) setUserName(data.nickname);

        const state = data.state as CharacterDailyState;
        const existingHistory: any[] = data.todayHistory ?? [];
        const batch = state.batchMessages as BatchDailyMessages | undefined;

        // 🆕 v42: 배치 메시지가 있으면 배치 모드!
        if (batch?.messages?.length && batch.messages.length > 5) {
          setBatchData(batch);
          setBatchMessages(batch.messages); // Zustand에도 설정

          const { past, future } = splitByTime(batch.messages);

          // 기존 히스토리가 있으면 복원
          if (existingHistory.length > 0) {
            const restored: LoungeMessageType[] = existingHistory.map((m: any) => {
              if (m.type === 'system') return { type: 'system', text: m.text };
              if (m.type === 'user') return { type: 'user', text: m.text };
              if (m.type === 'action') return { type: 'action', speaker: m.speaker, text: m.text };
              return { type: 'character', speaker: m.speaker, text: m.text };
            });

            // 히스토리에서 아직 안 뜬 과거 메시지 추가
            const historyTexts = new Set(restored.filter(m => m.type === 'character').map(m => (m as any).text));
            const newPast = past.filter(m => m.type === 'character' && !historyTexts.has(m.text));

            if (newPast.length > 0) {
              // 읽지 않은 메시지 구분선
              setUnreadLine(restored.length);
              const unreadMsgs: LoungeMessageType[] = newPast.map(m => {
                if (m.type === 'system') {
                  return { type: 'system' as const, text: m.text };
                }
                return {
                  type: 'character' as const,
                  speaker: (m.speaker ?? 'luna') as 'luna' | 'tarot',
                  text: m.text,
                  timestamp: formatChatTime(m.hour, m.minute),
                };
              });
              setMessages([...restored, ...unreadMsgs]);
            } else {
              setMessages(restored);
            }

            setUserJoined(true);

            // 재입장 인사 — 이미 "돌아왔어요"가 마지막에 있으면 스킵 (중복 방지)
            const lastFewTexts = existingHistory.slice(-3).map((m: any) => m.text ?? '');
            const alreadyGreeted = lastFewTexts.some((t: string) => t.includes('돌아왔어요'));
            if (!alreadyGreeted) {
              setTimeout(() => {
                setMessages(prev => [...prev, { type: 'system', text: `${data.nickname ?? '나'}님이 돌아왔어요` }]);
                scrollToBottom();
              }, 500);
            }

            if (!data.todayCheckedIn) setShowCheckIn(true);
          } else {
            // 첫 입장: 과거 메시지 한꺼번에 보여주기
            const initialMsgs: LoungeMessageType[] = [];

            // 과거 메시지 (읽지 않은 상태로)
            if (past.length > 0) {
              setUnreadLine(0); // 첫 입장이니 전부 읽지 않은 메시지

              for (const msg of past) {
                if (msg.type === 'system') {
                  initialMsgs.push({ type: 'system', text: msg.text });
                } else {
                  initialMsgs.push({
                    type: 'character' as const,
                    speaker: msg.speaker ?? 'luna',
                    text: msg.text,
                    timestamp: formatChatTime(msg.hour, msg.minute),
                  });
                }
              }
            }

            // 유저 합류
            initialMsgs.push({ type: 'system', text: `${data.nickname ?? '나'}님이 들어왔어요` });

            // 인사
            if (batch.proactiveGreeting) {
              initialMsgs.push({
                type: 'character' as const,
                speaker: data.persona === 'tarot' ? 'tarot' : 'luna',
                text: batch.proactiveGreeting,
              });
            }

            setMessages(initialMsgs);
            setUserJoined(true);
            if (!data.todayCheckedIn) setTimeout(() => setShowCheckIn(true), 1500);

            // 히스토리 저장
            saveHistory(initialMsgs, true);
          }

          // 미래 메시지 예약
          const { future: futureNow } = splitByTime(batch.messages);
          scheduleFutureMessages(futureNow);

          setLoading(false);
          scrollToBottom();
          return;
        }

        // ─── 폴백: 배치 없으면 기존 crossTalk 로직 ──────

        const alreadyPlayed = data.crossTalkPlayed ?? false;

        if (existingHistory.length > 0) {
          const restored: LoungeMessageType[] = existingHistory.map((m: any) => {
            if (m.type === 'system') return { type: 'system', text: m.text };
            if (m.type === 'user') return { type: 'user', text: m.text };
            if (m.type === 'action') return { type: 'action', speaker: m.speaker, text: m.text };
            return { type: 'character', speaker: m.speaker, text: m.text };
          });
          setMessages(restored);
          setUserJoined(true);
          if (!data.todayCheckedIn) setShowCheckIn(true);

          // 재입장 인사 — 중복 방지
          const lastFewTexts = existingHistory.slice(-3).map((m: any) => m.text ?? '');
          const alreadyGreeted = lastFewTexts.some((t: string) => t.includes('돌아왔어요'));
          if (!alreadyGreeted) {
            setTimeout(() => {
              const greeting = data.totalSessions > 0
                ? `또 왔네! 상담은 안 해봤어?`
                : `다시 왔구나! 편하게 있어~`;
              const speaker = data.persona === 'tarot' ? 'tarot' as const : 'luna' as const;
              setMessages(prev => [...prev, { type: 'system', text: `${userName}님이 돌아왔어요` }]);
              setTimeout(() => {
                setMessages(prev => [...prev, { type: 'character', speaker, text: greeting }]);
                scrollToBottom();
              }, 1500);
            }, 500);
          }

          setLoading(false);
          return;
        }

        // 첫 입장: crossTalk 재생
        const lunaStatus = getCurrentStatus(generateDefaultSchedule('luna'), currentHour);
        const tarotStatus = getCurrentStatus(generateDefaultSchedule('tarot'), currentHour);
        const initialMsgs: LoungeMessageType[] = [];

        if (lunaStatus.location === 'away') {
          initialMsgs.push({ type: 'system', text: `루나가 ${lunaStatus.activity} 중이에요 ${lunaStatus.emoji}` });
        }
        if (tarotStatus.location === 'away') {
          initialMsgs.push({ type: 'system', text: `타로냥이 ${tarotStatus.activity} 중이에요 ${tarotStatus.emoji}` });
        }
        setMessages(initialMsgs);

        if (!alreadyPlayed) {
          const queue = crossTalkToQueue(state);
          for (const msg of queue) {
            setTimeout(() => {
              setMessages(prev => [...prev.filter(m => m.type !== 'typing'), { type: 'typing', speaker: msg.speaker }]);
              scrollToBottom();
              setTimeout(() => {
                setMessages(prev => {
                  const clean = prev.filter(m => m.type !== 'typing');
                  return [...clean, { type: 'character', speaker: msg.speaker, text: msg.text }];
                });
                scrollToBottom();
              }, 1200);
            }, msg.scheduledDelay);
          }

          const totalDelay = queue.length > 0 ? queue[queue.length - 1].scheduledDelay + 2500 : 2000;
          setTimeout(() => {
            setUserJoined(true);
            setMessages(prev => [...prev, { type: 'system', text: `${userName}님이 들어왔어요` }]);
            scrollToBottom();

            const onJoin = state.crossTalk?.onTapMessage;
            const speaker = data.persona === 'tarot' ? 'tarot' as const : 'luna' as const;
            if (onJoin) {
              setTimeout(() => {
                setMessages(prev => [...prev, { type: 'typing', speaker }]);
                scrollToBottom();
                setTimeout(() => {
                  setMessages(prev => {
                    const clean = prev.filter(m => m.type !== 'typing');
                    return [...clean, { type: 'character' as const, speaker, text: onJoin }];
                  });
                  scrollToBottom();
                  if (!data.todayCheckedIn) setTimeout(() => setShowCheckIn(true), 1500);
                  setMessages(prev => { saveHistory(prev, true); return prev; });
                }, 1200);
              }, 1000);
            } else {
              if (!data.todayCheckedIn) setTimeout(() => setShowCheckIn(true), 1000);
              setMessages(prev => { saveHistory(prev, true); return prev; });
            }
          }, totalDelay);
        } else {
          setUserJoined(true);
          if (!data.todayCheckedIn) setShowCheckIn(true);
        }
      } catch (e) {
        console.error('[Lounge] 초기화 실패:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 유저 메시지 전송
  const handleSend = useCallback(async (text: string) => {
    addMsg({ type: 'user', text });
    setSending(true);
    setIsPausedByUser(true); // 배치 일시정지

    const recentChat = messages
      .filter(m => m.type === 'character' || m.type === 'user')
      .slice(-8)
      .map(m => ({
        speaker: m.type === 'user' ? '나' : (m as any).speaker === 'luna' ? '루나' : '타로냥',
        text: (m as any).text,
      }));

    try {
      const res = await fetch('/api/lounge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, recentChat }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      for (const resp of data.responses ?? []) {
        await new Promise<void>(resolve => {
          setTimeout(() => {
            setMessages(prev => [...prev, { type: 'typing', speaker: resp.speaker }]);
            scrollToBottom();
            setTimeout(() => {
              setMessages(prev => {
                const clean = prev.filter(m => m.type !== 'typing');
                const updated = [...clean, { type: 'character' as const, speaker: resp.speaker, text: resp.text }];
                saveHistory(updated, true);
                return updated;
              });
              scrollToBottom();
              resolve();
            }, 800 + resp.text.length * 25);
          }, (resp.delay ?? 2) * 1000);
        });
      }

      if (data.shouldSuggestCounseling) {
        setTimeout(() => {
          addMsg({ type: 'character', speaker: 'luna', text: '음... 이건 좀 더 이야기해봐야 할 것 같은데. 상담으로 가볼까?' });
        }, 2000);
      }
    } catch (e) {
      addMsg({ type: 'character', speaker: 'luna', text: '앗, 잠깐 연결이 끊겼어. 다시 말해줄래?' });
    } finally {
      setSending(false);
      // 유저 응답 완료 후 5초 뒤 배치 재생 재개
      setTimeout(() => setIsPausedByUser(false), 5000);
    }
  }, [messages, addMsg, scrollToBottom, saveHistory]);

  // 감정 체크인
  const handleCheckIn = useCallback(async (mood: string, score: number) => {
    setCheckedIn(true);
    setShowCheckIn(false);
    addMsg({ type: 'system', text: `오늘의 기분: ${mood}` });
    setTimeout(() => {
      const reaction = score >= 3
        ? { speaker: 'luna' as const, text: '좋은 하루 보내고 있구나!' }
        : score >= 2
        ? { speaker: 'luna' as const, text: '그렇구나... 이야기해볼래?' }
        : { speaker: 'luna' as const, text: '많이 힘들구나. 옆에 있을게.' };
      addMsg({ type: 'character', ...reaction });
    }, 1500);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_profiles').select('memory_profile').eq('id', user.id).single();
    const profile = (data?.memory_profile ?? {}) as any;
    const checkins = (profile.dailyCheckins ?? []).slice(-29);
    const today = new Date().toISOString().slice(0, 10);
    checkins.push({ date: today, mood, score });
    profile.dailyCheckins = checkins;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (profile.lastVisitDate === yesterday) profile.streakDays = (profile.streakDays ?? 0) + 1;
    else if (profile.lastVisitDate !== today) profile.streakDays = 1;
    profile.lastVisitDate = today;
    setStreakDays(profile.streakDays ?? 1);
    await supabase.from('user_profiles').update({ memory_profile: profile }).eq('id', user.id);
  }, [addMsg]);

  const luna = dailyState?.luna;
  const tarot = dailyState?.tarot;

  // NPC Life Engine tick 루프 — 배치 실패 시 폴백
  useEffect(() => {
    if (!userJoined || !userName) return;
    if (batchData) return; // 배치 모드면 NPC tick 불필요

    if (!engineRef.current) {
      const baseLuna = dailyState?.luna?.mood?.positivity ?? 0.3;
      const baseTarot = dailyState?.tarot?.mood?.positivity ?? 0.1;
      engineRef.current = new NpcLifeEngine('user', userName, baseLuna, baseTarot, dailyState?.dailyEvents);
      engineRef.current.onUserVisit();
      setStoryTitle(engineRef.current.getStoryTitle());
    }

    function runTick() {
      if (!engineRef.current) return;
      const now = new Date();
      const result = engineRef.current.tick(now.getHours(), now.getMinutes());
      setLunaLive(result.luna);
      setTarotLive(result.tarot);

      if (result.messages.length > 0) {
        let delay = 0;
        for (const msg of result.messages) {
          delay += 2000 + (msg.type === 'character' ? ((msg as any).text?.length ?? 10) * 30 : 500);
          setTimeout(() => {
            if (msg.type === 'character') {
              setMessages(prev => [...prev, { type: 'typing', speaker: (msg as any).speaker }]);
              setTimeout(() => {
                setMessages(prev => [...prev.filter(m => m.type !== 'typing'), msg]);
                scrollToBottom();
              }, 1000);
            } else {
              setMessages(prev => [...prev, msg]);
            }
            scrollToBottom();
          }, delay);
        }
        setTimeout(() => {
          setMessages(prev => { saveHistory(prev, true); return prev; });
        }, delay + 2000);
      }
    }

    runTick();
    const interval = setInterval(runTick, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userJoined, userName, batchData]);

  // 정리
  useEffect(() => {
    return () => {
      activeTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <LoungeBackground>
      <div className="flex flex-col h-screen">
        {/* 헤더 */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center justify-between"
          style={{ background: isNight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)' }}>
          <div>
            <h1 className="text-[16px] font-black" style={{ color: isNight ? '#e2e8f0' : '#3d2066' }}>
              🏠 라운지
            </h1>
            {streakDays > 1 && (
              <span className="text-[10px] font-bold" style={{ color: '#f97316' }}>🔥 {streakDays}일 연속</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {luna && (
              <div className="flex items-center gap-1">
                <span className="text-[12px]">{lunaLive?.emotionEmoji ?? moodToEmoji(luna.mood)}</span>
                <span className="text-[10px] font-medium" style={{ color: '#ea580c' }}>루나</span>
                <span className="text-[9px] text-gray-400">{lunaLive?.activity ?? luna.currentActivity} {lunaLive?.emoji ?? ''}</span>
              </div>
            )}
            {tarot && (
              <div className="flex items-center gap-1">
                <span className="text-[12px]">{tarotLive?.emotionEmoji ?? moodToEmoji(tarot.mood)}</span>
                <span className="text-[10px] font-medium" style={{ color: '#7c3aed' }}>타로냥</span>
                <span className="text-[9px] text-gray-400">{tarotLive?.activity ?? tarot.currentActivity} {tarotLive?.emoji ?? ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* 메시지 영역 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 160px)' }}>
          {loading && (
            <div className="text-center py-16">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="inline-block text-2xl">🔮</motion.span>
              <p className="text-[11px] mt-2 text-gray-400">캐릭터들이 준비 중...</p>
            </div>
          )}

          {messages.map((msg, i) => {
            // 날짜 구분선
            const todayStr = new Date().toISOString().slice(0, 10);
            const msgDate = (msg as any).date ?? todayStr;
            const prevDate = i > 0 ? ((messages[i - 1] as any).date ?? todayStr) : '';
            const showDateLine = i === 0 || msgDate !== prevDate;

            // 🆕 v42: 읽지 않은 메시지 구분선
            const showUnreadLine = unreadLine >= 0 && i === unreadLine;

            return (
              <div key={i}>
                {showDateLine && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] px-3 py-1 rounded-full" style={{
                      background: isNight ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      color: isNight ? '#94a3b8' : '#9ca3af',
                    }}>
                      {new Date(msgDate + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                    </span>
                  </div>
                )}

                {showUnreadLine && (
                  <div className="flex items-center gap-2 my-3 px-2">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #ef4444, transparent)' }} />
                    <span className="text-[10px] font-bold" style={{ color: '#ef4444' }}>
                      읽지 않은 메시지
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #ef4444, transparent)' }} />
                  </div>
                )}

                <LoungeMessage message={msg} />
              </div>
            );
          })}

          <AnimatePresence>
            {showCheckIn && !checkedIn && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-2 my-3">
                <MoodCheckIn onCheckIn={handleCheckIn} characterName={persona === 'tarot' ? '타로냥' : '루나'} />
              </motion.div>
            )}
          </AnimatePresence>

          {messages.some(m => m.type === 'character' && (m as any).text?.includes('상담으로 가볼까')) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center my-3">
              <button onClick={() => router.push('/chat')}
                className="px-5 py-2 rounded-full text-white text-[12px] font-bold shadow-md"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
                💬 상담 시작하기
              </button>
            </motion.div>
          )}
        </div>

        {/* 입력창 */}
        {userJoined && (
          <div className="fixed left-0 right-0 z-30" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
            <LoungeInput onSend={handleSend} disabled={sending} />
          </div>
        )}
      </div>
    </LoungeBackground>
  );
}
