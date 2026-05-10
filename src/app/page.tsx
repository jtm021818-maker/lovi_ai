import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function HomePage() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('[HomePage] user:', user?.id ?? 'null', '| error:', userError?.message ?? 'none');

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      console.log('[HomePage] profile:', profile ? JSON.stringify(profile) : 'null', '| error:', profileError?.message ?? 'none');

      // 프로필이 없으면 자동 생성 (트리거 실패 대비)
      if (!profile) {
        const nickname =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          '익명';

        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert({ id: user.id, nickname }, { onConflict: 'id' });

        console.log('[HomePage] upsert result:', upsertError ? upsertError.message : 'ok', '→ /onboarding');
        redirect('/onboarding');
      }

      if (profile.onboarding_completed) {
        console.log('[HomePage] → /chat');
        redirect('/chat');
      } else {
        console.log('[HomePage] → /onboarding');
        redirect('/onboarding');
      }
    }
  } catch (error: any) {
    // redirect()는 내부적으로 에러를 throw하므로 NEXT_REDIRECT는 다시 throw
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('[HomePage] catch error:', error);
  }

  console.log('[HomePage] → /welcome (no user)');
  redirect('/welcome');
}
