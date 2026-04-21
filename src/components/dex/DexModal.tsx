'use client';

/**
 * 📖 v85.3: DexModal — 풀스크린 도감 모달 (진입 연출 + 컨텐츠)
 *
 * 연출:
 *   - 배경 딤 + blur
 *   - 본체는 아래에서 slide-up + 살짝 scale
 *   - 가죽/황동 프레임 (책 느낌)
 *   - 스크롤 가능한 컨텐츠 영역 (헤더 + 필터 + 그리드)
 *   - 카드 탭 시 상세 시트가 내부에서 올라옴
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SpiritMaster, UserSpirit, SpiritRarity } from '@/types/spirit.types';
import { SPIRITS } from '@/data/spirits';
import DexHeader from './DexHeader';
import DexFilters, { type DexFilterState } from './DexFilters';
import DexGrid from './DexGrid';
import SpiritDetailSheet from './SpiritDetailSheet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  owned: UserSpirit[];
}

export default function DexModal({ isOpen, onClose, owned }: Props) {
  const [filter, setFilter] = useState<DexFilterState>({
    status: 'all',
    rarities: new Set<SpiritRarity>(),
    sort: 'recent',
  });
  const [selected, setSelected] = useState<{ spirit: SpiritMaster; owned: UserSpirit | null } | null>(null);

  // ESC 로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, selected]);

  // 배경 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const masterList = useMemo<SpiritMaster[]>(() => SPIRITS, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="dex-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          style={{
            background: 'rgba(10, 5, 0, 0.65)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        >
          <motion.div
            key="dex-body"
            initial={{ y: '100%', scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: '100%', scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 28 }}
            className="relative w-full max-w-md max-h-[94vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              // 책 느낌 — 가죽 커버
              background:
                'linear-gradient(160deg, #3a2418 0%, #5a3520 40%, #3a2418 100%), repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 5px)',
              backgroundBlendMode: 'overlay',
              borderRadius: '24px 24px 0 0',
              boxShadow: [
                '0 -18px 50px rgba(0,0,0,0.5)',
                'inset 0 0 0 1px rgba(218,165,32,0.45)',
                'inset 0 2px 0 rgba(255,220,160,0.35)',
                'inset 0 -3px 6px rgba(0,0,0,0.4)',
              ].join(', '),
            }}
          >
            {/* 황동 테두리 라인 상단 */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl"
              style={{
                background: 'linear-gradient(90deg, #8f6f1c 0%, #d4af37 50%, #8f6f1c 100%)',
              }}
            />

            {/* 스크롤 영역 */}
            <div
              className="relative flex-1 overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(218,165,32,0.4) transparent',
              }}
            >
              <DexHeader spirits={masterList} owned={owned} onClose={onClose} />
              <DexFilters filter={filter} onChange={setFilter} />

              {/* 황동 구분선 */}
              <div
                className="mx-5 mb-2 h-[1px]"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(218,165,32,0.5) 50%, transparent 100%)',
                }}
              />

              <DexGrid
                spirits={masterList}
                owned={owned}
                filter={filter}
                onSelect={(spirit, own) => setSelected({ spirit, owned: own })}
              />
            </div>

            {/* 상세 시트 */}
            <SpiritDetailSheet
              spirit={selected?.spirit ?? null}
              owned={selected?.owned ?? null}
              onClose={() => setSelected(null)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
