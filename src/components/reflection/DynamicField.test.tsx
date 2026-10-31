import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DynamicField from "./DynamicField";

const field = { id: "y", label: "やったこと", placeholder: "今週やったこと", max_length: 10 };

describe("DynamicField", () => {
  it("上限を超える入力も黙って捨てず、onChange に渡す", () => {
    const onChange = vi.fn();
    render(<DynamicField field={field} value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/やったこと/), {
      target: { value: "12345678901234" },
    });
    expect(onChange).toHaveBeenCalledWith("12345678901234");
  });

  it("上限超過時は超過文字数と対処を文字で表示し、aria-invalid を立てる", () => {
    render(<DynamicField field={field} value="12345678901234" onChange={() => {}} />);
    expect(screen.getByText("4文字超えています。10文字以内に減らしてください。")).toBeInTheDocument();
    expect(screen.getByLabelText(/やったこと/)).toHaveAttribute("aria-invalid", "true");
  });

  it("上限に近い間は従来の注意文を出す", () => {
    render(<DynamicField field={field} value="123456789" onChange={() => {}} />);
    expect(screen.getByText("文字数制限に近づいています")).toBeInTheDocument();
  });

  it("検証エラーを項目に紐づけて表示する", () => {
    render(<DynamicField field={field} value="" onChange={() => {}} error="この項目は必須です" />);
    const textarea = screen.getByLabelText(/やったこと/);
    const message = screen.getByText("この項目は必須です");
    expect(message).toHaveAttribute("role", "alert");
    expect(textarea.getAttribute("aria-describedby")).toContain(message.id);
    expect(textarea).toHaveAttribute("aria-invalid", "true");
  });

  it("必須の項目には、文字で「必須」と表示する", () => {
    render(<DynamicField field={{ ...field, required: true }} value="" onChange={() => {}} />);
    expect(screen.getByText("必須")).toBeInTheDocument();
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("必須でない項目には「必須」を表示しない", () => {
    render(<DynamicField field={{ ...field, required: false }} value="" onChange={() => {}} />);
    expect(screen.queryByText("必須")).not.toBeInTheDocument();
  });

  it("項目の説明があれば表示し、入力欄に紐づける", () => {
    render(
      <DynamicField
        field={{ ...field, description: "やめることを書く" }}
        value=""
        onChange={() => {}}
      />
    );
    const description = screen.getByText("やめることを書く");
    expect(screen.getByLabelText(/やったこと/).getAttribute("aria-describedby")).toContain(
      description.id
    );
  });

  it("他の項目のIDと同じ文字列になっても、説明のIDは衝突しない", () => {
    // 項目 "plan" の説明を、項目 "plan-description" の入力欄と取り違えない
    render(
      <>
        <DynamicField
          field={{ id: "plan", label: "計画", placeholder: "", description: "計画の説明" }}
          value=""
          onChange={() => {}}
        />
        <DynamicField
          field={{ id: "plan-description", label: "説明欄", placeholder: "" }}
          value=""
          onChange={() => {}}
        />
      </>
    );
    const description = screen.getByText("計画の説明");
    expect(document.querySelectorAll(`[id="${description.id}"]`)).toHaveLength(1);
    expect(screen.getByLabelText(/説明欄/).tagName).toBe("TEXTAREA");
  });

  it("項目の説明がなければ、説明の要素を出さない", () => {
    render(<DynamicField field={field} value="" onChange={() => {}} />);
    const describedBy = screen.getByLabelText(/やったこと/).getAttribute("aria-describedby") ?? "";
    expect(describedBy).not.toContain("description");
  });

  it("問題がなければ aria-invalid は false", () => {
    render(<DynamicField field={field} value="abc" onChange={() => {}} />);
    expect(screen.getByLabelText(/やったこと/)).toHaveAttribute("aria-invalid", "false");
  });

  it("絵文字は保存時の検証と同じ数え方（見た目1文字=1）で、超過と判定しない", () => {
    // UTF-16 では 2 文字ぶんだが、見た目は 1 文字
    const emoji = "😀".repeat(6);
    render(<DynamicField field={field} value={emoji} onChange={() => {}} />);
    expect(screen.getByText("6 / 10")).toBeInTheDocument();
    expect(screen.queryByText(/文字超えています/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/やったこと/)).toHaveAttribute("aria-invalid", "false");
  });

  it("上限超過時は、描画しないエラー要素のIDを aria-describedby に含めない", () => {
    render(
      <DynamicField field={field} value="12345678901234" onChange={() => {}} error="10文字以内で入力してください" />
    );
    const describedBy = screen.getByLabelText(/やったこと/).getAttribute("aria-describedby") ?? "";
    for (const id of describedBy.split(" ")) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("readOnly のときは、入力欄を読み取り専用にする", () => {
    render(<DynamicField field={field} value="abc" onChange={() => {}} readOnly />);
    expect(screen.getByLabelText(/やったこと/)).toHaveAttribute("readonly");
  });

  it("既定では編集できる", () => {
    render(<DynamicField field={field} value="abc" onChange={() => {}} />);
    expect(screen.getByLabelText(/やったこと/)).not.toHaveAttribute("readonly");
  });
});
