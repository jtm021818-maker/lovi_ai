import { motion } from 'framer-motion';
import type { PhaseEvent, InsightCardData } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface InsightCardProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function InsightCard({ event, onSelect, disabled }: InsightCardProps) {
  const data = event.data as unknown as InsightCardData;

  // "·" 기호로 이어진 pattern 문자열을 분리하여 리스트로 표시
  const patterns = data.pattern ? data.pattern.split('·').map(s => s.trim()).filter(Boolean) : [];

  // choices 개인화 (v17: events.ts에서 설정)
  const choices = data.choices ?? [
    { label: '더 자세히 들려줘', value: 'tell_more' },
    { label: '맞아! 해결책 보여줘', value: 'show_solution' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, rotate: -0.5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
      className="bg-[#faf9f5] border-[2.5px] border-slate-700 p-5 my-4 max-w-[88%] ml-auto overflow-hidden relative"
    >
      {/* 종이 텍스처 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* 헤더: 루나의 발견 노트 */}
      <div className="flex items-start gap-3 mb-4 relative z-10">
        <div className="w-9 h-9 flex-shrink-0 border-2 border-slate-700 overflow-hidden"
             style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}>
          <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
        </div>
        <div>
          <h4 className="font-extrabold text-[15px] text-slate-800 tracking-tight">
            {data.title || '루나의 발견 노트 📝'}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5"
             style={{ transform: 'rotate(-0.5deg)' }}>
            루나가 네 이야기 들으면서 메모해봤어 🦊
          </p>
        </div>
      </div>

      {/* 진단 요약 (duration) */}
      {data.duration && data.duration !== '최근 대화 기반' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-3 bg-pink-50/60 px-3.5 py-2.5 border-2 border-slate-700/20 relative z-10"
          style={{ borderRadius: '15px 225px 15px 255px/255px 15px 225px 15px', transform: 'rotate(0.5deg)' }}
        >
          <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
            📝 {data.duration}
          </p>
        </motion.div>
      )}

      {/* 발견 패턴 — 루나 메모 스타일 */}
      {patterns.length > 0 && (
        <div className="mb-4 space-y-1.5 relative z-10">
          <p className="text-[11px] font-bold text-slate-400 ml-1 mb-2"
             style={{ transform: 'rotate(-0.5deg)' }}>
            루나가 발견한 것들 ✍️
          </p>
          {patterns.map((ptn, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + (idx * 0.08), type: 'spring', stiffness: 400 }}
              className="flex items-center gap-2 pl-2"
            >
              <span className="text-pink-400 text-[10px]">●</span>
              <span className="text-[12.5px] font-bold text-slate-700">{ptn}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* 핵심 인사이트 — 루나의 궁금한 점 */}
      {data.insight && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mb-5 p-4 bg-amber-50/50 border-2 border-slate-700/15 relative z-10"
          style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', transform: 'rotate(-0.3deg)' }}
        >
          <p className="text-[13px] font-bold text-slate-800 leading-[1.7]">
            {data.insight}
          </p>
        </motion.div>
      )}

      {/* 버튼 — 손그림 스타일 */}
      <div className="flex gap-2.5 relative z-10">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => !disabled && onSelect(choices[0]?.label ?? '더 얘기할래', { source: 'insight_card' })}
          disabled={disabled}
          className={`flex-1 py-3 font-bold text-[12.5px] transition-all border-2 ${
            disabled
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white border-slate-700/30 text-slate-600 hover:bg-slate-50 active:scale-[0.98]'
          }`}
          style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}
        >
          {choices[0]?.label ?? '더 얘기할래'}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => !disabled && onSelect(choices[1]?.label ?? '해결책 보여줘', { source: 'insight_card' })}
          disabled={disabled}
          className={`flex-[1.5] py-3 font-bold text-[12.5px] transition-all border-[2.5px] ${
            disabled
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-pink-400 text-white border-slate-700 hover:bg-pink-500 active:scale-[0.98]'
          }`}
          style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px', transform: 'rotate(0.3deg)' }}
        >
          {choices[1]?.label ?? '해결책 볼래'}
        </motion.button>
      </div>
    </motion.div>
  );
}
