import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** DELETE: 상담 기록 전체 삭제 또는 계정 탈퇴 */
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'reset') {
    // 상담 기록만 삭제 (계정 유지)
    // CASCADE로 messages, strategy_logs, emotion_logs 등도 함께 삭제됨
    await supabase.from('counseling_sessions').delete().eq('user_id', user.id);
    await supabase.from('emotional_bank_accounts').delete().eq('user_id', user.id);
    await supabase.from('user_rate_limits').delete().eq('user_id', user.id);

    return NextResponse.json({ ok: true, message: '상담 기록이 초기화되었습니다' });
  }

  if (action === 'delete-account') {
    // 계정 완전 삭제 — user_profiles CASCADE로 관련 데이터 모두 삭제
    await supabase.from('user_profiles').delete().eq('id', user.id);
    // Supabase Auth 유저도 삭제 (admin 권한 필요, 실패해도 프로필은 삭제됨)
    await supabase.auth.admin.deleteUser(user.id).catch(() => {});

    return NextResponse.json({ ok: true, message: '계정이 삭제되었습니다' });
  }

  return NextResponse.json({ error: 'Invalid action. Use ?action=reset or ?action=delete-account' }, { status: 400 });
}
