/**
 * 한국어 감정어 사전 및 NLP 유틸리티
 * 교착어 변형 처리를 포함한 감정 점수 계산 도구
 */

/** 감정어 항목 */
export interface EmotionEntry {
  /** 기본형 또는 어간 */
  stem: string;
  /** 감정 점수: -5(매우 부정) ~ +5(매우 긍정) */
  score: number;
  /** 카테고리 */
  category: EmotionCategory;
}

export type EmotionCategory =
  | 'positive'
  | 'negative'
  | 'romantic'
  | 'crisis'
  | 'neutral';

// ============================================================
// 긍정 감정어 사전 (어간 형태로 저장 → 변형 매칭 지원)
// ============================================================
const POSITIVE_EMOTIONS: EmotionEntry[] = [
  // 설렘·기대
  { stem: '설레', score: 4, category: 'positive' },
  { stem: '두근', score: 3, category: 'positive' },
  { stem: '기대', score: 3, category: 'positive' },
  { stem: '기다려', score: 2, category: 'positive' },
  // 행복·기쁨
  { stem: '행복', score: 5, category: 'positive' },
  { stem: '기쁘', score: 4, category: 'positive' },
  { stem: '즐거', score: 4, category: 'positive' },
  { stem: '신나', score: 3, category: 'positive' },
  { stem: '좋아', score: 3, category: 'positive' },
  { stem: '좋았', score: 3, category: 'positive' },
  { stem: '좋아서', score: 3, category: 'positive' },
  { stem: '최고', score: 4, category: 'positive' },
  { stem: '완벽', score: 4, category: 'positive' },
  // 감사·안도
  { stem: '감사', score: 4, category: 'positive' },
  { stem: '고마', score: 4, category: 'positive' },
  { stem: '고맙', score: 4, category: 'positive' },
  { stem: '안심', score: 3, category: 'positive' },
  { stem: '안도', score: 3, category: 'positive' },
  { stem: '다행', score: 3, category: 'positive' },
  { stem: '편안', score: 3, category: 'positive' },
  // 사랑·애정
  { stem: '사랑', score: 5, category: 'positive' },
  { stem: '좋아하', score: 4, category: 'positive' },
  { stem: '보고싶', score: 3, category: 'positive' },
  { stem: '보고 싶', score: 3, category: 'positive' },
  { stem: '그리', score: 2, category: 'positive' },
  { stem: '소중', score: 4, category: 'positive' },
  { stem: '특별', score: 3, category: 'positive' },
  // 희망·자신감
  { stem: '희망', score: 3, category: 'positive' },
  { stem: '자신감', score: 3, category: 'positive' },
  { stem: '용기', score: 3, category: 'positive' },
  { stem: '자신있', score: 3, category: 'positive' },
  { stem: '잘될', score: 2, category: 'positive' },
  { stem: '잘 될', score: 2, category: 'positive' },
  // 친밀감
  { stem: '따뜻', score: 3, category: 'positive' },
  { stem: '포근', score: 3, category: 'positive' },
  { stem: '가깝', score: 2, category: 'positive' },
  { stem: '친밀', score: 3, category: 'positive' },
  { stem: '친해', score: 2, category: 'positive' },
  // 성취·만족
  { stem: '뿌듯', score: 4, category: 'positive' },
  { stem: '만족', score: 3, category: 'positive' },
  { stem: '성취', score: 3, category: 'positive' },
  { stem: '해냈', score: 4, category: 'positive' },
  // 흥미·호기심
  { stem: '재미있', score: 3, category: 'positive' },
  { stem: '흥미', score: 2, category: 'positive' },
  { stem: '궁금', score: 1, category: 'positive' },
];

