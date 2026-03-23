import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function HomePage() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

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

        redirect('/onboarding');
      }

      if (profile.onboarding_completed) {
        redirect('/chat');
      } else {
        redirect('/onboarding');
      }
    }
  } catch (error: any) {
    // redirect()는 내부적으로 에러를 throw하므로 NEXT_REDIRECT는 다시 throw
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('[HomePage] Error:', error);
  }

  redirect('/welcome');
}
