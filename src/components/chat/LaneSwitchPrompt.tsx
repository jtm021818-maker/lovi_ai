import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🆕 레인 전환 제안 칩 (루나 제안 → 유저 확인)
 *
 * 하드 락 정책상 추천↔상담 레인은 자동 전환되지 않는다(thrash 방지).
 * 대신 잠긴 레인과 좌뇌 판단이 2턴 연속 어긋나면 루나가 "레인 바꿀까?" 를 부드럽게 제안하고,
 * 유저가 [응] 을 눌러야만 실제로 전환된다. [아니] 면 닫히고 한동안 재제안하지 않는다.
 */

export interface LaneSwitchSuggestion {
  to: 'COUNSELING' | 'CASUAL' | 'ASSIST';
  from: 'COUNSELING' | 'CASUAL' | 'ASSIST' | 'HOOK';
  reason: string | null;
}

const COPY: Record<
  'COUNSELING' | 'CASUAL' | 'ASSIST',
  { emoji: string; accent: string; soft: string; border: string; question: string; yes: string; no: string }
> = {
  COUNSELING: {
    emoji: '💕',
    accent: '#ec4899',
    soft: 'rgba(252,231,243,0.96)',
    border: 'rgba(236,72,153,0.35)',
    question: '잠깐, 이거 마음부터 좀 들어줄까?',
    yes: '응 상담으로',
    no: '아니 계속 찾자',
  },
  ASSIST: {
    emoji: '🔍',
    accent: '#0ea5b7',
    soft: 'rgba(207,250,254,0.96)',
    border: 'rgba(14,165,183,0.35)',
    question: '같이 한번 찾아볼까?',
    yes: '응 같이 찾자',
    no: '아니 더 얘기할래',
  },
  CASUAL: {
    emoji: '🍃',
    accent: '#22c55e',
    soft: 'rgba(220,252,231,0.96)',
    border: 'rgba(34,197,94,0.35)',
    question: '편하게 수다로 바꿀까?',
    yes: '응 좋아',
    no: '아니 괜찮아',
  },
};

export default function LaneSwitchPrompt({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: LaneSwitchSuggestion | null;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {suggestion && (
        <motion.div
          key="lane-switch-prompt"
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ type: 'spring', damping: 18, stiffness: 240 }}
          className="mx-auto mb-2 w-fit max-w-[92%]"
          role="dialog"
          aria-label="레인 전환 제안"
        >
          {(() => {
            const c = COPY[suggestion.to];
            return (
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-2 shadow-md backdrop-blur-md"
                style={{
                  background: c.soft,
                  border: `1px solid ${c.border}`,
                  boxShadow: `0 4px 16px ${c.accent}22`,
                }}
              >
                <span className="text-base leading-none" aria-hidden>
                  {c.emoji}
                </span>
                <span
                  className="whitespace-nowrap"
                  style={{
                    fontFamily: '"Gowun Dodum", system-ui',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#374151',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {c.question}
                </span>
                <button
                  type="button"
                  onClick={onAccept}
                  className="ml-1 rounded-full px-3 py-1 text-white transition-transform active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${c.accent}, ${c.accent}cc)`,
                    fontFamily: '"Gowun Dodum", system-ui',
                    fontSize: '12px',
                    fontWeight: 800,
                    boxShadow: `0 2px 8px ${c.accent}44`,
                  }}
                >
                  {c.yes}
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-full px-2.5 py-1 transition-transform active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    fontFamily: '"Gowun Dodum", system-ui',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#6b7280',
                  }}
                >
                  {c.no}
                </button>
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
