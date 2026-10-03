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

  it("問題がなければ aria-invalid は false", () => {
    render(<DynamicField field={field} value="abc" onChange={() => {}} />);
    expect(screen.getByLabelText(/やったこと/)).toHaveAttribute("aria-invalid", "false");
  });
});
