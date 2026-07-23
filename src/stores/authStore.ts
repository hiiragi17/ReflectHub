import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/apiClient";
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
        set({ isLoading: true });

        try {
          // サーバー側のセッションもクリア
          try {
            await apiFetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include',
            });
          } catch (logoutError) {
            console.error('Server logout error:', logoutError);
            // サーバー側のログアウトが失敗してもクライアント側のログアウトは続行
          }

          // この端末のセッションのみ破棄する。scope: 'global' だと全デバイスの
          // リフレッシュトークンが失効し、iOS では Safari と PWA が別セッション
          // のため「ブラウザでログアウトしたら PWA も切れる」挙動になる。
          const { error } = await supabase.auth.signOut({ scope: 'local' });
          if (error) {
            console.error("Signout error:", error);
          }

          // ローカルストレージを明示的にクリア
          try {
            // Supabaseのセッション情報をクリア
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
              }
            });
          } catch (storageError) {
            console.error('LocalStorage clear error:', storageError);
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

          // /api/auth/verify への到達失敗 (オフライン・回線断・タイムアウト) を
          // 「未ログイン」と混同しない。PWA の起動直後は回線が不安定なことが
          // 多く、ここで throw するとセッションが生きていても認証画面へ
          // 飛ばされてしまう。失敗時はクライアント側 (cookie) のセッション
          // 確認へフォールバックする。
          let serverSessionResponse: Response | null = null;
          try {
            serverSessionResponse = await fetchWithTimeout(
              "/api/auth/verify",
              {
                method: "GET",
                credentials: "include",
              },
              30000
            );
          } catch (verifyError) {
            console.error("[AuthStore] Session verify request failed:", verifyError);
          }

          if (serverSessionResponse?.ok) {
            const serverSession = await serverSessionResponse.json();

            if (serverSession.authenticated) {
              // /api/auth/verify がプロフィールも同梱して返すため、以前の
              // ように /api/auth/profile/{id} を追加で叩く必要はない
              // (verify → profile の 2 往復を 1 往復に短縮)。プロフィールが
              // 取得できなかった場合は下の session.user 情報でフォールバック。
              const serverProfile = serverSession.profile;
              if (serverProfile) {
                const user: User = {
                  id: serverProfile.id,
                  email: serverProfile.email,
                  name: serverProfile.name,
                  provider: serverProfile.provider,
                  avatar_url: serverProfile.avatar_url,
                  line_user_id: serverProfile.line_user_id,
                  created_at: serverProfile.created_at,
                  updated_at: serverProfile.updated_at,
                };

                set({
                  user,
                  isAuthenticated: true,
                  isLoading: false,
                  error: null,
                });
                return;
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

            // プロフィール取得の失敗は致命的ではない。セッションが有効なら
            // session.user の情報でフォールバックし、ログイン状態を維持する
            // (サーバー経由の経路と同じ扱い)。
            let profileResult: {
              data: ProfileData | null;
              error: { code?: string } | null;
            } | null = null;
            try {
              profileResult = await timeoutPromise(
                profileQuery as unknown as Promise<{
                  data: ProfileData | null;
                  error: { code?: string } | null;
                }>,
                30000
              );
            } catch (profileError) {
              console.error('[AuthStore] Profile query failed:', profileError);
            }

            // Supabase クエリは失敗しても throw せず { data: null, error } で
            // 解決する。読み取りエラーを「プロフィール未作成 (PGRST116 = 0 行)」
            // と混同して createDefaultProfile へ進むと、既存プロフィールと
            // 衝突して作成にも失敗し、有効なセッションがあるのに未ログイン
            // 扱いになってしまう。読み取り失敗時はセッション情報で継続する。
            if (
              !profileResult ||
              (profileResult.error != null && profileResult.error.code !== 'PGRST116')
            ) {
              const sessionUser = session.user as SupabaseUser;
              const user: User = {
                id: sessionUser.id,
                email: sessionUser.email || '',
                name:
                  sessionUser.user_metadata?.full_name ||
                  sessionUser.user_metadata?.name ||
                  sessionUser.email?.split('@')[0] ||
                  'ユーザー',
                provider: 'google',
                avatar_url: sessionUser.user_metadata?.avatar_url,
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
          // 初期化エラーは内部的にログ出力するのみで、ユーザーには通知しない
          set({
            user: null,
            isAuthenticated: false,
            error: null,
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
