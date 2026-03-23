import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 세션 성공 후, 유저 프로필이 없으면 자동 생성 (트리거 실패 대비 폴백)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          if (!profile) {
            const nickname =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              '익명';

            await supabase
              .from('user_profiles')
              .insert({ id: user.id, nickname });
          }
        }
      } catch (profileError) {
        // 프로필 생성 실패해도 로그인 자체는 차단하지 않음
        console.error('프로필 자동 생성 실패:', profileError);
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // 에러 시 welcome 페이지로
  return NextResponse.redirect(new URL('/welcome', request.url));
}
