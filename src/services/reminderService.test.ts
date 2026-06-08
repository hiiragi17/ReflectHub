import { describe, it, expect } from 'vitest';
import {
  buildReminderPayload,
  getLocalHHMM,
  isAlreadyNotifiedToday,
  parseHHMM,
  shouldFireReminder,
} from './reminderService';

describe('reminderService', () => {
  describe('parseHHMM', () => {
    it('parses valid times', () => {
      expect(parseHHMM('00:00')).toBe(0);
      expect(parseHHMM('01:30')).toBe(90);
      expect(parseHHMM('23:59')).toBe(23 * 60 + 59);
    });

    it('rejects invalid times', () => {
      expect(parseHHMM('24:00')).toBeNull();
      expect(parseHHMM('12:60')).toBeNull();
      expect(parseHHMM('1:30')).toBeNull();
      expect(parseHHMM('abc')).toBeNull();
      expect(parseHHMM('')).toBeNull();
    });
  });

  describe('shouldFireReminder', () => {
    it('fires when within tolerance', () => {
      expect(shouldFireReminder('20:00', '20:00', 5)).toBe(true);
      expect(shouldFireReminder('20:03', '20:00', 5)).toBe(true);
      expect(shouldFireReminder('19:57', '20:00', 5)).toBe(true);
    });

    it('does not fire when outside tolerance', () => {
      expect(shouldFireReminder('20:06', '20:00', 5)).toBe(false);
      expect(shouldFireReminder('19:54', '20:00', 5)).toBe(false);
    });

    it('handles wrap-around midnight', () => {
      expect(shouldFireReminder('00:02', '23:59', 5)).toBe(true);
      expect(shouldFireReminder('23:57', '00:01', 5)).toBe(true);
    });

    it('returns false for invalid input', () => {
      expect(shouldFireReminder('xx:yy', '20:00', 5)).toBe(false);
      expect(shouldFireReminder('20:00', 'bad', 5)).toBe(false);
    });
  });

  describe('getLocalHHMM', () => {
    it('returns HH:MM for a known timezone', () => {
      const utcNoon = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
      expect(getLocalHHMM(utcNoon, 'UTC')).toBe('12:00');
      expect(getLocalHHMM(utcNoon, 'Asia/Tokyo')).toBe('21:00');
    });

    it('falls back to UTC for invalid timezone', () => {
      const d = new Date(Date.UTC(2026, 0, 1, 5, 30, 0));
      expect(getLocalHHMM(d, 'Not/AZone')).toBe('05:30');
    });
  });

  describe('isAlreadyNotifiedToday', () => {
    it('returns false when never notified', () => {
      const now = new Date('2026-05-07T11:00:00Z');
      expect(isAlreadyNotifiedToday(now, 'UTC', null)).toBe(false);
    });

    it('returns true when last notification is on the same local day', () => {
      const now = new Date('2026-05-07T11:00:00Z');
      const last = new Date('2026-05-07T03:00:00Z').toISOString();
      expect(isAlreadyNotifiedToday(now, 'UTC', last)).toBe(true);
    });

    it('returns false when last notification is on a different local day', () => {
      const now = new Date('2026-05-07T11:00:00Z');
      const yesterday = new Date('2026-05-06T11:00:00Z').toISOString();
      expect(isAlreadyNotifiedToday(now, 'UTC', yesterday)).toBe(false);
    });

    it('respects timezone for local-day boundary', () => {
      // 2026-05-07T15:00Z is 2026-05-08 00:00 in Asia/Tokyo
      // 2026-05-07T14:00Z is 2026-05-07 23:00 in Asia/Tokyo
      const now = new Date('2026-05-07T15:00:00Z');
      const earlierSameUtcDay = new Date('2026-05-07T14:00:00Z').toISOString();
      expect(isAlreadyNotifiedToday(now, 'Asia/Tokyo', earlierSameUtcDay)).toBe(false);
    });

    it('returns false for invalid timestamp', () => {
      const now = new Date('2026-05-07T11:00:00Z');
      expect(isAlreadyNotifiedToday(now, 'UTC', 'not-a-date')).toBe(false);
    });
  });

  describe('buildReminderPayload', () => {
    it('returns Japanese defaults', () => {
      const p = buildReminderPayload();
      expect(p.title).toContain('ReflectHub');
      expect(p.body.length).toBeGreaterThan(0);
      expect(p.url).toBe('/reflection');
    });

    it('allows overriding fields', () => {
      const p = buildReminderPayload({ url: '/dashboard', title: 'X' });
      expect(p.url).toBe('/dashboard');
      expect(p.title).toBe('X');
      expect(p.body.length).toBeGreaterThan(0);
    });
  });
});
