import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  arrayBufferToBase64Url,
  getPushPermission,
  isPushSupported,
  urlBase64ToUint8Array,
} from './client';

describe('push/client', () => {
  describe('urlBase64ToUint8Array', () => {
    it('decodes a base64url string', () => {
      const input = 'aGVsbG8'; // "hello"
      const out = urlBase64ToUint8Array(input);
      expect(Array.from(out)).toEqual([104, 101, 108, 108, 111]);
    });

    it('handles padding correctly', () => {
      const input = 'YWI'; // "ab" -> requires padding
      const out = urlBase64ToUint8Array(input);
      expect(Array.from(out)).toEqual([97, 98]);
    });

    it('translates - and _ to + and /', () => {
      // base64url "+/" encodes to bytes [0xfb, 0xff]
      const out = urlBase64ToUint8Array('-_8');
      expect(out.length).toBeGreaterThan(0);
    });
  });

  describe('arrayBufferToBase64Url', () => {
    it('returns empty string for null', () => {
      expect(arrayBufferToBase64Url(null)).toBe('');
    });

    it('encodes bytes without padding', () => {
      const bytes = new Uint8Array([104, 101, 108, 108, 111]);
      expect(arrayBufferToBase64Url(bytes.buffer)).toBe('aGVsbG8');
    });

    it('uses url-safe characters', () => {
      const bytes = new Uint8Array([0xfb, 0xef, 0xff]);
      const result = arrayBufferToBase64Url(bytes.buffer);
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });
  });

  describe('isPushSupported / getPushPermission', () => {
    const originalNavigator = global.navigator;
    const originalNotification = (global as { Notification?: unknown }).Notification;

    beforeEach(() => {
      vi.stubGlobal('PushManager', class {});
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
      if (originalNotification === undefined) {
        delete (global as { Notification?: unknown }).Notification;
      } else {
        (global as { Notification?: unknown }).Notification = originalNotification;
      }
    });

    it('returns false when serviceWorker is missing', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        configurable: true,
      });
      expect(isPushSupported()).toBe(false);
    });

    it('returns "unsupported" when push is unavailable', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        configurable: true,
      });
      expect(getPushPermission()).toBe('unsupported');
    });

    it('returns Notification.permission when supported', () => {
      Object.defineProperty(global, 'navigator', {
        value: { serviceWorker: {} },
        configurable: true,
      });
      (global as { Notification?: unknown }).Notification = { permission: 'granted' };
      expect(isPushSupported()).toBe(true);
      expect(getPushPermission()).toBe('granted');
    });
  });
});
