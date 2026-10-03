import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const getFrameworks = vi.fn();
vi.mock("@/services/frameworkService", () => ({
  frameworkService: { getFrameworks: (...args: unknown[]) => getFrameworks(...args) },
}));

import { useFrameworks } from "./useFrameworks";
import { useFrameworkStore } from "@/stores/frameworkStore";

const fw = (id: string) => ({
  id, name: id, display_name: id, is_active: true, sort_order: 1,
  created_at: "", updated_at: "", schema: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  useFrameworkStore.setState({
    frameworks: [], selectedFrameworkId: null, selectedFramework: undefined,
    isLoading: false, error: null,
  });
});

describe("useFrameworks", () => {
  it("取得済みなら、自動の取得はしない", async () => {
    useFrameworkStore.setState({ frameworks: [fw("a")] });
    renderHook(() => useFrameworks());
    await Promise.resolve();
    expect(getFrameworks).not.toHaveBeenCalled();
  });

  it("失敗したら error を持ち、reload で取り直せる", async () => {
    getFrameworks.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useFrameworks());
    await waitFor(() => expect(result.current.error).toBe("boom"));

    getFrameworks.mockResolvedValueOnce([fw("a")]);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.frameworks).toHaveLength(1);
  });

  it("データがあるのに error が立っている状態でも、reload は取り直す", async () => {
    // 開発時の Strict Mode で初回取得が2回走り、片方が成功・片方が失敗した状態
    useFrameworkStore.setState({ frameworks: [fw("a")], error: "boom" });
    getFrameworks.mockResolvedValueOnce([fw("a"), fw("b")]);
    const { result } = renderHook(() => useFrameworks());

    await act(async () => {
      await result.current.reload();
    });

    expect(getFrameworks).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.frameworks).toHaveLength(2);
  });

  it("onClick にそのまま渡されても動く（イベントを force と取り違えない）", async () => {
    useFrameworkStore.setState({ frameworks: [fw("a")], error: "boom" });
    getFrameworks.mockResolvedValue([fw("a")]);
    const { result } = renderHook(() => useFrameworks());
    await act(async () => {
      (result.current.reload as unknown as (e: unknown) => Promise<void>)({ type: "click" });
    });
    expect(getFrameworks).toHaveBeenCalledTimes(1);
  });
});
