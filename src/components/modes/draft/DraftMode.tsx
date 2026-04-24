'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DraftState, DraftOption } from '@/engines/bridge-modes/types';

interface DraftModeProps {
  initial: DraftState & { modeId: 'draft' };
  onComplete: (chosen: { draft: DraftOption; finalContent: string }) => void;
}

const TONE_CFG = {
  soft:   { color: '#3B82F6', bg: '#DBEAFE', icon: '💐', comment: '이건 감성적으로 써봤어 ㅎ' },
  honest: { color: '#F59E0B', bg: '#FEF3C7', icon: '🔍', comment: '솔직하게 핵심만 딱' },
  firm:   { color: '#EF4444', bg: '#FEE2E2', icon: '🔥', comment: '좀 강한 버전 — 상황 봐서 써' },
} as const;

function useTypewriter(text: string, active: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) return;
    const words = text.split(' ');
    let i = 0;
    setDisplayed('');
    setDone(false);
    function tick() {
      i++;
      setDisplayed(words.slice(0, i).join(' '));
      if (i < words.length) setTimeout(tick, 52);
      else setDone(true);
    }
    setTimeout(tick, 52);
  }, [active, text]); // eslint-disable-line react-hooks/exhaustive-deps
  return { displayed, done };
}

function LunaBubble({ text, delayMs = 0 }: { text: string; delayMs?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delayMs / 1000, type: 'spring', stiffness: 300, damping: 26 }}
      className="flex items-end gap-2"
    >
      <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-[#EACbb3] overflow-hidden shrink-0">
        <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
      </div>
      <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-[#F4EFE6] border border-[#D5C2A5] text-[13px] text-[#4E342E] max-w-[76%] leading-relaxed">
        {text}
      </div>
    </motion.div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="flex justify-end"
    >
      <div className="px-3 py-2 rounded-2xl rounded-tr-sm bg-[#7C3AED] text-white text-[13px] max-w-[72%] leading-relaxed">
        {text}
      </div>
    </motion.div>
  );
}

function TypingDots({ color }: { color: string }) {
  return (
    <span className="flex gap-1 items-center h-5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

function Chip({ label, color, primary = false, onClick }: {
  label: string; color: string; primary?: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.91 }}
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
      style={primary
        ? { background: color, color: '#fff' }
        : { background: 'white', color, border: `1.5px solid ${color}88` }
      }
    >
      {label}
    </motion.button>
  );
}

