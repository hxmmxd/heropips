import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // During build/prerender, env vars may not exist — return a safe no-op client
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  return createBrowserClient(url, key);
}
