import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useValidation } from './useValidation';
import { VALIDATION_CONSTANTS } from '@/constants/validation';

describe('useValidation', () => {
  describe('initial state', () => {
    it('should have empty errors and isValid true', () => {
      const { result } = renderHook(() => useValidation());

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
      expect(result.current.validationState).toEqual({
        errors: {},
        isValid: true,
      });
    });
  });

  describe('validateFormData', () => {
    it('should validate form and return true when all fields are valid', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [
        { id: 'field1', required: true, max_length: 100 },
        { id: 'field2', required: false, max_length: 100 },
      ];
      const formData = { field1: 'hello', field2: 'world' };

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateFormData(formData, schema);
      });

      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });

    it('should validate form and return false when required field is empty', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [
        { id: 'field1', required: true, max_length: 100 },
        { id: 'field2', required: false, max_length: 100 },
      ];
      const formData = { field1: '', field2: 'world' };

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateFormData(formData, schema);
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.field1).toBe(VALIDATION_CONSTANTS.MESSAGES.REQUIRED);
      expect(result.current.isValid).toBe(false);
    });

    it('should validate form and detect field exceeding max length', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [{ id: 'field1', required: false, max_length: 5 }];
      const formData = { field1: 'hello world' };

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateFormData(formData, schema);
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.field1).toBe(
        VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(5)
      );
    });

    it('should validate form and detect HTML content', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [{ id: 'field1', required: false, max_length: 100 }];
      const formData = { field1: '<script>alert("xss")</script>' };

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateFormData(formData, schema);
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.field1).toBe(
        VALIDATION_CONSTANTS.MESSAGES.CONTAINS_HTML
      );
    });

    it('should validate form and detect forbidden characters', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [{ id: 'field1', required: false, max_length: 100 }];
      const formData = { field1: 'hello\x00world' };

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateFormData(formData, schema);
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.field1).toBe(
        VALIDATION_CONSTANTS.MESSAGES.CONTAINS_FORBIDDEN_CHARS
      );
    });

    it('should require at least one field to have a value', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [
        { id: 'field1', required: false, max_length: 100 },
        { id: 'field2', required: false, max_length: 100 },
      ];
      const formData = { field1: '', field2: '' };

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateFormData(formData, schema);
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.__form__).toBe(
        'どれか1つ以上のフィールドに入力してください'
      );
    });

    it('should use default max length when not provided', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [{ id: 'field1', required: false }];
      const longText = 'a'.repeat(1001);
      const formData = { field1: longText };

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateFormData(formData, schema);
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.field1).toBe(
        VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(
          VALIDATION_CONSTANTS.DEFAULT_MAX_LENGTH
        )
      );
    });

    it('should handle multiple errors', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [
        { id: 'field1', required: true, max_length: 100 },
        { id: 'field2', required: true, max_length: 5 },
      ];
      const formData = { field1: '', field2: 'too long text' };

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateFormData(formData, schema);
      });

      expect(isValid!).toBe(false);
      expect(result.current.errors.field1).toBeDefined();
      expect(result.current.errors.field2).toBeDefined();
    });
  });

  describe('validateSingleField', () => {
    it('should validate single field and add error when invalid', () => {
      const { result } = renderHook(() => useValidation());

      const field = { id: 'field1', required: true, max_length: 100 };

      act(() => {
        result.current.validateSingleField('field1', '', field);
      });

      expect(result.current.errors.field1).toBe(VALIDATION_CONSTANTS.MESSAGES.REQUIRED);
      expect(result.current.isValid).toBe(false);
    });

    it('should validate single field and remove error when valid', () => {
      const { result } = renderHook(() => useValidation());

      const field = { id: 'field1', required: true, max_length: 100 };

      // First add an error
      act(() => {
        result.current.validateSingleField('field1', '', field);
      });

      expect(result.current.errors.field1).toBeDefined();

      // Then validate with valid value
      act(() => {
        result.current.validateSingleField('field1', 'hello', field);
      });

      expect(result.current.errors.field1).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });

    it('should validate field exceeding max length', () => {
      const { result } = renderHook(() => useValidation());

      const field = { id: 'field1', required: false, max_length: 5 };

      act(() => {
        result.current.validateSingleField('field1', 'hello world', field);
      });

      expect(result.current.errors.field1).toBe(
        VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(5)
      );
      expect(result.current.isValid).toBe(false);
    });

    it('should use default max length when not provided', () => {
      const { result } = renderHook(() => useValidation());

      const field = { id: 'field1', required: false };
      const longText = 'a'.repeat(1001);

      act(() => {
        result.current.validateSingleField('field1', longText, field);
      });

      expect(result.current.errors.field1).toBe(
        VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(1000)
      );
    });

    it('should handle multiple fields independently', () => {
      const { result } = renderHook(() => useValidation());

      const field1 = { id: 'field1', required: true, max_length: 100 };
      const field2 = { id: 'field2', required: true, max_length: 100 };

      act(() => {
        result.current.validateSingleField('field1', '', field1);
        result.current.validateSingleField('field2', 'valid', field2);
      });

      expect(result.current.errors.field1).toBeDefined();
      expect(result.current.errors.field2).toBeUndefined();
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => useValidation());

      const field = { id: 'field1', required: true, max_length: 100 };

      // Add some errors
      act(() => {
        result.current.validateSingleField('field1', '', field);
      });

      expect(result.current.errors.field1).toBeDefined();
      expect(result.current.isValid).toBe(false);

      // Clear errors
      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });

    it('should clear multiple errors', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [
        { id: 'field1', required: true, max_length: 100 },
        { id: 'field2', required: true, max_length: 100 },
      ];
      const formData = { field1: '', field2: '' };

      act(() => {
        result.current.validateFormData(formData, schema);
      });

      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('clearFieldError', () => {
    it('should clear specific field error', () => {
      const { result } = renderHook(() => useValidation());

      const schema = [
        { id: 'field1', required: true, max_length: 100 },
        { id: 'field2', required: true, max_length: 100 },
      ];
      const formData = { field1: '', field2: '' };

      act(() => {
        result.current.validateFormData(formData, schema);
      });

      expect(result.current.errors.field1).toBeDefined();
      expect(result.current.errors.field2).toBeDefined();

      act(() => {
        result.current.clearFieldError('field1');
      });

      expect(result.current.errors.field1).toBeUndefined();
      expect(result.current.errors.field2).toBeDefined();
      expect(result.current.isValid).toBe(false);
    });

    it('should update isValid to true when clearing last error', () => {
      const { result } = renderHook(() => useValidation());

      const field = { id: 'field1', required: true, max_length: 100 };

      act(() => {
        result.current.validateSingleField('field1', '', field);
      });

      expect(result.current.isValid).toBe(false);

      act(() => {
        result.current.clearFieldError('field1');
      });

      expect(result.current.errors.field1).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });

    it('should handle clearing non-existent field error', () => {
      const { result } = renderHook(() => useValidation());

      act(() => {
        result.current.clearFieldError('nonexistent');
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('sanitizeFormData', () => {
    it('should sanitize all fields in form data', () => {
      const { result } = renderHook(() => useValidation());

      const formData = {
        field1: '<script>alert("xss")</script>',
        field2: '<p>Hello World</p>',
      };

      let sanitized: Record<string, string>;
      act(() => {
        sanitized = result.current.sanitizeFormData(formData);
      });

      expect(sanitized!.field1).toBe('');
      expect(sanitized!.field2).toBe('Hello World');
    });

    it('should handle empty form data', () => {
      const { result } = renderHook(() => useValidation());

      let sanitized: Record<string, string>;
      act(() => {
        sanitized = result.current.sanitizeFormData({});
      });

      expect(sanitized!).toEqual({});
    });

    it('should preserve plain text', () => {
      const { result } = renderHook(() => useValidation());

      const formData = {
        field1: 'plain text',
        field2: '日本語テキスト',
      };

      let sanitized: Record<string, string>;
      act(() => {
        sanitized = result.current.sanitizeFormData(formData);
      });

      expect(sanitized!.field1).toBe('plain text');
      expect(sanitized!.field2).toBe('日本語テキスト');
    });
  });
});
