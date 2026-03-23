import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 인증이 필요한 경로들
const PROTECTED_PATHS = ['/chat', '/insights', '/journal', '/settings', '/onboarding'];
// 로그인 상태에서 접근 시 리다이렉트할 경로들
const AUTH_PATHS = ['/welcome', '/login', '/signup'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
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
              request.cookies.set(name, value);
              response = NextResponse.next({
                request: { headers: request.headers },
              });
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;

    // 보호 경로 접근 시 비로그인 → /welcome
    if (PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
      if (!user) {
        return NextResponse.redirect(new URL('/welcome', request.url));
      }
    }

    // 로그인 상태에서 인증 페이지 접근 → /chat 또는 /onboarding
    if (AUTH_PATHS.some(p => pathname === p)) {
      if (user) {
        let { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        // 프로필이 없으면 자동 생성 (트리거 실패 대비)
        if (!profile) {
          const nickname =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            '익명';

          await supabase
            .from('user_profiles')
            .upsert({ id: user.id, nickname }, { onConflict: 'id' });

          // 새로 생성된 프로필 → 온보딩 미완료 상태
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }

        if (profile.onboarding_completed) {
          return NextResponse.redirect(new URL('/chat', request.url));
        } else {
          return NextResponse.redirect(new URL('/onboarding', request.url));
        }
      }
    }
  } catch (error) {
    console.error('[Proxy] Error:', error);
    // 에러 발생 시 그냥 통과
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|api).*)',
  ],
};

