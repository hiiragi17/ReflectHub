import { describe, it, expect } from 'vitest';
import {
  normalizeLineBreaks,
  sanitizeHtml,
  isRequired,
  checkLength,
  containsForbiddenCharacters,
  containsHtmlContent,
  validateField,
  hasAtLeastOneValue,
  validateForm,
  sanitizeFormData,
} from './validation';
import { VALIDATION_CONSTANTS } from '@/constants/validation';

describe('normalizeLineBreaks', () => {
  it('should convert CRLF to LF', () => {
    expect(normalizeLineBreaks('hello\r\nworld')).toBe('hello\nworld');
  });

  it('should convert CR to LF', () => {
    expect(normalizeLineBreaks('hello\rworld')).toBe('hello\nworld');
  });

  it('should leave LF unchanged', () => {
    expect(normalizeLineBreaks('hello\nworld')).toBe('hello\nworld');
  });

  it('should handle mixed line breaks', () => {
    expect(normalizeLineBreaks('line1\r\nline2\rline3\nline4')).toBe(
      'line1\nline2\nline3\nline4'
    );
  });

  it('should handle empty string', () => {
    expect(normalizeLineBreaks('')).toBe('');
  });
});

describe('sanitizeHtml', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
  });

  it('should remove all HTML tags from text', () => {
    expect(sanitizeHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
  });

  it('should trim whitespace', () => {
    expect(sanitizeHtml('  hello  ')).toBe('hello');
  });

  it('should handle plain text', () => {
    expect(sanitizeHtml('plain text')).toBe('plain text');
  });

  it('should handle empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('should handle special characters', () => {
    expect(sanitizeHtml('hello & goodbye')).toBe('hello & goodbye');
  });
});

