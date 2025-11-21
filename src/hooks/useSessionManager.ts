"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export function useSessionManager() {
  const router = useRouter();

  // セッション変更の監視
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      // コールバック内で最新のストア関数を取得することで依存配列の問題を回避
      const { initialize, signOut } = useAuthStore.getState();

      switch (event) {
        case "SIGNED_IN":
          await initialize();
          break;

        case "SIGNED_OUT":
          await signOut();
          router.push("/auth");
          break;

        case "TOKEN_REFRESHED":
          // トークンリフレッシュは自動的に処理されるため、
          // ローディング状態を引き起こす初期化は不要
          console.log("Token refreshed");
          break;

        case "USER_UPDATED":
          // ユーザー情報更新時も、ローディング状態を避けるため
          // フル初期化は行わない
          console.log("User updated");
          break;

        default:
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // 手動セッション確認
  const checkSession = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Session check error:", error);
      return null;
    }

    return session;
  }, []);

  // セッション強制リフレッシュ
  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("Session refresh error:", error);
      return false;
    }

    if (data.session) {
      // 最新のストア関数を取得
      const { initialize } = useAuthStore.getState();
      await initialize();
      return true;
    }

    return false;
  }, []);

  return {
    checkSession,
    refreshSession,
  };
}
