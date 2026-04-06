/**
 * 시나리오 키워드 분류 테스트
 * 실행: npx tsx src/engines/state-analysis/scenario-keywords.test.ts
 */

import { classifyScenarioByKeywords, getScenarioOverride } from './scenario-keywords';

type TestCase = {
  input: string;
  expected: string;
  desc: string;
};

const testCases: TestCase[] = [
  // ============================================================
  // READ_AND_IGNORED — 원래 실패했던 케이스들
  // ============================================================
  { input: '여친이 문자를 씹었어 ㅠㅠㅠㅠ', expected: 'READ_AND_IGNORED', desc: '[핵심] 문자를 씹었어' },
  { input: '톡을 씹어버렸어', expected: 'READ_AND_IGNORED', desc: '톡을 씹다' },
  { input: '카톡 씹힘 ㅠㅠ', expected: 'READ_AND_IGNORED', desc: '카톡 씹힘' },
  { input: '씹혔어 또...', expected: 'READ_AND_IGNORED', desc: '씹혔어' },
  { input: '답이 안와 몇시간째', expected: 'READ_AND_IGNORED', desc: '답이 안와' },
  { input: '읽고 답 안하네', expected: 'READ_AND_IGNORED', desc: '읽고 답 안함' },
  { input: '카톡 보냈는데 1이 안사라져', expected: 'READ_AND_IGNORED', desc: '1 안사라짐' },
  { input: '확인만 하고 답장을 안해', expected: 'READ_AND_IGNORED', desc: '확인만 하고 답 없음' },
  { input: '봤으면서 왜 답을 안해', expected: 'READ_AND_IGNORED', desc: '봤으면서 답 안함' },
  { input: '메시지 보냈는데 반응이 없어', expected: 'READ_AND_IGNORED', desc: '메시지 보냈는데 반응 없음' },
  { input: 'DM 씹혔어', expected: 'READ_AND_IGNORED', desc: 'DM 씹힘' },
  { input: '안읽씹 당했어', expected: 'READ_AND_IGNORED', desc: '안읽씹' },
  { input: '읽씹각이야', expected: 'READ_AND_IGNORED', desc: '읽씹각' },
  { input: '또 씹혔다 진짜', expected: 'READ_AND_IGNORED', desc: '또 씹혔다' },
  { input: '하루째 답장이 없어', expected: 'READ_AND_IGNORED', desc: '하루째 답장 없음' },
  { input: '연락했는데 씹히네', expected: 'READ_AND_IGNORED', desc: '연락했는데 씹힘' },
  { input: '대충 답하고 끝이야', expected: 'READ_AND_IGNORED', desc: '대충 답' },
  { input: '단답만 해 ㅋ만', expected: 'READ_AND_IGNORED', desc: '단답' },
  { input: '미리보기로만 읽고 답을 안해', expected: 'READ_AND_IGNORED', desc: '미리보기로 읽음' },
  { input: '안 읽은 척 하는거야?', expected: 'READ_AND_IGNORED', desc: '안 읽은 척' },

  // ============================================================
  // GHOSTING
  // ============================================================
  { input: '잠수탔어 갑자기', expected: 'GHOSTING', desc: '잠수타다' },
  { input: '고스팅 당한 것 같아', expected: 'GHOSTING', desc: '고스팅 당함' },
  { input: '연락두절 된지 일주일', expected: 'GHOSTING', desc: '연락두절' },
  { input: '갑자기 사라졌어 연락이 안돼', expected: 'GHOSTING', desc: '갑자기 사라짐' },
  { input: '증발했나봐 연락이 안 되네', expected: 'GHOSTING', desc: '증발' },
  { input: '차단당했어 카톡에서', expected: 'GHOSTING', desc: '차단당함' },
  { input: '감감무소식이야 며칠째', expected: 'GHOSTING', desc: '감감무소식' },
  { input: '친삭당한 것 같아 프사가 안보여', expected: 'GHOSTING', desc: '친삭' },
  { input: '잠적해버렸어 말도 없이', expected: 'GHOSTING', desc: '잠적' },
  { input: '몇 주째 소식이 없어', expected: 'GHOSTING', desc: '몇 주째 소식 없음' },

  // ============================================================
  // LONG_DISTANCE
  // ============================================================
  { input: '장거리 연애 중인데 너무 힘들어', expected: 'LONG_DISTANCE', desc: '장거리 연애' },
  { input: '군대 간 남친이 보고싶어', expected: 'LONG_DISTANCE', desc: '군대 남친' },
  { input: '유학 가서 시차 때문에 힘들어', expected: 'LONG_DISTANCE', desc: '유학+시차' },
  { input: '다른 도시에서 연애하는게 쉽지 않아', expected: 'LONG_DISTANCE', desc: '다른 도시 연애' },
  { input: '한달에 한번밖에 못 만나', expected: 'LONG_DISTANCE', desc: '한달에 한번' },

  // ============================================================
  // JEALOUSY
  // ============================================================
  { input: '질투가 너무 나', expected: 'JEALOUSY', desc: '질투' },
  { input: '남친이 여사친이랑 카톡하더라', expected: 'JEALOUSY', desc: '여사친+카톡' },
  { input: '핸드폰 검사하고 싶어', expected: 'JEALOUSY', desc: '핸드폰 검사' },
  { input: '인스타 좋아요 감시하게 돼', expected: 'JEALOUSY', desc: '인스타 감시' },
  { input: '집착이 심해져서 통제하게 돼', expected: 'JEALOUSY', desc: '집착+통제' },
  { input: '의처증인가 의심이 안 멈춰', expected: 'JEALOUSY', desc: '의처증' },

  // ============================================================
  // INFIDELITY
  // ============================================================
  { input: '바람피는 것 같아', expected: 'INFIDELITY', desc: '바람피다' },
  { input: '양다리 걸치고 있었어', expected: 'INFIDELITY', desc: '양다리' },
  { input: '몰래 다른 여자를 만나고 있었어', expected: 'INFIDELITY', desc: '몰래 만남' },
  { input: '외도 증거를 발견했어', expected: 'INFIDELITY', desc: '외도 증거' },
  { input: '투타임 하고 있었대', expected: 'INFIDELITY', desc: '투타임' },

  // ============================================================
  // BREAKUP_CONTEMPLATION
  // ============================================================
  { input: '헤어질까 고민중이야', expected: 'BREAKUP_CONTEMPLATION', desc: '헤어질까 고민' },
  { input: '이별 통보 받았어', expected: 'BREAKUP_CONTEMPLATION', desc: '이별 통보' },
  { input: '더이상 못하겠다 끝내고 싶어', expected: 'BREAKUP_CONTEMPLATION', desc: '더이상 못하겠+끝내고싶' },
  { input: '사랑하는데 힘들어서 그만하고 싶어', expected: 'BREAKUP_CONTEMPLATION', desc: '양가감정' },
  { input: '차였어 어제', expected: 'BREAKUP_CONTEMPLATION', desc: '차였다' },
  { input: '미련이 남아서 결정을 못하겠어', expected: 'BREAKUP_CONTEMPLATION', desc: '미련+결정못함' },
  { input: '전여친이 재회하자고 해', expected: 'BREAKUP_CONTEMPLATION', desc: '전여친+재회' },

  // ============================================================
  // BOREDOM
  // ============================================================
  { input: '권태기인 것 같아', expected: 'BOREDOM', desc: '권태기' },
  { input: '설레지 않아 더 이상', expected: 'BOREDOM', desc: '설레지 않음' },
  { input: '감정이 식은 것 같아 정만 남았어', expected: 'BOREDOM', desc: '감정식음+정만남음' },
  { input: '연인인데 친구 같아', expected: 'BOREDOM', desc: '연인→친구' },
  { input: '항상 똑같고 지루해', expected: 'BOREDOM', desc: '반복+지루' },
  { input: '스킨십이 줄었어 매력을 못 느끼겠어', expected: 'BOREDOM', desc: '스킨십감소' },

  // ============================================================
  // disambiguation — 경계 케이스
  // ============================================================
  { input: '읽씹당하다가 잠수까지 타버렸어', expected: 'GHOSTING', desc: '[경계] 읽씹→잠수 (잠수가 더 심각)' },
  { input: '바람핀 것 같은데 의심이 안 멈춰', expected: 'INFIDELITY', desc: '[경계] 바람 vs 질투 (바람이 더 구체적)' },
];

// ────────── 테스트 실행 ──────────
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const scores = classifyScenarioByKeywords(tc.input);
  const top = scores[0];
  const isPass = top.scenario === tc.expected;

  if (isPass) {
    passed++;
    console.log(`✅ PASS: ${tc.desc}`);
    console.log(`   "${tc.input}" → ${top.scenario} (score: ${top.score})`);
  } else {
    failed++;
    console.log(`❌ FAIL: ${tc.desc}`);
    console.log(`   "${tc.input}"`);
    console.log(`   Expected: ${tc.expected}`);
    console.log(`   Got:      ${top.scenario} (score: ${top.score})`);
    // 상위 3개 결과 출력
    console.log(`   Top 3: ${scores.slice(0, 3).map(s => `${s.scenario}(${s.score})`).join(', ')}`);
    if (top.matchedKeywords.length) console.log(`   Keywords: ${top.matchedKeywords.join(', ')}`);
    if (top.matchedPatterns.length) console.log(`   Patterns: ${top.matchedPatterns.join(', ')}`);
  }
  console.log();
}

console.log('═'.repeat(50));
console.log(`Total: ${testCases.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
console.log(`Pass rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed > 0) {
  process.exit(1);
}
