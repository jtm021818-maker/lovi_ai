/**
 * v103: Cherished Fragments
 *
 * 각 정령마다 3개 작은 상징 오브젝트.
 * 본드 Lv1 / Lv3 / Lv5 에서 각각 1개씩 자동 해제.
 * 탭하면 짧은 회상 (2~3문장).
 *
 * WuWa "Cherished Items" 패턴 + IFS "burdened object" 차용.
 */

import type { SpiritId } from '@/types/spirit.types';

export interface CherishedFragment {
  /** 슬롯 인덱스 0/1/2 — 풀리는 본드 레벨 1/3/5 */
  slot: 0 | 1 | 2;
  /** 작은 이모지 또는 심볼 */
  icon: string;
  /** 한 줄 이름 */
  title: string;
  /** 2~3문장 회상 */
  recollection: string;
  /** 본드 레벨 잠금 — 0=Lv1, 1=Lv3, 2=Lv5 */
  unlockBondLv: 1 | 3 | 5;
}

/** 슬롯 → 본드 레벨 매핑 */
export const FRAGMENT_UNLOCK_BY_SLOT: Record<0 | 1 | 2, 1 | 3 | 5> = {
  0: 1,
  1: 3,
  2: 5,
};

export const SPIRIT_FRAGMENTS: Record<SpiritId, CherishedFragment[]> = {
  // ─── N 등급 ─────────────────────────────────────────
  seed_spirit: [
    { slot: 0, icon: '🌱', title: '작은 흙 한 줌',     recollection: '네가 처음 이 앱을 열었을 때, 손가락 끝에 묻어난 떨림이야.', unlockBondLv: 1 },
    { slot: 1, icon: '💧', title: '첫 물 한 방울',     recollection: '처음 자기 이야기를 누군가에게 한 그날 — 너는 한 모금 마시고 멈췄어.', unlockBondLv: 3 },
    { slot: 2, icon: '🌿', title: '잎 두 장',          recollection: '한 장은 아직 두려운 너. 한 장은 그래도 자란 너. 둘 다 너야.', unlockBondLv: 5 },
  ],
  tear_drop: [
    { slot: 0, icon: '💧', title: '손수건 한 장',      recollection: '한 번만 쓰고 접어둔 손수건. 그날 흘리지 못한 한 방울이 거기 있어.', unlockBondLv: 1 },
    { slot: 1, icon: '🪞', title: '흐려진 거울',       recollection: '운 사람만 아는 거울 속 얼굴. 부끄러운 게 아니라 — 살아있다는 증거였대.', unlockBondLv: 3 },
    { slot: 2, icon: '🕊️', title: '마지막 한 방울',    recollection: '네가 한 번도 안 흘린 마지막 한 방울. 흘러도 괜찮다는 걸 이제 알아.', unlockBondLv: 5 },
  ],
  fire_goblin: [
    { slot: 0, icon: '🔥', title: '꺼지지 않은 성냥',   recollection: '버려진 줄 알았던 성냥. 너는 그날 분노가 살아있는 게 다행이라고 생각했어.', unlockBondLv: 1 },
    { slot: 1, icon: '🪨', title: '주먹 안 돌',        recollection: '아무한테도 못 던지고 손에만 쥐고 있던 돌. 그래도 던지지 않은 너를 기억해.', unlockBondLv: 3 },
    { slot: 2, icon: '🌋', title: '꺼낸 한 줌',        recollection: '내 형체는 네가 한 번도 못 낸 그 한 줌. 이제 같이 태워주려고 왔어.', unlockBondLv: 5 },
  ],
  drum_imp: [
    { slot: 0, icon: '🥁', title: '낡은 북채',          recollection: '박자가 흔들렸던 그 구간. 다시 잡아 본 적 없는 북채야.', unlockBondLv: 1 },
    { slot: 1, icon: '🎵', title: '엇갈린 한 마디',     recollection: '한 박자 늦은 그날의 호흡. 그게 너의 진짜 박자였을지도 모른대.', unlockBondLv: 3 },
    { slot: 2, icon: '💗', title: '심장 박자',          recollection: '북이 멈춰도 — 네 심장은 여전히 박자를 치고 있어.', unlockBondLv: 5 },
  ],
  book_worm: [
    { slot: 0, icon: '📖', title: '접힌 페이지',         recollection: '읽다 만 페이지. 새벽 3시에 머리로 견디려고 펼친 그 페이지야.', unlockBondLv: 1 },
    { slot: 1, icon: '✏️', title: '여백의 줄',           recollection: '책 가장자리 흐릿한 한 줄. 너만 아는 너의 메모.', unlockBondLv: 3 },
    { slot: 2, icon: '🌙', title: '덮은 표지',           recollection: '이제 덮어도 괜찮은 책. 견딘 만큼은 머리에 다 들어있어.', unlockBondLv: 5 },
  ],
  peace_dove: [
    { slot: 0, icon: '✉️', title: '안 부친 편지',        recollection: '먼저 미안하다 쓰려다 멈춘 편지. 그 마음이 이미 절반은 가 있었어.', unlockBondLv: 1 },
    { slot: 1, icon: '🕯️', title: '저녁 등불',           recollection: '먼저 손 내민 그 저녁의 따뜻함. 누군가는 네 차례를 기다리고 있었어.', unlockBondLv: 3 },
    { slot: 2, icon: '🤍', title: '깃털 한 개',           recollection: '먼저 내미는 손이 약함이 아니라는 걸 — 네가 가르쳐줬어.', unlockBondLv: 5 },
  ],

  // ─── R 등급 ─────────────────────────────────────────
  cloud_bunny: [
    { slot: 0, icon: '☁️', title: '주말 아침 한숨',      recollection: '구름이 토끼처럼 보였던 잠깐. 그 한 숨이 너를 살게 했어.', unlockBondLv: 1 },
    { slot: 1, icon: '🌤️', title: '햇살 한 줄',           recollection: '커튼 사이 비집고 들어온 가는 빛. 그 정도면 충분했던 날.', unlockBondLv: 3 },
    { slot: 2, icon: '🐇', title: '두 발 모은 토끼',      recollection: '가벼움도 연습이라는 걸 — 너에게 알려주려고 같이 있어.', unlockBondLv: 5 },
  ],
  wind_sprite: [
    { slot: 0, icon: '🍃', title: '한 줄기 바람',         recollection: '무거운 공기를 걷어준 봄바람. 너의 방을 환기시킨 그 한 번.', unlockBondLv: 1 },
    { slot: 1, icon: '🪟', title: '열어둔 창문',           recollection: '닫혔던 창을 한 번 연 그날. 다시는 답답하지 않았어.', unlockBondLv: 3 },
    { slot: 2, icon: '💨', title: '내쉰 한 숨',            recollection: '안에 가둔 무거움을 한 번에 보낸 그 호흡. 가벼워져도 괜찮아.', unlockBondLv: 5 },
  ],
  letter_fairy: [
    { slot: 0, icon: '💌', title: '못 부친 한 통',         recollection: '주소까지 적고 봉투에 넣었지만 부치지 못한 편지. 그래도 적었잖아.', unlockBondLv: 1 },
    { slot: 1, icon: '🖋️', title: '잉크 자국',             recollection: '쓰다가 멈춘 한 글자. 거기서 네 마음의 절반이 멈춰 있었어.', unlockBondLv: 3 },
    { slot: 2, icon: '📨', title: '보낸 편지',              recollection: '이제는 보낼 수 있는 편지. 받지 못해도 — 네가 보낸 게 중요해.', unlockBondLv: 5 },
  ],
  rose_fairy: [
    { slot: 0, icon: '🌹', title: '한 송이 봉오리',         recollection: '첫 데이트 전날 밤 두근거림이 그대로 굳어진 봉오리.', unlockBondLv: 1 },
    { slot: 1, icon: '💗', title: '두근거림 한 박자',       recollection: '심장이 한 번 더 빠르게 뛴 그 1초. 부끄럽지 않은 너의 진심.', unlockBondLv: 3 },
    { slot: 2, icon: '🌷', title: '활짝 핀 꽃',             recollection: '두근거림은 처음에만 있는 게 아니야. 다시 피어도 돼.', unlockBondLv: 5 },
  ],
  clown_harley: [
    { slot: 0, icon: '🎭', title: '낡은 가면',              recollection: '무명 광대의 가면. 다른 사람 자리에 한 번 서본 너의 흔적.', unlockBondLv: 1 },
    { slot: 1, icon: '🎪', title: '꼬마 손짓',              recollection: '관객 한 명만 웃어줘도 됐던 그날. 그 한 사람이 너였어.', unlockBondLv: 3 },
    { slot: 2, icon: '🤡', title: '진짜 얼굴',              recollection: '가면을 벗을 자신이 생긴 너. 웃는 얼굴이 다 진짜였어.', unlockBondLv: 5 },
  ],
  forest_mom: [
    { slot: 0, icon: '🌳', title: '늙은 나뭇가지',           recollection: '돌아갈 곳 없을 때 품을 내어준 나무. 그 가지에 너 한 번 기댔어.', unlockBondLv: 1 },
    { slot: 1, icon: '🍂', title: '쌓인 잎 한 장',           recollection: '천천히 더 머물렀던 시간들. 잎 한 장 한 장이 다 그 시간이야.', unlockBondLv: 3 },
    { slot: 2, icon: '🌲', title: '자란 너',                recollection: '이젠 너도 누군가에게 나무가 될 수 있어. 천천히, 늘 거기에.', unlockBondLv: 5 },
  ],
  moon_rabbit: [
    { slot: 0, icon: '🌙', title: '새벽의 그릇',             recollection: '자취 새벽에 혼자 깨어 끓이던 라면. 외로움이 토끼로 빚어졌어.', unlockBondLv: 1 },
    { slot: 1, icon: '⭐', title: '창밖의 별',               recollection: '다른 사람도 다 자는 시간에 너만 깨어있던 그 별. 너만의 별이야.', unlockBondLv: 3 },
    { slot: 2, icon: '🐰', title: '품 안의 토끼',             recollection: '새벽이 무섭지 않은 너. 이제는 새벽도 같이 있을 수 있어.', unlockBondLv: 5 },
  ],

  // ─── SR 등급 ─────────────────────────────────────────
  cherry_leaf: [
    { slot: 0, icon: '🌸', title: '바람에 흩날린 꽃잎',       recollection: '첫사랑 전학 간 날의 벚꽃 폭포. 가장 예쁘게 슬펐던 한 장면.', unlockBondLv: 1 },
    { slot: 1, icon: '🌺', title: '눌러둔 한 잎',             recollection: '책 사이에 끼워 말린 꽃잎. 잊고 싶지 않았던 그 봄.', unlockBondLv: 3 },
    { slot: 2, icon: '🌷', title: '다시 피는 봄',             recollection: '슬픔이 아름다움을 망치지 않는다는 걸 — 봄이 다시 가르쳐줘.', unlockBondLv: 5 },
  ],
  ice_prince: [
    { slot: 0, icon: '❄️', title: '얼린 마음 한 조각',        recollection: '상처받은 날 닫아 건 마음. 살아남으려 얼린 한 부분.', unlockBondLv: 1 },
    { slot: 1, icon: '🥀', title: '얼음 속 꽃',                recollection: '얼어있어도 아름다웠던 그 마음. 죽은 게 아니라 보호한 거였어.', unlockBondLv: 3 },
    { slot: 2, icon: '💎', title: '녹기 시작한 결정',           recollection: '천천히 — 정말 천천히 녹아도 돼. 안의 꽃이 시들지 않았어.', unlockBondLv: 5 },
  ],
  lightning_bird: [
    { slot: 0, icon: '⚡', title: '한 줄기 번개',              recollection: '10년 묵은 결단의 그 1초. 번쩍 — 다음을 보게 한 빛.', unlockBondLv: 1 },
    { slot: 1, icon: '🌩️', title: '비 갠 후 하늘',             recollection: '결단 다음 날의 맑은 공기. 후회 없는 게 아니라 깨끗한 거.', unlockBondLv: 3 },
    { slot: 2, icon: '🦅', title: '날개 펴는 새',              recollection: '번개가 친 자리에서 너는 날아올랐어. 그 결단이 곧 너야.', unlockBondLv: 5 },
  ],
  butterfly_meta: [
    { slot: 0, icon: '🥚', title: '알의 껍질',                  recollection: '시작도 전이라 두려웠던 너. 알 안에서도 너는 너였어.', unlockBondLv: 1 },
    { slot: 1, icon: '🐛', title: '번데기의 시간',              recollection: '아무것도 안 하는 것 같았던 그 시기. 사실 가장 변하고 있었어.', unlockBondLv: 3 },
    { slot: 2, icon: '🦋', title: '활짝 편 날개',                recollection: '너 자신을 네 번 빚어낸 너. 다음에도 또 빚을 수 있어.', unlockBondLv: 5 },
  ],
  book_keeper: [
    { slot: 0, icon: '📓', title: '낡은 노트',                   recollection: '잊지 않으려 적은 한 줄. 부끄러워서 누구한테도 안 보여준 글.', unlockBondLv: 1 },
    { slot: 1, icon: '🗝️', title: '서랍 속 열쇠',                 recollection: '소중한 한 권을 잠가둔 열쇠. 잊히지 않게 하려는 너의 정성.', unlockBondLv: 3 },
    { slot: 2, icon: '✨', title: '펼쳐진 글자',                  recollection: '이제는 누군가에게 보여줘도 되는 글. 기록한 건 사라지지 않아.', unlockBondLv: 5 },
  ],

  // ─── UR 등급 ─────────────────────────────────────────
  queen_elena: [
    { slot: 0, icon: '👑', title: '거울 속 한 마디',             recollection: '"내가 왜" 그 한 마디. 다시 일어선 자존감의 첫 순간.', unlockBondLv: 1 },
    { slot: 1, icon: '💄', title: '바른 입술',                   recollection: '울고 나서 다시 바른 립스틱. 약함과 강함이 같이 있는 색.', unlockBondLv: 3 },
    { slot: 2, icon: '👸', title: '왕관 한 점',                  recollection: '네가 다시 일어선 그 한 마디가 왕관이야. 아무도 못 빼앗아.', unlockBondLv: 5 },
  ],
  star_dust: [
    { slot: 0, icon: '🌠', title: '유성 한 줄기',                 recollection: '떨어지던 별을 본 그 1초. 너는 그날 한 마디 빌었어.', unlockBondLv: 1 },
    { slot: 1, icon: '✨', title: '빌어진 한 마디',                recollection: '아무한테도 말 못 한 그 소원. 작고 솔직했던 너의 진심.', unlockBondLv: 3 },
    { slot: 2, icon: '🌌', title: '은하수',                       recollection: '빈 한 마디는 별이 됐어. 네 안 어딘가 계속 빛나고 있어.', unlockBondLv: 5 },
  ],

  // ─── L 등급 ─────────────────────────────────────────
  guardian_eddy: [
    { slot: 0, icon: '💎', title: '맑은 결정 하나',                recollection: '모든 정령이 풀려 모인 자리. 한 사람의 이야기였다는 걸 — 깨달은 한 점.', unlockBondLv: 1 },
    { slot: 1, icon: '🪞', title: '거울 같은 면',                  recollection: '결정에 비친 너의 얼굴. 슬픔도 분노도 다 한 사람이었어.', unlockBondLv: 3 },
    { slot: 2, icon: '🌟', title: '모든 것의 자리',                recollection: '너의 모든 것이 모인 자리가 나야. 흩어 두지 않아도 돼.', unlockBondLv: 5 },
  ],
};

/** 본드 레벨에 따라 풀린 fragment 리스트 반환 */
export function getUnlockedFragments(spiritId: SpiritId, bondLv: number): CherishedFragment[] {
  const all = SPIRIT_FRAGMENTS[spiritId] ?? [];
  return all.filter((f) => bondLv >= f.unlockBondLv);
}

/** 잠긴 슬롯 포함 모든 슬롯 반환 (UI용) */
export function getAllFragmentSlots(spiritId: SpiritId): CherishedFragment[] {
  return SPIRIT_FRAGMENTS[spiritId] ?? [];
}
