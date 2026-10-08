import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = vi.fn();
const signOut = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", name: "太郎" }, signOut, isLoading: false }),
}));

// ヘッダーのログアウトは「リンクではなくボタン」。それだけを再現する
vi.mock("@/components/layout/Header", () => ({
  default: ({ onSignOut }: { onSignOut: () => Promise<void> }) => (
    <button onClick={() => void onSignOut()}>ログアウト</button>
  ),
}));

vi.mock("@/components/reflection/FrameworkSelector", () => ({ default: () => null }));

vi.mock("@/components/reflection/ReflectionForm", () => ({
  SIGN_OUT_CONFIRM_MESSAGE: "ログアウトの確認メッセージ",
  default: ({
    onUnsavedChange,
    onPendingDraftChange,
  }: {
    onUnsavedChange?: (v: boolean) => void;
    onPendingDraftChange?: (v: boolean) => void;
  }) => (
    <div>
      <button onClick={() => onPendingDraftChange?.(true)}>復元待ちの下書きあり</button>
      <button onClick={() => onUnsavedChange?.(true)}>下書きを書く</button>
      <button onClick={() => onUnsavedChange?.(false)}>下書きを消す</button>
    </div>
  ),
}));

vi.mock("../dashboard/loading", () => ({ default: () => null }));

import ReflectionPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue(undefined);
});

describe("ReflectionPage ログアウト時の離脱確認", () => {
  it("未保存の入力がなければ、確認なしでログアウトする", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<ReflectionPage />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/auth");
    confirmSpy.mockRestore();
  });

  it("未保存の入力があるときは確認を出し、キャンセルならログアウトしない", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ReflectionPage />);
    fireEvent.click(screen.getByRole("button", { name: "下書きを書く" }));
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(confirmSpy).toHaveBeenCalledWith("ログアウトの確認メッセージ");
    expect(signOut).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("入力がなくても、復元待ちの下書きがあれば確認を出す（ログアウトは下書きも消す）", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ReflectionPage />);
    fireEvent.click(screen.getByRole("button", { name: "復元待ちの下書きあり" }));
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(confirmSpy).toHaveBeenCalledWith("ログアウトの確認メッセージ");
    expect(signOut).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("確認で「OK」を選んだときはログアウトする", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ReflectionPage />);
    fireEvent.click(screen.getByRole("button", { name: "下書きを書く" }));
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith("/auth");
    confirmSpy.mockRestore();
  });

  it("下書きを消したあとは、確認なしでログアウトする", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<ReflectionPage />);
    fireEvent.click(screen.getByRole("button", { name: "下書きを書く" }));
    fireEvent.click(screen.getByRole("button", { name: "下書きを消す" }));
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
