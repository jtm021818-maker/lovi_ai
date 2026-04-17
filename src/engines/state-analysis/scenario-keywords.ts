/**
 * 시나리오 키워드 사전 v1.0
 *
 * 한국 MZ세대 연애 커뮤니티(에타, 블라인드, 네이트판, 인스티즈, 82cook, 더쿠 등)에서
 * 실제로 사용하는 표현을 기반으로 구축한 시나리오 분류 키워드 사전.
 *
 * 구조:
 * - keywords: 단순 포함 매칭 (message.includes(keyword))
 * - patterns: 정규식 매칭 (복합 표현, 문맥 의존 표현)
 * - antiKeywords: 이 키워드가 있으면 해당 시나리오 제외 (disambiguation)
 * - weight: 시나리오 확신도 가중치 (1~3)
 *   - 3: 확정적 (이 표현이면 거의 100% 이 시나리오)
 *   - 2: 강한 힌트 (높은 확률)
 *   - 1: 약한 힌트 (다른 시나리오와 겹칠 수 있음)
 */

import { RelationshipScenario } from '@/types/engine.types';

export interface ScenarioKeywordEntry {
  /** 단순 포함 매칭 키워드 */
  text: string;
  /** 확신도 가중치 1~3 */
  weight: number;
}

export interface ScenarioPatternEntry {
  /** 정규식 패턴 */
  regex: RegExp;
  /** 확신도 가중치 1~3 */
  weight: number;
  /** 설명 (디버깅용) */
  desc: string;
}

export interface ScenarioKeywordSet {
  keywords: ScenarioKeywordEntry[];
  patterns: ScenarioPatternEntry[];
  /** 이 키워드가 있으면 해당 시나리오에서 제외 */
  antiKeywords: string[];
}

// ============================================================
// 1. READ_AND_IGNORED (읽씹/안읽씹)
// ============================================================
const READ_AND_IGNORED: ScenarioKeywordSet = {
  keywords: [
    // === 직접 표현 (weight 3) ===
    { text: '읽씹', weight: 3 },
    { text: '안읽씹', weight: 3 },
    { text: '읽고씹', weight: 3 },
    { text: '읽고 씹', weight: 3 },
    { text: '읽씹당', weight: 3 },
    { text: '읽씹함', weight: 3 },
    { text: '읽씹해', weight: 3 },
    { text: '읽씹하', weight: 3 },
    { text: '읽씹됐', weight: 3 },

    // === "씹다" 동사 변형 + 메시지 맥락 (weight 3) ===
    { text: '톡 씹', weight: 3 },
    { text: '톡을 씹', weight: 3 },
    { text: '카톡 씹', weight: 3 },
    { text: '카톡을 씹', weight: 3 },
    { text: '문자 씹', weight: 3 },
    { text: '문자를 씹', weight: 3 },
    { text: '메시지 씹', weight: 3 },
    { text: '메시지를 씹', weight: 3 },
    { text: '연락 씹', weight: 3 },
    { text: '연락을 씹', weight: 3 },
    { text: '답장 씹', weight: 3 },
    { text: '답장을 씹', weight: 3 },
    { text: '톡씹', weight: 3 },
    { text: '카톡씹', weight: 3 },
    { text: '문자씹', weight: 3 },

    // === "씹다" 피동형 (씹히다/씹혔다/씹힘) (weight 3) ===
    { text: '씹혔', weight: 3 },
    { text: '씹힘', weight: 3 },
    { text: '씹힌', weight: 3 },
    { text: '씹히', weight: 3 },
    { text: '씹당', weight: 3 },

    // === 읽음 표시 관련 (카톡 "1") (weight 3) ===
    { text: '1 안 사라', weight: 3 },
    { text: '1 안사라', weight: 3 },
    { text: '1이 안 사라', weight: 3 },
    { text: '1이 안사라', weight: 3 },
    { text: '1 그대로', weight: 3 },
    { text: '1이 그대로', weight: 3 },
    { text: '1 사라졌', weight: 2 },
    { text: '1이 사라졌', weight: 2 },
    { text: '1 안 없어', weight: 3 },
    { text: '1이 안 없어', weight: 3 },
    { text: '1 떠있', weight: 3 },
    { text: '1이 떠있', weight: 3 },
    { text: '1 뜬 채', weight: 3 },
    { text: '1이 뜬 채', weight: 3 },
    { text: '1 안없어', weight: 3 },

    // === 읽었는데 답 없음 서술형 (weight 2~3) ===
    { text: '읽고 답', weight: 2 },
    { text: '읽었는데 답', weight: 3 },
    { text: '읽고 무시', weight: 3 },
    { text: '읽고도 답', weight: 3 },
    { text: '읽고서 답', weight: 3 },
    { text: '읽었는데 무시', weight: 3 },
    { text: '읽고 안 보', weight: 3 },
    { text: '확인만 하고', weight: 2 },
    { text: '확인하고 답', weight: 2 },
    { text: '확인만 하고 답', weight: 3 },
    { text: '확인하고 무시', weight: 3 },
    { text: '봤는데 답', weight: 2 },
    { text: '봤는데 무시', weight: 3 },
    { text: '봤으면서 답', weight: 3 },
    { text: '봤으면서 무시', weight: 3 },
    { text: '보고 답', weight: 2 },
    { text: '보고 무시', weight: 3 },
    { text: '보고도 답', weight: 3 },
    { text: '보고서 답', weight: 2 },

    // === 답장 없음/늦음 표현 (weight 2) ===
    { text: '답장이 없', weight: 2 },
    { text: '답장 없', weight: 2 },
    { text: '답장을 안', weight: 2 },
    { text: '답이 없', weight: 2 },
    { text: '답을 안', weight: 2 },
    { text: '답 안 해', weight: 2 },
    { text: '답 안해', weight: 2 },
    { text: '답을 안 해', weight: 2 },
    { text: '답을 안해', weight: 2 },
    { text: '답장을 안 해', weight: 2 },
    { text: '답장을 안해', weight: 2 },
    { text: '답장 안 해', weight: 2 },
    { text: '답장 안해', weight: 2 },
    { text: '답이 안 와', weight: 2 },
    { text: '답이 안와', weight: 2 },
    { text: '답 안 와', weight: 2 },
    { text: '답 안와', weight: 2 },
    { text: '답이 안 옴', weight: 2 },
    { text: '답이 안옴', weight: 2 },
    { text: '답 안 옴', weight: 2 },
    { text: '답 안옴', weight: 2 },
    { text: '답장이 안 와', weight: 2 },
    { text: '답장이 안와', weight: 2 },
    { text: '답장 안 와', weight: 2 },
    { text: '답장 안와', weight: 2 },
    { text: '대답을 안', weight: 2 },
    { text: '대답 안', weight: 2 },
    { text: '리플 없', weight: 2 },
    { text: '회신이 없', weight: 2 },
    { text: '회신 없', weight: 2 },

    // === 답장 늦음 (weight 1~2) ===
    { text: '답장이 늦', weight: 1 },
    { text: '답장 늦', weight: 1 },
    { text: '답이 늦', weight: 1 },
    { text: '답 늦', weight: 1 },
    { text: '답장 느', weight: 1 },
    { text: '답 느리', weight: 1 },
    { text: '몇 시간째 답', weight: 2 },
    { text: '하루째 답', weight: 2 },
    { text: '이틀째 답', weight: 2 },
    { text: '몇시간째 답', weight: 2 },

    // === 단답/시큰둥 (weight 1~2) ===
    { text: '단답', weight: 1 },
    { text: '한마디', weight: 1 },
    { text: '짧게 답', weight: 1 },
    { text: '건성으로 답', weight: 2 },
    { text: '대충 답', weight: 2 },
    { text: '성의없이 답', weight: 2 },
    { text: '성의 없이 답', weight: 2 },
    { text: '대충 읽', weight: 2 },
    { text: '시큰둥하게 답', weight: 2 },
    { text: '시큰둥 답', weight: 2 },
    { text: 'ㅇㅇ만', weight: 1 },
    { text: 'ㅋ만', weight: 1 },

    // === 안 읽음 (안읽씹 변형) (weight 2~3) ===
    { text: '안 읽', weight: 1 },
    { text: '안읽', weight: 1 },
    { text: '읽지도 않', weight: 2 },
    { text: '읽지도않', weight: 2 },
    { text: '열어보지도 않', weight: 2 },
    { text: '열어보지도않', weight: 2 },
    { text: '안 열어', weight: 1 },
    { text: '안열어', weight: 1 },
    { text: '미확인', weight: 1 },
    { text: '확인 안', weight: 1 },
    { text: '안 확인', weight: 1 },

    // === SNS/플랫폼 맥락 (weight 2) ===
    { text: 'DM 씹', weight: 3 },
    { text: '디엠 씹', weight: 3 },
    { text: 'dm 씹', weight: 3 },
    { text: 'DM 무시', weight: 2 },
    { text: '디엠 무시', weight: 2 },
    { text: '인스타 읽', weight: 2 },
    { text: '인스타 답', weight: 1 },
    { text: '카톡 안 읽', weight: 2 },
    { text: '카톡 답', weight: 1 },
    { text: '메세지 씹', weight: 3 },
    { text: '메세지를 씹', weight: 3 },
    { text: '메세지 무시', weight: 2 },
    { text: '톡 무시', weight: 2 },

    // === 감정적 반응 표현 (weight 1) ===
    { text: '왜 답을 안', weight: 2 },
    { text: '왜 답장을 안', weight: 2 },
    { text: '왜 답 안', weight: 2 },
    { text: '왜 답장 안', weight: 2 },
    { text: '답장 기다', weight: 2 },
    { text: '답 기다', weight: 2 },
    { text: '답을 기다', weight: 2 },
    { text: '답장을 기다', weight: 2 },
    { text: '연락 기다', weight: 1 },
    { text: '연락을 기다', weight: 1 },

    // === 인터넷 줄임말/변형 (weight 2~3) ===
    { text: '읽씹각', weight: 3 },
    { text: '읽씹러', weight: 3 },
    { text: '읽씹충', weight: 3 },
    { text: '읽씹남', weight: 3 },
    { text: '읽씹녀', weight: 3 },
    { text: '읽씹쟁이', weight: 3 },
    { text: '읽씹왕', weight: 3 },
    { text: '안읽씹각', weight: 3 },
    { text: '안읽씹남', weight: 3 },
    { text: '안읽씹녀', weight: 3 },
    { text: '읽씹 먹', weight: 3 },
    { text: '읽씹 치', weight: 3 },
    { text: '카씹', weight: 3 },
    { text: '톡씹', weight: 3 },
    { text: '문씹', weight: 3 },
    { text: '선씹', weight: 2 },
    { text: 'ㅋ씹', weight: 2 },

    // === 연애/SNS 파생 표현 (weight 2) ===
    { text: '어장관리', weight: 2 },
    { text: '어장 관리', weight: 2 },
    { text: '희망고문', weight: 2 },
    { text: '브레드크럼빙', weight: 2 },
    { text: '벤치잉', weight: 2 },
    { text: '눈팅', weight: 1 },
    { text: '선톡', weight: 1 },
    { text: '칼답', weight: 1 },
    { text: '단답충', weight: 2 },

    // === 미리보기/알림으로 읽음 (weight 2) ===
    { text: '미리보기로 읽', weight: 2 },
    { text: '미리보기만', weight: 2 },
    { text: '알림으로 읽', weight: 2 },
    { text: '알림으로만', weight: 2 },
    { text: '알림창에서 읽', weight: 2 },
    { text: '안 읽은 척', weight: 3 },
    { text: '안읽은척', weight: 3 },
    { text: '안 읽은척', weight: 3 },
    { text: '읽은 척 안', weight: 2 },

    // === 보냈는데 반응 없음 (weight 1~2) ===
    { text: '보냈는데 답', weight: 2 },
    { text: '보냈는데 반응', weight: 2 },
    { text: '보냈는데 무시', weight: 2 },
    { text: '보냈는데 아무', weight: 2 },
    { text: '보냈는데 씹', weight: 3 },
    { text: '톡 보냈는데', weight: 1 },
    { text: '카톡 보냈는데', weight: 1 },
    { text: '문자 보냈는데', weight: 1 },
    { text: '메시지 보냈는데', weight: 1 },
    { text: '연락했는데 답', weight: 2 },
    { text: '연락했는데 무시', weight: 2 },
    { text: '연락했는데 씹', weight: 3 },
  ],
  patterns: [
    // "씹" 동사가 메시지/연락 맥락에서 사용될 때
    { regex: /(?:톡|카톡|문자|메시지|메세지|연락|답장|답|DM|디엠|dm).{0,4}씹/, weight: 3, desc: '메시지+씹 근접' },
    { regex: /씹.{0,2}(?:었|었어|힘|혔|힌|히|당하|는)/, weight: 3, desc: '씹+피동/과거형' },
    // "답" 관련 부정 패턴
    { regex: /답.{0,3}(?:없|안|안해|안와|안옴|안보|못받)/, weight: 2, desc: '답+부정' },
    { regex: /답장.{0,3}(?:없|안|안해|안와|안옴)/, weight: 2, desc: '답장+부정' },
    // 읽었는데 계열
    { regex: /읽.{0,2}(?:었는데|고도|고서|었으면서).{0,4}(?:답|무시|반응)/, weight: 3, desc: '읽었는데+무응답' },
    // 확인 + 무응답
    { regex: /(?:확인|봤|봄|읽음).{0,4}(?:답|무시|반응).{0,3}(?:없|안)/, weight: 3, desc: '확인+무응답' },
    // 카톡 1 관련
    { regex: /[1일].{0,3}(?:안\s?사라|그대로|안\s?없어|떠\s?있|뜬)/, weight: 3, desc: '카톡1+미소멸' },
    // 시간+답 없음
    { regex: /(?:\d+시간|\d+일|하루|이틀|사흘|며칠|몇\s?시간).{0,5}(?:답|연락|반응).{0,3}(?:없|안)/, weight: 2, desc: '시간+무응답' },
    // 보냈는데 계열
    { regex: /보냈.{0,3}(?:는데|지만|었는데).{0,5}(?:답|반응|무시|씹|아무)/, weight: 2, desc: '보냈는데+무응답' },
    // 왜+답/연락+안
    { regex: /왜.{0,3}(?:답|연락|답장).{0,3}(?:안|없|안해|안하)/, weight: 2, desc: '왜+무응답' },
    // 또/계속/맨날 + 씹
    { regex: /(?:또|계속|맨날|항상|매번).{0,4}씹/, weight: 3, desc: '반복+씹' },
    // 전화도 안 받
    { regex: /전화.{0,3}(?:도\s?)?(?:안\s?받|안받|씹|무시)/, weight: 2, desc: '전화+무시' },
  ],
  antiKeywords: [
    // 잠수/고스팅 표현이 있으면 GHOSTING으로 분류
    '잠수', '고스팅', '증발', '사라졌', '연락두절', '연락 두절',
    '며칠째 연락', '몇주째', '몇달째',
    // 이별 맥락
    '헤어지', '이별', '차였', '차이고',
  ],
};

