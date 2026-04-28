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
import { getSpiritCharImg } from '@/data/spirit-sprites';
import type { RoomState } from '@/types/room.types';
import type { UserSpirit, SpiritId } from '@/types/spirit.types';

import RoomFrame from '@/components/room/RoomFrame';
import AmbientFireflies from '@/components/room/AmbientFireflies';
import Drawer3D from '@/components/room/Drawer3D';
import SpiritSlot from '@/components/room/SpiritSlot';
import EditFab from '@/components/room/EditFab';
import DexFab from '@/components/room/DexFab';
import DexModal from '@/components/dex/DexModal';
import { SPIRITS } from '@/data/spirits';

/**
 * 🆕 v83.1: Spirit personality-based idle motion.
 * 각 정령이 성격에 맞게 방에서 놀고 있는 느낌.
 */

const ROOM_W = 320;
const ROOM_H = 480;

export default function RoomPage() {
  const [ownedSpirits, setOwnedSpirits] = useState<UserSpirit[]>([]);
  const [room, setRoom] = useState<RoomState>({ placedSpirits: [], furniture: {}, theme: 'default' });
  const [loaded, setLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showDex, setShowDex] = useState(false);
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

  const placedIds = new Set(room.placedSpirits.map((p) => p.spiritId));
  const drawerList = ownedSpirits.filter((u) => !placedIds.has(u.spiritId));
  const drawerLabel = `정령 · ${drawerList.length}`;
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

          {/* FAB 2종: 편집 + 도감 */}
          <div className="flex items-center gap-2">
            <DexFab
              onOpen={() => setShowDex(true)}
              ownedCount={ownedSpirits.length}
              totalCount={SPIRITS.length}
            />
            <EditFab editMode={editMode} onToggle={() => setEditMode((e) => !e)} />
          </div>
        </div>

        {/* 방 — 호두나무 프레임 + 황동 라이너 */}
        <RoomFrame width={ROOM_W} height={ROOM_H}>
          {/* 배경 이미지 (방 안쪽) */}
          <div
            className="absolute inset-0"
            style={{
              width: ROOM_W,
              height: ROOM_H,
              backgroundImage: 'url(/ui/room_bg.webp)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#fac898',
            }}
          />

          {/* 반딧불 파티클 */}
          <AmbientFireflies count={6} width={ROOM_W} height={ROOM_H} />

          {/* 배치된 정령 */}
          <AnimatePresence>
            {room.placedSpirits
              .filter((p, i, arr) => arr.findIndex((q) => q.spiritId === p.spiritId) === i)
              .map((p) => {
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
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    onClick={() => editMode && removeSpirit(p.spiritId)}
                    className="absolute select-none z-30"
                    style={{
                      left: p.x * ROOM_W - 18,
                      top: p.y * ROOM_H - 18,
                      width: 36,
                      height: 36,
                      fontSize: 28,
                      textAlign: 'center',
                      lineHeight: '36px',
                      filter: `drop-shadow(0 2px 4px ${sp.themeColor}88)`,
                      cursor: editMode ? 'pointer' : 'default',
                    }}
                  >
                    {getSpiritCharImg(sp.id)
                      ? <img src={getSpiritCharImg(sp.id)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
                      : sp.emoji
                    }
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
                    spirit={sp}
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

      {/* 🆕 v85.3: 정령 도감 모달 */}
      <DexModal
        isOpen={showDex}
        onClose={() => setShowDex(false)}
        owned={ownedSpirits}
      />
    </div>
  );
}
