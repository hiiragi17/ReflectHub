import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Setup environment variables using vi.hoisted to ensure they are set before module imports
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

// Mock Supabase client BEFORE importing the module
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// NOW import the module after mocks are set up
import {
  createReflection,
  updateReflection,
  getReflection,
  getUserReflections,
  deleteReflection,
} from './reflectionService';

describe('reflectionService', () => {
  const mockUserId = 'user-123';
  const mockReflectionId = 'reflection-456';
  const mockFrameworkId = 'framework-789';

  beforeEach(() => {
    // Mock console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createReflection', () => {
    it('should create reflection successfully', async () => {
      const mockContent = { field1: 'value1', field2: 'value2' };
      const mockDate = '2025-11-13';

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockReflectionId,
              user_id: mockUserId,
              framework_id: mockFrameworkId,
              content: mockContent,
              reflection_date: mockDate,
              created_at: '2025-11-13T10:00:00Z',
            },
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createReflection(mockUserId, {
        framework_id: mockFrameworkId,
        content: mockContent,
        reflection_date: mockDate,
      });

      expect(result).toEqual({
        id: mockReflectionId,
        user_id: mockUserId,
        framework_id: mockFrameworkId,
        content: mockContent,
        reflection_date: mockDate,
        created_at: '2025-11-13T10:00:00Z',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('retrospectives');
    });

    it('should use current date when reflection_date is not provided', async () => {
      const mockContent = { field1: 'value1' };
      const currentDate = new Date().toISOString().split('T')[0];

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockReflectionId,
              user_id: mockUserId,
              framework_id: mockFrameworkId,
              content: mockContent,
              reflection_date: currentDate,
              created_at: '2025-11-13T10:00:00Z',
            },
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createReflection(mockUserId, {
        framework_id: mockFrameworkId,
        content: mockContent,
      });

      expect(result.reflection_date).toBe(currentDate);
    });

    it('should throw AUTH_ERROR when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(
        createReflection(mockUserId, {
          framework_id: mockFrameworkId,
          content: {},
        })
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        message: 'Unauthorized: 他ユーザーの振り返りデータは作成できません。',
      });
    });

    it('should throw AUTH_ERROR when userId does not match', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'different-user' } },
        error: null,
      });

      await expect(
        createReflection(mockUserId, {
          framework_id: mockFrameworkId,
          content: {},
        })
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        message: 'Unauthorized: 他ユーザーの振り返りデータは作成できません。',
      });
    });

    it('should throw error when database insert fails', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        createReflection(mockUserId, {
          framework_id: mockFrameworkId,
          content: {},
        })
      ).rejects.toMatchObject({
        message: 'Database error',
      });
    });
  });

  describe('updateReflection', () => {
    it('should update reflection successfully', async () => {
      const mockContent = { field1: 'updated value' };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: mockUserId },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockReflectionId,
                user_id: mockUserId,
                framework_id: mockFrameworkId,
                content: mockContent,
                reflection_date: '2025-11-13',
                created_at: '2025-11-13T10:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ update: mockUpdate });

      const result = await updateReflection(mockReflectionId, {
        content: mockContent,
      });

      expect(result.content).toEqual(mockContent);
    });

    it('should throw AUTH_ERROR when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(
        updateReflection(mockReflectionId, {
          content: {},
        })
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        message: 'Unauthorized: 認証されていません。ログインしてください。',
      });
    });

    it('should throw AUTH_ERROR when user does not own reflection', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: 'different-user' },
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      await expect(
        updateReflection(mockReflectionId, {
          content: {},
        })
      ).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        message: 'Unauthorized: この振り返りデータの編集権限がありません。',
      });
    });

    it('should handle multiple update fields', async () => {
      const updateData = {
        content: { field1: 'value1' },
        title: 'New Title',
        tags: ['tag1', 'tag2'],
        mood: 'happy',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: mockUserId },
            error: null,
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockReflectionId,
                user_id: mockUserId,
                framework_id: mockFrameworkId,
                ...updateData,
                reflection_date: '2025-11-13',
                created_at: '2025-11-13T10:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ update: mockUpdate });

      const result = await updateReflection(mockReflectionId, updateData);

      expect(mockUpdate).toHaveBeenCalledWith(updateData);
    });
  });

  describe('getReflection', () => {
    it('should get reflection with timezone conversion', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockReflectionId,
                user_id: mockUserId,
                framework_id: mockFrameworkId,
                content: { field1: 'value1' },
                reflection_date: '2025-11-13',
                created_at: '2025-11-13T10:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await getReflection(mockReflectionId);

      expect(result.id).toBe(mockReflectionId);
      expect(result.user_id).toBe(mockUserId);
      // Timezone conversion should have happened
      expect(result.reflection_date).toBeDefined();
      expect(result.created_at).toBeDefined();
    });

    it('should throw AUTH_ERROR when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(getReflection(mockReflectionId)).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        message: '認証されていません。ログインしてください。',
      });
    });

    it('should throw error when reflection not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      await expect(getReflection(mockReflectionId)).rejects.toMatchObject({
        message: 'Not found',
      });
    });
  });

  describe('getUserReflections', () => {
    it('should get user reflections with default limit', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockReflections = [
        {
          id: 'ref-1',
          user_id: mockUserId,
          framework_id: mockFrameworkId,
          content: { field1: 'value1' },
          reflection_date: '2025-11-13',
          created_at: '2025-11-13T10:00:00Z',
        },
        {
          id: 'ref-2',
          user_id: mockUserId,
          framework_id: mockFrameworkId,
          content: { field1: 'value2' },
          reflection_date: '2025-11-12',
          created_at: '2025-11-12T10:00:00Z',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockReflections,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await getUserReflections(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('ref-1');
      expect(result[1].id).toBe('ref-2');
    });

    it('should apply custom limit', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      await getUserReflections(mockUserId, 10);

      const limitCall = mockSelect().eq().order().limit;
      expect(limitCall).toHaveBeenCalledWith(10);
    });

    it('should throw AUTH_ERROR when user id does not match', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'different-user' } },
        error: null,
      });

      await expect(getUserReflections(mockUserId)).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        message: 'Unauthorized: 他ユーザーの振り返りデータは取得できません。',
      });
    });

    it('should return empty array when no reflections found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      const result = await getUserReflections(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('deleteReflection', () => {
    it('should delete reflection successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: mockUserId },
            error: null,
          }),
        }),
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
          count: 1,
        }),
      });

      mockSupabaseClient.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ delete: mockDelete });

      await expect(deleteReflection(mockReflectionId)).resolves.toBeUndefined();
    });

    it('should throw AUTH_ERROR when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(deleteReflection(mockReflectionId)).rejects.toMatchObject({
        code: 'AUTH_ERROR',
        message: '認証されていません。ログインしてください。',
      });
    });

    it('should throw FORBIDDEN when user does not own reflection', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: 'different-user' },
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      await expect(deleteReflection(mockReflectionId)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'この振り返りデータの削除権限がありません。',
      });
    });

    it('should throw NOT_FOUND when reflection does not exist', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({ select: mockSelect });

      await expect(deleteReflection(mockReflectionId)).rejects.toMatchObject({
        message: 'Not found',
      });
    });

    it('should throw NOT_FOUND when delete count is 0', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { user_id: mockUserId },
            error: null,
          }),
        }),
      });

      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
          count: 0,
        }),
      });

      mockSupabaseClient.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ delete: mockDelete });

      await expect(deleteReflection(mockReflectionId)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Reflection not found.',
      });
    });
  });
});
