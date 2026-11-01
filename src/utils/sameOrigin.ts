/**
 * ブラウザからの、自サイト発のリクエストかを判定する。
 * CSRF トークンを免除している API で、他サイトからの POST を拒否するために使う。
 *
 * - `Sec-Fetch-Site` があれば、`same-origin` のときだけ許可する（ブラウザが付けるため、
 *   他サイトのスクリプトから偽装できない）
 * - なければ、`Origin` のホストが `Host` と一致するときだけ許可する
 * - どちらもない（ブラウザ以外からの呼び出しなど）場合は拒否する
 */
export function isSameOriginRequest(request: { headers: Headers }): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) {
    return fetchSite === 'same-origin';
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
