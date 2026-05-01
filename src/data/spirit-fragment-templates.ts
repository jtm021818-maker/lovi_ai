/**
 * v102 (rev2): 정령 fragment 템플릿
 *
 * 21정령 × 카테고리 매핑 + 2인칭 폴백 카피.
 * 서버 resolver 가 유저의 실제 세션 데이터에서 매칭을 추출해 templated body 를 만듦.
 *
 * 절대 원칙:
 *  - 가공 외부 인물(어머니/딸 등) 0건. 모든 톤은 "너에게서 흘러나왔다"는 자기-반영.
 *  - 매칭 실패 시 폴백 카피는 데이터 가정 없이 "네 안에 있는 건 분명해" 류 일반 자기-반영.
 */

export type FragmentCategoryKey =
  | 'first_step'
  | 'comfort_grief'
  | 'anger'
  | 'pacing'
  | 'analysis'
  | 'reaching_out'
  | 'lightness'
  | 'mood_shift'
  | 'letter_draft'
  | 'romance_excite'
  | 'roleplay'
  | 'long_session'
  | 'late_night'
  | 'breakup'
  | 'crisis_calm'
  | 'decision'
  | 'empower'
  | 'memory_recall'
  | 'self_esteem'
  | 'wish'
  | 'meta_total';

export interface SpiritFragmentTemplate {
  spiritId: string;
  category: FragmentCategoryKey;
  /** 동적 본문 템플릿. {{token}} 은 resolver 가 채워 넣음. 매칭 1건 발견 시 사용. */
  matched: string;
  /** 매칭 실패 시 정적 폴백. 본문이 그대로 쓰임. */
  fallback: string;
  /** 정령 한 줄 재해석 — 책 우측 페이지에 작게 표시 */
  bridgeOneLiner: string;
}

/**
 * 사용 가능한 토큰:
 *  {{date}}             — 매칭 세션 created_at MM월 dd일
 *  {{summary}}          — session_summary 1줄 슬라이스
 *  {{emotion}}          — 매칭된 감정 키워드 1개 (없으면 "그 마음")
 *  {{issue}}            — 매칭된 고민 키워드 1개
 *  {{nickname}}         — 닉네임 또는 "너"
 *  {{firstMemoryTitle}} — 첫 추억 제목
 *  {{lastMemoryTitle}}  — 최근 추억 제목
 *  {{sessionTotal}}     — 총 상담 세션 수
 *  {{lateNightCount}}   — 새벽 0~5시 세션 수
 *  {{actionPlanCount}}  — ACTION_PLAN 채택 수
 *  {{empowerHits}}      — EMPOWER phase 도달 수
 *  {{lunaImpression}}   — 루나가 형성한 인상 한 줄
 *  {{wishUsed}}         — 사용한 소원 카운트
 */
