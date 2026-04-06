/**
 * 🏠 라운지 대화 엔진
 *
 * LLM 호출 없이 템플릿 + memory_profile 기반으로
 * 루나↔타로냥 캐릭터 간 대화 생성
 */

import type { UserMemoryProfile } from '@/engines/memory/extract-memory';

// ─── Types ──────────────────────────────────────────────

export interface LoungeDialogue {
  trigger: string;
  lines: { speaker: 'luna' | 'tarot'; text: string }[];
  onTapMessage: string;
}

type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'lateNight';

// ─── 트리거 평가 ────────────────────────────────────────

function evaluateTrigger(memory: UserMemoryProfile, time: TimeOfDay): string {
  // 1. 숙제 있는데 3일+ 지남
  const lastSession = memory.sessionHighlights?.slice(-1)[0];
  if (lastSession?.actionTaken || lastSession?.insight) {
    const daysSince = Math.floor((Date.now() - new Date(lastSession.date).getTime()) / 86400000);
    if (daysSince >= 1 && daysSince <= 7) return 'hasHomework';
  }

  // 2. 감정 악화 추세
  if (memory.emotionPatterns?.emotionTrend === 'declining') return 'emotionTrend_declining';

  // 3. 감정 개선 추세
  if (memory.emotionPatterns?.emotionTrend === 'improving') return 'emotionTrend_improving';

  // 4. 반복 고민
  if ((memory.relationshipContext?.mainIssues?.length ?? 0) >= 2) return 'repeatingIssue';

  // 5. 오랜만에 방문
  if (memory.lastUpdated) {
    const daysSince = Math.floor((Date.now() - new Date(memory.lastUpdated).getTime()) / 86400000);
    if (daysSince >= 3) return 'longAbsence';
  }

  // 6. 시간대 기본
  return `default_${time}`;
}

// ─── 대화 템플릿 ────────────────────────────────────────

interface DialogueTemplate {
  trigger: string;
  lines: { speaker: 'luna' | 'tarot'; text: string }[];
  onTap: string;
}

