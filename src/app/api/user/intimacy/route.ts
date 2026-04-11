/**
 * 🆕 v41.1: GET /api/user/intimacy — 페르소나별 친밀도 조회
 *
 * 쿼리 파라미터:
 *   - ?persona=luna  → 루나 친밀도만
 *   - ?persona=tarot → 타로냥 친밀도만
 *   - (없음)         → 둘 다 반환 (설정 페이지용)
 *
 * 응답:
 *   persona 지정: { raw: IntimacyState, derived: IntimacyDerivedInfo }
 *   persona 없음: { luna: {raw, derived}, tarot: {raw, derived} }
 *
 * 특징:
 *   - 서버 시간 기준 감쇠 미리 적용 (UI에 현재 시점 반영)
 *   - 데이터 없으면 기본값
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  applyDecay,
  computeDerived,
  createDefaultIntimacyState,
  type IntimacyState,
} from '@/engines/intimacy';

type PersonaKey = 'luna' | 'tarot';

/**
 * intimacy 원시 데이터 → 항상 split 구조로 정규화
 * (구 버전: 단일 IntimacyState, 신 버전: {luna, tarot})
 */
function normalizeIntimacyShape(raw: any): { luna: IntimacyState; tarot: IntimacyState } {
  if (raw && typeof raw === 'object' && 'luna' in raw && 'tarot' in raw) {
    return {
      luna: raw.luna ?? createDefaultIntimacyState(),
      tarot: raw.tarot ?? createDefaultIntimacyState(),
    };
  }
  // 구 단일 IntimacyState → luna로, tarot은 기본값
  if (raw && typeof raw === 'object' && 'dimensions' in raw) {
    return {
      luna: raw,
      tarot: createDefaultIntimacyState(),
    };
  }
  return {
    luna: createDefaultIntimacyState(),
    tarot: createDefaultIntimacyState(),
  };
}

function buildPersonaPayload(state: IntimacyState) {
  const { state: decayed } = applyDecay(state);
  return {
    raw: decayed,
    derived: computeDerived(decayed),
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const personaParam = url.searchParams.get('persona');
  const requestedPersona: PersonaKey | null =
    personaParam === 'luna' || personaParam === 'tarot' ? personaParam : null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_model')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userModel = (data?.user_model as any) ?? {};
    const shape = normalizeIntimacyShape(userModel.intimacy);

    // 단일 페르소나 요청
    if (requestedPersona) {
      return NextResponse.json(buildPersonaPayload(shape[requestedPersona]));
    }

    // 둘 다 반환 (기본)
    return NextResponse.json({
      luna: buildPersonaPayload(shape.luna),
      tarot: buildPersonaPayload(shape.tarot),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || 'Unknown error' },
      { status: 500 },
    );
  }
}
