export interface Reflection {
  id: string;
  user_id: string;
  framework_id: string;
  content: Record<string, string>; // { fieldId: "value", ... }
  title?: string;
  tags?: string[];
  mood?: string;
  period_start?: string;
  period_end?: string;
  reflection_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface CreateReflectionRequest {
  framework_id: string;
  content: Record<string, string>;
  reflection_date?: string; // デフォルト: 今日
}

export interface UpdateReflectionRequest {
  content?: Record<string, string>;
  title?: string;
  tags?: string[];
  mood?: string;
}

export interface ReflectionResponse {
  id: string;
  user_id: string;
  framework_id: string;
  content: Record<string, string>;
  reflection_date: string;
  created_at: string;
}

export interface ReflectionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}