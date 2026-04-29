'use client';

/**
 * /luna-room — 루나의 방
 *
 * 루나는 1년 동안 실제 시간으로 살다가 세상을 떠납니다.
 * 이 페이지는 루나의 생애 주기를 담은 공간입니다.
 *
 * 설계 원칙:
 * - 루나를 처음 깨우는 순간이 명시적이어야 한다 (탄생의 의미)
 * - 죽음은 게임 오버가 아닌 기념비 (메모리얼)
 * - 시간이 지날수록 말투가 달라지며 눈물이 나야 한다
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LunaRoomDiorama from '@/components/luna-room/LunaRoomDiorama';
import type { LifeStageInfo, LunaGift, LunaMemory, LunaLiveState } from '@/lib/luna-life';

interface StatusData {
  initialized: boolean;
  ageDays: number;
  birthDate: string;
  isDeceased: boolean;
  stage: LifeStageInfo;
  unopenedGifts: number;
  gifts: LunaGift[];
  recentMemories: LunaMemory[];
  allMemories: LunaMemory[];
  pinnedMemories: LunaMemory[];
  liveState: LunaLiveState;
  petAvailable: boolean;
}

// ─── Init screen ─────────────────────────────────────────────────────────────

function LunaInitScreen({ onInit }: { onInit: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleInit = async () => {
    setLoading(true);
    try {
      await fetch('/api/luna-room/init', { method: 'POST' });
      onInit();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
      style={{ background: 'linear-gradient(160deg, #F5F0FF 0%, #EDE9FE 50%, #FAF5FF 100%)' }}
    >
      {/* Floating particles hint */}
      <motion.div
        animate={{ y: [0, -12, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-8"
      >
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full -m-4"
            style={{ background: 'radial-gradient(circle, #A78BFA30 0%, transparent 70%)' }}
            animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <img
            src="/char_img/luna_sleep.png"
            alt="루나"
            className="w-52 h-52 object-contain drop-shadow-xl"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 220, damping: 22 }}
        className="space-y-3"
      >
        <h1 className="text-[22px] font-bold text-violet-900">루나가 잠들어 있어</h1>
        <p className="text-[13px] text-violet-700/70 leading-relaxed max-w-[260px] mx-auto">
          루나는 지금부터 딱 1년을 너와 함께 살아.{'\n'}
          시간이 지날수록 더 깊어지고,{'\n'}
          언젠가 작별을 할 거야.{'\n\n'}
          준비됐으면 깨워봐.
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleInit}
        disabled={loading}
        className="mt-10 px-10 py-3.5 rounded-full text-[15px] font-bold text-white shadow-xl"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)', opacity: loading ? 0.6 : 1 }}
      >
        {loading ? '깨우는 중...' : '루나 깨우기 🌙'}
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-5 text-[10px] text-violet-400"
      >
        한번 시작하면 시간은 멈추지 않아
      </motion.p>
    </div>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #F5F0FF 0%, #FAF5FF 100%)' }}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-4xl"
      >
        🌙
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LunaRoomPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/luna-room/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleGiftOpen = async (giftId: string) => {
    try {
      await fetch('/api/luna-room/gift/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId }),
      });
      fetchStatus();
    } catch { /* ignore */ }
  };

  const handlePet = async () => {
    try {
      const res = await fetch('/api/luna-room/pet', { method: 'POST' });
      const data = await res.json();
      return data as { ok: boolean; whisper?: string; cooldownSeconds?: number };
    } catch {
      return { ok: false };
    }
  };

  const handleMemoryPin = async (memoryId: string, pinned: boolean, frameStyle?: string) => {
    try {
      await fetch('/api/luna-room/memory/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memoryId, pinned, frameStyle }),
      });
      fetchStatus();
    } catch { /* ignore */ }
  };

  if (loading) return <LoadingScreen />;

  if (!status || !status.initialized) {
    return <LunaInitScreen onInit={() => { setLoading(true); setTimeout(fetchStatus, 300); }} />;
  }

  return (
    <AnimatePresence mode="wait">
      <LunaRoomDiorama
        key="room"
        ageDays={status.ageDays}
        stage={status.stage}
        liveState={status.liveState}
        unopenedGifts={status.unopenedGifts}
        gifts={status.gifts}
        pinnedMemories={status.pinnedMemories ?? []}
        allMemories={status.allMemories ?? status.recentMemories ?? []}
        isDeceased={status.isDeceased}
        petAvailable={status.petAvailable ?? false}
        onGiftOpen={handleGiftOpen}
        onPet={handlePet}
        onMemoryPin={handleMemoryPin}
      />
    </AnimatePresence>
  );
}