// ============================================================
// 2. GHOSTING (잠수/고스팅)
// ============================================================
const GHOSTING: ScenarioKeywordSet = {
  keywords: [
    // === 직접 표현 (weight 3) ===
    { text: '잠수', weight: 3 },
    { text: '잠수탔', weight: 3 },
    { text: '잠수타', weight: 3 },
    { text: '잠수 탔', weight: 3 },
    { text: '잠수 타', weight: 3 },
    { text: '잠수를 탔', weight: 3 },
    { text: '잠수를 타', weight: 3 },
    { text: '고스팅', weight: 3 },
    { text: '고스팅당', weight: 3 },
    { text: '고스팅 당', weight: 3 },
    { text: '고스팅됐', weight: 3 },

    // === 연락두절 (weight 3) ===
    { text: '연락두절', weight: 3 },
    { text: '연락 두절', weight: 3 },
    { text: '연락이 끊', weight: 3 },
    { text: '연락 끊', weight: 3 },
    { text: '연락이 안 돼', weight: 2 },
    { text: '연락이 안돼', weight: 2 },
    { text: '연락 안 돼', weight: 2 },
    { text: '연락 안돼', weight: 2 },
    { text: '연락이 안 되', weight: 2 },
    { text: '연락이 안되', weight: 2 },
    { text: '연락 안 되', weight: 2 },
    { text: '연락 안되', weight: 2 },
    { text: '연락 불가', weight: 3 },
    { text: '연락처 삭제', weight: 2 },

    // === 사라짐/증발 (weight 2~3) ===
    { text: '증발했', weight: 3 },
    { text: '증발함', weight: 3 },
    { text: '증발해', weight: 3 },
    { text: '사라졌', weight: 2 },
    { text: '사라져버', weight: 3 },
    { text: '사라져 버', weight: 3 },
    { text: '감쪽같이 사라', weight: 3 },
    { text: '갑자기 사라', weight: 3 },
    { text: '잠적', weight: 3 },
    { text: '잠적했', weight: 3 },
    { text: '잠적함', weight: 3 },
    { text: '행방불명', weight: 3 },

    // === 차단 (weight 2) ===
    { text: '차단당', weight: 2 },
    { text: '차단 당', weight: 2 },
    { text: '차단했', weight: 2 },
    { text: '차단됐', weight: 2 },
    { text: '블락', weight: 2 },
    { text: '블럭', weight: 2 },
    { text: '블록', weight: 2 },
    { text: '차단먹', weight: 2 },

    // === 긴 기간 연락 없음 (weight 2~3) ===
    { text: '며칠째 연락', weight: 2 },
    { text: '일주일째 연락', weight: 3 },
    { text: '몇주째', weight: 3 },
    { text: '몇 주째', weight: 3 },
    { text: '한달째', weight: 3 },
    { text: '한 달째', weight: 3 },
    { text: '몇달째', weight: 3 },
    { text: '몇 달째', weight: 3 },
    { text: '연락 없이', weight: 2 },
    { text: '소식이 없', weight: 2 },
    { text: '소식 없', weight: 2 },
    { text: '소식이 끊', weight: 3 },
    { text: '소식 끊', weight: 3 },
    { text: '감감무소식', weight: 3 },

    // === 카카오톡 관련 (weight 2) ===
    { text: '카톡 나가', weight: 2 },
    { text: '카톡방 나가', weight: 2 },
    { text: '톡방 나가', weight: 2 },
    { text: '대화방 나가', weight: 2 },
    { text: '프사 바꿈', weight: 1 },
    { text: '프사 삭제', weight: 1 },
    { text: '상메 삭제', weight: 1 },
    { text: '상태메시지 삭제', weight: 1 },
    { text: '친삭', weight: 2 },
    { text: '친구 삭제', weight: 2 },

    // === 갑자기/느닷없이 (weight 2) ===
    { text: '갑자기 연락', weight: 2 },
    { text: '느닷없이 연락', weight: 2 },
    { text: '갑자기 안 읽', weight: 2 },
    { text: '갑자기 안읽', weight: 2 },
    { text: '어느날 갑자기', weight: 1 },
    { text: '예고 없이', weight: 2 },
    { text: '예고없이', weight: 2 },
    { text: '말도 없이', weight: 2 },
    { text: '말없이', weight: 2 },

    // === 유령 비유 (weight 2) ===
    { text: '유령처럼', weight: 2 },
    { text: '유령 같', weight: 2 },
    { text: '투명인간', weight: 2 },
    { text: '안개처럼', weight: 1 },
    { text: '연기처럼', weight: 1 },
  ],
  patterns: [
    // 잠수 + 변형
    { regex: /잠수.{0,2}(?:타|탔|탐|때림|쳤|치)/, weight: 3, desc: '잠수+동사' },
    // 고스팅 + 변형
    { regex: /고스팅.{0,2}(?:당|됐|했|함|하|인가)/, weight: 3, desc: '고스팅+변형' },
    // 연락 + 끊/두절/불가
    { regex: /연락.{0,3}(?:끊|두절|불가|안\s?돼|안\s?되|없)/, weight: 3, desc: '연락+단절' },
    // 긴 기간 + 연락/소식 없음
    { regex: /(?:\d+일|\d+주|\d+달|며칠|몇\s?주|몇\s?달|한\s?달|일주일).{0,3}(?:째|동안|넘게).{0,5}(?:연락|소식|답).{0,3}(?:없|안|끊)/, weight: 3, desc: '장기간+무연락' },
    // 갑자기 + 사라/연락 끊
    { regex: /갑자기.{0,5}(?:사라|연락|소식|잠수|잠적)/, weight: 3, desc: '갑자기+소멸' },
    // 차단 + 당하다
    { regex: /(?:차단|블락|블럭|블록).{0,3}(?:당|됐|먹|했)/, weight: 2, desc: '차단+피동' },
    // 말도 없이 + 사라지다
    { regex: /(?:말|연락|예고).{0,2}(?:도\s?)?없이.{0,5}(?:사라|잠수|잠적|떠나)/, weight: 3, desc: '무예고+소멸' },
  ],
  antiKeywords: [],
};

