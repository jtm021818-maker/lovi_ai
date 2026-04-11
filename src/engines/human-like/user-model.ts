/**
 * 🆕 v31: User Model — 유저 성격/패턴 학습
 *
 * 세션마다 유저의 대화 스타일, 감정 패턴, 관계를 학습.
 * 루나가 "이 유저는 직설을 좋아해" "이 유저는 매번 양보해"를 알게 됨.
 *
 * API 호출: 0 (코드 레벨 통계)
 * DB: user_profiles.user_model (JSONB)
 */

// ============================================
// 유저 모델 타입
// ============================================

export interface UserModel {
  communicationStyle: {
    prefersDirect: number;     // 0-1 (직설 선호도)
    prefersHumor: number;      // 0-1
    prefersAdvice: number;     // 0-1 (조언 vs 공감만)
    avgMessageLength: number;
    emojiFrequency: number;    // 0-1
  };
  emotionalPatterns: {
    topTriggers: string[];     // 자주 감정적인 주제
    copingStyle: 'express' | 'suppress' | 'mixed';
    recoverySpeed: 'fast' | 'moderate' | 'slow';
  };
  relationships: RelationshipEntity[];
  lunaRelationship: {
    /** v41: 4축 평균 미러링 (하위 호환 + 빠른 접근용). 실제 소스는 intimacy.dimensions */
    intimacyScore: number;     // 0-100
    sharedLanguage: Array<{ term: string; meaning: string }>;
    /** v41: dimensions.trust / 100 미러링 */
    trustLevel: number;        // 0-1
  };
  /**
   * 🆕 v41: 다차원 친밀도 상태 (4축 + 레벨 + 히스토리)
   * 🆕 v41.1: 페르소나별로 분리 — 루나와 타로냥은 완전히 독립된 관계
   *   - 루나와의 관계 발전이 타로냥 친밀도에 영향을 주지 않음
   *   - 각자 자기만의 감쇠, 트리거, 레벨업 타임라인
   */
  intimacy?: {
    luna: import('@/engines/intimacy').IntimacyState;
    tarot: import('@/engines/intimacy').IntimacyState;
  };
}

export interface RelationshipEntity {
  name: string;
  role: 'partner' | 'ex' | 'friend' | 'family' | 'crush' | 'unknown';
  status: 'active' | 'ended' | 'complicated';
  keyEvents: Array<{ event: string; date: string }>;
}

export function createDefaultUserModel(): UserModel {
  // 🆕 v41: 지연 import로 순환 참조 방지
  const { createDefaultIntimacyState } = require('@/engines/intimacy/types') as typeof import('@/engines/intimacy/types');
  return {
    communicationStyle: {
      prefersDirect: 0.5,
      prefersHumor: 0.5,
      prefersAdvice: 0.5,
      avgMessageLength: 30,
      emojiFrequency: 0.3,
    },
    emotionalPatterns: {
      topTriggers: [],
      copingStyle: 'mixed',
      recoverySpeed: 'moderate',
    },
    relationships: [],
    lunaRelationship: {
      intimacyScore: 10,
      sharedLanguage: [],
      trustLevel: 0.3,
    },
    // 🆕 v41.1: 페르소나별 분리 친밀도 초기 상태
    intimacy: {
      luna: createDefaultIntimacyState(),
      tarot: createDefaultIntimacyState(),
    },
  };
}

// ============================================
// 세션에서 유저 모델 학습 (코드 레벨, API 0)
// ============================================

/**
 * 유저 메시지들에서 communicationStyle 업데이트
 */
