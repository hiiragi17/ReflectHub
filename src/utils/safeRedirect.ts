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
 * 入力だけでなく、返す値も検証する (ドットセグメントの除去後に `//` で始まる値を防ぐ)。
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

  const path = resolved.pathname + resolved.search + resolved.hash;

  // 入力が安全でも、ドットセグメントの除去で、返す値が `//evil.com` になり得る
  // (`/.//evil.com`、`/%2e//evil.com`、`/..//evil.com` など)。呼び出し側は、この値を
  // 再度 URL として解決する (`new URL(path, request.url)`) ため、返す値も検証する。
  if (!path.startsWith('/') || path.startsWith('//')) return fallback;
  // 念のため、返す値を別のオリジンに対して解決しても、同じ自サイトに留まることを確認する。
  try {
    if (new URL(path, 'https://reflecthub.invalid').origin !== 'https://reflecthub.invalid') {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return path;
}
