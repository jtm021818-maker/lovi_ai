/**
 * 🎬 v79: FX 카탈로그 — 효과 ID 레지스트리
 *
 * LLM 이 쓰는 태그 ID 와 런타임 설정(target/duration/params) 매핑.
 * 알 수 없는 ID 는 무시 (LLM 이 오타/환각해도 안전).
 */

import type { FxEvent } from './effect-bus';

export interface FxDefinition {
  id: string;
  target: FxEvent['target'];
  /** 기본 지속 시간 ms */
  duration: number;
  /** 설명 (LLM 프롬프트에도 동일 표기) */
  description: string;
  /** 쿨타임 ms (기본 2000) */
  cooldown?: number;
}

export const FX_CATALOG: Record<string, FxDefinition> = {
  // ─── A. Screen ───
  'shake.soft':     { id: 'shake.soft',     target: 'screen',   duration: 500, description: '부드러운 화면 흔들림' },
  'shake.hard':     { id: 'shake.hard',     target: 'screen',   duration: 700, description: '강한 화면 흔들림' },
  'flash.white':    { id: 'flash.white',    target: 'screen',   duration: 300, description: '화면 흰 섬광' },
  'flash.pink':     { id: 'flash.pink',     target: 'screen',   duration: 400, description: '핑크 플래시' },
  'tint.sepia':     { id: 'tint.sepia',     target: 'screen',   duration: 2000, description: '세피아 무드' },
  'tint.cool':      { id: 'tint.cool',      target: 'screen',   duration: 3000, description: '차가운 톤' },
  'rain.sakura':    { id: 'rain.sakura',    target: 'bg',       duration: 5000, description: '벚꽃 비 5초' },
  'rain.tears':     { id: 'rain.tears',     target: 'particle', duration: 3000, description: '눈물방울 낙하' },

  // ─── B. Bubble ───
  'bubble.wobble':  { id: 'bubble.wobble',  target: 'bubble',   duration: 500, description: '말풍선 덜덜' },
  'bubble.bounce':  { id: 'bubble.bounce',  target: 'bubble',   duration: 500, description: '말풍선 통통' },
  'bubble.deflate': { id: 'bubble.deflate', target: 'bubble',   duration: 700, description: '말풍선 가라앉음' },
  'bubble.glow':    { id: 'bubble.glow',    target: 'bubble',   duration: 2000, description: '말풍선 빛남' },
  'bubble.popIn':   { id: 'bubble.popIn',   target: 'bubble',   duration: 400, description: '통 튀어나옴' },
  'bubble.shimmer': { id: 'bubble.shimmer', target: 'bubble',   duration: 1200, description: '반짝임 스윕' },
  'bubble.burst':   { id: 'bubble.burst',   target: 'bubble',   duration: 600, description: '터지듯 등장' },

  // ─── C. Text (구간 하이라이트) ───
  'text.wave':      { id: 'text.wave',      target: 'text',     duration: 1200, description: 'ㅎㅎ 웨이브' },
  'text.shake':     { id: 'text.shake',     target: 'text',     duration: 600, description: '글자 덜덜' },
  'text.pulse':     { id: 'text.pulse',     target: 'text',     duration: 1000, description: '글자 맥박' },
  'text.rainbow':   { id: 'text.rainbow',   target: 'text',     duration: 1500, description: '무지개 색' },
  'text.scramble':  { id: 'text.scramble',  target: 'text',     duration: 800, description: '해독 효과' },

  // ─── D. Avatar ───
  'avatar.bounce':    { id: 'avatar.bounce',    target: 'avatar', duration: 600, description: '아바타 폴짝' },
  'avatar.shake':     { id: 'avatar.shake',     target: 'avatar', duration: 500, description: '아바타 부르르' },
  'avatar.heartBeat': { id: 'avatar.heartBeat', target: 'avatar', duration: 1600, description: '심장 박동' },

  // ─── E. Particles ───
  'particle.hearts':   { id: 'particle.hearts',   target: 'particle', duration: 1500, description: '핑크 하트 파티클' },
  'particle.sparkles': { id: 'particle.sparkles', target: 'particle', duration: 1500, description: '반짝이' },
  'particle.tears':    { id: 'particle.tears',    target: 'particle', duration: 2000, description: '눈물방울 💧' },
  'particle.fire':     { id: 'particle.fire',     target: 'particle', duration: 1500, description: '🔥 불꽃' },
  'particle.confetti': { id: 'particle.confetti', target: 'particle', duration: 2000, description: '색종이 축하' },
  'particle.stars':    { id: 'particle.stars',    target: 'particle', duration: 1500, description: '⭐ 별' },
};

export function getFxDefinition(id: string): FxDefinition | undefined {
  return FX_CATALOG[id];
}

export function isValidFxId(id: string): boolean {
  return id in FX_CATALOG;
}
