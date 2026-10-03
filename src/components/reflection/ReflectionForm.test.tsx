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

  it("別の型に切り替えても、元の型の未保存入力があるあいだは確認を残す", async () => {
    const other = { ...framework, id: "f2", name: "KPT", schema: [{ id: "k", label: "Keep", placeholder: "", required: false }] };
    useFrameworkStore.setState({ frameworks: [framework, other] });
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    render(<ReflectionForm />);
    typeInto(/やったこと/, "YWTの下書き");

    act(() => {
      useFrameworkStore.setState({ selectedFrameworkId: "f2", selectedFramework: other });
    });
    await screen.findByLabelText(/Keep/);
    // 表示中の KPT は空だが、YWT の入力は未保存のまま
    const unloadAdds = add.mock.calls.filter(([t]) => t === "beforeunload").length;
    const unloadRemoves = remove.mock.calls.filter(([t]) => t === "beforeunload").length;
    expect(unloadAdds).toBeGreaterThan(unloadRemoves);
    add.mockRestore();
    remove.mockRestore();
  });
});

describe("ReflectionForm アプリ内リンクでの離脱確認", () => {
  const renderWithLink = () => {
    render(
      <>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- ルーターなしでクリックを検証するため素の <a> を使う */}
        <a href="/history">履歴へ</a>
        <a href="https://example.com/" target="_blank" rel="noreferrer">外部</a>
        <ReflectionForm />
      </>
    );
    // jsdom の未実装ナビゲーションを避けるため、最後に既定動作を止めておく
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("click", stop);
    return () => document.removeEventListener("click", stop);
  };

  it("入力があるときにリンクを押すと確認を出し、キャンセルなら遷移を止める", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const cleanup = renderWithLink();
    typeInto(/やったこと/, "書きかけ");

    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    const stopSpy = vi.spyOn(event, "stopPropagation");
    screen.getByRole("link", { name: "履歴へ" }).dispatchEvent(event);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0][0]).toContain("保存されていません");
    expect(event.defaultPrevented).toBe(true);
    expect(stopSpy).toHaveBeenCalled();
    cleanup();
    confirmSpy.mockRestore();
  });

  it("確認で「離れる」を選んだときは止めない", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const cleanup = renderWithLink();
    typeInto(/やったこと/, "書きかけ");

    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    const stopSpy = vi.spyOn(event, "stopPropagation");
    screen.getByRole("link", { name: "履歴へ" }).dispatchEvent(event);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(stopSpy).not.toHaveBeenCalled();
    cleanup();
    confirmSpy.mockRestore();
  });

  it("入力がなければ確認を出さない", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const cleanup = renderWithLink();
    fireEvent.click(screen.getByRole("link", { name: "履歴へ" }));
    expect(confirmSpy).not.toHaveBeenCalled();
    cleanup();
    confirmSpy.mockRestore();
  });

  it("新しいタブで開くリンクは対象外", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const cleanup = renderWithLink();
    typeInto(/やったこと/, "書きかけ");
    fireEvent.click(screen.getByRole("link", { name: "外部" }));
    expect(confirmSpy).not.toHaveBeenCalled();
    cleanup();
    confirmSpy.mockRestore();
  });
});

describe("ReflectionForm 未保存状態の通知と保存済み表示", () => {
  it("未保存の入力の有無を onUnsavedChange で親に伝える", async () => {
    const onUnsavedChange = vi.fn();
    render(<ReflectionForm onUnsavedChange={onUnsavedChange} />);
    expect(onUnsavedChange).toHaveBeenLastCalledWith(false);

    typeInto(/やったこと/, "書きかけ");
    expect(onUnsavedChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "入力をすべて消す" }));
    fireEvent.click(await screen.findByRole("button", { name: "すべて消す" }));
    await waitFor(() => expect(onUnsavedChange).toHaveBeenLastCalledWith(false));
  });

  it("別の型の未保存の下書きも「未保存あり」として伝える", async () => {
    const other = { ...framework, id: "f2", name: "KPT", schema: [{ id: "k", label: "Keep", placeholder: "", required: false }] };
    useFrameworkStore.setState({ frameworks: [framework, other] });
    const onUnsavedChange = vi.fn();
    render(<ReflectionForm onUnsavedChange={onUnsavedChange} />);
    typeInto(/やったこと/, "YWTの下書き");

    act(() => {
      useFrameworkStore.setState({ selectedFrameworkId: "f2", selectedFramework: other });
    });
    await screen.findByLabelText(/Keep/);
    expect(onUnsavedChange).toHaveBeenLastCalledWith(true);
  });

  it("アンマウント時は「未保存なし」を伝える", () => {
    const onUnsavedChange = vi.fn();
    const { unmount } = render(<ReflectionForm onUnsavedChange={onUnsavedChange} />);
    typeInto(/やったこと/, "x");
    unmount();
    expect(onUnsavedChange).toHaveBeenLastCalledWith(false);
  });

  it("型を切り替えたら「保存しました」を消す（戻した型の下書きが保存済みに見えない）", async () => {
    const other = { ...framework, id: "f2", name: "KPT", schema: [{ id: "k", label: "Keep", placeholder: "", required: false }] };
    useFrameworkStore.setState({ frameworks: [framework, other] });
    mutation.saveReflection.mockResolvedValue({ id: "r1", reflection_date: "2026-10-03" });
    render(<ReflectionForm />);
    typeInto(/やったこと/, "保存する内容");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText("保存しました")).toBeInTheDocument();

    act(() => {
      useFrameworkStore.setState({ selectedFrameworkId: "f2", selectedFramework: other });
    });
    await screen.findByLabelText(/Keep/);
    expect(screen.queryByText("保存しました")).not.toBeInTheDocument();
  });
});
