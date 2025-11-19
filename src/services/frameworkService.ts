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

    return (data || []).map((framework) => ({
      ...framework,
      schema: framework.schema?.fields || [],
    }));
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

    return data ? {
      ...data,
      schema: data.schema?.fields || [],
    } : null;
  },
};