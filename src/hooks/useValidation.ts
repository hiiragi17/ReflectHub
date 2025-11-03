'use client';

import { useState, useCallback } from 'react';
import { validateForm, validateField, sanitizeHtml, ValidationError } from '@/utils/validation';

export interface ValidationState {
  errors: Record<string, string>; // fieldId -> errorMessage
  isValid: boolean;
}

interface SchemaField {
  id: string;
  label?: string;
  required?: boolean;
  max_length?: number;
}

export const useValidation = () => {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    isValid: true,
  });

  const validateFormData = useCallback(
    (
      formData: Record<string, string>,
      schema: SchemaField[]
    ): boolean => {
      const normalizedSchema = schema.map((field) => ({
        id: field.id,
        label: field.label ?? '',
        required: field.required ?? false,
        max_length: field.max_length ?? 1000,
      }));
      const result = validateForm(formData, normalizedSchema);

      // エラーを fieldId -> message のマップに変換
      const errorMap: Record<string, string> = {};
      result.errors.forEach((error: ValidationError) => {
        errorMap[error.field] = error.message;
      });

      setValidationState({
        errors: errorMap,
        isValid: result.isValid,
      });

      return result.isValid;
    },
    []
  );

  const validateSingleField = useCallback(
    (
      fieldId: string,
      value: string,
      field: SchemaField
    ): void => {
      const error = validateField(
        fieldId,
        value,
        field.required ?? false,
        field.max_length ?? 1000
      );

      setValidationState((prev) => {
        const newErrors = { ...prev.errors };

        if (error) {
          newErrors[fieldId] = error.message;
        } else {
          delete newErrors[fieldId];
        }

        return {
          errors: newErrors,
          isValid: Object.keys(newErrors).length === 0,
        };
      });
    },
    []
  );

  const clearErrors = useCallback((): void => {
    setValidationState({
      errors: {},
      isValid: true,
    });
  }, []);

  const clearFieldError = useCallback((fieldId: string): void => {
    setValidationState((prev) => {
      const newErrors = { ...prev.errors };
      delete newErrors[fieldId];

      return {
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, []);

  const sanitizeFormData = useCallback(
    (formData: Record<string, string>): Record<string, string> => {
      const sanitized: Record<string, string> = {};

      Object.entries(formData).forEach(([key, value]) => {
        sanitized[key] = sanitizeHtml(value);
      });

      return sanitized;
    },
    []
  );

  return {
    // 状態
    validationState,
    errors: validationState.errors,
    isValid: validationState.isValid,

    // アクション
    validateFormData,
    validateSingleField,
    clearErrors,
    clearFieldError,
    sanitizeFormData,
  };
};