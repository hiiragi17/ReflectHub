import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateCSRFToken,
  isValidCSRFToken,
  tokensMatch,
  verifyCSRF,
} from './csrfToken';

describe('csrfToken', () => {
  const ORIGINAL_SECRET = process.env.CSRF_SECRET;

  beforeAll(() => {
    process.env.CSRF_SECRET = 'test-secret-for-unit-tests-1234567890';
  });

  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.CSRF_SECRET;
    } else {
      process.env.CSRF_SECRET = ORIGINAL_SECRET;
    }
  });

  describe('generateCSRFToken', () => {
    it('returns a token in <random>.<hmac> format', () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[0-9a-f]+\.[0-9a-f]+$/);
    });

    it('returns different tokens on each call', () => {
      const a = generateCSRFToken();
      const b = generateCSRFToken();
      expect(a).not.toBe(b);
    });
  });

  describe('isValidCSRFToken', () => {
    it('accepts a freshly generated token', () => {
      expect(isValidCSRFToken(generateCSRFToken())).toBe(true);
    });

    it('rejects a tampered signature', () => {
      const token = generateCSRFToken();
      const [random] = token.split('.');
      expect(isValidCSRFToken(`${random}.deadbeef`)).toBe(false);
    });

    it('rejects malformed tokens', () => {
      expect(isValidCSRFToken('')).toBe(false);
      expect(isValidCSRFToken('no-dot')).toBe(false);
      expect(isValidCSRFToken('only.')).toBe(false);
      expect(isValidCSRFToken('.only')).toBe(false);
    });
  });

  describe('tokensMatch', () => {
    it('returns true for identical tokens', () => {
      const t = generateCSRFToken();
      expect(tokensMatch(t, t)).toBe(true);
    });

    it('returns false for differing tokens', () => {
      expect(tokensMatch(generateCSRFToken(), generateCSRFToken())).toBe(false);
    });

    it('returns false when either side is null', () => {
      expect(tokensMatch(null, 'x')).toBe(false);
      expect(tokensMatch('x', null)).toBe(false);
    });
  });

  describe('verifyCSRF', () => {
    it('accepts matching valid tokens', () => {
      const t = generateCSRFToken();
      expect(verifyCSRF(t, t)).toEqual({ ok: true });
    });

    it('reports missing header', () => {
      expect(verifyCSRF(null, 'x')).toEqual({ ok: false, reason: 'missing_header' });
    });

    it('reports missing cookie', () => {
      expect(verifyCSRF('x', null)).toEqual({ ok: false, reason: 'missing_cookie' });
    });

    it('reports mismatch', () => {
      const a = generateCSRFToken();
      const b = generateCSRFToken();
      expect(verifyCSRF(a, b)).toEqual({ ok: false, reason: 'mismatch' });
    });

    it('reports invalid signature when both sides equal but tampered', () => {
      const tampered = 'aaaa.bbbb';
      expect(verifyCSRF(tampered, tampered)).toEqual({ ok: false, reason: 'invalid_signature' });
    });
  });
});
