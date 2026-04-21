'use client';

/**
 * 🏷️ v85.5: EditNicknameSheet — 닉네임 편집 bottom-sheet
 */

import { useEffect, useState } from 'react';
import EditFieldSheet from './EditFieldSheet';

interface Props {
  open: boolean;
  current: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (nickname: string) => void | Promise<void>;
}

const MAX = 20;

export default function EditNicknameSheet({ open, current, saving, onClose, onSave }: Props) {
  const [value, setValue] = useState(current);

  // 시트 열릴 때마다 현재값 reset
  useEffect(() => {
    if (open) setValue(current);
  }, [open, current]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== current.trim() && trimmed.length <= MAX;

  const handleSave = async () => {
    if (!canSave) return;
    await onSave(trimmed);
    onClose();
  };

  return (
    <EditFieldSheet
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title="이름 바꾸기"
      subtitle="루나와 타로냥이 너를 부를 이름이야"
      canSave={canSave}
      saving={saving}
    >
      <div className="relative">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave) {
              e.preventDefault();
              void handleSave();
            }
          }}
          autoFocus
          maxLength={MAX}
          inputMode="text"
          enterKeyHint="done"
          placeholder="예: 하늘이, 수진..."
          className="w-full px-4 py-3 rounded-2xl text-[16px] font-semibold text-[#4a148c] outline-none"
          style={{
            background: 'rgba(255,255,255,0.9)',
            border: `2px solid ${
              canSave ? 'rgba(168,85,247,0.7)' : trimmed.length === 0 ? 'rgba(168,85,247,0.22)' : 'rgba(168,85,247,0.35)'
            }`,
            boxShadow: canSave ? '0 0 0 3px rgba(168,85,247,0.18)' : 'inset 0 1px 2px rgba(0,0,0,0.04)',
            transition: 'all 0.2s',
          }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#9e9e9e] tabular-nums pointer-events-none">
          {value.length}/{MAX}
        </div>
      </div>
      <p className="mt-2.5 text-[10.5px] text-[#a188c7] leading-relaxed">
        💡 별명이나 이니셜도 좋아. 원하는 이름으로 바꿔도 돼.
      </p>
    </EditFieldSheet>
  );
}
