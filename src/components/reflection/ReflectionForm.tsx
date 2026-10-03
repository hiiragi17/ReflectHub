"use client";

import React, {
  useEffect,
  useState,
  useReducer,
  useRef,
  useCallback,
} from "react";
import { useFrameworkStore } from "@/stores/frameworkStore";
import { useAuthStore } from "@/stores/authStore";
import { useValidation } from "@/hooks/useValidation";
import { useReflectionMutation } from "@/hooks/useReflectionMutation";
import DynamicField from "./DynamicField";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getSaveErrorMessage } from "@/utils/reflectionSaveError";
import { hasAtLeastOneValue } from "@/utils/validation";
import { getTodayInJst } from "@/utils/reflectionDate";
import { v4 as uuidv4 } from "uuid";
import {
  type ReflectionDrafts,
  clearDrafts,
  compactDrafts,
  draftStorageKey,
  getClearGeneration,
  loadDrafts,
  saveDrafts,
} from "@/utils/reflectionDraft";

export const LEAVE_CONFIRM_MESSAGE =
  "入力内容はまだ保存されていません。このページを離れると消えます。離れますか？";

/**
 * 入力のうち、いま表示している型の項目だけを取り出す。
 * 再読み込みで型の項目が変わると、消えた項目の入力が formData に残る。
 * それを検証や保存に含めると、画面に見えない内容が保存されてしまう。
 */
const pickSchemaFields = (
  data: Record<string, string>,
  schema: ReadonlyArray<{ id: string }>
): Record<string, string> => {
  const ids = new Set(schema.map((field) => field.id));
  return Object.fromEntries(Object.entries(data).filter(([id]) => ids.has(id)));
};

// 入力が止まってから、下書きをブラウザに保存するまでの時間
const DRAFT_SAVE_DEBOUNCE_MS = 500;

// 保存が長引いたときに「止まっていない」ことを伝えるまでの時間
const SLOW_SAVE_NOTICE_MS = 5000;

interface ReflectionFormProps {
  /**
   * 未保存の入力があるかが変わったときに呼ばれる。
   * ページ側が、リンク以外の離脱（ログアウトのボタンなど）に確認を出すために使う。
   */
  onUnsavedChange?: (hasUnsaved: boolean) => void;
}

