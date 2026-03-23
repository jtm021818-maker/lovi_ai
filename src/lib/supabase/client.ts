import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || !url.startsWith('http')) {
    // 빌드 타임이나 env 미설정 시 더미 클라이언트 방지
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }

  client = createBrowserClient(url, key);
  return client;
}
