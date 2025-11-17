import { createClient } from '@supabase/supabase-js';
import { Framework, FrameworkField } from '@/types/framework';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const frameworkService = {
  async getFrameworks(): Promise<Framework[]> {
    const { data, error } = await supabase
      .from('frameworks')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`フレームワーク取得エラー: ${error.message}`);
    }

    return (data || []).map((framework) => {
      const fields = (framework.schema?.fields || []) as FrameworkField[];
      // フィールドをorder属性でソートして正しい順序を保証
      const sortedFields = fields.sort((a: FrameworkField, b: FrameworkField) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });

      return {
        ...framework,
        schema: sortedFields,
      };
    });
  },

  async getFrameworkById(id: string): Promise<Framework | null> {
    const { data, error } = await supabase
      .from('frameworks')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new Error(`フレームワーク取得エラー: ${error.message}`);
    }

    if (!data) return null;

    const fields = (data.schema?.fields || []) as FrameworkField[];
    // フィールドをorder属性でソートして正しい順序を保証
    const sortedFields = fields.sort((a: FrameworkField, b: FrameworkField) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      return orderA - orderB;
    });

    return {
      ...data,
      schema: sortedFields,
    };
  },
};