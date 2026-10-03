import { describe, it, expect } from "vitest";
import { getSaveErrorMessage, classifySaveError } from "./reflectionSaveError";

describe("getSaveErrorMessage", () => {
  it("認証エラーでは再ログインの案内を出す", () => {
    const msg = getSaveErrorMessage({ code: "AUTH_ERROR", message: "Unauthorized" });
    expect(msg).toContain("ログイン");
    expect(msg).toContain("入力内容は画面に残っています");
  });

  it("USER_NOT_AUTHENTICATED も認証エラーとして扱う", () => {
    expect(getSaveErrorMessage({ code: "USER_NOT_AUTHENTICATED" })).toContain("ログイン");
  });

  it("オフラインなら通信エラーの案内を出す", () => {
    expect(getSaveErrorMessage({ message: "whatever" }, false)).toContain("通信に失敗");
  });

  it("fetch 失敗メッセージは通信エラーとして扱う", () => {
    expect(getSaveErrorMessage({ message: "TypeError: Failed to fetch" })).toContain("通信に失敗");
  });

  it("その他は汎用文言で、生のメッセージを含めない", () => {
    const msg = getSaveErrorMessage({ code: "23505", message: "duplicate key value" });
    expect(msg).toContain("保存できませんでした");
    expect(msg).not.toContain("duplicate key");
    expect(msg).toContain("入力内容は画面に残っています");
  });

  it("null / undefined でも落ちない", () => {
    expect(getSaveErrorMessage(null)).toContain("保存できませんでした");
    expect(getSaveErrorMessage(undefined)).toContain("保存できませんでした");
  });
});

describe("classifySaveError", () => {
  it("認証エラーは authentication", () => {
    expect(classifySaveError({ code: "AUTH_ERROR" })).toBe("authentication");
    expect(classifySaveError({ code: "USER_NOT_AUTHENTICATED" })).toBe("authentication");
  });

  it("オフラインは offline、fetch 失敗は network", () => {
    expect(classifySaveError({ message: "x" }, false)).toBe("offline");
    expect(classifySaveError({ message: "TypeError: Failed to fetch" })).toBe("network");
  });

  it("その他は server", () => {
    expect(classifySaveError({ code: "23505", message: "duplicate key" })).toBe("server");
    expect(classifySaveError(null)).toBe("server");
  });
});
