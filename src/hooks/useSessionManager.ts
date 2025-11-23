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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // コールバック内で最新のストア関数を取得することで依存配列の問題を回避
      const { initialize, signOut } = useAuthStore.getState();

      switch (event) {
        case "INITIAL_SESSION":
        case "SIGNED_IN":
          // すでにユーザーが認証済みの場合は、不必要な初期化を避ける
          const currentState = useAuthStore.getState();

          // ユーザーが既に存在してローディング中でない場合は、初期化をスキップ
          if (currentState.user && !currentState.isLoading) {
            break;
          }

          // セッションが存在する場合、サーバー側にもセッションを確立
          if (session) {
            try {
              const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                }),
              });

              if (!response.ok) {
                console.error(`[SessionManager] Failed to sync session to server:`, response.status);
              }
            } catch (error) {
              console.error(`[SessionManager] Error syncing session to server:`, error);
            }
          }

          await initialize();
          break;

        case "SIGNED_OUT":
          await signOut();
          router.push("/auth");
          break;

        case "TOKEN_REFRESHED":
          // トークンリフレッシュは自動的に処理されるため、
          // ローディング状態を引き起こす初期化は不要
          break;

        case "USER_UPDATED":
          // ユーザー情報更新時も、ローディング状態を避けるため
          // フル初期化は行わない
          break;

        case "PASSWORD_RECOVERY":
          break;

        case "MFA_CHALLENGE_VERIFIED":
          await initialize();
          break;

        default:
          // セッションがないのに認証が必要な状態の場合、ログアウト処理
          if (!session) {
            await signOut();
            router.push("/auth");
          }
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
