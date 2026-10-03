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

  it("再読み込みで選択中の型が一覧から消えていたら、別の型を選び直す", async () => {
    useFrameworkStore.setState({
      frameworks: [fw("a"), fw("gone")],
      selectedFrameworkId: "gone",
      selectedFramework: fw("gone"),
      error: "boom",
    });
    getFrameworks.mockResolvedValueOnce([fw("a"), fw("b")]);
    const { result } = renderHook(() => useFrameworks());

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.selectedFrameworkId).toBe("a");
    expect(result.current.selectedFramework?.id).toBe("a");
  });

  it("再読み込みのあとも、選択中の型が残っていれば選択は変えない", async () => {
    useFrameworkStore.setState({
      frameworks: [fw("a"), fw("b")],
      selectedFrameworkId: "b",
      selectedFramework: fw("b"),
      error: "boom",
    });
    getFrameworks.mockResolvedValueOnce([fw("a"), fw("b"), fw("c")]);
    const { result } = renderHook(() => useFrameworks());

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.selectedFrameworkId).toBe("b");
    expect(result.current.frameworks).toHaveLength(3);
  });

  it("取得が重なっても、最後に始めた取得の結果だけを反映する（古い応答が上書きしない）", async () => {
    let resolveOld: (v: unknown) => void = () => {};
    let resolveNew: (v: unknown) => void = () => {};
    getFrameworks
      .mockImplementationOnce(() => new Promise((r) => { resolveOld = r; }))
      .mockImplementationOnce(() => new Promise((r) => { resolveNew = r; }));

    // 1回目: 画面を開いて取得を始める
    const first = renderHook(() => useFrameworks());
    // 一覧がまだ空のまま画面を離れて戻り、2回目の取得が始まる
    first.unmount();
    const second = renderHook(() => useFrameworks());
    await waitFor(() => expect(getFrameworks).toHaveBeenCalledTimes(2));

    // 新しい取得が先に終わり、古い取得があとから終わる
    await act(async () => {
      resolveNew([fw("new-a"), fw("new-b")]);
    });
    await act(async () => {
      resolveOld([fw("old-a")]);
    });

    expect(second.result.current.frameworks.map((f) => f.id)).toEqual(["new-a", "new-b"]);
    expect(second.result.current.selectedFrameworkId).toBe("new-a");
    expect(second.result.current.isLoading).toBe(false);
  });

  it("古い取得の失敗は、新しい取得の結果を壊さない", async () => {
    let rejectOld: (e: unknown) => void = () => {};
    let resolveNew: (v: unknown) => void = () => {};
    getFrameworks
      .mockImplementationOnce(() => new Promise((_, rej) => { rejectOld = rej; }))
      .mockImplementationOnce(() => new Promise((r) => { resolveNew = r; }));

    const first = renderHook(() => useFrameworks());
    first.unmount();
    const second = renderHook(() => useFrameworks());
    await waitFor(() => expect(getFrameworks).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveNew([fw("a")]);
    });
    await act(async () => {
      rejectOld(new Error("old failed"));
    });

    expect(second.result.current.error).toBeNull();
    expect(second.result.current.frameworks).toHaveLength(1);
  });
});
