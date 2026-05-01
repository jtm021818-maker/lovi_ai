'use client';

/**
 * v102 (rev2): "내 마음의 페이지" 책 모달 (21페이지, 유저 자기-반영)
 *
 * 가공 어머니 일기 X. 각 페이지는 유저 본인의 세션/추억과 연동된 동적 본문.
 * 좌 페이지 = 본문 (resolved.body), 우 페이지 = 정령 + bridgeOneLiner + sourceLabel.
 * 미해금 페이지 = "이 비밀은 아직 너에게서 흘러나오지 않았어."
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPIRIT_REVEAL_SCHEDULE } from '@/data/spirit-reveal-schedule';
import { SPIRITS, getSpirit } from '@/data/spirits';
import SpiritSprite from '@/components/spirit/SpiritSprite';
import type { SpiritMaster } from '@/types/spirit.types';

interface FragmentResp {
  unlocked: boolean;
  resolved: {
    body: string;
    sourceLabel: string;
    bridgeOneLiner: string;
    matched: boolean;
  } | null;
}

interface Props {
  open: boolean;
  unlockedSpiritIds: string[]; // user_spirits 중 lore_unlocked = true 인 spiritId 들
  onClose: () => void;
  startSpiritId?: string;
}

const ORDERED_PAGES = SPIRIT_REVEAL_SCHEDULE
  .slice()
  .sort((a, b) => a.motherLoreOrder - b.motherLoreOrder);

export default function MyHeartPagesModal({ open, unlockedSpiritIds, onClose, startSpiritId }: Props) {
  const total = ORDERED_PAGES.length; // 21
  const initialIdx = startSpiritId
    ? Math.max(0, ORDERED_PAGES.findIndex((p) => p.spiritId === startSpiritId))
    : 0;
  const [pageIdx, setPageIdx] = useState(initialIdx);
  const [fragment, setFragment] = useState<FragmentResp['resolved']>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setPageIdx(initialIdx); }, [open, initialIdx]);

  const currentEntry = ORDERED_PAGES[pageIdx];
  const currentSpirit: SpiritMaster | undefined =
    currentEntry ? getSpirit(currentEntry.spiritId) ?? SPIRITS.find((s) => s.id === currentEntry.spiritId) : undefined;
  const isUnlocked = !!currentEntry && unlockedSpiritIds.includes(currentEntry.spiritId);

  // L3 fetch
  useEffect(() => {
    if (!open || !currentEntry || !isUnlocked) {
      setFragment(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/spirits/${currentEntry.spiritId}/fragment`)
      .then((r) => r.json() as Promise<FragmentResp>)
      .then((d) => { if (!cancelled) setFragment(d.resolved ?? null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, currentEntry, isUnlocked]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="fixed inset-0 z-[121] flex items-center justify-center p-4"
            role="dialog"
            aria-label="내 마음의 페이지"
          >
            <div
              className="relative w-full max-w-[720px] aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(180deg, #fef9f3 0%, #f5e6d0 100%)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 0 0 6px #d4af37',
              }}
            >
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/15 text-amber-900 text-sm font-bold"
                aria-label="닫기"
              >✕</button>

              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-amber-900/30" />

              {/* 좌 페이지 — 본문 */}
              <div className="absolute inset-y-6 left-6 right-1/2 pr-6 overflow-y-auto">
                <div className="text-[10px] font-black tracking-widest text-amber-700 mb-2">
                  내 마음의 페이지 · {pageIdx + 1}/{total}
                </div>
                {isUnlocked ? (
                  loading ? (
                    <div className="font-serif text-[13px] leading-7 text-amber-900/60 italic">
                      너에게서 흘러나온 결을 읽는 중…
                    </div>
                  ) : fragment ? (
                    <pre className="whitespace-pre-wrap font-serif text-[13px] leading-7 text-[#3a2418]">
                      {fragment.body}
                    </pre>
                  ) : (
                    <div className="font-serif text-[13px] leading-7 text-amber-900/40 italic">
                      읽어올 수 없어. 잠시 뒤 다시 와줘.
                    </div>
                  )
                ) : (
                  <div className="font-serif text-[13px] leading-7 text-amber-900/40 italic">
                    이 비밀은 아직 너에게서 흘러나오지 않았어.<br />
                    {currentEntry && `Day ${currentEntry.revealDay} 이후 + 정령 Lv5 + 다른 정령 ${currentEntry.loreUnlockAfter}개 풀림`}
                  </div>
                )}
              </div>

              {/* 우 페이지 — 정령 + 한 줄 재해석 */}
              <div className="absolute inset-y-6 right-6 left-1/2 pl-6 flex flex-col items-center justify-center">
                {currentSpirit && isUnlocked ? (
                  <>
                    <SpiritSprite spirit={currentSpirit} size={72} />
                    <div className="mt-3 text-center">
                      <div className="text-[11px] font-bold text-amber-900">{currentSpirit.name}</div>
                      {fragment?.bridgeOneLiner && (
                        <div className="mt-2 px-3 py-2 rounded-lg bg-white/60 border border-amber-200/60 text-[12px] italic text-[#3a2418]">
                          “{fragment.bridgeOneLiner}”
                        </div>
                      )}
                      {fragment?.sourceLabel && (
                        <div className="mt-1.5 text-[9px] text-amber-700/70">{fragment.sourceLabel}</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-amber-900/40 text-[40px] select-none">…</div>
                )}
              </div>

              {/* 페이지 네비 */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-between px-6">
                <button
                  onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
                  disabled={pageIdx <= 0}
                  className="px-3 py-1 rounded-full bg-amber-900/15 text-amber-900 text-xs font-bold disabled:opacity-30"
                >← 이전</button>
                <div className="flex gap-1 flex-wrap max-w-[60%] justify-center">
                  {ORDERED_PAGES.map((p, i) => (
                    <button
                      key={p.spiritId}
                      onClick={() => setPageIdx(i)}
                      className={`w-2 h-2 rounded-full ${
                        unlockedSpiritIds.includes(p.spiritId)
                          ? i === pageIdx ? 'bg-amber-700' : 'bg-amber-400'
                          : 'bg-amber-900/15'
                      }`}
                      aria-label={`page ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setPageIdx((p) => Math.min(total - 1, p + 1))}
                  disabled={pageIdx >= total - 1}
                  className="px-3 py-1 rounded-full bg-amber-900/15 text-amber-900 text-xs font-bold disabled:opacity-30"
                >다음 →</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
