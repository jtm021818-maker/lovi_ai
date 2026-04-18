'use client';

/**
 * 🎵 v81: BGM Manager (howler.js)
 *
 * 롤플레이 / 기타 몰입 모드에서 배경 BGM 재생.
 * - 단일 활성 트랙 (crossfade 교체)
 * - 유저 설정 (localStorage bgm_enabled) 존중
 * - 첫 상호작용 전까지 autoplay 차단 존중 (사용자가 "시작" 클릭해야 재생)
 */

import type { Howl } from 'howler';

export type BgmId = 'cafe' | 'park' | 'night' | 'minimal' | 'none';

/** 시나리오/분위기 → BGM 파일 매핑 (public/bgm/ 아래에 파일 필요) */
const BGM_SOURCES: Record<Exclude<BgmId, 'none'>, string[]> = {
  cafe:    ['/bgm/cafe_lofi.mp3'],       // 카페 만남
  park:    ['/bgm/park_ambient.mp3'],    // 산책
  night:   ['/bgm/night_synth.mp3'],     // 밤 영상통화
  minimal: ['/bgm/minimal_click.mp3'],   // 미니멀
};

let activeHowl: Howl | null = null;
let activeId: BgmId = 'none';
let loadedRef: typeof import('howler') | null = null;

async function loadHowlerOnce() {
  if (!loadedRef) {
    loadedRef = await import('howler');
  }
  return loadedRef;
}

export function isBgmEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('bgm_enabled');
  return saved !== 'false'; // 기본 ON
}

export function setBgmEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bgm_enabled', enabled ? 'true' : 'false');
  if (!enabled) stopBgm();
}

export async function playBgm(id: BgmId, volume = 0.3) {
  if (typeof window === 'undefined') return;
  if (!isBgmEnabled()) return;
  if (id === 'none') {
    stopBgm();
    return;
  }
  if (id === activeId && activeHowl?.playing()) return;

  const sources = BGM_SOURCES[id];
  if (!sources) return;

  try {
    const { Howl } = await loadHowlerOnce();
    // crossfade 준비 — 기존 트랙 fade out 후 정지
    const old = activeHowl;
    const next = new Howl({
      src: sources,
      loop: true,
      volume: 0,
      html5: true,   // 큰 파일은 stream
      preload: true,
      onloaderror: () => {
        console.warn(`[BGM] 로드 실패: ${id} — 파일 없음?`);
        next.unload();
      },
    });

    next.play();
    next.fade(0, volume, 800);
    activeHowl = next;
    activeId = id;

    if (old) {
      old.fade(old.volume(), 0, 600);
      setTimeout(() => old.unload(), 700);
    }
  } catch (e: any) {
    console.warn('[BGM] 재생 실패:', e?.message);
  }
}

export function stopBgm() {
  if (!activeHowl) return;
  try {
    activeHowl.fade(activeHowl.volume(), 0, 500);
    setTimeout(() => activeHowl?.unload(), 600);
  } catch {
    /* ignore */
  }
  activeHowl = null;
  activeId = 'none';
}

/** Roleplay 시나리오 → BGM 자동 매핑 */
export function pickBgmForRoleplay(scenario: { title: string; situation: string; role: { archetype: string } }): BgmId {
  const t = (scenario.title + ' ' + scenario.situation).toLowerCase();
  if (t.includes('카페') || t.includes('카페에서')) return 'cafe';
  if (t.includes('산책') || t.includes('공원')) return 'park';
  if (t.includes('밤') || t.includes('새벽') || t.includes('통화')) return 'night';
  return 'minimal';
}
