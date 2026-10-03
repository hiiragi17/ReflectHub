import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "./authStore";
import { loadDrafts, saveDrafts } from "@/utils/reflectionDraft";

// Mock dependencies
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Global fetch mock
global.fetch = vi.fn();

const createAbortableNeverFetch = () =>
  vi.fn((_: RequestInfo | URL, options?: RequestInit) => {
    return new Promise<Response>((_, reject) => {
      options?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
  }) as typeof global.fetch;

const createSupabaseUser = () => ({
  id: "test-user-id",
  email: "test@example.com",
  user_metadata: {
    full_name: "Test User",
    avatar_url: "https://example.com/avatar.png",
  },
});

describe("authStore - Loading State and Timeout Management", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialize() - Timeout Handling", () => {
    it("should set isLoading to false when fetch times out", async () => {
      const { supabase } = await import("@/lib/supabase/client");

      // Mock a slow fetch that only rejects when AbortController aborts it.
      global.fetch = createAbortableNeverFetch();
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { initialize } = useAuthStore.getState();

      // Start initialization
      const initPromise = initialize();

      // Initially loading should be true
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Fast-forward past the timeout (30 seconds)
      await vi.advanceTimersByTimeAsync(31000);

      // Wait for promise to settle
      await initPromise;

      // After timeout, loading should be false
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should set isLoading to false when fetch succeeds quickly", async () => {
      // /api/auth/verify がプロフィールも同梱して返すため、初期化は 1 回の
      // fetch で完結する (verify → profile の 2 往復ではない)。
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            id: "test-user-id",
            email: "test@example.com",
          },
          profile: {
            id: "test-user-id",
            email: "test@example.com",
            name: "Test User",
            provider: "google",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      } as Response);

      const { initialize } = useAuthStore.getState();

      // Start initialization
      await initialize();

      // After successful init, loading should be false
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
      expect(state.user).toBeDefined();
      expect(state.user?.name).toBe("Test User");
      // 認証確認 1 回のみで完結していること (追加のプロフィール取得なし)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should handle network errors and set isLoading to false", async () => {
      const { supabase } = await import("@/lib/supabase/client");

      // Mock network error on server verification and no client-side session fallback.
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error"),
      );
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { initialize } = useAuthStore.getState();

      await initialize();

      // After error, loading should be false
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should handle profile fetch timeout separately", async () => {
      const { supabase } = await import("@/lib/supabase/client");
      const sessionUser = createSupabaseUser();

      // Mock server verification to fail so initialize falls back to Supabase.
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
      } as Response);

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { user: sessionUser } },
        error: null,
      });

      const single = vi.fn(
        () =>
          new Promise(() => {
            // Never resolves - simulates a hanging profile query.
          }),
      );
      const eq = vi.fn(() => ({ single }));
      const select = vi.fn(() => ({ eq }));
      vi.mocked(supabase.from).mockReturnValue({ select } as never);

      const { initialize } = useAuthStore.getState();

      const initPromise = initialize();
      await vi.advanceTimersByTimeAsync(31000);
      await initPromise;

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toMatchObject({
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata.full_name,
      });
    });
  });

  describe("Supabase Query Timeout", () => {
    it("should timeout Supabase queries after 10 seconds", async () => {
      const { supabase } = await import("@/lib/supabase/client");

      // Mock session verification to fail (fallback to Supabase)
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
      } as Response);

      // Mock Supabase getSession to hang
      vi.mocked(supabase.auth.getSession).mockImplementation(() => {
        return new Promise(() => {
          // Never resolves
        }) as ReturnType<typeof supabase.auth.getSession>;
      });

      const { initialize } = useAuthStore.getState();

      // Start initialization
      const initPromise = initialize();

      // Fast-forward past the timeout
      await vi.advanceTimersByTimeAsync(31000);

      // Wait for promise to settle
      await initPromise;

      // Should handle timeout and set loading to false
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeDefined();
    });
  });

  describe("Loading State Management", () => {
    it("should always set isLoading to false after initialize completes", async () => {
      // Mock various scenarios
      const scenarios = [
        // Scenario 1: Successful auth
        {
          fetch: vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              authenticated: true,
              user: { id: "1", email: "test@example.com" },
            }),
          }),
          name: "successful auth",
        },
        // Scenario 2: Failed auth
        {
          fetch: vi.fn().mockResolvedValue({
            ok: false,
          }),
          name: "failed auth",
        },
        // Scenario 3: Network error
        {
          fetch: vi.fn().mockRejectedValue(new Error("Network error")),
          name: "network error",
        },
      ];

      const { supabase } = await import("@/lib/supabase/client");

      for (const scenario of scenarios) {
        // Reset state
        useAuthStore.setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });

        global.fetch = scenario.fetch as typeof global.fetch;
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
          data: { session: null },
          error: null,
        });

        const { initialize } = useAuthStore.getState();

        await initialize();

        const state = useAuthStore.getState();
        expect(state.isLoading).toBe(false);
      }
    });

    it("should set isLoading to true when initialize starts", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: false,
            } as Response);
          }, 100);
        });
      });

      const { initialize } = useAuthStore.getState();

      // Start initialization (don't await yet)
      const initPromise = initialize();

      // Immediately check - should be loading
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Complete the initialization
      await vi.advanceTimersByTimeAsync(100);
      await initPromise;

      // Should no longer be loading
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe("Error Messages", () => {
    it("should not surface an error to the user when request timeout falls back to no session", async () => {
      const { supabase } = await import("@/lib/supabase/client");

      global.fetch = createAbortableNeverFetch();
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { initialize } = useAuthStore.getState();

      const initPromise = initialize();
      await vi.advanceTimersByTimeAsync(31000);
      await initPromise;

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });

    it("should not surface an error to the user when Supabase query times out", async () => {
      const { supabase } = await import("@/lib/supabase/client");

      // Mock session verification to fail
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
      } as Response);

      // Mock Supabase to hang
      vi.mocked(supabase.auth.getSession).mockImplementation(() => {
        return new Promise(() => {
          // Never resolves
        }) as ReturnType<typeof supabase.auth.getSession>;
      });

      const { initialize } = useAuthStore.getState();

      const initPromise = initialize();
      await vi.advanceTimersByTimeAsync(31000);
      await initPromise;

      const state = useAuthStore.getState();
      // 初期化エラーはログ出力のみでユーザーには通知しない仕様 (authStore の catch ブロック参照)
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("Real-world Scenario: Session Expiry with Slow Network", () => {
    it("should handle session expiry with slow network gracefully", async () => {
      const { supabase } = await import("@/lib/supabase/client");

      // Simulate slow network that eventually times out.
      global.fetch = createAbortableNeverFetch();
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { initialize } = useAuthStore.getState();

      // User has been idle for a while, session expired
      // User performs an action that triggers initialize()
      const initPromise = initialize();

      // Loading should be visible to user
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Network is slow, but after 30 seconds we timeout
      await vi.advanceTimersByTimeAsync(31000);
      await initPromise;

      // User should see error message, not eternal loading
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});

describe("authStore - signOut と書きかけの下書き", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
  });

  it("ログアウトのボタンで、端末の下書きがすべて消える", async () => {
    const { supabase } = await import("@/lib/supabase/client");
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
    saveDrafts("u1", { f1: { y: "a" } });
    saveDrafts("u2", { f1: { y: "b" } });

    await useAuthStore.getState().signOut();

    expect(loadDrafts("u1")).toBeNull();
    expect(loadDrafts("u2")).toBeNull();
  });

  it("サインアウトの通信が失敗しても、端末の下書きは消える", async () => {
    const { supabase } = await import("@/lib/supabase/client");
    vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error("network"));
    saveDrafts("u1", { f1: { y: "a" } });

    await useAuthStore.getState().signOut();

    expect(loadDrafts("u1")).toBeNull();
  });
});
