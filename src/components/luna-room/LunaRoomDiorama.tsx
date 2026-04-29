'use client';

/**
 * LunaRoomDiorama — Luna Room v100 master view.
 * 단일 디오라마(창문 + 가구 + 루나) + 모달 3종(편지/추억/채팅).
 * 기존 LunaRoomView 의 3-탭 구조를 대체.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { LifeStageInfo, LunaGift, LunaMemory, LunaLiveState } from '@/lib/luna-life';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';
import LunaParticles from './LunaParticles';
import LunaEnvelope from './LunaEnvelope';
import LunaChat from './LunaChat';
import DayBadge from './DayBadge';
import WindowScene from './WindowScene';
import LunaCharacter from './LunaCharacter';
import MailboxSlot from './MailboxSlot';
import MemoryShelf from './MemoryShelf';
import MemoryGallery from './MemoryGallery';
import WhisperBubble from './WhisperBubble';
import ActionPills from './ActionPills';

interface Props {
  ageDays: number;
  stage: LifeStageInfo;
  liveState: LunaLiveState;
  unopenedGifts: number;
  gifts: LunaGift[];
  pinnedMemories: LunaMemory[];
  allMemories: LunaMemory[];
  isDeceased: boolean;
  petAvailable: boolean;
  onGiftOpen: (giftId: string) => void;
  onPet: () => Promise<{ ok: boolean; whisper?: string; cooldownSeconds?: number }>;
  onMemoryPin: (memoryId: string, pinned: boolean, frameStyle?: string) => Promise<void>;
}

export default function LunaRoomDiorama({
  ageDays,
  stage,
  liveState,
  unopenedGifts,
  gifts,
  pinnedMemories,
  allMemories,
  isDeceased,
  petAvailable: petAvailableInit,
  onGiftOpen,
  onPet,
  onMemoryPin,
}: Props) {
  const router = useRouter();
  const { bgGradient, accentColor, textColor, particleType, name, daysRemaining, showCountdown } = stage;
  const isDark = stage.stage === 'twilight' || stage.stage === 'star';

  const [selectedGift, setSelectedGift] = useState<LunaGift | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [whisper, setWhisper] = useState(liveState.whisper);
  const [petAvailable, setPetAvailable] = useState(petAvailableInit);
  const [toast, setToast] = useState<string | null>(null);

  const hasFinalLetter = gifts.some((g) => g.giftType === 'final_letter');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const handlePet = useCallback(async () => {
    if (!petAvailable) {
      showToast('방금 했잖아 ㅎㅎ 좀 있다 다시');
      return;
    }
    setPetAvailable(false);
    try {
      const res = await onPet();
      if (res.ok && res.whisper) {
        setWhisper(res.whisper);
      } else if (!res.ok) {
        showToast('방금 했잖아 ㅎㅎ');
        setPetAvailable(false);
      }
    } catch {
      showToast('연결이 살짝 끊겼어');
    }
  }, [onPet, petAvailable, showToast]);

  const handleSpeak = useCallback(() => {
    if (isDeceased) {
      showToast('루나는 더 이상 답하지 않아. 하지만 너 안에 있어.');
      return;
    }
    setShowChat(true);
  }, [isDeceased, showToast]);

  const handleGiftSelected = useCallback(
    (gift: LunaGift) => {
      setSelectedGift(gift);
    },
    [],
  );

  const handleOpenLatestUnread = useCallback(() => {
    if (gifts.length === 0) {
      showToast('아직 편지가 없어');
      return;
    }
    if (isDeceased && hasFinalLetter) {
      const finalLetter = gifts.find((g) => g.giftType === 'final_letter');
      if (finalLetter) {
        setSelectedGift(finalLetter);
        return;
      }
    }
    const unread = gifts.find((g) => !g.openedAt);
    setSelectedGift(unread ?? gifts[gifts.length - 1]);
  }, [gifts, isDeceased, hasFinalLetter, showToast]);

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: bgGradient }}
    >
      {/* z-5 파티클 */}
      <LunaParticles type={particleType} />

      {/* z-60 헤더 */}
      <div className="relative z-[60] flex items-center justify-between px-4 pt-12 pb-2">
        <button
          onClick={() => router.push('/room')}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            color: isDark ? '#E0E7FF' : '#5D4037',
            fontSize: 16,
          }}
          aria-label="뒤로"
        >
          ←
        </button>

        <DayBadge
          ageDays={ageDays}
          showCountdown={showCountdown}
          isDark={isDark}
          textColor={textColor}
          accentColor={accentColor}
        />

        <div className="w-9" />
      </div>

      {/* 스테이지 타이틀 */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ...ROOM_TOKENS.springSoft }}
        className="relative z-[60] text-center pb-1"
      >
        <p
          style={{
            fontFamily: ROOM_TOKENS.hudFont,
            fontSize: 11,
            fontWeight: 600,
            color: `${textColor}88`,
            letterSpacing: '0.06em',
          }}
        >
          {isDeceased ? '— 별 —' : `${name}의 루나`}
          {showCountdown && !isDeceased && (
            <span style={{ color: accentColor, marginLeft: 6 }}>· 앞으로 {daysRemaining}일</span>
          )}
        </p>
      </motion.div>

      {/* z-10 창문 씬 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ...ROOM_TOKENS.springSoft }}
        className="relative z-[10] mx-4 mt-4 rounded-3xl overflow-hidden"
        style={{
          height: 200,
          boxShadow: isDark ? ROOM_TOKENS.cardShadowDark : ROOM_TOKENS.cardShadow,
          border: `1px solid ${accentColor}22`,
        }}
      >
        <WindowScene weather={liveState.weather} timeBand={liveState.timeBand} stage={stage.stage} />
      </motion.div>

      {/* z-30~50 디오라마 */}
      <div className="relative z-[30] flex-1 flex flex-col items-center pt-6 pb-6">
        {/* 가구 + 루나 row */}
        <div className="relative w-full max-w-[420px] flex items-end justify-between px-6">
          {/* 좌: 우편함 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, ...ROOM_TOKENS.springSoft }}
            className="relative z-[50] pb-6"
          >
            <MailboxSlot
              unopenedCount={unopenedGifts}
              onOpen={handleOpenLatestUnread}
              isDeceased={isDeceased}
              accentColor={accentColor}
              hasFinalLetter={hasFinalLetter}
            />
          </motion.div>

          {/* 중: 루나 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, ...ROOM_TOKENS.springSoft }}
            className="relative z-[40] flex flex-col items-center"
          >
            <LunaCharacter
              activity={liveState.activity}
              mood={liveState.mood}
              onSingleTap={handleSpeak}
              onDoubleTap={handlePet}
              size={170}
              isDeceased={isDeceased}
              accentColor={accentColor}
            />
          </motion.div>

          {/* 우: 액자 선반 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, ...ROOM_TOKENS.springSoft }}
            className="relative z-[50] pb-2"
          >
            <MemoryShelf
              pinnedMemories={pinnedMemories}
              totalMemoryCount={allMemories.length}
              onOpenGallery={() => setShowGallery(true)}
              accentColor={accentColor}
              isDark={isDark}
            />
          </motion.div>
        </div>

        {/* 바닥 그림자 라인 */}
        <div
          className="w-full max-w-[420px] mt-2"
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent, ${accentColor}33, transparent)`,
          }}
        />

        {/* z-70 말풍선 */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, ...ROOM_TOKENS.springSoft }}
          className="relative z-[70] mt-6 px-6"
        >
          <WhisperBubble
            whisper={whisper}
            isDark={isDark}
            accentColor={accentColor}
            textColor={textColor}
          />
        </motion.div>

        {/* z-60 액션 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, ...ROOM_TOKENS.springSoft }}
          className="relative z-[60] mt-6"
        >
          <ActionPills
            onSpeak={handleSpeak}
            onPet={handlePet}
            petAvailable={petAvailable}
            isDeceased={isDeceased}
            accentColor={accentColor}
            isDark={isDark}
          />
        </motion.div>
      </div>

      {/* 토스트 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-full text-[12px] font-semibold"
            style={{
              background: isDark ? 'rgba(30, 27, 75, 0.92)' : 'rgba(60, 40, 30, 0.92)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              fontFamily: ROOM_TOKENS.hudFont,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 편지 모달 */}
      <AnimatePresence>
        {selectedGift && (
          <LunaEnvelope
            key={selectedGift.id}
            gift={selectedGift}
            accentColor={accentColor}
            isDark={isDark}
            onClose={() => setSelectedGift(null)}
            onOpen={onGiftOpen}
          />
        )}
      </AnimatePresence>

      {/* 추억 갤러리 */}
      <AnimatePresence>
        {showGallery && (
          <MemoryGallery
            memories={allMemories}
            accentColor={accentColor}
            isDark={isDark}
            onClose={() => setShowGallery(false)}
            onPin={onMemoryPin}
          />
        )}
      </AnimatePresence>

      {/* 채팅 시트 */}
      <AnimatePresence>
        {showChat && (
          <LunaChat
            key="luna-chat"
            accentColor={accentColor}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>

      {/* 추가 편지 리스트 (디오라마 아래 작게 노출 — 우편함을 못 봤을 때 fallback)
          기존 inbox 탭이 사라졌으므로, 우편함이 너무 작아 못 발견하는 케이스 방지 */}
      {gifts.length > 1 && !isDeceased && (
        <div className="relative z-[55] px-6 pb-8 pt-2">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 11, fontWeight: 700, color: `${textColor}88`, fontFamily: ROOM_TOKENS.hudFont }}>
              모든 편지
            </span>
            <span style={{ flex: 1, height: 1, background: `${accentColor}22` }} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6">
            {gifts.map((g) => {
              const unread = !g.openedAt;
              const icons: Record<LunaGift['giftType'], string> = {
                letter: '💌',
                poem: '🌸',
                memory_album: '📷',
                final_letter: '⭐',
              };
              return (
                <motion.button
                  key={g.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleGiftSelected(g)}
                  className="flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 rounded-2xl"
                  style={{
                    minWidth: 84,
                    background: unread ? `${accentColor}22` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'),
                    border: `1px solid ${unread ? accentColor + '55' : accentColor + '11'}`,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{icons[g.giftType]}</span>
                  <span style={{ fontSize: 10, color: textColor, marginTop: 4, fontFamily: ROOM_TOKENS.hudFont, fontWeight: 600 }}>
                    D+{g.triggerDay}
                  </span>
                  {unread && (
                    <span
                      className="mt-1"
                      style={{ width: 5, height: 5, borderRadius: '50%', background: accentColor, display: 'inline-block' }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