// ============================================================
// 3. LONG_DISTANCE (장거리 연애)
// ============================================================
const LONG_DISTANCE: ScenarioKeywordSet = {
  keywords: [
    // === 직접 표현 (weight 3) ===
    { text: '장거리', weight: 3 },
    { text: '장거리 연애', weight: 3 },
    { text: '장거리연애', weight: 3 },
    { text: 'LDR', weight: 3 },

    // === 물리적 거리 (weight 2~3) ===
    { text: '멀리 떨어', weight: 2 },
    { text: '먼 거리', weight: 2 },
    { text: '다른 도시', weight: 2 },
    { text: '다른 지역', weight: 2 },
    { text: '다른 나라', weight: 3 },
    { text: '타지', weight: 2 },
    { text: '타 지역', weight: 2 },
    { text: '서울 부산', weight: 2 },
    { text: '부산 서울', weight: 2 },
    { text: '지방', weight: 1 },

    // === 해외/유학/이민 (weight 2~3) ===
    { text: '해외 연애', weight: 3 },
    { text: '해외연애', weight: 3 },
    { text: '유학', weight: 2 },
    { text: '유학 중', weight: 2 },
    { text: '교환학생', weight: 2 },
    { text: '워킹홀리데이', weight: 2 },
    { text: '워홀', weight: 2 },
    { text: '파견', weight: 2 },
    { text: '주재원', weight: 2 },
    { text: '해외 출장', weight: 1 },
    { text: '해외출장', weight: 1 },
    { text: '이민', weight: 2 },

    // === 군대 (weight 2~3) ===
    { text: '군대', weight: 2 },
    { text: '군대 연애', weight: 3 },
    { text: '군대연애', weight: 3 },
    { text: '군인 남친', weight: 3 },
    { text: '군인남친', weight: 3 },
    { text: '군인 여친', weight: 3 },
    { text: '군인여친', weight: 3 },
    { text: '입대', weight: 2 },
    { text: '훈련소', weight: 2 },
    { text: '군 복무', weight: 2 },
    { text: '전역', weight: 2 },
    { text: '면회', weight: 2 },
    { text: '위문편지', weight: 3 },
    { text: '위문 편지', weight: 3 },
    { text: '군카', weight: 2 },

    // === 만남 빈도/어려움 (weight 1~2) ===
    { text: '자주 못 만', weight: 2 },
    { text: '자주 못만', weight: 2 },
    { text: '만나기 힘', weight: 1 },
    { text: '만나기 어', weight: 1 },
    { text: '못 만나', weight: 1 },
    { text: '못만나', weight: 1 },
    { text: '못 볼', weight: 1 },
    { text: '보고싶은데 못', weight: 2 },
    { text: '보고 싶은데 못', weight: 2 },
    { text: '한달에 한번', weight: 2 },
    { text: '한 달에 한 번', weight: 2 },
    { text: '한달에 한 번', weight: 2 },
    { text: '한 달에 한번', weight: 2 },

    // === 시차 (weight 2~3) ===
    { text: '시차', weight: 2 },
    { text: '시차 때문', weight: 3 },
    { text: '시간대가 다', weight: 2 },
    { text: '시간대 다', weight: 2 },
    { text: '시간 맞추기', weight: 1 },

    // === 교통/비용 (weight 1~2) ===
    { text: 'KTX', weight: 1 },
    { text: '비행기', weight: 1 },
    { text: '왕복', weight: 1 },
    { text: '교통비', weight: 2 },
    { text: '비행기표', weight: 1 },
    { text: '비행기 표', weight: 1 },
  ],
  patterns: [
    { regex: /장거리.{0,3}연애/, weight: 3, desc: '장거리연애' },
    { regex: /(?:다른|타)\s?(?:도시|지역|나라).{0,5}(?:연애|살|있)/, weight: 2, desc: '다른지역+연애' },
    { regex: /(?:군대|입대|군인).{0,5}(?:연애|남친|여친|남자친구|여자친구)/, weight: 3, desc: '군대+연애' },
    { regex: /(?:유학|워홀|파견|주재원).{0,5}(?:가|중|때문|연애)/, weight: 2, desc: '해외+연애' },
    { regex: /(?:자주|잘|쉽게)\s?못\s?(?:만나|보|봐)/, weight: 2, desc: '못만남' },
    { regex: /(?:한\s?달|두\s?달|몇\s?달).{0,3}(?:에|만에)\s?(?:한\s?번|한번)/, weight: 2, desc: '만남빈도' },
    { regex: /시차.{0,3}(?:때문|힘들|어렵)/, weight: 3, desc: '시차고충' },
  ],
  antiKeywords: [],
};

