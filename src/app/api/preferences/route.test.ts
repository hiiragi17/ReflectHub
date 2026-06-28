import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

import { GET, PUT } from './route';

const USER = { id: 'user-1' };

const mockPreferences = {
  id: 'pref-1',
  user_id: USER.id,
  pwa_install_dismissed: false,
  timezone: 'Asia/Tokyo',
  notification_preferences: {
    reminder_weekday: null,
  },
  created_at: '2026-04-19T00:00:00Z',
  updated_at: '2026-04-19T00:00:00Z',
};

const makePutRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/preferences', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

describe('GET /api/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('') });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns existing preferences', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPreferences, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.preferences.timezone).toBe('Asia/Tokyo');
  });

  it('creates default preferences when not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

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
    mockSupabase.from
      .mockReturnValueOnce(mockSelectChain)
      .mockReturnValueOnce(mockInsertChain);

    const res = await GET();
    expect(res.status).toBe(200);
  });

  it('returns 500 on other DB errors', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'DB error' },
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('') });

    const res = await PUT(makePutRequest({ pwa_install_dismissed: true }));
    expect(res.status).toBe(401);
  });

  it('updates preferences successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    // First call: check existing (SELECT)
    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPreferences, error: null }),
    };
    // Second call: update
    const singleFn = vi.fn().mockResolvedValue({
      data: { ...mockPreferences, pwa_install_dismissed: true },
      error: null,
    });
    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: singleFn }),
        }),
      }),
    };
    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(updateChain);

    const res = await PUT(makePutRequest({ pwa_install_dismissed: true }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.preferences.pwa_install_dismissed).toBe(true);
  });

  it('returns 400 for invalid timezone', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPreferences, error: null }),
    };
    mockSupabase.from.mockReturnValue(existingChain);

    const res = await PUT(makePutRequest({ timezone: '' }));
    expect(res.status).toBe(400);
  });

  it('merges notification_preferences with existing values', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: USER }, error: null });

    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPreferences, error: null }),
    };
    const updatedPrefs = {
      ...mockPreferences,
      notification_preferences: {
        ...mockPreferences.notification_preferences,
        reminder_weekday: 2,
      },
    };
    const singleFn = vi.fn().mockResolvedValue({ data: updatedPrefs, error: null });
    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: singleFn }),
        }),
      }),
    };
    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(updateChain);

    const res = await PUT(makePutRequest({ notification_preferences: { reminder_weekday: 2 } }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.preferences.notification_preferences.reminder_weekday).toBe(2);
  });
});
