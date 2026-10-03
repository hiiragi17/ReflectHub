import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const mutation = {
  saveReflection: vi.fn(),
  isLoading: false,
  error: null as null | { code?: string; message: string; details?: unknown },
  clearError: vi.fn(),
};

const auth = vi.hoisted(() => ({ user: null as null | { id: string } }));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: Object.assign(
    (selector: (state: { user: typeof auth.user }) => unknown) =>
      selector({ user: auth.user }),
    { getState: () => ({ user: auth.user }) }
  ),
}));

vi.mock("@/hooks/useReflectionMutation", () => ({
  useReflectionMutation: () => mutation,
}));

import ReflectionForm from "./ReflectionForm";
import { useFrameworkStore } from "@/stores/frameworkStore";
import {
  CLEAR_EPOCH_KEY,
  clearAllDrafts,
  draftStorageKey,
  loadDrafts,
  saveDrafts,
} from "@/utils/reflectionDraft";

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
  localStorage.clear();
  auth.user = null;
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
    // 送信済みの内容を、保存中に書き換えさせない
    expect(screen.getByLabelText(/やったこと/)).toHaveAttribute("readonly");
  });

  it("保存中でなければ、入力欄は編集できる", () => {
    render(<ReflectionForm />);
    expect(screen.getByLabelText(/やったこと/)).not.toHaveAttribute("readonly");
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

  it("再読み込みで一覧から消えた型の下書きは、未保存として数えない", async () => {
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

    // YWT が一覧から消えた（再読み込みの結果）
    act(() => {
      useFrameworkStore.setState({ frameworks: [other] });
    });
    await waitFor(() => expect(onUnsavedChange).toHaveBeenLastCalledWith(false));
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

describe("ReflectionForm 保存時の検証エラーの消去", () => {
  const strict = {
    ...framework,
    id: "f3",
    name: "STRICT",
    schema: [
      { id: "a", label: "必須項目", placeholder: "", required: true, max_length: 5 },
      { id: "b", label: "任意項目", placeholder: "", required: false },
    ],
  };

  beforeEach(() => {
    useFrameworkStore.setState({
      frameworks: [strict],
      selectedFrameworkId: "f3",
      selectedFramework: strict,
    });
  });

  it("上限超過で保存を止められたあと、文字を減らして上限内にしたらエラーも消える", async () => {
    render(<ReflectionForm />);
    typeInto(/必須項目/, "123456");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    await waitFor(() =>
      expect(screen.getByLabelText(/必須項目/)).toHaveAttribute("aria-invalid", "true")
    );
    expect(mutation.saveReflection).not.toHaveBeenCalled();

    typeInto(/必須項目/, "123");
    expect(screen.queryByText("5文字以内で入力してください")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/必須項目/)).toHaveAttribute("aria-invalid", "false");
  });

  it("必須エラーは、その項目に入力したら消える（他の項目のエラーは残る）", async () => {
    render(<ReflectionForm />);
    typeInto(/任意項目/, "x");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText("この項目は必須です")).toBeInTheDocument();

    typeInto(/任意項目/, "xy");
    expect(screen.getByText("この項目は必須です")).toBeInTheDocument();

    typeInto(/必須項目/, "ok");
    expect(screen.queryByText("この項目は必須です")).not.toBeInTheDocument();
  });

  it("「どれか1つ以上入力」のエラーは、入力したら消える", async () => {
    useFrameworkStore.setState({
      frameworks: [framework],
      selectedFrameworkId: "f1",
      selectedFramework: framework,
    });
    render(<ReflectionForm />);
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText("どれか1つ以上のフィールドに入力してください")).toBeInTheDocument();

    typeInto(/やったこと/, "書いた");
    expect(screen.queryByText("どれか1つ以上のフィールドに入力してください")).not.toBeInTheDocument();
  });
});

describe("ReflectionForm 保存中に型を切り替えたとき", () => {
  const ywt = framework;
  const kpt = {
    ...framework,
    id: "f2",
    name: "KPT",
    schema: [{ id: "k", label: "Keep", placeholder: "", required: false }],
  };
  const select = (fw: typeof ywt) =>
    act(() => {
      useFrameworkStore.setState({ selectedFrameworkId: fw.id, selectedFramework: fw });
    });

  beforeEach(() => {
    useFrameworkStore.setState({
      frameworks: [ywt, kpt],
      selectedFrameworkId: "f1",
      selectedFramework: ywt,
    });
  });

  it("保存が終わっても、切り替え先の下書きは消えず、保存済みにも見えない", async () => {
    let resolveSave: (v: unknown) => void = () => {};
    mutation.saveReflection.mockImplementation(
      () => new Promise((r) => { resolveSave = r; })
    );
    const onUnsavedChange = vi.fn();
    render(<ReflectionForm onUnsavedChange={onUnsavedChange} />);

    // KPT に下書きを書いてから YWT に戻り、YWT を保存する
    select(kpt);
    await screen.findByLabelText(/Keep/);
    typeInto(/Keep/, "KPTの下書き");
    select(ywt);
    await screen.findByLabelText(/やったこと/);
    typeInto(/やったこと/, "YWTの内容");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    // 保存中に KPT へ切り替える（KPT の下書きが復元される）
    select(kpt);
    expect(((await screen.findByLabelText(/Keep/)) as HTMLTextAreaElement).value).toBe("KPTの下書き");

    await act(async () => {
      resolveSave({ id: "r1", reflection_date: "2026-10-03" });
    });

    expect((screen.getByLabelText(/Keep/) as HTMLTextAreaElement).value).toBe("KPTの下書き");
    expect(screen.queryByText("保存しました")).not.toBeInTheDocument();
    // KPT の下書きは未保存のまま
    expect(onUnsavedChange).toHaveBeenLastCalledWith(true);
    // 送信したのは YWT の内容
    expect(mutation.saveReflection).toHaveBeenCalledWith(
      expect.objectContaining({ framework_id: "f1", content: { y: "YWTの内容" } })
    );
  });

  it("保存した型の下書きは保存済みとして消え、未保存の判定も取り直される", async () => {
    let resolveSave: (v: unknown) => void = () => {};
    mutation.saveReflection.mockImplementation(
      () => new Promise((r) => { resolveSave = r; })
    );
    const onUnsavedChange = vi.fn();
    render(<ReflectionForm onUnsavedChange={onUnsavedChange} />);

    await screen.findByLabelText(/やったこと/);
    typeInto(/やったこと/, "YWTの内容");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    select(kpt); // 空の KPT へ切り替え（YWT の内容はキャッシュされる）
    await screen.findByLabelText(/Keep/);
    expect(onUnsavedChange).toHaveBeenLastCalledWith(true);

    await act(async () => {
      resolveSave({ id: "r1", reflection_date: "2026-10-03" });
    });

    await waitFor(() => expect(onUnsavedChange).toHaveBeenLastCalledWith(false));
    // YWT に戻っても、保存済みの内容は復元されない
    select(ywt);
    expect(((await screen.findByLabelText(/やったこと/)) as HTMLTextAreaElement).value).toBe("");
  });
});

describe("ReflectionForm 入力し直したときのエラーの再検証", () => {
  const strict = {
    ...framework,
    id: "f3",
    name: "STRICT",
    schema: [
      { id: "a", label: "必須項目", placeholder: "", required: true, max_length: 5 },
      { id: "b", label: "任意項目", placeholder: "", required: false },
    ],
  };

  beforeEach(() => {
    useFrameworkStore.setState({
      frameworks: [strict],
      selectedFrameworkId: "f3",
      selectedFramework: strict,
    });
  });

  it("まだ不正な値（空白だけ）では、必須エラーを消さない", async () => {
    render(<ReflectionForm />);
    typeInto(/任意項目/, "x");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText("この項目は必須です")).toBeInTheDocument();

    typeInto(/必須項目/, "   ");
    expect(screen.getByText("この項目は必須です")).toBeInTheDocument();
    expect(screen.getByLabelText(/必須項目/)).toHaveAttribute("aria-invalid", "true");

    typeInto(/必須項目/, "ok");
    expect(screen.queryByText("この項目は必須です")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/必須項目/)).toHaveAttribute("aria-invalid", "false");
  });

  it("上限超過のエラーは、上限内に戻したときだけ消える", async () => {
    render(<ReflectionForm />);
    typeInto(/必須項目/, "123456");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    await waitFor(() =>
      expect(screen.getByLabelText(/必須項目/)).toHaveAttribute("aria-invalid", "true")
    );

    typeInto(/必須項目/, "1234567");
    expect(screen.getByLabelText(/必須項目/)).toHaveAttribute("aria-invalid", "true");

    typeInto(/必須項目/, "123");
    expect(screen.getByLabelText(/必須項目/)).toHaveAttribute("aria-invalid", "false");
  });

  it("HTMLを含む値のエラーは、HTMLが残るあいだは消えない", async () => {
    render(<ReflectionForm />);
    typeInto(/必須項目/, "<b>");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText("HTML タグは使用できません")).toBeInTheDocument();

    typeInto(/必須項目/, "<i>");
    expect(screen.getByText("HTML タグは使用できません")).toBeInTheDocument();

    typeInto(/必須項目/, "abc");
    expect(screen.queryByText("HTML タグは使用できません")).not.toBeInTheDocument();
  });

  it("エラーのない項目は、入力途中では検証しない", () => {
    render(<ReflectionForm />);
    typeInto(/必須項目/, "   ");
    expect(screen.queryByText("この項目は必須です")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/必須項目/)).toHaveAttribute("aria-invalid", "false");
  });

  it("「どれか1つ以上入力」のエラーは、空白だけの入力では消えない", async () => {
    useFrameworkStore.setState({
      frameworks: [framework],
      selectedFrameworkId: "f1",
      selectedFramework: framework,
    });
    render(<ReflectionForm />);
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText("どれか1つ以上のフィールドに入力してください")).toBeInTheDocument();

    typeInto(/やったこと/, "   ");
    expect(screen.getByText("どれか1つ以上のフィールドに入力してください")).toBeInTheDocument();

    typeInto(/やったこと/, "書いた");
    expect(screen.queryByText("どれか1つ以上のフィールドに入力してください")).not.toBeInTheDocument();
  });
});

