'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LoungeBackground, { getTimeOfDay } from '@/components/lounge/LoungeBackground';
import LoungeMessage, { type LoungeMessageType } from '@/components/lounge/LoungeMessage';
import LoungeInput from '@/components/lounge/LoungeInput';
import MoodCheckIn from '@/components/lounge/MoodCheckIn';
import type { CharacterDailyState } from '@/engines/lounge/daily-state-engine';
import { moodToEmoji } from '@/engines/lounge/daily-state-engine';
import { crossTalkToQueue, generateDefaultSchedule, getCurrentStatus } from '@/engines/lounge/conversation-player';
import { NpcLifeEngine, type CharacterLiveStatus } from '@/engines/lounge/npc-life-engine';
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
  const initRef = useRef(false); // 초기화 중복 방지

  const timeOfDay = getTimeOfDay();
  const isNight = timeOfDay === 'night' || timeOfDay === 'lateNight';
  const currentHour = new Date().getHours();

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
      const serializable = msgs
        .filter(m => m.type !== 'typing')
        .map(m => ({ type: m.type, speaker: (m as any).speaker, text: (m as any).text }));
      fetch('/api/lounge/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: serializable, crossTalkPlayed: played }),
      }).catch(() => {});
    }, 2000);
  }, []);

  // 초기화
  useEffect(() => {
    if (initRef.current) return; // 중복 실행 방지
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
        const alreadyPlayed = data.crossTalkPlayed ?? false;

        // 이전 히스토리가 있으면 복원
        if (existingHistory.length > 0) {
          const restored: LoungeMessageType[] = existingHistory.map((m: any) => {
            if (m.type === 'system') return { type: 'system', text: m.text };
            if (m.type === 'user') return { type: 'user', text: m.text };
            if (m.type === 'action') return { type: 'action', speaker: m.speaker, text: m.text };
            return { type: 'character', speaker: m.speaker, text: m.text };
          });
          setMessages(restored);
          setUserJoined(true); // 이전에 이미 합류했음

          // 체크인 안 했으면 표시
          if (!data.todayCheckedIn) setShowCheckIn(true);

          // 재입장 시 캐릭터 반응 (이전 대화 기반)
          const lastUserMsg = restored.filter(m => m.type === 'user').slice(-1)[0];

          setTimeout(() => {
            // 상담 안 했으면 물어보기, 했으면 환영
            const greeting = lastUserMsg
              ? `다시 왔구나! 아까 이야기 이어서 할까?`
              : (data.totalSessions > 0
                ? `또 왔네! 상담은 안 해봤어? 궁금한 거 있으면 말해~`
                : `다시 왔구나! 편하게 있어~`);

            const speaker = data.persona === 'tarot' ? 'tarot' as const : 'luna' as const;
            setMessages(prev => [...prev, { type: 'system', text: `${userName}님이 돌아왔어요` }]);
            setTimeout(() => {
              setMessages(prev => [...prev, { type: 'character', speaker, text: greeting }]);
              scrollToBottom();
            }, 1500);
          }, 500);

          setLoading(false);
          return;
        }

        // 첫 입장: 외출 상태 + crossTalk 재생
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

        // crossTalk 재생 (아직 안 했으면만)
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

          // crossTalk 끝 → 유저 합류
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
                    return [...clean, { type: 'character', speaker, text: onJoin }];
                  });
                  scrollToBottom();
                  if (!data.todayCheckedIn) setTimeout(() => setShowCheckIn(true), 1500);
                  // 히스토리 저장 (crossTalk 포함)
                  setMessages(prev => { saveHistory(prev, true); return prev; });
                }, 1200);
              }, 1000);
            } else {
              if (!data.todayCheckedIn) setTimeout(() => setShowCheckIn(true), 1000);
              setMessages(prev => { saveHistory(prev, true); return prev; });
            }
          }, totalDelay);
        } else {
          // crossTalk 이미 재생됨 → 바로 합류
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

    const recentChat = messages
      .filter(m => m.type === 'character' || m.type === 'user')
      .slice(-6)
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

  // NPC Life Engine tick 루프 (60초마다)
  useEffect(() => {
    if (!userJoined || !userName) return;

    // 엔진 초기화 (1회)
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
        // 메시지를 시간차로 추가 (살아있는 느낌)
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
        // 히스토리 저장
        setTimeout(() => {
          setMessages(prev => { saveHistory(prev, true); return prev; });
        }, delay + 2000);
      }
    }

    // 즉시 1회 실행 + 60초마다
    runTick();
    const interval = setInterval(runTick, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userJoined, userName]);

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
          {messages.map((msg, i) => <LoungeMessage key={i} message={msg} />)}

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

        {/* 입력창 — 네비 바 바로 위 고정 */}
        {userJoined && (
          <div className="fixed left-0 right-0 z-30" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
            <LoungeInput onSend={handleSend} disabled={sending} />
          </div>
        )}
      </div>
    </LoungeBackground>
  );
}
