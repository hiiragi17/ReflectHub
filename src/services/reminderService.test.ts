import { describe, it, expect } from 'vitest';
import {
  buildReminderPayload,
  buildWeeklyReminderPayload,
  getLocalDayOfWeek,
  getLocalHHMM,
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

  describe('buildWeeklyReminderPayload', () => {
    it('returns weekly defaults distinct from daily', () => {
      const weekly = buildWeeklyReminderPayload();
      const daily = buildReminderPayload();
      expect(weekly.tag).not.toBe(daily.tag);
      expect(weekly.title).toContain('ReflectHub');
      expect(weekly.url).toBe('/reflection');
    });

    it('allows overriding fields', () => {
      const p = buildWeeklyReminderPayload({ title: 'Weekly!' });
      expect(p.title).toBe('Weekly!');
    });
  });

  describe('getLocalDayOfWeek', () => {
    it('returns Sunday=0 for a known UTC Sunday', () => {
      // 2026-01-04 is a Sunday in UTC
      const sun = new Date(Date.UTC(2026, 0, 4, 12, 0, 0));
      expect(getLocalDayOfWeek(sun, 'UTC')).toBe(0);
    });

    it('handles timezone wrap to next day', () => {
      // 2026-01-04 22:00 UTC = 2026-01-05 07:00 in Asia/Tokyo (Monday)
      const d = new Date(Date.UTC(2026, 0, 4, 22, 0, 0));
      expect(getLocalDayOfWeek(d, 'UTC')).toBe(0);
      expect(getLocalDayOfWeek(d, 'Asia/Tokyo')).toBe(1);
    });

    it('falls back to UTC day on invalid timezone', () => {
      const d = new Date(Date.UTC(2026, 0, 4, 12, 0, 0));
      expect(getLocalDayOfWeek(d, 'Not/AZone')).toBe(0);
    });
  });
});
