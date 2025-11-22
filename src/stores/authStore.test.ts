import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "./authStore";

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
    it(
      "should set isLoading to false when fetch times out",
      async () => {
        // Mock a slow fetch that never resolves
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
          return new Promise(() => {
            // Never resolves - simulates hanging request
          });
        });

        const { initialize } = useAuthStore.getState();

        // Start initialization
        const initPromise = initialize();

        // Initially loading should be true
        expect(useAuthStore.getState().isLoading).toBe(true);

        // Fast-forward past the timeout (10 seconds)
        await vi.advanceTimersByTimeAsync(11000);

        // Wait for promise to settle
        await initPromise;

        // After timeout, loading should be false
        const state = useAuthStore.getState();
        expect(state.isLoading).toBe(false);
        expect(state.error).toContain("タイムアウト");
        expect(state.isAuthenticated).toBe(false);
      },
      15000
    );

    it("should set isLoading to false when fetch succeeds quickly", async () => {
      // Mock successful response
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            id: "test-user-id",
            email: "test@example.com",
          },
        }),
      } as Response);

      // Mock profile fetch
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
    });

    it("should handle network errors and set isLoading to false", async () => {
      // Mock network error
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error")
      );

      const { initialize } = useAuthStore.getState();

      await initialize();

      // After error, loading should be false
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeDefined();
      expect(state.isAuthenticated).toBe(false);
    });

    it(
      "should handle profile fetch timeout separately",
      async () => {
        // Mock successful session verification
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            authenticated: true,
            user: {
              id: "test-user-id",
              email: "test@example.com",
            },
          }),
        } as Response);

        // Mock slow profile fetch that times out
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
          return new Promise(() => {
            // Never resolves
          });
        });

        const { initialize } = useAuthStore.getState();

        // Start initialization
        const initPromise = initialize();

        // Fast-forward past the timeout
        await vi.advanceTimersByTimeAsync(11000);

        // Wait for promise to settle
        await initPromise;

        // Should still complete initialization even if profile fetch times out
        // The initialize should fall back to session-based user
        const state = useAuthStore.getState();
        expect(state.isLoading).toBe(false);
      },
      15000
    );
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
      await vi.advanceTimersByTimeAsync(11000);

      // Wait for promise to settle
      await initPromise;

      // Should handle timeout and set loading to false
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeDefined();
    });
  });

  describe("Loading State Management", () => {
    it(
      "should always set isLoading to false after initialize completes",
      async () => {
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

      for (const scenario of scenarios) {
        // Reset state
        useAuthStore.setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });

        global.fetch = scenario.fetch as typeof global.fetch;

        const { initialize } = useAuthStore.getState();

        await initialize();

        const state = useAuthStore.getState();
        expect(state.isLoading).toBe(false);
      }
    },
      15000
    );

    it(
      "should set isLoading to true when initialize starts",
      async () => {
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
      await initPromise;

      // Should no longer be loading
      expect(useAuthStore.getState().isLoading).toBe(false);
    },
      15000
    );
  });

  describe("Error Messages", () => {
    it(
      "should provide specific error message for request timeout",
      async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return new Promise(() => {
          // Never resolves
        });
      });

      const { initialize } = useAuthStore.getState();

      const initPromise = initialize();
      await vi.advanceTimersByTimeAsync(11000);
      await initPromise;

      const state = useAuthStore.getState();
      expect(state.error).toBe(
        "接続がタイムアウトしました。ネットワーク接続を確認してください。"
      );
    },
      15000
    );

    it("should provide specific error message for Supabase query timeout", async () => {
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
      await vi.advanceTimersByTimeAsync(11000);
      await initPromise;

      const state = useAuthStore.getState();
      expect(state.error).toBe("データベース接続がタイムアウトしました。");
    });
  });

  describe("Real-world Scenario: Session Expiry with Slow Network", () => {
    it(
      "should handle session expiry with slow network gracefully",
      async () => {
      // Simulate slow network that eventually times out
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return new Promise(() => {
          // Simulates hanging request during session expiry
        });
      });

      const { initialize } = useAuthStore.getState();

      // User has been idle for a while, session expired
      // User performs an action that triggers initialize()
      const initPromise = initialize();

      // Loading should be visible to user
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Network is slow, but after 10 seconds we timeout
      await vi.advanceTimersByTimeAsync(11000);
      await initPromise;

      // User should see error message, not eternal loading
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeDefined();
      expect(state.error).toContain("タイムアウト");
    },
      15000
    );
  });
});