describe('isRequired', () => {
  it('should return false for undefined', () => {
    expect(isRequired(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isRequired('')).toBe(false);
  });

  it('should return false for whitespace only', () => {
    expect(isRequired('   ')).toBe(false);
  });

  it('should return true for non-empty string', () => {
    expect(isRequired('hello')).toBe(true);
  });

  it('should return true for string with content and whitespace', () => {
    expect(isRequired('  hello  ')).toBe(true);
  });
});

describe('checkLength', () => {
  it('should pass for string within limit', () => {
    const result = checkLength('hello', 10);
    expect(result.isValid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('should fail for string exceeding limit', () => {
    const result = checkLength('hello world', 5);
    expect(result.isValid).toBe(false);
    expect(result.message).toBe(VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(5));
  });

  it('should handle emojis correctly (grapheme-aware)', () => {
    // "👨‍👩‍👧‍👦" is 1 grapheme but multiple code points
    const result = checkLength('👨‍👩‍👧‍👦', 1);
    expect(result.isValid).toBe(true);
  });

  it('should count multiple emojis correctly', () => {
    const result = checkLength('😀😁😂', 3);
    expect(result.isValid).toBe(true);
  });

  it('should fail when emojis exceed limit', () => {
    const result = checkLength('😀😁😂😃', 3);
    expect(result.isValid).toBe(false);
  });

  it('should handle empty string', () => {
    const result = checkLength('', 10);
    expect(result.isValid).toBe(true);
  });

  it('should handle Japanese characters', () => {
    const result = checkLength('こんにちは', 5);
    expect(result.isValid).toBe(true);
  });
});

describe('containsForbiddenCharacters', () => {
  it('should return false for normal text', () => {
    expect(containsForbiddenCharacters('hello world')).toBe(false);
  });

  it('should return false for allowed line breaks (LF)', () => {
    expect(containsForbiddenCharacters('hello\nworld')).toBe(false);
  });

  it('should return false for allowed line breaks (CR)', () => {
    expect(containsForbiddenCharacters('hello\rworld')).toBe(false);
  });

  it('should return true for null character', () => {
    expect(containsForbiddenCharacters('hello\x00world')).toBe(true);
  });

  it('should return false for tab character', () => {
    // Tab (\x09) should be allowed as it's not in the forbidden range
    expect(containsForbiddenCharacters('hello\tworld')).toBe(false);
  });

  it('should handle Japanese text', () => {
    expect(containsForbiddenCharacters('こんにちは')).toBe(false);
  });
});

describe('containsHtmlContent', () => {
  it('should return false for plain text', () => {
    expect(containsHtmlContent('hello world')).toBe(false);
  });

  it('should return true for HTML tags', () => {
    expect(containsHtmlContent('<p>hello</p>')).toBe(true);
  });

  it('should return true for self-closing tags', () => {
    expect(containsHtmlContent('<img src="test.jpg" />')).toBe(true);
  });

  it('should return true for script tags', () => {
    expect(containsHtmlContent('<script>alert("xss")</script>')).toBe(true);
  });

  it('should return false for angle brackets not forming tags', () => {
    expect(containsHtmlContent('5 < 10')).toBe(false);
  });

  it('should return false for greater than symbol', () => {
    expect(containsHtmlContent('10 > 5')).toBe(false);
  });

  it('should return true for incomplete tags', () => {
    expect(containsHtmlContent('<div')).toBe(false); // No closing >
  });
});

describe('validateField', () => {
  it('should return error for empty required field', () => {
    const error = validateField('field1', '', true, 100);
    expect(error).toEqual({
      field: 'field1',
      message: VALIDATION_CONSTANTS.MESSAGES.REQUIRED,
    });
  });

  it('should return null for empty non-required field', () => {
    const error = validateField('field1', '', false, 100);
    expect(error).toBeNull();
  });

  it('should return error for field exceeding max length', () => {
    const error = validateField('field1', 'hello world', true, 5);
    expect(error).toEqual({
      field: 'field1',
      message: VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(5),
    });
  });

  it('should return error for HTML content', () => {
    const error = validateField('field1', '<script>alert("xss")</script>', true, 100);
    expect(error).toEqual({
      field: 'field1',
      message: VALIDATION_CONSTANTS.MESSAGES.CONTAINS_HTML,
    });
  });

  it('should return error for forbidden characters', () => {
    const error = validateField('field1', 'hello\x00world', true, 100);
    expect(error).toEqual({
      field: 'field1',
      message: VALIDATION_CONSTANTS.MESSAGES.CONTAINS_FORBIDDEN_CHARS,
    });
  });

  it('should return null for valid field', () => {
    const error = validateField('field1', 'hello world', true, 100);
    expect(error).toBeNull();
  });

  it('should normalize line breaks before validation', () => {
    const error = validateField('field1', 'hello\r\nworld', true, 100);
    expect(error).toBeNull();
  });

  it('should handle whitespace-only as empty for required field', () => {
    const error = validateField('field1', '   ', true, 100);
    expect(error).toEqual({
      field: 'field1',
      message: VALIDATION_CONSTANTS.MESSAGES.REQUIRED,
    });
  });
});

describe('hasAtLeastOneValue', () => {
  it('should return false for empty object', () => {
    expect(hasAtLeastOneValue({})).toBe(false);
  });

  it('should return false when all values are empty', () => {
    expect(hasAtLeastOneValue({ field1: '', field2: '', field3: '' })).toBe(false);
  });

  it('should return false when all values are whitespace', () => {
    expect(hasAtLeastOneValue({ field1: '   ', field2: '\t', field3: '\n' })).toBe(false);
  });

  it('should return true when at least one field has value', () => {
    expect(hasAtLeastOneValue({ field1: '', field2: 'hello', field3: '' })).toBe(true);
  });

  it('should return true when multiple fields have values', () => {
    expect(hasAtLeastOneValue({ field1: 'hello', field2: 'world', field3: '' })).toBe(
      true
    );
  });
});

describe('validateForm', () => {
  it('should validate empty form and return error', () => {
    const schema = [
      { id: 'field1', required: false, max_length: 100 },
      { id: 'field2', required: false, max_length: 100 },
    ];
    const result = validateForm({}, schema);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: '__form__',
      message: 'どれか1つ以上のフィールドに入力してください',
    });
  });

  it('should validate form with all required fields filled', () => {
    const schema = [
      { id: 'field1', required: true, max_length: 100 },
      { id: 'field2', required: true, max_length: 100 },
    ];
    const result = validateForm({ field1: 'hello', field2: 'world' }, schema);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for missing required fields', () => {
    const schema = [
      { id: 'field1', required: true, max_length: 100 },
      { id: 'field2', required: true, max_length: 100 },
    ];
    const result = validateForm({ field1: 'hello', field2: '' }, schema);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'field2',
      message: VALIDATION_CONSTANTS.MESSAGES.REQUIRED,
    });
  });

  it('should validate with default max length', () => {
    const schema = [{ id: 'field1', required: false }];
    const longText = 'a'.repeat(1001); // Exceeds default max length
    const result = validateForm({ field1: longText }, schema);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'field1',
      message: VALIDATION_CONSTANTS.MESSAGES.MAX_LENGTH(
        VALIDATION_CONSTANTS.DEFAULT_MAX_LENGTH
      ),
    });
  });

  it('should collect multiple errors from different fields', () => {
    const schema = [
      { id: 'field1', required: true, max_length: 5 },
      { id: 'field2', required: true, max_length: 5 },
    ];
    const result = validateForm({ field1: '', field2: 'too long text' }, schema);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2); // At least field1 required and field2 max_length
  });

  it('should pass when at least one non-required field has value', () => {
    const schema = [
      { id: 'field1', required: false, max_length: 100 },
      { id: 'field2', required: false, max_length: 100 },
    ];
    const result = validateForm({ field1: 'hello', field2: '' }, schema);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('sanitizeFormData', () => {
  it('should sanitize all fields in form data', () => {
    const formData = {
      field1: '<script>alert("xss")</script>',
      field2: '<p>Hello World</p>',
    };
    const result = sanitizeFormData(formData);

    expect(result.field1).toBe('');
    expect(result.field2).toBe('Hello World');
  });

  it('should normalize line breaks in all fields', () => {
    const formData = {
      field1: 'hello\r\nworld',
      field2: 'foo\rbar',
    };
    const result = sanitizeFormData(formData);

    expect(result.field1).toBe('hello\nworld');
    expect(result.field2).toBe('foo\nbar');
  });

  it('should trim whitespace from all fields', () => {
    const formData = {
      field1: '  hello  ',
      field2: '\tworld\t',
    };
    const result = sanitizeFormData(formData);

    expect(result.field1).toBe('hello');
    expect(result.field2).toBe('world');
  });

  it('should handle empty form data', () => {
    const result = sanitizeFormData({});
    expect(result).toEqual({});
  });

  it('should preserve plain text', () => {
    const formData = {
      field1: 'plain text',
      field2: '日本語テキスト',
    };
    const result = sanitizeFormData(formData);

    expect(result.field1).toBe('plain text');
    expect(result.field2).toBe('日本語テキスト');
  });
});
