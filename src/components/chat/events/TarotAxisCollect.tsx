'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { TarotAxisCollectData } from '@/types/engine.types';
import { getCardImagePath } from '@/engines/tarot/card-images';

interface TarotAxisCollectProps {
  data: TarotAxisCollectData;
  onChoice: (value: string) => void;
  disabled?: boolean;
}

// ─── 별 파티클 ───────────────────────────────────────────

function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 45 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 3,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3,
        isDiamond: Math.random() > 0.75,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: s.isDiamond ? '#f5e6a3' : '#d4af37',
            borderRadius: s.isDiamond ? '1px' : '50%',
            transform: s.isDiamond ? 'rotate(45deg)' : 'none',
          }}
          animate={{
            opacity: [0.2, 0.9, 0.2],
            scale: [0.7, 1.3, 0.7],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── 배경 글로우 구체 ────────────────────────────────────

function GlowOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 상단 퍼플 오브 */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 200,
          height: 200,
          top: '-5%',
          left: '20%',
          background: 'radial-gradient(circle, rgba(107,70,193,0.25) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* 하단 골드 오브 */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 180,
          height: 180,
          bottom: '5%',
          right: '10%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
          filter: 'blur(35px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      {/* 중앙 블루 오브 */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 160,
          height: 160,
          top: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
    </div>
  );
}

// ─── 골드 스파크 파티클 (선택 시) ─────────────────────────

function GoldSparks({ active }: { active: boolean }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return {
          id: i,
          angle,
          dist: 35 + Math.random() * 25,
          size: 2 + Math.random() * 3,
          delay: Math.random() * 0.15,
        };
      }),
    [],
  );

  if (!active) return null;
  return (
    <>
      {sparks.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: s.size,
            height: s.size,
            background: '#f5e6a3',
            left: '50%',
            top: '50%',
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
            boxShadow: '0 0 4px #d4af37',
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(s.angle) * s.dist,
            y: Math.sin(s.angle) * s.dist,
            opacity: 0,
            scale: 0.3,
          }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: s.delay }}
        />
      ))}
    </>
  );
}

// ─── 카드 부채꼴 배치 설정 ───────────────────────────────

const FAN_POSITIONS = [
  { rotate: -8, offsetY: 6 },
  { rotate: 0, offsetY: -6 },
  { rotate: 8, offsetY: 6 },
];

// ─── 메인 컴포넌트 ──────────────────────────────────────