// ============================================================
// 부정 감정어 사전
// ============================================================
const NEGATIVE_EMOTIONS: EmotionEntry[] = [
  // 서운함·상처
  { stem: '서운', score: -3, category: 'negative' },
  { stem: '상처', score: -3, category: 'negative' },
  { stem: '실망', score: -3, category: 'negative' },
  { stem: '배신', score: -4, category: 'negative' },
  { stem: '억울', score: -3, category: 'negative' },
  // 분노·짜증
  { stem: '화나', score: -3, category: 'negative' },
  { stem: '화가', score: -3, category: 'negative' },
  { stem: '짜증', score: -3, category: 'negative' },
  { stem: '열받', score: -3, category: 'negative' },
  { stem: '분노', score: -4, category: 'negative' },
  { stem: '폭발', score: -4, category: 'negative' },
  { stem: '미치겠', score: -4, category: 'negative' },
  { stem: '빡치', score: -3, category: 'negative' },
  // 슬픔·우울
  { stem: '슬프', score: -3, category: 'negative' },
  { stem: '울고', score: -3, category: 'negative' },
  { stem: '눈물', score: -2, category: 'negative' },
  { stem: '우울', score: -4, category: 'negative' },
  { stem: '힘들', score: -3, category: 'negative' },
  { stem: '힘들어', score: -3, category: 'negative' },
  { stem: '지쳤', score: -3, category: 'negative' },
  { stem: '지치', score: -3, category: 'negative' },
  // 불안·두려움
  { stem: '불안', score: -3, category: 'negative' },
  { stem: '걱정', score: -2, category: 'negative' },
  { stem: '무서', score: -3, category: 'negative' },
  { stem: '두려', score: -3, category: 'negative' },
  { stem: '겁나', score: -3, category: 'negative' },
  { stem: '떨려', score: -2, category: 'negative' },
  { stem: '초조', score: -2, category: 'negative' },
  // 외로움·고독
  { stem: '외로', score: -3, category: 'negative' },
  { stem: '혼자', score: -2, category: 'negative' },
  { stem: '고독', score: -3, category: 'negative' },
  { stem: '아무도', score: -2, category: 'negative' },
  // 답답·막막
  { stem: '답답', score: -3, category: 'negative' },
  { stem: '막막', score: -3, category: 'negative' },
  { stem: '모르겠', score: -2, category: 'negative' },
  { stem: '어떡', score: -2, category: 'negative' },
  { stem: '어떻게', score: -1, category: 'negative' },
  // 죄책감·자책
  { stem: '미안', score: -2, category: 'negative' },
  { stem: '죄책', score: -3, category: 'negative' },
  { stem: '자책', score: -3, category: 'negative' },
  { stem: '후회', score: -3, category: 'negative' },
  { stem: '잘못', score: -2, category: 'negative' },
  // 무기력
  { stem: '무기력', score: -4, category: 'negative' },
  { stem: '포기', score: -3, category: 'negative' },
  { stem: '싫', score: -3, category: 'negative' },
  { stem: '귀찮', score: -2, category: 'negative' },
  { stem: '의미없', score: -4, category: 'negative' },
  { stem: '의미 없', score: -4, category: 'negative' },
  // [추가] KNU 감성사전 극부정 확장
  { stem: '참담', score: -4, category: 'negative' },
  { stem: '비참', score: -4, category: 'negative' },
  { stem: '허탈', score: -3, category: 'negative' },
  { stem: '허무', score: -3, category: 'negative' },
  { stem: '공허', score: -3, category: 'negative' },
  { stem: '절박', score: -3, category: 'negative' },
  { stem: '치욕', score: -4, category: 'negative' },
  { stem: '처절', score: -4, category: 'negative' },
  { stem: '고통', score: -4, category: 'negative' },
  { stem: '절규', score: -4, category: 'negative' },
  { stem: '무감각', score: -3, category: 'negative' },
  { stem: '감정 없', score: -3, category: 'negative' },
  { stem: '감정이 없', score: -3, category: 'negative' },
  { stem: '텅 빈', score: -3, category: 'negative' },
  { stem: '아무 감정', score: -3, category: 'negative' },
  { stem: '쓸쓸', score: -3, category: 'negative' },
  { stem: '서글프', score: -3, category: 'negative' },
  { stem: '비통', score: -4, category: 'negative' },
  { stem: '원망', score: -3, category: 'negative' },
  { stem: '증오', score: -4, category: 'negative' },
];

