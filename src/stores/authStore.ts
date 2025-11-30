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
      user: null,
      isLoading: true, // 初期化完了まで待機
      isAuthenticated: false,
      error: null,

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
              queryParams: {
                response_type: "code",
                flow_type: "pkce",
              },
              skipBrowserRedirect: false,
            },
          });

          if (error) {
            console.error("Google OAuth error:", error);
            set({
              error: "Googleログインに失敗しました。もう一度お試しください。",
              isLoading: false,
            });
          }
          // Note: 成功時はリダイレクトするため、isLoadingはリセットしない
        } catch (error) {
          console.error("Google sign in error:", error);
          set({
            error: "予期しないエラーが発生しました。",
            isLoading: false,
          });
        }
      },

      signOut: async () => {
        console.log('[AuthStore] signOut called');
        set({ isLoading: true });

        try {
          console.log('[AuthStore] Calling supabase.auth.signOut()');
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error("Signout error:", error);
          } else {
            console.log('[AuthStore] Supabase signOut successful');
          }

          console.log('[AuthStore] Clearing user state');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          console.log('[AuthStore] User state cleared');
        } catch (error) {
          console.error("Sign out error:", error);
          set({
            error: "ログアウトに失敗しました。",
            isLoading: false,
          });
        }
      },

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
            // Note: isLoadingは呼び出し元で制御する
            return null;
          }
          return newProfile as ProfileData;
        } catch (error) {
          console.error("Unexpected error creating profile:", error);
          // Note: isLoadingは呼び出し元で制御する
          return null;
        }
      },

      initialize: async () => {
        // すでに初期化中の場合は、重複した呼び出しを防ぐ
        // ただし、初期状態（user === null && isLoading === true）の場合は初回実行を許可
        const currentState = get();
        if (currentState.isLoading && currentState.user !== null) {
          return;
        }

        set({ isLoading: true });

        try {
          // タイムアウト付きfetchヘルパー関数
          const fetchWithTimeout = async (
            url: string,
            options: RequestInit,
            timeoutMs = 30000
          ): Promise<Response> => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
              const response = await fetch(url, {
                ...options,
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              return response;
            } catch (error) {
              clearTimeout(timeoutId);
              if (error instanceof Error && error.name === "AbortError") {
                throw new Error("Request timeout");
              }
              throw error;
            }
          };

          const serverSessionResponse = await fetchWithTimeout(
            "/api/auth/verify",
            {
              method: "GET",
              credentials: "include",
            },
            30000
          );

          if (serverSessionResponse.ok) {
            const serverSession = await serverSessionResponse.json();

            if (serverSession.authenticated) {
              try {
                const profileResponse = await fetchWithTimeout(
                  `/api/auth/profile/${serverSession.user.id}`,
                  {
                    method: "GET",
                    credentials: "include",
                  },
                  30000
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
                      error: null,
                    });
                    return;
                  }
                }
              } catch (profileError) {
                // Profile check error is non-critical
                console.error("Profile fetch error:", profileError);
              }

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
                error: null,
              });
              return;
            }
          }
          // Supabaseクエリにタイムアウトを追加
          const timeoutPromise = <T>(
            promise: Promise<T>,
            timeoutMs: number
          ): Promise<T> => {
            return Promise.race([
              promise,
              new Promise<T>((_, reject) =>
                setTimeout(
                  () => reject(new Error("Supabase query timeout")),
                  timeoutMs
                )
              ),
            ]);
          };

          let supabaseSessionResult;
          try {
            supabaseSessionResult = await timeoutPromise(supabase.auth.getSession(), 30000);
          } catch (sessionError) {
            console.error('[AuthStore] Supabase session query failed:', sessionError);
            throw sessionError;
          }

          const {
            data: { session },
          } = supabaseSessionResult;

          if (session?.user) {
            const profileQuery = supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            let profileResult;
            try {
              profileResult = await timeoutPromise(
                profileQuery as unknown as Promise<{ data: ProfileData | null }>,
                30000
              );
            } catch (profileError) {
              console.error('[AuthStore] Profile query failed:', profileError);
              throw profileError;
            }

            const { data: profile } = profileResult;

            if (profile) {
              const user: User = {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                provider: profile.provider as "google" | "line",
                avatar_url: profile.avatar_url,
                line_user_id: profile.line_user_id,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
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
                  error: null,
                });
              } else {
                // プロファイル作成に失敗した場合
                console.error('[AuthStore] Profile creation failed');
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  error: "プロフィールの作成に失敗しました。",
                });
              }
            }
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          console.error("[AuthStore] Initialize error:", error);
          const errorMessage =
            error instanceof Error && error.message === "Request timeout"
              ? "接続がタイムアウトしました。ネットワーク接続を確認してください。"
              : error instanceof Error &&
                error.message === "Supabase query timeout"
              ? "データベース接続がタイムアウトしました。"
              : "初期化に失敗しました。";

          set({
            user: null,
            isAuthenticated: false,
            error: errorMessage,
            isLoading: false,
          });
        }
      },
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "auth-store",
      partialize: () => ({
      }),
    }
  )
);
