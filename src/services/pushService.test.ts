import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock('@/lib/push/encryption', () => ({
  validatePushSubscriptionFields: vi.fn().mockReturnValue(null),
}));

import { pushService } from './pushService';
import { supabase } from '@/lib/supabase/client';
import { validatePushSubscriptionFields } from '@/lib/push/encryption';

const USER_ID = 'user-1';
const ENDPOINT = 'https://fcm.googleapis.com/push/abc';
const P256DH = 'BNb2B0dAi8Q=';
const AUTH = 'tBHItJI5svbpez7KI4CCXg==';

const mockSubscription = {
  id: 'sub-1',
  user_id: USER_ID,
  endpoint: ENDPOINT,
  p256dh: P256DH,
  auth: AUTH,
  is_active: true,
  created_at: '2026-04-19T00:00:00Z',
  updated_at: '2026-04-19T00:00:00Z',
};

describe('pushService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validatePushSubscriptionFields).mockReturnValue(null);
  });

  describe('subscribe', () => {
    it('creates a push subscription successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      const mockChain = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubscription, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await pushService.subscribe(USER_ID, {
        endpoint: ENDPOINT,
        p256dh: P256DH,
        auth: AUTH,
      });

      expect(result).toEqual(mockSubscription);
      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
    });

    it('throws AUTH_ERROR when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      } as any);

      await expect(
        pushService.subscribe(USER_ID, { endpoint: ENDPOINT, p256dh: P256DH, auth: AUTH }),
      ).rejects.toMatchObject({ code: 'AUTH_ERROR' });
    });

    it('throws AUTH_ERROR when userId does not match', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'other-user' } },
        error: null,
      } as any);

      await expect(
        pushService.subscribe(USER_ID, { endpoint: ENDPOINT, p256dh: P256DH, auth: AUTH }),
      ).rejects.toMatchObject({ code: 'AUTH_ERROR' });
    });

    it('throws VALIDATION_ERROR when fields are invalid', async () => {
      vi.mocked(validatePushSubscriptionFields).mockReturnValue('endpoint は有効な HTTPS URL である必要があります。');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      await expect(
        pushService.subscribe(USER_ID, { endpoint: 'http://bad.com', p256dh: P256DH, auth: AUTH }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('throws DB_ERROR when database fails', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      const mockChain = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      await expect(
        pushService.subscribe(USER_ID, { endpoint: ENDPOINT, p256dh: P256DH, auth: AUTH }),
      ).rejects.toMatchObject({ code: 'DB_ERROR' });
    });
  });

  describe('unsubscribe', () => {
    it('deactivates a subscription successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      const eqInner = vi.fn().mockResolvedValue({ error: null });
      const eqOuter = vi.fn().mockReturnValue({ eq: eqInner });
      const update = vi.fn().mockReturnValue({ eq: eqOuter });
      vi.mocked(supabase.from).mockReturnValue({ update } as any);

      await expect(pushService.unsubscribe(USER_ID, ENDPOINT)).resolves.toBeUndefined();
    });

    it('throws AUTH_ERROR when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      } as any);

      await expect(pushService.unsubscribe(USER_ID, ENDPOINT)).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
    });
  });

  describe('getActiveSubscriptions', () => {
    it('returns active subscriptions for the user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockSubscription], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await pushService.getActiveSubscriptions(USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sub-1');
    });

    it('returns empty array when no subscriptions exist', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await pushService.getActiveSubscriptions(USER_ID);
      expect(result).toEqual([]);
    });
  });
});
