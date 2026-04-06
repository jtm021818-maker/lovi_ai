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

// 헬퍼: 시나리오 라벨/아이콘/스타일
function getScenarioMeta(scenario: string | null) {
  const meta: Record<string, { label: string; icon: string; bg: string; border: string; badgeBg: string; badgeText: string }> = {
    READ_AND_IGNORED: { label: '읽씹 상황', icon: '📱', bg: 'bg-[#CBEBFF]', border: 'border-[#9FD9FA]', badgeBg: 'bg-white', badgeText: 'text-[#3B7A9E]' },
    GHOSTING: { label: '잠수 이별', icon: '👻', bg: 'bg-[#EAEAEA]', border: 'border-[#CCCCCC]', badgeBg: 'bg-white', badgeText: 'text-[#5C5C5C]' },
    JEALOUSY_CONFLICT: { label: '질투/갈등', icon: '🔥', bg: 'bg-[#FFE6E6]', border: 'border-[#FFC7C7]', badgeBg: 'bg-white', badgeText: 'text-[#D94F4F]' },
    BREAKUP_CONTEMPLATION: { label: '이별 고민', icon: '💔', bg: 'bg-[#EBDDFB]', border: 'border-[#D9CBE7]', badgeBg: 'bg-white', badgeText: 'text-[#D04050]' },
    COMMUNICATION_BREAKDOWN: { label: '소통 단절', icon: '🔇', bg: 'bg-[#EAEAEA]', border: 'border-[#CCCCCC]', badgeBg: 'bg-white', badgeText: 'text-[#5C5C5C]' },
    TRUST_ISSUES: { label: '신뢰 문제', icon: '🕵️', bg: 'bg-[#D6C7F1]', border: 'border-[#BCAAE8]', badgeBg: 'bg-white', badgeText: 'text-[#684C9C]' },
    GENERAL: { label: '연애 고민', icon: '💜', bg: 'bg-[#FBE4EF]', border: 'border-[#F1CDDF]', badgeBg: 'bg-white', badgeText: 'text-[#B8407B]' },
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
  const { label, icon, bg, border, badgeBg, badgeText } = getScenarioMeta(session.locked_scenario);
  
  // 시간 포맷
  const timeDate = new Date(session.last_message_at || session.created_at);
  const timeStr = timeDate.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }).replace('오전', '오전').replace('오후', '오후');

  // Progress 도트 생성 (● ● ○ ○ ○)
  const steps = 6;
  const currentStep = getPhaseProgress(session.current_phase_v2) + 1; // Visual tweak matches the image's 6 dots
  
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
      className={`w-full text-left p-4 rounded-[20px] shadow-sm relative overflow-hidden transition-all group cursor-pointer border-2 ${bg} ${border}`}
    >
      {/* 장식용 별 */}
      <div className="absolute top-2 left-2 text-[#FFD700] opacity-50 text-[10px]">★</div>
      <div className="absolute bottom-8 left-4 text-[#FFB6C1] opacity-50 text-[12px]">★</div>
      <div className="absolute top-6 right-10 text-[#FFD700] opacity-30 text-[14px]">✦</div>
      
      {/* 풋터 장식 (발바닥 문양 - 우하단) */}
      <div className="absolute -bottom-2 -right-2 opacity-20 transform rotate-[-15deg] pointer-events-none">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-purple-600">
          <path d="M12,2A3,3 0 0,0 9,5C9,6.66 10.34,8 12,8C13.66,8 15,6.66 15,5A3,3 0 0,0 12,2M7.5,6A2.5,2.5 0 0,0 5,8.5C5,9.88 6.12,11 7.5,11C8.88,11 10,9.88 10,8.5A2.5,2.5 0 0,0 7.5,6M16.5,6A2.5,2.5 0 0,0 14,8.5C14,9.88 15.12,11 16.5,11C17.88,11 19,9.88 19,8.5A2.5,2.5 0 0,0 16.5,6M12,10.5C9.36,10.5 7.15,11.85 6.14,13.88L5.3,15.65C4.94,16.42 5.09,17.34 5.72,17.92L6.15,18.33C6.73,18.89 7.63,19.06 8.35,18.7L9.84,17.95C10.53,17.6 11.26,17.43 12,17.43C12.74,17.43 13.47,17.6 14.16,17.95L15.65,18.7C16.37,19.06 17.27,18.89 17.85,18.33L18.28,17.92C18.91,17.34 19.06,16.42 18.7,15.65L17.86,13.88C16.85,11.85 14.64,10.5 12,10.5" />
        </svg>
      </div>

      {/* 헤더: 시나리오 태그 & 생성 시간 */}
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm ${badgeBg}`}>
          <span className="text-sm">{icon}</span>
          <span className={`text-[13px] font-extrabold ${badgeText}`}>{label}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {session.status === 'completed' && (
            <span className="px-2 py-0.5 bg-[#FFF2B2] text-[#5C4D2E] text-[11px] font-extrabold rounded-full">
              상담 완료
            </span>
          )}
          <span className="text-[14px] font-[800] text-[#3E3852]">
            {timeStr}
          </span>
        </div>
      </div>

      {/* 본문: 내용 미리보기 */}
      <p className={`text-[16px] leading-snug mb-5 relative z-10 ${isCompleted ? 'text-[#3E3852] font-black' : 'text-[#3E3852] font-[500]'}`}>
        {bodyText.length > 60 ? bodyText.slice(0, 60) + '...' : bodyText}
      </p>

      {/* 풋터: 감정, 진행률, 액션 */}
      { session.turn_count === 0 ? (
        <div className="flex items-center justify-between pt-4 border-t border-[#3E3852]/10 relative z-10 mt-2">
          <div className="flex items-center gap-1.5 bg-white/60 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-sm">💜</span>
            <span className="text-[13px] font-extrabold text-[#3E3852]">0턴</span>
          </div>
          <div className="bg-gradient-to-r from-[#FF8CBD] to-[#B898FF] text-white text-[14px] font-extrabold px-4 py-2 rounded-2xl shadow-[0_3px_0_#9F71E8] flex items-center gap-1.5">
             ✨ 새 상담 시작
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-4 border-t border-[#3E3852]/10 relative z-10 mt-2">
          {/* 감정 트레일 및 턴 수 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/60 px-3 py-1.5 rounded-full shadow-sm">
              {hasEmotionChange ? (
                <>
                  <span className="text-sm">{eStart}</span>
                  <span className="text-gray-400 text-[10px] font-bold">➔</span>
                  <span className="text-sm">{eEnd}</span>
                </>
              ) : (
                <span className="text-sm">{icon === '💭' ? eStart : icon}</span>
              )}
            </div>
            <span className="text-[15px] font-extrabold text-[#3E3852]">
              {session.turn_count}턴
            </span>
          </div>

          {/* 진행률 도트 */}
          <div className="flex items-center gap-[5px]">
            {Array.from({ length: steps }).map((_, i) => (
              <div 
                key={i} 
                className={`w-[6px] h-[6px] rounded-full ${i < currentStep ? 'bg-[#FC95B4]' : 'bg-[#FC95B4]/30'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 호버 시 나타나는 보관/삭제 버튼 영역 (선택사항) */}
      {onArchive && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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
