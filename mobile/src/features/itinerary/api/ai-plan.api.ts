import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export interface AIPlanGenerateRequest {
  sessionId: string;
  rawPrompt: string;
  userPreferences?: Record<string, unknown>;
}

export interface AIPlanGenerateResult {
  success: boolean;
  session_id: string;
  intent?: string | null;
  parsed_request?: unknown;
  candidate_pool?: unknown[];
  selected_hotel?: unknown | null;
  itinerary_days?: unknown[];
  clarification_question?: string | null;
  final_plan?: unknown | null;
  final_response_text?: string | null;
  trace_logs?: unknown[];
  warnings?: string[];
  errors?: unknown[];
  optimization_exhausted?: boolean;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  result: T;
}

export async function generateAIPlan(
  data: AIPlanGenerateRequest,
): Promise<AIPlanGenerateResult> {
  const response = await apiClient.post<ApiEnvelope<AIPlanGenerateResult>>(
    API_ENDPOINTS.AI.PLAN_GENERATE,
    data,
  );

  return response.result;
}

export function createAIPlanSessionId(): string {
  return `ai-plan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
