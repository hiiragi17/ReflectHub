/**
 * `?next=` などのリダイレクト先を、自サイト内のパスに限定する (オープンリダイレクト対策)。
 *
 * `startsWith('/') && !startsWith('//')` だけでは足りない。ブラウザの URL パーサーは
 * バックスラッシュをスラッシュとして扱い、タブ・改行を無視するため、次の値が外部サイトに
 * 解決される。
 *   - `/\evil.com`      → `https://evil.com/`
 *   - `/\t/evil.com`    → `//evil.com` (タブが除去される)
 * そのため、(1) `/` で始まり `//`・バックスラッシュ・制御文字を含まないことを確認した上で、
 * (2) 実際に URL として解決し、自サイトと同じオリジンになることも確認する。
 *
 * 安全でなければ `fallback` を返す。返り値は、解決後の `pathname + search + hash`。
 */
const BASE_ORIGIN = 'http://redirect-check.invalid';

export function getSafeRedirectPath(
  raw: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  // バックスラッシュと制御文字 (タブ・改行を含む)。
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;

  let resolved: URL;
  try {
    resolved = new URL(raw, BASE_ORIGIN);
  } catch {
    return fallback;
  }
  if (resolved.origin !== BASE_ORIGIN) return fallback;

  return resolved.pathname + resolved.search + resolved.hash;
}
