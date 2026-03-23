import React from 'react';
import { motion } from 'framer-motion';

export interface SessionPreviewV2 {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'crisis';
  session_summary: string | null;
  locked_scenario: string | null;
  current_phase_v2: string;
  turn_count: number;
  emotion_start: number | null;
  emotion_end: number | null;
  emotion_baseline: number | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  is_archived: boolean;
  created_at: string;
  ended_at: string | null;
}

interface SessionCardProps {
  session: SessionPreviewV2;
  onClick: () => void;
  onArchive?: (e: React.MouseEvent) => void;
}

// 헬퍼: 감정 점수 -> 이모지
function getEmotionEmoji(score: number | null) {
  if (score === null || score === undefined) return '💭';
  if (score <= 2) return '😢';
  if (score <= 4) return '😟';
  if (score === 5) return '😐';
  if (score <= 7) return '🙂';
  if (score <= 9) return '😊';
  return '🥰';
}

// 헬퍼: 시나리오 라벨/아이콘
function getScenarioMeta(scenario: string | null) {
  const meta: Record<string, { label: string; icon: string; color: string }> = {
    READ_AND_IGNORED: { label: '읽씹 상황', icon: '📱', color: 'bg-blue-50 text-blue-600' },
    GHOSTING: { label: '잠수 이별', icon: '👻', color: 'bg-slate-100 text-slate-600' },
    JEALOUSY_CONFLICT: { label: '질투/갈등', icon: '🔥', color: 'bg-red-50 text-red-500' },
    BREAKUP_CONTEMPLATION: { label: '이별 고민', icon: '💔', color: 'bg-rose-50 text-rose-500' },
    COMMUNICATION_BREAKDOWN: { label: '소통 단절', icon: '🔇', color: 'bg-zinc-100 text-zinc-500' },
    TRUST_ISSUES: { label: '신뢰 문제', icon: '🕵️', color: 'bg-purple-50 text-purple-600' },
    GENERAL: { label: '연애 고민', icon: '💜', color: 'bg-pink-50 text-pink-500' },
  };
  return meta[scenario || 'GENERAL'] || meta['GENERAL'];
}

// 헬퍼: Phase 인덱스
function getPhaseProgress(phase: string) {
  const phases = ['HOOK', 'MIRROR', 'BRIDGE', 'SOLVE', 'EMPOWER'];
  const idx = phases.indexOf(phase);
  return idx >= 0 ? idx + 1 : 1; // 1 to 5
}

export function SessionCard({ session, onClick, onArchive }: SessionCardProps) {
  const { label, icon, color } = getScenarioMeta(session.locked_scenario);
  
  // 시간 포맷
  const timeDate = new Date(session.last_message_at || session.created_at);
  const isToday = new Date().toDateString() === timeDate.toDateString();
  const timeStr = timeDate.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });

  // Progress 도트 생성 (● ● ○ ○ ○)
  const steps = 5;
  const currentStep = getPhaseProgress(session.current_phase_v2);
  
  // 감정 변화
  const eStart = getEmotionEmoji(session.emotion_start);
  const eEnd = getEmotionEmoji(session.status === 'completed' ? session.emotion_end : (session.emotion_baseline ?? session.emotion_start));
  const hasEmotionChange = eStart !== '💭' && eEnd !== '💭' && session.turn_count > 1;

  // 본문 (요약이 있으면 요약, 없으면 마지막 메시지)
  const isCompleted = session.status === 'completed';
  const bodyText = (isCompleted && session.session_summary) 
    ? session.session_summary 
    : (session.last_message_preview || '진행 중인 상담이 없습니다.');

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all group relative overflow-hidden cursor-pointer"
    >
      {/* 헤더: 시나리오 태그 & 생성 시간 */}
      <div className="flex justify-between items-center mb-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${color} max-w-fit`}>
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-bold leading-none mt-0.5">{label}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {session.status === 'completed' && (
            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full">
              상담 완료
            </span>
          )}
          <span className="text-[11px] font-medium text-gray-400">
            {timeStr}
          </span>
        </div>
      </div>

      {/* 본문: 내용 미리보기 */}
      <p className={`text-[15px] leading-snug mb-4 ${isCompleted ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
        {bodyText.length > 60 ? bodyText.slice(0, 60) + '...' : bodyText}
      </p>

      {/* 풋터: 감정, 진행률, 액션 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        
        {/* 감정 트레일 및 턴 수 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
            {hasEmotionChange ? (
              <>
                <span className="text-sm">{eStart}</span>
                <span className="text-gray-300 text-[10px]">➔</span>
                <span className="text-sm">{eEnd}</span>
              </>
            ) : (
              <span className="text-sm">{icon === '💭' ? eStart : icon}</span>
            )}
          </div>
          <span className="text-xs font-bold text-gray-500">
            {session.turn_count}턴
          </span>
        </div>

        {/* 진행률 도트 */}
        <div className="flex items-center gap-1">
          {Array.from({ length: steps }).map((_, i) => (
            <div 
              key={i} 
              className={`w-1.5 h-1.5 rounded-full ${i < currentStep ? 'bg-pink-400' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {/* 호버 시 나타나는 보관/삭제 버튼 영역 (선택사항) */}
      {onArchive && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={onArchive}
             className="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200"
             title="보관하기"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-2 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm4 4a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
             </svg>
           </button>
        </div>
      )}
    </motion.div>
  );
}