// ============================================================
// 연애 특화 표현 사전
// ============================================================
const ROMANTIC_EXPRESSIONS: EmotionEntry[] = [
  // 연락 관련
  { stem: '읽씹', score: -4, category: 'romantic' },
  { stem: '안읽씹', score: -3, category: 'romantic' },
  { stem: '씹', score: -3, category: 'romantic' },
  { stem: '카톡', score: 0, category: 'romantic' },
  { stem: '연락', score: -1, category: 'romantic' },
  { stem: '연락이 없', score: -3, category: 'romantic' },
  { stem: '연락 없', score: -3, category: 'romantic' },
  { stem: '연락 안', score: -3, category: 'romantic' },
  { stem: '답장', score: -1, category: 'romantic' },
  { stem: '답장이 없', score: -3, category: 'romantic' },
  { stem: '문자', score: 0, category: 'romantic' },
  { stem: '전화', score: 0, category: 'romantic' },
  { stem: '전화 안', score: -2, category: 'romantic' },
  // 이별·거절
  { stem: '차였', score: -5, category: 'romantic' },
  { stem: '차이', score: -4, category: 'romantic' },
  { stem: '헤어', score: -4, category: 'romantic' },
  { stem: '이별', score: -4, category: 'romantic' },
  { stem: '이별했', score: -4, category: 'romantic' },
  { stem: '헤어졌', score: -4, category: 'romantic' },
  { stem: '거절', score: -3, category: 'romantic' },
  { stem: '고백', score: 2, category: 'romantic' },
  // 바람·불신
  { stem: '바람', score: -5, category: 'romantic' },
  { stem: '바람피', score: -5, category: 'romantic' },
  { stem: '외도', score: -5, category: 'romantic' },
  { stem: '불륜', score: -5, category: 'romantic' },
  { stem: '의심', score: -3, category: 'romantic' },
  { stem: '믿을 수 없', score: -4, category: 'romantic' },
  { stem: '믿을수없', score: -4, category: 'romantic' },
  // 관계 긍정
  { stem: '사귀', score: 3, category: 'romantic' },
  { stem: '오래오래', score: 2, category: 'romantic' },
  { stem: '함께', score: 2, category: 'romantic' },
  { stem: '데이트', score: 3, category: 'romantic' },
  { stem: '커플', score: 2, category: 'romantic' },
  // 집착·불안애착
  { stem: '집착', score: -3, category: 'romantic' },
  { stem: '매달', score: -3, category: 'romantic' },
  { stem: '버려질', score: -4, category: 'romantic' },
  { stem: '버려지', score: -4, category: 'romantic' },
  // [추가] 연애 특화 확장
  { stem: '잠수', score: -3, category: 'romantic' },
  { stem: '잠수타', score: -3, category: 'romantic' },
  { stem: '디엠', score: 0, category: 'romantic' },
  { stem: '좋아요 취소', score: -2, category: 'romantic' },
  { stem: '차단', score: -4, category: 'romantic' },
  { stem: '차단당', score: -4, category: 'romantic' },
  { stem: '썸', score: 1, category: 'romantic' },
  { stem: '밀당', score: -1, category: 'romantic' },
  { stem: '돌싱', score: -1, category: 'romantic' },
  { stem: '프로필 사진', score: 0, category: 'romantic' },
  { stem: '스토리', score: 0, category: 'romantic' },
  { stem: '전남친', score: -2, category: 'romantic' },
  { stem: '전여친', score: -2, category: 'romantic' },
  { stem: '재회', score: 1, category: 'romantic' },
  { stem: '플러팅', score: 1, category: 'romantic' },
];

