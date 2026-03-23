'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const SITUATIONS = [
  { id: 'breakup', emoji: '💔', label: '이별/이별 후', desc: '헤어짐의 아픔을 겪고 있어요' },
  { id: 'crush', emoji: '💗', label: '썸/짝사랑', desc: '설레면서도 불안한 마음이에요' },
  { id: 'relationship', emoji: '💑', label: '연애 중', desc: '연애 중 고민이 있어요' },
  { id: 'confused', emoji: '🤔', label: '헷갈리는 관계', desc: '관계가 어디로 가는지 모르겠어요' },
  { id: 'free', emoji: '💬', label: '자유롭게 이야기', desc: '특별한 주제 없이 편하게' },
];

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  /** 시작하기 버튼 → 닉네임 확인 후 다음 단계 */
  const handleStart = async () => {
    setIsLoading(true);
    // 이미 미들웨어를 통해 인증된 상태이므로 바로 다음 단계로 이동
    setTimeout(() => {
      setIsLoading(false);
      setStep(1);
    }, 400);
  };

  const handleSituationSelect = async (situationId: string) => {
    try {
      const onboardingRes = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname || '익명', situation: situationId }),
      });

      if (!onboardingRes.ok) {
        console.error('온보딩 API 에러:', onboardingRes.status);
      }

      // 닉네임 + 온보딩 상태 저장 후 바로 /chat 으로 이동하도록 개선 (빈 상태에서 시작)
      router.push('/chat');
    } catch {
      router.push('/chat');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50 flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center w-full max-w-sm"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center mx-auto mb-8 shadow-xl"
            >
              <span className="text-4xl text-white font-bold">😊</span>
            </motion.div>

            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              가입을 환영해요!
            </h1>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              마음이와 대화할 때 사용할<br/>
              편한 닉네임을 알려주세요.
            </p>

            <div className="space-y-3 mb-6">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 알려주세요 (선택)"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-pink-200 text-sm focus:outline-none focus:border-pink-400 text-center placeholder-gray-400"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              disabled={isLoading}
              className={`w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-semibold shadow-lg hover:shadow-xl transition-shadow ${isLoading ? 'opacity-70' : ''}`}
            >
              {isLoading ? '준비 중...' : '시작하기'}
            </motion.button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="situation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm"
          >
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
              어떤 이야기를 하고 싶으세요?
            </h2>
            <p className="text-sm text-gray-400 text-center mb-6">
              가볍게 골라주세요. 언제든 바꿀 수 있어요.
            </p>

            <div className="space-y-3">
              {SITUATIONS.map((sit, i) => (
                <motion.button
                  key={sit.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSituationSelect(sit.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-pink-100 hover:border-pink-300 hover:shadow-md transition-all text-left"
                >
                  <span className="text-2xl">{sit.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{sit.label}</p>
                    <p className="text-xs text-gray-400">{sit.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
