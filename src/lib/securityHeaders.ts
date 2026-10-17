/**
 * 全レスポンスに付けるセキュリティヘッダ (next.config.ts の headers() から使う)。
 *
 * CSP の script-src は 'unsafe-inline' を許可している。Next.js (App Router) は
 * インラインの <script> で初期データを埋め込むため、静的な CSP で外すと
 * ページが動かなくなる。nonce 方式にするには全ページを動的レンダリングにする
 * 必要があり、影響が大きいので、ここでは次の防御に絞る。
 *   - 外部ドメインへのデータ送信 (connect-src / form-action)
 *   - 他サイトのスクリプト・iframe・object の読み込み
 *   - 他サイトからの iframe 埋め込み (clickjacking)
 */

const SUPABASE_FALLBACK_HTTP = 'https://*.supabase.co';
const SUPABASE_FALLBACK_WS = 'wss://*.supabase.co';

export interface SecurityHeaderOptions {
  /** NEXT_PUBLIC_SUPABASE_URL。未設定時は *.supabase.co を許可する */
  supabaseUrl?: string;
  /** 開発サーバー (HMR が eval と WebSocket を使う) では緩める */
  isDev?: boolean;
}

function supabaseSources(supabaseUrl?: string): string[] {
  if (!supabaseUrl) return [SUPABASE_FALLBACK_HTTP, SUPABASE_FALLBACK_WS];
  try {
    const { protocol, host } = new URL(supabaseUrl);
    const ws = protocol === 'https:' ? 'wss:' : 'ws:';
    return [`${protocol}//${host}`, `${ws}//${host}`];
  } catch {
    return [SUPABASE_FALLBACK_HTTP, SUPABASE_FALLBACK_WS];
  }
}

export function buildCsp({ supabaseUrl, isDev = false }: SecurityHeaderOptions = {}): string {
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  const connectSrc = ["'self'", ...supabaseSources(supabaseUrl)];
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push('ws:', 'http://localhost:*');
  }

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    // Tailwind / next/font / Radix がインラインの style を使う
    'style-src': ["'self'", "'unsafe-inline'"],
    // Google ログインのアバター画像、data: / blob: (プレビュー・アイコン)
    'img-src': ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com'],
    // next/font/google はビルド時に自己ホスト化される
    'font-src': ["'self'", 'data:'],
    'connect-src': connectSrc,
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    // OAuth は location の遷移で行い、form の送信先は自サイトのみ
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

export function buildSecurityHeaders(
  options: SecurityHeaderOptions = {},
): { key: string; value: string }[] {
  const headers = [
    { key: 'Content-Security-Policy', value: buildCsp(options) },
    // 古いブラウザ向け。frame-ancestors と同じ意味
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // 使わない機能 (カメラ・マイク・位置情報など) をブラウザ側で無効にする
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    },
  ];

  // 開発中の http://localhost に HSTS を残すと他のローカル開発に影響するため本番のみ
  if (!options.isDev) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains',
    });
  }

  return headers;
}