// ============================================================
// 4. JEALOUSY (질투/집착)
// ============================================================
const JEALOUSY: ScenarioKeywordSet = {
  keywords: [
    // === 직접 표현 (weight 3) ===
    { text: '질투', weight: 3 },
    { text: '질투나', weight: 3 },
    { text: '질투심', weight: 3 },
    { text: '질투가 나', weight: 3 },
    { text: '샘', weight: 1 },
    { text: '샘나', weight: 2 },
    { text: '시기', weight: 1 },
    { text: '의심', weight: 2 },
    { text: '의심됨', weight: 2 },
    { text: '의심스', weight: 2 },

    // === 집착 (weight 2~3) ===
    { text: '집착', weight: 3 },
    { text: '집착하', weight: 3 },
    { text: '집착적', weight: 3 },
    { text: '집착이 심', weight: 3 },
    { text: '집착 심', weight: 3 },
    { text: '집착스', weight: 3 },
    { text: '매달리', weight: 2 },
    { text: '매달려', weight: 2 },
    { text: '매달림', weight: 2 },
    { text: '매달렸', weight: 2 },

    // === 의처증/의부증 (weight 3) ===
    { text: '의처증', weight: 3 },
    { text: '의부증', weight: 3 },

    // === 이성친구/다른 이성 (weight 2) ===
    { text: '여사친', weight: 2 },
    { text: '남사친', weight: 2 },
    { text: '여자 사람 친구', weight: 2 },
    { text: '남자 사람 친구', weight: 2 },
    { text: '이성친구', weight: 2 },
    { text: '이성 친구', weight: 2 },
    { text: '다른 여자', weight: 1 },
    { text: '다른 남자', weight: 1 },
    { text: '딴 여자', weight: 1 },
    { text: '딴 남자', weight: 1 },
    { text: '다른 이성', weight: 1 },
    { text: '딴 이성', weight: 1 },

    // === SNS 감시 (weight 2~3) ===
    { text: '좋아요 감시', weight: 3 },
    { text: '좋아요 눌', weight: 2 },
    { text: '좋아요 취소', weight: 2 },
    { text: '인스타 감시', weight: 3 },
    { text: '인스타 팔로우', weight: 1 },
    { text: '팔로우 감시', weight: 3 },
    { text: '팔로잉 확인', weight: 2 },
    { text: '팔로잉 감시', weight: 3 },
    { text: '스토리 확인', weight: 1 },
    { text: '접속 확인', weight: 2 },
    { text: '마지막 접속', weight: 2 },
    { text: '마지막 로그인', weight: 2 },
    { text: '온라인 확인', weight: 2 },
    { text: '카톡 프사', weight: 1 },
    { text: '누구랑 카톡', weight: 2 },

    // === 핸드폰/연락 감시 (weight 2~3) ===
    { text: '핸드폰 검사', weight: 3 },
    { text: '핸드폰 확인', weight: 2 },
    { text: '핸드폰검사', weight: 3 },
    { text: '핸드폰확인', weight: 2 },
    { text: '폰 검사', weight: 3 },
    { text: '폰 확인', weight: 2 },
    { text: '폰검사', weight: 3 },
    { text: '폰확인', weight: 2 },
    { text: '휴대폰 검사', weight: 3 },
    { text: '핸드폰 비번', weight: 2 },
    { text: '핸드폰 비밀번호', weight: 2 },
    { text: '폰 비번', weight: 2 },
    { text: '폰 비밀번호', weight: 2 },
    { text: '카톡 검사', weight: 3 },
    { text: '카톡검사', weight: 3 },
    { text: '통화기록', weight: 2 },
    { text: '통화 기록', weight: 2 },
    { text: '통화내역', weight: 2 },
    { text: '통화 내역', weight: 2 },
    { text: '문자 확인', weight: 2 },

    // === 소유욕/독점 (weight 2) ===
    { text: '소유욕', weight: 3 },
    { text: '독점욕', weight: 3 },
    { text: '독점적', weight: 2 },
    { text: '내 거', weight: 1 },
    { text: '나만의', weight: 1 },
    { text: '통제', weight: 2 },
    { text: '통제하', weight: 2 },
    { text: '통제적', weight: 2 },
    { text: '간섭', weight: 2 },
    { text: '간섭이 심', weight: 3 },
    { text: '간섭 심', weight: 3 },
    { text: '속박', weight: 2 },

    // === 불안감 (weight 1~2) ===
    { text: '어디야', weight: 1 },
    { text: '누구랑', weight: 1 },
    { text: '뭐하고 있', weight: 1 },
    { text: '뭐해', weight: 1 },
    { text: '어디 가', weight: 1 },
    { text: '누구 만나', weight: 1 },
    { text: '위치 추적', weight: 3 },
    { text: '위치추적', weight: 3 },
    { text: '위치 공유', weight: 2 },
    { text: '위치공유', weight: 2 },
    { text: 'GPS', weight: 2 },
  ],
  patterns: [
    { regex: /질투.{0,3}(?:나|심|심해|부리|많)/, weight: 3, desc: '질투+강도' },
    { regex: /집착.{0,3}(?:이|이\s?심|심해|적|스러|하|해)/, weight: 3, desc: '집착+강도' },
    { regex: /(?:여사친|남사친|이성\s?친구|다른\s?(?:여자|남자|이성)).{0,5}(?:만나|연락|카톡|톡)/, weight: 2, desc: '이성+접촉' },
    { regex: /(?:폰|핸드폰|휴대폰|카톡).{0,3}(?:검사|확인|비번|비밀번호|감시)/, weight: 3, desc: '기기감시' },
    { regex: /(?:인스타|팔로우|좋아요|스토리|접속).{0,3}(?:감시|확인|검사)/, weight: 3, desc: 'SNS감시' },
    { regex: /(?:어디|누구|뭐).{0,3}(?:야|랑|해|있|만나|가)/, weight: 1, desc: '감시질문' },
    { regex: /(?:소유|독점|통제|간섭|속박).{0,3}(?:욕|적|심|하)/, weight: 3, desc: '독점/통제' },
  ],
  antiKeywords: [
    '바람', '외도', '불륜', '양다리',
  ],
};

// ============================================================
// 5. INFIDELITY (바람/외도)
// ============================================================
const INFIDELITY: ScenarioKeywordSet = {
  keywords: [
    // === 직접 표현 (weight 3) ===
    { text: '바람', weight: 2 },
    { text: '바람피', weight: 3 },
    { text: '바람 피', weight: 3 },
    { text: '바람폈', weight: 3 },
    { text: '바람 폈', weight: 3 },
    { text: '바람핌', weight: 3 },
    { text: '바람 핌', weight: 3 },
    { text: '바람둥이', weight: 3 },
    { text: '외도', weight: 3 },
    { text: '외도했', weight: 3 },
    { text: '외도함', weight: 3 },
    { text: '외도하', weight: 3 },
    { text: '불륜', weight: 3 },
    { text: '불륜녀', weight: 3 },
    { text: '불륜남', weight: 3 },

    // === 양다리/투타임 (weight 3) ===
    { text: '양다리', weight: 3 },
    { text: '양다리 걸', weight: 3 },
    { text: '투타임', weight: 3 },
    { text: '이중 연애', weight: 3 },
    { text: '이중연애', weight: 3 },
    { text: '양다리 걸치', weight: 3 },

    // === 다른 사람과의 관계 (weight 2) ===
    { text: '다른 사람 만나', weight: 2 },
    { text: '다른 사람을 만나', weight: 2 },
    { text: '몰래 만나', weight: 3 },
    { text: '몰래만나', weight: 3 },
    { text: '다른 애인', weight: 3 },
    { text: '다른 여자랑', weight: 2 },
    { text: '다른 남자랑', weight: 2 },
    { text: '다른 여자를 만나', weight: 3 },
    { text: '다른 남자를 만나', weight: 3 },
    { text: '뒤에서 만나', weight: 3 },

    // === 증거/발견 (weight 2~3) ===
    { text: '바람 증거', weight: 3 },
    { text: '외도 증거', weight: 3 },
    { text: '카톡 발견', weight: 2 },
    { text: '문자 발견', weight: 2 },
    { text: '연락 발견', weight: 2 },
    { text: '몰래 연락', weight: 2 },
    { text: '비밀 연락', weight: 2 },
    { text: '비밀연락', weight: 2 },
    { text: '숨기고 연락', weight: 2 },
    { text: '숨겨서 연락', weight: 2 },
    { text: '모텔', weight: 2 },
    { text: '호텔 예약', weight: 2 },
    { text: '콘돔', weight: 2 },

    // === 배신감 (weight 2) ===
    { text: '배신', weight: 2 },
    { text: '배신감', weight: 2 },
    { text: '배신당', weight: 2 },
    { text: '배신 당', weight: 2 },
    { text: '속았', weight: 2 },
    { text: '속이고', weight: 2 },
    { text: '속임', weight: 2 },
    { text: '거짓말', weight: 1 },

    // === 간통/정사 (weight 3) ===
    { text: '정사', weight: 2 },
    { text: '간통', weight: 3 },
    { text: '내연', weight: 3 },
    { text: '내연녀', weight: 3 },
    { text: '내연남', weight: 3 },

    // === 인터넷 속어 (weight 2~3) ===
    { text: '바람끼', weight: 2 },
    { text: '바람기', weight: 2 },
    { text: '작업 걸', weight: 1 },
    { text: '작업걸', weight: 1 },
    { text: '플러팅', weight: 1 },
    { text: '어장관리', weight: 2 },
    { text: '어장 관리', weight: 2 },
  ],
  patterns: [
    { regex: /바람.{0,2}(?:피|폈|핌|을\s?피|둥이)/, weight: 3, desc: '바람피다' },
    { regex: /외도.{0,2}(?:했|함|하|를|의)/, weight: 3, desc: '외도+변형' },
    { regex: /양다리.{0,3}(?:걸|치|를)/, weight: 3, desc: '양다리+변형' },
    { regex: /몰래.{0,10}(?:만나|연락|카톡|문자|사귀)/, weight: 3, desc: '몰래+접촉' },
    { regex: /(?:다른|딴)\s?(?:여자|남자|사람).{0,5}(?:랑|을|를|와|과|이랑).{0,5}(?:만나|자|연락|사귀)/, weight: 3, desc: '다른사람+만남' },
    { regex: /(?:바람|외도|불륜).{0,3}(?:증거|흔적|발견|들킴|들키)/, weight: 3, desc: '바람+증거' },
    { regex: /(?:숨기|비밀|몰래).{0,4}(?:연락|만남|카톡|문자)/, weight: 2, desc: '비밀+연락' },
  ],
  antiKeywords: [],
};