describe("ReflectionForm 型の項目が変わったとき（再読み込みの結果）", () => {
  const before = {
    ...framework,
    id: "f4",
    name: "CHANGING",
    schema: [
      { id: "old", label: "古い項目", placeholder: "", required: false },
      { id: "keep", label: "残る項目", placeholder: "", required: false },
    ],
  };
  // 同じ型で、「古い項目」がなくなった
  const after = { ...before, schema: [before.schema[1]] };

  const setup = async () => {
    useFrameworkStore.setState({
      frameworks: [before],
      selectedFrameworkId: "f4",
      selectedFramework: before,
    });
    const onUnsavedChange = vi.fn();
    render(<ReflectionForm onUnsavedChange={onUnsavedChange} />);
    typeInto(/古い項目/, "消える項目の入力");
    act(() => {
      useFrameworkStore.setState({ frameworks: [after], selectedFramework: after });
    });
    await waitFor(() => expect(screen.queryByLabelText(/古い項目/)).not.toBeInTheDocument());
    return onUnsavedChange;
  };

  it("消えた項目の入力だけでは、保存できない（見えない内容を保存しない）", async () => {
    await setup();
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText("どれか1つ以上のフィールドに入力してください")).toBeInTheDocument();
    expect(mutation.saveReflection).not.toHaveBeenCalled();
  });

  it("保存するのは、いま表示している項目の入力だけ", async () => {
    await setup();
    mutation.saveReflection.mockResolvedValue({ id: "r1", reflection_date: "2026-10-03" });
    typeInto(/残る項目/, "残る入力");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    await waitFor(() => expect(mutation.saveReflection).toHaveBeenCalledTimes(1));
    const request = mutation.saveReflection.mock.calls[0][0];
    expect(request.content).toEqual({ keep: "残る入力" });
    expect(JSON.stringify(request)).not.toContain("消える項目の入力");
  });

  it("別の型に切り替えたあとも、キャッシュ中の下書きの、消えた項目は数えない", async () => {
    const other = {
      ...framework,
      id: "f5",
      name: "OTHER",
      schema: [{ id: "o", label: "他の型の項目", placeholder: "", required: false }],
    };
    useFrameworkStore.setState({
      frameworks: [before, other],
      selectedFrameworkId: "f4",
      selectedFramework: before,
    });
    const onUnsavedChange = vi.fn();
    render(<ReflectionForm onUnsavedChange={onUnsavedChange} />);
    typeInto(/古い項目/, "消える項目の入力");

    // 別の型に切り替える（元の型の入力は、キャッシュされる）
    act(() => {
      useFrameworkStore.setState({ selectedFrameworkId: "f5", selectedFramework: other });
    });
    await screen.findByLabelText(/他の型の項目/);
    expect(onUnsavedChange).toHaveBeenLastCalledWith(true);

    // 再読み込みで、元の型から「古い項目」がなくなった
    act(() => {
      useFrameworkStore.setState({ frameworks: [after, other] });
    });
    await waitFor(() => expect(onUnsavedChange).toHaveBeenLastCalledWith(false));
  });

  it("消えた項目の入力は、未保存として数えない", async () => {
    const onUnsavedChange = await setup();
    await waitFor(() => expect(onUnsavedChange).toHaveBeenLastCalledWith(false));
  });
});

