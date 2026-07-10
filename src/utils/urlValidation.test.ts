import { describe, it, expect } from 'vitest';
import { isValidUrl, isValidPushEndpoint } from './urlValidation';

describe('isValidUrl', () => {
  describe('allowed protocols', () => {
    it('accepts public https URLs', () => {
      expect(isValidUrl('https://example.com/path?q=1')).toBe(true);
    });

    it('accepts public http URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('accepts mailto URLs', () => {
      expect(isValidUrl('mailto:foo@example.com')).toBe(true);
    });
  });

  describe('rejected protocols', () => {
    it.each([
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'vbscript:msgbox(1)',
      'ftp://example.com',
      'chrome://settings',
    ])('rejects %s', (url) => {
      expect(isValidUrl(url)).toBe(false);
    });
  });

  describe('private / internal hosts', () => {
    it.each([
      'http://localhost/',
      'http://localhost:3000/',
      'http://api.localhost/',
      'http://127.0.0.1/',
      'http://127.10.0.1/',
      'http://10.0.0.1/',
      'http://172.16.0.1/',
      'http://172.31.255.255/',
      'http://192.168.1.1/',
      'http://169.254.169.254/', // AWS metadata
      'http://0.0.0.0/',
      'http://[::1]/',
      'http://[fe80::1]/',
      'http://[fc00::1]/',
      // IPv4-mapped IPv6 — URL は `::ffff:7f00:1` 等に正規化する
      'http://[::ffff:127.0.0.1]/',
      'http://[::ffff:169.254.169.254]/',
      'http://[::ffff:10.0.0.1]/',
      'http://[0:0:0:0:0:ffff:127.0.0.1]/',
    ])('rejects %s', (url) => {
      expect(isValidUrl(url)).toBe(false);
    });

    it('does not falsely flag public IPs', () => {
      expect(isValidUrl('http://8.8.8.8/')).toBe(true);
      expect(isValidUrl('http://172.32.0.1/')).toBe(true); // outside 172.16/12
      expect(isValidUrl('http://172.15.0.1/')).toBe(true);
    });
  });

  describe('malformed input', () => {
    it.each(['', '   ', 'not a url', 'http://'])('rejects %s', (url) => {
      expect(isValidUrl(url)).toBe(false);
    });
  });
});

describe('isValidPushEndpoint', () => {
  it('accepts public https endpoint', () => {
    expect(isValidPushEndpoint('https://fcm.googleapis.com/wp/abc')).toBe(true);
  });

  it('rejects http (non-https)', () => {
    expect(isValidPushEndpoint('http://example.com/wp/abc')).toBe(false);
  });

  it('rejects private hosts even with https', () => {
    expect(isValidPushEndpoint('https://localhost/abc')).toBe(false);
    expect(isValidPushEndpoint('https://10.0.0.1/abc')).toBe(false);
  });
});
