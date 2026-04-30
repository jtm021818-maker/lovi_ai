'use client';

/**
 * LunaRoomDiorama — Luna Room v100 master view.
 * 단일 디오라마(창문 + 가구 + 루나) + 모달 3종(편지/추억/채팅).
 * 기존 LunaRoomView 의 3-탭 구조를 대체.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LifeStageInfo, LunaGift, LunaMemory, LunaLiveState } from '@/lib/luna-life';
import { getRoomBgKey, ROOM_BG_IMAGES } from '@/lib/luna-life';
import { ROOM_TOKENS } from '@/lib/luna-life/tokens';
import LunaParticles from './LunaParticles';
import LunaEnvelope from './LunaEnvelope';
import LunaChat from './LunaChat';
import DayBadge from './DayBadge';
import LunaCharacter from './LunaCharacter';
import MailboxSlot from './MailboxSlot';
import MailboxLetterScatter from './MailboxLetterScatter';
import MemoryShelf from './MemoryShelf';
import MemoryGallery from './MemoryGallery';
import MemoryRecallModal from './MemoryRecallModal';
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
  const { bgGradient, accentColor, textColor, particleType, name, daysRemaining, showCountdown } = stage;
  const isDark = stage.stage === 'twilight' || stage.stage === 'star';
  const bgKey = getRoomBgKey(stage.stage);
  const bgImage = ROOM_BG_IMAGES[bgKey];

  const [selectedGift, setSelectedGift] = useState<LunaGift | null>(null);
  const [showLetterShelf, setShowLetterShelf] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  // v101: 추억 회상 모달
  const [recallMemory, setRecallMemory] = useState<LunaMemory | null>(null);
  const [chatMemoryContext, setChatMemoryContext] = useState<{ memory: LunaMemory; recall: string | null } | null>(null);
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

  const handleMailboxOpen = useCallback(() => {
    if (gifts.length === 0) {
      showToast('아직 편지가 없어');
      return;
    }
    setShowLetterShelf(true);
  }, [gifts.length, showToast]);

  const handleScatterSelect = useCallback((gift: LunaGift) => {
    // 책상 모달은 닫지 않고 그 위에 편지 모달이 뜸 → 닫으면 책상으로 돌아옴
    setSelectedGift(gift);
  }, []);

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: isDark ? '#0F0A1E' : '#F5F0FF' }}
    >
      {/* z-0 배경 이미지 — 3구간으로 나뉜 룸 배경 */}
      <motion.div
        key={bgKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
        className="absolute inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
        }}
      />

      {/* z-1 스테이지 색감 오버레이 — 배경 위에 얇게 씌워 각 단계 톤 유지 */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          background: bgGradient,
          opacity: isDark ? 0.52 : 0.38,
        }}
      />

      {/* z-5 파티클 */}
      <LunaParticles type={particleType} />

      {/* z-60 헤더 — 좌측에 D+N + 스테이지 타이틀 */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ...ROOM_TOKENS.springSoft }}
        className="relative z-[60] flex flex-col items-start px-5 pt-12 pb-2 gap-1"
      >
        <DayBadge
          ageDays={ageDays}
          showCountdown={showCountdown}
          isDark={isDark}
          textColor={textColor}
          accentColor={accentColor}
        />
        <p
          style={{
            fontFamily: ROOM_TOKENS.hudFont,
            fontSize: 11,
            fontWeight: 600,
            color: `${textColor}88`,
            letterSpacing: '0.06em',
            paddingLeft: 2,
          }}
        >
          {isDeceased ? '— 별 —' : `${name}의 루나`}
          {showCountdown && !isDeceased && (
            <span style={{ color: accentColor, marginLeft: 6 }}>· 앞으로 {daysRemaining}일</span>
          )}
        </p>
      </motion.div>


      {/* z-30~50 디오라마 — 방바닥 핀 레이아웃 */}
      <div className="relative z-[30] flex-1 flex flex-col items-center justify-end pb-24">

        {/* 벽에 걸린 추억 액자 — 절대 위치 */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, ...ROOM_TOKENS.springSoft }}
          className="absolute z-[50]"
          style={{ top: '38%', left: '5%' }}
        >
          <MemoryShelf
            pinnedMemories={pinnedMemories}
            totalMemoryCount={allMemories.length}
            onOpenGallery={() => setShowGallery(true)}
            onSelectMemory={(m) => setRecallMemory(m)}
            accentColor={accentColor}
            isDark={isDark}
          />
        </motion.div>

        {/* z-70 말풍선 — 캐릭터 위에 떠있는 느낌 */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, ...ROOM_TOKENS.springSoft }}
          className="relative z-[70] mb-3 px-6"
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
          className="relative z-[60] mb-4"
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

        {/* 바닥 그림자 라인 */}
        <div
          className="w-full max-w-[420px]"
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent, ${accentColor}44, transparent)`,
          }}
        />

        {/* 가구 + 루나 row — 방바닥 */}
        <div className="relative w-full max-w-[420px] flex items-end justify-between px-6">
          {/* 좌: 빈 공간 (추억 액자는 벽에 걸려있음) */}
          <div style={{ width: 90 }} />

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

          {/* 우: 우편함 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, ...ROOM_TOKENS.springSoft }}
            className="relative z-[50] pb-6"
          >
            <MailboxSlot
              unopenedCount={unopenedGifts}
              onOpen={handleMailboxOpen}
              isDeceased={isDeceased}
              accentColor={accentColor}
              hasFinalLetter={hasFinalLetter}
            />
          </motion.div>
        </div>
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

      {/* 책상 위 편지 흩뿌림 모달 */}
      <AnimatePresence>
        {showLetterShelf && (
          <MailboxLetterScatter
            key="letter-shelf"
            gifts={gifts}
            accentColor={accentColor}
            isDark={isDark}
            isDeceased={isDeceased}
            onClose={() => setShowLetterShelf(false)}
            onSelect={handleScatterSelect}
          />
        )}
      </AnimatePresence>

      {/* 편지 단일 모달 (책상 위에 겹쳐서 뜸) */}
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
            onClose={() => {
              setShowChat(false);
              setChatMemoryContext(null);
            }}
            memoryContext={chatMemoryContext ?? undefined}
          />
        )}
      </AnimatePresence>

      {/* v101: 추억 회상 모달 */}
      <AnimatePresence>
        {recallMemory && (
          <MemoryRecallModal
            key={`recall-${recallMemory.id}`}
            memory={recallMemory}
            accentColor={accentColor}
            isDark={isDark}
            onClose={() => setRecallMemory(null)}
            onTalkMore={(m, recall) => {
              setChatMemoryContext({ memory: m, recall });
              setRecallMemory(null);
              setShowChat(true);
            }}
            onPin={onMemoryPin}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
