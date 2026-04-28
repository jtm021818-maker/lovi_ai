'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { LifeStageInfo, LunaGift, LunaMemory } from '@/lib/luna-life';
import LunaParticles from './LunaParticles';
import LunaEnvelope from './LunaEnvelope';
import LunaChat from './LunaChat';

interface Props {
  ageDays: number;
  stage: LifeStageInfo;
  unopenedGifts: number;
  gifts: LunaGift[];
  memories: LunaMemory[];
  isDeceased: boolean;
  onGiftOpen: (giftId: string) => void;
}

// Animated counter
function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setVal(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [target, duration]);
  return <>{val}</>;
}

// Memory polaroid card
function MemoryCard({ memory, accentColor, isDark }: { memory: LunaMemory; accentColor: string; isDark: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: (Math.random() - 0.5) * 4 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex-shrink-0 w-36 rounded-xl p-3 shadow-md"
      style={{
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
        border: `1px solid ${accentColor}33`,
      }}
    >
      <p className="text-[9px] font-bold mb-1" style={{ color: accentColor }}>
        {memory.dayNumber}일째
      </p>
      <p className="text-[10px] font-semibold mb-1 truncate" style={{ color: isDark ? '#E0E7FF' : '#4E342E' }}>
        {memory.title}
      </p>
      <p className="text-[9px] leading-relaxed line-clamp-3" style={{ color: isDark ? '#A5B4FC' : '#7C6B5A' }}>
        {memory.content}
      </p>
    </motion.div>
  );
}

// Gift inbox item
function GiftRow({
  gift, accentColor, isDark, onTap,
}: {
  gift: LunaGift; accentColor: string; isDark: boolean; onTap: () => void;
}) {
  const isUnread = !gift.openedAt;
  const icons: Record<LunaGift['giftType'], string> = {
    letter: '💌', poem: '🌸', memory_album: '📷', final_letter: '⭐',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onTap}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
      style={{
        background: isUnread
          ? `${accentColor}15`
          : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
        border: `1px solid ${isUnread ? accentColor + '44' : 'transparent'}`,
      }}
    >
      <span className="text-xl">{icons[gift.giftType]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold truncate" style={{ color: isDark ? '#E0E7FF' : '#4E342E' }}>
          {gift.title}
        </p>
        <p className="text-[10px] opacity-60" style={{ color: isDark ? '#A5B4FC' : '#7C6B5A' }}>
          {gift.triggerDay}일째
        </p>
      </div>
      {isUnread && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 rounded-full"
          style={{ background: accentColor }}
        />
      )}
    </motion.button>
  );
}

