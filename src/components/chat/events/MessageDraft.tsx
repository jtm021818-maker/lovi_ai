import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PhaseEvent, MessageDraftData } from '@/types/engine.types';
import type { SuggestionMeta } from '@/types/engine.types';

interface MessageDraftProps {
  event: PhaseEvent;
  onSelect: (value: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function MessageDraft({ event, onSelect, disabled }: MessageDraftProps) {
  const data = event.data as unknown as MessageDraftData;
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function handleCopy(text: string, index: number) {
    if (disabled) return;
    
    // 클립보드 복사
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      
      // AI에게 복사 완료되었다고 알림
      onSelect("이 초안으로 복사했어. 고마워!", { source: 'message_copy' });
    }).catch(err => console.error('Copy failed:', err));
  }

  function handleModifyRequest() {
    if (disabled) return;
    onSelect("말투를 조금만 더 부드럽게 바꿔줄래?", { source: 'message_modify' });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 my-2 max-w-[85%] ml-auto"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">💬</span>
        <h4 className="font-bold text-gray-800 text-[14px]">{data.title}</h4>
      </div>
      
      <div className="space-y-4 mb-4">
        {data.drafts.map((draft, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + idx * 0.3, type: 'spring', stiffness: 300, damping: 26 }}
            className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative group"
          >
            <h5 className="text-[12px] font-bold text-pink-600 mb-2">{draft.intent}</h5>
            
            {/* 카카오톡 말풍선 스타일 */}
            <div className="bg-[#FAE100] p-3 rounded-tr-lg rounded-tl-lg rounded-bl-lg rounded-br-sm shadow-sm relative ml-2 mr-6 text-[13px] text-gray-800 leading-relaxed font-medium">
              {draft.text}
              <div className="absolute top-0 -right-2 w-3 h-3 bg-[#FAE100] transform rotate-45 skew-x-12" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
            </div>

            <button
              onClick={() => handleCopy(draft.text, idx)}
              disabled={disabled}
              className={`mt-3 w-full py-2 rounded-lg text-[12px] font-bold transition-all flex justify-center items-center gap-1.5 ${
                copiedIndex === idx
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-white border text-gray-600 hover:bg-gray-50 border-gray-200 shadow-sm'
              }`}
            >
              {copiedIndex === idx ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  복사 완료!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  클립보드에 복사
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleModifyRequest}
          disabled={disabled}
          className="flex-1 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl text-[12px] font-bold transition-colors"
        >
          말투 변경하기
        </button>
        <button
          onClick={() => !disabled && onSelect("내 상황에 맞게 조금 수정해서 써볼게!", { source: 'message_custom' })}
          disabled={disabled}
          className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-[12px] font-bold transition-colors border border-gray-200"
        >
          직접 수정할게
        </button>
      </div>
    </motion.div>
  );
}