describe("ReflectionForm 保存に失敗したとき、保存中に型を切り替えていた場合", () => {
  const ywt = framework;
  const kpt = {
    ...framework,
    id: "f2",
    name: "KPT",
    schema: [{ id: "k", label: "Keep", placeholder: "", required: false }],
  };
  const select = (fw: typeof ywt) =>
    act(() => {
      useFrameworkStore.setState({ selectedFrameworkId: fw.id, selectedFramework: fw });
    });

  beforeEach(() => {
    useFrameworkStore.setState({
      frameworks: [ywt, kpt],
      selectedFrameworkId: "f1",
      selectedFramework: ywt,
    });
  });

  it("失敗の案内は、失敗した型を表示しているときだけ出す（別の型の下には出さない）", async () => {
    let rejectSave: (e: unknown) => void = () => {};
    mutation.saveReflection.mockImplementation(
      () => new Promise((_, reject) => { rejectSave = reject; })
    );
    const { rerender } = render(<ReflectionForm />);
    typeInto(/やったこと/, "YWTの内容");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    // 保存中に KPT へ切り替える
    select(kpt);
    await screen.findByLabelText(/Keep/);

    // その後、YWT の保存が失敗する
    mutation.error = { code: "X", message: "boom" };
    await act(async () => {
      rejectSave({ code: "X", message: "boom" });
    });
    rerender(<ReflectionForm />);

    // KPT の下には、失敗の案内を出さない
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // YWT に戻ると、案内が出る（YWT の下書きも残っている）
    select(ywt);
    expect(await screen.findByRole("alert")).toHaveTextContent("保存できませんでした");
    expect((screen.getByLabelText(/やったこと/) as HTMLTextAreaElement).value).toBe("YWTの内容");
  });

  it("切り替えていなければ、これまでどおり失敗の案内を出す", async () => {
    mutation.saveReflection.mockRejectedValue({ code: "X", message: "boom" });
    const { rerender } = render(<ReflectionForm />);
    typeInto(/やったこと/, "YWTの内容");
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    await waitFor(() => expect(mutation.saveReflection).toHaveBeenCalled());
    mutation.error = { code: "X", message: "boom" };
    rerender(<ReflectionForm />);
    expect(screen.getByRole("alert")).toHaveTextContent("保存できませんでした");
  });
});

