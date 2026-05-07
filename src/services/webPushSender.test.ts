import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushSubscription } from '@/types/push';

// web-push をモック化。WebPushError は実物の挙動に合わせるため再エクスポートする。
// vi.mock のファクトリは hoist されるため、内部にすべて完結させる必要がある。
vi.mock('web-push', () => {
  class WebPushError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = 'WebPushError';
      this.statusCode = statusCode;
    }
  }
  return {
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    },
    WebPushError: WebPushError,
  };
});

import webpush, { WebPushError } from 'web-push';
import { __resetVapidConfigForTests, sendPush, sendPushBatch } from './webPushSender';

const sendNotification = webpush.sendNotification as unknown as ReturnType<typeof vi.fn>;
const setVapidDetails = webpush.setVapidDetails as unknown as ReturnType<typeof vi.fn>;

const makeWebPushError = (message: string, statusCode: number): WebPushError =>
  new WebPushError(
    message,
    statusCode,
    {} as unknown as ConstructorParameters<typeof WebPushError>[2],
    '',
    '',
  );

const sub = (overrides: Partial<PushSubscription> = {}): PushSubscription => ({
  id: 'sub-1',
  user_id: 'user-1',
  endpoint: 'https://push.example/endpoint/1',
  p256dh: 'p256dh-key',
  auth: 'auth-key',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('webPushSender', () => {
  beforeEach(() => {
    sendNotification.mockReset();
    setVapidDetails.mockReset();
    __resetVapidConfigForTests();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  describe('sendPush', () => {
    it('returns success on 201 statusCode', async () => {
      sendNotification.mockResolvedValueOnce({ statusCode: 201 });
      const r = await sendPush(sub(), { hello: 'world' });
      expect(r.success).toBe(true);
      expect(r.expired).toBe(false);
      expect(r.statusCode).toBe(201);
      expect(setVapidDetails).toHaveBeenCalledWith(
        'mailto:test@example.com',
        'pub',
        'priv',
      );
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: 'https://push.example/endpoint/1' }),
        JSON.stringify({ hello: 'world' }),
      );
    });

    it('marks expired=true on HTTP 410', async () => {
      sendNotification.mockRejectedValueOnce(makeWebPushError('Gone', 410));
      const r = await sendPush(sub(), { x: 1 });
      expect(r.success).toBe(false);
      expect(r.expired).toBe(true);
      expect(r.statusCode).toBe(410);
    });

    it('marks expired=true on HTTP 404', async () => {
      sendNotification.mockRejectedValueOnce(makeWebPushError('Not Found', 404));
      const r = await sendPush(sub(), { x: 1 });
      expect(r.expired).toBe(true);
    });

    it('marks expired=true on HTTP 401', async () => {
      sendNotification.mockRejectedValueOnce(makeWebPushError('Unauthorized', 401));
      const r = await sendPush(sub(), { x: 1 });
      expect(r.expired).toBe(true);
    });

    it('does not mark expired for transient 500', async () => {
      sendNotification.mockRejectedValueOnce(makeWebPushError('Server Error', 500));
      const r = await sendPush(sub(), { x: 1 });
      expect(r.success).toBe(false);
      expect(r.expired).toBe(false);
      expect(r.statusCode).toBe(500);
    });

    it('throws when VAPID keys are missing', async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      __resetVapidConfigForTests();
      await expect(sendPush(sub(), {})).rejects.toThrow(/VAPID/);
    });

    it('serializes object payload as JSON string', async () => {
      sendNotification.mockResolvedValueOnce({ statusCode: 200 });
      await sendPush(sub(), { title: 'X' });
      expect(sendNotification).toHaveBeenCalledWith(expect.anything(), '{"title":"X"}');
    });

    it('passes through string payload as-is', async () => {
      sendNotification.mockResolvedValueOnce({ statusCode: 200 });
      await sendPush(sub(), 'raw-body');
      expect(sendNotification).toHaveBeenCalledWith(expect.anything(), 'raw-body');
    });
  });

  describe('sendPushBatch', () => {
    it('sends to all subscriptions in parallel and isolates failures', async () => {
      sendNotification
        .mockResolvedValueOnce({ statusCode: 201 })
        .mockRejectedValueOnce(makeWebPushError('Gone', 410))
        .mockResolvedValueOnce({ statusCode: 201 });

      const subs = [
        sub({ id: 'a', endpoint: 'https://push.example/a' }),
        sub({ id: 'b', endpoint: 'https://push.example/b' }),
        sub({ id: 'c', endpoint: 'https://push.example/c' }),
      ];
      const results = await sendPushBatch(subs, { msg: 'hi' });
      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({ subscriptionId: 'a', success: true });
      expect(results[1]).toMatchObject({ subscriptionId: 'b', success: false, expired: true });
      expect(results[2]).toMatchObject({ subscriptionId: 'c', success: true });
    });

    it('returns empty array when no subscriptions', async () => {
      const results = await sendPushBatch([], {});
      expect(results).toEqual([]);
      expect(sendNotification).not.toHaveBeenCalled();
    });
  });
});
