/**
 * ブラウザからの、自サイト発のリクエストかを判定する。
 * CSRF トークンを免除している API で、他サイトからの POST を拒否するために使う。
 *
 * - `Sec-Fetch-Site` があれば、`same-origin` のときだけ許可する（ブラウザが付けるため、
 *   他サイトのスクリプトから偽装できない）
 * - なければ、`Origin` が、このリクエストのオリジン（スキーム・ホスト・ポート）と
 *   完全に一致するときだけ許可する。ホストだけを比べると、`http://` のページからの
 *   リクエストが、`https://` のエンドポイントで通ってしまう
 * - どちらもない（ブラウザ以外からの呼び出しなど）場合は拒否する
 *
 * スキームは、プロキシ（Vercel など）が付ける `X-Forwarded-Proto` を優先し、
 * なければリクエスト URL のものを使う。
 */
export function isSameOriginRequest(request: { headers: Headers; url?: string }): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) {
    return fetchSite === 'same-origin';
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) {
    return false;
  }

  const scheme = getScheme(request);
  if (!scheme) {
    return false;
  }

  // Host にパスなどが紛れ込んだ値を、URL として解釈して通してしまわない
  if (!/^[^\s/?#@\\]+$/.test(host)) {
    return false;
  }

  // 両方を URL として正規化してから比べる。文字列のままだと、`Host: app.example.com:443`
  // （既定ポートが付いている）や、ホスト名の大文字・小文字の違いで、
  // 正しいリクエストまで拒否してしまう。
  try {
    return new URL(origin).origin === new URL(`${scheme}://${host}`).origin;
  } catch {
    return false;
  }
}

function getScheme(request: { headers: Headers; url?: string }): string | null {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwarded === 'http' || forwarded === 'https') {
    return forwarded;
  }
  if (!request.url) {
    return null;
  }
  try {
    return new URL(request.url).protocol.replace(':', '');
  } catch {
    return null;
  }
}
