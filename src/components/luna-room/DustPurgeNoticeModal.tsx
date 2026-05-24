'use client';

/**
 * v118: DustPurgeNoticeModal
 *
 * 룸 진입 시 1회 표시되는 안내 모달.
 * "쓸모없던 잔물결을 정리해뒀어. 대신 도감 조각이라는 새 보상이 생겼어"
 *
 * 라이프사이클:
 *  - mount 시 GET /api/luna-room/notices/dust-purge → shouldShow 면 표시
 *  - "알겠어" 클릭 시 POST → dust_purge_announced_at 갱신, 모달 닫힘
 *  - 한번 닫으면 다시 나타나지 않음
 *
 * LunaRoomDiorama 안에 무조건 <DustPurgeNoticeModal /> 한 줄만 추가하면 됨.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DustPurgeNoticeModal() {
  const [open, setOpen] = useState(false);
  const [acking, setAcking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/luna-room/notices/dust-purge');
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled && d.shouldShow) {
          // 1초 정도 딜레이 후 모달 — 룸 첫 로딩이 끝난 뒤 보이도록
          setTimeout(() => { if (!cancelled) setOpen(true); }, 900);
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function acknowledge() {
    if (acking) return;
    setAcking(true);
    try {
      await fetch('/api/luna-room/notices/dust-purge', { method: 'POST' });
    } catch { /* silent */ }
    setOpen(false);
    setAcking(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[280] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed inset-x-6 z-[281] flex justify-center"
            style={{ top: '20%' }}
          >
            <div
              className="max-w-sm w-full p-6 rounded-3xl"
              style={{
                background: 'linear-gradient(180deg, #fef9f3 0%, #ffe8d8 100%)',
                border: '1.5px solid rgba(212,175,55,0.55)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.45), 0 0 60px rgba(251,191,36,0.18)',
              }}
            >
              {/* 헤더 일러스트 */}
              <div className="text-center mb-3">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', damping: 18 }}
                  className="text-[44px] mb-1"
                >
                  ✨🧩
                </motion.div>
                <div className="text-[13.5px] font-black tracking-wide text-[#3a2418]">
                  가방을 정리했어
                </div>
              </div>

              {/* 본문 */}
              <div className="space-y-2.5 mb-5 text-[#3a2418]">
                <p className="text-[11.5px] leading-relaxed text-center"
                  style={{ fontFamily: 'var(--font-handwrite-soft)' }}
                >
                  &ldquo;가챠 잔물결&rdquo; 같이 쓸 데 없던 부산물 아이템 정리해뒀어.
                </p>
                <div className="p-3 rounded-2xl"
                  style={{ background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.25)' }}
                >
                  <div className="text-[10px] font-black text-purple-700 tracking-widest mb-1 flex items-center gap-1">
                    <span>🧩</span><span>대신 — 도감 조각</span>
                  </div>
                  <div className="text-[11px] text-purple-900 leading-relaxed">
                    이제 가챠 부산물은 <b>도감 조각</b>으로 모여. 10개 모이면 도감 페이지 하나가 영구적으로 열려.
                  </div>
                </div>
                <div className="p-3 rounded-2xl"
                  style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  <div className="text-[10px] font-black text-emerald-700 tracking-widest mb-1 flex items-center gap-1">
                    <span>🍃</span><span>새 소모품</span>
                  </div>
                  <div className="text-[11px] text-emerald-900 leading-relaxed">
                    똑똑한 루나 포션 · 솔직한 루나 칩 · 깊은 공감 렌즈 — 진짜 효과 있는 소모품들이 새로 들어왔어.
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={acknowledge}
                disabled={acking}
                className="w-full py-3 rounded-2xl font-bold text-[12.5px] text-white active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.30)',
                }}
              >
                {acking ? '닫는 중…' : '알겠어'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