const TEMPLATES: DialogueTemplate[] = [
  // ─── 숙제 관련 ───
  {
    trigger: 'hasHomework',
    lines: [
      { speaker: 'tarot', text: '루나, {name}한테 저번에 미션 줬잖아. 했을까?' },
      { speaker: 'luna', text: '글쎄... 다음에 오면 물어봐야지.' },
      { speaker: 'tarot', text: '해봤으면 좋겠는데. 카드가 변화의 에너지를 보여줬거든.' },
    ],
    onTap: '어 왔어! 저번에 준 미션 해봤어? 솔직하게 말해도 돼~',
  },
  // ─── 감정 악화 ───
  {
    trigger: 'emotionTrend_declining',
    lines: [
      { speaker: 'luna', text: '타로냥, {name} 요즘 마음이 많이 무거운 것 같아...' },
      { speaker: 'tarot', text: '카드도 비슷한 걸 보여줬어. 좀 걱정돼.' },
      { speaker: 'luna', text: '다음에 오면 편하게 이야기할 수 있게 해줘야겠다.' },
    ],
    onTap: '{name} 왔구나. 요즘 좀 힘들지? 이야기해볼래?',
  },
  // ─── 감정 개선 ───
  {
    trigger: 'emotionTrend_improving',
    lines: [
      { speaker: 'luna', text: '타로냥, {name} 요즘 좀 밝아진 것 같지 않아?' },
      { speaker: 'tarot', text: '맞아. 카드 에너지도 확실히 달라졌어.' },
      { speaker: 'luna', text: '노력한 보람이 있나봐~' },
    ],
    onTap: '{name}! 요즘 좀 좋아 보여서 다행이야~',
  },
  // ─── 반복 고민 ───
  {
    trigger: 'repeatingIssue',
    lines: [
      { speaker: 'tarot', text: '루나, {name}이 또 {issue} 이야기 하러 올 것 같아.' },
      { speaker: 'luna', text: '이번에는 좀 다른 각도로 접근해봐야 할 것 같은데...' },
      { speaker: 'tarot', text: '카드로 패턴을 보여주는 게 나을 수도 있어.' },
    ],
    onTap: '왔구나! 오늘은 무슨 이야기야?',
  },
  // ─── 오랜만에 ───
  {
    trigger: 'longAbsence',
    lines: [
      { speaker: 'luna', text: '{name} 요즘 안 오네... 바쁜가?' },
      { speaker: 'tarot', text: '괜찮겠지. 올 때 오겠지 뭐.' },
      { speaker: 'luna', text: '그래도 좀 걱정되는데...' },
    ],
    onTap: '오랜만이다! 바빴어? 그동안 잘 지냈어?',
  },
  // ─── 아침 ───
  {
    trigger: 'default_dawn',
    lines: [
      { speaker: 'luna', text: '좋은 아침~ 타로냥 아직 자고 있어?' },
      { speaker: 'tarot', text: 'zzz...' },
    ],
    onTap: '일찍 왔네! 좋은 아침~',
  },
  {
    trigger: 'default_morning',
    lines: [
      { speaker: 'luna', text: '오늘 날씨 좋다~ 기분 좋은 하루 되면 좋겠다.' },
      { speaker: 'tarot', text: '카드도 오늘 에너지가 밝아.' },
    ],
    onTap: '좋은 아침! 오늘 기분은 어때?',
  },
  // ─── 오후 ───
  {
    trigger: 'default_afternoon',
    lines: [
      { speaker: 'tarot', text: '루나, 오후인데 좀 졸리다...' },
      { speaker: 'luna', text: '커피 한잔 하면서 쉬어가자~' },
    ],
    onTap: '오후인데 좀 쉬어가려고? 편하게 앉아~',
  },
  // ─── 저녁 ───
  {
    trigger: 'default_evening',
    lines: [
      { speaker: 'luna', text: '노을이 예쁘다... 오늘 하루도 수고했어.' },
      { speaker: 'tarot', text: '저녁에는 카드가 더 잘 읽혀.' },
    ],
    onTap: '하루 수고했어~ 좀 쉬자.',
  },
  // ─── 밤 ───
  {
    trigger: 'default_night',
    lines: [
      { speaker: 'tarot', text: '루나, 밤이네. 오늘 별이 예쁘다.' },
      { speaker: 'luna', text: '{name}도 잘 자고 있으면 좋겠다.' },
    ],
    onTap: '밤이네... 오늘 하루 어땠어?',
  },
  {
    trigger: 'default_lateNight',
    lines: [
      { speaker: 'tarot', text: '이 시간에 왔다는 건... 뭔가 있는 거지?' },
      { speaker: 'luna', text: '잠이 안 오면 여기서 좀 있다 가.' },
    ],
    onTap: '늦은 밤인데 왔구나... 잠이 안 와?',
  },
];

// ─── Public API ─────────────────────────────────────────

export function generateLoungeDialogue(
  memory: UserMemoryProfile,
  timeOfDay: TimeOfDay,
): LoungeDialogue {
  const trigger = evaluateTrigger(memory, timeOfDay);
  const name = memory.basicInfo?.nickname ?? '너';
  const issue = memory.relationshipContext?.mainIssues?.[0] ?? '고민';

  // 트리거 매칭 (정확 매칭 → 기본 매칭)
  let template = TEMPLATES.find((t) => t.trigger === trigger);
  if (!template) {
    template = TEMPLATES.find((t) => t.trigger === `default_${timeOfDay}`);
  }
  if (!template) {
    template = TEMPLATES[TEMPLATES.length - 1]; // 최종 폴백
  }

  // 변수 삽입
  const fillVars = (text: string) =>
    text.replace(/\{name\}/g, name).replace(/\{issue\}/g, issue);

  return {
    trigger,
    lines: template.lines.map((l) => ({ speaker: l.speaker, text: fillVars(l.text) })),
    onTapMessage: fillVars(template.onTap),
  };
}
