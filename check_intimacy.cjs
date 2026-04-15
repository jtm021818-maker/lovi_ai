/**
 * 친밀도 데이터 진단 스크립트
 * user_profiles.user_model.intimacy 필드를 직접 조회하여 루나/타로냥 분리 확인
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vtxplmqnonmsskyvuoyn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eHBsbXFub25tc3NreXZ1b3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTM2NzAsImV4cCI6MjA4OTU2OTY3MH0.EwYR0voyGMoUXoF4QwarvTPJcM0fOTKO3t9DB6hJ48M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  // 모든 유저의 user_model.intimacy 확인
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, nickname, user_model')
    .not('user_model', 'is', null);

  if (error) {
    console.error('❌ 쿼리 실패:', error.message);
    return;
  }

  console.log(`\n📊 총 ${data.length}명의 유저 프로필 확인\n`);

  for (const user of data) {
    const um = user.user_model;
    const intimacy = um?.intimacy;
    const nickname = user.nickname || '(없음)';

    console.log(`\n👤 ${nickname} (${user.id.slice(0, 8)}...)`);

    if (!intimacy) {
      console.log('  ⚠️ intimacy 필드 없음 (구 버전)');
      console.log('  legacy intimacyScore:', um?.lunaRelationship?.intimacyScore ?? 'N/A');
      continue;
    }

    // 분리 구조인지 확인
    const isSplit = intimacy.luna && intimacy.tarot;
    const isSingle = intimacy.dimensions; // 구 단일 구조

    if (isSingle && !isSplit) {
      console.log('  ⚠️ 구 단일 IntimacyState 구조 (luna/tarot 분리 안됨!)');
      console.log('  dimensions:', JSON.stringify(intimacy.dimensions));
      console.log('  totalSessions:', intimacy.totalSessions);
      console.log('  level:', intimacy.level, intimacy.levelName);
      continue;
    }

    if (!isSplit) {
      console.log('  ❓ 알 수 없는 형태:', JSON.stringify(intimacy).slice(0, 200));
      continue;
    }

    // 정상 분리 구조
    const luna = intimacy.luna;
    const tarot = intimacy.tarot;

    console.log('  ✅ luna/tarot 분리 구조 확인');
    console.log(`  🦊 루나:`);
    console.log(`    dims: trust=${luna.dimensions?.trust} open=${luna.dimensions?.openness} bond=${luna.dimensions?.bond} respect=${luna.dimensions?.respect}`);
    console.log(`    Lv.${luna.level} "${luna.levelName}" | sessions=${luna.totalSessions} | consec=${luna.consecutiveDays}`);
    console.log(`    firstAt=${luna.firstSessionAt} | lastAt=${luna.lastSessionAt}`);

    console.log(`  🔮 타로냥:`);
    console.log(`    dims: trust=${tarot.dimensions?.trust} open=${tarot.dimensions?.openness} bond=${tarot.dimensions?.bond} respect=${tarot.dimensions?.respect}`);
    console.log(`    Lv.${tarot.level} "${tarot.levelName}" | sessions=${tarot.totalSessions} | consec=${tarot.consecutiveDays}`);
    console.log(`    firstAt=${tarot.firstSessionAt} | lastAt=${tarot.lastSessionAt}`);

    // 동일 여부 체크
    const lunaAvg = (luna.dimensions?.trust + luna.dimensions?.openness + luna.dimensions?.bond + luna.dimensions?.respect) / 4;
    const tarotAvg = (tarot.dimensions?.trust + tarot.dimensions?.openness + tarot.dimensions?.bond + tarot.dimensions?.respect) / 4;
    const areSame = JSON.stringify(luna.dimensions) === JSON.stringify(tarot.dimensions);
    console.log(`  📈 루나 avg=${lunaAvg.toFixed(1)} | 타로냥 avg=${tarotAvg.toFixed(1)} | 동일? ${areSame ? '⚠️ YES (같음!)' : '✅ NO (다름)'}`);
  }
}

check().catch(console.error);
