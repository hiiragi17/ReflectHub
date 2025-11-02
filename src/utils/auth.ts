import { createBrowserClient } from "@supabase/ssr";

function validateRedirectUrl(redirectUrl: string): string {
  const urlLower = redirectUrl.toLowerCase().trim();

  if (
    urlLower.startsWith("http://") ||
    urlLower.startsWith("https://") ||
    urlLower.startsWith("//") ||
    urlLower.startsWith("javascript:") ||
    urlLower.startsWith("data:") ||
    urlLower.startsWith("vbscript:") ||
    urlLower.startsWith("file:") ||
    redirectUrl.startsWith("\\")
  ) {
    console.warn("External or unsafe redirect prevented, using default");
    return "/";
  }

  return redirectUrl;
}

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createBrowserClient(url, anonKey);
}

export async function logoutUser(redirectUrl: string = "/") {
  try {
    const supabase = getSupabaseClient();

    // Validate that redirectUrl is a safe relative path
    redirectUrl = validateRedirectUrl(redirectUrl);

    // Supabase からログアウト
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("ログアウトエラー:", error);
      throw error;
    }

    // ログアウト成功後、指定の URL にリダイレクト
    window.location.href = redirectUrl;
  } catch (error) {
    console.error("ログアウト処理でエラーが発生:", error);
    // エラーが発生しても / にリダイレクト
    window.location.href = "/";
  }
}

export async function logoutUserAsync(redirectUrl: string = "/") {
  try {
    const supabase = getSupabaseClient();

    // Validate that redirectUrl is a safe relative path
    redirectUrl = validateRedirectUrl(redirectUrl);

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    return redirectUrl;
  } catch (error) {
    console.error("ログアウト処理でエラーが発生:", error);
    throw error;
  }
}

export async function getCurrentSession() {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("セッション取得エラー:", error);
      return null;
    }

    return session;
  } catch (error) {
    console.error("セッション取得処理でエラーが発生:", error);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const session = await getCurrentSession();
    return session?.user || null;
  } catch (error) {
    console.error("ユーザー情報取得でエラーが発生:", error);
    return null;
  }
}