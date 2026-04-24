'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';

/**
 * 🆕 ACE v4: 루나의 작전회의 (LUNA_STRATEGY)
 *
 * "친한 누나가 관점 전환 끝나고 작전 짜자고 부르는 순간"
 *
 * 핵심 UX:
 * - 추상적 성격(쿨/솔직/과감) 대신 "클릭하면 뭘 하는지" 명확한 액션 카드
 * - 💬 메시지 초안 → SOLVE에서 카톡 버전 A/B/C 생성
 * - 🎭 상황 롤플레이 → 루나가 상대 역할
 * - 🍿 연참 모드 → 객관적/재미있는 평가
 * - 🤔 다른 거 생각 중 → 유저 본인 아이디어
 *
 * 심리학:
 * - Reactance Theory: 선택권 부여 → 반발 ↓
 * - Self-Determination: 직접 선택 → 자기결정감 ↑
 * - Choice Architecture: 3개 옵션 — 결정 피로 최소화
 * - Behavioral Rehearsal (CBT): 롤플레이로 실전 전 연습
 */

// 🆕 v85.6: browse_together 추가 (같이 찾기 전략)
type StrategyType = 'message_draft' | 'roleplay' | 'panel' | 'browse_together' | 'custom';

interface StrategyAction {
  type: StrategyType;
  emoji: string;
  title: string;
  description: string;
  preview: string;
  lunaComment?: string;
}

