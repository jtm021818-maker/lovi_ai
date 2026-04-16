/**
 * 🆕 v31 Phase 3: Relationship Graph + Episode Timeline
 *
 * 유저의 인간관계를 자동 추출 + 세션별 에피소드를 타임라인으로.
 * 루나가 "전 남친 때 힘들었는데 새 사람이라 조심스러울 수도"를 알게 됨.
 *
 * API 호출: 0 (키워드 기반 추출)
 */

import type { RelationshipEntity } from './user-model';

// ============================================
// 관계 자동 추출 (유저 메시지에서)
// ============================================

export function extractRelationships(messages: string[], existing: RelationshipEntity[]): RelationshipEntity[] {
  const rels = [...existing];
  const allText = messages.join(' ');

  // 파트너 감지
  if (/남친|남자친구|남편/.test(allText) && !rels.find(r => r.role === 'partner')) {
    const name = extractName(allText, /남친.*이름[이은는]?\s*(\S{1,4})/);
    rels.push({ name: name ?? '남친', role: 'partner', status: 'active', keyEvents: [] });
  }
  if (/여친|여자친구|와이프/.test(allText) && !rels.find(r => r.role === 'partner')) {
    const name = extractName(allText, /여친.*이름[이은는]?\s*(\S{1,4})/);
    rels.push({ name: name ?? '여친', role: 'partner', status: 'active', keyEvents: [] });
  }

  // 전 파트너
  if (/전\s*남친|전\s*여친|전\s*남자친구|헤어진/.test(allText) && !rels.find(r => r.role === 'ex')) {
    rels.push({ name: '전 파트너', role: 'ex', status: 'ended', keyEvents: [] });
  }

  // 짝사랑
  if (/짝사랑|좋아하는\s*사람|썸/.test(allText) && !rels.find(r => r.role === 'crush')) {
    rels.push({ name: '그 사람', role: 'crush', status: 'active', keyEvents: [] });
  }

  // 키 이벤트 추가 (현재 파트너에)
  const partner = rels.find(r => r.role === 'partner' && r.status === 'active');
  if (partner) {
    const today = new Date().toISOString().slice(0, 10);
    if (/바람|외도/.test(allText) && !partner.keyEvents.find(e => e.event === '바람')) {
      partner.keyEvents.push({ event: '바람 의심/발각', date: today });
    }
    if (/헤어|이별/.test(allText) && !partner.keyEvents.find(e => e.event === '이별')) {
      partner.keyEvents.push({ event: '이별', date: today });
      partner.status = 'ended';
    }
    if (/싸[웠움]|다[퉜툼]/.test(allText)) {
      const recentFight = partner.keyEvents.find(e => e.event === '싸움' && e.date === today);
      if (!recentFight) partner.keyEvents.push({ event: '싸움', date: today });
    }
    if (/화해|다시|풀었/.test(allText)) {
      partner.keyEvents.push({ event: '화해', date: today });
    }
  }

  return rels;
}

function extractName(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1] ?? null;
}

// ============================================
// 에피소드 타임라인
// ============================================

export interface Episode {
  sessionId: string;
  date: string;
  summary: string;
  emotionalArc: string;
  keyInsight: string | null;
  unresolvedQuestion: string | null;
}

/**
 * 세션 종료 시 에피소드 생성
 */
export function createEpisode(
  sessionId: string,
  sessionTheme: string | null,
  emotionStart: string,
  emotionEnd: string,
  keyMoments: string[],
  unresolved: string | null,
): Episode {
  return {
    sessionId,
    date: new Date().toISOString().slice(0, 10),
    summary: sessionTheme ?? '연애 상담',
    emotionalArc: `${emotionStart} → ${emotionEnd}`,
    keyInsight: keyMoments.length > 0 ? keyMoments[keyMoments.length - 1] : null,
    unresolvedQuestion: unresolved,
  };
}

/**
 * 관계 그래프 → 프롬프트 주입 (~30토큰)
 */
export function buildRelationshipPrompt(rels: RelationshipEntity[]): string {
  if (!rels || rels.length === 0) return '';
  const lines = rels.slice(0, 3).map(r => {
    if (!r) return null;
    let line = `${r.name || '알 수 없음'} (${r.role || '관계'}, ${r.status || '상태'})`;
    if (r.keyEvents && r.keyEvents.length > 0) {
      const latest = r.keyEvents[r.keyEvents.length - 1];
      if (latest) line += ` — 최근: ${latest.event}`;
    }
    return line;
  }).filter(Boolean);
  if (lines.length === 0) return '';
  return `[관계] ${lines.join(' | ')}`;
}
