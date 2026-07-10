export type SummaryPeriod = 'week' | 'month' | 'quarter';
export type MoodTrend = 'improving' | 'stable' | 'declining';

export interface SummaryRecommendations {
  actions: string[];
  focus_areas: string[];
}

export interface SummaryMetadata {
  tokens_used: number;
  model: string;
  version: string;
}

export interface Summary {
  id: string;
  user_id: string;
  period: SummaryPeriod;
  period_start: string;
  period_end: string;
  reflection_count: number;
  recurring_themes: string[];
  sustained_practices: string[];
  emerging_challenges: string[];
  growth_summary: string;
  mood_trend: MoodTrend;
  recommendations: SummaryRecommendations;
  metadata: SummaryMetadata;
  created_at: string;
  updated_at: string;
}

export interface SummaryRequest {
  period: SummaryPeriod;
}

export interface SummaryResponse {
  summary: Summary;
  rate_limit: {
    remaining: number;
    limit: number;
    reset_at: string;
  };
}

export interface SummaryError {
  code:
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'NO_REFLECTIONS'
    | 'INSUFFICIENT_REFLECTIONS'
    | 'RATE_LIMITED'
    | 'DUPLICATE_PERIOD'
    | 'OPENAI_ERROR'
    | 'INVALID_REQUEST'
    | 'INTERNAL_ERROR';
  message: string;
  retry_after?: number;
  /** INSUFFICIENT_REFLECTIONS のときに UI へ通知する情報 */
  required?: number;
  current?: number;
}

export interface OpenAISummaryPayload {
  recurring_themes: string[];
  sustained_practices: string[];
  emerging_challenges: string[];
  growth_summary: string;
  mood_trend: MoodTrend;
  recommendations: SummaryRecommendations;
}
