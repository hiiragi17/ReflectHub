import { describe, it, expect } from 'vitest';
import {
  hashEndpoint,
  generateNonce,
  validateEndpoint,
  validateBase64url,
  validatePushSubscriptionFields,
} from './encryption';

describe('encryption', () => {
  describe('hashEndpoint', () => {
    it('returns a 64-char hex string', () => {
      const hash = hashEndpoint('https://example.com/push');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('produces the same hash for the same input', () => {
      const url = 'https://fcm.googleapis.com/fcm/send/abc123';
      expect(hashEndpoint(url)).toBe(hashEndpoint(url));
    });

    it('produces different hashes for different inputs', () => {
      expect(hashEndpoint('https://a.com')).not.toBe(hashEndpoint('https://b.com'));
    });
  });

  describe('generateNonce', () => {
    it('returns a non-empty base64url string', () => {
      const nonce = generateNonce();
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('returns different values on each call', () => {
      expect(generateNonce()).not.toBe(generateNonce());
    });
  });

  describe('validateEndpoint', () => {
    it('accepts valid HTTPS URLs', () => {
      expect(validateEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
      expect(validateEndpoint('https://push.example.com/endpoint')).toBe(true);
    });

    it('rejects HTTP URLs', () => {
      expect(validateEndpoint('http://example.com/push')).toBe(false);
    });

    it('rejects non-URL strings', () => {
      expect(validateEndpoint('not-a-url')).toBe(false);
      expect(validateEndpoint('')).toBe(false);
    });
  });

  describe('validateBase64url', () => {
    it('accepts valid base64url strings', () => {
      expect(validateBase64url('abc123-_==')).toBe(true);
      expect(validateBase64url('BNb2B0dAi8Q=')).toBe(true);
    });

    it('rejects empty strings', () => {
      expect(validateBase64url('')).toBe(false);
    });

    it('rejects strings with invalid characters', () => {
      expect(validateBase64url('abc!@#')).toBe(false);
    });
  });

  describe('validatePushSubscriptionFields', () => {
    const validEndpoint = 'https://fcm.googleapis.com/push/abc';
    const validP256dh = 'BNb2B0dAi8Q=';
    const validAuth = 'tBHItJI5svbpez7KI4CCXg==';

    it('returns null for valid fields', () => {
      expect(validatePushSubscriptionFields(validEndpoint, validP256dh, validAuth)).toBeNull();
    });

    it('returns error for invalid endpoint', () => {
      const result = validatePushSubscriptionFields('http://insecure.com', validP256dh, validAuth);
      expect(result).toContain('endpoint');
    });

    it('returns error for invalid p256dh', () => {
      const result = validatePushSubscriptionFields(validEndpoint, '', validAuth);
      expect(result).toContain('p256dh');
    });

    it('returns error for invalid auth', () => {
      const result = validatePushSubscriptionFields(validEndpoint, validP256dh, '');
      expect(result).toContain('auth');
    });
  });
});
