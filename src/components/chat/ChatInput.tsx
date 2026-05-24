'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// v118: ⚡ 부스터 선택 정보
interface BoosterSelection {
  inventoryId: string;
  itemId: string;
}

interface ChatInputProps {
  // v118: 옵셔널 두 번째 인자로 boosters 전달
  onSend: (message: string, consumableUsed?: BoosterSelection[]) => void;
  disabled?: boolean;
  placeholder?: string;
  typingPlaceholder?: string;
  onImageAttach?: (imageBase64: string) => void;
  /** 🆕 v112: 외부에서 채워주는 초기값 (chip 클릭 → 자동 채우기). */
  initialValue?: string;
}

// v118: 부스터 사용 가능한 use_effect 화이트리스트 (1턴 한정 / pre-message-modifier 류)
const BOOSTER_EFFECTS = new Set([
  'model_upgrade_smart',
  'tone_blunt_oneturn',
  'right_brain_boost',
]);

// 상호배제 — 톤 충돌
const TONE_EFFECTS = new Set(['tone_blunt_oneturn', 'tone_soothing_session']);

interface AvailableBooster {
  id: string;       // inventoryId
  itemId: string;
  name: string;
  emoji: string;
  useEffect: string;
  rarity: string;
  quantity: number;
  description: string;
}

