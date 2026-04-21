'use client';

/**
 * 🏡 v85.2: Mind Room — 고퀄 재구성 (v83 → v85.2)
 *
 * v83 → v85.2 변경:
 *   - 외부 호두나무 프레임 + 황동 라이너 + 네임플레이트
 *   - 따뜻한 햇살 조명 + 바닥 vignette 오버레이
 *   - ambient fireflies (반딧불 6개) 방 안에 떠다님
 *   - 편집 모드 토글을 원형 FAB 로 전환
 *   - 서랍 열기를 진짜 3D 서랍 튀어나오는 연출로 전환 (perspective + rotateX + translateZ)
 *   - 서랍 내부 벨벳 바닥 + 각 정령 슬롯 stagger 등장 + 호버 리프트
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSpirit } from '@/data/spirits';
import { pickBondDialogue } from '@/data/bond-dialogues';
import { getInteractions, pickRandomInteraction } from '@/data/interactions';
import type { RoomState, PlacedSpirit } from '@/types/room.types';
import type { UserSpirit, SpiritId, BondLv } from '@/types/spirit.types';

// 신규 v85.2 구성요소
import RoomFrame from '@/components/room/RoomFrame';
import AmbientFireflies from '@/components/room/AmbientFireflies';
import Drawer3D from '@/components/room/Drawer3D';
import SpiritSlot from '@/components/room/SpiritSlot';
import EditFab from '@/components/room/EditFab';

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
    case 'fire_goblin':    return { scale: [1, 1.15, 1], rotate: [-3, 3, -3], duration: 0.8 };
    case 'moon_rabbit':    return { y: [0, -14, 0], duration: 1.4 };
    case 'cherry_leaf':    return { rotate: [-5, 5, -5], y: [0, -3, 0], duration: 3.2 };
    case 'tear_drop':      return { y: [0, 4, 0], scale: [1, 0.95, 1], duration: 2 };
    case 'cloud_bunny':    return { y: [0, -6, 0], x: [0, 3, -3, 0], duration: 3.8 };
    case 'wind_sprite':    return { x: [-6, 6, -6], rotate: [-8, 8, -8], duration: 1.6 };
    case 'seed_spirit':    return { scale: [1, 1.08, 1], duration: 2.4 };
    case 'drum_imp':       return { y: [0, -4, 0, -4, 0], duration: 0.6 };
    case 'book_worm':      return { rotate: [0, 2, 0], duration: 3.5 };
    case 'letter_fairy':   return { y: [0, -5, 0], rotate: [-3, 3, -3], duration: 2.6 };
    case 'clown_harley':   return { rotate: [0, 360], duration: 4 };
    case 'rose_fairy':     return { y: [0, -4, 0], scale: [1, 1.05, 1], duration: 2.2 };
    case 'ice_prince':     return { y: [0, -2, 0], duration: 4 };
    case 'forest_mom':     return { scale: [1, 1.03, 1], duration: 5 };
    case 'lightning_bird': return { x: [0, 8, -8, 0], y: [0, -3, 3, 0], duration: 0.5 };
    case 'butterfly_meta': return { x: [0, 8, 0, -8, 0], y: [0, -8, 0, -8, 0], rotate: [0, 10, -10, 0], duration: 3.5 };
    case 'peace_dove':     return { y: [0, -5, 0], x: [0, 3, -3, 0], duration: 2.8 };
    case 'book_keeper':    return { rotate: [0, -3, 3, 0], duration: 4 };
    case 'queen_elena':    return { scale: [1, 1.06, 1], y: [0, -2, 0], duration: 3 };
    case 'star_dust':      return { scale: [1, 1.2, 0.9, 1], rotate: [0, 180, 360], duration: 2 };
    case 'guardian_eddy':  return { scale: [1, 1.1, 1], y: [0, -3, 0], duration: 3 };
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
    if (room.placedSpirits.some((p) => p.spiritId === id)) return;
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
    fetch(`/api/spirits/${p.spiritId}/bond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 2 }),
    }).catch(() => {});
  }

  const placedIds = new Set(room.placedSpirits.map((p) => p.spiritId));
  const drawerList = ownedSpirits.filter((u) => !placedIds.has(u.spiritId));
  const drawerLabel = `SPIRITS · ${drawerList.length}`;
  const drawerClosedHint = drawerList.length === 0
    ? '지금은 비어있어'
    : `${drawerList.length}마리 자고 있어 — 톡, 열어봐`;
  const drawerOpenHint = '톡 눌러서 방에 데려다 놔';

  return (
    <div
      className="min-h-full px-4 py-5"
      style={{
        background: 'linear-gradient(180deg, #fdf6e8 0%, #ffe8d8 45%, #ffd7e3 100%)',
      }}
    >
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-extrabold text-[#4E342E] flex items-center gap-2 leading-tight">
              <span>🏡</span>
              <span>내 마음의 방</span>
            </h1>
            <p className="mt-0.5 text-[11px] text-[#8d6145] italic">
              너랑 만난 정령들이 사는 곳
            </p>
          </div>

          {/* 편집 FAB */}
          <EditFab editMode={editMode} onToggle={() => setEditMode((e) => !e)} />
        </div>

        {/* 방 — 호두나무 프레임 + 황동 라이너 */}
        <RoomFrame width={ROOM_W} height={ROOM_H}>
          {/* 배경 이미지 (방 안쪽) */}
          <div
            className="absolute inset-0"
            style={{
              width: ROOM_W,
              height: ROOM_H,
              backgroundImage: 'url(/ui/room_bg.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#fac898',
            }}
          />

          {/* 반딧불 파티클 */}
          <AmbientFireflies count={6} width={ROOM_W} height={ROOM_H} />

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
                  className="absolute cursor-pointer select-none z-30"
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
                    <div className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-black shadow-md">
                      ×
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 빈 방 엠프티 스테이트 */}
          {loaded && room.placedSpirits.length === 0 && (
            <div
              className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
            >
              <div className="text-[38px] opacity-60 mb-2">🕯️</div>
              <p className="text-[12px] font-bold text-[#4E342E]/80">
                아직 이곳은 비어있어
              </p>
              <p className="mt-1 text-[10px] text-[#7a5235]/70 leading-relaxed">
                대화 속에서 만난 정령이<br />
                여기로 살러 올 거야
              </p>
            </div>
          )}

          {/* 대사 말풍선 */}
          <AnimatePresence>
            {bubble && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute z-40 px-3 py-1.5 rounded-2xl text-[11px] font-bold text-[#4E342E] max-w-[180px]"
                style={{
                  left: Math.max(20, Math.min(ROOM_W - 180, bubble.x - 90)),
                  top: Math.max(20, bubble.y - 60),
                  background: 'linear-gradient(180deg, #fffdf5 0%, #fff5e0 100%)',
                  border: '1px solid rgba(212,175,55,0.5)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.7)',
                }}
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
                className="absolute top-3 left-3 right-3 z-40 p-2.5 rounded-2xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,253,245,0.96) 0%, rgba(255,240,220,0.96) 100%)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(212,175,55,0.45)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.7)',
                }}
              >
                <div className="text-[9px] font-bold text-purple-500 mb-0.5 tracking-wider">
                  💫 정령들끼리 대화
                </div>
                <div className="text-[10px] text-[#4E342E] leading-relaxed">
                  <div>— {interactionBubble.a}</div>
                  <div className="opacity-70 ml-3">— {interactionBubble.b}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </RoomFrame>

        {/* 배치 슬롯 카운터 */}
        <div className="mt-4 text-center text-[11px] text-[#6D4C41] font-medium tracking-wide">
          <span className="font-bold text-[#B56576]">{room.placedSpirits.length}</span>
          <span className="opacity-70"> / 15 마리가 이 방에 살아</span>
        </div>

        {/* 서랍 3D */}
        <Drawer3D
          isOpen={showDrawer}
          onToggle={() => setShowDrawer((s) => !s)}
          label={drawerLabel}
          closedHint={drawerClosedHint}
          openHint={drawerOpenHint}
        >
          {drawerList.length > 0 ? (
            <div className="grid grid-cols-6 gap-2">
              {drawerList.map((u, idx) => {
                const sp = getSpirit(u.spiritId);
                if (!sp) return null;
                return (
                  <SpiritSlot
                    key={u.spiritId}
                    emoji={sp.emoji}
                    themeColor={sp.themeColor}
                    bondLv={u.bondLv}
                    name={sp.name}
                    onSelect={() => addSpirit(u.spiritId)}
                    delayIndex={idx}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-[11px] text-amber-100/75 italic">
              서랍이 텅 비었네 — 전부 방에 나와있어 ✨
            </div>
          )}
        </Drawer3D>
      </div>
    </div>
  );
}
