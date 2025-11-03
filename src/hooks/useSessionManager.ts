"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";

export function useSessionManager() {
  const router = useRouter();
  const { initialize, signOut } = useAuthStore();

  // セッション変更の監視
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      switch (event) {
        case "INITIAL_SESSION":
          await initialize();
          break;

        case "SIGNED_IN":
          await initialize();
          break;

        case "SIGNED_OUT":
          await signOut();
          router.push("/auth");
          break;

        case "TOKEN_REFRESHED":
          // 新しいセッション情報でストアを更新
          await initialize();
          break;

        case "USER_UPDATED":
          await initialize();
          break;

        default:
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, [initialize, signOut, router]);

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
      await initialize();
      return true;
    }

    return false;
  }, [initialize]);

  return {
    checkSession,
    refreshSession,
  };
}
