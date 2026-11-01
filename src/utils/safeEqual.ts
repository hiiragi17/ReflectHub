import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * 秘密の文字列を、比較にかかる時間から推測されないように比較する。
 * `timingSafeEqual` は長さが違うと例外になるため、長さをそろえるハッシュ同士で比較する。
 * Node.js ランタイム専用（Edge では使えない）。
 */
export function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
