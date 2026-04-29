export type EmotionalTrend = 'positive' | 'neutral' | 'negative';

export interface AnalysisRecommendations {
  actions: string[];
  focus_areas: string[];
}

export interface AnalysisMetadata {
  tokens_used: number;
  model: string;
  version: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  reflection_id: string;
  growth_points: string[];
  improvement_suggestions: string[];
  emotional_trend: EmotionalTrend;
  key_achievements: string[];
  challenges: string[];
  recommendations: AnalysisRecommendations;
  metadata: AnalysisMetadata;
  created_at: string;
  updated_at: string;
}

export interface AnalysisRequest {
  reflection_id: string;
}

export interface AnalysisResponse {
  analysis: Analysis;
  rate_limit: {
    remaining: number;
    limit: number;
    reset_at: string;
  };
}

export interface AnalysisError {
  code:
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'RATE_LIMITED'
    | 'OPENAI_ERROR'
    | 'INVALID_REQUEST'
    | 'INTERNAL_ERROR';
  message: string;
  retry_after?: number;
}

export interface OpenAIAnalysisPayload {
  growth_points: string[];
  improvement_suggestions: string[];
  emotional_trend: EmotionalTrend;
  key_achievements: string[];
  challenges: string[];
  recommendations: AnalysisRecommendations;
}
