/**
 * URL が安全なプロトコルを使用しているか検証します。
 *
 * XSS / SSRF / フィッシング対策として以下を満たさない URL は拒否します:
 *   - 許可プロトコル: `http`, `https`, `mailto` のみ
 *     (`javascript:` / `data:` / `file:` / `vbscript:` 等を明示的に拒否)
 *   - http/https の場合、ホストは公開到達可能な FQDN/IP であること
 *     (`localhost` / loopback / private / link-local / unspecified を拒否)
 *
 * Push subscription endpoint や、ユーザーが入力する外部 URL に対して
 * このユーティリティを通すことで、内部ネットワークへの SSRF を予防する。
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'] as const;

const PRIVATE_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  // IPv6 loopback。URL.hostname は `[]` を外して返すのでブラケット無しで持つ。
  '::1',
  // IPv4 unspecified
  '0.0.0.0',
]);

function isPrivateIPv4(host: string): boolean {
  // IPv4 リテラル判定: 4 オクテット数値であること。
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => {
    if (!/^\d+$/.test(p)) return -1;
    const n = Number(p);
    return n >= 0 && n <= 255 ? n : -1;
  });
  if (nums.some((n) => n < 0)) return false;

  const [a, b] = nums;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8 (unspecified)
  if (a === 0) return true;
  return false;
}

function isPrivateIPv6(host: string): boolean {
  // URL.hostname は IPv6 を `[...]` で囲んで返す場合と返さない場合があるので両対応。
  const stripped = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  const lower = stripped.toLowerCase();
  if (lower === '::1' || lower === '::') return true;

  // IPv4-mapped IPv6 (::ffff:0:0/96)。WHATWG URL は埋め込み IPv4 を 2 つの 16bit
  // hex グループに正規化する (例: `::ffff:7f00:1`)。SSRF を防ぐため hex グループを
  // 復元して IPv4 の private 判定に委譲する。
  const mapped = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mapped) {
    const high = parseInt(mapped[1], 16);
    const low = parseInt(mapped[2], 16);
    const ipv4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
    return isPrivateIPv4(ipv4);
  }

  // fc00::/7 (Unique Local) — `fc` または `fd` で始まる
  if (/^fc[0-9a-f]{2}:/.test(lower) || /^fd[0-9a-f]{2}:/.test(lower)) return true;
  // fe80::/10 (Link-local)
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  return false;
}

function isPrivateHost(host: string): boolean {
  if (!host) return true;
  const lower = host.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(lower)) return true;
  // `*.localhost` は RFC 6761 で常にループバックを指す
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true;
  if (isPrivateIPv4(lower)) return true;
  if (isPrivateIPv6(lower)) return true;
  return false;
}

export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string' || url.trim() === '') return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol as typeof ALLOWED_PROTOCOLS[number])) {
    return false;
  }

  // mailto は host チェック対象外。
  if (parsed.protocol === 'mailto:') return true;

  // http/https はホストが必須かつ private 帯域でないこと。
  if (!parsed.hostname) return false;
  if (isPrivateHost(parsed.hostname)) return false;

  return true;
}

/**
 * Web Push の endpoint URL は公開された FCM/APNs/Mozilla AutoPush 等のホストに
 * なっており、それ以外への SSRF を防ぐため `https://` を強制する。
 */
export function isValidPushEndpoint(endpoint: string): boolean {
  // isValidUrl が既に new URL の例外を吸収しているので、ここで再 try は不要。
  if (!isValidUrl(endpoint)) return false;
  return new URL(endpoint).protocol === 'https:';
}
