import { createHash, randomBytes } from 'crypto';

/**
 * Push subscription endpoint を SHA-256 ハッシュ化して保存用の安全な識別子を生成する。
 * 実際の endpoint URL はそのままDBに保存するが、ログ出力時はこのハッシュを使う。
 */
export function hashEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

/**
 * Web Push 用の VAPID キーペアを生成するためのランダムシードを返す。
 * 実際の VAPID キー生成は web-push ライブラリで行う想定。
 */
export function generateNonce(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * Push subscription の endpoint が有効な HTTPS URL かを検証する。
 */
export function validateEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * p256dh / auth キーが Base64url 形式かを検証する。
 */
export function validateBase64url(value: string): boolean {
  return /^[A-Za-z0-9\-_]+=*$/.test(value) && value.length > 0;
}

/**
 * Push subscription の各フィールドを検証し、エラーメッセージを返す。
 * 問題がなければ null を返す。
 */
export function validatePushSubscriptionFields(
  endpoint: string,
  p256dh: string,
  auth: string,
): string | null {
  if (!validateEndpoint(endpoint)) {
    return 'endpoint は有効な HTTPS URL である必要があります。';
  }
  if (!validateBase64url(p256dh)) {
    return 'p256dh は有効な Base64url 文字列である必要があります。';
  }
  if (!validateBase64url(auth)) {
    return 'auth は有効な Base64url 文字列である必要があります。';
  }
  return null;
}
