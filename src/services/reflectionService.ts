/**
 * 振り返りデータのサービス
 * Supabase との通信を担当
 * 
 * テーブル名: retrospectives
 * タイムゾーン: ユーザーのタイムゾーンに変換して返す
 */

import { createClient } from '@supabase/supabase-js';
import {
  CreateReflectionRequest,
  UpdateReflectionRequest,
  ReflectionResponse,
  ReflectionError,
  Reflection,
} from '@/types/reflection';

// Supabase クライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * エラーメッセージを統一フォーマットに変換
 */
const formatError = (error: unknown): ReflectionError => {
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return {
      code: (error as any).code || 'UNKNOWN_ERROR',
      message: (error as any).message || 'Unknown error occurred',
      details: (error as any).details,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Unknown error occurred',
  };
};

/**
 * UTC の日付をユーザーのタイムゾーンに変換
 * 
 * @param utcDateString UTC の日付（YYYY-MM-DD）
 * @param timeZone タイムゾーン（デフォルト: Asia/Tokyo）
 * @returns ユーザーのタイムゾーンの日付（YYYY-MM-DD）
 */
const convertToUserTimezone = (
  utcDateString: string,
  timeZone: string = 'Asia/Tokyo'
): string => {
  // UTC の日付オブジェクトを作成
  const utcDate = new Date(`${utcDateString}T00:00:00Z`);

  // ユーザーのタイムゾーンに変換して文字列に
  const userDate = utcDate.toLocaleString('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // "2025-11-03" 形式で返す
  return userDate;
};

/**
 * UTC のタイムスタンプをユーザーのタイムゾーンに変換
 * 
 * @param utcTimestamp UTC のタイムスタンプ（ISO 8601）
 * @param timeZone タイムゾーン（デフォルト: Asia/Tokyo）
 * @returns ユーザーのタイムゾーンのタイムスタンプ（ISO 8601）
 */
const convertTimestampToUserTimezone = (
  utcTimestamp: string,
  timeZone: string = 'Asia/Tokyo'
): string => {
  const date = new Date(utcTimestamp);

  const userDate = date.toLocaleString('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // "2025-11-03 10:30:45" → "2025-11-03T10:30:45Z" に変換
  const [datePart, timePart] = userDate.split(' ');
  return `${datePart}T${timePart}Z`;
};

/**
 * 振り返りデータを作成
 *
 * @param userId ユーザーID
 * @param request 作成リクエスト
 * @returns 作成された振り返りデータ
 * @throws ReflectionError
 */
export const createReflection = async (
  userId: string,
  request: CreateReflectionRequest
): Promise<ReflectionResponse> => {
  try {
    // 反射日が指定されていない場合は今日の日付を使用
    // reflection_date は UTC で保存される
    const reflectionDate = request.reflection_date || new Date().toISOString().split('T')[0];

    // DB に挿入
    const { data, error } = await supabase
      .from('retrospectives')
      .insert([
        {
          user_id: userId,
          framework_id: request.framework_id,
          content: request.content,
          reflection_date: reflectionDate,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from server');
    }

    return {
      id: data.id,
      user_id: data.user_id,
      framework_id: data.framework_id,
      content: data.content,
      reflection_date: data.reflection_date, // UTC のまま返す（フロント側で変換）
      created_at: data.created_at,
    };
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * 振り返りデータを更新
 *
 * @param reflectionId 振り返りID
 * @param request 更新リクエスト
 * @returns 更新された振り返りデータ
 * @throws ReflectionError
 */
export const updateReflection = async (
  reflectionId: string,
  request: UpdateReflectionRequest
): Promise<ReflectionResponse> => {
  try {
    const updateData: Record<string, unknown> = {};

    if (request.content !== undefined) {
      updateData.content = request.content;
    }
    if (request.title !== undefined) {
      updateData.title = request.title;
    }
    if (request.tags !== undefined) {
      updateData.tags = request.tags;
    }
    if (request.mood !== undefined) {
      updateData.mood = request.mood;
    }

    const { data, error } = await supabase
      .from('retrospectives')
      .update(updateData)
      .eq('id', reflectionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from server');
    }

    return {
      id: data.id,
      user_id: data.user_id,
      framework_id: data.framework_id,
      content: data.content,
      reflection_date: data.reflection_date,
      created_at: data.created_at,
    };
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * 振り返りデータを取得（ID指定）
 *
 * @param reflectionId 振り返りID
 * @param timeZone ユーザーのタイムゾーン（デフォルト: Asia/Tokyo）
 * @returns 振り返りデータ
 * @throws ReflectionError
 */
export const getReflection = async (
  reflectionId: string,
  timeZone: string = 'Asia/Tokyo'
): Promise<Reflection> => {
  try {
    const { data, error } = await supabase
      .from('retrospectives')
      .select('*')
      .eq('id', reflectionId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Reflection not found');
    }

    // reflection_date をユーザーのタイムゾーンに変換
    const userTimezoneData = {
      ...data,
      reflection_date: convertToUserTimezone(data.reflection_date, timeZone),
      created_at: convertTimestampToUserTimezone(data.created_at, timeZone),
    };

    return userTimezoneData as Reflection;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * ユーザーの振り返りを一覧取得
 *
 * @param userId ユーザーID
 * @param limit 取得件数（デフォルト: 50）
 * @param timeZone ユーザーのタイムゾーン（デフォルト: Asia/Tokyo）
 * @returns 振り返りデータの配列
 * @throws ReflectionError
 */
export const getUserReflections = async (
  userId: string,
  limit: number = 50,
  timeZone: string = 'Asia/Tokyo'
): Promise<Reflection[]> => {
  try {
    const { data, error } = await supabase
      .from('retrospectives')
      .select('*')
      .eq('user_id', userId)
      .order('reflection_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // 各レコードの日付をユーザーのタイムゾーンに変換
    const userTimezoneData = (data || []).map((record) => ({
      ...record,
      reflection_date: convertToUserTimezone(record.reflection_date, timeZone),
      created_at: convertTimestampToUserTimezone(record.created_at, timeZone),
    }));

    return userTimezoneData as Reflection[];
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * 振り返りデータを削除
 *
 * @param reflectionId 振り返りID
 * @throws ReflectionError
 */
export const deleteReflection = async (reflectionId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('retrospectives')
      .delete()
      .eq('id', reflectionId);

    if (error) {
      throw error;
    }
  } catch (error) {
    throw formatError(error);
  }
};

export const reflectionService = {
  create: createReflection,
  update: updateReflection,
  get: getReflection,
  getByUser: getUserReflections,
  delete: deleteReflection,
};