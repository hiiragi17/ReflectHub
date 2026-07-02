import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { SessionProvider } from "./SessionProvider";

// Mock dependencies
vi.mock("@/hooks/useSessionManager", () => ({
  useSessionManager: vi.fn(() => ({
    checkSession: vi.fn(),
    refreshSession: vi.fn(),
  })),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      initialize: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      refreshSession: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

describe("SessionProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render children", () => {
    const { getByText } = render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>
    );

    expect(getByText("Test Child")).toBeInTheDocument();
  });

  it("should not set up a custom refresh interval (token refresh is delegated to supabase-js)", async () => {
    vi.useFakeTimers();
    const { supabase } = await import("@/lib/supabase/client");

    render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>
    );

    // 独自インターバルが残っていれば 1 分ごとに refreshSession/getSession が
    // 呼ばれるはず。10 分進めても一切呼ばれないことを確認する。
    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
    expect(supabase.auth.getSession).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("should not initialize auth state directly", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const initializeMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: initializeMock,
    } as never);

    const { rerender } = render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>
    );

    await waitFor(() => {
      // SessionProvider should not call initialize directly
      // It's handled by useSessionManager's INITIAL_SESSION event
      expect(initializeMock).toHaveBeenCalledTimes(0);
    });

    // Rerender should still not call initialize
    rerender(
      <SessionProvider>
        <div>Test Child Updated</div>
      </SessionProvider>
    );

    // Still not called
    expect(initializeMock).toHaveBeenCalledTimes(0);
  });
});
