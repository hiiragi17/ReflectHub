import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

const hook = {
  frameworks: [] as unknown[],
  selectedFrameworkId: null as string | null,
  selectedFramework: undefined as unknown,
  isLoading: false,
  error: null as string | null,
  selectFramework: vi.fn(),
  reload: vi.fn(),
};
vi.mock("@/hooks/useFrameworks", () => ({ useFrameworks: () => hook }));

import FrameworkSelector from "./FrameworkSelector";

const fw = (id: string, name: string, description?: string) => ({
  id, name, display_name: name, description, icon: "📝", is_active: true,
  sort_order: 1, created_at: "", updated_at: "",
  schema: [{ id: "a", label: "A", placeholder: "", required: true }],
});

beforeEach(() => {
  vi.clearAllMocks();
  hook.frameworks = [fw("1", "YWT", "やったこと・わかったこと・次にやることで整理"), fw("2", "KPT")];
  hook.selectedFrameworkId = "1";
  hook.selectedFramework = hook.frameworks[0];
  hook.isLoading = false;
  hook.error = null;
});

describe("FrameworkSelector", () => {
  it("各カードに何に使う型かの説明を出す（説明がない型は空欄にしない）", () => {
    render(<FrameworkSelector />);
    // カード＋選択中の詳細欄の2か所
    expect(screen.getAllByText("やったこと・わかったこと・次にやることで整理")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: /KPT/ })).toBeInTheDocument();
  });

  it("選択中のカードには文字で「選択中」と出る", () => {
    render(<FrameworkSelector />);
    expect(screen.getAllByText("選択中")).toHaveLength(1);
    expect(screen.getByRole("radio", { name: /YWT/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /KPT/ })).toHaveAttribute("aria-checked", "false");
  });

  it("カードを押すと選択が切り替わる", () => {
    render(<FrameworkSelector />);
    fireEvent.click(screen.getByRole("radio", { name: /KPT/ }));
    expect(hook.selectFramework).toHaveBeenCalledWith("2");
  });

  it("取得失敗時は生のエラーを出さず、再読み込みボタンを出す", () => {
    hook.frameworks = [];
    hook.error = "フレームワーク取得エラー: JWT expired";
    render(<FrameworkSelector />);
    expect(screen.getByRole("alert")).toHaveTextContent("読み込めませんでした");
    expect(screen.queryByText(/JWT expired/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "もう一度読み込む" }));
    expect(hook.reload).toHaveBeenCalledTimes(1);
  });

  it("読み込み中・取得失敗・データなしを区別して表示する", () => {
    hook.frameworks = [];
    hook.isLoading = true;
    const { rerender } = render(<FrameworkSelector />);
    expect(screen.getByText(/読み込み中/)).toBeInTheDocument();

    hook.isLoading = false;
    rerender(<FrameworkSelector />);
    expect(screen.getByText(/まだ登録されていません/)).toBeInTheDocument();
    expect(screen.queryByText(/読み込めませんでした/)).not.toBeInTheDocument();
  });

  it("項目数の行を押しても、そのカードが選択される", () => {
    render(<FrameworkSelector />);
    const kpt = screen.getByRole("radio", { name: /KPT/ });
    fireEvent.click(within(kpt).getByText("1項目"));
    expect(hook.selectFramework).toHaveBeenCalledWith("2");
  });

  describe("もっと見る", () => {
    const mockClamped = (clamped: boolean) => {
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(clamped ? 100 : 10);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);
    };

    it("3行に収まらない説明にだけ出て、押すと全文が開閉する", () => {
      mockClamped(true);
      render(<FrameworkSelector />);
      const toggle = screen.getByRole("button", { name: /もっと見る/ });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(toggle);
      expect(screen.getByRole("button", { name: /閉じる/ })).toHaveAttribute("aria-expanded", "true");
      expect(hook.selectFramework).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: /閉じる/ }));
      expect(screen.getByRole("button", { name: /もっと見る/ })).toBeInTheDocument();
    });

    it("説明が収まっているカードには出さない", () => {
      mockClamped(false);
      render(<FrameworkSelector />);
      expect(screen.queryByRole("button", { name: /もっと見る/ })).not.toBeInTheDocument();
    });
  });
});
