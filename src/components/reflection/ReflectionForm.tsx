"use client";

import React, { useEffect } from "react";
import { useFrameworkStore } from "@/stores/frameworkStore";
import { useReflectionForm } from "@/hooks/useReflectionForm";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Check } from "lucide-react";
import DynamicField from "@/components/reflection/DynamicField";

export default function ReflectionForm() {
  const selectedFramework = useFrameworkStore(
    (state) => state.selectedFramework
  );

  const {
    formData,
    isSubmitting,
    submitStatus,
    errorMessage,
    updateField,
    resetForm,
    setSubmitStatus,
    setErrorMessage,
    setIsSubmitting,
  } = useReflectionForm();

  // フレームワーク変更時に フォームをリセット
  useEffect(() => {
    resetForm();
  }, [selectedFramework?.id, resetForm]);

  if (!selectedFramework) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>フレームワークを選択してください</p>
      </div>
    );
  }

  const schema = selectedFramework.schema || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const missingFields = schema
      .filter((field) => {
        const value = formData[field.id];
        return (
          field.required &&
          (value == null || (typeof value === "string" && value.trim() === ""))
        );
      })
      .map((field) => field.label);

    if (missingFields.length > 0) {
      setErrorMessage(`以下の項目は必須です: ${missingFields.join(", ")}`);
      setSubmitStatus("error");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Supabaseに保存するロジックをここに実装
      console.log("保存データ:", {
        framework_id: selectedFramework.id,
        content: formData,
        created_at: new Date().toISOString(),
      });

      // 一時的な遅延（実装完了後に削除）
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitStatus("success");
      resetForm();

      // 3秒後にメッセージをクリア
      setTimeout(() => {
        setSubmitStatus("idle");
      }, 3000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "保存に失敗しました"
      );
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* エラーメッセージ */}
      {submitStatus === "error" && errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* 成功メッセージ */}
      {submitStatus === "success" && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">振り返りを保存しました!</p>
        </div>
      )}

      {/* 動的フィールド */}
      <div className="space-y-4">
        {schema.map((field) => (
          <DynamicField
            key={field.id}
            field={field}
            value={formData[field.id] || ""}
            onChange={(value) => updateField(field.id, value)}
          />
        ))}
      </div>

      {/* 保存ボタン */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            "振り返りを保存"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            setSubmitStatus("idle");
          }}
          disabled={isSubmitting}
        >
          クリア
        </Button>
      </div>

      {/* ヒント */}
      <p className="text-xs text-gray-500">
        完璧である必要はありません。思ったことを気軽に記入してください。
      </p>
    </form>
  );
}
