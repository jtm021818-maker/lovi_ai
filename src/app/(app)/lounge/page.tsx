'use client';

/**
 * 🏠 v44: 라운지 — "진짜 카톡 단톡방"
 *
 * v43→v44 핵심 꼼수:
 * - 🔥 Auto-Chat Cluster: 3~6개 메시지 연속 출현 (카톡 리듬)
 * - 💬 즉석 수다 엔진: 150+ 루나↔타로냥 대화쌍 (LLM 0회)
 * - 📣 확장 응답: 유저 말 → 5~7개 반응 체인 + afterChat
 * - 🔄 미래 메시지 Flush: 유저 말 후 배치 취소 → 대화 전환
 * - 👁️ 카톡 그룹핑: 연속 메시지 프로필 숨김
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LoungeBackground, { getTimeOfDay } from '@/components/lounge/LoungeBackground';
import LoungeMessage, { type LoungeMessageType } from '@/components/lounge/LoungeMessage';
import LoungeInput from '@/components/lounge/LoungeInput';
import type { CharacterDailyState } from '@/engines/lounge/daily-state-engine';
import { moodToEmoji } from '@/engines/lounge/daily-state-engine';
import type { ScheduledMessage, BatchDailyMessages } from '@/engines/lounge/batch-message-types';
import { splitByTime, buildPlaybackQueue, formatChatTime } from '@/engines/lounge/batch-message-types';
import { crossTalkToQueue, generateDefaultSchedule, getCurrentStatus } from '@/engines/lounge/conversation-player';
import { NpcLifeEngine, type CharacterLiveStatus } from '@/engines/lounge/npc-life-engine';
import {
  getRandomAmbientAction,
  getProactiveNudge,
  getMessageReaction,
  calcTypingDelay,
  getCharacterPresence,
  nextAmbientInterval,
  nudgeTimeout,
} from '@/engines/lounge/ambient-actions';
import { pickCluster, clusterToPlayback, nextClusterInterval } from '@/engines/lounge/auto-chat-cluster';
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
  const [streakDays, setStreakDays] = useState(0);
  const [userJoined, setUserJoined] = useState(false);
  const [userName, setUserName] = useState('나');
  const [lunaLive, setLunaLive] = useState<CharacterLiveStatus | null>(null);
  const [tarotLive, setTarotLive] = useState<CharacterLiveStatus | null>(null);
  const [storyTitle, setStoryTitle] = useState('');
  const engineRef = useRef<NpcLifeEngine | null>(null);
  const initRef = useRef(false);

  // 🆕 v42: 배치 관련 상태
  const [batchData, setBatchData] = useState<BatchDailyMessages | null>(null);
  const [unreadLine, setUnreadLine] = useState(-1);
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  const [isPausedByUser, setIsPausedByUser] = useState(false);

  // 🆕 v43: Ambient Life 상태
  const ambientTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nudgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const usedActionsRef = useRef<Set<string>>(new Set());
  const usedNudgesRef = useRef<Set<string>>(new Set());
  const nudgeCountRef = useRef(0);
  const lastUserActionRef = useRef(Date.now());

  // 🆕 v44: Auto-Chat Cluster 상태
  const clusterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clusterPlaybackRef = useRef<NodeJS.Timeout[]>([]);
  const usedClusterIdsRef = useRef<Set<string>>(new Set());
  const isClusterPausedRef = useRef(false);  // 유저 말할 때 일시정지
  const afterChatTimersRef = useRef<NodeJS.Timeout[]>([]);
  const [headerTyping, setHeaderTyping] = useState<'luna' | 'tarot' | null>(null);

  // Zustand 연동
  const setOnLounge = useLoungeStore(s => s.setOnLounge);
  const clearUnread = useLoungeStore(s => s.clearUnread);
  const setBatchMessages = useLoungeStore(s => s.setBatchMessages);
  const consumeQueue = useLoungeStore(s => s.consumeQueue);

  const timeOfDay = getTimeOfDay();
  const isNight = timeOfDay === 'night' || timeOfDay === 'lateNight';
  const currentHour = new Date().getHours();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  }, []);

  // 라운지 진입 시 Zustand 동기화 + 🆕 v45: 글로벌 큐 소비
  useEffect(() => {
    setOnLounge(true);
    clearUnread();

    // 🆕 v45: 라운지 밖에서 축적된 메시지를 즉시 렌더링
    const queued = consumeQueue();
    if (queued.length > 0) {
      setMessages(prev => {
        const newMsgs = queued.map(q => {
          if (q.type === 'ambient') {
            return { type: 'ambient' as const, speaker: q.speaker, text: q.text, emoji: q.emoji ?? '', timestamp: q.timestamp };
          }
          return { type: 'character' as const, speaker: q.speaker, text: q.text, timestamp: q.timestamp };
        });
        // 읽지 않은 메시지 라인 표시
        if (newMsgs.length > 0) setUnreadLine(prev.length);
        return [...prev, ...newMsgs];
      });
      scrollToBottom();
    }

    return () => setOnLounge(false);
  }, [setOnLounge, clearUnread, consumeQueue, scrollToBottom]);

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

  // ─── 🆕 v43: Enhanced Typing + Message Render ────────────

  /** 향상된 캐릭터 메시지 표시 — 글자수 비례 타이핑 + 멈칫 */
  const renderWithTyping = useCallback((
    speaker: 'luna' | 'tarot',
    text: string,
    extraProps?: Partial<LoungeMessageType>,
  ): Promise<void> => {
    return new Promise(resolve => {
      const { typingMs, hesitate } = calcTypingDelay(text);

      // 헤더에 "입력 중" 표시
      setHeaderTyping(speaker);

      // 타이핑 인디케이터 표시
      setMessages(prev => [...prev, { type: 'typing', speaker, hesitate }]);
      scrollToBottom();

      setTimeout(() => {
        setMessages(prev => {
          const clean = prev.filter(m => m.type !== 'typing');
          return [...clean, {
            type: 'character' as const,
            speaker,
            text,
            ...extraProps,
          } as LoungeMessageType];
        });
        setHeaderTyping(null);
        scrollToBottom();
        resolve();
      }, typingMs);
    });
  }, [scrollToBottom]);

  // ─── v42: 배치 메시지 → 화면에 표시 ──────────────

  const renderBatchMessage = useCallback((msg: ScheduledMessage) => {
    if (msg.type === 'system') {
      addMsg({ type: 'system', text: msg.text });
    } else if (msg.type === 'action') {
      addMsg({ type: 'action', speaker: msg.speaker ?? 'luna', text: msg.text });
    } else {
      // 🆕 v43: 향상된 타이핑으로 캐릭터 메시지 표시
      renderWithTyping(msg.speaker ?? 'luna', msg.text, {
        timestamp: formatChatTime(msg.hour, msg.minute),
      } as any);
    }
  }, [addMsg, renderWithTyping]);

  // 미래 메시지 예약
  const scheduleFutureMessages = useCallback((futureMessages: ScheduledMessage[]) => {
    activeTimersRef.current.forEach(t => clearTimeout(t));
    activeTimersRef.current = [];

    const queue = buildPlaybackQueue(futureMessages);

    for (const item of queue) {
      const timer = setTimeout(() => {
        if (isPausedByUser) return;
        renderBatchMessage(item.message);
        setMessages(prev => { saveHistory(prev, true); return prev; });
      }, item.delayMs);
      activeTimersRef.current.push(timer);
    }
  }, [renderBatchMessage, saveHistory, isPausedByUser]);

  // ─── 🆕 v43: Ambient Life 루프 ────────────────────────

  const startAmbientLoop = useCallback(() => {
    if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);

    function scheduleNext() {
      ambientTimerRef.current = setTimeout(() => {
        // 유저가 최근에 활동했으면 스킵 (10초 이내)
        if (Date.now() - lastUserActionRef.current < 10000) {
          scheduleNext();
          return;
        }
        // 🆕 v44: 클러스터 재생 중이면 ambient 스킵
        if (isClusterPausedRef.current) {
          scheduleNext();
          return;
        }

        const action = getRandomAmbientAction(usedActionsRef.current);
        if (action) {
          setMessages(prev => [...prev, {
            type: 'ambient' as const,
            speaker: action.speaker,
            text: action.text,
            emoji: action.emoji,
          }]);
          scrollToBottom();
        }

        scheduleNext();
      }, nextAmbientInterval());
    }

    scheduleNext();
  }, [scrollToBottom]);

  // ─── 🆕 v44: Auto-Chat Cluster 루프 ──────────────────

  const startClusterLoop = useCallback(() => {
    if (clusterTimerRef.current) clearTimeout(clusterTimerRef.current);

    function scheduleNextCluster() {
      clusterTimerRef.current = setTimeout(() => {
        // 유저가 최근에 활동했으면 스킵 (20초 이내)
        if (Date.now() - lastUserActionRef.current < 20000) {
          scheduleNextCluster();
          return;
        }
        // 클러스터 일시정지 상태면 스킵
        if (isClusterPausedRef.current) {
          scheduleNextCluster();
          return;
        }

        const cluster = pickCluster(usedClusterIdsRef.current, userName);
        if (!cluster) {
          scheduleNextCluster();
          return;
        }

        const playback = clusterToPlayback(cluster);

        // 클러스터 재생: 각 라인을 타이핑 인디케이터 → 메시지 순서로
        for (const item of playback) {
          const timer = setTimeout(() => {
            renderWithTyping(item.speaker, item.text, {
              isConsecutive: false, // 그룹핑은 아래 render에서 처리
            } as any);
          }, item.delayMs);
          clusterPlaybackRef.current.push(timer);
        }

        // 클러스터 끝나면 히스토리 저장 + 다음 클러스터 예약
        const lastDelay = playback.length > 0 ? playback[playback.length - 1].delayMs : 0;
        const saveTimer = setTimeout(() => {
          setMessages(prev => { saveHistory(prev, true); return prev; });
          scheduleNextCluster();
        }, lastDelay + 3000);
        clusterPlaybackRef.current.push(saveTimer);
      }, nextClusterInterval());
    }

    // 첫 클러스터는 5초 후 즉시! — 입장하자마자 활발한 느낌
    clusterTimerRef.current = setTimeout(() => {
      const cluster = pickCluster(usedClusterIdsRef.current, userName);
      if (cluster) {
        const playback = clusterToPlayback(cluster);
        for (const item of playback) {
          const timer = setTimeout(() => {
            renderWithTyping(item.speaker, item.text);
          }, item.delayMs);
          clusterPlaybackRef.current.push(timer);
        }
        const lastDelay = playback.length > 0 ? playback[playback.length - 1].delayMs : 0;
        const saveTimer = setTimeout(() => {
          setMessages(prev => { saveHistory(prev, true); return prev; });
          scheduleNextCluster();
        }, lastDelay + 3000);
        clusterPlaybackRef.current.push(saveTimer);
      } else {
        scheduleNextCluster();
      }
    }, 5000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, renderWithTyping, saveHistory]);

  // ─── 🆕 v43: Proactive Nudge 루프 ────────────────────

  const resetNudgeTimer = useCallback(() => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);

    // 세션 당 최대 3회
    if (nudgeCountRef.current >= 3) return;

    nudgeTimerRef.current = setTimeout(() => {
      const inactiveMs = Date.now() - lastUserActionRef.current;
      if (inactiveMs < 60000) { // 🆕 v44: 1분 미만이면 다시 대기
        resetNudgeTimer();
        return;
      }

      const nudge = getProactiveNudge(usedNudgesRef.current);
      if (nudge) {
        nudgeCountRef.current++;
        renderWithTyping(nudge.speaker, nudge.text).then(() => {
          setMessages(prev => { saveHistory(prev, true); return prev; });
        });
      }

      resetNudgeTimer();
    }, nudgeTimeout());
  }, [renderWithTyping, saveHistory]);

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
        setStreakDays(data.streakDays);
        if (data.nickname) setUserName(data.nickname);

        const state = data.state as CharacterDailyState;
        const existingHistory: any[] = data.todayHistory ?? [];
        const batch = state.batchMessages as BatchDailyMessages | undefined;

        // 🆕 v42: 배치 메시지가 있으면 배치 모드!
        if (batch?.messages?.length && batch.messages.length > 5) {
          setBatchData(batch);
          setBatchMessages(batch.messages);

          const { past, future } = splitByTime(batch.messages);

          // 기존 히스토리가 있으면 복원
          if (existingHistory.length > 0) {
            const restored: LoungeMessageType[] = existingHistory.map((m: any) => {
              if (m.type === 'system') return { type: 'system', text: m.text };
              if (m.type === 'user') return { type: 'user', text: m.text };
              if (m.type === 'action') return { type: 'action', speaker: m.speaker, text: m.text };
              if (m.type === 'ambient') return { type: 'ambient', speaker: m.speaker, text: m.text, emoji: '' };
              return { type: 'character', speaker: m.speaker, text: m.text };
            });

            const historyTexts = new Set(restored.filter(m => m.type === 'character').map(m => (m as any).text));
            const newPast = past.filter(m => m.type === 'character' && !historyTexts.has(m.text));

            if (newPast.length > 0) {
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

            const lastFewTexts = existingHistory.slice(-3).map((m: any) => m.text ?? '');
            const alreadyGreeted = lastFewTexts.some((t: string) => t.includes('돌아왔어요'));
            if (!alreadyGreeted) {
              setTimeout(() => {
                setMessages(prev => [...prev, { type: 'system', text: `${data.nickname ?? '나'}님이 돌아왔어요` }]);
                scrollToBottom();
              }, 500);
            }
          } else {
            // 첫 입장: 과거 메시지 한꺼번에 보여주기
            const initialMsgs: LoungeMessageType[] = [];

            if (past.length > 0) {
              setUnreadLine(0);

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

            initialMsgs.push({ type: 'system', text: `${data.nickname ?? '나'}님이 들어왔어요` });

            if (batch.proactiveGreeting) {
              initialMsgs.push({
                type: 'character' as const,
                speaker: data.persona === 'tarot' ? 'tarot' : 'luna',
                text: batch.proactiveGreeting,
              });
            }

            setMessages(initialMsgs);
            setUserJoined(true);
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
            if (m.type === 'ambient') return { type: 'ambient', speaker: m.speaker, text: m.text, emoji: '' };
            return { type: 'character', speaker: m.speaker, text: m.text };
          });
          setMessages(restored);
          setUserJoined(true);

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
                renderWithTyping(speaker, greeting).then(() => {
                  setMessages(prev => { saveHistory(prev, true); return prev; });
                });
              }, 1000);
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
                renderWithTyping(speaker, onJoin).then(() => {
                  setMessages(prev => { saveHistory(prev, true); return prev; });
                });
              }, 1000);
            } else {
              setMessages(prev => { saveHistory(prev, true); return prev; });
            }
          }, totalDelay);
        } else {
          setUserJoined(true);
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

  // ─── 🆕 v44: Ambient + Nudge + Cluster 루프 시작 ─────

  useEffect(() => {
    if (!userJoined) return;

    // Ambient 행동 루프 시작
    startAmbientLoop();
    // Nudge 타이머 시작
    resetNudgeTimer();
    // 🆕 v44: Auto-Chat Cluster 루프 시작
    startClusterLoop();

    return () => {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      if (clusterTimerRef.current) clearTimeout(clusterTimerRef.current);
      clusterPlaybackRef.current.forEach(t => clearTimeout(t));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userJoined]);

  // 🆕 v44: 유저 메시지 전송 + 리액션 + 확장 응답 + 미래 flush
  const handleSend = useCallback(async (text: string) => {
    lastUserActionRef.current = Date.now();
    resetNudgeTimer();

    // 🆕 v44: 클러스터/배치 일시정지 + 진행 중 타이머 취소
    isClusterPausedRef.current = true;
    clusterPlaybackRef.current.forEach(t => clearTimeout(t));
    clusterPlaybackRef.current = [];
    afterChatTimersRef.current.forEach(t => clearTimeout(t));
    afterChatTimersRef.current = [];
    // 🆕 v44: 미래 배치 메시지 flush (꼼수 4)
    activeTimersRef.current.forEach(t => clearTimeout(t));
    activeTimersRef.current = [];

    addMsg({ type: 'user', text });
    setSending(true);
    setIsPausedByUser(true);

    // 리액션 이모지 생성 → 1~3초 뒤 표시
    const reaction = getMessageReaction(text);
    if (reaction) {
      setTimeout(() => {
        setMessages(prev => prev.map((m) => {
          if (m.type === 'user' && !('reaction' in m && (m as any).reaction) && (m as any).text === text) {
            return { ...m, reaction: reaction.emoji, reactionSpeaker: reaction.speaker } as LoungeMessageType;
          }
          return m;
        }));
      }, 1000 + Math.random() * 2000);
    }

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

      // 직접 반응 재생 (responses)
      for (const resp of data.responses ?? []) {
        await new Promise<void>(resolve => {
          setTimeout(() => {
            renderWithTyping(resp.speaker, resp.text).then(() => {
              setMessages(prev => { saveHistory(prev, true); return prev; });
              resolve();
            });
          }, (resp.delay ?? 1) * 1000);
        });
      }

      // 🆕 v44: 후속 수다 재생 (afterChat) — 루나↔타로냥 자체 대화
      const afterChat = data.afterChat ?? [];
      if (afterChat.length > 0) {
        for (const ac of afterChat) {
          const timer = setTimeout(() => {
            renderWithTyping(ac.speaker, ac.text).then(() => {
              setMessages(prev => { saveHistory(prev, true); return prev; });
            });
          }, (ac.delay ?? 8) * 1000);
          afterChatTimersRef.current.push(timer);
        }
      }

      if (data.shouldSuggestCounseling) {
        setTimeout(() => {
          renderWithTyping('luna', '음... 이건 좀 더 이야기해봐야 할 것 같은데. 상담으로 가볼까?');
        }, 2000);
      }

      // 🆕 v44: afterChat 다 끝나면 배치/클러스터 재개 (10분 후)
      const lastAfterChatDelay = afterChat.length > 0
        ? Math.max(...afterChat.map((ac: any) => (ac.delay ?? 8) * 1000))
        : 5000;
      setTimeout(() => {
        isClusterPausedRef.current = false;
        setIsPausedByUser(false);
        // 배치 메시지 재개 (현재 시점부터 남은 미래 메시지만)
        if (batchData?.messages?.length) {
          const { future } = splitByTime(batchData.messages);
          scheduleFutureMessages(future);
        }
      }, lastAfterChatDelay + 5000); // afterChat 끝 + 5초 후 빠른 재개

    } catch (e) {
      addMsg({ type: 'character', speaker: 'luna', text: '앗, 잠깐 연결이 끊겼어. 다시 말해줄래?' });
    } finally {
      setSending(false);
    }
  }, [messages, addMsg, scrollToBottom, saveHistory, renderWithTyping, resetNudgeTimer, batchData, scheduleFutureMessages]);

  // 기분 체크인 제거됨 (v47)

  const luna = dailyState?.luna;
  const tarot = dailyState?.tarot;

  // 🆕 v43: Live presence 계산
  const lunaPresence = getCharacterPresence('luna');
  const tarotPresence = getCharacterPresence('tarot');

  // NPC Life Engine tick 루프 — 배치 실패 시 폴백
  useEffect(() => {
    if (!userJoined || !userName) return;
    if (batchData) return;

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
              renderWithTyping((msg as any).speaker, (msg as any).text);
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
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      if (clusterTimerRef.current) clearTimeout(clusterTimerRef.current);
      clusterPlaybackRef.current.forEach(t => clearTimeout(t));
      afterChatTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <LoungeBackground>
      <div className="flex flex-col h-screen">
        {/* 🆕 v43: LIVE 헤더 */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center justify-between"
          style={{ background: isNight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)' }}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-black" style={{ color: isNight ? '#e2e8f0' : '#3d2066' }}>
                🏠 라운지
              </h1>
              {/* 참여 인원 */}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: isNight ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: isNight ? '#94a3b8' : '#9ca3af',
                }}>
                👥 3
              </span>
            </div>
            {streakDays > 1 && (
              <span className="text-[10px] font-bold" style={{ color: '#f97316' }}>🔥 {streakDays}일 연속</span>
            )}
            {/* 🆕 v43: 헤더 타이핑 상태 */}
            <AnimatePresence>
              {headerTyping && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-[10px]"
                  style={{ color: CHAR_COLORS[headerTyping] }}
                >
                  {headerTyping === 'luna' ? '루나' : '타로냥'}가 입력 중...
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* 캐릭터 상태 — 🆕 온라인 dot 추가 */}
          <div className="flex flex-col gap-1.5">
            {luna && (
              <div className="flex items-center gap-1.5">
                {/* 온라인 dot */}
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: lunaPresence.isOnline ? '#22c55e' : '#94a3b8' }}
                  animate={lunaPresence.isOnline ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[12px]">{lunaLive?.emotionEmoji ?? moodToEmoji(luna.mood)}</span>
                <span className="text-[10px] font-medium" style={{ color: '#ea580c' }}>루나</span>
                <span className="text-[9px]" style={{ color: isNight ? '#94a3b8' : '#9ca3af' }}>
                  {lunaPresence.isSleeping ? '💤 zzz' : (lunaLive?.activity ?? lunaPresence.statusText)}
                </span>
              </div>
            )}
            {tarot && (
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: tarotPresence.isOnline ? '#22c55e' : '#94a3b8' }}
                  animate={tarotPresence.isOnline ? { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] } : {}}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <span className="text-[12px]">{tarotLive?.emotionEmoji ?? moodToEmoji(tarot.mood)}</span>
                <span className="text-[10px] font-medium" style={{ color: '#7c3aed' }}>타로냥</span>
                <span className="text-[9px]" style={{ color: isNight ? '#94a3b8' : '#9ca3af' }}>
                  {tarotPresence.isSleeping ? '💤 zzz' : (tarotLive?.activity ?? tarotPresence.statusText)}
                </span>
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
            const todayStr = new Date().toISOString().slice(0, 10);
            const msgDate = (msg as any).date ?? todayStr;
            const prevDate = i > 0 ? ((messages[i - 1] as any).date ?? todayStr) : null;
            // 🆕 v45: 첫 메시지이거나 날짜가 바뀔 때만 구분선
            const showDateLine = i === 0 || (prevDate !== null && msgDate !== prevDate);

            const showUnreadLine = unreadLine >= 0 && i === unreadLine;

            // 🆕 v44: 카톡 그룹핑 — 같은 speaker 연속이면 프로필 숨김
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const isConsecutive =
              msg.type === 'character' &&
              prevMsg?.type === 'character' &&
              (msg as any).speaker === (prevMsg as any).speaker;

            // 그룹핑된 메시지 객체 생성
            const displayMsg = isConsecutive
              ? { ...msg, isConsecutive: true } as LoungeMessageType
              : msg;

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

                <LoungeMessage message={displayMsg} />
              </div>
            );
          })}

          {/* v47: MoodCheckIn 삭제 */}

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

// 헤더 타이핑 색상
const CHAR_COLORS: Record<string, string> = {
  luna: '#ea580c',
  tarot: '#7c3aed',
};
