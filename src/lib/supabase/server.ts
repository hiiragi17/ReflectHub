import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  // 旧 get / set / remove API はチャンク分割されたセッション Cookie を
  // 壊すことがある (ランダムログアウトの原因) ため、@supabase/ssr の
  // 現行推奨である getAll / setAll を使う。
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component から呼ばれた場合、Cookie の書き込みはできない。
            // セッションのリフレッシュと Cookie 更新は middleware が担うため無視してよい。
          }
        },
      },
    }
  );
}

/**
 * Service-role クライアントを生成する。RLS をバイパスして DB へアクセスするため、
 * Cron ジョブやバッチ処理など、ユーザーセッションに紐づかない文脈でのみ使用する。
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Service role client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
