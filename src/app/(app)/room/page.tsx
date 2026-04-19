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

        {/* 방 */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-xl mx-auto"
          style={{
            width: ROOM_W,
            height: ROOM_H,
            background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 40%, #d4a574 100%)',
          }}
        >
          {/* 가구 */}
          <div className="absolute bottom-6 left-6 text-4xl">🛏️</div>
          <div className="absolute bottom-6 right-6 text-4xl">📚</div>
          <div className="absolute top-8 right-8 text-3xl">🪟</div>
          <div className="absolute top-12 left-10 text-2xl">🌱</div>

          {/* 배치된 정령 */}
          <AnimatePresence>
            {room.placedSpirits.map((p) => {
              const sp = getSpirit(p.spiritId);
              if (!sp) return null;
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
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: editMode ? 0 : [0, -4, 0],
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    y: { duration: 2 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut' },
                    scale: { type: 'spring', stiffness: 300 },
                  }}
                  onClick={() => handleSpiritTap(p)}
                  className="absolute cursor-pointer select-none"
                  style={{
                    left: p.x * ROOM_W - 18,
                    top: p.y * ROOM_H - 18,
                    width: 36,
                    height: 36,
                    fontSize: 28,
                    textAlign: 'center',
                    lineHeight: '36px',
                    filter: `drop-shadow(0 2px 4px ${sp.themeColor}66)`,
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
