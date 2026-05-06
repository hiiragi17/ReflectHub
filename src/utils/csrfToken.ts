import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * CSRF トークン生成・検証
 *
 * Double Submit Cookie 戦略 + HMAC 署名を採用。
 * トークンは `<random>.<hmac>` の形で発行され、Cookie とリクエストヘッダの一致を検証する。
 */

export const CSRF_COOKIE_NAME = 'reflecthub-csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const TOKEN_BYTE_LENGTH = 32;

function getSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('CSRF_SECRET 環境変数が設定されていないか、短すぎます。');
  }
  return secret;
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function generateCSRFToken(): string {
  const secret = getSecret();
  const random = randomBytes(TOKEN_BYTE_LENGTH).toString('hex');
  const signature = sign(random, secret);
  return `${random}.${signature}`;
}

export function isValidCSRFToken(token: string): boolean {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [random, signature] = token.split('.');
  if (!random || !signature) return false;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }

  const expected = sign(random, secret);
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function tokensMatch(headerToken: string | null, cookieToken: string | null): boolean {
  if (!headerToken || !cookieToken) return false;
  if (headerToken.length !== cookieToken.length) return false;
  const a = Buffer.from(headerToken);
  const b = Buffer.from(cookieToken);
  return timingSafeEqual(a, b);
}

export interface CSRFValidationResult {
  ok: boolean;
  reason?: 'missing_header' | 'missing_cookie' | 'mismatch' | 'invalid_signature';
}

export function verifyCSRF(
  headerToken: string | null,
  cookieToken: string | null,
): CSRFValidationResult {
  if (!headerToken) return { ok: false, reason: 'missing_header' };
  if (!cookieToken) return { ok: false, reason: 'missing_cookie' };
  if (!tokensMatch(headerToken, cookieToken)) return { ok: false, reason: 'mismatch' };
  if (!isValidCSRFToken(headerToken)) return { ok: false, reason: 'invalid_signature' };
  return { ok: true };
}
