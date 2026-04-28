'use client';

/**
 * 🧚 v83: Spirit Detail Page
 */

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getSpirit } from '@/data/spirits';
import SpiritSprite from '@/components/spirit/SpiritSprite';
import { getBondDialogue } from '@/data/bond-dialogues';
import { getBackstory } from '@/data/backstories';
import { calcLvProgress, calcNextLvXp, BOND_LV_XP_TABLE } from '@/engines/spirits/bond-engine';
import type { UserSpirit, BondLv } from '@/types/spirit.types';

export default function SpiritDetail({ params }: { params: Promise<{ spiritId: string }> }) {
  const { spiritId } = use(params);
  const spirit = getSpirit(spiritId);
  const [userSpirit, setUserSpirit] = useState<UserSpirit | null>(null);

  useEffect(() => {
    fetch('/api/spirits/list')
      .then((r) => r.json())
      .then((d) => {
        const us = (d.owned ?? []).find((s: UserSpirit) => s.spiritId === spiritId);
        setUserSpirit(us ?? null);
      })
      .catch(() => {});
  }, [spiritId]);

  if (!spirit) return <div className="p-6 text-center">정령을 찾을 수 없어요</div>;

  const bondLv = (userSpirit?.bondLv ?? 1) as BondLv;
  const progress = userSpirit ? calcLvProgress(userSpirit.bondXp, bondLv) : 0;
  const nextXp = calcNextLvXp(bondLv);
  const backstory = getBackstory(spiritId);
  const canShowBackstory = bondLv === 5 && userSpirit?.backstoryUnlocked !== false;

  return (
    <div className="min-h-full bg-gradient-to-b from-white to-pink-50/30 pb-6">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-pink-100 px-4 py-3 flex items-center gap-2">
        <Link href="/spirits" className="text-[#B56576] text-[12px]">← 도감</Link>
        <div className="flex-1 text-center text-[13px] font-bold text-[#4E342E]">{spirit.name}</div>
      </div>

      {/* 정령 카드 */}
      <div className="p-5">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative aspect-[3/4] max-w-xs mx-auto rounded-3xl shadow-xl flex flex-col items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${spirit.themeColor}cc, ${spirit.themeColor}77)`,
            boxShadow: `0 0 60px ${spirit.themeColor}55`,
          }}
        >
          <div className="flex items-center justify-center">
            <SpiritSprite spirit={spirit} size={100} playing={false} />
          </div>
          <div className="mt-4 text-white font-extrabold text-xl drop-shadow">{spirit.name}</div>
          <div className="text-white/90 text-[11px] font-bold mt-1">[{spirit.rarity}] {spirit.personality}</div>
        </motion.div>

        {/* 교감 진행 */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-bold text-[#6D4C41]">💜 교감 Lv.{bondLv}</span>
            <span className="text-[10px] text-[#A1887F]">
              {userSpirit?.bondXp ?? 0} / {nextXp ?? 'MAX'}
            </span>
          </div>
          <div className="h-2 bg-pink-100 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              className="h-full rounded-full"
              style={{ background: spirit.themeColor }}
            />
          </div>
        </div>

        {/* Lv 별 대사 */}
        <div className="mt-5">
          <div className="text-[12px] font-bold text-[#4E342E] mb-2">💬 대사</div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((lv) => {
              const lines = getBondDialogue(spiritId, lv as BondLv);
              const unlocked = bondLv >= lv;
              return (
                <div
                  key={lv}
                  className={`p-3 rounded-xl border text-[11px] ${unlocked ? 'bg-white border-pink-100' : 'bg-gray-50 border-gray-100 text-gray-300'}`}
                >
                  <div className="font-bold mb-1">Lv.{lv} {unlocked ? '✓' : '🔒'}</div>
                  {unlocked ? (
                    <div className="space-y-0.5">
                      {lines.map((l, i) => (
                        <div key={i} className="text-[#4E342E]">— {l}</div>
                      ))}
                    </div>
                  ) : (
                    <div>누적 XP {BOND_LV_XP_TABLE[lv as BondLv]} 필요</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 능력 */}
        <div className="mt-5 p-4 rounded-2xl" style={{ background: `${spirit.themeColor}15`, border: `1px solid ${spirit.themeColor}55` }}>
          <div className="text-[12px] font-bold text-[#4E342E] mb-1">⚡ 능력 · {spirit.abilityCategory}</div>
          <div className="text-[11px] text-[#6D4C41]">Lv.3+ : {spirit.abilityShort}</div>
          <div className="text-[10px] text-[#A1887F] mt-0.5">Lv.5 강화: {spirit.abilityEnhanced}</div>
        </div>

        {/* 백스토리 */}
        {backstory && (
          <div className="mt-5 p-4 rounded-2xl bg-white border border-pink-100">
            <div className="text-[12px] font-bold text-[#4E342E] mb-2">📖 백스토리</div>
            <div className="text-[11px] text-[#6D4C41] italic mb-2">{spirit.backstoryPreview}</div>
            {canShowBackstory ? (
              <div className="space-y-2 mt-3 pt-3 border-t border-pink-100">
                {backstory.paragraphs.map((p, i) => (
                  <p key={i} className="text-[11px] leading-relaxed text-[#4E342E]">{p}</p>
                ))}
                <div className="mt-3 p-2 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="text-[9px] font-bold text-purple-500 mb-0.5">세계관 조각</div>
                  <div className="text-[11px] italic text-purple-700">&ldquo;{backstory.loreFragment}&rdquo;</div>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-[10px] text-[#A1887F]">
                🔒 Lv.5 도달 시 전체 이야기 해금
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
