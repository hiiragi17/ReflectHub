import { describe, it, expect } from 'vitest';
import { getSafeRedirectPath } from './safeRedirect';

describe('getSafeRedirectPath', () => {
  it('自サイト内のパスはそのまま返す (クエリ・ハッシュも)', () => {
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('/history/abc?x=1&y=2#top')).toBe('/history/abc?x=1&y=2#top');
    expect(getSafeRedirectPath('/')).toBe('/');
  });

  it('未指定・空は fallback', () => {
    expect(getSafeRedirectPath(null)).toBe('/dashboard');
    expect(getSafeRedirectPath(undefined)).toBe('/dashboard');
    expect(getSafeRedirectPath('')).toBe('/dashboard');
    expect(getSafeRedirectPath(null, '/')).toBe('/');
  });

  it.each([
    ['プロトコル相対', '//evil.com'],
    ['プロトコル相対 (パス付き)', '//evil.com/path'],
    ['バックスラッシュ', '/\\evil.com'],
    ['バックスラッシュ + スラッシュ', '/\\/evil.com'],
    ['スラッシュ + バックスラッシュ', '/\\\\evil.com'],
    ['タブが除去されて // になる', '/\t/evil.com'],
    ['改行が除去されて // になる', '/\n/evil.com'],
    ['復帰が除去されて // になる', '/\r/evil.com'],
    ['絶対 URL (https)', 'https://evil.com'],
    ['絶対 URL (http)', 'http://evil.com'],
    ['javascript: スキーム', 'javascript:alert(1)'],
    ['data: スキーム', 'data:text/html,<script>alert(1)</script>'],
    ['スキームなしのホスト名', 'evil.com'],
    ['先頭が空白', ' /dashboard'],
    ['@ を使ったホスト偽装', '@evil.com'],
    ['ドットセグメントの除去後に // になる', '/.//evil.com'],
    ['エンコードされたドットセグメント', '/%2e//evil.com'],
    ['親ディレクトリの除去後に // になる', '/..//evil.com'],
    ['途中の親ディレクトリの除去後に // になる', '/a/..//evil.com'],
    ['連続するドットセグメント', '/././/evil.com'],
    ['エンコードされた親ディレクトリ', '/%2e%2e//evil.com'],
  ])('%s は fallback にする', (_label, input) => {
    expect(getSafeRedirectPath(input)).toBe('/dashboard');
  });

  it('パーセントエンコードされたバックスラッシュは自サイトのパスのまま (外部に解決されない)', () => {
    const result = getSafeRedirectPath('/%5Cevil.com');
    expect(result.startsWith('/')).toBe(true);
    expect(new URL(result, 'https://reflecthub.app').origin).toBe('https://reflecthub.app');
  });

  it('返り値は、`//` で始まらない (呼び出し側が再度 URL として解決しても外部に出ない)', () => {
    for (const input of ['/.//evil.com', '/..//evil.com', '/a/..//b', '/./a', '/%2e/a', '/']) {
      expect(getSafeRedirectPath(input).startsWith('//')).toBe(false);
    }
  });

  it('正当な、ドットセグメントを含むパスは、正規化して返す', () => {
    expect(getSafeRedirectPath('/a/./b')).toBe('/a/b');
    expect(getSafeRedirectPath('/a/b/../c')).toBe('/a/c');
  });

  it('返り値は、どの入力でも自サイトのオリジンに解決される', () => {
    const inputs = [
      '/a', '/a?b=//evil.com', '/a#//evil.com', '/%2F%2Fevil.com', '/./\\evil.com',
      '/.//evil.com', '/%2e//evil.com', '/..//evil.com', '/a/..//b', '/./a', '/a/./b/../c',
    ];
    for (const input of inputs) {
      const out = getSafeRedirectPath(input);
      expect(new URL(out, 'https://reflecthub.app').origin).toBe('https://reflecthub.app');
    }
  });
});
