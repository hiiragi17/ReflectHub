import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}));

import {
  buildReminderPayload,
  getLocalHour,
  getLocalWeekday,
  getReminderTargets,
  isAlreadyNotifiedToday,
} from './reminderService';

/**
 * Supabase クエリビルダーの最小モック。select/in/eq/or はチェーン用に自身を返し、
 * await されたら渡された結果に解決する thenable。
 */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    in: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
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

  describe('getLocalHour', () => {
    it('returns the hour (0-23) in the given timezone', () => {
      const d = new Date(Date.UTC(2026, 4, 7, 2, 0, 0)); // 02:00 UTC = 11:00 JST
      expect(getLocalHour(d, 'UTC')).toBe(2);
      expect(getLocalHour(d, 'Asia/Tokyo')).toBe(11);
    });

    it('returns 0 (not 24) at local midnight', () => {
      const d = new Date(Date.UTC(2026, 4, 7, 15, 0, 0)); // 15:00 UTC = 00:00 JST
      expect(getLocalHour(d, 'Asia/Tokyo')).toBe(0);
    });

    it('falls back to UTC hour for an invalid timezone', () => {
      const d = new Date(Date.UTC(2026, 4, 7, 12, 0, 0));
      expect(getLocalHour(d, 'Not/AZone')).toBe(12);
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

    it('orders subscriptions newest-first (most recently ON-toggled device leads)', async () => {
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

      // 全有効 subscription を新しい順で保持 (先頭が最後に ON にした端末)。
      // 配信側は先頭に送り、失効時のみ次へフォールバックする。
      expect(targets).toHaveLength(1);
      expect(targets[0].subscriptions).toHaveLength(2);
      expect(targets[0].subscriptions.map((s) => s.id)).toEqual(['sub-new', 'sub-old']);
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

    const subscriptionFor = (userId: string) => ({
      id: `sub-${userId}`,
      user_id: userId,
      endpoint: `https://push/${userId}`,
      p256dh: 'p',
      auth: 'a',
      is_active: true,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    });

    it('includes users whose reminder_hour matches the current JST hour', async () => {
      // now = 02:00 UTC = JST 11:00
      mockTables(
        [
          {
            user_id: 'u1',
            timezone: 'Asia/Tokyo',
            notification_preferences: { reminder_weekday: weekday, reminder_hour: 11 },
            last_notified_at: null,
          },
        ],
        [subscriptionFor('u1')],
      );

      const { targets } = await getReminderTargets(now);
      expect(targets).toHaveLength(1);
      expect(targets[0].reminderHour).toBe(11);
    });

    it('drops users whose reminder_hour does not match the current JST hour', async () => {
      mockTables(
        [
          {
            user_id: 'u1',
            timezone: 'Asia/Tokyo',
            notification_preferences: { reminder_weekday: weekday, reminder_hour: 20 },
            last_notified_at: null,
          },
        ],
        [],
      );

      const { targets } = await getReminderTargets(now);
      expect(targets).toHaveLength(0);
    });

    it('treats missing reminder_hour as the legacy default (JST 11:00)', async () => {
      // 既存ユーザー (reminder_hour キー無し) は 11 時扱いになる。
      mockTables(
        [
          {
            user_id: 'u1',
            timezone: 'Asia/Tokyo',
            notification_preferences: { reminder_weekday: weekday },
            last_notified_at: null,
          },
        ],
        [subscriptionFor('u1')],
      );

      // JST 11:00 → 配信対象
      const { targets: at11 } = await getReminderTargets(now);
      expect(at11).toHaveLength(1);
      expect(at11[0].reminderHour).toBe(11);

      // JST 12:00 → 対象外
      const noonJst = new Date('2026-07-03T03:00:00Z');
      const { targets: at12 } = await getReminderTargets(noonJst);
      expect(at12).toHaveLength(0);
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
