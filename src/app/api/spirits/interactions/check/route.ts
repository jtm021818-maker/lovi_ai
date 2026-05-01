/**
 * v103: GET /api/spirits/interactions/check
 *
 * 방에 placed 된 정령들 중 페어 인터랙션 발생 가능한 한 쌍을 반환.
 * 조건:
 *  - 두 정령 모두 is_placed_in_room=true
 *  - 두 정령 모두 bond_lv >= 4
 *  - INTERACTIONS 테이블에 등록된 페어
 *  - 같은 다이얼로그 인덱스 7일 이내 본 적 없음
 *  - 최근 인터랙션 30분 이상 경과 (스팸 방지)
 *
 * 응답: { fired: false } | { fired: true, pairKey, dialogueIndex, a:{spiritId,line}, b:{spiritId,line} }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { INTERACTIONS } from '@/data/interactions';
import { SPIRITS } from '@/data/spirits';

const COOLDOWN_MS = 30 * 60 * 1000; // 30분
const REPEAT_BLOCK_MS = 7 * 86_400_000; // 7일

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

  // (1) placed + Lv4+ 정령 조회
  const { data: placedRows } = await supabase
    .from('user_spirits')
    .select('spirit_id, bond_lv')
    .eq('user_id', user.id)
    .eq('is_placed_in_room', true)
    .gte('bond_lv', 4);

  const placedIds = new Set((placedRows ?? []).map((r) => r.spirit_id));
  if (placedIds.size < 2) {
    return NextResponse.json({ fired: false, reason: 'need-2-placed-lv4' });
  }

  // (2) 매칭되는 페어 추리기
  const eligible = INTERACTIONS.filter((it) => {
    const [a, b] = it.pairKey.split('+');
    return placedIds.has(a) && placedIds.has(b);
  });

  if (eligible.length === 0) {
    return NextResponse.json({ fired: false, reason: 'no-matching-pair' });
  }

  // (3) 최근 30분 이내 인터랙션 있었으면 쿨다운
  const now = Date.now();
  const since30mISO = new Date(now - COOLDOWN_MS).toISOString();
  const { count: recentCount } = await supabase
    .from('spirit_pair_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('fired_at', since30mISO);
  if ((recentCount ?? 0) > 0) {
    return NextResponse.json({ fired: false, reason: 'cooldown' });
  }

  // (4) 7일 이내 본 (pairKey, dialogueIndex) 조회
  const since7dISO = new Date(now - REPEAT_BLOCK_MS).toISOString();
  const { data: seenRows } = await supabase
    .from('spirit_pair_interactions')
    .select('pair_key, dialogue_index')
    .eq('user_id', user.id)
    .gte('fired_at', since7dISO);

  const seenSet = new Set(
    (seenRows ?? []).map((r) => `${r.pair_key}::${r.dialogue_index}`),
  );

  // (5) 안 본 다이얼로그 후보 풀
  type Candidate = {
    pairKey: string;
    dialogueIndex: number;
    a: { spiritId: string; name: string; line: string };
    b: { spiritId: string; name: string; line: string };
  };
  const candidates: Candidate[] = [];
  for (const it of eligible) {
    const [aId, bId] = it.pairKey.split('+');
    const aMaster = SPIRITS.find((s) => s.id === aId);
    const bMaster = SPIRITS.find((s) => s.id === bId);
    for (let i = 0; i < it.dialogues.length; i++) {
      if (seenSet.has(`${it.pairKey}::${i}`)) continue;
      const d = it.dialogues[i];
      candidates.push({
        pairKey: it.pairKey,
        dialogueIndex: i,
        a: { spiritId: aId, name: aMaster?.name ?? aId, line: d.a },
        b: { spiritId: bId, name: bMaster?.name ?? bId, line: d.b },
      });
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({ fired: false, reason: 'all-seen-recently' });
  }

  // (6) 랜덤 한 개 발화
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return NextResponse.json({
    fired: true,
    pairKey: chosen.pairKey,
    dialogueIndex: chosen.dialogueIndex,
    a: chosen.a,
    b: chosen.b,
  });
}
