'use client';

/**
 * 🏡 v83: Mind Room
 *
 * 유저가 수집한 정령들을 배치하는 방.
 * - 드래그 앤 드롭 배치
 * - 정령 탭 시 대사 말풍선
 * - Lv 4+ 쌍은 5분마다 랜덤 상호작용 대사
 * - PNG 공유
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSpirit } from '@/data/spirits';
import { pickBondDialogue } from '@/data/bond-dialogues';
import { getInteractions, pickRandomInteraction } from '@/data/interactions';
import type { RoomState, PlacedSpirit } from '@/types/room.types';
import type { UserSpirit, SpiritId, BondLv } from '@/types/spirit.types';

/**
 * 🆕 v83.1: Spirit personality-based idle motion.
 * 각 정령이 성격에 맞게 방에서 놀고 있는 느낌.
 */
type MotionPattern = {
  y?: number[];       // 세로 움직임
  x?: number[];       // 좌우 움직임
  rotate?: number[];  // 회전
  scale?: number[];   // 크기 변화
  duration: number;
};

function getSpiritMotion(id: SpiritId): MotionPattern {
  switch (id) {
    case 'fire_goblin':    return { scale: [1, 1.15, 1], rotate: [-3, 3, -3], duration: 0.8 };          // 활활 떨림
    case 'moon_rabbit':    return { y: [0, -14, 0], duration: 1.4 };                                    // 통통 점프
    case 'cherry_leaf':    return { rotate: [-5, 5, -5], y: [0, -3, 0], duration: 3.2 };                // 꽃잎 흔들
    case 'tear_drop':      return { y: [0, 4, 0], scale: [1, 0.95, 1], duration: 2 };                   // 쳐진 느낌
    case 'cloud_bunny':    return { y: [0, -6, 0], x: [0, 3, -3, 0], duration: 3.8 };                   // 둥실
    case 'wind_sprite':    return { x: [-6, 6, -6], rotate: [-8, 8, -8], duration: 1.6 };               // 바람 타고
    case 'seed_spirit':    return { scale: [1, 1.08, 1], duration: 2.4 };                               // 자라남
    case 'drum_imp':       return { y: [0, -4, 0, -4, 0], duration: 0.6 };                              // 박자 통통
    case 'book_worm':      return { rotate: [0, 2, 0], duration: 3.5 };                                 // 살짝만
    case 'letter_fairy':   return { y: [0, -5, 0], rotate: [-3, 3, -3], duration: 2.6 };                // 팔랑
    case 'clown_harley':   return { rotate: [0, 360], duration: 4 };                                    // 회전 춤
    case 'rose_fairy':     return { y: [0, -4, 0], scale: [1, 1.05, 1], duration: 2.2 };                // 설렘 두근
    case 'ice_prince':     return { y: [0, -2, 0], duration: 4 };                                       // 정적
    case 'forest_mom':     return { scale: [1, 1.03, 1], duration: 5 };                                 // 고요
    case 'lightning_bird':
      return { x: [0, 8, -8, 0], y: [0, -3, 3, 0], duration: 0.5 };                                     // 번개 다트
    case 'butterfly_meta': return { x: [0, 8, 0, -8, 0], y: [0, -8, 0, -8, 0], rotate: [0, 10, -10, 0], duration: 3.5 };  // 나비 곡선
    case 'peace_dove':     return { y: [0, -5, 0], x: [0, 3, -3, 0], duration: 2.8 };                   // 평화롭
    case 'book_keeper':    return { rotate: [0, -3, 3, 0], duration: 4 };                               // 기억 살핌
    case 'queen_elena':    return { scale: [1, 1.06, 1], y: [0, -2, 0], duration: 3 };                  // 위엄
    case 'star_dust':      return { scale: [1, 1.2, 0.9, 1], rotate: [0, 180, 360], duration: 2 };      // 반짝 회전
    case 'guardian_eddy':  return { scale: [1, 1.1, 1], y: [0, -3, 0], duration: 3 };                   // 전설 아우라
    default:               return { y: [0, -4, 0], duration: 2 };
  }
}

const ROOM_W = 320;
const ROOM_H = 480;