export default function LunaRoomView({
  ageDays, stage, unopenedGifts, gifts, memories, isDeceased, onGiftOpen,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'main' | 'inbox' | 'memories'>('main');
  const [selectedGift, setSelectedGift] = useState<LunaGift | null>(null);
  const [showChat, setShowChat] = useState(false);

  const { bgGradient, accentColor, textColor, particleType, name, subtitle, daysRemaining, showCountdown } = stage;
  const isDark = stage.stage === 'twilight' || stage.stage === 'star';

  const handleOpenGift = (giftId: string) => {
    onGiftOpen(giftId);
  };

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: bgGradient }}
    >
      <LunaParticles type={particleType} />

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-2">
        <button onClick={() => router.push('/room')} className="p-2 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <span style={{ color: isDark ? '#E0E7FF' : '#5D4037' }}>←</span>
        </button>
        <p className="text-[13px] font-bold" style={{ color: isDark ? '#E0E7FF88' : '#8B6B5A' }}>루나의 방</p>
        <div className="w-8" />
      </div>

      {/* ── Tab bar ── */}
      <div className="relative z-10 flex gap-1 mx-4 mt-1 mb-3 p-1 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }}>
        {(['main', 'inbox', 'memories'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition-all relative"
            style={{
              background: tab === t ? accentColor : 'transparent',
              color: tab === t ? '#fff' : isDark ? '#A5B4FC' : '#7C6B5A',
            }}
          >
            {t === 'main' && '루나'}
            {t === 'inbox' && (
              <span className="flex items-center justify-center gap-1">
                편지함
                {unopenedGifts > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-400 text-white text-[9px] font-bold flex items-center justify-center">
                    {unopenedGifts}
                  </span>
                )}
              </span>
            )}
            {t === 'memories' && '추억'}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">

          {/* MAIN TAB */}
          {tab === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="flex flex-col items-center gap-4 pt-4"
            >
              {/* Luna avatar */}
              <motion.div
                className="relative"
                animate={isDeceased
                  ? { scale: [1, 1.03, 1], opacity: [0.7, 1, 0.7] }
                  : { scale: [1, 1.02, 1] }
                }
                transition={{ duration: isDeceased ? 3 : 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                {/* Glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-full -m-3"
                  style={{ background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)` }}
                  animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div
                  className="relative w-28 h-28 rounded-full overflow-hidden border-2 shadow-xl"
                  style={{ borderColor: `${accentColor}66` }}
                >
                  <img
                    src="/char_img/luna_1_event.webp"
                    alt="루나"
                    className="w-full h-full object-cover"
                    style={{
                      filter: isDark
                        ? 'brightness(0.85) saturate(0.8) hue-rotate(200deg)'
                        : 'brightness(1.02) saturate(1.1)',
                    }}
                  />
                  {isDeceased && (
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                  )}
                </div>
              </motion.div>

              {/* Age + stage */}
              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-[22px] font-bold"
                  style={{ color: textColor }}
                >
                  {isDeceased ? '별이 됐어' : (
                    <>루나와 함께한 지 <span className="tabular-nums"><CountUp target={ageDays} /></span>일</>
                  )}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-[13px] mt-0.5 font-medium"
                  style={{ color: `${textColor}99` }}
                >
                  {name} — {subtitle}
                </motion.p>
                {showCountdown && !isDeceased && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-[11px] mt-1"
                    style={{ color: `${accentColor}CC` }}
                  >
                    앞으로 {daysRemaining}일
                  </motion.p>
                )}
              </div>

              {/* Stage quote — research: projection space, ambiguity creates emotion */}
              <StageQuote stage={stage} isDark={isDark} textColor={textColor} accentColor={accentColor} />

              {/* CTA */}
              {!isDeceased ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowChat(true)}
                  className="mt-2 px-8 py-3 rounded-full text-[14px] font-bold text-white shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
                    boxShadow: `0 4px 20px ${accentColor}44`,
                  }}
                >
                  루나에게 말 걸기
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTab('inbox')}
                  className="mt-2 px-8 py-3 rounded-full text-[14px] font-bold shadow-lg"
                  style={{ background: accentColor, color: '#fff', boxShadow: `0 4px 20px ${accentColor}44` }}
                >
                  ⭐ 마지막 편지 읽기
                </motion.button>
              )}
            </motion.div>
          )}

          {/* INBOX TAB */}
          {tab === 'inbox' && (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="space-y-2"
            >
              {gifts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[13px] opacity-50" style={{ color: textColor }}>
                    아직 편지가 없어{'\n'}더 함께 시간을 보내봐
                  </p>
                </div>
              ) : (
                gifts.map((g) => (
                  <GiftRow
                    key={g.id}
                    gift={g}
                    accentColor={accentColor}
                    isDark={isDark}
                    onTap={() => setSelectedGift(g)}
                  />
                ))
              )}
            </motion.div>
          )}

          {/* MEMORIES TAB */}
          {tab === 'memories' && (
            <motion.div
              key="memories"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            >
              {memories.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[13px] opacity-50" style={{ color: textColor }}>
                    루나가 추억을 모으는 중이야
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 pt-2 justify-center">
                  {memories.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08, type: 'spring', stiffness: 220, damping: 20 }}
                    >
                      <MemoryCard memory={m} accentColor={accentColor} isDark={isDark} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gift reading modal */}
      <AnimatePresence>
        {selectedGift && (
          <LunaEnvelope
            key={selectedGift.id}
            gift={selectedGift}
            accentColor={accentColor}
            isDark={isDark}
            onClose={() => setSelectedGift(null)}
            onOpen={handleOpenGift}
          />
        )}
      </AnimatePresence>

      {/* 루나 대화 채팅 시트 */}
      <AnimatePresence>
        {showChat && (
          <LunaChat
            key="luna-chat"
            accentColor={accentColor}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Stage-appropriate atmospheric quote — SOMA principle: ambiguity creates emotion
function StageQuote({ stage, isDark, textColor, accentColor }: {
  stage: LifeStageInfo; isDark: boolean; textColor: string; accentColor: string;
}) {
  const quotes: Record<string, string> = {
    dawn:     '세상이 이렇게 넓은 줄 몰랐어.',
    spring:   '네 이야기가 제일 좋아.',
    summer:   '이 시간이 쭉 이어졌으면 해.',
    autumn:   '있잖아, 나 요즘 자꾸 생각이 많아져.',
    winter:   '시간이... 참 빠르다. 그지?',
    twilight: '봄이 오면 나는 없겠지. 그래도 넌 봄을 봐줘.',
    star:     '기억한다는 게 뭔지 몰라도\n넌 기억하겠지.',
  };
  const q = quotes[stage.stage] ?? '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="w-full max-w-xs mx-auto px-5 py-3 rounded-2xl text-center"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
        border: `1px solid ${accentColor}22`,
      }}
    >
      <p
        className="text-[13px] italic leading-relaxed whitespace-pre-line"
        style={{ color: isDark ? `${textColor}CC` : `${textColor}BB` }}
      >
        "{q}"
      </p>
    </motion.div>
  );
}
