'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getCardImagePath } from '@/engines/tarot/card-images';

type SpreadTypeAll = 'single' | 'three' | 'love' | 'unrequited' | 'reconnection' | 'pace' | 'avoidant' | 'yesno';

interface TarotDrawProps {
  data: {
    spreadType: SpreadTypeAll;
    cards: {
      position: string;
      cardId?: string;
      cardName: string;
      cardEmoji: string;
      keywords: string[];
      isReversed: boolean;
      interpretation: string;
    }[];
    overallReading?: string;
    advice?: string;
    tarotNyangMessage: string;
    followUpQuestions?: string[];
    // Legacy fields — kept for backward compat
    overallMessage?: string;
    choices?: { label: string; value: string }[];
  };
  onChoice?: (value: string) => void;
  onFollowUp?: (question: string) => void;
  onRedraw?: () => void;
}

// ============================================================
// Single card
// ============================================================

interface CardProps {
  card: TarotDrawProps['data']['cards'][number];
  index: number;
  spreadType: SpreadTypeAll;
  onFlipped: () => void;
  allSubmitted: boolean;
}

function TarotCard({ card, index, spreadType, onFlipped, allSubmitted }: CardProps) {
  const [flipped, setFlipped] = useState(false);

  const isSixCard = spreadType === 'unrequited' || spreadType === 'reconnection' || spreadType === 'avoidant';
  const isSmall = spreadType === 'three' || spreadType === 'love' || spreadType === 'pace' || isSixCard;
  const cardW = isSixCard ? 68 : spreadType === 'love' || spreadType === 'pace' ? 72 : spreadType === 'three' ? 88 : 120;
  const cardH = isSixCard ? 102 : spreadType === 'love' || spreadType === 'pace' ? 108 : spreadType === 'three' ? 132 : 176;

  function handleFlip() {
    if (flipped || allSubmitted) return;
    navigator.vibrate?.(30);
    setFlipped(true);
    onFlipped();
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 320, damping: 28 }}
    >
      {/* Position label */}
      {spreadType !== 'single' && (
        <span className="text-[10px] font-bold tracking-wider text-center" style={{ color: '#d4af37' }}>
          {card.position}
        </span>
      )}

      {/* Card flip container */}
      <div
        className="relative cursor-pointer select-none"
        style={{ width: cardW, height: cardH, perspective: 900 }}
        onClick={handleFlip}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
        >
          {/* Back face */}
          <div
            className="absolute inset-0 rounded-[14px] flex items-center justify-center shadow-lg border-2"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'linear-gradient(135deg, #2d1b69 0%, #1a1a3e 100%)',
              borderColor: '#d4af37',
            }}
          >
            {/* Decorative back pattern */}
            <div
              className="absolute inset-2 rounded-[10px] opacity-20"
              style={{ border: '1px solid #d4af37', background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(212,175,55,0.1) 4px, rgba(212,175,55,0.1) 5px)' }}
            />
            <span style={{ fontSize: isSmall ? 28 : 36, filter: 'drop-shadow(0 0 8px #d4af37aa)', position: 'relative', zIndex: 1 }}>🃏</span>
          </div>

          {/* Front face — 실제 카드 이미지 */}
          <div
            className="absolute inset-0 rounded-[14px] overflow-hidden shadow-lg border-2"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderColor: '#d4af37',
            }}
          >
            <div
              className="relative w-full h-full"
              style={{ transform: card.isReversed ? 'rotate(180deg)' : 'none' }}
            >
              {card.cardId ? (
                <Image
                  src={getCardImagePath(card.cardId)}
                  fill
                  sizes={`${cardW}px`}
                  alt={card.cardName}
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.classList.add('fallback-active');
                  }}
                />
              ) : null}
              {/* 이미지 없을 때 이모지 fallback */}
              <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 ${card.cardId ? '[.fallback-active>&]:flex hidden' : 'flex'}`}
                style={{ background: 'linear-gradient(160deg, #2a1a5e 0%, #1a1a3e 100%)' }}
              >
                <span style={{ fontSize: isSmall ? 22 : 30, filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.6))' }}>
                  {card.cardEmoji}
                </span>
                <span className="font-bold text-center leading-tight px-1" style={{ fontSize: isSmall ? 9 : 11, color: '#f5e6a3' }}>
                  {card.cardName}
                </span>
              </div>
            </div>
            {/* 하단 이름 오버레이 */}
            <div className="absolute bottom-0 left-0 right-0 py-1 px-1 text-center"
              style={{ background: 'linear-gradient(transparent, rgba(13,13,43,0.85))' }}>
              <span className="font-bold" style={{ fontSize: isSmall ? 8 : 10, color: '#f5e6a3' }}>
                {card.cardName}
              </span>
              {card.isReversed && (
                <span className="font-semibold ml-0.5 px-1 rounded-full"
                  style={{ fontSize: isSmall ? 7 : 8, color: '#e0a0a0', background: 'rgba(224,160,160,0.2)' }}>
                  역
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tap hint (before flip) */}
        {!flipped && !allSubmitted && (
          <motion.div
            className="absolute inset-0 rounded-[14px] flex items-end justify-center pb-2 pointer-events-none"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <span className="text-[9px] font-bold" style={{ color: '#d4af37aa' }}>탭해서 열기</span>
          </motion.div>
        )}

        {/* Glow on flip */}
        <AnimatePresence>
          {flipped && (
            <motion.div
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              exit={{}}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 rounded-[14px] pointer-events-none"
              style={{ boxShadow: '0 0 24px rgba(212,175,55,0.8)', border: '2px solid #d4af37' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Interpretation after flip */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex flex-col items-center gap-1.5"
            style={{ maxWidth: isSmall ? 90 : 140 }}
          >
            <div className="flex flex-wrap justify-center gap-1">
              {card.keywords.map((kw, ki) => (
                <span
                  key={ki}
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
                  style={{ color: '#d4af37', borderColor: '#d4af3766', background: 'rgba(212,175,55,0.08)' }}
                >
                  {kw}
                </span>
              ))}
            </div>
            <p
              className="text-center leading-snug"
              style={{ fontSize: isSmall ? 10 : 12, color: '#c8b8f0' }}
            >
              {card.interpretation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================
// Love spread layout (cross pattern): positions 0=left, 1=top, 2=center, 3=bottom, 4=right
// ============================================================

interface LoveSpreadProps {
  cards: TarotDrawProps['data']['cards'];
  onFlipped: () => void;
  allSubmitted: boolean;
  flippedCount: number;
}

function LoveSpread({ cards, onFlipped, allSubmitted, flippedCount }: LoveSpreadProps) {
  // Cross layout: row1=[_, 1, _], row2=[0, 2, 4], row3=[_, 3, _]
  const layout: (number | null)[][] = [
    [null, 1, null],
    [0, 2, 4],
    [null, 3, null],
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      {layout.map((row, ri) => (
        <div key={ri} className="flex flex-row items-center gap-1">
          {row.map((cardIdx, ci) =>
            cardIdx === null ? (
              <div key={ci} style={{ width: 72 }} />
            ) : (
              <TarotCard
                key={cardIdx}
                card={cards[cardIdx]}
                index={cardIdx}
                spreadType="love"
                onFlipped={onFlipped}
                allSubmitted={allSubmitted}
              />
            )
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Six-card layout (2 rows × 3): unrequited, reconnection, avoidant
// ============================================================

interface SixCardSpreadProps {
  cards: TarotDrawProps['data']['cards'];
  spreadType: TarotDrawProps['data']['spreadType'];
  onFlipped: () => void;
  allSubmitted: boolean;
}

function SixCardSpread({ cards, spreadType, onFlipped, allSubmitted }: SixCardSpreadProps) {
  const topRow = cards.slice(0, 3);
  const bottomRow = cards.slice(3, 6);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-row justify-center gap-2">
        {topRow.map((card, i) => (
          <TarotCard key={i} card={card} index={i} spreadType={spreadType} onFlipped={onFlipped} allSubmitted={allSubmitted} />
        ))}
      </div>
      <div className="flex flex-row justify-center gap-2">
        {bottomRow.map((card, i) => (
          <TarotCard key={i + 3} card={card} index={i + 3} spreadType={spreadType} onFlipped={onFlipped} allSubmitted={allSubmitted} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function TarotDraw({ data, onChoice, onFollowUp, onRedraw }: TarotDrawProps) {
  const [flippedCount, setFlippedCount] = useState(0);
  const [choiceSubmitted, setChoiceSubmitted] = useState(false);
  const totalCards = data.cards.length;
  const allFlipped = flippedCount >= totalCards;

  function handleCardFlipped() {
    setFlippedCount((c) => c + 1);
  }

  function handleChoice(choice: { label: string; value: string }) {
    if (choiceSubmitted) return;
    setChoiceSubmitted(true);
    onChoice?.(choice.value);
  }

  function handleFollowUp(q: string) {
    onFollowUp?.(q);
  }

  const titleMap: Record<SpreadTypeAll, string> = {
    single: '원 카드 타로', three: '3장 타로 스프레드', love: '연애 스프레드',
    unrequited: '💘 짝사랑 타로', reconnection: '🔁 재회 타로', pace: '✨ 썸·진도 타로',
    avoidant: '🚪 회피 패턴 타로', yesno: '⚡ Yes or No 타로',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className="rounded-[24px] shadow-[0_8px_40px_rgba(26,26,62,0.5)] border p-5 my-4 max-w-[92%] mx-auto overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, #0d0d2b 0%, #1a1a3e 60%, #2d1b69 100%)',
        borderColor: '#d4af3755',
      }}
    >
      {/* Stars decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { top: '8%', left: '6%', size: 3 },
          { top: '15%', right: '10%', size: 2 },
          { top: '30%', left: '90%', size: 4 },
          { top: '60%', left: '4%', size: 2 },
          { top: '75%', right: '8%', size: 3 },
          { top: '88%', left: '50%', size: 2 },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: s.size,
              height: s.size,
              background: '#d4af37',
              top: s.top,
              left: (s as { top: string; left?: string; right?: string; size: number }).left,
              right: (s as { top: string; left?: string; right?: string; size: number }).right,
            }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col items-center text-center mb-5 relative z-10">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-4xl mb-2"
          style={{ filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.7))' }}
        >
          🔮
        </motion.div>
        <h4 className="font-extrabold text-[15px] tracking-wide" style={{ color: '#f5e6a3' }}>
          {titleMap[data.spreadType]}
        </h4>
      </div>

      {/* 타로냥 message */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-start gap-2 mb-5 rounded-[16px] p-3 relative z-10"
        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
      >
        <span className="text-xl flex-shrink-0">🐱</span>
        <p className="text-[13px] leading-snug font-medium" style={{ color: '#d4c5f0' }}>
          {data.tarotNyangMessage}
        </p>
      </motion.div>

      {/* Cards */}
      <div className="relative z-10 mb-5">
        {data.spreadType === 'love' ? (
          <LoveSpread
            cards={data.cards}
            onFlipped={handleCardFlipped}
            allSubmitted={choiceSubmitted}
            flippedCount={flippedCount}
          />
        ) : (data.spreadType === 'unrequited' || data.spreadType === 'reconnection' || data.spreadType === 'avoidant') ? (
          <SixCardSpread
            cards={data.cards}
            spreadType={data.spreadType}
            onFlipped={handleCardFlipped}
            allSubmitted={choiceSubmitted}
          />
        ) : (data.spreadType === 'pace') ? (
          <LoveSpread
            cards={data.cards}
            onFlipped={handleCardFlipped}
            allSubmitted={choiceSubmitted}
            flippedCount={flippedCount}
          />
        ) : (
          <div
            className={data.spreadType === 'three' ? 'flex flex-row justify-center gap-3' : 'flex justify-center'}
          >
            {data.cards.map((card, i) => (
              <TarotCard
                key={i}
                card={card}
                index={i}
                spreadType={data.spreadType}
                onFlipped={handleCardFlipped}
                allSubmitted={choiceSubmitted}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress hint while not all flipped */}
      <AnimatePresence>
        {!allFlipped && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-[11px] mb-4 relative z-10"
            style={{ color: '#9b7dd4aa' }}
          >
            {flippedCount}/{totalCards} 카드를 열었어
          </motion.p>
        )}
      </AnimatePresence>

      {/* Overall reading — appears after all flipped */}
      <AnimatePresence>
        {allFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative z-10"
          >
            {/* Divider */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4))' }} />
              <span className="text-[14px]" style={{ filter: 'drop-shadow(0 0 6px #d4af37)' }}>✨</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.4), transparent)' }} />
            </div>

            {/* 종합 해석 */}
            {(data.overallReading ?? data.overallMessage) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="rounded-[16px] p-4 mb-3"
                style={{ background: 'rgba(45,27,105,0.6)', border: '1px solid rgba(212,175,55,0.3)' }}
              >
                <p className="text-[11px] font-bold mb-2 tracking-widest" style={{ color: '#d4af37aa' }}>
                  종합 해석
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: '#f0e6c8' }}>
                  {data.overallReading ?? data.overallMessage}
                </p>
              </motion.div>
            )}

            {/* 카드의 조언 */}
            {data.advice && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-[16px] p-4 mb-3"
                style={{ background: 'rgba(155,125,212,0.12)', border: '1px solid rgba(155,125,212,0.3)' }}
              >
                <p className="text-[11px] font-bold mb-2 tracking-widest" style={{ color: '#9b7dd4' }}>
                  카드의 조언
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: '#d4c5f0' }}>
                  {data.advice}
                </p>
              </motion.div>
            )}

            {/* 타로냥 final message block */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-start gap-2 mb-4 rounded-[14px] p-3"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
            >
              <span className="text-lg flex-shrink-0">🐱</span>
              <p className="text-[12px] leading-snug" style={{ color: '#c8b8f0' }}>
                카드가 모두 펼쳐졌어 냥~ 마음에 와닿는 게 있어?
              </p>
            </motion.div>

            {/* Follow-up questions */}
            {data.followUpQuestions && data.followUpQuestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-2 mb-4"
              >
                {data.followUpQuestions.map((q, qi) => (
                  <motion.button
                    key={qi}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFollowUp(q)}
                    className="px-3 py-2 rounded-full text-[12px] font-semibold outline-none cursor-pointer"
                    style={{
                      background: 'rgba(107,70,193,0.2)',
                      border: '1px solid rgba(155,125,212,0.5)',
                      color: '#c8b8f0',
                    }}
                  >
                    {q}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Legacy choices (backward compat) */}
            {data.choices && data.choices.length > 0 && (
              <div className="flex gap-2.5 mb-3">
                {data.choices.map((choice, idx) => {
                  const isPrimary = idx === data.choices!.length - 1;
                  return (
                    <motion.button
                      key={idx}
                      whileTap={!choiceSubmitted ? { scale: 0.96 } : {}}
                      onClick={() => handleChoice(choice)}
                      disabled={choiceSubmitted}
                      className="flex-1 py-3.5 px-3 rounded-[16px] text-[13px] font-extrabold transition-all outline-none"
                      style={
                        choiceSubmitted
                          ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.1)' }
                          : isPrimary
                          ? { background: 'linear-gradient(135deg, #6b46c1 0%, #d4af37 100%)', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(107,70,193,0.4)' }
                          : { background: 'transparent', color: '#d4af37', border: '1px solid rgba(212,175,55,0.5)' }
                      }
                    >
                      {choice.label}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 다시 뽑기 button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileTap={{ scale: 0.96 }}
              onClick={onRedraw}
              className="w-full py-3 rounded-[16px] text-[13px] font-bold outline-none cursor-pointer"
              style={{
                background: 'transparent',
                border: '1px solid rgba(212,175,55,0.35)',
                color: '#d4af37aa',
              }}
            >
              카드 다시 뽑기 🔮
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
