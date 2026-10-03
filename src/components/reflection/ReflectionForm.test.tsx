import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const mutation = {
  saveReflection: vi.fn(),
  isLoading: false,
  error: null as null | { code?: string; message: string; details?: unknown },
  clearError: vi.fn(),
};

vi.mock("@/hooks/useReflectionMutation", () => ({
  useReflectionMutation: () => mutation,
}));

import ReflectionForm from "./ReflectionForm";
import { useFrameworkStore } from "@/stores/frameworkStore";

const framework = {
  id: "f1",
  name: "YWT",
  display_name: "YWT",
  description: "",
  icon: "📝",
  is_active: true,
  sort_order: 1,
  created_at: "",
  updated_at: "",
  schema: [
    { id: "y", label: "やったこと", placeholder: "今週やったこと", required: false },
    { id: "w", label: "わかったこと", placeholder: "気づき", required: false },
  ],
};

const typeInto = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  mutation.isLoading = false;
  mutation.error = null;
  mutation.saveReflection = vi.fn();
  useFrameworkStore.setState({
    frameworks: [framework],
    selectedFrameworkId: "f1",
    selectedFramework: framework,
  });
});

describe("ReflectionForm 保存フロー", () => {
  it("保存中は ✅ なしの進行表示になり、ボタンは押せない", () => {
    mutation.isLoading = true;
    render(<ReflectionForm />);
    const button = screen.getByRole("button", { name: /保存しています/ });
    expect(button).toBeDisabled();
    expect(screen.getByText(/保存しています。このページを閉じずに/)).toBeInTheDocument();
    expect(screen.queryByText(/保存しました/)).not.toBeInTheDocument();
  });

  it("保存が5秒以上かかると、止まっていないことを伝える", () => {
    vi.useFakeTimers();
    try {
      mutation.isLoading = true;
      render(<ReflectionForm />);
      expect(screen.queryByText(/通信に時間がかかっています/)).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText(/通信に時間がかかっています/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("成功すると履歴へのリンクを出し、入力欄を空にする", async () => {
    mutation.saveReflection.mockResolvedValue({ id: "r1", reflection_date: "2026-10-03" });
    render(<ReflectionForm />);
    typeInto(/やったこと/, "テストを書いた");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText(/保存しました/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "履歴" })).toHaveAttribute("href", "/history");
    expect((screen.getByLabelText(/やったこと/) as HTMLTextAreaElement).value).toBe("");
  });

  it("入力が空のまま保存すると送信せず、入力を促す", async () => {
    render(<ReflectionForm />);
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText("どれか1つ以上のフィールドに入力してください")).toBeInTheDocument();
    expect(mutation.saveReflection).not.toHaveBeenCalled();
  });

  it("連打しても保存は1回しか呼ばれない", async () => {
    let resolve: (v: unknown) => void = () => {};
    mutation.saveReflection.mockImplementation(
      () => new Promise((r) => { resolve = r; })
    );
    render(<ReflectionForm />);
    typeInto(/やったこと/, "テスト");
    const button = screen.getByRole("button", { name: "保存する" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mutation.saveReflection).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ id: "r1", reflection_date: "2026-10-03" });
    });
  });

  it("失敗しても入力は残り、成功表示は出ない", async () => {
    mutation.saveReflection.mockRejectedValue({ code: "X", message: "boom" });
    render(<ReflectionForm />);
    typeInto(/やったこと/, "消えてはいけない");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    await waitFor(() => expect(mutation.saveReflection).toHaveBeenCalled());
    expect((screen.getByLabelText(/やったこと/) as HTMLTextAreaElement).value).toBe("消えてはいけない");
    expect(screen.queryByText(/保存しました/)).not.toBeInTheDocument();
  });

  it("失敗時は原因と次の行動を示し、生のエラーや詳細JSONは出さない", () => {
    mutation.error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: { secret: "internal-detail" },
    };
    render(<ReflectionForm />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("保存できませんでした");
    expect(alert).toHaveTextContent("入力内容は画面に残っています");
    expect(alert).toHaveTextContent("もう一度「保存する」を押してください");
    expect(screen.queryByText(/duplicate key/)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal-detail/)).not.toBeInTheDocument();
  });

  it("オフライン時は通信エラーの案内を出す", () => {
    const spy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    mutation.error = { message: "x" };
    render(<ReflectionForm />);
    expect(screen.getByRole("alert")).toHaveTextContent("通信に失敗しました");
    spy.mockRestore();
  });
});

describe("ReflectionForm 入力を消す操作", () => {
  it("入力がないときは「入力をすべて消す」を押せない", () => {
    render(<ReflectionForm />);
    expect(screen.getByRole("button", { name: "入力をすべて消す" })).toBeDisabled();
  });

  it("確認ダイアログで「すべて消す」を選ぶまで消えない", async () => {
    render(<ReflectionForm />);
    typeInto(/やったこと/, "大事なメモ");
    fireEvent.click(screen.getByRole("button", { name: "入力をすべて消す" }));

    expect(await screen.findByText("入力内容をすべて消しますか？")).toBeInTheDocument();
    expect(screen.getByText(/元に戻せません/)).toBeInTheDocument();
    expect((screen.getByLabelText(/やったこと/) as HTMLTextAreaElement).value).toBe("大事なメモ");

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByText("入力内容をすべて消しますか？")).not.toBeInTheDocument());
    expect((screen.getByLabelText(/やったこと/) as HTMLTextAreaElement).value).toBe("大事なメモ");

    fireEvent.click(screen.getByRole("button", { name: "入力をすべて消す" }));
    fireEvent.click(await screen.findByRole("button", { name: "すべて消す" }));
    await waitFor(() =>
      expect((screen.getByLabelText(/やったこと/) as HTMLTextAreaElement).value).toBe("")
    );
  });

  it("未保存の入力があるときだけ、ページを離れる前の確認を登録する", () => {
    const add = vi.spyOn(window, "addEventListener");
    render(<ReflectionForm />);
    expect(add.mock.calls.some(([t]) => t === "beforeunload")).toBe(false);
    typeInto(/やったこと/, "x");
    expect(add.mock.calls.some(([t]) => t === "beforeunload")).toBe(true);
    add.mockRestore();
  });
});
