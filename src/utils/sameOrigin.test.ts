import { describe, it, expect } from 'vitest';
import { isSameOriginRequest } from './sameOrigin';

const req = (headers: Record<string, string>, url = 'https://app.example.com/api/auth/session') => ({
  headers: new Headers(headers),
  url,
});

describe('isSameOriginRequest', () => {
  it('Sec-Fetch-Site が same-origin なら許可する', () => {
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
  });

  it.each(['cross-site', 'same-site', 'none'])(
    'Sec-Fetch-Site が %s なら拒否する',
    (site) => {
      expect(isSameOriginRequest(req({ 'sec-fetch-site': site }))).toBe(false);
    },
  );

  it('Sec-Fetch-Site があれば、Origin が一致していても、それを優先して拒否する', () => {
    expect(
      isSameOriginRequest(
        req({ 'sec-fetch-site': 'cross-site', origin: 'https://app.example.com', host: 'app.example.com' }),
      ),
    ).toBe(false);
  });

  it('Sec-Fetch-Site がなければ、Origin のホストが Host と一致するときだけ許可する', () => {
    expect(
      isSameOriginRequest(req({ origin: 'https://app.example.com', host: 'app.example.com' })),
    ).toBe(true);
    expect(
      isSameOriginRequest(req({ origin: 'https://evil.example.net', host: 'app.example.com' })),
    ).toBe(false);
  });

  it('ポート付きのホストも比較する', () => {
    const url = 'http://localhost:3000/api/auth/session';
    expect(isSameOriginRequest(req({ origin: 'http://localhost:3000', host: 'localhost:3000' }, url))).toBe(true);
    expect(isSameOriginRequest(req({ origin: 'http://localhost:3001', host: 'localhost:3000' }, url))).toBe(false);
  });

  it('スキームが違えば拒否する（http のページから、https のエンドポイントへの POST）', () => {
    expect(
      isSameOriginRequest(req({ origin: 'http://app.example.com', host: 'app.example.com' })),
    ).toBe(false);
  });

  it('X-Forwarded-Proto があれば、リクエスト URL より優先してスキームを決める', () => {
    // プロキシの内側では、リクエスト URL が http でも、利用者が見ているのは https
    const internalUrl = 'http://app.example.com/api/auth/session';
    expect(
      isSameOriginRequest(
        req({ origin: 'https://app.example.com', host: 'app.example.com', 'x-forwarded-proto': 'https' }, internalUrl),
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        req({ origin: 'http://app.example.com', host: 'app.example.com', 'x-forwarded-proto': 'https' }, internalUrl),
      ),
    ).toBe(false);
  });

  it('既定ポートの表記があっても、同じオリジンとして扱う', () => {
    expect(
      isSameOriginRequest(req({ origin: 'https://app.example.com:443', host: 'app.example.com' })),
    ).toBe(true);
  });

  it('Host に既定ポートが付いていても、同じオリジンとして扱う', () => {
    expect(
      isSameOriginRequest(req({ origin: 'https://app.example.com', host: 'app.example.com:443' })),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        req({ origin: 'http://app.example.com', host: 'app.example.com:80' }, 'http://app.example.com/api'),
      ),
    ).toBe(true);
  });

  it('既定でないポートは、Host に付いていれば Origin にも要る', () => {
    expect(
      isSameOriginRequest(req({ origin: 'https://app.example.com', host: 'app.example.com:8443' })),
    ).toBe(false);
    expect(
      isSameOriginRequest(req({ origin: 'https://app.example.com:8443', host: 'app.example.com:8443' })),
    ).toBe(true);
  });

  it('ホスト名の大文字・小文字の違いは、同じオリジンとして扱う', () => {
    expect(
      isSameOriginRequest(req({ origin: 'https://app.example.com', host: 'App.Example.com' })),
    ).toBe(true);
  });

  it('Host にパスや認証情報のような値が入っていたら拒否する', () => {
    expect(
      isSameOriginRequest(req({ origin: 'https://app.example.com', host: 'app.example.com/evil' })),
    ).toBe(false);
    expect(
      isSameOriginRequest(req({ origin: 'https://app.example.com', host: 'user@app.example.com' })),
    ).toBe(false);
    expect(isSameOriginRequest(req({ origin: 'https://app.example.com', host: 'app example.com' }))).toBe(false);
  });

  it('スキームが分からなければ拒否する', () => {
    expect(
      isSameOriginRequest({ headers: new Headers({ origin: 'https://app.example.com', host: 'app.example.com' }) }),
    ).toBe(false);
  });

  it('ホスト名の前方一致では許可しない', () => {
    expect(
      isSameOriginRequest(req({ origin: 'https://app.example.com.evil.net', host: 'app.example.com' })),
    ).toBe(false);
  });

  it('Origin も Sec-Fetch-Site もなければ拒否する', () => {
    expect(isSameOriginRequest(req({ host: 'app.example.com' }))).toBe(false);
    expect(isSameOriginRequest(req({}))).toBe(false);
  });

  it('Origin が URL として不正なら拒否する（例外にしない）', () => {
    expect(isSameOriginRequest(req({ origin: 'not a url', host: 'app.example.com' }))).toBe(false);
  });
});
