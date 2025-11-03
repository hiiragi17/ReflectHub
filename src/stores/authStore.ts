import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase/client";
import type {
  User,
  AuthState,
  AuthActions,
  SupabaseUser,
  ProfileData,
} from "@/types/auth";

interface AuthStore extends AuthState, AuthActions {}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初期状態
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      // Google認証
      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });

        try {
          // 既存のセッションを確認

          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
              // Authorization Code Flow を明示的に指定
              queryParams: {
                response_type: "code",
                flow_type: "pkce", // PKCE (Proof Key for Code Exchange) を使用
              },
              // 追加のオプション
              skipBrowserRedirect: false, // ブラウザリダイレクトを確実に実行
            },
          });

          if (error) {
            console.error("Google OAuth error:", error);
            set({
              error: "Googleログインに失敗しました。もう一度お試しください。",
              isLoading: false,
            });
          } else {
          }
        } catch (error) {
          console.error("Google sign in error:", error);
          set({
            error: "予期しないエラーが発生しました。",
            isLoading: false,
          });
        }
      },

      // ログアウト
      signOut: async () => {
        set({ isLoading: true });

        try {
          // Supabase認証のサインアウト
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error("Signout error:", error);
          }

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error("Sign out error:", error);
          set({
            error: "ログアウトに失敗しました。",
            isLoading: false,
          });
        }
      },

      // デフォルトプロフィール作成
      createDefaultProfile: async (
        sessionUser: SupabaseUser
      ): Promise<ProfileData | null> => {
        try {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: sessionUser.id,
              email: sessionUser.email || null,
              name:
                sessionUser.user_metadata?.full_name ||
                sessionUser.user_metadata?.name ||
                "ユーザー",
              provider: "google",
              avatar_url: sessionUser.user_metadata?.avatar_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            console.error("Profile creation error:", createError);
            set({
              error: "プロフィールの作成に失敗しました。",
              isLoading: false,
            });
            return null;
          }
          return newProfile as ProfileData;
        } catch (error) {
          console.error("Unexpected error creating profile:", error);
          set({
            error: "プロフィールの作成中に予期しないエラーが発生しました。",
            isLoading: false,
          });
          return null;
        }
      },

      // 初期化（アプリ起動時の認証状態復元）
      initialize: async () => {
        set({ isLoading: true });

        try {
          // サーバーサイドのセッション状態を確認
          const serverSessionResponse = await fetch("/api/auth/verify", {
            method: "GET",
            credentials: "include",
          });

          if (serverSessionResponse.ok) {
            const serverSession = await serverSessionResponse.json();

            if (serverSession.authenticated) {
              // サーバーサイドにセッションがある場合、プロフィール情報を取得
              try {
                const profileResponse = await fetch(
                  `/api/auth/profile/${serverSession.user.id}`,
                  {
                    method: "GET",
                    credentials: "include",
                  }
                );

                if (profileResponse.ok) {
                  const profileData = await profileResponse.json();

                  if (profileData.profile) {
                    const user: User = {
                      id: profileData.profile.id,
                      email: profileData.profile.email,
                      name: profileData.profile.name,
                      provider: profileData.profile.provider,
                      avatar_url: profileData.profile.avatar_url,
                      line_user_id: profileData.profile.line_user_id,
                      created_at: profileData.profile.created_at,
                      updated_at: profileData.profile.updated_at,
                    };

                    set({
                      user,
                      isAuthenticated: true,
                      isLoading: false,
                    });
                    return;
                  }
                }
              } catch (profileError) {
                // プロフィール取得エラーは続行
              }

              // プロフィール取得に失敗した場合、最小限のユーザー情報で設定
              const user: User = {
                id: serverSession.user.id,
                email: serverSession.user.email,
                name: serverSession.user.email?.split("@")[0] || "ユーザー",
                provider: "google",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }

          // サーバーサイドにセッションがない場合、クライアントサイドも確認
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (profile) {
              const user: User = {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                provider: profile.provider,
                avatar_url: profile.avatar_url,
                line_user_id: profile.line_user_id,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              const { createDefaultProfile } = get();
              const newProfile = await createDefaultProfile(
                session.user as SupabaseUser
              );

              if (newProfile) {
                const user: User = {
                  id: newProfile.id,
                  email: newProfile.email,
                  name: newProfile.name,
                  provider: newProfile.provider as "google" | "line",
                  avatar_url: newProfile.avatar_url,
                  line_user_id: newProfile.line_user_id,
                  created_at: newProfile.created_at,
                  updated_at: newProfile.updated_at,
                };

                set({
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                });
              }
            }
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: "初期化に失敗しました。",
            isLoading: false,
          });
        }
      },

      // エラークリア
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "auth-store",
      partialize: () => ({
        // ゲスト機能削除により永続化対象なし
      }),
    }
  )
);
