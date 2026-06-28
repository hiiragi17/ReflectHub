import { describe, it, expect } from 'vitest';
import { validateNotificationPreferences } from './validation';

describe('validateNotificationPreferences', () => {
  describe('unknown keys', () => {
    it('rejects unknown keys', () => {
      expect(validateNotificationPreferences({ unknown: true })).toMatch(/不明なキー/);
    });

    it('rejects legacy keys that are no longer supported', () => {
      expect(validateNotificationPreferences({ daily_reminder: true })).toMatch(/不明なキー/);
      expect(validateNotificationPreferences({ reminder_time: '20:00' })).toMatch(/不明なキー/);
    });
  });

  describe('reminder_weekday', () => {
    it.each([0, 1, 2, 3, 4, 5, 6])('accepts valid weekday %i', (d) => {
      expect(validateNotificationPreferences({ reminder_weekday: d })).toBeNull();
    });

    it('accepts null (OFF)', () => {
      expect(validateNotificationPreferences({ reminder_weekday: null })).toBeNull();
    });

    it.each([7, -1, 1.5])('rejects out-of-range / non-integer %s', (d) => {
      expect(validateNotificationPreferences({ reminder_weekday: d })).toMatch(/reminder_weekday/);
    });

    it('rejects non-number reminder_weekday', () => {
      expect(validateNotificationPreferences({ reminder_weekday: '1' })).toMatch(/reminder_weekday/);
    });
  });

  it('returns null for an empty payload', () => {
    expect(validateNotificationPreferences({})).toBeNull();
  });
});