// ============================================================
// 6. BREAKUP_CONTEMPLATION (이별 고민)
// ============================================================
const BREAKUP_CONTEMPLATION: ScenarioKeywordSet = {
  keywords: [
    // === 이별 직접 표현 (weight 3) ===
    { text: '이별', weight: 2 },
    { text: '이별하', weight: 3 },
    { text: '이별할', weight: 3 },
    { text: '이별하고', weight: 3 },
    { text: '이별 고민', weight: 3 },
    { text: '이별고민', weight: 3 },
    { text: '이별 통보', weight: 3 },
    { text: '이별통보', weight: 3 },
    { text: '이별 선언', weight: 3 },

    // === 헤어지다 변형 (weight 2~3) ===
    { text: '헤어지', weight: 2 },
    { text: '헤어질', weight: 3 },
    { text: '헤어질까', weight: 3 },
    { text: '헤어지자', weight: 3 },
    { text: '헤어지고 싶', weight: 3 },
    { text: '헤어지고싶', weight: 3 },
    { text: '헤어져야', weight: 3 },
    { text: '헤어져야하', weight: 3 },
    { text: '헤어져야 하', weight: 3 },
    { text: '헤어짐', weight: 2 },
    { text: '헤어졌', weight: 2 },

    // === 관계 끝내기 (weight 2~3) ===
    { text: '끝내고 싶', weight: 3 },
    { text: '끝내고싶', weight: 3 },
    { text: '끝내야', weight: 3 },
    { text: '끝내자', weight: 3 },
    { text: '끝내려', weight: 3 },
    { text: '끝내야 하나', weight: 3 },
    { text: '관계 끝', weight: 3 },
    { text: '관계를 끝', weight: 3 },
    { text: '관계 정리', weight: 3 },
    { text: '관계를 정리', weight: 3 },
    { text: '정리해야', weight: 2 },
    { text: '정리할까', weight: 2 },
    { text: '정리하고 싶', weight: 2 },

    // === "더 이상 못/안" (weight 2~3) ===
    { text: '더이상 못하겠', weight: 3 },
    { text: '더 이상 못하겠', weight: 3 },
    { text: '더이상 못 하겠', weight: 3 },
    { text: '더 이상 못 하겠', weight: 3 },
    { text: '더는 못하겠', weight: 3 },
    { text: '더는 못 하겠', weight: 3 },
    { text: '못하겠다', weight: 2 },
    { text: '못 하겠다', weight: 2 },
    { text: '지쳤다', weight: 1 },

    // === 그만/멈추다 (weight 2~3) ===
    { text: '그만하고 싶', weight: 3 },
    { text: '그만하고싶', weight: 3 },
    { text: '그만두', weight: 2 },
    { text: '그만할까', weight: 3 },
    { text: '그만해야', weight: 3 },
    { text: '멈추고 싶', weight: 2 },
    { text: '그만둘까', weight: 3 },

    // === 차다/차이다 (weight 2~3) ===
    { text: '차였', weight: 3 },
    { text: '차이고', weight: 3 },
    { text: '차임', weight: 2 },
    { text: '차일', weight: 2 },
    { text: '차여', weight: 2 },
    { text: '차버리', weight: 3 },
    { text: '차 버리', weight: 3 },
    { text: '차야하', weight: 3 },
    { text: '차야 하', weight: 3 },
    { text: '차려고', weight: 3 },

    // === 이별 유형 (weight 2) ===
    { text: '쿨이별', weight: 3 },
    { text: '쿨 이별', weight: 3 },
    { text: '깔끔하게 이별', weight: 3 },
    { text: '합의 이별', weight: 3 },
    { text: '합의이별', weight: 3 },
    { text: '일방적 이별', weight: 3 },
    { text: '일방적이별', weight: 3 },
    { text: '이별 방법', weight: 3 },
    { text: '이별방법', weight: 3 },
    { text: '이별 말', weight: 3 },
    { text: '보내줘야', weight: 2 },
    { text: '놓아줘야', weight: 2 },

    // === 양가감정 (weight 2) ===
    { text: '사랑하는데 힘들', weight: 2 },
    { text: '좋은데 힘들', weight: 2 },
    { text: '사랑하지만', weight: 2 },
    { text: '좋아하지만', weight: 2 },
    { text: '미련', weight: 2 },
    { text: '미련이 남', weight: 2 },
    { text: '미련이 있', weight: 2 },
    { text: '결심이 안', weight: 2 },
    { text: '결정을 못', weight: 2 },
    { text: '결정 못', weight: 2 },
    { text: '갈등', weight: 1 },

    // === 이별 후 (weight 2) ===
    { text: '이별 후', weight: 2 },
    { text: '이별후', weight: 2 },
    { text: '헤어진 후', weight: 2 },
    { text: '헤어진후', weight: 2 },
    { text: '헤어지고 나서', weight: 2 },
    { text: '이별 극복', weight: 2 },
    { text: '이별극복', weight: 2 },
    { text: '이별 회복', weight: 2 },
    { text: '전남친', weight: 2 },
    { text: '전여친', weight: 2 },
    { text: '전남편', weight: 2 },
    { text: '전아내', weight: 2 },
    { text: '전 남친', weight: 2 },
    { text: '전 여친', weight: 2 },
    { text: '전 남편', weight: 2 },
    { text: '전 아내', weight: 2 },
    { text: '재회', weight: 2 },
    { text: '재회하', weight: 2 },
    { text: '재회할', weight: 2 },
    { text: '다시 만나', weight: 1 },
    { text: '복합', weight: 2 },
    { text: '복합하', weight: 2 },
  ],
  patterns: [
    { regex: /헤어지.{0,3}(?:까|야|고\s?싶|자|려|할|면)/, weight: 3, desc: '헤어지+의향' },
    { regex: /이별.{0,3}(?:고민|통보|선언|결심|방법|할|하|해야)/, weight: 3, desc: '이별+행동' },
    { regex: /(?:끝내|그만하|정리하|그만두).{0,3}(?:고\s?싶|야|자|까|려)/, weight: 3, desc: '관계종료의향' },
    { regex: /더\s?(?:이상|는)\s?못\s?(?:하겠|버티겠|참겠|견디겠)/, weight: 3, desc: '한계도달' },
    { regex: /(?:사랑|좋아).{0,4}(?:하지만|하는데|인데).{0,5}(?:힘들|지쳤|못하겠|끝내)/, weight: 3, desc: '양가감정' },
    { regex: /차.{0,2}(?:였|이고|임|버리|야\s?하|려고|줘야)/, weight: 3, desc: '차다/차이다' },
    { regex: /미련.{0,3}(?:이|이\s?남|있|남아|못\s?버리)/, weight: 2, desc: '미련' },
  ],
  antiKeywords: [],
};

