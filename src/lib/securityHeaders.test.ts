import { describe, it, expect } from 'vitest';
import { buildCsp, buildSecurityHeaders } from './securityHeaders';

function directive(csp: string, name: string): string[] {
  const found = csp.split('; ').find((d) => d.startsWith(`${name} `));
  return found ? found.split(' ').slice(1) : [];
}

describe('buildCsp', () => {
  it('Supabase の URL から接続先 (https / wss) を作る', () => {
    const csp = buildCsp({ supabaseUrl: 'https://abc.supabase.co' });
    const connect = directive(csp, 'connect-src');
    expect(connect).toContain("'self'");
    expect(connect).toContain('https://abc.supabase.co');
    expect(connect).toContain('wss://abc.supabase.co');
  });

  it('Supabase の URL が未設定・不正なら *.supabase.co にフォールバックする', () => {
    for (const supabaseUrl of [undefined, 'not a url']) {
      const connect = directive(buildCsp({ supabaseUrl }), 'connect-src');
      expect(connect).toContain('https://*.supabase.co');
      expect(connect).toContain('wss://*.supabase.co');
    }
  });

  it('他サイトからの埋め込み・object・外部への form 送信を許可しない', () => {
    const csp = buildCsp({ supabaseUrl: 'https://abc.supabase.co' });
    expect(directive(csp, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'form-action')).toEqual(["'self'"]);
    expect(directive(csp, 'base-uri')).toEqual(["'self'"]);
  });

  it('本番では unsafe-eval を許可しない。開発では HMR のために許可する', () => {
    expect(directive(buildCsp({ isDev: false }), 'script-src')).not.toContain("'unsafe-eval'");
    expect(directive(buildCsp({ isDev: true }), 'script-src')).toContain("'unsafe-eval'");
  });
});

describe('buildSecurityHeaders', () => {
  const names = (opts: Parameters<typeof buildSecurityHeaders>[0]) =>
    buildSecurityHeaders(opts).map((h) => h.key);

  it('本番では HSTS を含む', () => {
    expect(names({ isDev: false })).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
        'Strict-Transport-Security',
      ]),
    );
  });

  it('開発では HSTS を付けない', () => {
    expect(names({ isDev: true })).not.toContain('Strict-Transport-Security');
  });
});
