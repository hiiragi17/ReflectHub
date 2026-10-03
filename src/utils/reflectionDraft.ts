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

// clearAllDrafts() が呼ばれたかを見分けるための印。保存の途中・入力の待ち時間の途中で
// ログアウトのボタンが押されたかを、あとから確かめるために使う（セッション失効では変わらない）。
// 別のタブで押された場合も分かるよう、localStorage にも印を書く
// （キーの先頭が KEY_PREFIX ではないので、下書きの一括削除では消えない）
export const CLEAR_EPOCH_KEY = "reflecthub:reflection-draft-epoch";
let clearGeneration = 0;
export const getClearGeneration = (): string => {
  let stored = "";
  try {
    stored = localStorage.getItem(CLEAR_EPOCH_KEY) ?? "";
  } catch {
    // 使えないときは、このタブの中の印だけで見分ける
  }
  return `${clearGeneration}:${stored}`;
};

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
    localStorage.setItem(
      CLEAR_EPOCH_KEY,
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  } catch {
    // 使えないときは何もしない
  }
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // 使えないときは何もしない
  }
};

interface StoredDrafts {
  v: number;
  /** 型の ID → その型の下書きを最後に変更した時刻（有効期限は、型ごとに数える） */
  savedAt: Record<string, number>;
  drafts: ReflectionDrafts;
}

/** 保存されている形式を検証して読む。副作用はない。無い・壊れている場合は null */
const readStored = (userId: string): StoredDrafts | null => {
  const raw = localStorage.getItem(keyFor(userId));
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<StoredDrafts> | null;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    parsed.v !== STORAGE_VERSION ||
    typeof parsed.savedAt !== "object" ||
    parsed.savedAt === null ||
    !Object.values(parsed.savedAt).every((t) => typeof t === "number") ||
    !isDrafts(parsed.drafts)
  ) {
    return null;
  }
  return parsed as StoredDrafts;
};

/**
 * 下書きを保存する。入力が何もなければ、保存済みの下書きも消す。
 * 保存日時は型ごとに持ち、内容が変わっていない型は、前の日時のまま残す
 * （別の型を書き換えるたびに、ほかの型の有効期限が延び続けないようにする）
 */
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
    let previous: StoredDrafts | null = null;
    try {
      previous = readStored(userId);
    } catch {
      previous = null;
    }
    const savedAt: Record<string, number> = {};
    for (const [frameworkId, fields] of Object.entries(compacted)) {
      const unchanged =
        JSON.stringify(previous?.drafts[frameworkId]) === JSON.stringify(fields);
      const previousTime = previous?.savedAt[frameworkId];
      savedAt[frameworkId] =
        unchanged && typeof previousTime === "number" ? previousTime : now;
    }
    localStorage.setItem(
      keyFor(userId),
      JSON.stringify({ v: STORAGE_VERSION, savedAt, drafts: compacted })
    );
  } catch {
    // 容量超過・保存禁止など。入力は止めない
  }
};

/** 下書きを読み込む。無い・壊れている場合は null。期限切れの型は外す（何も残らなければ消す） */
export const loadDrafts = (
  userId: string,
  now: number = Date.now()
): ReflectionDrafts | null => {
  try {
    const stored = readStored(userId);
    if (!stored) {
      clearDrafts(userId);
      return null;
    }
    const alive: ReflectionDrafts = {};
    for (const [frameworkId, fields] of Object.entries(stored.drafts)) {
      const savedAt = stored.savedAt[frameworkId];
      if (typeof savedAt === "number" && now - savedAt <= DRAFT_TTL_MS) {
        alive[frameworkId] = fields;
      }
    }
    const drafts = compactDrafts(alive);
    if (Object.keys(drafts).length === 0) {
      clearDrafts(userId);
      return null;
    }
    // 期限切れの型が混ざっていたら、端末からも消す（保存日時は変えずに、残る型だけで書き直す）
    if (Object.keys(drafts).length !== Object.keys(stored.drafts).length) {
      const savedAt = Object.fromEntries(
        Object.keys(drafts).map((id) => [id, stored.savedAt[id]])
      );
      try {
        localStorage.setItem(
          keyFor(userId),
          JSON.stringify({ v: STORAGE_VERSION, savedAt, drafts })
        );
      } catch {
        // 書き直せなくても、有効な下書きは返す（片付けは、できたときだけ行う）
      }
    }
    return drafts;
  } catch {
    clearDrafts(userId);
    return null;
  }
};
