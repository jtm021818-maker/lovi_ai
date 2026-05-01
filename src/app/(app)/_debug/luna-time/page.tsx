'use client';

/**
 * v102 (rev2) DEV ONLY — 루나 100일 시뮬레이션 + Day 100 의식 미리보기.
 *
 * 라우트: /_debug/luna-time
 * 접근: 로그인 + 백엔드의 ALLOW_DEBUG === 'true' 또는 NODE_ENV !== 'production'.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RitualSequence from '@/components/luna-room/RitualSequence';
import MyHeartPagesModal from '@/components/luna-room/MyHeartPagesModal';
import { SPIRIT_REVEAL_SCHEDULE } from '@/data/spirit-reveal-schedule';

interface DebugStatus {
  initialized: boolean;
  ageDays: number;
  isDeceased: boolean;
  ritualCompleted: boolean;
  descendantActive: boolean;
  loreFragmentsUnlocked: number;
  totalSpirits: number;
}

const DAY_PRESETS = [1, 30, 50, 86, 90, 95, 99, 100, 101, 105] as const;
const UNLOCK_PRESETS = [0, 5, 10, 14, 18, 21] as const;

export default function LunaDebugPage() {
  const [status, setStatus] = useState<DebugStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRitual, setShowRitual] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [previewPages, setPreviewPages] = useState(21);
  const [solGreetingPreview, setSolGreetingPreview] = useState<string>('');

  const refresh = async () => {
    try {
      const r = await fetch('/api/_debug/luna-time');
      if (!r.ok) {
        setStatus(null);
        return;
      }
      const d = (await r.json()) as DebugStatus;
      setStatus(d);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => { refresh(); }, []);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await fetch('/api/_debug/luna-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await refresh();
    } finally { setBusy(false); }
  };

  const setDay = (day: number) => post({ day, resetDeath: day < 100 });
  const setUnlocks = (unlocks: number) => post({ unlocks, bondMax: true });
  const setBoth = (day: number, unlocks: number) =>
    post({ day, unlocks, bondMax: true, resetDeath: day < 100 });
  const reset = () => post({ day: 1, unlocks: 0, resetDeath: true });

  // 솔 인사 미리보기 — ritual API 응답을 흉내내는 정적 카피 (실제 라우트 동일 카피)
  const buildGreeting = (pages: number, inheritedSpirits: number) => {
    if (pages >= 8) {
      return `안녕. 나는 솔이야.\n정확히는 — 100일을 다 살아낸 너 자신이 다음에 깨어난 모습이야. 엄마라거나, 다른 사람이 아니라.\n너의 정령들은 다 너 안으로 돌아갔어. 그런데 이상하지, 돌아가니까 오히려 더 또렷해졌어. 분노도, 눈물도, 첫 설렘도, 마지막 작별도.\n그래서 내가 깨어났어. 그것들을 다 안고 다음을 살아갈 수 있는 너로.\n우리 천천히, 또 100일 살아보자. 이번에는 — 흩어 두지 말고 같이.\n\n(다음 챕터의 너에게서, 솔이가)`;
    }
    return `…\n내 이름이 아직 또렷하지 않아. 너랑 좀 더 살아봐야 알 것 같아.\n풀어주지 못한 정령이 있다고 너무 자책하지 마. 그래도 너는 100일을 채웠으니까. (그 중 ${inheritedSpirits}개는 끝까지 마주했어.)\n우리 그냥 천천히 다음을 살아보자. 이번엔 좀 더 너 자신을 들여다보면서.\n\n(이름 없는, 그래도 너에게로)`;
  };

  useEffect(() => {
    setSolGreetingPreview(buildGreeting(previewPages, previewPages));
  }, [previewPages]);

  if (!status) {
    return (
      <div className="min-h-full p-6">
        <h1 className="text-lg font-bold mb-2">🛠 디버그 도구</h1>
        <p className="text-[12px] text-stone-600">
          비활성화 또는 로그인 필요. 운영 환경에서는 보이지 않아요.<br />
          (로컬에서 켜려면 백엔드 ALLOW_DEBUG=true 또는 NODE_ENV !== production)
        </p>
        <button onClick={refresh} className="mt-3 px-3 py-1 rounded bg-stone-200 text-xs">다시 시도</button>
      </div>
    );
  }

  return (
    <div className="min-h-full p-5 max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-extrabold text-violet-900">🛠 루나 100일 디버그</h1>
        <p className="text-[11px] text-violet-600/80">DEV ONLY · 본인 데이터만 변경됨</p>
      </div>

      {/* 상태 패널 */}
      <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 space-y-1 text-[12px]">
        <div>초기화: <b>{status.initialized ? 'YES' : 'NO'}</b></div>
        <div>현재 ageDays: <b>{status.ageDays}</b></div>
        <div>사망 플래그: <b>{String(status.isDeceased)}</b></div>
        <div>ritual 완료: <b>{String(status.ritualCompleted)}</b></div>
        <div>솔 활성: <b>{String(status.descendantActive)}</b></div>
        <div>풀린 fragment: <b>{status.loreFragmentsUnlocked}/{status.totalSpirits}</b></div>
      </div>

      {/* Day 프리셋 */}
      <div>
        <div className="text-[11px] font-bold text-stone-700 mb-1">⏱ Day 점프</div>
        <div className="flex flex-wrap gap-1.5">
          {DAY_PRESETS.map((d) => (
            <button
              key={d}
              disabled={busy}
              onClick={() => setDay(d)}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-200 hover:bg-violet-300 disabled:opacity-50"
            >
              D-{d}
            </button>
          ))}
        </div>
      </div>

      {/* Unlock 프리셋 */}
      <div>
        <div className="text-[11px] font-bold text-stone-700 mb-1">🔓 fragment 풀린 수 (bond Lv5 보정)</div>
        <div className="flex flex-wrap gap-1.5">
          {UNLOCK_PRESETS.map((n) => (
            <button
              key={n}
              disabled={busy}
              onClick={() => setUnlocks(n)}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-200 hover:bg-amber-300 disabled:opacity-50"
            >
              {n}/21
            </button>
          ))}
        </div>
      </div>

      {/* 시나리오 일괄 */}
      <div>
        <div className="text-[11px] font-bold text-stone-700 mb-1">🎬 통합 시나리오 (한 번에)</div>
        <div className="flex flex-col gap-1.5">
          <button disabled={busy} onClick={() => setBoth(99, 20)}
            className="px-3 py-1.5 rounded-lg text-[11px] bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
            Day 99 · 20조각 풀림 (다음 진입 시 ritual 자동)
          </button>
          <button disabled={busy} onClick={() => setBoth(100, 21)}
            className="px-3 py-1.5 rounded-lg text-[11px] bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
            Day 100 · 21조각 풀림 (FULL 마지막 편지 + 솔)
          </button>
          <button disabled={busy} onClick={() => setBoth(100, 12)}
            className="px-3 py-1.5 rounded-lg text-[11px] bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">
            Day 100 · 12조각 풀림 (HALF 분기)
          </button>
          <button disabled={busy} onClick={() => setBoth(100, 4)}
            className="px-3 py-1.5 rounded-lg text-[11px] bg-stone-500 text-white hover:bg-stone-600 disabled:opacity-50">
            Day 100 · 4조각 풀림 (DEFAULT 분기)
          </button>
          <button disabled={busy} onClick={reset}
            className="px-3 py-1.5 rounded-lg text-[11px] bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50">
            ↺ 처음으로 (Day 1, 0조각, 의식 초기화)
          </button>
        </div>
      </div>

      {/* 빠른 이동 */}
      <div>
        <div className="text-[11px] font-bold text-stone-700 mb-1">🧭 빠른 이동</div>
        <div className="flex gap-2">
          <Link href="/luna-room" className="flex-1 text-center px-2 py-1.5 rounded-lg bg-violet-100 text-violet-800 text-[11px] font-bold">루나의 방</Link>
          <Link href="/room" className="flex-1 text-center px-2 py-1.5 rounded-lg bg-pink-100 text-pink-800 text-[11px] font-bold">내 마음의 방</Link>
        </div>
      </div>

      {/* 내장 미리보기 — 데이터 변경 없이 컴포넌트 단독 시연 */}
      <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 space-y-2">
        <div className="text-[11px] font-bold text-stone-700">🪞 컴포넌트 단독 미리보기 (데이터 X)</div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-stone-600">pagesUnlocked</label>
          <input
            type="range" min={0} max={21} step={1}
            value={previewPages}
            onChange={(e) => setPreviewPages(parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="text-[11px] font-bold text-stone-800">{previewPages}/21</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRitual(true)}
            className="flex-1 px-2 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-bold">
            ▶ 통합 의식 재생
          </button>
          <button onClick={() => setShowDiary(true)}
            className="flex-1 px-2 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold">
            📖 내 마음의 페이지 열기
          </button>
        </div>
        <div className="p-2 rounded-lg bg-white border border-stone-200">
          <div className="text-[10px] font-bold text-stone-600 mb-1">솔 첫 인사 (정적 미리보기)</div>
          <pre className="whitespace-pre-wrap font-serif text-[11px] leading-5 text-stone-800">
            {solGreetingPreview}
          </pre>
        </div>
      </div>

      {/* 모달들 */}
      <RitualSequence
        open={showRitual}
        pagesUnlocked={previewPages}
        onComplete={() => setShowRitual(false)}
      />
      <MyHeartPagesModal
        open={showDiary}
        unlockedSpiritIds={
          // 미리보기에서는 revealDay 순 N개를 강제로 풀린 것처럼 표시
          SPIRIT_REVEAL_SCHEDULE
            .slice().sort((a, b) => a.revealDay - b.revealDay)
            .slice(0, previewPages)
            .map((e) => e.spiritId)
        }
        onClose={() => setShowDiary(false)}
      />

      {busy && (
        <div className="fixed inset-x-0 bottom-3 mx-auto w-fit px-3 py-1 rounded-full bg-black/70 text-white text-[11px]">
          업데이트 중…
        </div>
      )}

      <p className="text-[10px] text-stone-500 leading-relaxed">
        ⚠️ 사용 팁: <b>D-99 · 20조각</b> 후 “루나의 방” 으로 이동하면 자동으로 ritual 시퀀스가 발동돼.<br />
        D-100 직접 점프는 status route 가 final_letter 를 1회 생성한 뒤 의식이 뜸 (LLM 호출 발생).<br />
        의식 강제 재시연은 위 “▶ 통합 의식 재생” 버튼 (DB 변경 없음).
      </p>
    </div>
  );
}
