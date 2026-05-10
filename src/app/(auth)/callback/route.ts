import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    /**
     * ⚠️ 중요: redirect response를 먼저 생성하고, 쿠키를 해당 response에 직접 심어야 함.
     * NextResponse.redirect()는 새 Response 객체이므로 cookies().set()으로 심은 세션 쿠키가
     * redirect에 포함되지 않는 문제가 있음. 이 패턴이 Supabase SSR 정석.
     */
    const redirectUrl = new URL(next, request.url);
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // redirect response에 직접 세션 쿠키를 심음
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

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

      // 세션 쿠키가 심어진 redirect response 반환
      return response;
    }
  }

  // 에러 시 welcome 페이지로
  return NextResponse.redirect(new URL('/welcome', request.url));
}