// ============================================================
// 7. BOREDOM (권태기)
// ============================================================
const BOREDOM: ScenarioKeywordSet = {
  keywords: [
    // === 직접 표현 (weight 3) ===
    { text: '권태기', weight: 3 },
    { text: '권태', weight: 2 },
    { text: '매너리즘', weight: 3 },

    // === 설렘 소실 (weight 2~3) ===
    { text: '설레지 않', weight: 3 },
    { text: '설레지않', weight: 3 },
    { text: '설렘이 없', weight: 3 },
    { text: '설렘 없', weight: 3 },
    { text: '설레임이 없', weight: 3 },
    { text: '설레임 없', weight: 3 },
    { text: '떨림이 없', weight: 2 },
    { text: '두근거리지 않', weight: 2 },
    { text: '두근거림 없', weight: 2 },
    { text: '두근두근하지 않', weight: 2 },

    // === 감정 식음/정만 남음 (weight 2~3) ===
    { text: '감정이 식', weight: 3 },
    { text: '감정 식', weight: 3 },
    { text: '사랑이 식', weight: 3 },
    { text: '마음이 식', weight: 3 },
    { text: '정만 남', weight: 3 },
    { text: '정밖에 없', weight: 3 },
    { text: '정 때문에', weight: 2 },
    { text: '정이 남', weight: 2 },
    { text: '사랑인지 정인지', weight: 3 },
    { text: '사랑이 아니라 정', weight: 3 },
    { text: '사랑이아니라정', weight: 3 },
    { text: '좋아하는 건지', weight: 2 },
    { text: '사랑하는건지', weight: 2 },
    { text: '사랑하는 건지', weight: 2 },

    // === 지루/심드렁 (weight 2~3) ===
    { text: '지루하', weight: 2 },
    { text: '지루해', weight: 2 },
    { text: '지루함', weight: 2 },
    { text: '심드렁', weight: 3 },
    { text: '시큰둥', weight: 2 },
    { text: '시들시들', weight: 2 },
    { text: '심심해', weight: 1 },
    { text: '무미건조', weight: 3 },
    { text: '밋밋', weight: 2 },
    { text: '재미없', weight: 2 },
    { text: '재미 없', weight: 2 },

    // === 친구같은/가족같은 (weight 2) ===
    { text: '친구 같', weight: 2 },
    { text: '친구같', weight: 2 },
    { text: '가족 같', weight: 2 },
    { text: '가족같', weight: 2 },
    { text: '룸메이트 같', weight: 2 },
    { text: '룸메이트같', weight: 2 },
    { text: '오빠 같', weight: 1 },
    { text: '오빠같', weight: 1 },
    { text: '동생 같', weight: 1 },
    { text: '동생같', weight: 1 },
    { text: '연인인데 친구', weight: 3 },
    { text: '애인인데 친구', weight: 3 },

    // === 반복/변화없음 (weight 2) ===
    { text: '항상 똑같', weight: 2 },
    { text: '맨날 똑같', weight: 2 },
    { text: '매번 똑같', weight: 2 },
    { text: '변화가 없', weight: 2 },
    { text: '변화 없', weight: 2 },
    { text: '늘 같은', weight: 1 },
    { text: '매일 같은', weight: 1 },
    { text: '패턴', weight: 1 },
    { text: '루틴', weight: 1 },
    { text: '새로움이 없', weight: 2 },
    { text: '새로움 없', weight: 2 },

    // === 무관심/무덤덤 (weight 2) ===
    { text: '무관심', weight: 2 },
    { text: '관심이 없', weight: 2 },
    { text: '관심 없', weight: 2 },
    { text: '관심이 식', weight: 3 },
    { text: '무덤덤', weight: 2 },
    { text: '담담', weight: 1 },
    { text: '아무 감정 없', weight: 2 },
    { text: '아무 감정없', weight: 2 },
    { text: '감정 없', weight: 2 },
    { text: '느낌이 없', weight: 2 },
    { text: '느낌 없', weight: 2 },

    // === 스킨십/성관계 (weight 2) ===
    { text: '스킨십이 줄', weight: 3 },
    { text: '스킨십 줄', weight: 3 },
    { text: '스킨십이 없', weight: 3 },
    { text: '스킨십 없', weight: 3 },
    { text: '스킨십 안', weight: 2 },
    { text: '스킨십 거부', weight: 3 },
    { text: '성욕이 없', weight: 2 },
    { text: '성욕 없', weight: 2 },
    { text: '손잡기도 싫', weight: 3 },
    { text: '접촉이 싫', weight: 3 },
    { text: '끌리지 않', weight: 2 },
    { text: '매력을 못 느', weight: 2 },
    { text: '매력이 없', weight: 2 },
  ],
  patterns: [
    { regex: /권태.{0,2}(?:기|에\s?빠|인\s?것|같)/, weight: 3, desc: '권태기' },
    { regex: /(?:설레|설렘|떨림|두근).{0,3}(?:지\s?않|이\s?없|없|안)/, weight: 3, desc: '설렘소실' },
    { regex: /(?:감정|사랑|마음|관심).{0,2}(?:이\s?)?식/, weight: 3, desc: '감정식음' },
    { regex: /정.{0,2}(?:만|밖에|때문).{0,3}(?:남|없|에)/, weight: 3, desc: '정만남음' },
    { regex: /(?:연인|애인|남친|여친|남자친구|여자친구).{0,3}(?:인데|이지만).{0,5}(?:친구|가족|룸메이트)/, weight: 3, desc: '연인→친구' },
    { regex: /(?:항상|맨날|매번|늘|매일).{0,3}(?:똑같|반복|같은)/, weight: 2, desc: '반복패턴' },
    { regex: /(?:스킨십|접촉|신체접촉).{0,3}(?:줄|없|안|거부|싫)/, weight: 3, desc: '스킨십감소' },
    { regex: /(?:사랑|좋아).{0,3}(?:인지|하는\s?건지|인건지).{0,3}(?:정|모르|헷갈)/, weight: 3, desc: '사랑vs정' },
  ],
  antiKeywords: [
    '이별', '헤어지', '차였', '바람', '외도',
  ],
};

// ============================================================
// 8. GENERAL (일반 연애 고민) — 다른 시나리오에 해당하지 않을 때
// ============================================================
const GENERAL: ScenarioKeywordSet = {
  keywords: [
    // === 썸/시작 (weight 1~2) ===
    { text: '썸', weight: 1 },
    { text: '썸타', weight: 2 },
    { text: '썸남', weight: 2 },
    { text: '썸녀', weight: 2 },
    { text: '썸 탈때', weight: 2 },
    { text: '고백', weight: 2 },
    { text: '고백하', weight: 2 },
    { text: '고백할', weight: 2 },
    { text: '고백 받', weight: 2 },
    { text: '고백받', weight: 2 },
    { text: '사귀자', weight: 2 },
    { text: '사귀고 싶', weight: 2 },
    { text: '사귀고싶', weight: 2 },
    { text: '사귀는 중', weight: 1 },
    { text: '사귀자고', weight: 2 },

    // === 밀당 (weight 2) ===
    { text: '밀당', weight: 2 },
    { text: '밀고 당기', weight: 2 },
    { text: '밀고당기', weight: 2 },
    { text: '푸시풀', weight: 2 },

    // === 소개팅/매칭 (weight 2) ===
    { text: '소개팅', weight: 2 },
    { text: '소개 받', weight: 1 },
    { text: '소개받', weight: 1 },
    { text: '매칭', weight: 1 },
    { text: '앱 만남', weight: 1 },
    { text: '앱으로 만나', weight: 1 },

    // === 연애 일반 (weight 1) ===
    { text: '연애', weight: 1 },
    { text: '연애 고민', weight: 1 },
    { text: '연애고민', weight: 1 },
    { text: '커플', weight: 1 },
    { text: '남친', weight: 1 },
    { text: '여친', weight: 1 },
    { text: '남자친구', weight: 1 },
    { text: '여자친구', weight: 1 },
    { text: '애인', weight: 1 },

    // === 첫 연애 (weight 2) ===
    { text: '첫연애', weight: 2 },
    { text: '첫 연애', weight: 2 },
    { text: '연애 초보', weight: 2 },
    { text: '연애초보', weight: 2 },
    { text: '연애 처음', weight: 2 },

    // === 연애 기술/노하우 (weight 1) ===
    { text: '어떻게 해야', weight: 1 },
    { text: '어떻게 하면', weight: 1 },
    { text: '뭐라고 하', weight: 1 },
    { text: '뭐라고 보내', weight: 1 },
    { text: '뭐라 하', weight: 1 },

    // === 기념일/데이트 (weight 1) ===
    { text: '기념일', weight: 1 },
    { text: '100일', weight: 1 },
    { text: '데이트', weight: 1 },
    { text: '선물', weight: 1 },
  ],
  patterns: [
    { regex: /썸.{0,3}(?:타|남|녀|인가|인건|일까)/, weight: 2, desc: '썸+변형' },
    { regex: /고백.{0,3}(?:하|할|받|할까|해야|해도)/, weight: 2, desc: '고백+변형' },
    { regex: /사귀.{0,3}(?:자|고\s?싶|는\s?중|게\s?됐)/, weight: 2, desc: '사귀다+변형' },
  ],
  antiKeywords: [],
};

// ============================================================
// 9. UNREQUITED_LOVE (짝사랑)
// ============================================================
const UNREQUITED_LOVE: ScenarioKeywordSet = {
  keywords: [
    { text: '짝사랑', weight: 3 },
    { text: '좋아하는 사람', weight: 1 }, // v73: 3→1 하향 (긍정 진행 케이스 오잠금 방지)
    { text: '좋아하는데 모름', weight: 3 },
    { text: '나만 좋아하는', weight: 3 },
    { text: '혼자 좋아', weight: 3 },
    { text: '혼자만 좋아', weight: 3 },
    { text: '고백 안 했', weight: 3 },
    { text: '고백 못 했', weight: 3 },
    { text: '고백을 못', weight: 3 },
    { text: '고백을 안', weight: 3 },
    { text: '고백할까', weight: 3 },
    { text: '고백해야', weight: 3 },
    { text: '고백 어떻게', weight: 3 },
    { text: '먼저 고백', weight: 2 },
    { text: '좋아한다고 말', weight: 3 },
    { text: '내 마음 모르는', weight: 3 },
    { text: '내 마음을 모르는', weight: 3 },
    { text: '상대가 내 마음', weight: 2 },
    { text: '나를 좋아하는지', weight: 3 },
    { text: '나를 어떻게 생각하는지', weight: 2 },
    { text: '친구로만 보는', weight: 3 },
    { text: '친구로만 볼', weight: 3 },
    { text: '친구로만 보이는', weight: 3 },
    { text: '그냥 친구인지', weight: 3 },
    { text: '좋아한다는 거 알까', weight: 3 },
    { text: '짝남', weight: 3 },
    { text: '짝녀', weight: 3 },
    { text: '짝사친', weight: 2 },
    { text: '오래 좋아했', weight: 2 },
    { text: '오랫동안 좋아', weight: 2 },
    { text: '좋아하는 마음', weight: 2 },
    { text: '설레는데', weight: 1 },
    { text: '카톡 먼저', weight: 1 },
    { text: '먼저 연락', weight: 1 },
  ],
  patterns: [
    { regex: /좋아하는\s*(남자|여자|사람|애)/, weight: 2, desc: '짝사랑 대상 언급' },
    { regex: /고백\s*(할까|해야|어떻게)/, weight: 3, desc: '고백 고민' },
    { regex: /나만\s*좋아하는\s*것\s*같아/, weight: 3, desc: '일방적 감정 인식' },
    { regex: /그\s*(사람|애|남자|여자)가\s*나를/, weight: 2, desc: '상대의 나에 대한 감정' },
  ],
  // 🆕 v73: 긍정 진행 지표 추가 — 번호 땀/연락 중/썸 등은 짝사랑 아님
  antiKeywords: [
    '사귀는', '남친', '여친', '남자친구', '여자친구', '헤어졌', '이별',
    '번호 땄', '번호 받', '연락 중', '연락중', '연락해', '연락하는 중',
    '썸 타', '썸타', '만나기로', '사귀기로', '카톡 중', '카톡하는 중',
    '데이트 하', '데이트했', '맞선', '소개팅',
  ],
};

