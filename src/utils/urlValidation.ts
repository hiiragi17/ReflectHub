/**
 * URL が安全なプロトコルを使用しているか検証します
 * XSS攻撃を防ぐため、http/https/mailto のみを許可します
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    return allowedProtocols.includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}
