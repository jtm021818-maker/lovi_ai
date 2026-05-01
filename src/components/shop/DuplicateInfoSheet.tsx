'use client';

import { motion, AnimatePresence } from 'framer-motion';

const RARITY_DATA = [
  {
    rarity: 'N', label: '일반', xp: 10, overflow: 5,
    color: '#b0bec5',
    glow: 'rgba(176,190,197,0.35)',
    bg: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
  },
  {
    rarity: 'R', label: '레어', xp: 25, overflow: 12,
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.4)',
    bg: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
  },
  {
    rarity: 'SR', label: '슈퍼레어', xp: 60, overflow: 30,
    color: '#d8b4fe',
    glow: 'rgba(192,132,252,0.5)',
    bg: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
  },
  {
    rarity: 'UR', label: '울트라레어', xp: 120, overflow: 60,
    color: '#fde68a',
    glow: 'rgba(251,191,36,0.5)',
    bg: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ec4899 100%)',
  },
  {
    rarity: 'L', label: '전설', xp: 250, overflow: 125,
    color: '#67e8f9',
    glow: 'rgba(6,182,212,0.6)',
    bg: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #ec4899 100%)',
  },
] as const;

const BOND_LEVELS = [
  { lv: 1, xp: 0,    label: '처음 만남' },
  { lv: 2, xp: 100,  label: '친해지기' },
  { lv: 3, xp: 300,  label: '마음 열기' },
  { lv: 4, xp: 700,  label: '비밀 이야기' },
  { lv: 5, xp: 1500, label: '완전 연결' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DuplicateInfoSheet({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 블러 */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 바텀 시트 */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className="fixed bottom-0 left-0 right-0 z-[201] max-h-[88vh] overflow-y-auto rounded-t-[28px]"
            style={{ background: 'linear-gradient(180deg, #15052f 0%, #0b0219 100%)' }}
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-0">
              <div className="w-9 h-[3px] rounded-full bg-white/20" />
            </div>

            {/* 헤더 */}
            <div className="px-5 pt-4 pb-3 text-center">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-2"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fde68a', border: '1px solid rgba(251,191,36,0.25)' }}
              >
                💛 중복 보상 안내
              </div>
              <p className="text-[12px] text-white/50 leading-relaxed">
                이미 가진 정령을 뽑으면<br />
                <span className="text-white/70 font-semibold">교감 XP가 바로 올라가요</span>
              </p>
            </div>

            {/* ─── 교감 XP 테이블 ─── */}
            <div className="px-4 mb-5">
              <div className="text-[9px] font-bold text-white/30 uppercase tracking-[0.12em] mb-2 px-1">
                희귀도별 교감 XP
              </div>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
              >
                {RARITY_DATA.map((r, i) => (
                  <div
                    key={r.rarity}
                    className="flex items-center gap-3 px-4 py-[11px]"
                    style={{ borderBottom: i < RARITY_DATA.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                  >
                    {/* 희귀도 뱃지 */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                      style={{ background: r.bg, boxShadow: `0 0 14px ${r.glow}` }}
                    >
                      {r.rarity}
                    </div>

                    {/* 이름 + XP 바 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-white mb-1">{r.label}</div>
                      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(r.xp / 250) * 100}%` }}
                          transition={{ delay: i * 0.07 + 0.15, duration: 0.55, ease: [0.33, 1, 0.68, 1] }}
                          className="h-full rounded-full"
                          style={{ background: r.bg }}
                        />
                      </div>
                    </div>

                    {/* XP 수치 */}
                    <div className="text-right flex-shrink-0 w-14">
                      <div
                        className="text-[17px] font-black tabular-nums leading-none"
                        style={{ color: r.color, filter: `drop-shadow(0 0 6px ${r.glow})` }}
                      >
                        +{r.xp}
                      </div>
                      <div className="text-[9px] text-white/30 mt-0.5">XP</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 교감 레벨 구조 ─── */}
            <div className="px-4 mb-5">
              <div className="text-[9px] font-bold text-white/30 uppercase tracking-[0.12em] mb-2 px-1">
                교감 레벨 구조
              </div>
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* 막대그래프 시각화 */}
                <div className="flex items-end justify-around mb-3 h-16">
                  {BOND_LEVELS.map((bl, i) => {
                    const isMax = i === 4;
                    const heights = [20, 32, 44, 56, 64];
                    return (
                      <motion.div
                        key={bl.lv}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: heights[i], opacity: 1 }}
                        transition={{ delay: i * 0.06 + 0.3, duration: 0.4, ease: 'easeOut' }}
                        className="w-10 rounded-xl flex items-center justify-center relative"
                        style={{
                          background: isMax
                            ? 'linear-gradient(135deg, #06b6d4, #ec4899)'
                            : `rgba(255,255,255,${0.07 + i * 0.04})`,
                          boxShadow: isMax ? '0 0 16px rgba(6,182,212,0.5)' : 'none',
                          border: isMax ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <span className="text-[11px] font-black text-white">{bl.lv}</span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* XP 라벨 행 */}
                <div className="flex justify-around">
                  {BOND_LEVELS.map((bl) => (
                    <div key={bl.lv} className="text-center w-10">
                      <div className="text-[8px] text-white/30 tabular-nums leading-tight">
                        {bl.xp === 0 ? '0' : bl.xp >= 1000 ? `${bl.xp / 1000}k` : bl.xp}
                      </div>
                      <div className="text-[7px] text-white/20">XP</div>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-3 pt-3 text-center text-[10px] text-white/40 leading-relaxed"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  🔓 Lv5 달성 시 <span className="text-white/60 font-semibold">정령의 비밀 이야기</span>가 열려요
                </div>
              </div>
            </div>

            {/* ─── Lv5 오버플로우 안내 ─── */}
            <div className="px-4 mb-6">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(251,191,36,0.07)',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="text-xl flex-shrink-0 mt-0.5">💎</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-black text-yellow-300 mb-1">
                      교감 MAX(Lv5)라면?
                    </div>
                    <div className="text-[10px] text-yellow-200/55 mb-3 leading-relaxed">
                      이미 최고 교감 상태에서 중복으로 뽑으면<br />
                      XP 대신 💎 하트스톤으로 돌려받아요
                    </div>
                    {/* 오버플로우 칩 그리드 */}
                    <div className="flex flex-wrap gap-1.5">
                      {RARITY_DATA.map((r) => (
                        <div
                          key={r.rarity}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <span
                            className="text-[10px] font-black"
                            style={{ color: r.color }}
                          >
                            {r.rarity}
                          </span>
                          <span className="text-[9px] text-white/30">→</span>
                          <span className="text-[10px] font-bold" style={{ color: '#fde68a' }}>
                            +{r.overflow}
                          </span>
                          <span className="text-[9px] text-yellow-300/60">💎</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <div className="px-4 pb-10">
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl text-white/70 font-bold text-[13px] active:scale-[0.98] transition-transform"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                닫기
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