// ============================================================
// 10. RECONNECTION (재회/연락 시도)
// ============================================================
const RECONNECTION: ScenarioKeywordSet = {
  keywords: [
    { text: '재회', weight: 3 },
    { text: '다시 연락', weight: 3 },
    { text: '연락이 왔', weight: 3 },
    { text: '연락해봤', weight: 3 },
    { text: '전 남친', weight: 3 },
    { text: '전 여친', weight: 3 },
    { text: '전남친', weight: 3 },
    { text: '전여친', weight: 3 },
    { text: '전 남자친구', weight: 3 },
    { text: '전 여자친구', weight: 3 },
    { text: '헤어졌다가 다시', weight: 3 },
    { text: '다시 만나', weight: 3 },
    { text: '다시 사귀', weight: 3 },
    { text: '다시 시작', weight: 3 },
    { text: '연락 시도', weight: 3 },
    { text: '연락해볼까', weight: 3 },
    { text: '연락할까', weight: 2 },
    { text: '전 연인', weight: 3 },
    { text: '예전 남친', weight: 3 },
    { text: '예전 여친', weight: 3 },
    { text: '예전에 사귀', weight: 3 },
    { text: '오랜만에 연락', weight: 3 },
    { text: '갑자기 연락', weight: 2 },
    { text: '왜 연락했을까', weight: 3 },
    { text: '다시 연결', weight: 2 },
    { text: '그때 헤어진', weight: 2 },
    { text: '복귀', weight: 1 },
    { text: '잊고 싶은데 연락', weight: 3 },
  ],
  patterns: [
    { regex: /전\s*(남|여)(친|자친구)/, weight: 3, desc: '전 연인 언급' },
    { regex: /다시\s*(만나|사귀|시작|연락)/, weight: 3, desc: '재회/재시작' },
    { regex: /(헤어졌|이별)\s*후.*다시/, weight: 3, desc: '이별 후 재회' },
    { regex: /오랜만에\s*연락/, weight: 2, desc: '오랜만 연락' },
  ],
  antiKeywords: [],
};

// ============================================================
// 11. FIRST_MEETING (새로운 만남/썸)
// ============================================================
const FIRST_MEETING: ScenarioKeywordSet = {
  keywords: [
    { text: '썸', weight: 3 },
    { text: '썸타는', weight: 3 },
    { text: '썸남', weight: 3 },
    { text: '썸녀', weight: 3 },
    { text: '처음 만난', weight: 2 },
    { text: '요즘 만나는', weight: 3 },
    { text: '최근에 만난', weight: 2 },
    { text: '소개팅', weight: 3 },
    { text: '소개팅남', weight: 3 },
    { text: '소개팅녀', weight: 3 },
    { text: '설레', weight: 2 },
    { text: '설레는', weight: 2 },
    { text: '새로 좋아진', weight: 3 },
    { text: '새로운 사람', weight: 2 },
    { text: '얼마 안 됐', weight: 2 },
    { text: '알게 된 지 얼마', weight: 3 },
    { text: '만난 지 얼마', weight: 3 },
    { text: '좋아지는 것 같아', weight: 3 },
    { text: '좋아지기 시작', weight: 3 },
    { text: '관심이 생겼', weight: 3 },
    { text: '관심이 가', weight: 2 },
    { text: '데이트', weight: 1 },
    { text: '첫 만남', weight: 2 },
    { text: '처음 봤', weight: 2 },
    { text: '호감', weight: 2 },
    { text: '좋아하게 된', weight: 3 },
    { text: '어떻게 접근', weight: 2 },
    { text: '어떻게 다가', weight: 2 },
    // 🆕 v23: MZ 썸 문화
    { text: '플러팅', weight: 3 },
    { text: '모솔', weight: 2 },
    { text: '연애 시작', weight: 2 },
    { text: '밀당 시작', weight: 2 },
    { text: '카페 데이트', weight: 1 },
    { text: '번호 따', weight: 2 },
    { text: '인스타 팔로우', weight: 2 },
    { text: '디엠 보낼까', weight: 2 },
  ],
  patterns: [
    { regex: /썸\s*(타는|남|녀|인지)/, weight: 3, desc: '썸 언급' },
    { regex: /만난\s*지\s*(얼마|며칠|몇\s*주|몇\s*달)/, weight: 2, desc: '만남 기간 짧음' },
    { regex: /좋아지(는|기\s*시작)/, weight: 2, desc: '감정 발생' },
    { regex: /소개팅\s*(후|에서)/, weight: 3, desc: '소개팅' },
  ],
  antiKeywords: ['헤어졌', '이별', '전 남친', '전 여친'],
};

// ============================================================
// 12. COMMITMENT_FEAR (연애 공포증/회피형)
// ============================================================
const COMMITMENT_FEAR: ScenarioKeywordSet = {
  keywords: [
    { text: '사귀자고 안 해', weight: 3 },
    { text: '사귀자는 말을 안', weight: 3 },
    { text: '사귀기 싫다고', weight: 3 },
    { text: '연애하기 싫다고', weight: 3 },
    { text: '연애 안 하고 싶다고', weight: 3 },
    { text: '혼자가 편하다고', weight: 3 },
    { text: '혼자가 좋다고', weight: 3 },
    { text: '진지한 관계 싫다고', weight: 3 },
    { text: '관계 정의', weight: 3 },
    { text: '관계 정의 못', weight: 3 },
    { text: '관계 정의 안', weight: 3 },
    { text: '연애 공포', weight: 3 },
    { text: '회피형', weight: 3 },
    { text: '결혼 싫다고', weight: 2 },
    { text: '묶이기 싫다고', weight: 3 },
    { text: '속박 싫다고', weight: 3 },
    { text: '자유롭고 싶다고', weight: 2 },
    { text: '만나기만 하자고', weight: 3 },
    { text: '그냥 친구하자', weight: 3 },
    { text: '사귀는 건 아니고', weight: 3 },
    { text: '여자친구는 아니라고', weight: 3 },
    { text: '남자친구는 아니라고', weight: 3 },
    { text: '애인은 없다고', weight: 2 },
    { text: '연락은 하는데 사귀', weight: 3 },
    { text: '만나는데 사귀', weight: 3 },
    { text: '노 라벨', weight: 3 },
    { text: '라벨 안 붙이', weight: 3 },
    { text: '상처받기 싫다고', weight: 2 },
    { text: '감정 표현 안 해', weight: 2 },
    { text: '표현을 안 해', weight: 1 },
    // 🆕 v23: MZ 비연애 문화
    { text: '비연애주의', weight: 3 },
    { text: '솔로주의', weight: 3 },
    { text: '비혼주의', weight: 2 },
    { text: '연애 무서워', weight: 3 },
    { text: '관계가 무서워', weight: 3 },
    { text: '연애 트라우마', weight: 3 },
    { text: '연애 상처', weight: 2 },
    { text: '다시는 안 사귀', weight: 3 },
    { text: '혼자가 나을', weight: 2 },
  ],
  patterns: [
    { regex: /사귀자(고)?\s*(안|못|는\s*말)/, weight: 3, desc: '사귀자 거부' },
    { regex: /연애\s*(공포|기피|싫다)/, weight: 3, desc: '연애 기피' },
    { regex: /관계\s*정의\s*(못|안|안\s*해)/, weight: 3, desc: '관계 정의 거부' },
    { regex: /회피(형|적|하는)/, weight: 3, desc: '회피형 언급' },
    { regex: /(혼자|자유)\s*(가|가\s*)(편|좋)/, weight: 2, desc: '혼자가 편함' },
  ],
  antiKeywords: [],
};

