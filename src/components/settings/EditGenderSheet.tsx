'use client';

/**
 * ⚧️ v85.5: EditGenderSheet — 성별 편집 bottom-sheet (native select 제거)
 */

import { useEffect, useState } from 'react';
import EditFieldSheet from './EditFieldSheet';

type Gender = 'male' | 'female' | 'other';

interface Props {
  open: boolean;
  current: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (gender: Gender) => void | Promise<void>;
}

const OPTIONS: { value: Gender; label: string; emoji: string; hint: string; from: string; to: string }[] = [
  {
    value: 'female',
    label: '여성',
    emoji: '💗',
    hint: '그 상황에 맞춰 말 걸어줄게',
    from: '#ffe0ec',
    to: '#ff9eb8',
  },
  {
    value: 'male',
    label: '남성',
    emoji: '💙',
    hint: '네 시각에 맞춰 얘기할게',
    from: '#dbeafe',
    to: '#60a5fa',
  },
  {
    value: 'other',
    label: '선택 안 함',
    emoji: '🤍',
    hint: '상관없이 편하게 대화해',
    from: '#ede9fe',
    to: '#a78bfa',
  },
];

export default function EditGenderSheet({ open, current, saving, onClose, onSave }: Props) {
  const [selected, setSelected] = useState<Gender>(normalizeGender(current));

  useEffect(() => {
    if (open) setSelected(normalizeGender(current));
  }, [open, current]);

  const canSave = selected !== normalizeGender(current);

  const handleSave = async () => {
    if (!canSave) return;
    await onSave(selected);
    onClose();
  };

  return (
    <EditFieldSheet
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title="성별 설정"
      subtitle="맥락에 맞춰 대화 톤을 조정해"
      canSave={canSave}
      saving={saving}
    >
      <div className="flex flex-col gap-2">
        {OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className="relative flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.98]"
              style={{
                background: active
                  ? `linear-gradient(135deg, ${opt.from} 0%, ${opt.to}55 100%)`
                  : 'rgba(255,255,255,0.85)',
                border: active ? `2px solid ${opt.to}` : '2px solid rgba(168,85,247,0.14)',
                boxShadow: active
                  ? `0 6px 16px ${opt.to}55, inset 0 1px 0 rgba(255,255,255,0.6)`
                  : 'inset 0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[20px] flex-shrink-0"
                style={{
                  background: active
                    ? `linear-gradient(135deg, ${opt.from} 0%, ${opt.to}88 100%)`
                    : 'rgba(168,85,247,0.06)',
                  boxShadow: active ? `inset 0 1px 0 rgba(255,255,255,0.6)` : 'none',
                }}
              >
                {opt.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[14px] font-extrabold leading-tight"
                  style={{ color: active ? '#3a1458' : '#4a148c' }}
                >
                  {opt.label}
                </div>
                <div
                  className="text-[11px] mt-0.5 leading-snug"
                  style={{ color: active ? '#6d28d9' : '#9e86c5' }}
                >
                  {opt.hint}
                </div>
              </div>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: active ? opt.to : 'transparent',
                  border: active ? 'none' : '2px solid rgba(168,85,247,0.22)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {active ? '✓' : ''}
              </div>
            </button>
          );
        })}
      </div>
    </EditFieldSheet>
  );
}

function normalizeGender(v: string): Gender {
  if (v === 'male' || v === 'female') return v;
  return 'other';
}
