/**
 * Edge runtime 互換の CSRF 検証ユーティリティ。
 *
 * `csrfToken.ts` は Node の `crypto` モジュール (`createHmac` 等) に依存して
 * いるため Next.js の Edge runtime で動く middleware から直接呼べない。
 * 本ファイルは Web Crypto API (`crypto.subtle`) のみで実装した非同期版で、
 * トークン形式・署名アルゴリズム (HMAC-SHA256) は `csrfToken.ts` と互換。
 *
 * トークン生成は引き続き `csrfToken.ts` の `generateCSRFToken` を使う想定で、
 * ここでは検証 (verify) と Edge から参照される定数のみを提供する。
 */

// Cookie / ヘッダ名の定数は Edge runtime からも参照されるため本ファイルに置く。
// Node 側 (`csrfToken.ts`) も Edge 経由で同じ値を再エクスポートする。
export const CSRF_COOKIE_NAME = 'reflecthub-csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export interface CSRFValidationResult {
  ok: boolean;
  reason?: 'missing_header' | 'missing_cookie' | 'mismatch' | 'invalid_signature';
}

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('CSRF_SECRET 環境変数が設定されていないか、短すぎます。');
  }
  return secret;
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    bytes[i] = byte;
  }
  return bytes;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  // 長さが違うと早期リターンせざるを得ないが、CSRF トークンは固定長なので問題ない。
  if (a.length !== b.length) return false;
  return timingSafeEqualBytes(encoder.encode(a), encoder.encode(b));
}

let cachedKey: { secret: string; key: CryptoKey } | null = null;

async function getHmacKey(secret: string): Promise<CryptoKey> {
  if (cachedKey && cachedKey.secret === secret) return cachedKey.key;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  cachedKey = { secret, key };
  return key;
}

async function verifySignature(random: string, signatureHex: string): Promise<boolean> {
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }
  const sigBytes = hexToBytes(signatureHex);
  if (!sigBytes) return false;
  const key = await getHmacKey(secret);
  return crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, encoder.encode(random));
}

/**
 * Edge runtime / Web Crypto を使った非同期 CSRF 検証。
 * 結果の型 (`CSRFValidationResult`) は `csrfToken.ts` の同期版と共通。
 */
export async function verifyCSRFAsync(
  headerToken: string | null,
  cookieToken: string | null,
): Promise<CSRFValidationResult> {
  if (!headerToken) return { ok: false, reason: 'missing_header' };
  if (!cookieToken) return { ok: false, reason: 'missing_cookie' };
  if (!timingSafeEqualStrings(headerToken, cookieToken)) {
    return { ok: false, reason: 'mismatch' };
  }

  const dot = headerToken.indexOf('.');
  if (dot <= 0 || dot === headerToken.length - 1) {
    return { ok: false, reason: 'invalid_signature' };
  }
  const random = headerToken.slice(0, dot);
  const signature = headerToken.slice(dot + 1);

  const ok = await verifySignature(random, signature);
  return ok ? { ok: true } : { ok: false, reason: 'invalid_signature' };
}
