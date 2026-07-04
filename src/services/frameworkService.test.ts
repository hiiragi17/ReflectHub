import { describe, it, expect, vi, beforeEach } from 'vitest';
import { frameworkService } from './frameworkService';
import { Framework } from '@/types/framework';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabase/client';

// Supabase のモック戻り値を、any を使わずに実際の型へキャストするための別名。
type FromResult = ReturnType<typeof supabase.from>;

describe('frameworkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFrameworks', () => {
    it('should return all 7 active frameworks', async () => {
      const mockFrameworks: Framework[] = [
        {
          id: 'ywt',
          name: 'YWT',
          display_name: 'やったこと・わかったこと・次にやること',
          description: 'シンプルで実践的な振り返り',
          schema: [
            { id: 'y', label: 'やったこと', placeholder: '今週やったこと', icon: '✅' },
            { id: 'w', label: 'わかったこと', placeholder: '学んだこと・気づき', icon: '💡' },
            { id: 't', label: '次にやること', placeholder: '来週の目標・TODO', icon: '🎯' },
          ],
          icon: '📝',
          color: '#4CAF50',
          is_active: true,
          sort_order: 1,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'kpt',
          name: 'KPT',
          display_name: 'Keep・Problem・Try',
          description: 'チーム振り返りに最適',
          schema: [
            { id: 'keep', label: 'Keep', placeholder: '続けること', icon: '👍' },
            { id: 'problem', label: 'Problem', placeholder: '問題・課題', icon: '⚠️' },
            { id: 'try', label: 'Try', placeholder: '次に試すこと', icon: '🚀' },
          ],
          icon: '🔄',
          color: '#2196F3',
          is_active: true,
          sort_order: 2,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'daki',
          name: 'DAKI',
          display_name: 'Drop・Add・Keep・Improve',
          description: 'プロセス改善に特化',
          schema: [
            { id: 'drop', label: 'Drop', placeholder: 'やめること', icon: '🗑️' },
            { id: 'add', label: 'Add', placeholder: '新たに始めること', icon: '➕' },
            { id: 'keep', label: 'Keep', placeholder: '続けること', icon: '👍' },
            { id: 'improve', label: 'Improve', placeholder: '改善すること', icon: '📈' },
          ],
          icon: '🔄',
          color: '#FF9800',
          is_active: true,
          sort_order: 3,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'star',
          name: 'STAR',
          display_name: 'Situation・Task・Action・Result',
          description: 'キャリア面接や事例整理に最適',
          schema: [
            { id: 'situation', label: 'Situation', placeholder: 'どんな状況・背景だったか？', icon: '🎬' },
            { id: 'task', label: 'Task', placeholder: '与えられた課題・目標は何か？', icon: '📋' },
            { id: 'action', label: 'Action', placeholder: 'あなたが実施したアクション', icon: '⚡' },
            { id: 'result', label: 'Result', placeholder: '得られた結果・成果', icon: '🎯' },
          ],
          icon: '⭐',
          color: '#FF6B6B',
          is_active: true,
          sort_order: 4,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'wlt',
          name: 'WLT',
          display_name: 'Win・Learn・Try',
          description: 'ポジティブな観点から振り返り',
          schema: [
            { id: 'win', label: 'Win', placeholder: '成功したこと', icon: '🏆' },
            { id: 'learn', label: 'Learn', placeholder: '学んだこと', icon: '📚' },
            { id: 'try', label: 'Try', placeholder: '挑戦すること', icon: '🚀' },
          ],
          icon: '🏆',
          color: '#9C27B0',
          is_active: true,
          sort_order: 5,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '4l',
          name: '4L',
          display_name: 'Liked・Learned・Lacked・Longed for',
          description: '研修やセミナー学習に最適',
          schema: [
            { id: 'liked', label: 'Liked', placeholder: '良かったこと', icon: '❤️' },
            { id: 'learned', label: 'Learned', placeholder: '学んだこと', icon: '📖' },
            { id: 'lacked', label: 'Lacked', placeholder: '足りなかったこと', icon: '📉' },
            { id: 'longed_for', label: 'Longed for', placeholder: '欲しかったもの・望んでいたこと', icon: '💭' },
          ],
          icon: '4️⃣',
          color: '#00BCD4',
          is_active: true,
          sort_order: 6,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'diary',
          name: '振り返り日記',
          display_name: '時系列日記形式',
          description: '時間軸に沿った自由記述',
          schema: [
            { id: 'time_morning', label: '朝（AM）', placeholder: '朝のできごと・活動', icon: '🌅' },
            { id: 'time_afternoon', label: '昼（PM）', placeholder: '昼のできごと・活動', icon: '☀️' },
            { id: 'time_evening', label: '夜（PM）', placeholder: '夜のできごと・活動', icon: '🌙' },
            { id: 'reflection', label: '本日の振り返り', placeholder: '総括・気づき・明日への誓い', icon: '🤔' },
          ],
          icon: '📔',
          color: '#FFA726',
          is_active: true,
          sort_order: 7,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockFrameworks.map((f) => ({
            ...f,
            schema: { fields: f.schema },
          })),
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      const result = await frameworkService.getFrameworks();

      expect(result).toHaveLength(7);
      expect(supabase.from).toHaveBeenCalledWith('frameworks');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockSupabase.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    });

    it('should include all new frameworks: DAKI, STAR, WLT, 4L, 振り返り日記', async () => {
      const mockFrameworks = [
        { id: 'ywt', name: 'YWT', schema: { fields: [] } },
        { id: 'kpt', name: 'KPT', schema: { fields: [] } },
        { id: 'daki', name: 'DAKI', schema: { fields: [] } },
        { id: 'star', name: 'STAR', schema: { fields: [] } },
        { id: 'wlt', name: 'WLT', schema: { fields: [] } },
        { id: '4l', name: '4L', schema: { fields: [] } },
        { id: 'diary', name: '振り返り日記', schema: { fields: [] } },
      ];

      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockFrameworks,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      const result = await frameworkService.getFrameworks();

      const frameworkIds = result.map((f) => f.id);

      // 既存の2つ
      expect(frameworkIds).toContain('ywt');
      expect(frameworkIds).toContain('kpt');

      // 新規追加の5つ
      expect(frameworkIds).toContain('daki');
      expect(frameworkIds).toContain('star');
      expect(frameworkIds).toContain('wlt');
      expect(frameworkIds).toContain('4l');
      expect(frameworkIds).toContain('diary');
    });

    it('should validate DAKI framework schema has 4 fields', async () => {
      const dakiFramework = {
        id: 'daki',
        name: 'DAKI',
        display_name: 'Drop・Add・Keep・Improve',
        schema: {
          fields: [
            { id: 'drop', label: 'Drop', placeholder: 'やめること' },
            { id: 'add', label: 'Add', placeholder: '新たに始めること' },
            { id: 'keep', label: 'Keep', placeholder: '続けること' },
            { id: 'improve', label: 'Improve', placeholder: '改善すること' },
          ],
        },
      };

      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [dakiFramework],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      const result = await frameworkService.getFrameworks();
      const daki = result.find((f) => f.id === 'daki');

      expect(daki).toBeDefined();
      expect(daki?.schema).toHaveLength(4);
      expect(daki?.schema.map((f) => f.id)).toEqual(['drop', 'add', 'keep', 'improve']);
    });

    it('should validate STAR framework schema has 4 fields', async () => {
      const starFramework = {
        id: 'star',
        name: 'STAR',
        display_name: 'Situation・Task・Action・Result',
        schema: {
          fields: [
            { id: 'situation', label: 'Situation', placeholder: 'どんな状況・背景だったか？' },
            { id: 'task', label: 'Task', placeholder: '与えられた課題・目標は何か？' },
            { id: 'action', label: 'Action', placeholder: 'あなたが実施したアクション' },
            { id: 'result', label: 'Result', placeholder: '得られた結果・成果' },
          ],
        },
      };

      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [starFramework],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      const result = await frameworkService.getFrameworks();
      const star = result.find((f) => f.id === 'star');

      expect(star).toBeDefined();
      expect(star?.schema).toHaveLength(4);
      expect(star?.schema.map((f) => f.id)).toEqual(['situation', 'task', 'action', 'result']);
    });

    it('should validate WLT framework schema has 3 fields', async () => {
      const wltFramework = {
        id: 'wlt',
        name: 'WLT',
        display_name: 'Win・Learn・Try',
        schema: {
          fields: [
            { id: 'win', label: 'Win', placeholder: '成功したこと' },
            { id: 'learn', label: 'Learn', placeholder: '学んだこと' },
            { id: 'try', label: 'Try', placeholder: '挑戦すること' },
          ],
        },
      };

      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [wltFramework],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      const result = await frameworkService.getFrameworks();
      const wlt = result.find((f) => f.id === 'wlt');

      expect(wlt).toBeDefined();
      expect(wlt?.schema).toHaveLength(3);
      expect(wlt?.schema.map((f) => f.id)).toEqual(['win', 'learn', 'try']);
    });

    it('should validate 4L framework schema has 4 fields', async () => {
      const fourLFramework = {
        id: '4l',
        name: '4L',
        display_name: 'Liked・Learned・Lacked・Longed for',
        schema: {
          fields: [
            { id: 'liked', label: 'Liked', placeholder: '良かったこと' },
            { id: 'learned', label: 'Learned', placeholder: '学んだこと' },
            { id: 'lacked', label: 'Lacked', placeholder: '足りなかったこと' },
            { id: 'longed_for', label: 'Longed for', placeholder: '欲しかったもの・望んでいたこと' },
          ],
        },
      };

      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [fourLFramework],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      const result = await frameworkService.getFrameworks();
      const fourL = result.find((f) => f.id === '4l');

      expect(fourL).toBeDefined();
      expect(fourL?.schema).toHaveLength(4);
      expect(fourL?.schema.map((f) => f.id)).toEqual(['liked', 'learned', 'lacked', 'longed_for']);
    });

    it('should validate 振り返り日記 framework schema has 4 fields', async () => {
      const diaryFramework = {
        id: 'diary',
        name: '振り返り日記',
        display_name: '時系列日記形式',
        schema: {
          fields: [
            { id: 'time_morning', label: '朝（AM）', placeholder: '朝のできごと・活動' },
            { id: 'time_afternoon', label: '昼（PM）', placeholder: '昼のできごと・活動' },
            { id: 'time_evening', label: '夜（PM）', placeholder: '夜のできごと・活動' },
            { id: 'reflection', label: '本日の振り返り', placeholder: '総括・気づき・明日への誓い' },
          ],
        },
      };

      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [diaryFramework],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      const result = await frameworkService.getFrameworks();
      const diary = result.find((f) => f.id === 'diary');

      expect(diary).toBeDefined();
      expect(diary?.schema).toHaveLength(4);
      expect(diary?.schema.map((f) => f.id)).toEqual([
        'time_morning',
        'time_afternoon',
        'time_evening',
        'reflection',
      ]);
    });

    it('should handle errors from Supabase', async () => {
      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      await expect(frameworkService.getFrameworks()).rejects.toThrow(
        'フレームワーク取得エラー: Database connection failed'
      );
    });
  });

  describe('getFrameworkById', () => {
    it('should return a specific framework by ID', async () => {
      const dakiFramework = {
        id: 'daki',
        name: 'DAKI',
        display_name: 'Drop・Add・Keep・Improve',
        description: 'プロセス改善に特化',
        schema: {
          fields: [
            { id: 'drop', label: 'Drop', placeholder: 'やめること' },
            { id: 'add', label: 'Add', placeholder: '新たに始めること' },
            { id: 'keep', label: 'Keep', placeholder: '続けること' },
            { id: 'improve', label: 'Improve', placeholder: '改善すること' },
          ],
        },
        icon: '🔄',
        color: '#FF9800',
        is_active: true,
        sort_order: 3,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: dakiFramework,
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      const result = await frameworkService.getFrameworkById('daki');

      expect(result).toBeDefined();
      expect(result?.id).toBe('daki');
      expect(result?.name).toBe('DAKI');
      expect(result?.schema).toHaveLength(4);
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'daki');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should throw an error for non-existent framework', async () => {
      const mockSupabase = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabase as unknown as FromResult);

      await expect(frameworkService.getFrameworkById('nonexistent')).rejects.toThrow(
        'フレームワーク取得エラー: Not found'
      );
    });
  });
});
