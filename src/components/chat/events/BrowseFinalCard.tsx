'use client';

/**
 * 🏁 v85.6: BrowseFinalCard — 같이 찾기 완료 요약
 *
 * 유저가 "결정!" 눌렀거나 세션 스스로 마감된 후 보여주는 결과 카드.
 */

import { motion } from 'framer-motion';
import type { BrowseCandidate } from '@/types/engine.types';

interface Props {
  topicLabel: string;
  chosen: BrowseCandidate | null;
  shortlist: BrowseCandidate[];
  lunaWrap: string;
}

export default function BrowseFinalCard({ topicLabel, chosen, shortlist, lunaWrap }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="my-3 max-w-[92%] ml-auto mr-2 rounded-2xl overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #fff7ed 0%, #fde68a 45%, #fbcfe8 100%)',
        border: '1.5px solid rgba(236,72,153,0.35)',
        boxShadow: '0 12px 30px rgba(236,72,153,0.22)',
      }}
    >
      <div className="px-4 pt-4 pb-3 text-center">
        <div className="text-[10px] font-bold tracking-[0.25em] text-amber-800/80">DECIDED</div>
        <h3 className="mt-1 text-[16px] font-extrabold text-[#3a2418]">
          🏁 {topicLabel}
        </h3>
        <p className="mt-0.5 text-[11px] text-[#7c5738] italic">같이 골라본 결과야</p>
      </div>

      {chosen ? (
        <div
          className="mx-3 mb-3 p-4 rounded-2xl flex items-start gap-3"
          style={{
            background: `linear-gradient(135deg, #ffffff 0%, ${chosen.themeColor ?? '#ec4899'}22 100%)`,
            border: `1.5px solid ${chosen.themeColor ?? '#ec4899'}66`,
            boxShadow: `0 4px 12px ${chosen.themeColor ?? '#ec4899'}33`,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-[36px] flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, #ffffff 0%, ${chosen.themeColor ?? '#ec4899'}44 100%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7)`,
            }}
          >
            {chosen.emoji ?? '💝'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9.5px] font-black tracking-[0.2em] text-pink-700 mb-0.5">
              ✨ 최종 선택
            </div>
            <h4 className="text-[15px] font-extrabold text-[#3a2418] leading-tight">
              {chosen.title}
            </h4>
            {chosen.category && (
              <p className="mt-0.5 text-[10.5px] text-[#7c5738]">{chosen.category}</p>
            )}
            <p className="mt-1.5 text-[12px] text-[#3a2418] leading-relaxed">
              {chosen.oneLine}
            </p>
            {chosen.deepLink && (
              <a
                href={chosen.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-white/80 text-pink-700 border border-pink-300/60"
              >
                🔗 바로 가기
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="mx-3 mb-3 p-4 rounded-2xl bg-white/70 text-center text-[12px] text-[#7c5738] italic">
          이번엔 딱 맞는 게 없었나봐. 다음에 다시 찾아보자
        </div>
      )}

      {shortlist.length > 0 && (
        <div className="mx-3 mb-3 p-2.5 rounded-2xl bg-white/55">
          <div className="text-[9.5px] font-black tracking-widest text-amber-800/70 mb-1">
            💝 좋아했던 것들
          </div>
          <div className="flex flex-col gap-1">
            {shortlist.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 text-[11px] text-[#3a2418]"
              >
                <span className="text-[14px]">{c.emoji ?? '✨'}</span>
                <span className="font-semibold truncate">{c.title}</span>
                {c.category && (
                  <span className="text-[9px] text-[#a1887f] truncate">· {c.category}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-3 mb-4 p-2.5 rounded-2xl bg-pink-50/80 text-[11.5px] italic text-pink-900 text-center">
        &ldquo;{lunaWrap}&rdquo;
      </div>
    </motion.div>
  );
}
