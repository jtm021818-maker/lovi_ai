'use client';

/**
 * 🔍 v85.6: BrowseTogether — 같이 찾기 이벤트 최상위 컨테이너
 *
 * event.type 3상태 분기:
 *   - BROWSE_SEARCHING → LunaSearching 공통 UI (topic='browse')
 *   - BROWSE_SESSION → 실제 브라우징 UX (후보 1개씩 + 반응 버튼)
 *   - BROWSE_FINAL → 최종 선택 요약 카드
 *
 * BROWSE_SESSION 동안의 상태(currentIndex, reactions, shortlist)는
 * 서버 왕복 없이 클라이언트 로컬에서만 관리.
 * 유저 반응 시 onSelect 로 자동 메시지 전송 → 루나 자연 대화 이어감.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  PhaseEvent,
  BrowseSessionData,
  BrowseSearchingData,
  BrowseFinalData,
  SuggestionMeta,
} from '@/types/engine.types';

import LunaSearching from './LunaSearching';
import BrowseProgressRail, { type ReactionMap } from './BrowseProgressRail';
import BrowseCandidateCard from './BrowseCandidateCard';
import BrowseFinalCard from './BrowseFinalCard';

interface Props {
  event: PhaseEvent;
  onSelect?: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Reaction = 'love' | 'skip' | 'reject';

const TOPIC_LABEL: Record<string, string> = {
  gift: '같이 선물 고르는 중',
  'date-spot': '같이 장소 찾는 중',
  activity: '같이 체험 고르는 중',
  movie: '같이 볼 거 찾는 중',
  anniversary: '같이 이벤트 짜는 중',
  general: '같이 둘러보는 중',
};

export default function BrowseTogether({ event, onSelect, disabled }: Props) {
  // ── SEARCHING (로딩)
  if (event.type === 'BROWSE_SEARCHING') {
    const data = event.data as unknown as BrowseSearchingData;
    return (
      <LunaSearching
        topic="browse"
        label={TOPIC_LABEL[data.topic] ?? '같이 둘러보는 중'}
        subtitle={data.topicLabel}
      />
    );
  }

  // ── FINAL (결정 결과)
  if (event.type === 'BROWSE_FINAL') {
    const data = event.data as unknown as BrowseFinalData;
    return (
      <BrowseFinalCard
        topicLabel={data.topicLabel}
        chosen={data.chosen}
        shortlist={data.shortlist}
        lunaWrap={data.lunaWrap}
      />
    );
  }

  // ── SESSION (메인 브라우징)
  const data = event.data as unknown as BrowseSessionData;
  return <SessionBody data={data} onSelect={onSelect} disabled={disabled} />;
}

// ============================================================
// Session Body — 로컬 state 로 1개씩 브라우징
// ============================================================

function SessionBody({
  data,
  onSelect,
  disabled,
}: {
  data: BrowseSessionData;
  onSelect?: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [done, setDone] = useState(false);

  const total = data.candidates.length;
  const current = data.candidates[currentIndex];
  const hasCurrent = !done && !!current;

  const shortlist = useMemo(
    () => data.candidates.filter((c) => reactions[c.id] === 'love'),
    [data.candidates, reactions],
  );

  // 반응 메시지 빌더 (채팅으로 전송)
  const buildReactionMsg = (candidate: typeof current, r: Reaction): string => {
    if (!candidate) return '';
    const name = candidate.title;
    switch (r) {
      case 'love':
        return `💝 ${name} — 이거 괜찮은데?`;
      case 'skip':
        return `🤔 ${name} — 다음꺼 볼래`;
      case 'reject':
        return `👎 ${name} — 별로야`;
    }
  };

  const handleReact = (r: Reaction) => {
    if (!current || disabled) return;
    const nextReactions: ReactionMap = { ...reactions, [current.id]: r };
    setReactions(nextReactions);

    const msg = buildReactionMsg(current, r);
    onSelect?.(msg, {
      source: 'suggestion',
      context: {
        browseEvent: 'reaction',
        sessionId: data.sessionId,
        candidateId: current.id,
        candidateTitle: current.title,
        reaction: r,
        stance: current.lunaTake.stance,
      },
    });

    // 다음 카드로
    if (currentIndex + 1 >= total) {
      // 모두 봤음 → 자동 결정 모드
      setDone(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDecide = () => {
    if (!current || disabled) return;
    // 현재 카드를 최종 선택으로 확정
    const pickName = current.title;
    onSelect?.(`🏁 ${pickName} — 이걸로 결정할래!`, {
      source: 'suggestion',
      context: {
        browseEvent: 'decide',
        sessionId: data.sessionId,
        candidateId: current.id,
        candidateTitle: current.title,
        stance: current.lunaTake.stance,
      },
    });
    setReactions({ ...reactions, [current.id]: 'love' });
    setDone(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="my-3 max-w-[94%] ml-auto mr-2 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #fffbf2 0%, #fff5ec 100%)',
        border: '1px solid rgba(245,158,11,0.28)',
        boxShadow: '0 10px 26px rgba(245,158,11,0.16)',
      }}
    >
      {/* 인트로 */}
      {currentIndex === 0 && !done && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-[12.5px] font-semibold text-[#3a2418]">
            {data.openerMsg}
          </p>
        </div>
      )}

      {/* 진행 rail */}
      <BrowseProgressRail
        candidates={data.candidates}
        currentIndex={currentIndex}
        reactions={reactions}
        topicLabel={data.topicLabel}
      />

      {/* 카드 */}
      <AnimatePresence mode="wait">
        {hasCurrent && current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pt-1 pb-3"
          >
            <BrowseCandidateCard
              candidate={current}
              indexLabel={`${currentIndex + 1} / ${total}`}
              onReact={handleReact}
              onDecide={handleDecide}
              disabled={disabled}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모두 훑었지만 아직 결정 안 했을 때 */}
      {!current && !done && (
        <div className="px-4 py-5 text-center">
          <p className="text-[12.5px] font-semibold text-[#3a2418]">
            {data.lunaClosing ?? '다 훑었어, 하나 골라볼래?'}
          </p>
          <p className="mt-1 text-[10.5px] text-[#7c5738] italic">
            좋아했던 {shortlist.length}개 중에 결정해
          </p>
        </div>
      )}

      {/* done 상태 — 미니 요약 (큰 FinalCard 는 다음 턴에 별도로) */}
      {done && (
        <div className="mx-3 mb-3 p-3 rounded-2xl bg-white/60 text-center">
          <div className="text-[14px] mb-0.5">✨</div>
          <p className="text-[12px] font-semibold text-[#3a2418]">
            다 봤어! 루나 응답 기다리는 중...
          </p>
        </div>
      )}
    </motion.div>
  );
}
