'use client';

/**
 * 🔍 v85.7: ConversationalBrowse — 대화형 같이 찾기 UI
 *
 * 기존 카드 넘기기 UX → 루나와 티키타카 대화 느낌으로 전환.
 *
 * 한 후보마다 흐름:
 *   1) 루나 말풍선: lunaIntro ("아 이거 봤어?")
 *   2) 인라인 미니카드
 *   3) 루나 말풍선: reviewTake (리뷰 기반 톤)
 *   4) 루나 말풍선: personalTake (개인화 + 질문)
 *   5) 액션 버튼 [좋아 / 패스 / 별로 / 더 자세히]
 *   6) 유저 반응 말풍선 (오른쪽) → 루나 미니 응답 (왼쪽) → 다음 후보
 *
 * "더 자세히" → reviewSnippets 말풍선 펼침 후 다시 액션 버튼.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  BrowseSessionData,
  BrowseCandidate,
  SuggestionMeta,
} from '@/types/engine.types';
import BrowseInlineCard from './BrowseInlineCard';
import LunaSprite from '@/components/common/LunaSprite';

interface Props {
  data: BrowseSessionData;
  onSelect?: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

type Reaction = 'love' | 'skip' | 'reject';
type Stage = 'searching' | 'intro' | 'card' | 'review' | 'personal' | 'awaiting' | 'snippets' | 'reacted';
type ReactionMap = Record<string, Reaction>;

const LUNA_RESPONSES: Record<Reaction, string[]> = {
  love:  ['오 역시! 📌 저장해둘게', '그치 나도 좋더라', '오케이 이건 킵이야'],
  skip:  ['오케이, 다음 거 볼게', '음 넘어가자', '그래 다음'],
  reject: ['흠 스타일 아니었구나, 다음', '오케이 다른 거 보여줄게', '그래 이건 아니네'],
};

function pickResponse(r: Reaction): string {
  const pool = LUNA_RESPONSES[r];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================
// Luna 말풍선
// ============================================================

function LunaBubble({ text, showAvatar = true, delay = 0 }: { text: string; showAvatar?: boolean; delay?: number }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    let iv: ReturnType<typeof setInterval> | null = null;
    const startTimer = setTimeout(() => {
      iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(iv!);
      }, 32);
    }, delay * 1000);
    return () => {
      clearTimeout(startTimer);
      if (iv !== null) clearInterval(iv);
    };
  }, [text, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
      className="flex items-end gap-1.5 max-w-[88%]"
    >
      {showAvatar ? (
        <div className="shrink-0 mb-0.5">
          <LunaSprite size={28} circle />
        </div>
      ) : (
        <div className="shrink-0 w-7" />
      )}
      <div
        className="px-3 py-2 rounded-2xl rounded-bl-[4px] text-[12.5px] leading-relaxed text-[#2a1a10] min-h-[2rem]"
        style={{
          background: 'linear-gradient(180deg, #fffdf5 0%, #fff5e0 100%)',
          border: '1px solid rgba(245,158,11,0.28)',
          boxShadow: '0 2px 6px rgba(245,158,11,0.10)',
        }}
      >
        {displayed}
        {displayed.length < text.length && (
          <span className="inline-block w-1.5 h-3.5 bg-amber-400/70 rounded-sm animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </motion.div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex justify-end"
    >
      <div
        className="px-3 py-2 rounded-2xl rounded-br-[4px] text-[12.5px] font-semibold text-white max-w-[80%]"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
          boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}

// ============================================================
// 프로그레스 바
// ============================================================

function ProgressDots({ total, current, reactions, candidates }: {
  total: number;
  current: number;
  reactions: ReactionMap;
  candidates: BrowseCandidate[];
}) {
  return (
    <div className="flex items-center gap-1 px-1">
      {Array.from({ length: total }).map((_, i) => {
        const c = candidates[i];
        const r = c ? reactions[c.id] : undefined;
        const isCurrent = i === current;
        const isPast = i < current;
        let bg = 'rgba(245,158,11,0.18)';
        if (r === 'love') bg = '#ef4444';
        else if (r === 'skip') bg = 'rgba(180,140,100,0.4)';
        else if (r === 'reject') bg = 'rgba(100,100,100,0.35)';
        else if (isPast) bg = 'rgba(245,158,11,0.45)';

        return (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{
              background: bg,
              transform: isCurrent ? 'scaleY(1.6)' : 'scaleY(1)',
              boxShadow: isCurrent ? '0 0 6px rgba(245,158,11,0.5)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

// ============================================================
// 메인
// ============================================================

export default function ConversationalBrowse({ data, onSelect, disabled }: Props) {
  // 90초 이상 된 세션은 archived — 재애니메이션 없이 compact 요약만
  const isArchived = useMemo(() => {
    try {
      const ts = parseInt(data.sessionId.split('-')[1]);
      return Date.now() - ts > 90_000;
    } catch { return false; }
  }, [data.sessionId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  // BrowseSearchingLive가 이미 로딩 역할 — searching 스테이지 스킵하고 바로 intro 시작
  const [stage, setStage] = useState<Stage>('intro');
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [pendingReaction, setPendingReaction] = useState<{ reaction: Reaction; userMsg: string; lunaReply: string } | null>(null);
  const [done, setDone] = useState(false);

  const total = data.candidates.length;
  const current = data.candidates[currentIndex];
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // 바닥으로 오토 스크롤
  useEffect(() => {
    if (isArchived) return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [stage, currentIndex, pendingReaction, isArchived]);

  // 스테이지 자동 진행 타이머
  useEffect(() => {
    if (!current || done || isArchived) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    if (stage === 'intro')    timers.push(setTimeout(() => setStage('card'), 900));
    if (stage === 'card')     timers.push(setTimeout(() => setStage('review'), 850));
    if (stage === 'review')   timers.push(setTimeout(() => setStage('personal'), 950));
    if (stage === 'personal') timers.push(setTimeout(() => setStage('awaiting'), 700));

    return () => timers.forEach(clearTimeout);
  }, [stage, currentIndex, current, done, isArchived]);

  const shortlist = useMemo(
    () => data.candidates.filter((c) => reactions[c.id] === 'love'),
    [data.candidates, reactions],
  );

  // 오래된 세션 — compact 요약만 (재애니메이션 방지)
  if (isArchived) {
    return (
      <div className="my-1 ml-1 flex items-center gap-1.5 text-[11px] text-amber-700/50">
        <span>🔍</span>
        <span>{data.topicLabel} — 같이 찾아봤어</span>
      </div>
    );
  }

  function handleReact(r: Reaction) {
    if (!current || disabled) return;

    const userMsgMap: Record<Reaction, string> = {
      love:   `👍 ${current.title} 좋아`,
      skip:   `😐 패스`,
      reject: `👎 별로야`,
    };
    const userMsg = userMsgMap[r];
    const lunaReply = pickResponse(r);

    setReactions((prev) => ({ ...prev, [current.id]: r }));
    setPendingReaction({ reaction: r, userMsg, lunaReply });
    setStage('reacted');

    // 다음 후보로 800ms 후 이동, 모두 봤으면 done
    setTimeout(() => {
      setPendingReaction(null);
      if (currentIndex + 1 >= total) {
        setDone(true);
        // 최종: 좋아요 한 것 요약 후 채팅 전송
        const loved = data.candidates.filter((c) => {
          const rx = c.id === current.id ? r : reactions[c.id];
          return rx === 'love';
        });
        const summary = loved.length > 0
          ? `🏁 마음에 든 거: ${loved.map((c) => c.title).join(', ')}`
          : `🤔 오늘은 딱 끌리는 건 없었어`;
        onSelect?.(summary, {
          source: 'suggestion',
          context: {
            browseEvent: 'finish',
            sessionId: data.sessionId,
            loved: loved.map((c) => c.title),
          },
        });
      } else {
        setCurrentIndex((i) => i + 1);
        setStage('intro');
      }
    }, 2100);
  }

  function handleDecideNow() {
    if (!current || disabled) return;
    setReactions((prev) => ({ ...prev, [current.id]: 'love' }));
    setDone(true);
    onSelect?.(`🏁 ${current.title} — 이걸로 결정할래!`, {
      source: 'suggestion',
      context: {
        browseEvent: 'decide',
        sessionId: data.sessionId,
        candidateId: current.id,
        candidateTitle: current.title,
      },
    });
  }

  function handleShowSnippets() {
    setStage('snippets');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="my-3 max-w-[96%] ml-auto mr-1 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #fffbf2 0%, #fff5ec 100%)',
        border: '1px solid rgba(245,158,11,0.28)',
        boxShadow: '0 10px 26px rgba(245,158,11,0.14)',
      }}
    >
      {/* 상단 라벨 + 진행도 */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10.5px] font-bold tracking-wide text-amber-700/80">
            🔍 {data.topicLabel}
          </div>
          <div className="text-[10px] font-bold text-amber-600/70">
            {Math.min(currentIndex + 1, total)} / {total}
          </div>
        </div>
        <ProgressDots total={total} current={currentIndex} reactions={reactions} candidates={data.candidates} />
      </div>

      {/* 인트로 멘트 (세션 첫 진입 1회) */}
      {currentIndex === 0 && stage === 'intro' && (
        <div className="px-4 pt-1">
          <LunaBubble text={data.openerMsg} />
        </div>
      )}

      {/* 본문 대화 영역 */}
      <div className="px-4 pt-2 pb-3 flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {current && !done && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-2"
            >
              {/* 1. lunaIntro */}
              {(stage === 'intro' || stage === 'card' || stage === 'review' || stage === 'personal' || stage === 'awaiting' || stage === 'snippets' || stage === 'reacted') && current.lunaIntro && (
                <LunaBubble text={current.lunaIntro} />
              )}

              {/* 2. 인라인 카드 */}
              {(stage === 'card' || stage === 'review' || stage === 'personal' || stage === 'awaiting' || stage === 'snippets' || stage === 'reacted') && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <BrowseInlineCard candidate={current} />
                </motion.div>
              )}

              {/* 3. reviewTake */}
              {(stage === 'review' || stage === 'personal' || stage === 'awaiting' || stage === 'snippets' || stage === 'reacted') && current.reviewTake && (
                <LunaBubble text={current.reviewTake} showAvatar={false} />
              )}

              {/* 4. personalTake */}
              {(stage === 'personal' || stage === 'awaiting' || stage === 'snippets' || stage === 'reacted') && current.personalTake && (
                <LunaBubble text={current.personalTake} showAvatar={false} />
              )}

              {/* 4-b. reviewSnippets (더 자세히 눌렀을 때) */}
              {stage === 'snippets' && current.reviewSnippets && current.reviewSnippets.length > 0 && (
                <div className="flex flex-col gap-1 ml-9 pl-2 border-l-2 border-amber-300/50">
                  <div className="text-[10px] font-bold text-amber-700/70 tracking-wide">📝 리뷰 발췌</div>
                  {current.reviewSnippets.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.15 }}
                      className="text-[11.5px] text-[#5a3a20] italic leading-snug"
                    >
                      &ldquo;{s}&rdquo;
                    </motion.div>
                  ))}
                </div>
              )}

              {/* 5. 액션 버튼 */}
              {(stage === 'awaiting' || stage === 'snippets') && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-wrap gap-1.5 mt-1 ml-9"
                >
                  <ActionBtn label="👍 좋아"   color="#ef4444" onClick={() => handleReact('love')}   disabled={disabled} />
                  <ActionBtn label="😐 패스"   color="#a16207" onClick={() => handleReact('skip')}   disabled={disabled} />
                  <ActionBtn label="👎 별로"   color="#64748b" onClick={() => handleReact('reject')} disabled={disabled} />
                  {stage === 'awaiting' && current.reviewSnippets && current.reviewSnippets.length > 0 && (
                    <ActionBtn label="💬 더 자세히" color="#d97706" onClick={handleShowSnippets} ghost disabled={disabled} />
                  )}
                  <ActionBtn label="🏁 이걸로 결정" color="#16a34a" onClick={handleDecideNow} ghost disabled={disabled} />
                </motion.div>
              )}

              {/* 6. 유저 반응 + 루나 응답 */}
              {stage === 'reacted' && pendingReaction && (
                <>
                  <UserBubble text={pendingReaction.userMsg} />
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.3 }}
                  >
                    <LunaBubble text={pendingReaction.lunaReply} />
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* DONE 상태 */}
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl bg-white/70 p-3 text-center border border-amber-300/40"
          >
            <div className="text-[18px] mb-1">✨</div>
            <div className="text-[12.5px] font-bold text-[#3a2418]">
              {shortlist.length > 0
                ? `좋아했던 거 ${shortlist.length}개 — 루나가 정리할게`
                : (data.lunaClosing ?? '다 훑었어')}
            </div>
          </motion.div>
        )}

        <div ref={scrollAnchorRef} />
      </div>
    </motion.div>
  );
}

// ============================================================
// 액션 버튼
// ============================================================

function ActionBtn({ label, color, onClick, disabled, ghost }: {
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  ghost?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-full text-[11.5px] font-bold active:scale-95 transition-transform disabled:opacity-50"
      style={
        ghost
          ? {
              background: 'transparent',
              border: `1.5px solid ${color}`,
              color,
            }
          : {
              background: color,
              color: 'white',
              boxShadow: `0 2px 8px ${color}44`,
            }
      }
    >
      {label}
    </button>
  );
}
