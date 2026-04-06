'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { XRayResult } from '@/app/api/xray/analyze/route';

interface SimMessage {
  id: string;
  sender: 'user' | 'partner';
  content: string;
}

export default function SimulatePage() {
  const router = useRouter();
  const [xrayResult, setXrayResult] = useState<XRayResult | null>(null);
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(50);
  const scrollRef = useRef<HTMLDivElement>(null);

  // sessionStorage에서 엑스레이 결과 로드
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('xray-result');
      if (saved) {
        const result: XRayResult = JSON.parse(saved);
        setXrayResult(result);
        setScore(result.reconciliationScore);
        // 초기 메시지: 상대방의 마지막 메시지
        const lastOther = [...result.messages].reverse().find(m => m.sender === 'other');
        if (lastOther) {
          setMessages([{
            id: 'init',
            sender: 'partner',
            content: lastOther.text,
          }]);
        }
      }
    } catch {}
  }, []);

  // 자동 스크롤
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !xrayResult) return;

    const userMsg: SimMessage = { id: crypto.randomUUID(), sender: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Gemini로 상대방 반응 생성
      const context = xrayResult.messages.map(m =>
        `${m.sender === 'me' ? '나' : '상대'}: ${m.text} (감정: ${m.deepEmotion})`
      ).join('\n');

      const res = await fetch('/api/xray/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          userMessage: userMsg.content,
          history: messages.map(m => `${m.sender === 'user' ? '나' : '상대'}: ${m.content}`).join('\n'),
          currentScore: score,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          sender: 'partner',
          content: data.response,
        }]);
        setScore(data.newScore);
      }
    } catch (err) {
      console.error('[Simulate] 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [input, loading, xrayResult, messages, score]);

  const scoreColor = score >= 70 ? 'bg-green-400' : score >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  const scoreText = score >= 70 ? '좋은 방향이야! 🎉' : score >= 40 ? '조금 더 노력해보자 💪' : '조심스럽게 접근해봐 🤔';

  if (!xrayResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-50/30">
        <div className="text-center">
          <p className="text-gray-500 mb-3">분석 결과가 없어요</p>
          <button onClick={() => router.push('/xray')} className="text-pink-500 font-bold text-sm">
            엑스레이 하러 가기 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-indigo-50/50 via-white to-pink-50/30">
      {/* 헤더 + 점수 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-purple-100 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => router.back()} className="text-gray-400 text-sm">← 돌아가기</button>
          <span className="text-xs font-bold text-purple-700">🎭 대응 연습 모드</span>
          <span className="text-sm font-black" style={{ color: score >= 70 ? '#16a34a' : score >= 40 ? '#ca8a04' : '#ef4444' }}>
            {score}%
          </span>
        </div>
        {/* 점수 바 */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${scoreColor}`}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">{scoreText}</p>
      </div>

      {/* 채팅 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* 안내 */}
        <div className="text-center py-3">
          <p className="text-xs text-purple-400 bg-purple-50 rounded-full inline-block px-4 py-1.5">
            상대방에게 뭐라고 보낼지 연습해봐! 루나가 상대방 역할 해줄게 🦊
          </p>
        </div>

        {messages.map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'partner' && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 flex-shrink-0 text-sm">
                😐
              </div>
            )}
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-[#FEE500] text-gray-900 rounded-tr-sm'
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 text-sm">😐</div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="flex space-x-1.5">
                {[0, 0.15, 0.3].map((d, i) => (
                  <motion.div key={i} animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: d }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 입력 */}
      <div className="bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="상대방에게 뭐라고 보낼까?"
            disabled={loading}
            className="flex-1 bg-gray-50 rounded-full px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 border border-gray-100"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
