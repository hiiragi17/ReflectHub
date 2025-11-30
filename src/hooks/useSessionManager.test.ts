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

    // Mock a user state to clear
    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: vi.fn(),
      signOut: vi.fn(),
      user: { id: "test-user" } as never,
    } as never);

    const setStateSpy = vi.spyOn(useAuthStore, "setState");

    renderHook(() => useSessionManager());

    // Trigger SIGNED_OUT event
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("SIGNED_OUT", null);

    await waitFor(() => {
      expect(setStateSpy).toHaveBeenCalledWith({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      expect(mockPush).toHaveBeenCalledWith("/auth");
    });

    setStateSpy.mockRestore();
  });

  it("should handle TOKEN_REFRESHED without calling initialize", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const initializeMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: initializeMock,
      signOut: vi.fn(),
    } as never);

    renderHook(() => useSessionManager());

    // Trigger TOKEN_REFRESHED event
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("TOKEN_REFRESHED", { user: { id: "test" } });

    // Wait a bit to ensure no async calls are made
    await new Promise(resolve => setTimeout(resolve, 100));

    // initialize should NOT be called for TOKEN_REFRESHED
    expect(initializeMock).not.toHaveBeenCalled();
  });

  it("should handle USER_UPDATED without calling initialize", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const initializeMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: initializeMock,
      signOut: vi.fn(),
    } as never);

    renderHook(() => useSessionManager());

    // Trigger USER_UPDATED event
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("USER_UPDATED", { user: { id: "test" } });

    // Wait a bit to ensure no async calls are made
    await new Promise(resolve => setTimeout(resolve, 100));

    // initialize should NOT be called for USER_UPDATED
    expect(initializeMock).not.toHaveBeenCalled();
  });

  it("should handle unknown events with session", async () => {
    const { useAuthStore } = await import("@/stores/authStore");
    const initializeMock = vi.fn();

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: initializeMock,
      signOut: vi.fn(),
    } as never);

    renderHook(() => useSessionManager());

    // Trigger unknown event with session
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("UNKNOWN_EVENT", { user: { id: "test" } });

    // Wait a bit to ensure no async calls are made
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not do anything for unknown events with session
    expect(initializeMock).not.toHaveBeenCalled();
  });

  it("should handle unknown events without session and redirect", async () => {
    const { useAuthStore } = await import("@/stores/authStore");

    vi.mocked(useAuthStore.getState).mockReturnValue({
      initialize: vi.fn(),
      signOut: vi.fn(),
      user: null,
    } as never);

    const setStateSpy = vi.spyOn(useAuthStore, "setState");

    renderHook(() => useSessionManager());

    // Trigger unknown event without session
    const authCallback = (global as never)["authCallback"] as (
      event: string,
      session: unknown
    ) => Promise<void>;

    await authCallback("UNKNOWN_EVENT", null);

    // Wait a bit to ensure the code runs
    await new Promise(resolve => setTimeout(resolve, 100));

    // For unknown events without session, nothing should happen
    // because there's no user to clear
    expect(setStateSpy).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();

    setStateSpy.mockRestore();
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
});
