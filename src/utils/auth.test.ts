import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSupabaseClient,
  logoutUser,
  logoutUserAsync,
  getCurrentSession,
  getCurrentUser,
} from './auth';

// Mock Supabase client
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(),
}));

describe('auth utilities', () => {
  const mockSupabaseClient = {
    auth: {
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  };

  beforeEach(async () => {
    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    // Mock createBrowserClient
    const { createBrowserClient } = await import('@supabase/ssr');
    vi.mocked(createBrowserClient).mockReturnValue(mockSupabaseClient as any);

    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  describe('getSupabaseClient', () => {
    it('should create Supabase client with environment variables', async () => {
      const client = getSupabaseClient();
      expect(client).toBeDefined();

      const { createBrowserClient } = await import('@supabase/ssr');
      expect(vi.mocked(createBrowserClient)).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      );
    });

    it('should throw error when SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => getSupabaseClient()).toThrow(
        'Missing Supabase environment variables'
      );
    });

    it('should throw error when SUPABASE_ANON_KEY is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(() => getSupabaseClient()).toThrow(
        'Missing Supabase environment variables'
      );
    });
  });

  describe('validateRedirectUrl (via logoutUserAsync)', () => {
    it('should allow safe relative URLs', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('/dashboard');
      expect(result).toBe('/dashboard');
    });

    it('should block http:// URLs', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('http://evil.com');
      expect(result).toBe('/');
      expect(console.warn).toHaveBeenCalledWith(
        'External or unsafe redirect prevented, using default'
      );
    });

    it('should block https:// URLs', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('https://evil.com');
      expect(result).toBe('/');
    });

    it('should block protocol-relative URLs', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('//evil.com');
      expect(result).toBe('/');
    });

    it('should block javascript: URLs', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('javascript:alert("xss")');
      expect(result).toBe('/');
    });

    it('should block data: URLs', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('data:text/html,<script>alert("xss")</script>');
      expect(result).toBe('/');
    });

    it('should block vbscript: URLs', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('vbscript:msgbox("xss")');
      expect(result).toBe('/');
    });

    it('should block file: URLs', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('file:///etc/passwd');
      expect(result).toBe('/');
    });

    it('should block backslash paths', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('\\evil.com');
      expect(result).toBe('/');
    });

    it('should handle case-insensitive protocol detection', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('HTTP://evil.com');
      expect(result).toBe('/');
    });

    it('should trim whitespace before validation', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('  https://evil.com  ');
      expect(result).toBe('/');
    });
  });

  describe('logoutUser', () => {
    let originalLocation: Location;

    beforeEach(() => {
      originalLocation = window.location;
      // @ts-ignore - mock window.location
      delete window.location;
      window.location = { href: '' } as any;
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    it('should call signOut and redirect on success', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await logoutUser('/login');

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });

    it('should redirect to default "/" on error', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: new Error('Signout error'),
      });

      await logoutUser('/dashboard');

      // Should redirect to "/" on error
      expect(window.location.href).toBe('/');
    });

    it('should use default redirect "/" when no argument provided', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await logoutUser();

      expect(window.location.href).toBe('/');
    });

    it('should validate redirect URL before redirecting', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await logoutUser('https://evil.com');

      expect(window.location.href).toBe('/');
    });
  });

  describe('logoutUserAsync', () => {
    it('should call signOut and return redirect URL on success', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('/dashboard');

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(result).toBe('/dashboard');
    });

    it('should throw error when signOut fails', async () => {
      const signOutError = new Error('Signout failed');
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: signOutError });

      await expect(logoutUserAsync('/dashboard')).rejects.toThrow('Signout failed');
    });

    it('should use default redirect "/" when no argument provided', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync();

      expect(result).toBe('/');
    });

    it('should validate redirect URL', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await logoutUserAsync('https://evil.com');

      expect(result).toBe('/');
    });
  });

  describe('getCurrentSession', () => {
    it('should return session when available', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token',
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const session = await getCurrentSession();

      expect(session).toEqual(mockSession);
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
    });

    it('should return null when session error occurs', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error'),
      });

      const session = await getCurrentSession();

      expect(session).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'セッション取得エラー:',
        expect.any(Error)
      );
    });

    it('should return null when no session exists', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const session = await getCurrentSession();

      expect(session).toBeNull();
    });

    it('should return null and log error when exception occurs', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Network error'));

      const session = await getCurrentSession();

      expect(session).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'セッション取得処理でエラーが発生:',
        expect.any(Error)
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when session exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = {
        user: mockUser,
        access_token: 'token',
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should return null when session does not exist', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null when session error occurs', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error'),
      });

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null and log error when exception occurs', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Network error'));

      const user = await getCurrentUser();

      expect(user).toBeNull();
      // The error is caught in getCurrentSession and logged there
      expect(console.error).toHaveBeenCalled();
    });
  });
});
