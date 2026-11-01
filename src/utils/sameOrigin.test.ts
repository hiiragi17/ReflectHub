import { describe, it, expect } from 'vitest';
import { isSameOriginRequest } from './sameOrigin';

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) });

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
    expect(isSameOriginRequest(req({ origin: 'http://localhost:3000', host: 'localhost:3000' }))).toBe(true);
    expect(isSameOriginRequest(req({ origin: 'http://localhost:3001', host: 'localhost:3000' }))).toBe(false);
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
