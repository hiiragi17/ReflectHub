import { describe, it, expect } from 'vitest';
import { sanitizePlainText } from './sanitize';

describe('sanitizePlainText', () => {
  it('strips HTML tags', () => {
    expect(sanitizePlainText('<script>alert(1)</script>hello')).toBe('alert(1)hello');
    expect(sanitizePlainText('<b>bold</b>')).toBe('bold');
    expect(sanitizePlainText('<img src=x onerror=alert(1)>nope')).toBe('nope');
  });

  it('strips HTML comments', () => {
    expect(sanitizePlainText('hello<!-- secret -->world')).toBe('helloworld');
  });

  it('strips control characters but keeps newlines/tabs', () => {
    expect(sanitizePlainText('abc')).toBe('abc');
    expect(sanitizePlainText('line1\nline2')).toBe('line1\nline2');
    expect(sanitizePlainText('a\tb')).toBe('a\tb');
  });

  it('trims whitespace', () => {
    expect(sanitizePlainText('   hello   ')).toBe('hello');
  });

  it('returns empty string for non-strings', () => {
    // @ts-expect-error - testing runtime behavior
    expect(sanitizePlainText(null)).toBe('');
    // @ts-expect-error - testing runtime behavior
    expect(sanitizePlainText(undefined)).toBe('');
    // @ts-expect-error - testing runtime behavior
    expect(sanitizePlainText(123)).toBe('');
  });

  it('preserves plain text unchanged', () => {
    expect(sanitizePlainText('普通の名前 太郎')).toBe('普通の名前 太郎');
  });
});