export function learnFromSession(
  model: UserModel,
  userMessages: string[],
  sessionCount: number,
): UserModel {
  if (userMessages.length === 0) return model;

  const m = { ...model };
  const cs = { ...m.communicationStyle };
  const ep = { ...m.emotionalPatterns };
  const lr = { ...m.lunaRelationship };

  // --- Communication Style ---

  // 평균 메시지 길이 (이동 평균)
  const avgLen = userMessages.reduce((s, msg) => s + msg.length, 0) / userMessages.length;
  cs.avgMessageLength = cs.avgMessageLength * 0.7 + avgLen * 0.3; // 30% 반영

  // 이모지 빈도
  const emojiMsgs = userMessages.filter(msg => /[ㅋㅎㅠㅜ]{2,}|[\u{1F300}-\u{1F9FF}]/u.test(msg)).length;
  const newEmojiFreq = emojiMsgs / userMessages.length;
  cs.emojiFrequency = cs.emojiFrequency * 0.7 + newEmojiFreq * 0.3;

  // 직설 선호도 (짧은 메시지 + 직접적 표현 = 직설 선호)
  const directMsgs = userMessages.filter(msg =>
    /솔직히|그냥|바로|직접|아니/.test(msg)
  ).length;
  if (directMsgs > userMessages.length * 0.3) {
    cs.prefersDirect = Math.min(1, cs.prefersDirect + 0.05);
  }

  // 조언 선호도 (질문형 메시지 = 조언 원함)
  const adviceMsgs = userMessages.filter(msg =>
    /어떡|어떻게|해야|해줘|알려|방법/.test(msg)
  ).length;
  if (adviceMsgs > 0) {
    cs.prefersAdvice = Math.min(1, cs.prefersAdvice + 0.05 * adviceMsgs);
  }

  // --- Emotional Patterns ---

  // 감정 트리거 키워드 추출
  const triggerKeywords: Record<string, number> = {};
  for (const msg of userMessages) {
    if (/읽씹|잠수|연락/.test(msg)) triggerKeywords['연락'] = (triggerKeywords['연락'] ?? 0) + 1;
    if (/바람|외도|다른.*[여남]/.test(msg)) triggerKeywords['배신'] = (triggerKeywords['배신'] ?? 0) + 1;
    if (/싸[웠움]|다[퉜툼]/.test(msg)) triggerKeywords['갈등'] = (triggerKeywords['갈등'] ?? 0) + 1;
    if (/질투|집착|의심/.test(msg)) triggerKeywords['질투'] = (triggerKeywords['질투'] ?? 0) + 1;
    if (/헤어|이별/.test(msg)) triggerKeywords['이별'] = (triggerKeywords['이별'] ?? 0) + 1;
    if (/외로|혼자/.test(msg)) triggerKeywords['외로움'] = (triggerKeywords['외로움'] ?? 0) + 1;
  }
  // 기존 트리거에 합산
  const existingTriggers = new Set(ep.topTriggers);
  for (const [trigger, count] of Object.entries(triggerKeywords)) {
    if (count >= 2) existingTriggers.add(trigger);
  }
  ep.topTriggers = [...existingTriggers].slice(0, 5);

  // 대처 스타일 (감정 표현 vs 억제)
  const expressiveMsgs = userMessages.filter(msg => /ㅠ{2,}|힘[들드]|속상|화[가나]|슬[퍼프]/.test(msg)).length;
  const suppressiveMsgs = userMessages.filter(msg => /괜찮|별거.*아닌|그냥|몰라/.test(msg)).length;
  if (expressiveMsgs > suppressiveMsgs * 2) ep.copingStyle = 'express';
  else if (suppressiveMsgs > expressiveMsgs * 2) ep.copingStyle = 'suppress';

  // --- Luna Relationship (legacy mirror) ---
  // 🆕 v41.1: 레거시 intimacyScore는 루나 4축 평균으로 파생.
  //  실제 업데이트는 pipeline/index.ts에서 processTriggers()가 담당.
  //  레거시 mirror는 루나 기준 (legacy 이름도 lunaRelationship).
  if (m.intimacy?.luna) {
    const dims = m.intimacy.luna.dimensions;
    const avg = (dims.trust + dims.openness + dims.bond + dims.respect) / 4;
    lr.intimacyScore = Math.round(avg);
    lr.trustLevel = Math.min(1, dims.trust / 100);
  } else {
    // Fallback — 기존 공식
    lr.intimacyScore = Math.min(100,
      sessionCount * 3 +
      userMessages.length * 0.2 +
      (expressiveMsgs * 2) +
      Math.log2(1 + sessionCount) * 5
    );
    lr.trustLevel = Math.min(1, lr.intimacyScore / 100);
  }

  m.communicationStyle = cs;
  m.emotionalPatterns = ep;
  m.lunaRelationship = lr;
  return m;
}

// ============================================
// 유저 모델 → 프롬프트 주입 (~40토큰)
// ============================================

