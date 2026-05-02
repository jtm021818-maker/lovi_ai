'use client';

/**
 * 🌳 v104: RootedHug — forest_mom 5-4-3-2-1 그라운딩
 *
 * 10턴+ 깊은 세션에서 몸으로 돌려보내는 트라우마 단기 처방.
 * 입력은 *시각만으로* 따라가도 OK. DB 저장 X (휘발).
 */

import { useMemo, useState } from 'react';
import { SpiritEventCard } from './SpiritEventCard';
import type { PhaseEvent, SuggestionMeta } from '@/types/engine.types';
import type { RootedHugData } from '@/engines/spirits/spirit-event-types';

interface Props {
  event: PhaseEvent;
  onChoose: (text: string, meta?: SuggestionMeta) => void;
  disabled?: boolean;
}

export default function RootedHug({ event, onChoose, disabled }: Props) {
  const data = event.data as unknown as RootedHugData;
  // 그룹별 체크 상태
  const initialChecks = useMemo(() => {
    const o: Record<string, Record<number, boolean>> = {};
    data.groups.forEach((g) => { o[g.label] = {}; });
    return o;
  }, [data.groups]);
  const [checks, setChecks] = useState(initialChecks);

  const handle = (value: 'done' | 'skip') => {
    if (disabled) return;
    onChoose(
      value === 'done' ? '🌳 잘 돌아왔어요' : '🌳 다음에',
      {
        source: 'spirit_event',
        context: { spiritId: 'forest_mom', eventType: 'SPIRIT_ROOTED_HUG', choice: value },
      },
    );
  };

  return (
    <SpiritEventCard spiritId="forest_mom" onSkip={() => handle('skip')} disabled={disabled}>
      <p className="text-sm text-amber-900/80 italic mb-4">{data.openerMsg}</p>

      <div className="space-y-3">
        {data.groups.map((g) => (
          <div key={g.label} className="bg-emerald-50/40 rounded-lg p-3 border border-emerald-200/40">
            <p className="text-sm font-semibold text-emerald-800 mb-1.5">
              {g.emoji} {g.label} <span className="font-normal text-gray-500">{g.count}가지</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {Array.from({ length: g.count }).map((_, idx) => (
                <label key={idx} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!checks[g.label]?.[idx]}
                    onChange={(e) =>
                      setChecks((c) => ({
                        ...c,
                        [g.label]: { ...(c[g.label] ?? {}), [idx]: e.target.checked },
                      }))
                    }
                    className="accent-emerald-600"
                  />
                  <span className="text-gray-600">{idx + 1}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('done')}
          className="py-2 px-3 rounded-xl text-sm font-medium bg-emerald-700 text-white shadow active:scale-[0.98] transition"
        >
          🌳 다 디뎠어요
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handle('skip')}
          className="py-2 px-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
        >
          ⏭️ 다음에
        </button>
      </div>
    </SpiritEventCard>
  );
}
