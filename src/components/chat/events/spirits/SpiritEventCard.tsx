'use client';

/**
 * 🧚 v104: SpiritEventCard — 정령 카드 공통 셸
 *
 * 20개 정령 카드의 공통 외곽:
 *   - 정령 emoji + 이름 헤더
 *   - 좌측 정령 themeColor 액센트 보더
 *   - 우상단 ⏭️ 다음에 (스킵, 옵션)
 *   - 풋터 옵션 버튼 그리드 (자동 렌더 가능)
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { getSpirit } from '@/data/spirits';
import type { SpiritId } from '@/types/spirit.types';
import type { SpiritEventOption } from '@/engines/spirits/spirit-event-types';

interface SpiritEventCardProps {
  spiritId: SpiritId;
  /** 헤더 우측 라벨 (예: "⚡ 핏치 보너스") */
  headerBadge?: string;
  /** 셸 자체에서 옵션 버튼을 렌더할지 (false=자식이 직접 렌더) */
  renderOptions?: SpiritEventOption[];
  onChoose?: (value: string) => void;
  /** 우상단 skip 버튼 표시 여부. 기본 true. ice_prince 등은 false */
  showSkip?: boolean;
  onSkip?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function SpiritEventCard({
  spiritId,
  headerBadge,
  renderOptions,
  onChoose,
  showSkip = true,
  onSkip,
  disabled = false,
  className = '',
  children,
}: SpiritEventCardProps) {
  const master = getSpirit(spiritId);
  const themeColor = master?.themeColor ?? '#A78BFA';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`mx-4 my-3 relative rounded-2xl border-2 p-4 shadow-sm bg-white/70 backdrop-blur-sm ${className}`}
      style={{
        borderColor: `${themeColor}66`,
        background: `linear-gradient(135deg, ${themeColor}10, ${themeColor}05 70%, transparent)`,
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl flex-none" aria-hidden>{master?.emoji ?? '🧚'}</span>
          <span
            className="text-sm font-semibold truncate"
            style={{ color: themeColor }}
          >
            {master?.name ?? '정령'}
          </span>
        </div>
        {headerBadge && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${themeColor}1a`, color: themeColor }}
          >
            {headerBadge}
          </span>
        )}
      </div>

      {/* 본문 */}
      <div className="spirit-card-body">{children}</div>

      {/* 옵션 그리드 (자동 렌더 모드) */}
      {renderOptions && renderOptions.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {renderOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChoose?.(opt.value)}
              className={[
                'py-2 px-3 rounded-xl text-sm font-medium transition',
                'border',
                opt.style === 'primary'
                  ? 'border-transparent text-white'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]',
              ].join(' ')}
              style={
                opt.style === 'primary'
                  ? { background: themeColor, boxShadow: `0 4px 12px ${themeColor}40` }
                  : undefined
              }
            >
              <span className="mr-1">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* 우상단 skip (옵션 그리드와 별개로 추가 가능) */}
      {showSkip && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="absolute top-3 right-3 text-[11px] text-gray-400 hover:text-gray-600 transition"
          aria-label="이 카드 스킵"
        >
          ⏭️ 다음에
        </button>
      )}
    </motion.div>
  );
}