interface LunaStrategyProps {
  event: PhaseEvent;
  onSelect: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function LunaStrategy({ event, onSelect, disabled }: LunaStrategyProps) {
  const [phase, setPhase] = useState<'choosing' | 'selected' | 'done'>('choosing');
  const [selectedType, setSelectedType] = useState<StrategyType | null>(null);

  const data = event.data as {
    opener?: string;
    situationSummary?: string;
    actions?: StrategyAction[];
    customOption?: { label: string; emoji: string };
  };

  const opener = data.opener || '자 이제 같이 준비해보자 🔥';
  const situationSummary = data.situationSummary || '지금 상황 보면, 뭔가 액션이 필요할 거 같거든';
  const actions: StrategyAction[] = data.actions ?? [
    {
      type: 'message_draft',
      emoji: '💬',
      title: '메시지 초안 같이 짜기',
      description: '걔한테 보낼 카톡 같이 만들어볼까?',
      preview: '카톡 버전 A/B/C 만들어줄게',
      lunaComment: '뭐라고 보낼지 막막하면 이거',
    },
    {
      type: 'roleplay',
      emoji: '🎭',
      title: '상황 롤플레이',
      description: '내가 걔 역할 해줄게, 한번 연습해봐',
      preview: '실제로 만나면 어떨지 미리 시뮬',
      lunaComment: '실전 전 연습이 필요할 때',
    },
    // 🆕 v85.6: 같이 찾기
    {
      type: 'browse_together',
      emoji: '🔍',
      title: '같이 찾아보기',
      description: '장소·선물·영화… 뭐든 같이 구경하며 골라보자',
      preview: '8개 뽑아서 하나씩 같이 볼게',
      lunaComment: '뭘 살지/어디 갈지 막막할 때',
    },
  ];
  // v85.1: customLabel/customEmoji 제거 — "다른 거 생각 중" 옵션 미노출
  //        (IDEA_REFINE 은 이제 작전회의 밖에서 루나 자율 발동)

  // 액션 클릭 핸들러
  const handleAction = (action: StrategyAction) => {
    setSelectedType(action.type);
    setPhase('selected');

    // 0.6초 후 onSelect (시각적 피드백 시간)
    setTimeout(() => {
      let text: string;
      switch (action.type) {
        case 'message_draft':
          text = '💬 메시지 초안 같이 짜자';
          break;
        case 'roleplay':
          text = '🎭 내가 걔 역할 해주는 거 해보자';
          break;
        case 'panel':
          text = '🍿 객관적으로 한번 정리해줘';
          break;
        case 'browse_together':
          // v85.6: 같이 찾기 — 루나가 다음 턴에 [BROWSE_READY:...] 태그 발동
          text = '🔍 같이 둘러보면서 찾아볼래';
          break;
        default:
          text = '음 다른 거 생각해볼게';
      }
      setPhase('done');
      onSelect(text, {
        source: 'luna_strategy',
        context: {
          strategyType: action.type,
          actionTitle: action.title,
          situationSummary,
        },
      });
    }, 600);
  };

  // v85.1: handleCustom 제거 — "다른 거 생각 중" 버튼 사라지면서 사용처 없음

  // 완료 상태
  if (phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 my-3 p-4 bg-gradient-to-br from-orange-50/80 to-pink-50/80 rounded-2xl border border-orange-100/60 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="text-[12px] font-bold text-orange-600">선택 완료!</span>
          <span className="text-[11px] text-gray-500">
            {selectedType === 'message_draft' && '💬 메시지 초안 모드'}
            {selectedType === 'roleplay' && '🎭 롤플레이 모드'}
            {selectedType === 'panel' && '🍿 연참 모드'}
            {selectedType === 'custom' && '🤔 너의 아이디어 듣기'}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.2 }}
      className="mx-4 my-4"
    >
      {/* 작전 보드 느낌의 카드 */}
      <div
        className="relative rounded-3xl border-2 shadow-xl overflow-hidden p-5"
        style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #fef3f2 50%, #fff5f8 100%)',
          borderColor: 'rgba(251, 146, 60, 0.4)',
        }}
      >
        {/* 작전 보드 그리드 텍스처 */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(251, 146, 60, 0.06) 24px, rgba(251, 146, 60, 0.06) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(251, 146, 60, 0.06) 24px, rgba(251, 146, 60, 0.06) 25px)',
          }}
        />

        {/* 불꽃 효과 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ left: `${15 + i * 18}%`, top: `${10 + (i % 2) * 60}%` }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [0.8, 1.2, 0.8],
                rotate: [0, 10, -10, 0],
              }}
              transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.5 }}
            >
              <span className="text-orange-300 text-xs">✨</span>
            </motion.div>
          ))}
        </div>

        {/* 헤더 */}
        <div className="relative flex items-center gap-2.5 mb-3">
          <div className="relative">
            <div
              className="w-11 h-11 flex-shrink-0 border-2 border-orange-300 overflow-hidden bg-white shadow-md"
              style={{ borderRadius: '50% 40% 60% 50% / 60% 50% 40% 50%' }}
            >
              <img src="/char_img/luna_1_event.webp" alt="루나" className="w-full h-full object-cover" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute -right-1 -top-1 text-base"
            >
              🔥
            </motion.div>
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-orange-600">🔥 같이 준비해보자</div>
            <div className="text-[10px] text-orange-500/80">어떤 방법이 끌려?</div>
          </div>
        </div>

        {/* Opener — 작전회의 소집 멘트 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative text-[14px] font-bold text-gray-800 leading-relaxed mb-2"
        >
          {opener}
        </motion.div>

        {/* Situation Summary — 상황 한 줄 정리 */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative text-[12px] text-gray-600 italic mb-4 pl-3 border-l-2 border-orange-200"
        >
          {situationSummary}
        </motion.div>

        {/* 3가지 액션 카드 */}
        <div className="relative space-y-2.5">
          {actions.map((action, idx) => {
            const isSelected = selectedType === action.type;
            const isFaded = phase === 'selected' && !isSelected;

            return (
              <motion.button
                key={action.type}
                initial={{ opacity: 0, x: -15 }}
                animate={{
                  opacity: isFaded ? 0.3 : 1,
                  x: 0,
                  scale: isSelected ? 1.02 : 1,
                }}
                transition={{ delay: 0.7 + idx * 0.12, type: 'spring', damping: 18 }}
                whileHover={!disabled && phase === 'choosing' ? { scale: 1.02, y: -2 } : {}}
                whileTap={!disabled && phase === 'choosing' ? { scale: 0.98 } : {}}
                onClick={() => phase === 'choosing' && handleAction(action)}
                disabled={disabled || phase !== 'choosing'}
                className={`w-full p-4 rounded-2xl text-left transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white shadow-xl'
                    : 'bg-white/90 backdrop-blur-sm border-2 border-orange-200/70 hover:border-orange-400 hover:shadow-md text-gray-800'
                }`}
              >
                {/* 상단: 이모지 + 타이틀 */}
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-2xl">{action.emoji}</span>
                  <span className={`text-[14px] font-bold ${isSelected ? 'text-white' : 'text-orange-700'}`}>
                    {action.title}
                  </span>
                </div>

                {/* 한 줄 설명 (루나의 톤) */}
                <div className={`text-[12px] leading-relaxed mb-2 ${isSelected ? 'text-white/95' : 'text-gray-700'}`}>
                  {action.description}
                </div>

                {/* 클릭하면 뭘 하는지 — preview (가장 중요한 부분!) */}
                <div
                  className={`text-[11px] font-semibold py-1 px-2 rounded-lg inline-block ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'
                  }`}
                >
                  → {action.preview}
                </div>

                {/* 루나 코멘트 (선택적) */}
                {action.lunaComment && (
                  <div className={`text-[10px] mt-1.5 italic ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                    {action.lunaComment}
                  </div>
                )}
              </motion.button>
            );
          })}

          {/* v85.1: 4번째 옵션 "다른 거 생각 중"(custom/IDEA_REFINE) 제거됨.
             아이디어 다듬기는 이제 작전회의 선택지가 아니라 루나가 전 Phase 에서
             맥락 보고 자율 발동하는 [IDEA_REFINE] 이벤트. 3개 액션만 노출. */}

          <div className="text-center mt-2">
            <span className="text-[9px] text-orange-400/80">🔥 원하는 방법을 골라봐 — 클릭하면 바로 시작</span>
          </div>
        </div>

        {/* 선택 완료 시 반짝 효과 */}
        <AnimatePresence>
          {phase === 'selected' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 0] }}
                transition={{ duration: 0.6 }}
                className="text-5xl"
              >
                ✨
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
