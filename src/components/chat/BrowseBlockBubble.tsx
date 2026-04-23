'use client';

/**
 * 🔍 v88: BrowseBlockBubble — 루나 "같이 찾기" 블록 메시지 렌더러
 *
 * 4가지 타입 렌더:
 *   - luna_text:       루나 말풍선 (일반 채팅과 동일한 왼쪽 노란 말풍선)
 *   - link_card:       링크 프리뷰 (말풍선 안에 작은 카드 — 클릭 시 새 창)
 *   - review_quote:    인용 문장 (세로 바 + 출처 라벨)
 *   - decision_prompt: 질문 말풍선 + 액션 버튼 그룹
 *
 * 디자인 포인트:
 *   - 기존 카드형 컨테이너 제거. 말풍선 위주.
 *   - 여러 블록이 이어지면 자연스러운 채팅 흐름 느껴지도록 avatar 는 맨 위 블록만 표시.
 */

import { motion } from 'framer-motion';
import LunaSprite from '@/components/common/LunaSprite';
import type { ChatMessage } from '@/types/chat.types';
import type { BrowseBlock } from '@/types/engine.types';

interface Props {
  message: ChatMessage;
  /** 같은 후보/세션의 바로 앞 메시지가 루나 블록이면 avatar 생략 */
  hideAvatar?: boolean;
  /** decision_prompt 버튼 클릭 핸들러 */
  onDecision?: (promptId: string, value: string, label: string, sessionId: string, candidateId?: string) => void;
  /** 이 프롬프트가 이미 해결되었는지 (버튼 비활성화용) */
  resolved?: boolean;
}

const STANCE_COLORS: Record<NonNullable<Exclude<BrowseBlock & { type: 'review_quote' }, never>['stance']>, string> = {
  pos: '#10b981',
  neg: '#ef4444',
  neutral: '#a16207',
};

function Shell({ children, hideAvatar }: { children: React.ReactNode; hideAvatar?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="flex items-end gap-1.5 max-w-[88%] my-1"
    >
      {hideAvatar ? (
        <div className="shrink-0 w-7" />
      ) : (
        <div className="shrink-0 mb-0.5">
          <LunaSprite size={28} circle />
        </div>
      )}
      <div
        className="px-3 py-2 rounded-2xl rounded-bl-[4px] text-[12.5px] leading-relaxed text-[#2a1a10]"
        style={{
          background: 'linear-gradient(180deg, #fffdf5 0%, #fff5e0 100%)',
          border: '1px solid rgba(245,158,11,0.28)',
          boxShadow: '0 2px 6px rgba(245,158,11,0.10)',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

function LinkCard({ block }: { block: Extract<BrowseBlock, { type: 'link_card' }> }) {
  const { title, url, siteName, imageUrl, category, priceHint } = block;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 py-1 px-1 -m-1 rounded-lg hover:bg-amber-50/60 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-[10.5px] text-amber-700/80 font-semibold">
          <span>📎</span>
          <span className="truncate">{siteName || '링크'}</span>
          {category && (
            <span className="px-1 rounded bg-amber-100/60 text-[9.5px]">{category}</span>
          )}
        </div>
        <div className="text-[12.5px] font-bold text-[#2a1a10] leading-tight mt-0.5 line-clamp-2">
          {title}
        </div>
        {priceHint && (
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">💸 {priceHint}</div>
        )}
      </div>
    </a>
  );
}

function ReviewQuote({ block }: { block: Extract<BrowseBlock, { type: 'review_quote' }> }) {
  const stanceColor = STANCE_COLORS[block.stance ?? 'neutral'];
  const body = (
    <div>
      <p className="text-[12.5px] italic text-[#4a3020] leading-snug">“{block.quote}”</p>
      <p className="text-[10.5px] text-amber-700/80 mt-1">
        — {block.sourceLabel}
        {block.sourceUrl && (
          <>
            {' '}
            <a
              href={block.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-amber-800"
              onClick={(e) => e.stopPropagation()}
            >
              원문 열기 →
            </a>
          </>
        )}
      </p>
    </div>
  );
  return (
    <div
      className="border-l-2 pl-2"
      style={{ borderColor: stanceColor }}
    >
      {body}
    </div>
  );
}

function DecisionButtons({
  block,
  onDecision,
  sessionId,
  candidateId,
  disabled,
}: {
  block: Extract<BrowseBlock, { type: 'decision_prompt' }>;
  onDecision?: Props['onDecision'];
  sessionId: string;
  candidateId?: string;
  disabled?: boolean;
}) {
  const styleFor = (s?: 'primary' | 'neutral' | 'danger') => {
    if (s === 'primary') return { bg: '#ef4444', fg: '#fff', shadow: '#ef444444' };
    if (s === 'danger') return { bg: '#64748b', fg: '#fff', shadow: '#64748b44' };
    return { bg: 'transparent', fg: '#a16207', shadow: 'transparent' };
  };

  return (
    <div className="flex flex-wrap gap-1.5 ml-9 my-1">
      {block.options.map((opt) => {
        const s = styleFor(opt.style);
        const ghost = opt.style !== 'primary' && opt.style !== 'danger';
        return (
          <button
            key={opt.value}
            onClick={() =>
              onDecision?.(block.promptId, opt.value, opt.label, sessionId, candidateId)
            }
            disabled={disabled}
            className="px-3 py-1.5 rounded-full text-[11.5px] font-bold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={
              ghost
                ? {
                    background: 'transparent',
                    border: `1.5px solid ${s.fg}`,
                    color: s.fg,
                  }
                : {
                    background: s.bg,
                    color: s.fg,
                    boxShadow: `0 2px 8px ${s.shadow}`,
                  }
            }
          >
            {opt.emoji ? `${opt.emoji} ` : ''}{opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function BrowseBlockBubble({ message, hideAvatar, onDecision, resolved }: Props) {
  const block = message.browseBlock;
  const ctx = message.browseContext;
  if (!block || !ctx) return null;

  switch (block.type) {
    case 'luna_text':
      return (
        <Shell hideAvatar={hideAvatar}>
          <p className="whitespace-pre-wrap">{block.text}</p>
        </Shell>
      );

    case 'link_card':
      return (
        <Shell hideAvatar={hideAvatar}>
          <LinkCard block={block} />
        </Shell>
      );

    case 'review_quote':
      return (
        <Shell hideAvatar={hideAvatar}>
          <ReviewQuote block={block} />
        </Shell>
      );

    case 'decision_prompt':
      return (
        <div>
          {block.question && (
            <Shell hideAvatar={hideAvatar}>
              <p className="whitespace-pre-wrap">{block.question}</p>
            </Shell>
          )}
          <DecisionButtons
            block={block}
            onDecision={onDecision}
            sessionId={ctx.sessionId}
            candidateId={ctx.candidateId}
            disabled={resolved}
          />
        </div>
      );

    default:
      return null;
  }
}
