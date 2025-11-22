import { supabase } from '@/lib/supabase/client';
import { Framework } from '@/types/framework';

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
      const fields = framework.schema?.fields || [];
      // Sort fields by order property (ascending)
      const sortedFields = [...fields].sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
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

    if (!data) {
      return null;
    }

    const fields = data.schema?.fields || [];
    // Sort fields by order property (ascending)
    const sortedFields = [...fields].sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      return orderA - orderB;
    });

    return {
      ...data,
      schema: sortedFields,
    };
  },
};