describe("ReflectionForm 保存する日付（JST）", () => {
  it("JST の朝（UTC では前日）に保存しても、JST の日付で保存する", async () => {
    // 2026-10-04 08:30 JST = 2026-10-03 23:30 UTC
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T23:30:00Z"));
    try {
      mutation.saveReflection.mockResolvedValue({ id: "r1", reflection_date: "2026-10-04" });
      render(<ReflectionForm />);
      typeInto(/やったこと/, "朝に書いた");
      fireEvent.click(screen.getByRole("button", { name: "保存する" }));
      await waitFor(() => expect(mutation.saveReflection).toHaveBeenCalledTimes(1));
      expect(mutation.saveReflection).toHaveBeenCalledWith(
        expect.objectContaining({ reflection_date: "2026-10-04" })
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ReflectionForm 下書きの自動保存", () => {
  beforeEach(() => {
    auth.user = { id: "u1" };
  });

  it("入力すると、少し待ってから下書きが保存される", () => {
    vi.useFakeTimers();
    try {
      render(<ReflectionForm />);
      typeInto(/やったこと/, "走った");
      expect(loadDrafts("u1")).toBeNull();
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).toEqual({ f1: { y: "走った" } });
    } finally {
      vi.useRealTimers();
    }
  });

  it("前回の下書きがあれば確認が出て、復元すると入力欄に戻る", () => {
    saveDrafts("u1", { f1: { y: "前回の入力" } });
    render(<ReflectionForm />);
    expect(screen.getByText(/前回の書きかけの下書きがあります/)).toBeInTheDocument();
    // 確認するまでは、入力欄に入れない
    expect(screen.getByLabelText(/やったこと/)).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "復元する" }));
    expect(screen.getByLabelText(/やったこと/)).toHaveValue("前回の入力");
    expect(screen.queryByText(/前回の書きかけの下書きがあります/)).not.toBeInTheDocument();
  });

  it("破棄すると、入力欄は空のまま、保存済みの下書きも消える", () => {
    saveDrafts("u1", { f1: { y: "前回の入力" } });
    render(<ReflectionForm />);
    fireEvent.click(screen.getByRole("button", { name: "破棄する" }));
    expect(screen.getByLabelText(/やったこと/)).toHaveValue("");
    expect(loadDrafts("u1")).toBeNull();
  });

  it("確認に答える前の入力も保存され、前回の下書きと重ねて残る（新しい入力が優先）", () => {
    vi.useFakeTimers();
    try {
      saveDrafts("u1", { f1: { y: "前回のやったこと", w: "前回の気づき" } });
      render(<ReflectionForm />);
      typeInto(/やったこと/, "新しいやったこと");
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).toEqual({
        f1: { y: "新しいやったこと", w: "前回の気づき" },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("確認の前に入力して「破棄する」と、前回の下書きだけが消え、新しい入力は残る", () => {
    vi.useFakeTimers();
    try {
      saveDrafts("u1", { f1: { w: "前回の気づき" } });
      render(<ReflectionForm />);
      typeInto(/やったこと/, "新しい入力");
      act(() => {
        vi.advanceTimersByTime(600);
      });
      fireEvent.click(screen.getByRole("button", { name: "破棄する" }));
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).toEqual({ f1: { y: "新しい入力" } });
    } finally {
      vi.useRealTimers();
    }
  });

  it("保存の途中でログアウトしたら、保存が終わっても下書きを書き戻さない", async () => {
    let resolveSave: (value: unknown) => void = () => {};
    mutation.saveReflection = vi.fn(
      () => new Promise((resolve) => (resolveSave = resolve))
    );
    saveDrafts("u1", { f1: { y: "前回の入力" }, f2: { a: "前回の別の型" } });
    render(<ReflectionForm />);
    typeInto(/やったこと/, "新しい入力");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    });
    // ログアウト（ボタンの signOut は、端末の下書きをすべて消す）
    auth.user = null;
    clearAllDrafts();
    await act(async () => {
      resolveSave({ id: "r1" });
    });
    expect(loadDrafts("u1")).toBeNull();
  });

  it("別のユーザーの下書きは、確認にも出ない", () => {
    saveDrafts("u2", { f1: { y: "他人の入力" } });
    render(<ReflectionForm />);
    expect(screen.queryByText(/前回の書きかけの下書きがあります/)).not.toBeInTheDocument();
  });

  it("保存に成功すると、下書きも消える", async () => {
    vi.useFakeTimers();
    try {
      mutation.saveReflection = vi.fn().mockResolvedValue({ id: "r1" });
      render(<ReflectionForm />);
      typeInto(/やったこと/, "走った");
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).not.toBeNull();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "保存する" }));
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("確認に答えないまま保存すると、その型の下書きは確認からも保存先からも消える", async () => {
    mutation.saveReflection = vi.fn().mockResolvedValue({ id: "r1" });
    saveDrafts("u1", { f1: { y: "前回の入力" } });
    render(<ReflectionForm />);
    typeInto(/やったこと/, "新しい入力");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    });
    expect(screen.queryByText(/前回の書きかけの下書きがあります/)).not.toBeInTheDocument();
    expect(loadDrafts("u1")).toBeNull();
  });

  it("確認に答えないまま保存しても、別の型の下書きは残る", async () => {
    mutation.saveReflection = vi.fn().mockResolvedValue({ id: "r1" });
    saveDrafts("u1", { f1: { y: "前回のYWT" }, f2: { a: "前回の別の型" } });
    render(<ReflectionForm />);
    typeInto(/やったこと/, "新しい入力");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    });
    expect(screen.getByText(/前回の書きかけの下書きがあります/)).toBeInTheDocument();
    expect(loadDrafts("u1")).toEqual({ f2: { a: "前回の別の型" } });
  });

  it("読み込んだだけの下書きは書き直さず、保存日時（有効期限）を延ばさない", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-03T00:00:00Z"));
      const savedAt = Date.now() - 60_000;
      saveDrafts("u1", { f1: { y: "前回の入力" } }, savedAt);
      render(<ReflectionForm />);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      const raw = JSON.parse(localStorage.getItem(draftStorageKey("u1")) ?? "{}");
      expect(raw.savedAt).toBe(savedAt);
    } finally {
      vi.useRealTimers();
    }
  });

  it("別のタブで下書きが消えたら、確認の表示も消える", () => {
    saveDrafts("u1", { f1: { y: "前回の入力" } });
    render(<ReflectionForm />);
    expect(screen.getByText(/前回の書きかけの下書きがあります/)).toBeInTheDocument();
    localStorage.removeItem(draftStorageKey("u1"));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: draftStorageKey("u1") })
      );
    });
    expect(screen.queryByText(/前回の書きかけの下書きがあります/)).not.toBeInTheDocument();
  });

  it("入力の直後にセッションが失効して画面が閉じても、最後の入力は保存される", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<ReflectionForm />);
      typeInto(/やったこと/, "失効の直前の入力");
      // 失効：ストアのユーザーが null になってから画面が閉じる（ログアウトのボタンではない）
      auth.user = null;
      unmount();
      expect(loadDrafts("u1")).toEqual({ f1: { y: "失効の直前の入力" } });
    } finally {
      vi.useRealTimers();
    }
  });

  it("入力の直後にログアウトのボタンが押されたら、画面が閉じても書き戻さない", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<ReflectionForm />);
      typeInto(/やったこと/, "ログアウトの直前の入力");
      auth.user = null;
      clearAllDrafts();
      unmount();
      expect(loadDrafts("u1")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("別のタブでログアウトのボタンが押されていたら、画面が閉じても書き戻さない", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<ReflectionForm />);
      typeInto(/やったこと/, "別タブのログアウトの直前の入力");
      // 別のタブの clearAllDrafts：印だけがこのタブに伝わる
      localStorage.setItem(CLEAR_EPOCH_KEY, "other-tab");
      auth.user = null;
      unmount();
      expect(loadDrafts("u1")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("別のタブが保存した、このタブで触っていない型の下書きは、書き換えで消さない", () => {
    vi.useFakeTimers();
    try {
      render(<ReflectionForm />);
      // 別のタブが、別の型の下書きを保存した
      saveDrafts("u1", { f2: { a: "別のタブの入力" } });
      typeInto(/やったこと/, "このタブの入力");
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).toEqual({
        f1: { y: "このタブの入力" },
        f2: { a: "別のタブの入力" },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("このタブで入力して消した型は、書き換えで残らない", () => {
    vi.useFakeTimers();
    try {
      render(<ReflectionForm />);
      typeInto(/やったこと/, "入力");
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).not.toBeNull();
      typeInto(/やったこと/, "");
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("確認が出ていなくても、保存に成功したら、保存済みの下書きから外す（セッション失効後でも）", async () => {
    vi.useFakeTimers();
    try {
      let resolveSave: (value: unknown) => void = () => {};
      mutation.saveReflection = vi.fn(
        () => new Promise((resolve) => (resolveSave = resolve))
      );
      render(<ReflectionForm />);
      typeInto(/やったこと/, "保存する入力");
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).toEqual({ f1: { y: "保存する入力" } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "保存する" }));
      });
      // 保存の途中でセッションが失効（ログアウトのボタンではない）
      auth.user = null;
      await act(async () => {
        resolveSave({ id: "r1" });
      });
      expect(loadDrafts("u1")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("保存の途中で別のタブが同じ型に新しく書いた下書きは、保存が終わっても消えない", async () => {
    vi.useFakeTimers();
    try {
      let resolveSave: (value: unknown) => void = () => {};
      mutation.saveReflection = vi.fn(
        () => new Promise((resolve) => (resolveSave = resolve))
      );
      render(<ReflectionForm />);
      typeInto(/やったこと/, "このタブの入力");
      act(() => {
        vi.advanceTimersByTime(600);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "保存する" }));
      });
      // 保存の途中で、別のタブが同じ型に新しい入力を保存した
      saveDrafts("u1", { f1: { y: "別のタブの新しい入力" } });
      await act(async () => {
        resolveSave({ id: "r1" });
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(loadDrafts("u1")).toEqual({ f1: { y: "別のタブの新しい入力" } });
    } finally {
      vi.useRealTimers();
    }
  });

  it("確認の表示中に別のタブが書いた下書きは、このタブで保存しても消さない", async () => {
    mutation.saveReflection = vi.fn().mockResolvedValue({ id: "r1" });
    saveDrafts("u1", { f1: { y: "前回の入力" } });
    render(<ReflectionForm />);
    typeInto(/やったこと/, "このタブの入力");
    // 別のタブが、同じ型に新しい下書きを書いた（待ち時間のうちに、このタブは保存する）
    saveDrafts("u1", { f1: { y: "別のタブの入力" } });
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: draftStorageKey("u1") })
      );
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存する" }));
    });
    expect(loadDrafts("u1")).toEqual({ f1: { y: "別のタブの入力" } });
  });

  it("ログインしていなければ、下書きを保存しない", () => {
    vi.useFakeTimers();
    try {
      auth.user = null;
      render(<ReflectionForm />);
      typeInto(/やったこと/, "走った");
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(localStorage.length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
