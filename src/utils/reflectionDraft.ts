/**
 * 書きかけの振り返り（下書き）を、ブラウザの localStorage に残す。
 *
 * - キーはユーザーごとに分け、別のユーザーには見せない
 * - 有効期限（DRAFT_TTL_MS）を過ぎた下書きは、読み込み時に捨てる
 * - ログアウトのときは clearAllDrafts() で、この端末の下書きをすべて消す
 * - localStorage が使えない・満杯のときは、何もせず黙って諦める（入力そのものは止めない）
 */

/** 型の ID → { 項目の ID → 入力 } */
export type ReflectionDrafts = Record<string, Record<string, string>>;

const KEY_PREFIX = "reflecthub:reflection-draft:";
const STORAGE_VERSION = 1;

/** 下書きを残しておく期間（7日） */
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const draftStorageKey = (userId: string) => `${KEY_PREFIX}${userId}`;
const keyFor = draftStorageKey;

// clearAllDrafts() を呼ぶたびに増える。保存の途中・入力の待ち時間の途中でログアウトのボタンが
// 押されたかを、あとから見分けるために使う（セッション失効では増えない）
let clearGeneration = 0;
export const getClearGeneration = () => clearGeneration;

const isDrafts = (value: unknown): value is ReflectionDrafts => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(
    (fields) =>
      typeof fields === "object" &&
      fields !== null &&
      !Array.isArray(fields) &&
      Object.values(fields).every((v) => typeof v === "string")
  );
};

/** 入力のある項目だけを残す。何も残らない型は外す */
export const compactDrafts = (drafts: ReflectionDrafts): ReflectionDrafts => {
  const result: ReflectionDrafts = {};
  for (const [frameworkId, fields] of Object.entries(drafts)) {
    const filled = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== "")
    );
    if (Object.keys(filled).length > 0) {
      result[frameworkId] = filled;
    }
  }
  return result;
};

export const clearDrafts = (userId: string): void => {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // 使えないときは何もしない
  }
};

/** この端末に残っている、すべてのユーザーの下書きを消す（ログアウト用） */
export const clearAllDrafts = (): void => {
  clearGeneration += 1;
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // 使えないときは何もしない
  }
};

/** 下書きを保存する。入力が何もなければ、保存済みの下書きも消す */
export const saveDrafts = (
  userId: string,
  drafts: ReflectionDrafts,
  now: number = Date.now()
): void => {
  const compacted = compactDrafts(drafts);
  if (Object.keys(compacted).length === 0) {
    clearDrafts(userId);
    return;
  }
  try {
    localStorage.setItem(
      keyFor(userId),
      JSON.stringify({ v: STORAGE_VERSION, savedAt: now, drafts: compacted })
    );
  } catch {
    // 容量超過・保存禁止など。入力は止めない
  }
};

/** 下書きを読み込む。無い・期限切れ・壊れている場合は null（不要な保存は消す） */
export const loadDrafts = (
  userId: string,
  now: number = Date.now()
): ReflectionDrafts | null => {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { v?: unknown }).v !== STORAGE_VERSION ||
      typeof (parsed as { savedAt?: unknown }).savedAt !== "number" ||
      now - (parsed as { savedAt: number }).savedAt > DRAFT_TTL_MS ||
      !isDrafts((parsed as { drafts?: unknown }).drafts)
    ) {
      clearDrafts(userId);
      return null;
    }
    const drafts = compactDrafts((parsed as { drafts: ReflectionDrafts }).drafts);
    if (Object.keys(drafts).length === 0) {
      clearDrafts(userId);
      return null;
    }
    return drafts;
  } catch {
    clearDrafts(userId);
    return null;
  }
};
