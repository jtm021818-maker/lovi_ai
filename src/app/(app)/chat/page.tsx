'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionCard, SessionPreviewV2 } from '@/components/chat-list/SessionCard';
import { DateGroup } from '@/components/chat-list/DateGroup';
import { EmptyState } from '@/components/chat-list/EmptyState';
import { SessionFilters, FilterType } from '@/components/chat-list/SessionFilters';

export default function ChatListPage() {
  const [sessions, setSessions] = useState<SessionPreviewV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
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
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '새로운 상담' }),
    });
    const session = await res.json();
    router.push(`/chat/${session.id}`);
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('이 상담 내역을 보관함으로 이동할까요?')) return;
    
    // Optimistic UI update
    setSessions(prev => prev.filter(s => s.id !== id));
    
    await fetch(`/api/sessions/${id}/archive`, { method: 'PATCH' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '새벽에도 깨어계시네요 🌙';
    if (hour < 12) return '좋은 아침이에요 ☀️';
    if (hour < 18) return '오후에도 힘내세요 ☕';
    return '오늘 하루도 수고많았어요 💜';
  };

  // 1. 필터링된 세션
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (filter === 'ACTIVE') return session.status !== 'completed';
      if (filter === 'COMPLETED') return session.status === 'completed';
      return true; // ALL
    });
  }, [sessions, filter]);

  // 2. 날짜별 그루핑
  const groupedSessions = useMemo(() => {
    const groups: { label: string; items: SessionPreviewV2[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const groupMap = {
      today: [] as SessionPreviewV2[],
      yesterday: [] as SessionPreviewV2[],
      thisWeek: [] as SessionPreviewV2[],
      older: [] as SessionPreviewV2[],
    };

    filteredSessions.forEach(session => {
      const date = new Date(session.last_message_at || session.created_at);
      if (date >= today) groupMap.today.push(session);
      else if (date >= yesterday) groupMap.yesterday.push(session);
      else if (date >= thisWeek) groupMap.thisWeek.push(session);
      else groupMap.older.push(session);
    });

    if (groupMap.today.length > 0) groups.push({ label: '오늘', items: groupMap.today });
    if (groupMap.yesterday.length > 0) groups.push({ label: '어제', items: groupMap.yesterday });
    if (groupMap.thisWeek.length > 0) groups.push({ label: '이번 주', items: groupMap.thisWeek });
    if (groupMap.older.length > 0) groups.push({ label: '이전', items: groupMap.older });

    return groups;
  }, [filteredSessions]);

  // 3. 통계 (헤더 표시용)
  const stats = useMemo(() => {
    let completedCount = 0;
    let emotionGrowth = 0;
    sessions.forEach(s => {
      if (s.status === 'completed') completedCount++;
      if (s.emotion_start != null && s.emotion_end != null && s.emotion_end > s.emotion_start) {
        emotionGrowth += (s.emotion_end - s.emotion_start);
      }
    });
    return { completedCount, emotionGrowth };
  }, [sessions]);

  const filterCounts = useMemo(() => {
    return {
      ALL: sessions.length,
      ACTIVE: sessions.filter(s => s.status !== 'completed').length,
      COMPLETED: sessions.filter(s => s.status === 'completed').length,
    };
  }, [sessions]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative min-h-screen">
      {/* 프리미엄 헤더 영역 */}
      <div className="pt-16 pb-8 px-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-b-[40px] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-2xl -mr-10 -mt-10" />
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 tracking-tight leading-tight mb-2">
          {getGreeting()}
        </h1>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-gray-500 font-medium text-sm">
            상담 완료 <span className="text-pink-600 font-bold">{stats.completedCount}건</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 font-medium text-sm flex items-center gap-1">
            긍정 변화 <span className="text-green-500 font-bold">+{stats.emotionGrowth}점</span>
          </span>
        </div>

        {/* 퀵 액션 카드 */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={createSession}
          className="w-full bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center shadow-md shadow-pink-200 group-hover:shadow-pink-300 transform group-hover:scale-105 transition-all">
                <span className="text-2xl text-white">✨</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">새 상담 시작</h3>
                <p className="text-xs text-gray-400 mt-1">지금의 감정을 솔직하게 말해주세요</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
              <span className="text-pink-500 font-bold">→</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 세션 리스트 및 필터 */}
      <div className="flex-1 px-5 mt-6 pb-32">
        <SessionFilters 
          currentFilter={filter} 
          onFilterChange={setFilter} 
          counts={filterCounts} 
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState onStart={createSession} />
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            조건에 맞는 상담 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {groupedSessions.map((group, gIdx) => (
                <motion.div 
                  key={group.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: gIdx * 0.1 }}
                >
                  <DateGroup label={group.label} />
                  <div className="space-y-3">
                    {group.items.map((session, i) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (gIdx * 0.1) + (i * 0.05) }}
                      >
                        <SessionCard 
                          session={session} 
                          onClick={() => router.push(`/chat/${session.id}`)}
                          onArchive={(e) => handleArchive(e, session.id)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 하단 고정 플로팅 버튼 */}
      <motion.button
        onClick={createSession}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-24 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3.5 rounded-full shadow-xl shadow-pink-300/40 hover:shadow-pink-400/50 transition-shadow"
      >
        <span className="text-lg">✨</span>
        <span className="font-bold text-sm">새 상담 시작</span>
      </motion.button>
    </div>
  );
}
