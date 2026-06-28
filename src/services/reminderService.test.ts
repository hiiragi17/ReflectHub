import { describe, it, expect } from 'vitest';
import {
  buildReminderPayload,
  getLocalWeekday,
  isAlreadyNotifiedToday,
} from './reminderService';

describe('reminderService', () => {
  describe('getLocalWeekday', () => {
    it('returns the weekday number (0=Sun..6=Sat) for a known date', () => {
      // 2026-05-07 は木曜日 (Thursday = 4)
      const thursdayNoonUtc = new Date(Date.UTC(2026, 4, 7, 12, 0, 0));
      expect(getLocalWeekday(thursdayNoonUtc, 'UTC')).toBe(4);
      // JST 21:00 でも同日 (木曜)
      expect(getLocalWeekday(thursdayNoonUtc, 'Asia/Tokyo')).toBe(4);
    });

    it('respects timezone across the day boundary', () => {
      // 2026-05-07T15:00Z は UTC では木曜(4)、Asia/Tokyo では 2026-05-08 00:00 = 金曜(5)
      const d = new Date(Date.UTC(2026, 4, 7, 15, 0, 0));
      expect(getLocalWeekday(d, 'UTC')).toBe(4);
      expect(getLocalWeekday(d, 'Asia/Tokyo')).toBe(5);
    });

    it('covers Sunday and Saturday', () => {
      // 2026-05-03 は日曜日 (0)
      const sunday = new Date(Date.UTC(2026, 4, 3, 12, 0, 0));
      expect(getLocalWeekday(sunday, 'UTC')).toBe(0);
      // 2026-05-09 は土曜日 (6)
      const saturday = new Date(Date.UTC(2026, 4, 9, 12, 0, 0));
      expect(getLocalWeekday(saturday, 'UTC')).toBe(6);
    });

    it('falls back to UTC weekday for an invalid timezone', () => {
      const d = new Date(Date.UTC(2026, 4, 7, 12, 0, 0));
      expect(getLocalWeekday(d, 'Not/AZone')).toBe(d.getUTCDay());
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
