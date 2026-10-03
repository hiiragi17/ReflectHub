import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const create = vi.fn();
const capture = vi.fn();
let authUser: { id: string } | null = { id: "u1" };

vi.mock("@/services/reflectionService", () => ({
  reflectionService: { create: (...args: unknown[]) => create(...args) },
}));
vi.mock("@/lib/errorTracking/client", () => ({
  errorTrackingClient: { capture: (...args: unknown[]) => capture(...args) },
}));
vi.mock("@/stores/authStore", () => ({
  useAuthStore: () => ({ user: authUser }),
}));

import { useReflectionMutation } from "./useReflectionMutation";

const request = {
  framework_id: "f1",
  content: { y: "人に見せたくない本文" },
  reflection_date: "2026-10-03",
};

beforeEach(() => {
  vi.clearAllMocks();
  authUser = { id: "u1" };
});

describe("useReflectionMutation の失敗記録", () => {
  it("保存に失敗したら、原因の分類つきで記録し、エラーは呼び出し元へ投げ直す", async () => {
    create.mockRejectedValue({ code: "23505", message: "duplicate key", details: "Key (user_id)=(secret)" });
    const { result } = renderHook(() => useReflectionMutation());

    await act(async () => {
      await expect(result.current.saveReflection(request)).rejects.toMatchObject({ code: "23505" });
    });

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith("Failed to save reflection", "server", {
      metadata: { code: "23505" },
      context: { action: "save_reflection" },
    });
    expect(result.current.error?.code).toBe("23505");
  });

  it("記録には振り返りの本文も details も含めない", async () => {
    create.mockRejectedValue({ code: "X", message: "boom", details: "Key (user_id)=(secret)" });
    const { result } = renderHook(() => useReflectionMutation());
    await act(async () => {
      await result.current.saveReflection(request).catch(() => {});
    });
    const logged = JSON.stringify(capture.mock.calls);
    expect(logged).not.toContain("人に見せたくない本文");
    expect(logged).not.toContain("secret");
  });

  it("エラー文に拒否された入力値が含まれていても、記録には送らない", async () => {
    create.mockRejectedValue({
      code: "22P02",
      message: 'invalid input syntax for type uuid: "人に見せたくない入力値"',
    });
    const { result } = renderHook(() => useReflectionMutation());
    await act(async () => {
      await result.current.saveReflection(request).catch(() => {});
    });
    expect(JSON.stringify(capture.mock.calls)).not.toContain("人に見せたくない入力値");
    expect(capture).toHaveBeenCalledWith("Failed to save reflection", "server", {
      metadata: { code: "22P02" },
      context: { action: "save_reflection" },
    });
  });

  it("通信失敗は network として記録する", async () => {
    create.mockRejectedValue({ code: "UNKNOWN_ERROR", message: "TypeError: Failed to fetch" });
    const { result } = renderHook(() => useReflectionMutation());
    await act(async () => {
      await result.current.saveReflection(request).catch(() => {});
    });
    expect(capture.mock.calls[0][1]).toBe("network");
  });

  it("未ログインでも authentication として記録し、保存は呼ばない", async () => {
    authUser = null;
    const { result } = renderHook(() => useReflectionMutation());
    let returned: unknown = "unset";
    await act(async () => {
      returned = await result.current.saveReflection(request);
    });
    expect(returned).toBeNull();
    expect(create).not.toHaveBeenCalled();
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0][1]).toBe("authentication");
  });

  it("成功したときは何も記録しない", async () => {
    create.mockResolvedValue({ id: "r1", reflection_date: "2026-10-03" });
    const { result } = renderHook(() => useReflectionMutation());
    await act(async () => {
      await result.current.saveReflection(request);
    });
    expect(capture).not.toHaveBeenCalled();
  });
});