export default function ReflectionForm({ onUnsavedChange }: ReflectionFormProps = {}) {
  const { selectedFrameworkId, selectedFramework, frameworks } =
    useFrameworkStore();

  const {
    validateFormData,
    validateSingleField,
    sanitizeFormData,
    errors,
    clearErrors,
    clearFieldError,
  } = useValidation();
  const {
    saveReflection,
    isLoading,
    error: mutationError,
    clearError,
  } = useReflectionMutation();

  const cacheRef = useRef<Record<string, Record<string, string>>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  // 保存を試した型。保存中に別の型へ切り替えても、失敗の案内を別の型の下に出さないために使う
  const [submittedFrameworkId, setSubmittedFrameworkId] = useState<string | null>(null);
  const [isSlowSave, setIsSlowSave] = useState(false);
  const previousFrameworkIdRef = useRef<string | null>(null);
  // state の更新は再描画後に反映されるため、連打対策は ref で同期的に行う
  const isSubmittingRef = useRef(false);
  // 冪等性キー。失敗後の再試行では同じキーを送り、サーバーに届いていた保存が二重にならないようにする。
  // 型と入力内容の組ごとに保持する（別の型の保存を挟んでも、元の型の再試行で同じキーを使える）。
  // 入力内容か型が変わったら別の振り返りとして扱うので、別のキーになる
  const idempotencyKeysRef = useRef<Map<string, string>>(new Map());
  // 保存が終わった時点で、どの型を表示しているか（保存中に型を切り替えられるため）
  const currentFrameworkIdRef = useRef(selectedFrameworkId);
  // 下書きの自動保存（ブラウザの localStorage）。ユーザーごとに分けて保存する
  const userId = useAuthStore((state) => state.user?.id);
  // 前回の下書きが残っているとき、復元するか確認するまで入れておく
  const [pendingDraft, setPendingDraft] = useState<ReflectionDrafts | null>(null);
  // 前回の下書きを調べ終えたか（調べる前に、空の入力で保存済みの下書きを消さないため）
  const [draftLoaded, setDraftLoaded] = useState(false);
  const lastPersistedRef = useRef<string | null>(null);
  const pendingWriteRef = useRef<{
    userId: string;
    drafts: ReflectionDrafts;
    serialized: string;
    clearGeneration: string;
  } | null>(null);
  // このタブで入力した（または復元・確認した）型。ほかのタブが書いた型を、書き換えで消さないために使う
  const touchedFrameworksRef = useRef<Set<string>>(new Set());
  // キャッシュ（ref）だけを書き換えたとき、未保存の判定を取り直すための再描画
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  // いま表示している型の項目だけを対象にする（消えた項目の入力は、見えないので数えない）
  const currentSchema = selectedFramework?.schema ?? [];
  const visibleData = pickSchemaFields(formData, currentSchema);
  const hasInput = Object.values(visibleData).some((value) => value !== "");
  // 表示中の型だけでなく、切り替え前に書いた別の型の入力（キャッシュ）も未保存として扱う。
  // 再読み込みで一覧から消えた型の下書きは、選べず、保存も消去もできないので数えない
  // （数えると、離脱の確認が消えなくなる）
  const hasUnsavedInput =
    hasInput ||
    Object.entries(cacheRef.current).some(([frameworkId, data]) => {
      const cachedFramework = frameworks.find((f) => f.id === frameworkId);
      // 一覧にない型、または、その型の現在の項目にない入力は、見えないので数えない
      return (
        !!cachedFramework &&
        Object.values(pickSchemaFields(data, cachedFramework.schema ?? [])).some(
          (value) => value !== ""
        )
      );
    });

  useEffect(() => {
    if (!selectedFrameworkId) return;

    const previousId = previousFrameworkIdRef.current;

    if (!previousId) {
      const cached = cacheRef.current[selectedFrameworkId];
      delete cacheRef.current[selectedFrameworkId];
      setFormData(cached || {});
      clearErrors();
      previousFrameworkIdRef.current = selectedFrameworkId;
      return;
    }

    if (previousId !== selectedFrameworkId) {
      if (Object.keys(formData).length > 0) {
        cacheRef.current[previousId] = formData;
      }
      // 別の型に切り替えたら「保存しました」は消す
      // （戻した型の未保存の下書きが、保存済みに見えないように）
      setIsSaved(false);

      // 戻ってきた型の入力は formData が持つので、キャッシュには残さない
      // （残すと、あとで消しても「未保存の入力あり」と誤判定する）
      const cached = cacheRef.current[selectedFrameworkId];
      delete cacheRef.current[selectedFrameworkId];
      setFormData(cached || {});
      clearErrors();
      previousFrameworkIdRef.current = selectedFrameworkId;
    }
  }, [selectedFrameworkId, clearErrors, formData]);

  useEffect(() => {
    currentFrameworkIdRef.current = selectedFrameworkId;
  }, [selectedFrameworkId]);

  // ユーザーが決まったら、前回の下書きがあるか調べる
  useEffect(() => {
    lastPersistedRef.current = null;
    pendingWriteRef.current = null;
    touchedFrameworksRef.current = new Set();
    if (!userId) {
      setPendingDraft(null);
      setDraftLoaded(false);
      return;
    }
    const stored = loadDrafts(userId);
    setPendingDraft(stored);
    setDraftLoaded(true);
    // 読み込んだだけの下書きは、書き直さない（書き直すと保存日時が更新され、有効期限が延び続ける）
    lastPersistedRef.current = stored ? JSON.stringify(stored) : null;
  }, [userId]);

  // 別のタブで下書きが保存・破棄されたら、確認の表示を読み直す
  // （古い下書きを復元して、同じ内容を二重に保存しないため）
  useEffect(() => {
    if (!userId || !pendingDraft) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== draftStorageKey(userId)) return;
      const latest = loadDrafts(userId);
      setPendingDraft(latest);
      lastPersistedRef.current = latest ? JSON.stringify(latest) : null;
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [userId, pendingDraft]);

  const flushDraft = useCallback(() => {
    const pending = pendingWriteRef.current;
    pendingWriteRef.current = null;
    // ログアウトのボタンで下書きが消された後には、書き戻さない。
    // セッション失効による自動のログアウトでは消されないので、最後の入力も保存する
    if (!pending || pending.clearGeneration !== getClearGeneration()) return;
    // ほかのタブが書いた、このタブでは触っていない型の下書きは、残す
    const merged: ReflectionDrafts = { ...pending.drafts };
    const stored = loadDrafts(pending.userId);
    for (const [frameworkId, data] of Object.entries(stored ?? {})) {
      if (!touchedFrameworksRef.current.has(frameworkId) && !(frameworkId in merged)) {
        merged[frameworkId] = data;
      }
    }
    saveDrafts(pending.userId, merged);
    lastPersistedRef.current = pending.serialized;
  }, []);

  // 入力のたびに、少し待ってから下書きを保存する（毎回の描画で、変化があるときだけ）
  useEffect(() => {
    if (!userId || !draftLoaded || frameworks.length === 0 || !selectedFrameworkId) {
      return;
    }
    const all: ReflectionDrafts = {
      ...cacheRef.current,
      [selectedFrameworkId]: formData,
    };
    // 一覧にない型・いまの項目にない入力は、見えないので残さない
    const visible: ReflectionDrafts = {};
    for (const [frameworkId, data] of Object.entries(all)) {
      const framework = frameworks.find((f) => f.id === frameworkId);
      if (framework) {
        visible[frameworkId] = pickSchemaFields(data, framework.schema ?? []);
      }
    }
    // 復元の確認に答えるまでは、前回の下書きを残したまま、新しい入力を重ねて保存する
    // （新しい入力が優先。確認の前に閉じても、どちらも失わない）
    const merged: ReflectionDrafts = { ...(pendingDraft ?? {}) };
    for (const [frameworkId, data] of Object.entries(compactDrafts(visible))) {
      merged[frameworkId] = { ...merged[frameworkId], ...data };
    }
    const drafts = compactDrafts(merged);
    Object.keys(drafts).forEach((id) => touchedFrameworksRef.current.add(id));
    const serialized = JSON.stringify(drafts);
    if (serialized === lastPersistedRef.current) {
      pendingWriteRef.current = null;
      return;
    }
    pendingWriteRef.current = {
      userId,
      drafts,
      serialized,
      clearGeneration: getClearGeneration(),
    };
    const timer = setTimeout(flushDraft, DRAFT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  // タブを隠す・閉じる・ページを離れるときは、待たずに保存する
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", flushDraft);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", flushDraft);
      flushDraft();
    };
  }, [flushDraft]);

  useEffect(() => {
    onUnsavedChange?.(hasUnsavedInput);
  }, [hasUnsavedInput, onUnsavedChange]);

  useEffect(() => {
    return () => onUnsavedChange?.(false);
  }, [onUnsavedChange]);

  useEffect(() => {
    if (!isLoading) {
      setIsSlowSave(false);
      return;
    }
    const timer = setTimeout(() => setIsSlowSave(true), SLOW_SAVE_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // 未保存の入力があるままページを離れようとしたとき、確認を出す。
  // beforeunload は再読み込み・タブを閉じる・外部サイトへの移動だけが対象で、
  // Next.js のリンク遷移（ヘッダーの履歴・統計など）では発火しないため、
  // アプリ内リンクのクリックも別途検知する。
  useEffect(() => {
    if (!hasUnsavedInput) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    const handleLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      const isSamePage =
        url.pathname === window.location.pathname &&
        url.search === window.location.search;
      if (url.origin !== window.location.origin || isSamePage) return;

      if (!window.confirm(LEAVE_CONFIRM_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    // キャプチャ段階で受けて、Next.js の Link による遷移より先に止める
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [hasUnsavedInput]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setIsSaved(false);

    // 保存時のエラーが出ている項目だけ、入力のたびに検証し直す。
    // 直れば消え、まだ不正（空白だけ・HTML・使えない文字など）なら残る。
    // エラーのない項目は、入力途中で検証しない（保存時に検証する）
    const fieldSchema = selectedFramework?.schema?.find((f) => f.id === fieldId);
    if (errors[fieldId] && fieldSchema) {
      validateSingleField(fieldId, value, fieldSchema);
    }
    // 「どれか1つ以上入力」のエラーは、空白でない入力ができたときに消す
    if (
      errors["__form__"] &&
      hasAtLeastOneValue(
        pickSchemaFields({ ...formData, [fieldId]: value }, currentSchema)
      )
    ) {
      clearFieldError("__form__");
    }

    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSave = async () => {
    if (isSubmittingRef.current) return;
    if (!selectedFrameworkId || !selectedFramework) return;
    const savedFrameworkId = selectedFrameworkId;
    const clearGenerationAtStart = getClearGeneration();

    const submittedData = pickSchemaFields(formData, currentSchema);
    const isValid = validateFormData(submittedData, currentSchema);
    if (!isValid) return;

    isSubmittingRef.current = true;
    setIsSaved(false);
    setSubmittedFrameworkId(savedFrameworkId);
    clearError();

    const content = sanitizeFormData(submittedData);
    const signature = `${savedFrameworkId}:${JSON.stringify(content)}`;
    // 同じ型で別の入力を送るなら、前の入力の再試行は終わり。あとで元の内容に戻して送っても、別の振り返りとして扱う
    for (const previous of idempotencyKeysRef.current.keys()) {
      if (previous.startsWith(`${savedFrameworkId}:`) && previous !== signature) {
        idempotencyKeysRef.current.delete(previous);
      }
    }
    const idempotencyKey = idempotencyKeysRef.current.get(signature) ?? uuidv4();
    idempotencyKeysRef.current.set(signature, idempotencyKey);

    try {
      const result = await saveReflection({
        framework_id: savedFrameworkId,
        content,
        reflection_date: getTodayInJst(),
        idempotency_key: idempotencyKey,
      });

      if (result) {
        // 保存できたので、次の振り返りは別のキーにする
        idempotencyKeysRef.current.delete(signature);
        // 送信した型の下書きは保存済みなので、キャッシュからも消す
        delete cacheRef.current[savedFrameworkId];
        // 復元の確認に答えないまま保存したとき、保存済みの型の下書きを、確認と保存済みの下書きから外す
        // （残すと、保存した内容を復元して、二重に保存できてしまう）
        // ただし、保存の途中でログアウトのボタンが押されていたら、何も書かない（下書きを端末に戻さない）
        if (
          userId &&
          pendingDraft &&
          getClearGeneration() === clearGenerationAtStart
        ) {
          const remaining = compactDrafts(
            Object.fromEntries(
              Object.entries(pendingDraft).filter(([id]) => id !== savedFrameworkId)
            )
          );
          saveDrafts(userId, remaining);
          setPendingDraft(Object.keys(remaining).length > 0 ? remaining : null);
        }
        if (currentFrameworkIdRef.current === savedFrameworkId) {
          setFormData({});
          clearErrors();
          setIsSaved(true);
        } else {
          // 保存中に別の型へ切り替えた。いま表示中の型の下書きは消さない
          forceRender();
        }
      }
    } catch {
      // エラー内容は useReflectionMutation の error に保持され、下で表示する
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    for (const [frameworkId, data] of Object.entries(pendingDraft)) {
      if (frameworkId === selectedFrameworkId) {
        // 確認を待つ間に入力した内容を優先し、空の項目だけ下書きで埋める
        setFormData((prev) => ({ ...data, ...compactDrafts({ _: prev })._ }));
      } else {
        cacheRef.current[frameworkId] = {
          ...data,
          ...cacheRef.current[frameworkId],
        };
      }
    }
    setPendingDraft(null);
    forceRender();
  };

  const handleDiscardDraft = () => {
    if (userId) clearDrafts(userId);
    setPendingDraft(null);
  };

  const handleReset = () => {
    // 消去は、いま表示中の型の、それまでの送信の再試行を終えること。同じ内容を入れ直しても、別の振り返りとして扱う。
    // 別の型の下書き（キャッシュ）に残る再試行のキーは、消さない
    for (const signature of idempotencyKeysRef.current.keys()) {
      if (signature.startsWith(`${selectedFrameworkId}:`)) {
        idempotencyKeysRef.current.delete(signature);
      }
    }
    setFormData({});
    clearErrors();
    setIsSaved(false);
    clearError();
  };

  if (!selectedFramework) {
    return (
      <div className="text-center p-4">フレームワークを選択してください</div>
    );
  }

  const formLevelError = errors["__form__"];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 前回の下書きの復元 */}
      {pendingDraft && (
        <div
          role="region"
          aria-label="前回の下書き"
          className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm"
        >
          <p className="font-medium text-blue-900">
            前回の書きかけの下書きがあります
            {(() => {
              const names = Object.keys(pendingDraft)
                .map((id) => frameworks.find((f) => f.id === id)?.name)
                .filter(Boolean);
              return names.length > 0 ? `（${names.join("、")}）` : "";
            })()}
          </p>
          <p className="mt-1 text-blue-900">復元しますか？</p>
          <div className="mt-3 flex gap-3">
            <Button type="button" size="sm" onClick={handleRestoreDraft}>
              復元する
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDiscardDraft}
            >
              破棄する
            </Button>
          </div>
        </div>
      )}

      {/* 入力フォーム */}
      <div className="space-y-6">
        {selectedFramework.schema?.map((field, index) => (
          <div key={field.id}>
            <DynamicField
              field={field}
              value={formData[field.id] || ""}
              onChange={(value) => handleFieldChange(field.id, value)}
              fieldIndex={index}
              error={errors[field.id]}
              readOnly={isLoading}
            />
          </div>
        ))}
      </div>

      {/* フォーム全体のエラー表示 */}
      {formLevelError && (
        <div
          role="alert"
          className="mt-6 p-4 bg-amber-50 border-2 border-amber-300 rounded text-sm"
        >
          <p className="text-amber-900 font-medium flex items-center gap-2">
            <span>⚠️</span>
            {formLevelError}
          </p>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 mt-6">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          aria-busy={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              保存しています…
            </>
          ) : (
            "保存する"
          )}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isLoading || !hasInput}>
              入力をすべて消す
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>入力内容をすべて消しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                いま表示している「{selectedFramework.name}
                」の入力欄がすべて空になります。消した内容は元に戻せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                すべて消す
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* 保存の状態（読み上げ対象。常に配置して内容だけ切り替える） */}
      <div role="status" aria-live="polite">
        {isLoading && (
          <p className="mt-4 text-sm text-gray-700">
            {isSlowSave
              ? "通信に時間がかかっています。保存が終わるまで、このページを閉じずにお待ちください。"
              : "保存しています。このページを閉じずにお待ちください。"}
          </p>
        )}
        {isSaved && (
          <div className="mt-4 p-4 rounded text-sm bg-green-50 text-green-900 border border-green-200">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              保存しました
            </p>
            <p className="mt-1">
              入力欄は空になりました。保存した内容は
              <Link href="/history" className="underline font-medium">
                履歴
              </Link>
              で見られます。
            </p>
          </div>
        )}
      </div>

      {/* 保存失敗（原因と次の行動。詳細は画面に出さない） */}
      {mutationError &&
        (submittedFrameworkId === null ||
          submittedFrameworkId === selectedFrameworkId) && (
        <div
          role="alert"
          className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-sm"
        >
          <p className="flex items-start gap-2 text-red-900 font-medium">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {getSaveErrorMessage(
                mutationError,
                typeof navigator === "undefined" ? true : navigator.onLine
              )}
            </span>
          </p>
        </div>
      )}

      {/* 入力の注意（入力前から常に表示し、レイアウトが動かないようにする） */}
      <ul className="mt-4 space-y-1 text-sm text-gray-700 list-disc pl-5">
        <li>どれか1つの項目に入力すれば保存できます。</li>
        <li>
          保存する前にページを閉じたり再読み込みしたりすると、入力内容は消えます。
        </li>
      </ul>
    </div>
  );
}
