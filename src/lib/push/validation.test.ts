import { describe, it, expect } from 'vitest';
import { validateNotificationPreferences } from './validation';

describe('validateNotificationPreferences', () => {
  describe('unknown keys', () => {
    it('rejects unknown keys', () => {
      expect(validateNotificationPreferences({ unknown: true })).toMatch(/不明なキー/);
    });
  });

  describe('boolean fields', () => {
    it.each(['daily_reminder', 'weekly_summary', 'achievement_alerts'] as const)(
      'rejects non-boolean %s',
      (key) => {
        expect(validateNotificationPreferences({ [key]: 'true' })).toMatch(new RegExp(key));
      },
    );

    it('accepts valid boolean values', () => {
      expect(
        validateNotificationPreferences({
          daily_reminder: true,
          weekly_summary: false,
          achievement_alerts: true,
        }),
      ).toBeNull();
    });
  });

  describe('reminder_time', () => {
    it.each(['00:00', '09:30', '12:00', '23:59', '20:00'])('accepts valid time %s', (t) => {
      expect(validateNotificationPreferences({ reminder_time: t })).toBeNull();
    });

    it.each(['24:00', '25:30', '99:99', '12:60', '12:99', '1:00', '12:0', 'ab:cd', ''])(
      'rejects invalid time %s',
      (t) => {
        expect(validateNotificationPreferences({ reminder_time: t })).toMatch(/reminder_time/);
      },
    );

    it('rejects non-string reminder_time', () => {
      expect(validateNotificationPreferences({ reminder_time: 2000 })).toMatch(/reminder_time/);
    });
  });

  it('returns null for an empty payload', () => {
    expect(validateNotificationPreferences({})).toBeNull();
  });
});