function DraftCard({
  d, delayMs, chipsEnabled,
  onSelect, onEditRequest, onSelfEdit,
}: {
  d: DraftOption;
  delayMs: number;
  chipsEnabled: boolean;
  onSelect: (d: DraftOption) => void;
  onEditRequest: (d: DraftOption) => void;
  onSelfEdit: (d: DraftOption) => void;
}) {
  const cfg = TONE_CFG[d.tone];
  const [visible, setVisible] = useState(false);
  const [typing, setTyping] = useState(false);
  const [commentVisible, setCommentVisible] = useState(false);
  const [chipsVisible, setChipsVisible] = useState(false);

  const { displayed, done: twDone } = useTypewriter(d.content, typing);

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), delayMs);
    const t1 = setTimeout(() => setTyping(true), delayMs + 800);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!twDone) return;
    const t = setTimeout(() => setCommentVisible(true), 400);
    return () => clearTimeout(t);
  }, [twDone]);

  useEffect(() => {
    if (!commentVisible) return;
    const t = setTimeout(() => setChipsVisible(true), 500);
    return () => clearTimeout(t);
  }, [commentVisible]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="flex items-start gap-2 ml-10"
    >
      <div className="flex-1 space-y-1">
        {/* Tone label */}
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-[12px]">{cfg.icon}</span>
          <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{d.label}</span>
          <div className="h-[2px] rounded-full flex-1 max-w-[48px]" style={{ background: `${cfg.color}33` }} />
          <span className="text-[9px] tabular-nums opacity-50" style={{ color: cfg.color }}>{d.intensity}</span>
        </div>

        {/* Bubble: dots → typewriter */}
        <AnimatePresence mode="wait">
          {!typing ? (
            <motion.div
              key="dots"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="px-3 py-2.5 rounded-2xl rounded-tl-sm border min-h-[44px] flex items-center"
              style={{ background: cfg.bg, borderColor: `${cfg.color}44` }}
            >
              <TypingDots color={cfg.color} />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative overflow-hidden px-3 py-2.5 rounded-2xl rounded-tl-sm text-[13px] text-[#4E342E] leading-relaxed border"
              style={{ background: cfg.bg, borderColor: `${cfg.color}44` }}
            >
              {!twDone && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(90deg, transparent 0%, ${cfg.color}1A 50%, transparent 100%)` }}
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 }}
                />
              )}
              {displayed}
              {!twDone && (
                <motion.span
                  className="inline-block w-0.5 h-[13px] ml-0.5 rounded-full align-middle"
                  style={{ background: cfg.color }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Luna comment */}
        <AnimatePresence>
          {commentVisible && (
            <motion.p
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] text-[#9E7E6A] ml-1"
            >
              {cfg.comment}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Quick-reply chips */}
        <AnimatePresence>
          {chipsVisible && chipsEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="flex flex-wrap gap-1.5 pt-0.5"
            >
              <Chip label="이걸로 할게 ✓" color={cfg.color} primary onClick={() => onSelect(d)} />
              <Chip label="조금 바꿔줄래?" color={cfg.color} onClick={() => onEditRequest(d)} />
              <Chip label="직접 고칠게" color={cfg.color} onClick={() => onSelfEdit(d)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function EditRequestFlow({ d, onSubmit, onCancel }: {
  d: DraftOption;
  onSubmit: (req: string) => void;
  onCancel: () => void;
}) {
  const cfg = TONE_CFG[d.tone];
  const [req, setReq] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { taRef.current?.focus(); }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <LunaBubble text="어떻게 바꿔줄까? 말해봐" />
      <div className="flex justify-end">
        <div className="w-[84%] space-y-1.5">
          <textarea
            ref={taRef}
            value={req}
            onChange={(e) => setReq(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && req.trim()) {
                e.preventDefault();
                onSubmit(req.trim());
              }
            }}
            placeholder="여기에 적어줘  (Enter 전송)"
            rows={2}
            className="w-full px-3 py-2.5 rounded-2xl text-[13px] text-[#4E342E] border resize-none outline-none"
            style={{ background: '#FFF8F4', borderColor: `${cfg.color}55`, minHeight: 56 }}
          />
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#EAE1D0] text-[#5D4037]"
            >
              취소
            </button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => req.trim() && onSubmit(req.trim())}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-white"
              style={{ background: cfg.color, opacity: req.trim() ? 1 : 0.4 }}
            >
              보내기
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SelfEditFlow({ d, onSave, onCancel }: {
  d: DraftOption;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const cfg = TONE_CFG[d.tone];
  const [val, setVal] = useState(d.content);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = taRef.current;
    if (el) { el.focus(); el.setSelectionRange(val.length, val.length); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <LunaBubble text="직접 고쳐봐, 다 됐으면 알려줘 ㅎ" />
      <div className="ml-10 space-y-1.5">
        <textarea
          ref={taRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-full px-3 py-2.5 rounded-2xl text-[13px] text-[#4E342E] border-2 resize-none outline-none"
          style={{ background: cfg.bg, borderColor: cfg.color, minHeight: 80 }}
        />
        <div className="flex gap-1.5 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#EAE1D0] text-[#5D4037]"
          >
            취소
          </button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => val.trim() && onSave(val.trim())}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-white"
            style={{ background: cfg.color }}
          >
            이걸로 할게 ✓
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function DoneMessage({ content, color }: { content: string; color: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 24 }}
      className="flex items-end gap-2"
    >
      <div className="w-8 h-8 rounded-full bg-[#F4EFE6] border border-[#EACbb3] overflow-hidden shrink-0">
        <img src="/luna_fox_transparent.webp" alt="루나" className="w-full h-full object-cover" />
      </div>
      <div className="space-y-2">
        <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-[#F4EFE6] border border-[#D5C2A5] text-[13px] text-[#4E342E]">
          오 그거 좋지 🔥 바로 복붙해서 보내버려
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={copy}
          className="relative flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold text-white overflow-hidden shadow-md"
          style={{ background: color }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: color }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.55, 0, 0.55] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="relative z-10">{copied ? '복사됨 ✓' : '메시지 복사하기 📋'}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function DraftMode({ initial, onComplete }: DraftModeProps) {
  const { drafts } = initial;
  const [selected, setSelected] = useState<{ draft: DraftOption; finalContent: string } | null>(null);
  const [editReqDraft, setEditReqDraft] = useState<DraftOption | null>(null);
  const [selfEditDraft, setSelfEditDraft] = useState<DraftOption | null>(null);
  const [userBubbles, setUserBubbles] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isCompleted = !!selected;
  const isInteracting = !!editReqDraft || !!selfEditDraft || isCompleted;

  const scrollDown = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);

  const addUserBubble = (text: string) =>
    setUserBubbles((prev) => [...prev, text]);

  const handleSelect = (draft: DraftOption, finalContent?: string) => {
    const fc = finalContent ?? draft.content;
    addUserBubble('이걸로 할게 ✓');
    setSelected({ draft, finalContent: fc });
    setEditReqDraft(null);
    setSelfEditDraft(null);
    scrollDown();
    setTimeout(() => onComplete({ draft, finalContent: fc }), 1200);
  };

  const handleEditRequest = (d: DraftOption) => {
    addUserBubble('조금 바꿔줄래?');
    setEditReqDraft(d);
    setSelfEditDraft(null);
    scrollDown();
  };

  const handleSelfEdit = (d: DraftOption) => {
    addUserBubble('직접 고칠게');
    setSelfEditDraft(d);
    setEditReqDraft(null);
    scrollDown();
  };

  const CARD_DELAYS = [1200, 2400, 3600];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[92%] mx-auto my-4 space-y-3"
    >
      <LunaBubble text="야 내가 몇 개 써봤어" delayMs={0} />
      <LunaBubble text="어떤 게 제일 마음에 들어? 골라봐 ㅎ" delayMs={500} />

      {drafts.map((d, idx) => (
        <DraftCard
          key={d.id}
          d={d}
          delayMs={CARD_DELAYS[idx] ?? 1200 + idx * 1200}
          chipsEnabled={!isInteracting}
          onSelect={handleSelect}
          onEditRequest={handleEditRequest}
          onSelfEdit={handleSelfEdit}
        />
      ))}

      {userBubbles.map((text, i) => (
        <UserBubble key={i} text={text} />
      ))}

      <AnimatePresence>
        {editReqDraft && !isCompleted && (
          <EditRequestFlow
            key="editReq"
            d={editReqDraft}
            onSubmit={(req) => {
              addUserBubble(req);
              handleSelect(editReqDraft);
            }}
            onCancel={() => setEditReqDraft(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selfEditDraft && !isCompleted && (
          <SelfEditFlow
            key="selfEdit"
            d={selfEditDraft}
            onSave={(text) => handleSelect(selfEditDraft, text)}
            onCancel={() => setSelfEditDraft(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCompleted && selected && (
          <DoneMessage
            key="done"
            content={selected.finalContent}
            color={TONE_CFG[selected.draft.tone].color}
          />
        )}
      </AnimatePresence>

      <div ref={bottomRef} />
    </motion.div>
  );
}