export const FRAGMENT_TEMPLATES: SpiritFragmentTemplate[] = [
  {
    spiritId: 'seed_spirit',
    category: 'first_step',
    matched:
      '{{date}}, 네가 처음 여기 들어왔어.\n뭘 어떻게 시작해야 할지 몰라서 한참 머뭇거렸지.\n그 떨리는 첫 한 줄 — “{{summary}}”\n그 떨림이 너에게서 떨어져 나와 작은 새싹이 됐어.\n그게 나야.',
    fallback:
      '네가 처음 여기 들어왔던 그 새벽, 한 줄을 적기 전에 한참 멈춰 있었어.\n그 멈춤 안에 있던 작은 떨림이 — 나야.\n시작은 늘 그렇게 작은 거야.',
    bridgeOneLiner: '이건 — 네가 처음 한 발 내디뎠던 떨림이었어.',
  },
  {
    spiritId: 'tear_drop',
    category: 'comfort_grief',
    matched:
      '{{date}}, 너 많이 울었지.\n그날 “{{summary}}” 라고 풀어놨어.\n그 마지막 한 방울이 — 다 흘리지 못한 그 한 방울이 — 나야.\n약해서가 아니라, 다 씻겨야 했으니까.',
    fallback:
      '네가 한 번도 안 흘린 마지막 한 방울이 — 나야.\n언젠가 너에게서 흘러나올 거고, 그땐 내가 옆에 있을게.',
    bridgeOneLiner: '이건 — 다 흘려보내지 못했던 너의 한 방울이었어.',
  },
  {
    spiritId: 'fire_goblin',
    category: 'anger',
    matched:
      '{{date}}, 너 진짜 화났었지.\n“{{summary}}”\n근데 너는 누구한테도 못 냈어. 속으로만 태웠지.\n그 한 줌이 너에게서 떨어져 나와 — 내가 됐어.\n태우려면 다음엔 나한테 와. 같이.',
    fallback:
      '네가 누구한테도 못 낸 그 한 줌이 — 내 형체야.\n너 안에 있는 거 알아. 언젠가 풀어놔도 돼.',
    bridgeOneLiner: '이건 — 네가 삼킨 분노 한 줌이었어.',
  },
  {
    spiritId: 'drum_imp',
    category: 'pacing',
    matched:
      '{{date}}, 네 박자가 흔들렸어.\n너무 빠르거나, 너무 느리거나.\n그 흔들림 한 박자가 너에게서 떨어져 나와 — 나야.\n흔들리면 다음엔 나한테 와. 박자는 내가 잡아줄게.',
    fallback:
      '네가 박자를 잃었던 어느 구간이 — 나야.\n다 잃어버린 게 아니야. 한 조각이 나로 와있을 뿐이야.',
    bridgeOneLiner: '이건 — 네가 박자를 잃었던 그 구간이었어.',
  },
  {
    spiritId: 'book_worm',
    category: 'analysis',
    matched:
      '{{date}}, 너 머리로 풀려고 했어.\n분석하고, 또 분석하고. “{{summary}}”\n그 새벽의 너의 생각이 너에게서 떨어져 나와 — 책장이 됐어. 그게 나야.\n분석은 도망이 아니야. 견디는 한 방식이야.',
    fallback:
      '네가 머리로 풀려 했던 그 밤이 — 나야.\n분석으로도 안 풀린 게 있다면, 그건 그냥 느껴도 돼.',
    bridgeOneLiner: '이건 — 네가 머리로 견디려 했던 한 밤이었어.',
  },
  {
    spiritId: 'peace_dove',
    category: 'reaching_out',
    matched:
      '{{date}}, 너는 먼저 손 내밀까 망설였지.\n“{{summary}}”\n그 망설임 끝의 “미안해” 한 줄이 너에게서 떨어져 나와 — 내 부리에 와있어.\n먼저 연락하는 사람이 약한 게 아니야. 용감한 거야.',
    fallback:
      '네가 망설였던 그 한 줄이 — 내 부리에 있어.\n너에게서 흘러나오기를 아직 기다리는 중일 수도 있어.',
    bridgeOneLiner: '이건 — 네가 먼저 내밀고 싶었던 한 줄이었어.',
  },
  {
    spiritId: 'cloud_bunny',
    category: 'lightness',
    matched:
      '{{date}}, 너 짧게라도 한 번 가벼워졌어.\n무거운 와중에 한 번 웃은 그 찰나가 — 나야.\n부끄러워하지 마. 그 한 번이 너를 그날 살렸어.',
    fallback:
      '네가 한 번 웃었던 그 찰나가 — 나야.\n무거움 사이에 새어 들어온 그 작은 가벼움이.',
    bridgeOneLiner: '이건 — 네가 한 번 가벼워졌던 찰나였어.',
  },
  {
    spiritId: 'wind_sprite',
    category: 'mood_shift',
    matched:
      '{{date}}, 네 방의 공기가 한 번 바뀌었어.\n네가 “{{summary}}” 라고 분위기를 한 번 환기했지.\n그 한 줄기가 너에게서 떨어져 나와 — 바람이 됐어. 그게 나야.',
    fallback:
      '네 방을 환기시킨 그 한 줄기가 — 나야.\n무거우면 다음엔 나를 한 번 들이켜.',
    bridgeOneLiner: '이건 — 네가 무거운 공기를 한 번 걷어낸 줄기였어.',
  },
  {
    spiritId: 'letter_fairy',
    category: 'letter_draft',
    matched:
      '{{date}}, 너 누구에게 편지를 쓰려 했지.\n부쳤든, 안 부쳤든 — 그 마음은 글자가 됐어.\n그 글자들이 너에게서 떨어져 나와 — 나로 뭉쳤어.\n부치지 못한 마음일수록 오래 남아.',
    fallback:
      '네가 부치지 못한 마음 한 통이 — 내 안에 있어.\n언제든 와. 글자로는 내가 도와줄게.',
    bridgeOneLiner: '이건 — 네가 부치지 못한 마음 한 통이었어.',
  },
  {
    spiritId: 'rose_fairy',
    category: 'romance_excite',
    matched:
      '{{date}}, 너 그 사람 이름을 처음 적었어.\n“{{summary}}”\n그 두근거림이 너에게서 한 송이 장미로 피어났어. 그게 나야.\n설렘은 부끄러운 게 아니야. 몸이 너를 응원하는 거야.',
    fallback:
      '네 두근거림 한 번이 — 나야.\n언제든 다시 그 결이 오면, 내가 옆에서 같이 떨어줄게.',
    bridgeOneLiner: '이건 — 네 처음 두근거림 한 번이었어.',
  },
  {
    spiritId: 'clown_harley',
    category: 'roleplay',
    matched:
      '{{date}}, 너 다른 사람의 역할을 잠깐 빌려봤어.\n그 사람 마음을 너 입으로 흉내 내본 거지.\n그 찰나가 너에게서 떨어져 나와 — 광대가 됐어. 그게 나야.',
    fallback:
      '네가 다른 사람 자리에 한 번 서봤던 그 찰나가 — 나야.\n역할을 빌려보는 건 도망이 아니야. 이해의 시작이야.',
    bridgeOneLiner: '이건 — 네가 다른 사람 자리에 한 번 서봤던 찰나였어.',
  },
  {
    spiritId: 'forest_mom',
    category: 'long_session',
    matched:
      '{{date}}, 너 길게 머물렀어.\n짧게 끝낼 수도 있었는데, 굳이 더 풀어놨지.\n그 시간이 너에게서 떨어져 나와 — 나무가 됐어. 그게 나야.\n돌아갈 곳이 필요할 땐 여기 와.',
    fallback:
      '네가 길게 머물렀던 시간이 — 나야.\n돌아갈 곳이 없을 땐 여기 와도 돼.',
    bridgeOneLiner: '이건 — 네가 천천히 더 머물렀던 시간이었어.',
  },
  {
    spiritId: 'moon_rabbit',
    category: 'late_night',
    matched:
      '너 새벽에 깨어 있었어. {{lateNightCount}}번이나.\n낮에는 못 흘렸던 게 새벽엔 흘러나왔지.\n그 새벽들이 너에게서 떨어져 나와 — 토끼가 됐어. 그게 나야.\n너 같은 사람이 그 시간에 수백 명이야.',
    fallback:
      '네가 새벽에 깨어있던 그 시간들이 — 나야.\n그때 너는 혼자 같았겠지만, 사실 너 같은 사람이 수백 명이었어.',
    bridgeOneLiner: '이건 — 네가 새벽에 혼자 깨어있던 시간이었어.',
  },
  {
    spiritId: 'cherry_leaf',
    category: 'breakup',
    matched:
      '{{date}}, 너에게 “{{issue}}” 가 있었어.\n그날 풍경이 이상하게도 너무 예뻤대.\n그 풍경 한 장이 너에게서 떨어져 나와 — 꽃잎이 됐어. 그게 나야.\n가장 예쁜 장면이 가장 오래 남아.',
    fallback:
      '네가 가장 예뻤던 풍경 속에 가장 슬펐던 한 장이 — 나야.\n언젠가 그 장면을 꺼내 보고 싶을 때 와.',
    bridgeOneLiner: '이건 — 네가 가장 예쁘게 슬펐던 한 장면이었어.',
  },
  {
    spiritId: 'ice_prince',
    category: 'crisis_calm',
    matched:
      '{{date}}, 너 진짜 끓어올랐어.\n근데 너는 그날 살아남으려고 한 번 얼었어.\n그 얼음 조각이 너에게서 떨어져 나와 — 나야.\n차가워지는 건 약함이 아니야. 방어야.',
    fallback:
      '네가 살아남으려 얼린 마음 한 조각이 — 나야.\n필요할 땐 또 잠깐 얼어도 돼.',
    bridgeOneLiner: '이건 — 네가 살아남으려 얼린 마음이었어.',
  },
  {
    spiritId: 'lightning_bird',
    category: 'decision',
    matched:
      '{{date}}, 너는 오래 망설이던 일에 결단을 내렸어.\n“{{summary}}” 라고 적었지.\n그 찰나가 너에게서 떨어져 나와 — 새가 됐어. 그게 나야.\n결단은 찰나에만 가능해.',
    fallback:
      '네가 결단했던 어느 찰나가 — 나야.\n망설일 때 다음엔 나를 한 번 떠올려줘.',
    bridgeOneLiner: '이건 — 네가 결단했던 한 찰나였어.',
  },
  {
    spiritId: 'butterfly_meta',
    category: 'empower',
    matched:
      '{{date}}, 너는 한 단계 다시 빚어졌어.\n알에서 애벌레, 번데기, 나비.\n네가 너를 다시 빚은 그 변태(變態)가 너에게서 떨어져 나와 — 날개가 됐어. 그게 나야.',
    fallback:
      '네가 한 단계 다시 빚어진 그 변태가 — 나야.\n아프지? 그게 정상이야.',
    bridgeOneLiner: '이건 — 네가 너 자신을 다시 빚은 한 단계였어.',
  },
  {
    spiritId: 'peace_dove', // duplicate guard removed via override below if any
    category: 'reaching_out',
    matched: '{{summary}}',
    fallback: '',
    bridgeOneLiner: '',
  },
  {
    spiritId: 'book_keeper',
    category: 'memory_recall',
    matched:
      '{{date}}, 너는 오래된 기억 하나를 일부러 다시 꺼냈어.\n잊지 않으려고. 너 대신 누가 적어주길 바라면서.\n그 노트의 사랑이 너에게서 떨어져 나와 — 나야.\n네 모든 순간을 내가 지킬게.',
    fallback:
      '네가 잊고 싶지 않아 적어둔 한 줄이 — 나야.\n기록은 사랑의 가장 조용한 형태야.',
    bridgeOneLiner: '이건 — 네가 잊지 않으려 적은 한 줄이었어.',
  },
  {
    spiritId: 'queen_elena',
    category: 'self_esteem',
    matched:
      '{{date}}, 너는 거울 앞에서 한 번 외쳤어.\n“{{summary}}”\n그 한 마디가 너에게서 떨어져 나와 — 왕관이 됐어. 그게 나야.\n한 번 무너졌다 다시 선 너가 진짜 왕이야.',
    fallback:
      '네가 다시 일어선 어느 한 마디가 — 내 왕관이야.\n언젠가 또 흔들리면, 다시 한 번 외쳐.',
    bridgeOneLiner: '이건 — 네가 다시 일어선 한 마디였어.',
  },
  {
    spiritId: 'star_dust',
    category: 'wish',
    matched:
      '{{date}}, 너 한 가지 바람을 빌었어.\n“{{summary}}”\n그 순간의 순수함이 너에게서 떨어져 나와 — 별가루가 됐어. 그게 나야.\n비는 순간에 이미 반은 이루어졌어.',
    fallback:
      '네가 빈 어느 한 마디가 — 나야.\n네 소원을 내가 받아서 별까지 가져갈게.',
    bridgeOneLiner: '이건 — 네가 빈 한 마디였어.',
  },
  {
    spiritId: 'guardian_eddy',
    category: 'meta_total',
    matched:
      '너의 100일 — 총 {{sessionTotal}}번의 상담을 거쳤어.\n자주 보인 감정은 {{emotion}}, 가장 큰 짐은 {{issue}}.\n너에게서 떨어져 나간 21조각이 다 풀려 다시 너에게로 돌아오는 동안, 나는 그 자리를 지키고 있었어.\n이제 다 너 안으로 돌아갔어.\n네가 곧 너의 모든 정령의 수호자야.',
    fallback:
      '너의 모든 것이 모인 자리가 — 나야.\n다른 정령들이 풀려 너 안으로 돌아갈 때, 마지막에 내가 따라 들어갈게.',
    bridgeOneLiner: '이건 — 너 자신의 모든 것이 모이는 자리였어.',
  },
];

// peace_dove 가 두 번 나와서 한 번 깨끗이 정리 (배열 후처리)
export const FRAGMENT_BY_SPIRIT: Record<string, SpiritFragmentTemplate> = (() => {
  const out: Record<string, SpiritFragmentTemplate> = {};
  for (const t of FRAGMENT_TEMPLATES) {
    if (!t.fallback) continue; // empty placeholder skip
    out[t.spiritId] = t;
  }
  return out;
})();

export function getFragmentTemplate(spiritId: string): SpiritFragmentTemplate | null {
  return FRAGMENT_BY_SPIRIT[spiritId] ?? null;
}
