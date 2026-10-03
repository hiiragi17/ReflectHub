import { describe, it, expect } from "vitest";
import { getTodayInJst } from "./reflectionDate";

describe("getTodayInJst", () => {
  it("JST 0:00 の直前（UTC 14:59:59）は、まだ同じ日", () => {
    expect(getTodayInJst(new Date("2026-10-03T14:59:59Z"))).toBe("2026-10-03");
  });

  it("JST 0:00（UTC 15:00:00）で、次の日になる", () => {
    expect(getTodayInJst(new Date("2026-10-03T15:00:00Z"))).toBe("2026-10-04");
  });

  it("JST の朝 8:30（UTC 23:30）は、JST の日付（UTC では前日）", () => {
    // 8:30 JST = 前日 23:30 UTC。UTC の日付だと前日になるのが、元の不具合
    const now = new Date("2026-10-03T23:30:00Z");
    expect(now.toISOString().split("T")[0]).toBe("2026-10-03");
    expect(getTodayInJst(now)).toBe("2026-10-04");
  });

  it("JST 9:00（UTC 0:00）は、UTC の日付と同じ", () => {
    expect(getTodayInJst(new Date("2026-10-04T00:00:00Z"))).toBe("2026-10-04");
  });

  it("JST 8:59（UTC 23:59）は、JST の日付", () => {
    expect(getTodayInJst(new Date("2026-10-03T23:59:59Z"))).toBe("2026-10-04");
  });

  it("月またぎ", () => {
    expect(getTodayInJst(new Date("2026-10-31T15:00:00Z"))).toBe("2026-11-01");
  });

  it("年またぎ", () => {
    expect(getTodayInJst(new Date("2025-12-31T15:00:00Z"))).toBe("2026-01-01");
  });

  it("うるう日", () => {
    expect(getTodayInJst(new Date("2028-02-28T15:00:00Z"))).toBe("2028-02-29");
    expect(getTodayInJst(new Date("2028-02-29T15:00:00Z"))).toBe("2028-03-01");
  });

  it("引数なしでも、YYYY-MM-DD の形で返す", () => {
    expect(getTodayInJst()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
