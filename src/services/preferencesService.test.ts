import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

import { preferencesService } from './preferencesService';
import { supabase } from '@/lib/supabase/client';

const USER_ID = 'user-1';

const mockPreferences = {
  id: 'pref-1',
  user_id: USER_ID,
  pwa_install_dismissed: false,
  timezone: 'Asia/Tokyo',
  notification_preferences: {
    reminder_weekday: null,
  },
  created_at: '2026-04-19T00:00:00Z',
  updated_at: '2026-04-19T00:00:00Z',
};

describe('preferencesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('returns existing preferences', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPreferences, error: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const result = await preferencesService.getPreferences(USER_ID);
      expect(result).toEqual(mockPreferences);
    });

    it('creates default preferences when not found (PGRST116)', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPreferences, error: null }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockSelectChain as any)
        .mockReturnValueOnce(mockInsertChain as any);

      const result = await preferencesService.getPreferences(USER_ID);
      expect(result).toEqual(mockPreferences);
    });

    it('throws AUTH_ERROR when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      } as any);

      await expect(preferencesService.getPreferences(USER_ID)).rejects.toMatchObject({
        code: 'AUTH_ERROR',
      });
    });

    it('throws DB_ERROR on other DB errors', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'OTHER', message: 'DB error' },
        }),
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      await expect(preferencesService.getPreferences(USER_ID)).rejects.toMatchObject({
        code: 'DB_ERROR',
      });
    });
  });

  describe('updatePreferences', () => {
    it('merges notification_preferences with existing values', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      // getPreferences の SELECT (auth guard + select)
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPreferences, error: null }),
      };
      const updatedPreferences = {
        ...mockPreferences,
        notification_preferences: {
          ...mockPreferences.notification_preferences,
          reminder_weekday: 1,
        },
      };
      const singleFn = vi.fn().mockResolvedValue({ data: updatedPreferences, error: null });
      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: singleFn }),
          }),
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(selectChain as any) // getPreferences
        .mockReturnValueOnce(updateChain as any); // update call

      const result = await preferencesService.updatePreferences(USER_ID, {
        notification_preferences: { reminder_weekday: 1 },
      });

      expect(result.notification_preferences.reminder_weekday).toBe(1);
    });

    it('throws AUTH_ERROR when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      } as any);

      await expect(
        preferencesService.updatePreferences(USER_ID, { pwa_install_dismissed: true }),
      ).rejects.toMatchObject({ code: 'AUTH_ERROR' });
    });

    it('throws DB_ERROR when update fails', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      } as any);

      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPreferences, error: null }),
      };
      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
            }),
          }),
        }),
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(selectChain as any)
        .mockReturnValueOnce(updateChain as any);

      await expect(
        preferencesService.updatePreferences(USER_ID, { pwa_install_dismissed: true }),
      ).rejects.toMatchObject({ code: 'DB_ERROR' });
    });
  });
});