export default function ChatInput({ onSend, disabled, placeholder, typingPlaceholder, onImageAttach, initialValue }: ChatInputProps) {
  const [text, setText] = useState(initialValue ?? '');
  const [showExtras, setShowExtras] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = text.trim().length > 0;

  // v118: ⚡ 부스터 상태
  const [boosterModalOpen, setBoosterModalOpen] = useState(false);
  const [selectedBoosters, setSelectedBoosters] = useState<BoosterSelection[]>([]);
  const [availableBoosters, setAvailableBoosters] = useState<AvailableBooster[]>([]);

  // 부스터 사용 가능한 인벤토리 로드 (모달 열 때)
  const loadAvailableBoosters = useCallback(async () => {
    try {
      const r = await fetch('/api/luna-room/inventory');
      const d = await r.json();
      const filtered = (d.items ?? [])
        .filter((i: any) => !i.used && i.isConsumable && BOOSTER_EFFECTS.has(i.useEffect))
        .map((i: any) => ({
          id: i.id,
          itemId: i.itemId,
          name: i.name,
          emoji: i.emoji,
          useEffect: i.useEffect,
          rarity: i.rarity,
          quantity: i.quantity ?? 1,
          description: i.description ?? '',
        }));
      setAvailableBoosters(filtered);
    } catch { /* silent */ }
  }, []);

  const openBoosterModal = useCallback(async () => {
    await loadAvailableBoosters();
    setBoosterModalOpen(true);
  }, [loadAvailableBoosters]);

  // 부스터 토글 — 최대 2개, 톤 상호배제
  const toggleBooster = useCallback((b: AvailableBooster) => {
    setSelectedBoosters((prev) => {
      const already = prev.find((x) => x.inventoryId === b.id);
      if (already) return prev.filter((x) => x.inventoryId !== b.id);

      // 톤 충돌 검증
      if (TONE_EFFECTS.has(b.useEffect)) {
        const conflict = prev.find((x) => {
          const sel = availableBoosters.find((a) => a.id === x.inventoryId);
          return sel && TONE_EFFECTS.has(sel.useEffect);
        });
        if (conflict) return prev; // 무시
      }

      if (prev.length >= 2) return prev; // 최대 2개

      return [...prev, { inventoryId: b.id, itemId: b.itemId }];
    });
  }, [availableBoosters]);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition: _browserSupport,
  } = useSpeechRecognition();

  // Hydration 안전: 서버/클라이언트 동일하게 false → mount 후 실제 값
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);
  const browserSupportsSpeechRecognition = hasMounted && _browserSupport;

  useEffect(() => {
    if (transcript) {
      setText(transcript);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
      }
    }
  }, [transcript]);

  // 🆕 v112: 외부 initialValue 동기화 (chip 클릭 → 자동 채우기)
  useEffect(() => {
    if (initialValue !== undefined && initialValue !== text) {
      setText(initialValue);
      // textarea 높이 재계산
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
          // 포커스 + 끝으로 커서
          textareaRef.current.focus();
          const len = initialValue.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      });
    }
    // text 변화에 따라 effect 재실행 X — initialValue 만 트리거
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageAttach) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (base64) onImageAttach(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setShowExtras(false);
  }, [onImageAttach]);

  const toggleMic = useCallback(() => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ language: 'ko-KR', continuous: true });
    }
  }, [listening, resetTranscript]);

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return;
    // v118: 선택된 부스터 함께 전달
    onSend(text.trim(), selectedBoosters.length > 0 ? selectedBoosters : undefined);
    setText('');
    setSelectedBoosters([]); // 전송 후 부스터 선택 초기화
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, disabled, onSend, selectedBoosters]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom)+8px)] border-t border-purple-50/50 relative z-20">
      {/* 확장 메뉴 (이미지 첨부) */}
      <AnimatePresence>
        {showExtras && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-2"
          >
            <div className="flex gap-4 px-2 py-2">
              {onImageAttach && (
                <>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 hover:bg-purple-100 transition-colors">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <span className="text-[10px] text-gray-400">사진</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-1.5 max-w-2xl mx-auto">
        {/* + 버튼 (확장 메뉴 토글) */}
        {onImageAttach && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowExtras(!showExtras)}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 mb-0.5 ${
              showExtras ? 'bg-purple-100 text-purple-500 rotate-45' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>
        )}

        {/* v118: ⚡ 부스터 버튼 — 다음 메시지에 적용할 소모품 선택 */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openBoosterModal}
          disabled={disabled}
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 mb-0.5 relative ${
            selectedBoosters.length > 0
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200/50'
              : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
          }`}
          title="다음 메시지 부스터"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={selectedBoosters.length > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {selectedBoosters.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center"
              style={{ boxShadow: '0 0 6px rgba(236,72,153,0.6)' }}
            >
              {selectedBoosters.length}
            </span>
          )}
        </motion.button>

        {/* 텍스트 입력 */}
        <div className={`flex-1 bg-gray-50/80 rounded-[22px] border transition-all duration-300 overflow-hidden relative min-h-[42px] ${disabled ? 'border-purple-300/50 bg-gradient-to-r from-purple-50/50 via-pink-50/50 to-purple-50/50' : 'border-gray-100 focus-within:border-purple-200 focus-within:bg-purple-50/20'}`}>
          
          {/* AI 타이핑 중일 때 오버레이 */}
          <AnimatePresence>
            {disabled && typingPlaceholder && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center px-4 bg-white/40 backdrop-blur-sm pointer-events-none"
              >
                {/* 반짝이는 그라디언트 배경 애니메이션 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
                
                {/* 말풍선/펜싱크 아이콘 및 텍스트 */}
                <div className="flex items-center gap-2 relative z-10 text-purple-600 font-medium text-[14px]">
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                    className="flex text-[16px]"
                  >
                    ✨
                  </motion.div>
                  <span>{typingPlaceholder}</span>
                  <div className="flex gap-[2px] ml-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        className="w-1 h-1 bg-purple-500 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? '' : (placeholder || '마음 편하게 다 말해봐...')}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-[11px] text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none max-h-[120px] leading-relaxed relative z-10 disabled:opacity-0"
          />
        </div>

        {/* 마이크 ↔ 전송 버튼 (컨텍스트 전환) */}
        <AnimatePresence mode="wait">
          {hasText ? (
            <motion.button
              key="send"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={disabled}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-200/40 disabled:opacity-40 transition-all duration-200 flex-shrink-0 mb-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </motion.button>
          ) : listening ? (
            <motion.button
              key="listening"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMic}
              className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-200/50 flex-shrink-0 mb-0.5"
            >
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </motion.div>
            </motion.button>
          ) : browserSupportsSpeechRecognition ? (
            <motion.button
              key="mic"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMic}
              disabled={disabled}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-all duration-200 flex-shrink-0 mb-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </motion.button>
          ) : (
            <motion.button
              key="send-disabled"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              disabled
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-300 flex items-center justify-center flex-shrink-0 mb-0.5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* v118: ⚡ 부스터 선택 모달 */}
      <BoosterModal
        open={boosterModalOpen}
        onClose={() => setBoosterModalOpen(false)}
        availableBoosters={availableBoosters}
        selectedBoosters={selectedBoosters}
        toggleBooster={toggleBooster}
      />
    </div>
  );
}

// ============================================================
// v118: BoosterModal
// ============================================================
function BoosterModal({
  open, onClose, availableBoosters, selectedBoosters, toggleBooster,
}: {
  open: boolean;
  onClose: () => void;
  availableBoosters: AvailableBooster[];
  selectedBoosters: BoosterSelection[];
  toggleBooster: (b: AvailableBooster) => void;
}) {
  const isSelected = (id: string) => selectedBoosters.some((s) => s.inventoryId === id);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[290] bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[291] rounded-t-[28px] overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #fefce8 0%, #fef3c7 100%)' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-[3px] rounded-full bg-amber-900/25" />
            </div>

            <div className="px-5 pt-2 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[18px]">⚡</span>
                <span className="text-[14px] font-black text-[#7c5738]">이번 메시지 부스터</span>
              </div>
              <div className="text-[10.5px] text-[#a1887f] leading-relaxed">
                선택하면 다음 메시지 1회에만 적용돼. 최대 2개까지 동시 선택 가능 (톤 충돌은 자동 차단)
              </div>
            </div>

            <div className="px-4 pb-2 max-h-[60vh] overflow-y-auto">
              {availableBoosters.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-2xl mb-2">🌫️</div>
                  <div className="text-[11.5px] text-[#7c5738] font-semibold mb-1">부스터가 없어</div>
                  <div className="text-[10px] text-[#a1887f] leading-relaxed">
                    가챠나 마일스톤 보상에서 얻을 수 있어
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pb-2">
                  {availableBoosters.map((b) => {
                    const selected = isSelected(b.id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => toggleBooster(b)}
                        className="w-full p-3 rounded-2xl text-left flex items-center gap-3 active:scale-[0.99] transition-all"
                        style={{
                          background: selected
                            ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(236,72,153,0.10))'
                            : 'rgba(255,255,255,0.85)',
                          border: `1.5px solid ${selected ? '#f59e0b' : 'rgba(212,175,55,0.30)'}`,
                          boxShadow: selected ? '0 4px 14px rgba(245,158,11,0.25)' : 'none',
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: 'rgba(255,255,255,0.85)',
                            border: `1.5px solid ${RARITY_BORDER_LIGHT[b.rarity] ?? RARITY_BORDER_LIGHT.N}`,
                          }}
                        >
                          <span className="text-[26px] leading-none">{b.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 mb-0.5">
                            <span
                              className="px-1 py-px rounded text-[8px] font-black leading-none"
                              style={{ background: RARITY_BG_LIGHT[b.rarity] ?? '#9ca3af', color: 'white' }}
                            >
                              {b.rarity}
                            </span>
                            <span className="text-[12px] font-bold text-[#3a2418]">{b.name}</span>
                            {b.quantity >= 2 && (
                              <span className="text-[9px] font-bold text-[#a1887f] tabular-nums">×{b.quantity}</span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-[#7c5738] leading-relaxed line-clamp-2">
                            {b.description}
                          </div>
                        </div>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            background: selected ? 'linear-gradient(135deg, #f59e0b, #ec4899)' : 'rgba(0,0,0,0.06)',
                            color: selected ? 'white' : '#a1887f',
                          }}
                        >
                          {selected ? '✓' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 pt-2 pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl font-bold text-[12.5px] text-white active:scale-[0.98]"
                style={{
                  background: selectedBoosters.length > 0
                    ? 'linear-gradient(135deg, #f59e0b, #ec4899)'
                    : 'rgba(0,0,0,0.06)',
                  color: selectedBoosters.length > 0 ? 'white' : '#7c5738',
                  boxShadow: selectedBoosters.length > 0 ? '0 4px 14px rgba(245,158,11,0.3)' : 'none',
                }}
              >
                {selectedBoosters.length > 0
                  ? `✓ ${selectedBoosters.length}개 선택하고 메시지에 적용`
                  : '닫기'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// rarity 표시용 컬러 (BoosterModal 한정 — BagSheet 와 동기)
// ============================================================
const RARITY_BORDER_LIGHT: Record<string, string> = {
  N:  'rgba(156,163,175,0.5)',
  R:  'rgba(96,165,250,0.6)',
  SR: 'rgba(192,132,252,0.7)',
  UR: 'rgba(251,191,36,0.85)',
  L:  'rgba(6,182,212,0.85)',
};
const RARITY_BG_LIGHT: Record<string, string> = {
  N:  '#9ca3af',
  R:  '#3b82f6',
  SR: '#a855f7',
  UR: '#f59e0b',
  L:  '#06b6d4',
};
