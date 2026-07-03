import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}));

import {
  buildReminderPayload,
  getLocalWeekday,
  getReminderTargets,
  isAlreadyNotifiedToday,
} from './reminderService';

/**
 * Supabase クエリビルダーの最小モック。select/in/eq はチェーン用に自身を返し、
 * await されたら渡された結果に解決する thenable。
 */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    in: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
  return builder;
}

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

  describe('getReminderTargets', () => {
    beforeEach(() => {
      fromMock.mockReset();
    });

    // JST で配信曜日が一致するよう now と reminder_weekday を揃える。
    const now = new Date('2026-07-03T02:00:00Z'); // JST 2026-07-03 11:00
    const weekday = getLocalWeekday(now, 'Asia/Tokyo');

    function mockTables(prefs: unknown[], subs: unknown[]) {
      fromMock.mockImplementation((table: string) => {
        if (table === 'user_preferences') return makeBuilder({ data: prefs, error: null });
        if (table === 'push_subscriptions') return makeBuilder({ data: subs, error: null });
        throw new Error(`unexpected table: ${table}`);
      });
    }

    it('targets only the most recently ON-toggled device (latest updated_at)', async () => {
      mockTables(
        [
          {
            user_id: 'u1',
            timezone: 'Asia/Tokyo',
            notification_preferences: { reminder_weekday: weekday },
            last_notified_at: null,
          },
        ],
        [
          {
            id: 'sub-old',
            user_id: 'u1',
            endpoint: 'https://push/old',
            p256dh: 'p',
            auth: 'a',
            is_active: true,
            created_at: '2026-06-01T00:00:00Z',
            updated_at: '2026-06-01T00:00:00Z',
          },
          {
            id: 'sub-new',
            user_id: 'u1',
            endpoint: 'https://push/new',
            p256dh: 'p',
            auth: 'a',
            is_active: true,
            created_at: '2026-06-10T00:00:00Z',
            updated_at: '2026-07-01T00:00:00Z',
          },
        ],
      );

      const { targets } = await getReminderTargets(now);

      expect(targets).toHaveLength(1);
      expect(targets[0].subscriptions).toHaveLength(1);
      expect(targets[0].subscriptions[0].id).toBe('sub-new');
    });

    it('drops users whose delivery weekday does not match today (JST)', async () => {
      mockTables(
        [
          {
            user_id: 'u1',
            timezone: 'Asia/Tokyo',
            notification_preferences: { reminder_weekday: (weekday + 1) % 7 },
            last_notified_at: null,
          },
        ],
        [],
      );

      const { targets } = await getReminderTargets(now);
      expect(targets).toHaveLength(0);
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
