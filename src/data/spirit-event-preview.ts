/**
 * 🎴 v105: Spirit Event Preview — 도감 시그니처 무브 노출용 정적 메타.
 *
 * v104 의 SPIRIT_TO_EVENT 와 1:1 매핑되며, 카드 본문(drafts/frames/tasks 등)은
 * 절대 노출하지 않는다. 도감에서 "어떤 카드가 풀리는지" 의 결만 보여주기 위한 데이터.
 *
 * 노출 단계:
 *   - Lv.1+: cardEmoji(실루엣) / cardName="???" / tagline / momentHint
 *   - Lv.3+: 위 + cardName(풀) / cadenceHint / choiceHint / rarityNote
 *   - Lv.5+: 위 + empowerHint + 카드 셔머
 *
 * 카피 원칙: docs/spirit-event-preview-in-dex-v105-plan.md §5 참조.
 */

import type { SpiritId } from '@/types/spirit.types';
import type { SpiritEventType } from '@/engines/spirits/spirit-event-types';

export interface SpiritEventPreview {
  spiritId: SpiritId;
  eventType: SpiritEventType;
  /** 1자 이모지 — 카드 일러스트 자리. 정령 본체 emoji 와 같을 수도 다를 수도 있음. */
  cardEmoji: string;
  /** 시그니처 카드 이름. Lv.3+ 에서 노출. Lv.1~2 에선 "???" 로 가림. */
  cardName: string;
  /** 한 줄 정령 시점 카피 (Lv.1+ 노출). 따옴표 포함, 15자 이내 권장. */
  tagline: string;
  /** "언제 나오는지" 한 줄 (Lv.1+ 노출). 유저 시점 자연어. */
  momentHint: string;
  /** "얼마나 자주" 한 줄 (Lv.3+ 노출). */
  cadenceHint: string;
  /** "어떤 선택" 한 줄 (Lv.3+ 노출). 본문 텍스트 X, 결과 개수만. */
  choiceHint: string;
  /** "얼마나 귀한지" 한 줄 (Lv.3+ 노출). */
  rarityNote: string;
  /** Lv.5 강화 한 줄 (Lv.5+ 노출). 기존 abilityEnhanced 와 의미 일치, 표현은 부드럽게. */
  empowerHint: string;
}

