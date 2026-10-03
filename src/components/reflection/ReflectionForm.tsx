"use client";

import React, {
  useEffect,
  useState,
  useReducer,
  useRef,
} from "react";
import { useFrameworkStore } from "@/stores/frameworkStore";
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
  const [isSlowSave, setIsSlowSave] = useState(false);
  const previousFrameworkIdRef = useRef<string | null>(null);
  // state の更新は再描画後に反映されるため、連打対策は ref で同期的に行う
  const isSubmittingRef = useRef(false);
  // 保存が終わった時点で、どの型を表示しているか（保存中に型を切り替えられるため）
  const currentFrameworkIdRef = useRef(selectedFrameworkId);
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
    Object.entries(cacheRef.current).some(
      ([frameworkId, data]) =>
        frameworks.some((f) => f.id === frameworkId) &&
        Object.values(data).some((value) => value !== "")
    );

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

    const submittedData = pickSchemaFields(formData, currentSchema);
    const isValid = validateFormData(submittedData, currentSchema);
    if (!isValid) return;

    isSubmittingRef.current = true;
    setIsSaved(false);
    clearError();

    try {
      const result = await saveReflection({
        framework_id: savedFrameworkId,
        content: sanitizeFormData(submittedData),
        reflection_date: new Date().toISOString().split("T")[0],
      });

      if (result) {
        // 送信した型の下書きは保存済みなので、キャッシュからも消す
        delete cacheRef.current[savedFrameworkId];
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

  const handleReset = () => {
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
      {mutationError && (
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
