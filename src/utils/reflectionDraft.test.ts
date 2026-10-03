import { describe, it, expect, beforeEach } from "vitest";
import {
  DRAFT_TTL_MS,
  clearAllDrafts,
  clearDrafts,
  loadDrafts,
  saveDrafts,
} from "./reflectionDraft";

beforeEach(() => {
  localStorage.clear();
});

describe("reflectionDraft", () => {
  it("保存した下書きを、同じユーザーが読み込める", () => {
    saveDrafts("u1", { f1: { y: "やったこと" } });
    expect(loadDrafts("u1")).toEqual({ f1: { y: "やったこと" } });
  });

  it("別のユーザーには、他人の下書きが見えない", () => {
    saveDrafts("u1", { f1: { y: "秘密" } });
    expect(loadDrafts("u2")).toBeNull();
  });

  it("空の項目・空の型は保存しない", () => {
    saveDrafts("u1", { f1: { y: "", w: "気づき" }, f2: { a: "" } });
    expect(loadDrafts("u1")).toEqual({ f1: { w: "気づき" } });
  });

  it("入力が何もなければ、保存済みの下書きも消える", () => {
    saveDrafts("u1", { f1: { y: "a" } });
    saveDrafts("u1", { f1: { y: "" } });
    expect(loadDrafts("u1")).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("有効期限を過ぎた下書きは読み込まず、消える", () => {
    const savedAt = 1_000_000;
    saveDrafts("u1", { f1: { y: "a" } }, savedAt);
    expect(loadDrafts("u1", savedAt + DRAFT_TTL_MS)).not.toBeNull();
    expect(loadDrafts("u1", savedAt + DRAFT_TTL_MS + 1)).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("壊れたデータは null を返して消す", () => {
    localStorage.setItem("reflecthub:reflection-draft:u1", "{not json");
    expect(loadDrafts("u1")).toBeNull();
    localStorage.setItem(
      "reflecthub:reflection-draft:u1",
      JSON.stringify({ v: 1, savedAt: Date.now(), drafts: { f1: { y: 1 } } })
    );
    expect(loadDrafts("u1")).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it("clearDrafts は指定したユーザーだけ、clearAllDrafts は全員分を消す", () => {
    saveDrafts("u1", { f1: { y: "a" } });
    saveDrafts("u2", { f1: { y: "b" } });
    localStorage.setItem("sb-session", "keep");
    clearDrafts("u1");
    expect(loadDrafts("u1")).toBeNull();
    expect(loadDrafts("u2")).not.toBeNull();
    clearAllDrafts();
    expect(loadDrafts("u2")).toBeNull();
    expect(localStorage.getItem("sb-session")).toBe("keep");
  });

  it("localStorage が使えなくても、例外を出さない", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      expect(() => saveDrafts("u1", { f1: { y: "a" } })).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
