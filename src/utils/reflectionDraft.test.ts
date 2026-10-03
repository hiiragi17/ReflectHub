import { describe, it, expect, beforeEach } from "vitest";
import {
  CLEAR_EPOCH_KEY,
  DRAFT_TTL_MS,
  clearAllDrafts,
  clearDrafts,
  getClearGeneration,
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

  it("有効期限は型ごとに数え、ほかの型を書き換えても延びない", () => {
    const t0 = 1_000_000;
    const day = 24 * 60 * 60 * 1000;
    saveDrafts("u1", { f1: { y: "古い入力" } }, t0);
    // 6日後に、別の型を足して保存（f1 は変わっていない）
    saveDrafts("u1", { f1: { y: "古い入力" }, f2: { a: "新しい入力" } }, t0 + 6 * day);
    // f1 は最初の保存から7日を過ぎ、f2 はまだ有効
    expect(loadDrafts("u1", t0 + 7 * day + 1)).toEqual({ f2: { a: "新しい入力" } });
  });

  it("期限切れの型が混ざっていたら、読み込んだときに端末からも消える（残る型の保存日時は変わらない）", () => {
    const t0 = 1_000_000;
    const day = 24 * 60 * 60 * 1000;
    saveDrafts("u1", { f1: { y: "古い入力" } }, t0);
    saveDrafts("u1", { f1: { y: "古い入力" }, f2: { a: "新しい入力" } }, t0 + 6 * day);
    expect(loadDrafts("u1", t0 + 7 * day + 1)).toEqual({ f2: { a: "新しい入力" } });
    const raw = JSON.parse(localStorage.getItem("reflecthub:reflection-draft:u1") ?? "{}");
    expect(raw.drafts).toEqual({ f2: { a: "新しい入力" } });
    expect(raw.savedAt).toEqual({ f2: t0 + 6 * day });
  });

  it("期限切れの型の片付け（書き直し）に失敗しても、有効な下書きは返す", () => {
    const t0 = 1_000_000;
    const day = 24 * 60 * 60 * 1000;
    saveDrafts("u1", { f1: { y: "古い入力" } }, t0);
    saveDrafts("u1", { f1: { y: "古い入力" }, f2: { a: "新しい入力" } }, t0 + 6 * day);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("write restricted");
    };
    try {
      expect(loadDrafts("u1", t0 + 7 * day + 1)).toEqual({ f2: { a: "新しい入力" } });
    } finally {
      Storage.prototype.setItem = original;
    }
    // 保存済みの記録は消えていない
    expect(localStorage.getItem("reflecthub:reflection-draft:u1")).not.toBeNull();
  });

  it("内容を変えた型は、変えた時刻から数え直す", () => {
    const t0 = 1_000_000;
    const day = 24 * 60 * 60 * 1000;
    saveDrafts("u1", { f1: { y: "入力" } }, t0);
    saveDrafts("u1", { f1: { y: "入力を直した" } }, t0 + 6 * day);
    expect(loadDrafts("u1", t0 + 7 * day + 1)).toEqual({ f1: { y: "入力を直した" } });
  });

  it("壊れたデータは null を返して消す", () => {
    localStorage.setItem("reflecthub:reflection-draft:u1", "{not json");
    expect(loadDrafts("u1")).toBeNull();
    localStorage.setItem(
      "reflecthub:reflection-draft:u1",
      JSON.stringify({ v: 1, savedAt: { f1: Date.now() }, drafts: { f1: { y: 1 } } })
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

  it("clearAllDrafts を呼ぶたびに世代が進み、clearDrafts では進まない", () => {
    const before = getClearGeneration();
    clearDrafts("u1");
    expect(getClearGeneration()).toBe(before);
    clearAllDrafts();
    expect(getClearGeneration()).not.toBe(before);
  });

  it("別のタブの clearAllDrafts も、世代の変化として分かる。印は下書きの一括削除で消えない", () => {
    const before = getClearGeneration();
    localStorage.setItem(CLEAR_EPOCH_KEY, "other-tab");
    expect(getClearGeneration()).not.toBe(before);
    saveDrafts("u1", { f1: { y: "a" } });
    clearAllDrafts();
    expect(localStorage.getItem(CLEAR_EPOCH_KEY)).not.toBeNull();
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
