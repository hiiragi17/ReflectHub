import { supabase } from "@/lib/supabase/client";
import {
  CreateReflectionRequest,
  UpdateReflectionRequest,
  ReflectionResponse,
  ReflectionError,
  Reflection,
} from "@/types/reflection";

const formatError = (error: unknown): ReflectionError => {
  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message,
    };
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const errObj = error as ReflectionError;
    return {
      code: errObj.code || "UNKNOWN_ERROR",
      message: errObj.message || "Unknown error occurred",
      details: errObj.details,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Unknown error occurred",
  };
};

const convertToUserTimezone = (
  utcDateString: string,
  timeZone: string = "Asia/Tokyo"
): string => {
  const utcDate = new Date(`${utcDateString}T00:00:00Z`);

  const userDate = utcDate.toLocaleString("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return userDate;
};

const convertTimestampToUserTimezone = (
  utcTimestamp: string,
  timeZone: string = "Asia/Tokyo"
): string => {
  const date = new Date(utcTimestamp);

  const userDate = date.toLocaleString("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const [datePart, timePart] = userDate.split(", ");
  return `${datePart}T${timePart}`;
};

export const createReflection = async (
  userId: string,
  request: CreateReflectionRequest
): Promise<ReflectionResponse> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      throw {
        code: "AUTH_ERROR",
        message: "Unauthorized: 他ユーザーの振り返りデータは作成できません。",
      };
    }

    const reflectionDate =
      request.reflection_date || new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("retrospectives")
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
      throw new Error("No data returned from server");
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

export const updateReflection = async (
  reflectionId: string,
  request: UpdateReflectionRequest
): Promise<ReflectionResponse> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw {
        code: "AUTH_ERROR",
        message: "Unauthorized: 認証されていません。ログインしてください。",
      };
    }

    const { data: reflectionRow, error: reflectionError } = await supabase
      .from("retrospectives")
      .select("user_id")
      .eq("id", reflectionId)
      .single();
    if (
      reflectionError ||
      !reflectionRow ||
      reflectionRow.user_id !== user.id
    ) {
      throw {
        code: "AUTH_ERROR",
        message: "Unauthorized: この振り返りデータの編集権限がありません。",
      };
    }

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
      .from("retrospectives")
      .update(updateData)
      .eq("id", reflectionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("No data returned from server");
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

export const getReflection = async (
  reflectionId: string,
  timeZone: string = "Asia/Tokyo"
): Promise<Reflection> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw {
        code: "AUTH_ERROR",
        message: "認証されていません。ログインしてください。",
      };
    }

    const { data, error } = await supabase
      .from("retrospectives")
      .select("*")
      .eq("id", reflectionId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Reflection not found");
    }

    const userTimezoneData = {
      ...data,
      reflection_date: convertToUserTimezone(data.reflection_date, timeZone),
      created_at: convertTimestampToUserTimezone(data.created_at, timeZone),
      updated_at: data.updated_at ? convertTimestampToUserTimezone(data.updated_at, timeZone) : null,
    };

    return userTimezoneData as Reflection;
  } catch (error) {
    throw formatError(error);
  }
};

export const getUserReflections = async (
  userId: string,
  limit: number = 50,
  timeZone: string = "Asia/Tokyo"
): Promise<Reflection[]> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      throw {
        code: "AUTH_ERROR",
        message: "Unauthorized: 他ユーザーの振り返りデータは取得できません。",
      };
    }

    const { data, error } = await supabase
      .from("retrospectives")
      .select("*")
      .eq("user_id", userId)
      .order("reflection_date", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    const userTimezoneData = (data || []).map((record) => ({
      ...record,
      reflection_date: convertToUserTimezone(record.reflection_date, timeZone),
      created_at: convertTimestampToUserTimezone(record.created_at, timeZone),
      updated_at: record.updated_at ? convertTimestampToUserTimezone(record.updated_at, timeZone) : null,
    }));

    return userTimezoneData as Reflection[];
  } catch (error) {
    throw formatError(error);
  }
};

export const deleteReflection = async (reflectionId: string): Promise<void> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw formatError({
        code: "AUTH_ERROR",
        message: "認証されていません。ログインしてください。",
      });
    }

    const { data: reflectionRow, error: reflectionError } = await supabase
      .from("retrospectives")
      .select("user_id")
      .eq("id", reflectionId)
      .single();
    if (reflectionError) {
      throw formatError(reflectionError);
    }
    if (!reflectionRow) {
      throw formatError({
        code: "NOT_FOUND",
        message: "Reflection not found.",
      });
    }
    if (reflectionRow.user_id !== user.id) {
      throw formatError({
        code: "FORBIDDEN",
        message: "この振り返りデータの削除権限がありません。",
      });
    }

    const { error, count } = await supabase
      .from("retrospectives")
      .delete({ count: "exact" })
      .eq("id", reflectionId);

    if (error) {
      throw formatError(error);
    }
    if (typeof count === "number" && count === 0) {
      throw formatError({
        code: "NOT_FOUND",
        message: "Reflection not found.",
      });
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
