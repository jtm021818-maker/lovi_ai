'use client';

/**
 * 🗺️ v115.1: EditRegionSheet — 거주 지역 편집 (17개 광역시도)
 *
 * 루나가 같은 시간/날씨 분위기를 공유한 듯 자연스럽게 대화하기 위함.
 * 선택값은 weather_cache 와 join 되어 그 지역 날씨를 LLM 컨텍스트로 주입.
 */

import { useEffect, useState } from 'react';
import EditFieldSheet from './EditFieldSheet';
import { KOREAN_REGIONS, DEFAULT_REGION_CODE } from '@/engines/temporal/region-mapping';

interface Props {
  open: boolean;
  current: string | null | undefined;
  saving?: boolean;
  onClose: () => void;
  onSave: (regionCode: string) => void | Promise<void>;
}

const REGION_EMOJI: Record<string, string> = {
  'KR-11': '🌆', // 서울
  'KR-26': '🌊', // 부산
  'KR-27': '🍎', // 대구
  'KR-28': '✈️', // 인천
  'KR-29': '🌻', // 광주
  'KR-30': '🌳', // 대전
  'KR-31': '🛳️', // 울산
  'KR-50': '🏛️', // 세종
  'KR-41': '🏙️', // 경기
  'KR-42': '⛰️', // 강원
  'KR-43': '🌾', // 충북
  'KR-44': '🌷', // 충남
  'KR-45': '🍚', // 전북
  'KR-46': '🌿', // 전남
  'KR-47': '🍂', // 경북
  'KR-48': '⚓', // 경남
  'KR-49': '🌴', // 제주
};

export default function EditRegionSheet({ open, current, saving, onClose, onSave }: Props) {
  const [selected, setSelected] = useState<string>(current ?? DEFAULT_REGION_CODE);

  useEffect(() => {
    if (open) setSelected(current ?? DEFAULT_REGION_CODE);
  }, [open, current]);

  const canSave = selected !== (current ?? DEFAULT_REGION_CODE);

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
      title="지금 어디에 있어?"
      subtitle="루나가 같은 시간·날씨 분위기로 대화해줄게"
      canSave={canSave}
      saving={saving}
    >
      <div className="grid grid-cols-3 gap-2">
        {KOREAN_REGIONS.map((region) => {
          const active = selected === region.code;
          const emoji = REGION_EMOJI[region.code] ?? '📍';
          return (
            <button
              key={region.code}
              onClick={() => setSelected(region.code)}
              className="relative flex flex-col items-center justify-center px-2 py-3 rounded-2xl text-center transition-all active:scale-[0.95]"
              style={{
                background: active
                  ? 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)'
                  : 'rgba(255,255,255,0.85)',
                border: active
                  ? '2px solid #ec4899'
                  : '2px solid rgba(168,85,247,0.12)',
                boxShadow: active
                  ? '0 4px 12px rgba(236,72,153,0.35), inset 0 1px 0 rgba(255,255,255,0.6)'
                  : 'inset 0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] mb-1"
                style={{
                  background: active
                    ? 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)'
                    : 'rgba(168,85,247,0.06)',
                }}
              >
                {emoji}
              </div>
              <div
                className="text-[12px] font-extrabold leading-tight"
                style={{ color: active ? '#831843' : '#4a148c' }}
              >
                {region.shortName}
              </div>
              {active && (
                <div
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                  style={{ background: '#ec4899' }}
                >
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-center text-[#9e86c5] leading-relaxed">
        ※ 출장·여행 시에도 언제든 변경할 수 있어. 정확한 위치는 저장하지 않아.
      </p>
    </EditFieldSheet>
  );
}
