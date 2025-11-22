import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSessionManager } from "./useSessionManager";

// Mock dependencies
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        // Store the callback for manual triggering in tests
        (global as never)["authCallback"] = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      initialize: vi.fn(),
      signOut: vi.fn(),
    })),
  },
}));

describe("useSessionManager - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as never)["authCallback"];
  });

  it("should handle SIGNED_OUT event and redirect to auth", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const signOutMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: vi.fn(),
      signOut: signOutMock,
    } as never);

    renderHook(() => useSessionManager());

    // Trigger SIGNED_OUT event
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("SIGNED_OUT", null);

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/auth");
    });
  });

  it("should handle TOKEN_REFRESHED without calling initialize", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const initializeMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: initializeMock,
      signOut: vi.fn(),
    } as never);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    renderHook(() => useSessionManager());

    // Trigger TOKEN_REFRESHED event
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("TOKEN_REFRESHED", { user: { id: "test" } });

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith("Token refreshed successfully");
    });

    // initialize should NOT be called for TOKEN_REFRESHED
    expect(initializeMock).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });

  it("should handle USER_UPDATED without calling initialize", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const initializeMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: initializeMock,
      signOut: vi.fn(),
    } as never);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    renderHook(() => useSessionManager());

    // Trigger USER_UPDATED event
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("USER_UPDATED", { user: { id: "test" } });

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith("User updated");
    });

    // initialize should NOT be called for USER_UPDATED
    expect(initializeMock).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });

  it("should handle unknown events with session", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const signOutMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: vi.fn(),
      signOut: signOutMock,
    } as never);

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderHook(() => useSessionManager());

    // Trigger unknown event with session
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("UNKNOWN_EVENT", { user: { id: "test" } });

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Unhandled auth event:",
        "UNKNOWN_EVENT"
      );
    });

    // Should not sign out if session exists
    expect(signOutMock).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should handle unknown events without session and redirect", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const signOutMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: vi.fn(),
      signOut: signOutMock,
    } as never);

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    renderHook(() => useSessionManager());

    // Trigger unknown event without session
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("UNKNOWN_EVENT", null);

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Unhandled auth event:",
        "UNKNOWN_EVENT"
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "No session found, redirecting to auth"
      );
    });

    // Should sign out and redirect if no session
    expect(signOutMock).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/auth");

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("should handle MFA_CHALLENGE_VERIFIED and call initialize", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const initializeMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: initializeMock,
      signOut: vi.fn(),
    } as never);

    renderHook(() => useSessionManager());

    // Trigger MFA_CHALLENGE_VERIFIED event
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("MFA_CHALLENGE_VERIFIED", { user: { id: "test" } });

    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalled();
    });
  });

  it("should log auth state changes", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    renderHook(() => useSessionManager());

    // Trigger event with session
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("TOKEN_REFRESHED", { user: { id: "test" } });

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Auth state change:",
        "TOKEN_REFRESHED",
        "session exists"
      );
    });

    consoleLogSpy.mockRestore();
  });
});
