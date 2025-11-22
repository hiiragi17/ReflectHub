import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from './route';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

describe('Profile API Route', () => {
  const mockUserId = 'user-123';
  const mockProfile = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'テストユーザー',
    provider: 'google',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  let mockCookieStore: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  let mockSupabase: {
    auth: {
      getSession: ReturnType<typeof vi.fn>;
    };
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup cookie store mock
    mockCookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cookies as any).mockResolvedValue(mockCookieStore);

    // Setup Supabase mock
    mockSupabase = {
      auth: {
        getSession: vi.fn(),
      },
      from: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  describe('GET /api/auth/profile/[userId]', () => {
    it('should return profile when authenticated', async () => {
      // Mock session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId, email: 'test@example.com' },
          },
        },
        error: null,
      });

      // Mock profile query
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123');
      const params = Promise.resolve({ userId: mockUserId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toEqual(mockProfile);
    });

    it('should return 401 when not authenticated', async () => {
      // Mock no session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123');
      const params = Promise.resolve({ userId: mockUserId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when accessing another user profile', async () => {
      // Mock session with different user
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'different-user', email: 'other@example.com' },
          },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123');
      const params = Promise.resolve({ userId: mockUserId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should create profile if not exists', async () => {
      // Mock session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: mockUserId,
              email: 'test@example.com',
              user_metadata: {
                full_name: 'Test User',
                avatar_url: 'https://example.com/avatar.jpg',
              },
            },
          },
        },
        error: null,
      });

      // Mock profile not found (PGRST116 error)
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock profile creation
      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: { ...mockProfile, name: 'Test User' },
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValueOnce({
          insert: mockInsert,
        });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
      mockInsert.mockReturnValue({ select: mockInsertSelect });
      mockInsertSelect.mockReturnValue({ single: mockInsertSingle });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123');
      const params = Promise.resolve({ userId: mockUserId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.name).toBe('Test User');
    });
  });

  describe('PATCH /api/auth/profile/[userId]', () => {
    it('should update profile name when authenticated', async () => {
      // Mock session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId, email: 'test@example.com' },
          },
        },
        error: null,
      });

      // Mock profile update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockProfile, name: '新しい名前' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: '新しい名前' }),
      });
      const params = Promise.resolve({ userId: mockUserId });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile.name).toBe('新しい名前');
    });

    it('should return 400 when name is empty', async () => {
      // Mock session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId, email: 'test@example.com' },
          },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: '' }),
      });
      const params = Promise.resolve({ userId: mockUserId });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should return 400 when name is whitespace only', async () => {
      // Mock session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId, email: 'test@example.com' },
          },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: '   ' }),
      });
      const params = Promise.resolve({ userId: mockUserId });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should return 401 when not authenticated', async () => {
      // Mock no session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: '新しい名前' }),
      });
      const params = Promise.resolve({ userId: mockUserId });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when updating another user profile', async () => {
      // Mock session with different user
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'different-user', email: 'other@example.com' },
          },
        },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: '新しい名前' }),
      });
      const params = Promise.resolve({ userId: mockUserId });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should trim whitespace from name', async () => {
      // Mock session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId, email: 'test@example.com' },
          },
        },
        error: null,
      });

      // Mock profile update
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockProfile, name: '新しい名前' },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });

      const request = new NextRequest('http://localhost/api/auth/profile/user-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: '  新しい名前  ' }),
      });
      const params = Promise.resolve({ userId: mockUserId });

      await PATCH(request, { params });

      // Verify that update was called with trimmed name
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新しい名前',
        })
      );
    });
  });
});
