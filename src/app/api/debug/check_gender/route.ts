import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('user_profiles').select('gender').limit(1);

  return NextResponse.json({
    data,
    error,
  });
}