export default function RoomPage() {
  const [ownedSpirits, setOwnedSpirits] = useState<UserSpirit[]>([]);
  const [room, setRoom] = useState<RoomState>({ placedSpirits: [], furniture: {}, theme: 'default' });
  const [loaded, setLoaded] = useState(false);
  const [bubble, setBubble] = useState<{ x: number; y: number; text: string; fromSpirit: SpiritId } | null>(null);
  const [interactionBubble, setInteractionBubble] = useState<{ pairKey: string; a: string; b: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/spirits/list').then((r) => r.json()),
      fetch('/api/room/placement').then((r) => r.json()),
    ])
      .then(([spiritsData, roomData]) => {
        setOwnedSpirits(spiritsData.owned ?? []);
        setRoom(roomData);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // 자동 저장 (300ms debounce)
  const persistRoom = useCallback((r: RoomState) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch('/api/room/placement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      }).catch(() => {});
    }, 300);
  }, []);

  // Idle 상호작용 — 5분마다 랜덤 발동 (첫 5초 후 시작)
  useEffect(() => {
    if (!loaded) return;

    const bondLvs: Record<string, number> = {};
    for (const us of ownedSpirits) bondLvs[us.spiritId] = us.bondLv;

    const placedIds = room.placedSpirits.map((p) => p.spiritId);
    const interactions = getInteractions(placedIds, bondLvs);

    if (interactions.length === 0) return;

    const triggerInteraction = () => {
      const picked = pickRandomInteraction(interactions);
      if (picked) {
        setInteractionBubble({ pairKey: picked.pairKey, a: picked.dialogue.a, b: picked.dialogue.b });
        setTimeout(() => setInteractionBubble(null), 6000);
      }
    };
    const t1 = setTimeout(triggerInteraction, 5000);
    const t2 = setInterval(triggerInteraction, 5 * 60 * 1000);
    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, [loaded, room.placedSpirits, ownedSpirits]);

  function getBondLv(id: SpiritId): BondLv {
    return ((ownedSpirits.find((u) => u.spiritId === id)?.bondLv ?? 1) as BondLv);
  }

  function addSpirit(id: SpiritId) {
    if (room.placedSpirits.some((p) => p.spiritId === id)) return; // 이미 배치
    if (room.placedSpirits.length >= 15) {
      alert('최대 15마리까지 배치 가능해요');
      return;
    }
    const updated: RoomState = {
      ...room,
      placedSpirits: [
        ...room.placedSpirits,
        { spiritId: id, x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4 },
      ],
    };
    setRoom(updated);
    persistRoom(updated);
  }

  function removeSpirit(id: SpiritId) {
    const updated: RoomState = { ...room, placedSpirits: room.placedSpirits.filter((p) => p.spiritId !== id) };
    setRoom(updated);
    persistRoom(updated);
  }

  function moveSpirit(id: SpiritId, x: number, y: number) {
    const updated: RoomState = {
      ...room,
      placedSpirits: room.placedSpirits.map((p) => (p.spiritId === id ? { ...p, x, y } : p)),
    };
    setRoom(updated);
    persistRoom(updated);
  }

  function handleSpiritTap(p: PlacedSpirit) {
    if (editMode) {
      removeSpirit(p.spiritId);
      return;
    }
    const lv = getBondLv(p.spiritId);
    const line = pickBondDialogue(p.spiritId, lv);
    if (line) {
      setBubble({ x: p.x * ROOM_W, y: p.y * ROOM_H, text: line, fromSpirit: p.spiritId });
      setTimeout(() => setBubble(null), 4500);
    }
    // 교감 XP +2 (빨리 테스트 가능하게, 실운영은 tuning)
    fetch(`/api/spirits/${p.spiritId}/bond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 2 }),
    }).catch(() => {});
  }

  const placedIds = new Set(room.placedSpirits.map((p) => p.spiritId));
  const drawerList = ownedSpirits.filter((u) => !placedIds.has(u.spiritId));

  return (
    <div className="min-h-full bg-gradient-to-b from-amber-50 to-pink-50 px-4 py-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-extrabold text-[#4E342E]">🏡 내 마음의 방</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode((e) => !e)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${editMode ? 'bg-[#B56576] text-white' : 'bg-white border border-pink-200 text-[#B56576]'}`}
            >
              {editMode ? '편집 종료' : '편집'}
            </button>
          </div>
        </div>

        {/* 🆕 v83.1: CSS 일러스트 룸 — 스프라이트 없이 "방" 느낌 나도록 */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl mx-auto"
          style={{
            width: ROOM_W,
            height: ROOM_H,
            background: 'linear-gradient(180deg, #fde1c4 0%, #fac898 55%, #e0a876 55.1%, #c88a5f 100%)',
          }}
        >
          {/* 벽지 — 도트 패턴 */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none"
            style={{
              height: '55%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1.5px)',
              backgroundSize: '18px 18px',
              opacity: 0.6,
            }}
          />

          {/* 바닥 라인 (마루) */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: '55%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.15), transparent)',
            }}
          />
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: '55%',
              height: '45%',
              background: 'repeating-linear-gradient(90deg, transparent 0 54px, rgba(0,0,0,0.08) 54px 55px)',
              opacity: 0.7,
            }}
          />

          {/* 창문 — 하늘/구름 */}
          <div
            className="absolute"
            style={{
              top: 24,
              right: 22,
              width: 78,
              height: 90,
              borderRadius: 8,
              background: 'linear-gradient(180deg, #8ec5ff 0%, #c3e0ff 60%, #fff9e6 100%)',
              border: '4px solid #8b5e3c',
              boxShadow: 'inset 0 0 0 2px #fff, 0 4px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            {/* 십자 창살 */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[3px] bg-[#8b5e3c]" />
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-[#8b5e3c]" />
            {/* 구름 */}
            <motion.div
              animate={{ x: [-20, 100] }}
              transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
              className="absolute top-3 left-0 text-[14px] opacity-70"
            >
              ☁️
            </motion.div>
            <motion.div
              animate={{ x: [-40, 90] }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear', delay: 6 }}
              className="absolute top-8 left-0 text-[10px] opacity-60"
            >
              ☁️
            </motion.div>
          </div>

          {/* 액자 */}
          <div
            className="absolute"
            style={{
              top: 38,
              left: 30,
              width: 44,
              height: 34,
              background: '#fff8e1',
              border: '3px solid #8b5e3c',
              borderRadius: 2,
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            <div className="flex items-center justify-center h-full text-lg">🦊</div>
          </div>

          {/* 책장 — 색 있는 책 여러 권 */}
          <div
            className="absolute"
            style={{
              bottom: 50,
              right: 18,
              width: 60,
              height: 88,
              background: 'linear-gradient(180deg, #8b5e3c 0%, #6b4423 100%)',
              borderRadius: 3,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            }}
          >
            {/* 책들 — 여러 층 */}
            {[0, 1, 2].map((shelfIdx) => (
              <div
                key={shelfIdx}
                className="absolute left-1 right-1 flex gap-0.5 px-0.5"
                style={{
                  top: 6 + shelfIdx * 26,
                  height: 22,
                  background: '#6b4423',
                }}
              >
                {['#e85d75', '#60a5fa', '#fbbf24', '#c084fc', '#10b981'].slice(0, 4 + (shelfIdx % 2)).map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8 + (i % 2) * 2,
                      height: 22,
                      background: color,
                      borderRadius: 1,
                      boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.2)',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* 침대 — 매트리스 + 이불 + 베개 */}
          <div
            className="absolute"
            style={{
              bottom: 40,
              left: 16,
              width: 120,
              height: 52,
            }}
          >
            {/* 침대 틀 (아래) */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: 14,
                background: 'linear-gradient(180deg, #8b5e3c, #6b4423)',
                borderRadius: '4px 4px 2px 2px',
              }}
            />
            {/* 매트리스 */}
            <div
              className="absolute"
              style={{
                bottom: 10,
                left: 4,
                right: 4,
                height: 24,
                background: 'linear-gradient(180deg, #fff 0%, #f3f4f6 100%)',
                borderRadius: 4,
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}
            />
            {/* 이불 (핑크) */}
            <div
              className="absolute"
              style={{
                bottom: 12,
                left: 28,
                right: 6,
                height: 18,
                background: 'linear-gradient(135deg, #fbcfe8, #f9a8d4)',
                borderRadius: 3,
              }}
            />
            {/* 베개 */}
            <div
              className="absolute"
              style={{
                bottom: 18,
                left: 6,
                width: 24,
                height: 14,
                background: '#fff',
                borderRadius: 3,
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}
            />
          </div>

          {/* 러그 (타원) */}
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 180,
              height: 50,
              background: 'radial-gradient(ellipse, #d88c8c 0%, #b56576 60%, transparent 100%)',
              borderRadius: '50%',
              opacity: 0.6,
            }}
          />

          {/* 식물 */}
          <div
            className="absolute"
            style={{ top: 88, left: 16, width: 26, height: 44 }}
          >
            {/* 화분 */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: 14,
                background: 'linear-gradient(180deg, #c88a5f, #8b5e3c)',
                borderRadius: '3px 3px 6px 6px',
              }}
            />
            {/* 잎 */}
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xl"
              animate={{ rotate: [0, 3, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              🌿
            </motion.div>
          </div>

          {/* 책상 램프 (따뜻한 빛) */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 30,
              left: 88,
              width: 60,
              height: 100,
              background: 'radial-gradient(ellipse, rgba(255,215,130,0.4) 0%, transparent 70%)',
            }}
          />

          {/* 공중 먼지 파티클 (분위기) */}
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={`dust-${i}`}
              className="absolute rounded-full bg-white pointer-events-none"
              style={{
                width: 3,
                height: 3,
                left: 30 + i * 55,
                top: 100,
                opacity: 0.4,
                filter: 'blur(0.5px)',
              }}
              animate={{
                y: [0, -40, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 5 + i * 0.8,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.6,
              }}
            />
          ))}

          {/* 배치된 정령 */}
          <AnimatePresence>
            {room.placedSpirits.map((p) => {
              const sp = getSpirit(p.spiritId);
              if (!sp) return null;
              const motion$ = getSpiritMotion(p.spiritId);
              const idleAnim: any = editMode
                ? { scale: 1, opacity: 1 }
                : {
                    scale: motion$.scale ?? 1,
                    opacity: 1,
                    y: motion$.y ?? 0,
                    x: motion$.x ?? 0,
                    rotate: motion$.rotate ?? 0,
                  };
              return (
                <motion.div
                  key={p.spiritId}
                  drag={editMode}
                  dragMomentum={false}
                  dragConstraints={{ left: 0, top: 0, right: ROOM_W, bottom: ROOM_H }}
                  onDragEnd={(_e, info) => {
                    const nx = Math.max(0, Math.min(1, (p.x * ROOM_W + info.offset.x) / ROOM_W));
                    const ny = Math.max(0, Math.min(1, (p.y * ROOM_H + info.offset.y) / ROOM_H));
                    moveSpirit(p.spiritId, nx, ny);
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={idleAnim}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    y: { duration: motion$.duration, repeat: Infinity, ease: 'easeInOut' },
                    x: { duration: motion$.duration, repeat: Infinity, ease: 'easeInOut' },
                    rotate: { duration: motion$.duration, repeat: Infinity, ease: 'easeInOut' },
                    scale: editMode
                      ? { type: 'spring', stiffness: 300 }
                      : { duration: motion$.duration, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  onClick={() => handleSpiritTap(p)}
                  className="absolute cursor-pointer select-none z-10"
                  style={{
                    left: p.x * ROOM_W - 18,
                    top: p.y * ROOM_H - 18,
                    width: 36,
                    height: 36,
                    fontSize: 28,
                    textAlign: 'center',
                    lineHeight: '36px',
                    filter: `drop-shadow(0 2px 4px ${sp.themeColor}88)`,
                  }}
                >
                  {sp.emoji}
                  {editMode && (
                    <div className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-black">
                      ×
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 대사 말풍선 */}
          <AnimatePresence>
            {bubble && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute z-20 px-3 py-1.5 rounded-2xl bg-white shadow-lg border border-pink-200 text-[11px] font-bold text-[#4E342E] max-w-[180px]"
                style={{ left: Math.max(20, Math.min(ROOM_W - 180, bubble.x - 90)), top: Math.max(20, bubble.y - 60) }}
              >
                {bubble.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 상호작용 말풍선 */}
          <AnimatePresence>
            {interactionBubble && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-3 left-3 right-3 z-20 p-2 rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-purple-200"
              >
                <div className="text-[9px] font-bold text-purple-400 mb-0.5">💫 정령들끼리 대화</div>
                <div className="text-[10px] text-[#4E342E] leading-relaxed">
                  <div>— {interactionBubble.a}</div>
                  <div className="opacity-70 ml-3">— {interactionBubble.b}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 배치 슬롯 표시 */}
        <div className="mt-3 text-center text-[11px] text-[#6D4C41]">
          {room.placedSpirits.length} / 15 마리 배치됨
        </div>

        {/* 서랍장 — 미배치 정령 */}
        <div className="mt-3">
          <button
            onClick={() => setShowDrawer((s) => !s)}
            className="w-full py-2 rounded-2xl bg-white border-2 border-pink-200 text-[12px] font-bold text-[#B56576]"
          >
            {showDrawer ? '서랍 닫기 ↑' : `서랍 열기 — 미배치 ${drawerList.length}마리 ↓`}
          </button>
          <AnimatePresence>
            {showDrawer && drawerList.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 grid grid-cols-6 gap-2 overflow-hidden"
              >
                {drawerList.map((u) => {
                  const sp = getSpirit(u.spiritId);
                  if (!sp) return null;
                  return (
                    <button
                      key={u.spiritId}
                      onClick={() => addSpirit(u.spiritId)}
                      className="aspect-square rounded-xl bg-white border border-pink-100 flex flex-col items-center justify-center text-[20px] active:scale-95 shadow-sm"
                    >
                      {sp.emoji}
                      <div className="text-[7px] font-bold text-[#6D4C41]">Lv.{u.bondLv}</div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