// ============================================================
// 13. RELATIONSHIP_PACE (진도 차이)
// ============================================================
const RELATIONSHIP_PACE: ScenarioKeywordSet = {
  keywords: [
    { text: '진도', weight: 3 },
    { text: '진도가 안 나가', weight: 3 },
    { text: '진도가 느려', weight: 3 },
    { text: '진도를 안 나가', weight: 3 },
    { text: '고백을 안 해', weight: 3 },
    { text: '고백 안 해', weight: 3 },
    { text: '사귀자고 안 해', weight: 3 },
    { text: '사귀는 건지 모르겠', weight: 3 },
    { text: '사귀는 건지 아닌지', weight: 3 },
    { text: '친구인지 연인인지', weight: 3 },
    { text: '모호한 관계', weight: 3 },
    { text: '애매한 관계', weight: 3 },
    { text: '애매해', weight: 2 },
    { text: '모호해', weight: 2 },
    { text: '스킨십', weight: 2 },
    { text: '스킨십 안 해', weight: 3 },
    { text: '손도 안 잡아', weight: 3 },
    { text: '손 안 잡아', weight: 3 },
    { text: '언제 사귀자고', weight: 3 },
    { text: '빨리 사귀고 싶', weight: 3 },
    { text: '내가 먼저 해야', weight: 2 },
    { text: '뭔지 모르겠', weight: 2 },
    { text: '뭔 사이인지', weight: 3 },
    { text: '무슨 사이인지', weight: 3 },
    { text: '우리가 무슨', weight: 2 },
    { text: '단계', weight: 1 },
    { text: '다음 단계', weight: 2 },
  ],
  patterns: [
    { regex: /진도(가|를)?\s*(안\s*나|느려|빠르)/, weight: 3, desc: '진도 언급' },
    { regex: /(친구|연인)\s*인지\s*(연인|친구)\s*인지/, weight: 3, desc: '관계 모호' },
    { regex: /모호한|애매한\s*관계/, weight: 2, desc: '애매한 관계' },
    { regex: /사귀는\s*건지\s*(모르|아닌지)/, weight: 3, desc: '사귀는지 모름' },
    { regex: /스킨십\s*(안|못)/, weight: 2, desc: '스킨십 없음' },
  ],
  antiKeywords: ['헤어졌', '이별', '전 남친', '전 여친'],
};

// ============================================================
// 14. ONLINE_LOVE (온라인/앱 만남)
// ============================================================
const ONLINE_LOVE: ScenarioKeywordSet = {
  keywords: [
    { text: '앱에서 만난', weight: 3 },
    { text: '앱으로 만난', weight: 3 },
    { text: '소개팅 앱', weight: 3 },
    { text: '틴더', weight: 3 },
    { text: '위피', weight: 3 },
    { text: '정오의데이트', weight: 3 },
    { text: '해피투게더', weight: 3 },
    { text: '아만다', weight: 2 },
    { text: '온라인으로 만난', weight: 3 },
    { text: '온라인에서 만난', weight: 3 },
    { text: '직접 못 만남', weight: 3 },
    { text: '직접 아직 못', weight: 3 },
    { text: '아직 한 번도 못 만난', weight: 3 },
    { text: '대화만 해봤', weight: 3 },
    { text: '채팅으로만', weight: 3 },
    { text: '카톡으로만', weight: 3 },
    { text: '온라인 장거리', weight: 3 },
    { text: '게임에서 만난', weight: 3 },
    { text: '커뮤니티에서 만난', weight: 2 },
    { text: '디엠으로 연락', weight: 2 },
    { text: 'dm으로', weight: 2 },
    { text: '인스타로 연락', weight: 2 },
    { text: '온라인 친구', weight: 2 },
    // 🆕 v23: MZ 데이팅앱 확장
    { text: '위드', weight: 3 },
    { text: '글램', weight: 3 },
    { text: '번개', weight: 2 },
    { text: '매칭앱', weight: 3 },
    { text: '소개팅어플', weight: 3 },
    { text: '블라인드앱', weight: 2 },
    { text: '너랑나랑', weight: 3 },
    { text: '실제로 만난 적 없', weight: 3 },
    { text: '실제로 본 적 없', weight: 3 },
    { text: '오프 만남', weight: 2 },
    { text: '오프라인 만남', weight: 2 },
  ],
  patterns: [
    { regex: /앱(에서|으로)\s*만난/, weight: 3, desc: '앱 만남' },
    { regex: /(온라인|인터넷|게임|커뮤니티)(에서|으로)\s*만난/, weight: 3, desc: '온라인 만남' },
    { regex: /직접\s*(못|아직)\s*만/, weight: 3, desc: '오프라인 미만남' },
    { regex: /(틴더|위피|정오의데이트|해피투게더)/, weight: 3, desc: '데이팅앱 언급' },
    { regex: /실제로\s*(본|만난)\s*적\s*없/, weight: 3, desc: '실제 만남 없음' },
  ],
  antiKeywords: [],
};

// ============================================================
// 시나리오 → 키워드셋 매핑
// ============================================================
export const SCENARIO_KEYWORD_MAP: Record<string, ScenarioKeywordSet> = {
  [RelationshipScenario.READ_AND_IGNORED]: READ_AND_IGNORED,
  [RelationshipScenario.GHOSTING]: GHOSTING,
  [RelationshipScenario.LONG_DISTANCE]: LONG_DISTANCE,
  [RelationshipScenario.JEALOUSY]: JEALOUSY,
  [RelationshipScenario.INFIDELITY]: INFIDELITY,
  [RelationshipScenario.BREAKUP_CONTEMPLATION]: BREAKUP_CONTEMPLATION,
  [RelationshipScenario.BOREDOM]: BOREDOM,
  [RelationshipScenario.GENERAL]: GENERAL,
  [RelationshipScenario.UNREQUITED_LOVE]: UNREQUITED_LOVE,
  [RelationshipScenario.RECONNECTION]: RECONNECTION,
  [RelationshipScenario.FIRST_MEETING]: FIRST_MEETING,
  [RelationshipScenario.COMMITMENT_FEAR]: COMMITMENT_FEAR,
  [RelationshipScenario.RELATIONSHIP_PACE]: RELATIONSHIP_PACE,
  [RelationshipScenario.ONLINE_LOVE]: ONLINE_LOVE,
};

// ============================================================
// 시나리오 분류 엔진
// ============================================================

interface ScenarioScore {
  scenario: RelationshipScenario;
  score: number;
  matchedKeywords: string[];
  matchedPatterns: string[];
}

/**
 * 메시지에서 키워드/패턴 기반 시나리오 점수를 계산한다.
 * @returns 점수가 높은 순으로 정렬된 시나리오 목록
 */
export function classifyScenarioByKeywords(message: string): ScenarioScore[] {
  const msgLower = message.toLowerCase();
  const results: ScenarioScore[] = [];

  for (const [scenarioKey, keywordSet] of Object.entries(SCENARIO_KEYWORD_MAP)) {
    const scenario = scenarioKey as RelationshipScenario;
    let score = 0;
    const matchedKeywords: string[] = [];
    const matchedPatterns: string[] = [];

    // antiKeyword 체크: 하나라도 있으면 이 시나리오 건너뜀
    const hasAnti = keywordSet.antiKeywords.some(ak => msgLower.includes(ak));
    if (hasAnti) {
      results.push({ scenario, score: 0, matchedKeywords: [], matchedPatterns: [] });
      continue;
    }

    // 키워드 매칭
    for (const kw of keywordSet.keywords) {
      if (msgLower.includes(kw.text)) {
        score += kw.weight;
        matchedKeywords.push(kw.text);
      }
    }

    // 패턴(정규식) 매칭
    for (const pat of keywordSet.patterns) {
      if (pat.regex.test(msgLower)) {
        score += pat.weight;
        matchedPatterns.push(pat.desc);
      }
    }

    results.push({ scenario, score, matchedKeywords, matchedPatterns });
  }

  // 점수 높은 순 정렬
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * 키워드 기반으로 시나리오 오버라이드 여부를 판단한다.
 *
 * @param message 사용자 메시지
 * @param llmScenario LLM이 분류한 시나리오
 * @returns 오버라이드할 시나리오 (없으면 null)
 */
export function getScenarioOverride(
  message: string,
  llmScenario: RelationshipScenario
): { scenario: RelationshipScenario; confidence: number; reason: string } | null {
  const scores = classifyScenarioByKeywords(message);
  const topResult = scores[0];
  const secondResult = scores[1];

  // 최소 점수 임계값: 2 이상이어야 오버라이드
  if (!topResult || topResult.score < 2) {
    return null;
  }

  // 이미 LLM 결과와 동일하면 오버라이드 불필요
  if (topResult.scenario === llmScenario) {
    return null;
  }

  // GENERAL은 오버라이드 대상이 아님 (다른 시나리오가 없을 때 폴백)
  if (topResult.scenario === RelationshipScenario.GENERAL) {
    return null;
  }

  // 확신도 계산: top과 2nd 간격이 클수록 확신
  const gap = topResult.score - (secondResult?.score ?? 0);
  const confidence = Math.min(1, gap / 5); // 5점 이상 차이면 confidence 1.0

  // 최소 확신도 임계값
  if (confidence < 0.2 && topResult.score < 4) {
    return null;
  }

  const keywordsStr = topResult.matchedKeywords.slice(0, 3).join(', ');
  const patternsStr = topResult.matchedPatterns.slice(0, 2).join(', ');
  const reason = `키워드[${keywordsStr}]${patternsStr ? ` 패턴[${patternsStr}]` : ''} (score: ${topResult.score}, gap: ${gap})`;

  return {
    scenario: topResult.scenario,
    confidence,
    reason,
  };
}