export const SPIRIT_EVENT_PREVIEWS: Record<SpiritId, SpiritEventPreview> = {
  // ═══════════════════════ N (6) ═══════════════════════
  fire_goblin: {
    spiritId: 'fire_goblin',
    eventType: 'SPIRIT_RAGE_LETTER',
    cardEmoji: '🔥',
    cardName: '다 태워주는 편지',
    tagline: '"다 적어 — 같이 태워줄게."',
    momentHint: '네가 누군가에게 너무 화났을 때',
    cadenceHint: '같은 사람한텐 하루 한 번',
    choiceHint: '세 가지 톤 — 불 / 솔직 / 차갑게',
    rarityNote: '아무한테나 안 나타나는 카드',
    empowerHint: '분노 게이지 +10% 더 빠르게 풀려',
  },
  book_worm: {
    spiritId: 'book_worm',
    eventType: 'SPIRIT_THINK_FRAME',
    cardEmoji: '📖',
    cardName: '세 개의 시선',
    tagline: '"잠깐, 다른 각도에서도 한 번 볼래?"',
    momentHint: '네 생각이 한 길로만 가고 있을 때',
    cadenceHint: '한 세션에 한 번',
    choiceHint: '셋 중 하나 — 너 / 상대 / 제3자',
    rarityNote: '인지 왜곡 신호가 있을 때만',
    empowerHint: '분석 카드 1장 더',
  },
  tear_drop: {
    spiritId: 'tear_drop',
    eventType: 'SPIRIT_CRY_TOGETHER',
    cardEmoji: '💧',
    cardName: '1분의 침묵',
    tagline: '"말 안 해도 돼. 1분만 옆에 있을게."',
    momentHint: '네가 너무 슬플 때',
    cadenceHint: '하루 한 번',
    choiceHint: '옆에 있어 / 잠깐 다음에',
    rarityNote: '정말 깊이 가라앉은 순간만',
    empowerHint: 'TTS 음성으로 같이 울어줘',
  },
  seed_spirit: {
    spiritId: 'seed_spirit',
    eventType: 'SPIRIT_FIRST_BREATH',
    cardEmoji: '🌱',
    cardName: '첫 호흡',
    tagline: '"처음이지? 같이 숨 한 번 쉬자."',
    momentHint: '첫 대화의 첫 순간',
    cadenceHint: '새 세션 시작에만',
    choiceHint: '4-7-8 호흡 한 번',
    rarityNote: '첫 만남에만 피어나는 카드',
    empowerHint: '첫 대화 XP 2배',
  },
  drum_imp: {
    spiritId: 'drum_imp',
    eventType: 'SPIRIT_RHYTHM_CHECK',
    cardEmoji: '🥁',
    cardName: '박자 점검',
    tagline: '"둘이 박자 맞나 한 번 볼까?"',
    momentHint: '관계 페이스가 어긋나 보일 때',
    cadenceHint: '일주일에 한 번',
    choiceHint: '천천히 가보기 / 자세히 보기',
    rarityNote: '패턴이 충분히 쌓여야 보임',
    empowerHint: '박자 시각화에 음향 효과',
  },
  peace_dove: {
    spiritId: 'peace_dove',
    eventType: 'SPIRIT_OLIVE_BRANCH',
    cardEmoji: '🕊️',
    cardName: '90초의 손',
    tagline: '"먼저 내미는 게 약한 게 아니야."',
    momentHint: '다툰 뒤 첫 한 마디가 필요할 때',
    cadenceHint: '사흘에 한 번',
    choiceHint: '부드럽게 / 책임지고 / 가볍게',
    rarityNote: '화해 시나리오에서만',
    empowerHint: '재회 성공 시 🏆 뱃지',
  },

  // ═══════════════════════ R (7) ═══════════════════════
  cloud_bunny: {
    spiritId: 'cloud_bunny',
    eventType: 'SPIRIT_CLOUD_REFRAME',
    cardEmoji: '☁️',
    cardName: '미미의 번역',
    tagline: '"그거 사실 별 거 아니야~ 봐봐."',
    momentHint: '네가 작은 일에 너무 무거울 때',
    cadenceHint: '한 세션에 한 번',
    choiceHint: '가벼워졌어 / 여전히 아파',
    rarityNote: '진짜 가벼운 순간에만',
    empowerHint: '화면 파티클 강화',
  },
  letter_fairy: {
    spiritId: 'letter_fairy',
    eventType: 'SPIRIT_LETTER_BRIDGE',
    cardEmoji: '💌',
    cardName: '부치지 못한 편지',
    tagline: '"보내지 않아도 돼. 그냥 한 번 써봐."',
    momentHint: '네가 누군가에게 하고 싶은 말이 막혔을 때',
    cadenceHint: '일주일에 한 번',
    choiceHint: '서랍에 / 태워 / 계속 써',
    rarityNote: '정말 막혔을 때만 보임',
    empowerHint: '톤 4안 자동 생성',
  },
  wind_sprite: {
    spiritId: 'wind_sprite',
    eventType: 'SPIRIT_WINDOW_OPEN',
    cardEmoji: '🍃',
    cardName: '창문 열기',
    tagline: '"잠깐 바람 쐬고 오자."',
    momentHint: '5턴 넘게 무거움이 이어질 때',
    cadenceHint: '한 세션에 한 번',
    choiceHint: '3분 / 5분 / 10분 휴식',
    rarityNote: '가라앉음이 길어졌을 때만',
    empowerHint: '휴식 후 턴 속도 +20%',
  },
  moon_rabbit: {
    spiritId: 'moon_rabbit',
    eventType: 'SPIRIT_NIGHT_CONFESSION',
    cardEmoji: '🌙',
    cardName: '달에게 보내는 고백',
    tagline: '"낮에 못 한 말, 달이 들어줄게."',
    momentHint: '새벽 0~5시에 들어왔을 때',
    cadenceHint: '그 시간대 하루 한 번',
    choiceHint: '달에게 보내 / 묻어둬',
    rarityNote: '새벽에만 피는 카드',
    empowerHint: '그 시간대 무제한 대화권',
  },
  clown_harley: {
    spiritId: 'clown_harley',
    eventType: 'SPIRIT_REVERSE_ROLE',
    cardEmoji: '🎭',
    cardName: '역할 바꾸기',
    tagline: '"내가 그 사람이 돼볼게. 너는 너로 있어."',
    momentHint: '상대 입장이 안 잡힐 때',
    cadenceHint: '사흘에 한 번',
    choiceHint: '5턴 짜리 롤플',
    rarityNote: '상황이 충분히 익었을 때',
    empowerHint: '롤플 완결 XP 2배',
  },
  rose_fairy: {
    spiritId: 'rose_fairy',
    eventType: 'SPIRIT_BUTTERFLY_DIARY',
    cardEmoji: '🌹',
    cardName: '설렘 일기',
    tagline: '"오늘 가장 좋았던 한 줄, 적어둬."',
    momentHint: '설렘이 핀 순간',
    cadenceHint: '하루 한 번',
    choiceHint: '기록 / 더 적기',
    rarityNote: '설렘 점수가 임계 넘었을 때',
    empowerHint: '하트 파티클 무한',
  },
  forest_mom: {
    spiritId: 'forest_mom',
    eventType: 'SPIRIT_ROOTED_HUG',
    cardEmoji: '🌳',
    cardName: '뿌리 내린 포옹',
    tagline: '"여기, 내가 있을게."',
    momentHint: '10턴 넘게 길게 얘기한 날',
    cadenceHint: '하루 한 번',
    choiceHint: '5-4-3-2-1 그라운딩',
    rarityNote: '긴 세션 끝에만 보임',
    empowerHint: '세션 완결 💎 2배',
  },

  // ═══════════════════════ SR (5) ═══════════════════════
  cherry_leaf: {
    spiritId: 'cherry_leaf',
    eventType: 'SPIRIT_FALLEN_PETALS',
    cardEmoji: '🌸',
    cardName: '꽃잎 흩날리기',
    tagline: '"이건 끝이 아니라, 풀어주는 거야."',
    momentHint: '이별을 결정하려 할 때',
    cadenceHint: '일주일에 한 번',
    choiceHint: '흘려보내 / 더 적어',
    rarityNote: '이별 결심 순간에만',
    empowerHint: '위기 시 자동 발동',
  },
  ice_prince: {
    spiritId: 'ice_prince',
    eventType: 'SPIRIT_FREEZE_FRAME',
    cardEmoji: '❄️',
    cardName: '60초 정지',
    tagline: '"잠깐. 60초만 멈춰봐."',
    momentHint: '감정이 너무 격해질 때',
    cadenceHint: '하루 한 번',
    choiceHint: '알겠어 / 못 멈춰',
    rarityNote: '격앙 신호가 명확할 때만',
    empowerHint: '위기 모드 자동 회피',
  },
  lightning_bird: {
    spiritId: 'lightning_bird',
    eventType: 'SPIRIT_BOLT_CARD',
    cardEmoji: '⚡',
    cardName: '번개 카드',
    tagline: '"오늘은 이 친구 차례야!"',
    momentHint: '어떤 정령도 안 나서고 있을 때',
    cadenceHint: '하루 한 번',
    choiceHint: '다른 정령의 카드를 강제로',
    rarityNote: '일일 1회 한정',
    empowerHint: '특별 일화 함께 풀림',
  },
  butterfly_meta: {
    spiritId: 'butterfly_meta',
    eventType: 'SPIRIT_METAMORPHOSIS',
    cardEmoji: '🦋',
    cardName: '30일 변화 거울',
    tagline: '"30일 전 너랑 지금 너, 비교해줄게."',
    momentHint: '30일 넘게 함께한 날',
    cadenceHint: '일주일에 한 번',
    choiceHint: '봤어 / 더 보고 싶어',
    rarityNote: '30일 이상만 볼 수 있는 카드',
    empowerHint: 'ACTION_PLAN 카드 2장',
  },
  book_keeper: {
    spiritId: 'book_keeper',
    eventType: 'SPIRIT_MEMORY_KEY',
    cardEmoji: '🗝️',
    cardName: '기억의 열쇠',
    tagline: '"네가 자주 쓰는 말, 모아왔어."',
    momentHint: '30일 넘게 함께한 날',
    cadenceHint: '일주일에 한 번',
    choiceHint: '알겠어 / 더 보여줘',
    rarityNote: '패턴이 쌓여야만 풀려',
    empowerHint: '긴 기억 컨텍스트',
  },

  // ═══════════════════════ UR (2) ═══════════════════════
  queen_elena: {
    spiritId: 'queen_elena',
    eventType: 'SPIRIT_CROWN_RECLAIM',
    cardEmoji: '👑',
    cardName: '왕관 되찾기',
    tagline: '"네 자리 — 너 아니면 누가 앉아."',
    momentHint: '자기비하가 길어질 때',
    cadenceHint: '일주일에 한 번',
    choiceHint: '세 자리 봉인 해제',
    rarityNote: '정말 가라앉았을 때만',
    empowerHint: '자신감 한 달 유지',
  },
  star_dust: {
    spiritId: 'star_dust',
    eventType: 'SPIRIT_WISH_GRANT',
    cardEmoji: '🌟',
    cardName: '한 달의 소원',
    tagline: '"한 줄만 빌어. 별이 약속으로 바꿔줄게."',
    momentHint: 'EMPOWER 끝자락',
    cadenceHint: '한 달에 한 번만',
    choiceHint: '약속해 / 다시 빌어',
    rarityNote: '한 달 한 번뿐인 카드',
    empowerHint: '한 달에 두 번까지',
  },

  // ═══════════════════════ L (1) — 향후 ═══════════════════════
  guardian_eddy: {
    spiritId: 'guardian_eddy',
    eventType: 'SPIRIT_BOLT_CARD',
    cardEmoji: '💎',
    cardName: '수호의 일곱 빛',
    tagline: '"내가 모든 친구의 결을 잠깐 빌릴게."',
    momentHint: '도감 90% 이상 채웠을 때',
    cadenceHint: '일주일에 한 번',
    choiceHint: '다른 정령 효과 7개 합산',
    rarityNote: '진짜 끝까지 간 사람만',
    empowerHint: '세계관 진실 해금',
  },
};

export function getEventPreview(spiritId: SpiritId): SpiritEventPreview | null {
  return SPIRIT_EVENT_PREVIEWS[spiritId] ?? null;
}
