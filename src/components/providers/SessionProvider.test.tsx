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

vi.mock("@/utils/sessionUtils", () => ({
  SessionUtils: {
    setupAutoRefresh: vi.fn(() => vi.fn()), // Returns cleanup function
  },
}));

describe("SessionProvider - Auto Refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should setup auto refresh on mount", async () => {
    const { SessionUtils } = await import("@/utils/sessionUtils");

    render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>
    );

    await waitFor(() => {
      expect(SessionUtils.setupAutoRefresh).toHaveBeenCalledWith(5);
    });
  });

  it("should cleanup auto refresh on unmount", async () => {
    const { SessionUtils } = await import("@/utils/sessionUtils");
    const cleanupFn = vi.fn();

    vi.mocked(SessionUtils.setupAutoRefresh).mockReturnValue(cleanupFn);

    const { unmount } = render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>
    );

    // Verify setup was called
    await waitFor(() => {
      expect(SessionUtils.setupAutoRefresh).toHaveBeenCalled();
    });

    // Unmount and verify cleanup
    unmount();

    await waitFor(() => {
      expect(cleanupFn).toHaveBeenCalled();
    });
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

  it("should call setupAutoRefresh with correct parameters", async () => {
    const { SessionUtils } = await import("@/utils/sessionUtils");

    render(
      <SessionProvider>
        <div>Test Child</div>
      </SessionProvider>
    );

    await waitFor(() => {
      expect(SessionUtils.setupAutoRefresh).toHaveBeenCalledWith(5);
    });

    // Verify it's called with 5 minutes before expiry
    const calls = vi.mocked(SessionUtils.setupAutoRefresh).mock.calls;
    expect(calls[0][0]).toBe(5);
  });
});