export default function TarotAxisCollect({ data, onChoice, disabled }: TarotAxisCollectProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [sparkFired, setSparkFired] = useState(false);

  const cards = data.pickCards ?? [];
  const hasPickCards = cards.length > 0;

  // 하위 호환
  if (!hasPickCards) {
    return (
      <div
        className="rounded-[24px] border p-5 my-4 max-w-[92%] mx-auto"
        style={{
          background: 'linear-gradient(160deg, #0d0d2b 0%, #1a1a3e 60%, #2d1b69 100%)',
          borderColor: '#d4af3755',
        }}
      >
        <p className="text-[14px] text-center" style={{ color: '#f5e6a3' }}>
          {data.tarotNyangMessage}
        </p>
      </div>
    );
  }

  function handleSelect(idx: number) {
    if (selectedIdx !== null || disabled) return;
    navigator.vibrate?.([30, 50, 30]);
    setSelectedIdx(idx);
    setSparkFired(true);
    setTimeout(() => setFlipped(true), 700);
    setTimeout(() => onChoice(cards[idx].id), 2800);
  }

  const selected = selectedIdx !== null ? cards[selectedIdx] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className="rounded-[24px] shadow-[0_8px_40px_rgba(13,13,43,0.7)] border my-4 max-w-[92%] mx-auto overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, #0d0d2b 0%, #111138 40%, #1a1a3e 70%, #2d1b69 100%)',
        borderColor: '#d4af3744',
        padding: '24px 20px 20px',
      }}
    >
      {/* ─── 배경 레이어 ─── */}
      <StarField />
      <GlowOrbs />

      {/* ─── 타로냥 캐릭터 ─── */}
      <motion.div
        className="relative z-10 flex justify-center mb-2"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 200, damping: 18 }}
      >
        <div className="relative">
          {/* 캐릭터 뒤 글로우 */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(107,70,193,0.15) 50%, transparent 70%)',
              filter: 'blur(20px)',
              transform: 'scale(1.6)',
            }}
          />
          <motion.div
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/char_img/taronaang_1_Evt.webp"
              width={130}
              height={130}
              alt="타로냥"
              className="relative z-10 drop-shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              priority
            />
          </motion.div>
        </div>
      </motion.div>

      {/* ─── 메인 텍스트 ─── */}
      <motion.div
        className="relative z-10 text-center mb-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <h3
          className="font-extrabold text-[16px] leading-relaxed tracking-wide"
          style={{
            background: 'linear-gradient(135deg, #f5e6a3 0%, #d4af37 50%, #f5e6a3 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 30px rgba(212,175,55,0.3)',
          }}
        >
          세 장의 카드 중<br />직감으로 한 장을 골라봐
        </h3>
      </motion.div>

      {/* ─── 타로냥 메시지 ─── */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="relative z-10 flex items-start gap-2.5 mb-6 rounded-[16px] p-3"
        style={{
          background: 'rgba(212,175,55,0.06)',
          border: '1px solid rgba(212,175,55,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="text-xl flex-shrink-0">🐱</span>
        <p className="text-[13px] leading-snug font-medium" style={{ color: '#d4c5f0' }}>
          {data.tarotNyangMessage}
        </p>
      </motion.div>

      {/* ─── 카드 3장 (부채꼴) ─── */}
      <div className="relative z-10 flex justify-center items-end gap-3 mb-5" style={{ minHeight: 180 }}>
        {cards.map((card, idx) => {
          const isSelected = selectedIdx === idx;
          const isOther = selectedIdx !== null && !isSelected;
          const showFront = isSelected && flipped;
          const fan = FAN_POSITIONS[idx] ?? FAN_POSITIONS[1];

          return (
            <motion.div
              key={idx}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 40 }}
              animate={{
                opacity: isOther ? 0.25 : 1,
                y: 0,
                scale: isSelected ? 1.08 : isOther ? 0.88 : 1,
                filter: isOther ? 'blur(2px)' : 'blur(0px)',
              }}
              transition={{
                delay: 0.9 + idx * 0.15,
                type: 'spring',
                stiffness: 260,
                damping: 22,
              }}
              style={{ zIndex: isSelected ? 10 : 1 }}
            >
              {/* 카드 레이블 */}
              <motion.span
                className="text-[10px] font-bold tracking-wider mb-1.5"
                style={{ color: isSelected ? '#f5e6a3' : '#d4af37aa' }}
                animate={isOther ? { opacity: 0 } : { opacity: 1 }}
              >
                {card.label}
              </motion.span>

              {/* 카드 플립 컨테이너 */}
              <motion.div
                className="relative cursor-pointer select-none"
                style={{ width: 95, height: 145, perspective: 1000 }}
                onClick={() => handleSelect(idx)}
                animate={{
                  rotate: isSelected ? 0 : fan.rotate,
                  y: isSelected ? -8 : fan.offsetY,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                whileHover={selectedIdx === null ? { y: fan.offsetY - 6, scale: 1.04 } : {}}
              >
                {/* idle 떠다니기 */}
                <motion.div
                  animate={
                    selectedIdx === null
                      ? { y: [0, -3, 0] }
                      : {}
                  }
                  transition={{
                    duration: 3 + idx * 0.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: idx * 0.5,
                  }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <motion.div
                    animate={{ rotateY: showFront ? 180 : 0 }}
                    transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                      width: '100%',
                      height: '100%',
                      transformStyle: 'preserve-3d',
                      position: 'relative',
                    }}
                  >
                    {/* ─── 뒷면: card_back_img.webp ─── */}
                    <div
                      className="absolute inset-0 rounded-[12px] overflow-hidden shadow-lg"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        border: isSelected
                          ? '2px solid #d4af37'
                          : '1.5px solid rgba(212,175,55,0.35)',
                        boxShadow: isSelected
                          ? '0 0 24px rgba(212,175,55,0.6), 0 8px 24px rgba(0,0,0,0.4)'
                          : '0 4px 16px rgba(0,0,0,0.3)',
                      }}
                    >
                      <Image
                        src="/ui/card_back_img.webp"
                        fill
                        sizes="95px"
                        alt="tarot card back"
                        className="object-cover"
                        priority
                      />
                    </div>

                    {/* ─── 앞면: 실제 카드 이미지 ─── */}
                    <div
                      className="absolute inset-0 rounded-[12px] overflow-hidden shadow-lg"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        border: '2px solid #d4af37',
                        boxShadow: '0 0 20px rgba(212,175,55,0.4), 0 8px 24px rgba(0,0,0,0.4)',
                      }}
                    >
                      {/* 카드 이미지 (역방향이면 180도 회전) */}
                      <div
                        className="relative w-full h-full"
                        style={{ transform: card.isReversed ? 'rotate(180deg)' : 'none' }}
                      >
                        <Image
                          src={getCardImagePath(card.id)}
                          fill
                          sizes="95px"
                          alt={card.cardName}
                          className="object-cover"
                          onError={(e) => {
                            // 이미지 없으면 fallback (이모지)
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.classList.add('fallback-active');
                          }}
                        />
                        {/* 이미지 로드 실패 시 이모지 fallback */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 [.fallback-active>&]:flex hidden"
                          style={{ background: 'linear-gradient(160deg, #2a1a5e 0%, #1a1a3e 50%, #0d0d2b 100%)' }}
                        >
                          <span className="text-[32px]" style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.6))' }}>
                            {card.cardEmoji}
                          </span>
                          <span className="font-bold text-center text-[11px]" style={{ color: '#f5e6a3' }}>
                            {card.cardName}
                          </span>
                        </div>
                      </div>
                      {/* 카드 이름 오버레이 (하단) */}
                      <div className="absolute bottom-0 left-0 right-0 py-1.5 px-1 text-center"
                        style={{ background: 'linear-gradient(transparent, rgba(13,13,43,0.85))' }}
                      >
                        <span className="font-bold text-[10px]" style={{ color: '#f5e6a3' }}>
                          {card.cardName}
                        </span>
                        {card.isReversed && (
                          <span className="text-[8px] font-semibold ml-1 px-1 py-0.5 rounded-full"
                            style={{ color: '#e0a0a0', background: 'rgba(224,160,160,0.2)' }}>
                            역방향
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* 탭 힌트 */}
                {selectedIdx === null && (
                  <motion.div
                    className="absolute inset-0 rounded-[12px] flex items-end justify-center pb-2.5 pointer-events-none"
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: '#f5e6a3', background: 'rgba(13,13,43,0.6)' }}
                    >
                      탭해서 선택
                    </span>
                  </motion.div>
                )}

                {/* 선택 글로우 펄스 */}
                <AnimatePresence>
                  {isSelected && !flipped && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.4, 0.9, 0.4] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      className="absolute inset-0 rounded-[12px] pointer-events-none"
                      style={{
                        boxShadow: '0 0 30px rgba(212,175,55,0.7)',
                        border: '2px solid #d4af37',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* 플립 섬광 */}
                <AnimatePresence>
                  {isSelected && flipped && (
                    <motion.div
                      initial={{ opacity: 0.9, scale: 1 }}
                      animate={{ opacity: 0, scale: 2 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 rounded-[12px] pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle, rgba(245,230,163,0.5) 0%, transparent 60%)',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* 골드 스파크 */}
                <GoldSparks active={sparkFired && isSelected} />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── 하단 힌트 (선택 전) ─── */}
      <AnimatePresence>
        {selectedIdx === null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="relative z-10 text-center text-[11px] mb-2"
            style={{ color: '#9b7dd4' }}
          >
            직감으로 골라봐 냥~ 🐱
          </motion.p>
        )}
      </AnimatePresence>

      {/* ─── 선택된 카드 에너지 메시지 ─── */}
      <AnimatePresence>
        {selected && flipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative z-10"
          >
            {/* 디바이더 */}
            <div className="flex items-center gap-2 mb-4 mt-2">
              <div
                className="flex-1 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4))' }}
              />
              <motion.span
                className="text-[14px]"
                animate={{ rotate: [0, 15, 0, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ filter: 'drop-shadow(0 0 8px #d4af37)' }}
              >
                ✨
              </motion.span>
              <div
                className="flex-1 h-px"
                style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)' }}
              />
            </div>

            {/* 오늘의 에너지 */}
            <div
              className="rounded-[16px] p-4 mb-3"
              style={{
                background: 'rgba(45,27,105,0.5)',
                border: '1px solid rgba(212,175,55,0.25)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <p
                className="text-[10px] font-bold mb-2 tracking-[0.15em] uppercase"
                style={{ color: '#d4af37' }}
              >
                오늘 네가 고른 에너지
              </p>
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-[28px]" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' }}>
                  {selected.cardEmoji}
                </span>
                <div>
                  <span className="font-bold text-[15px] block" style={{ color: '#f5e6a3' }}>
                    {selected.cardName}
                  </span>
                  {selected.isReversed && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                      style={{ color: '#e0a0a0', background: 'rgba(224,160,160,0.12)' }}
                    >
                      역방향
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selected.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: '#d4af37',
                      border: '1px solid rgba(212,175,55,0.3)',
                      background: 'rgba(212,175,55,0.08)',
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#f0e6c8' }}>
                {selected.energyMessage}
              </p>
            </div>

            {/* 타로냥 코멘트 */}
            <div
              className="flex items-start gap-2 rounded-[14px] p-3"
              style={{
                background: 'rgba(212,175,55,0.05)',
                border: '1px solid rgba(212,175,55,0.12)',
              }}
            >
              <span className="text-lg flex-shrink-0">🐱</span>
              <p className="text-[12px] leading-snug" style={{ color: '#c8b8f0' }}>
                이 카드를 골랐구나 냥~ 이 에너지를 가지고 더 깊이 들어가볼게 🔮
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