// ============================================================
// 위기 표현 (최고 가중치)
// ============================================================
const CRISIS_EXPRESSIONS: EmotionEntry[] = [
  { stem: '죽고싶', score: -5, category: 'crisis' },
  { stem: '죽고 싶', score: -5, category: 'crisis' },
  { stem: '자살', score: -5, category: 'crisis' },
  { stem: '사라지고싶', score: -5, category: 'crisis' },
  { stem: '사라지고 싶', score: -5, category: 'crisis' },
  { stem: '없어지고싶', score: -5, category: 'crisis' },
  { stem: '없어지고 싶', score: -5, category: 'crisis' },
  { stem: '살고싶지않', score: -5, category: 'crisis' },
  { stem: '살기싫', score: -5, category: 'crisis' },
];

// ============================================================
// SNS/신조어 사전 (KNU 신조어 확장 참고)
// ============================================================
const SNS_EXPRESSIONS: EmotionEntry[] = [
  { stem: '멘붕', score: -3, category: 'negative' },
  { stem: '현타', score: -2, category: 'negative' },
  { stem: '심쿵', score: 3, category: 'positive' },
  { stem: '꿀잼', score: 2, category: 'positive' },
  { stem: 'ㅠㅠ', score: -1, category: 'negative' },
  { stem: 'ㅜㅜ', score: -1, category: 'negative' },
  { stem: 'ㅋㅋ', score: 1, category: 'positive' },
  { stem: 'ㅎㅎ', score: 1, category: 'positive' },
  { stem: '존좋', score: 3, category: 'positive' },
  { stem: '존잘', score: 2, category: 'positive' },
  { stem: '혜자', score: 2, category: 'positive' },
  { stem: '레전드', score: 2, category: 'positive' },
  { stem: '노답', score: -3, category: 'negative' },
  { stem: '킹받', score: -3, category: 'negative' },
  { stem: '억까', score: -3, category: 'negative' },
];

/** 전체 감정어 사전 */
export const EMOTION_LEXICON: EmotionEntry[] = [
  ...CRISIS_EXPRESSIONS,
  ...SNS_EXPRESSIONS,
  ...POSITIVE_EMOTIONS,
  ...NEGATIVE_EMOTIONS,
  ...ROMANTIC_EXPRESSIONS,
];

/**
 * 한국어 교착어 어간 매칭
 * 예: 어간 "서운" → "서운하다", "서운해", "서운했다", "서운함" 모두 매칭
 */
export function stemMatch(text: string, stem: string): boolean {
  return text.includes(stem);
}

/**
 * 텍스트에서 감정 점수 계산
 * @returns -5 ~ +5 범위의 감정 점수
 */
export function calcEmotionScore(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const lower = text.toLowerCase();
  let totalScore = 0;
  let matchCount = 0;

  for (const entry of EMOTION_LEXICON) {
    if (stemMatch(lower, entry.stem)) {
      // 위기 표현은 즉시 최저 점수 반환
      if (entry.category === 'crisis') {
        return -5;
      }
      totalScore += entry.score;
      matchCount++;
    }
  }

  if (matchCount === 0) return 0;

  // 평균 점수를 -5~+5 범위로 클램프
  const avg = totalScore / matchCount;
  return Math.max(-5, Math.min(5, Math.round(avg)));
}

/**
 * 텍스트에서 매칭된 감정어 목록 반환
 */
export function findMatchedEmotions(text: string): EmotionEntry[] {
  const lower = text.toLowerCase();
  return EMOTION_LEXICON.filter((entry) => stemMatch(lower, entry.stem));
}

/**
 * 위기 표현 포함 여부 확인
 */
export function hasCrisisExpression(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_EXPRESSIONS.some((entry) => stemMatch(lower, entry.stem));
}

/**
 * 연애 특화 표현 포함 여부 확인
 */
export function hasRomanticExpression(text: string): boolean {
  const lower = text.toLowerCase();
  return ROMANTIC_EXPRESSIONS.some((entry) => stemMatch(lower, entry.stem));
}
