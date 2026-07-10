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

describe("SessionProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it("should not set up a custom refresh interval (token refresh is delegated to supabase-js)", () => {
    vi.useFakeTimers();
    // useSessionManager をモックしているため supabase の呼び出しでは検知できない。
    // インターバル登録そのものを監視する。
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>
    );

    expect(setIntervalSpy).not.toHaveBeenCalled();
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
