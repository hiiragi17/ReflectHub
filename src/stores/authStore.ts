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
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) {
            set({
              error: "Googleログインに失敗しました。もう一度お試しください。",
              isLoading: false,
            });
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
          // Supabase認証状態チェック
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.error("Session error:", error);
            set({
              error: "セッションの取得に失敗しました。",
              isLoading: false,
            });
            return;
          }

          if (session?.user) {
            // プロフィール情報を取得（エラーハンドリング付き）
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (profileError && profileError.code !== "PGRST116") {
              // PGRST116 は "レコードが見つからない" エラー - 下で処理
              console.error("Profile fetch error:", profileError);
              set({
                error: "プロフィールの取得に失敗しました。",
                isLoading: false,
              });
              return;
            }

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
                provider: profile.provider,
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              // プロフィールが見つからない場合：新規ユーザーとしてデフォルトプロフィール作成
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
              } else {
                // プロフィール作成に失敗した場合のみサインアウト
                await supabase.auth.signOut();
                set({
                  user: null,
                  isAuthenticated: false,
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
          console.error("Initialize error:", error);
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
