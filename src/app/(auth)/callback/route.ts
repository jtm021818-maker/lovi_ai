import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  // 이메일 인증 직접 링크 방식 (token_hash + type)
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  const hasAuth = code || (tokenHash && type);

  if (hasAuth) {
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
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    let authError = null;

    if (code) {
      // PKCE code flow (OAuth 로그인 또는 PKCE 이메일 인증)
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error('[Callback] exchangeCodeForSession 에러:', error.message, error.status);
      authError = error;
    } else if (tokenHash && type) {
      // token_hash flow (이메일 인증 직접 링크)
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      });
      if (error) console.error('[Callback] verifyOtp 에러:', error.message, error.status);
      authError = error;
    }

    if (!authError) {
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
        console.error('프로필 자동 생성 실패:', profileError);
      }

      return response;
    }
  }

  // 에러 시 welcome 페이지로
  return NextResponse.redirect(new URL('/welcome', request.url));
}
