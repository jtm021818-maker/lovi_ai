/**
 * 📱 카톡 행동 엔진 (KBE) — LLM 판단 기반
 *
 * 핵심 철학:
 *   "코드로 자르거나 규칙으로 결정하지 않는다.
 *    Claude 응답을 받은 뒤, Gemini 가 '친구라면 이걸 어떻게 보낼까?'를 판단한다.
 *    매번 상황 이해 기반 결정 → 패턴 없음 → AI 느낌 X"
 *
 * 규칙은 오직 최소 가드레일 (예: 스티커 세션당 2개 제한)
 */

// ============================================================
// 1. 말풍선 버스트 (LLM 이 결정한 단위)
// ============================================================

export interface Burst {
  /** 말풍선 텍스트 */
  text: string;

  /** 이 버스트 "보내기 전" 지연 (ms)
   *  - 0~800: 즉답 (가벼운 반응)
   *  - 1000~3000: 자연 응답 (평범한 상황)
   *  - 3000~8000: 생각하는 중 (감정 강함)
   *  - 8000+: 바쁜 척 or 고민 (친밀도 높은 관계만)
   */
  delay_before_ms: number;

  /** 타이핑 인디케이터 표시 여부 */
  show_typing: boolean;
}

// ============================================================
// 2. 스티커 계획
// ============================================================

export type StickerId =
  | 'heart'      // 하트눈 — 칭찬/감사/좋아
  | 'cry'        // 울음 — 공감/슬픔
  | 'angry'      // 화남 — 유저 대신 분노
  | 'proud'      // 뿌듯 — 인사이트/성장
  | 'comfort'    // 토닥 — 위로
  | 'celebrate'  // 축하 — 해결/용기
  | 'think'      // 생각 — 분석/궁금
  | 'fighting';  // 화이팅 — 응원

export interface StickerPlan {
  sticker_id: StickerId;
  /** 스티커 위치
   *  - 'before_bursts': 모든 말풍선 이전
   *  - 'after_bursts': 모든 말풍선 이후
   *  - 'standalone': 단독 전송 (말풍선 없음)
   */
  placement: 'before_bursts' | 'after_bursts' | 'standalone';
  /** 스티커 전후 지연 (ms) */
  delay_ms: number;
}

// ============================================================
// 3. 이벤트 트리거 (자연스러운 전환)
// ============================================================

export type KakaoEventType =
  | 'VN_THEATER'     // 감정거울 VN 극장
  | 'LUNA_STORY'     // 루나 스토리
  | 'TAROT'          // 타로 제안
  | 'ACTION_PLAN'    // 행동 계획
  | 'WARM_WRAP';     // 따뜻한 마무리

export interface EventTrigger {
  event_type: KakaoEventType;
  /** 이벤트로 자연스럽게 넘어가는 루나의 한마디
   *  예: "야 근데 우리 그 순간 한번 다시 봐볼래?"
   */
  transition_line: string;
  /** 전환 멘트 지연 (ms) */
  delay_ms: number;
}

// ============================================================
// 4. LLM 전체 출력 — Kakao Action Plan
// ============================================================

/**
 * Gemini 가 Claude 응답을 보고 결정하는 "어떻게 카톡으로 보낼까" 전체 계획
 *
 * 중요:
 *   - bursts 는 Claude 원문을 "친구가 자르듯" LLM 이 쪼갠 결과
 *     (코드가 아니라 LLM 판단 — 매번 다른 패턴)
 *   - 규칙 최소화: 스티커 개수 제한만 체크
 */
export interface KakaoActionPlan {
  /** 말풍선 버스트들 (순서대로 전송) */
  bursts: Burst[];

  /** 스티커 (선택적) */
  sticker: StickerPlan | null;

  /** 침묵 여부 — true 면 응답 X
   *  (아주 드물게, 짧은 리액션에 친밀도 높은 관계에서만)
   */
  silence: boolean;

  /** 이벤트 트리거 (선택적) */
  event: EventTrigger | null;

  /** LLM 의 이 계획에 대한 이유 (디버깅/학습용) */
  reasoning: string;

  /** 전반적 무드 라벨 (모니터링용) */
  mood_label:
    | 'crisis_receiving'       // 위기 수신
    | 'heavy_empathy'          // 무거운 공감
    | 'playful_chat'           // 가벼운 대화
    | 'excited_celebration'    // 흥분/축하
    | 'serious_discussion'     // 진지한 논의
    | 'thoughtful_pause'       // 생각 중
    | 'warm_closing';          // 따뜻한 마무리
}

// ============================================================
// 5. KBE 입력 (Claude 응답 + 컨텍스트)
// ============================================================

export interface KbeInput {
  /** Claude 원문 응답 (|||로 구분된 초안) */
  claude_response: string;

  /** 유저 원문 (참고용) */
  user_utterance: string;

  /** 좌뇌 분석에서 핵심 신호들 */
  left_brain_summary: {
    tone: string;
    somatic: string;
    complexity: number;
    ambiguity: boolean;
    crisis: boolean;
  };

  /** 변연계 무드 한 줄 */
  limbic_mood: string;

  /** 세션 메타 */
  session_meta: {
    turn_idx: number;
    intimacy_level: number;       // 1~5
    stickers_used_this_session: number;
    last_sticker_turns_ago: number; // -1 이면 아직 없음
    last_event_turns_ago: number;
    events_fired_session: KakaoEventType[];
  };

  /** 유저 표현 패턴 (유저가 방금 쓴 것) */
  user_style: {
    laugh_pattern: string | null;  // "ㅋㅋㅋ" or null
    tear_pattern: string | null;   // "ㅠㅠ" or null
    sent_sticker: boolean;
    message_length: number;
  };
}

// ============================================================
// 6. 실행 결과 (pipeline 으로 yield)
// ============================================================

export type KbeStreamChunk =
  | { type: 'text'; data: string }
  | { type: 'sticker'; data: StickerId }
  | { type: 'typing'; data: { active: boolean } }
  | { type: 'event'; data: KakaoEventType }
  | { type: 'meta'; data: KakaoActionPlan };