export function buildUserModelPrompt(model: UserModel): string {
  const parts: string[] = [];

  // 대화 스타일 적응
  if (model.communicationStyle.prefersDirect > 0.7) {
    parts.push('이 유저는 직설을 좋아해. 돌려 말하지 마.');
  }
  if (model.communicationStyle.prefersAdvice > 0.7) {
    parts.push('이 유저는 조언을 원하는 편이야.');
  } else if (model.communicationStyle.prefersAdvice < 0.3) {
    parts.push('이 유저는 조언보다 공감을 원해.');
  }

  // 감정 패턴
  if (model.emotionalPatterns.topTriggers.length > 0) {
    parts.push(`자주 힘들어하는 주제: ${model.emotionalPatterns.topTriggers.join(', ')}`);
  }
  if (model.emotionalPatterns.copingStyle === 'suppress') {
    parts.push('이 유저는 감정을 잘 안 드러내. "괜찮아" 뒤에 진짜 감정이 있을 수 있어.');
  }

  // 관계
  const partner = model.relationships.find(r => r.role === 'partner' && r.status === 'active');
  if (partner) {
    parts.push(`현재 파트너: ${partner.name}`);
  }

  // 친밀도
  const intimacy = model.lunaRelationship.intimacyScore;
  if (intimacy >= 60) {
    parts.push('너랑 꽤 친해진 사이. 편하게 솔직하게 말해도 돼.');
  } else if (intimacy >= 30) {
    parts.push('좀 알아가는 사이. 아직 조심스럽게.');
  }

  // 우리만의 언어
  if (model.lunaRelationship.sharedLanguage.length > 0) {
    const lang = model.lunaRelationship.sharedLanguage
      .slice(0, 3)
      .map(l => `"${l.term}"=${l.meaning}`)
      .join(', ');
    parts.push(`우리만의 표현: ${lang}`);
  }

  if (parts.length === 0) return '';
  return `[유저 이해]\n${parts.join('\n')}`;
}

// ============================================
// DB 로드/저장
// ============================================

export async function loadUserModel(supabase: any, userId: string): Promise<UserModel> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('user_model')
      .eq('id', userId)
      .single();
    if (data?.user_model && Object.keys(data.user_model).length > 0) {
      const merged = { ...createDefaultUserModel(), ...data.user_model };
      const { createDefaultIntimacyState } = require('@/engines/intimacy/types') as typeof import('@/engines/intimacy/types');

      // 🆕 v41.1: 마이그레이션 — 여러 형태 지원
      //   (a) 구 모델: intimacy 필드 없음
      //   (b) v41 초기: intimacy = IntimacyState (단일)
      //   (c) v41.1+: intimacy = { luna, tarot } (현재)
      const raw = (data.user_model as any).intimacy;
      const isSplitShape =
        raw && typeof raw === 'object' && 'luna' in raw && 'tarot' in raw;

      if (isSplitShape) {
        // (c) — 그대로 사용
        merged.intimacy = raw;
      } else if (raw && typeof raw === 'object' && 'dimensions' in raw) {
        // (b) 구 단일 IntimacyState → luna 버킷으로 이식, tarot은 기본값
        merged.intimacy = {
          luna: raw,
          tarot: createDefaultIntimacyState(),
        };
      } else {
        // (a) 완전 신규 — 레거시 intimacyScore가 있으면 luna에 이식
        merged.intimacy = {
          luna: createDefaultIntimacyState(),
          tarot: createDefaultIntimacyState(),
        };
        const legacy = merged.lunaRelationship?.intimacyScore ?? 10;
        if (legacy > 10) {
          merged.intimacy.luna.dimensions = {
            trust: Math.min(100, Math.max(10, legacy)),
            openness: Math.min(100, Math.max(5, legacy * 0.7)),
            bond: Math.min(100, Math.max(8, legacy * 0.85)),
            respect: Math.min(100, Math.max(5, legacy * 0.75)),
          };
        }
      }
      return merged;
    }
  } catch { /* ignore */ }
  return createDefaultUserModel();
}

export async function saveUserModel(supabase: any, userId: string, model: UserModel): Promise<void> {
  try {
    await supabase
      .from('user_profiles')
      .update({ user_model: model })
      .eq('id', userId);
  } catch { /* ignore */ }
}

// ============================================
// 🆕 ACE: 친밀도 레벨 (personality-vector.ts에서 이관)
// ============================================

export type IntimacyLevel = 'low' | 'medium' | 'high';

export function getIntimacyLevel(sessionCount: number): IntimacyLevel {
  if (sessionCount >= 6) return 'high';
  if (sessionCount >= 3) return 'medium';
  return 'low';
}
