import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from './route';

// Type definitions for mocks
interface MockSupabaseAuth {
  getSession: ReturnType<typeof vi.fn>;
}

interface MockSupabase {
  auth: MockSupabaseAuth;
  from?: ReturnType<typeof vi.fn>;
}

interface MockCookies {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete?: ReturnType<typeof vi.fn>;
}

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((): MockSupabase => ({
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Profile API Route', () => {
  const mockUserId = 'user-123';
  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    },
  };

  const mockProfile = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    provider: 'google',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-15T15:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/auth/profile/[userId]', () => {
    it('should return 401 when session is not found', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        },
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123');
      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user tries to access another user profile', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'different-user' } } },
            error: null,
          }),
        },
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123');
      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should return user profile when session is valid', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null,
              }),
            }),
          }),
        }),
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123');
      const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile).toEqual(mockProfile);
    });
  });

  describe('PUT /api/auth/profile/[userId]', () => {
    it('should return 401 when session is not found', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        },
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 when user tries to update another user profile', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'different-user' } } },
            error: null,
          }),
        },
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(403);
    });

    it('should return 400 when name is missing', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123', {
        method: 'PUT',
        body: JSON.stringify({}),
      });
      const response = await PUT(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Name is required');
    });

    it('should return 400 when name is empty', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123', {
        method: 'PUT',
        body: JSON.stringify({ name: '   ' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(400);
    });

    it('should return 400 when name exceeds max length', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const longName = 'a'.repeat(101);
      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123', {
        method: 'PUT',
        body: JSON.stringify({ name: longName }),
      });
      const response = await PUT(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('must be 100 characters or less');
    });

    it('should update profile successfully', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockProfile, name: 'New Name' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile.name).toBe('New Name');
    });

    it('should trim whitespace from name', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      const mockSupabaseInstance: MockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockProfile, name: 'New Name' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabaseInstance);

      const { cookies } = await import('next/headers');
      const mockCookiesInstance: MockCookies = {
        get: vi.fn(),
        set: vi.fn(),
      };
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCookiesInstance);

      const request = new NextRequest('http://localhost:3000/api/auth/profile/user-123', {
        method: 'PUT',
        body: JSON.stringify({ name: '  New Name  ' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ userId: mockUserId }) });

      expect(response.status).toBe(200);
    });
  });
});
