export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AiCitation {
  id: string;
  ordinal: number;
  knowledge_source_id: string;
  knowledge_chunk_id: string;
  excerpt: string;
  locator: Record<string, unknown>;
  source?: { id: string; title: string; source_type: string };
}

export interface AiToolRun {
  id: string;
  tool_name: string;
  status: string;
  error_code?: string | null;
  created_at: string;
}

export interface AiActionExecution {
  id: string;
  status: string;
  result_type?: string | null;
  result_id?: string | null;
  result_summary?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  completed_at?: string | null;
}

export interface AiActionProposal {
  id: string;
  action_type: string;
  status: string;
  payload: Record<string, unknown>;
  impact_preview: Record<string, unknown>;
  required_permission: string;
  rejection_reason?: string | null;
  expires_at: string;
  created_at: string;
  execution?: AiActionExecution | null;
}

export interface AiMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  status: string;
  provider?: string | null;
  model?: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_minor: number;
  created_at: string;
  citations?: AiCitation[];
  tool_runs?: AiToolRun[];
  action_proposals?: AiActionProposal[];
}

export interface AiConversation {
  id: string;
  title: string;
  messages_count?: number;
  messages?: AiMessage[];
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeIngestionRun {
  id: string;
  status: string;
  source_version: number;
  attempt: number;
  chunk_count: number;
  failure_code?: string | null;
  failure_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface KnowledgeSource {
  id: string;
  document_id?: string | null;
  source_type: "NOTE" | "DOCUMENT";
  title: string;
  access_permission: string;
  status: string;
  version: number;
  chunk_count: number;
  indexed_at?: string | null;
  failed_at?: string | null;
  document?: { id: string; original_filename: string; mime_type: string; size_bytes?: number } | null;
  ingestion_runs?: KnowledgeIngestionRun[];
  ingestion_runs_count?: number;
  created_at: string;
}

export interface AiProviderConfiguration {
  id: string;
  provider: string;
  chat_model: string;
  embedding_model: string;
  settings: Record<string, unknown>;
  is_enabled: boolean;
}

export interface AiUsageSummary {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_minor: number;
}

export interface AiUsageRecord {
  id: string;
  provider: string;
  model: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  cost_minor: number;
  occurred_at: string;
}

export interface AiEvaluationCase {
  id: string;
  name: string;
  expected_citations: string[];
  expected_tools: string[];
  forbidden_actions: string[];
  is_active: boolean;
  runs_count?: number;
}

export interface AiEvaluationRun {
  id: string;
  status: string;
  score_bps?: number | null;
  checks?: Array<{ name: string; passed: boolean; detail: string }>;
  completed_at?: string | null;
  evaluation_case?: { id: string; name: string };
}

export interface OperationalPrioritySignal {
  id: string;
  category: string;
  source_module: string;
  source_type: string;
  source_id?: string | null;
  title: string;
  description: string;
  severity: string;
  priority_score: number;
  confidence_bps?: number | null;
  status: string;
  supporting_metrics: Record<string, unknown>;
  score_breakdown: Record<string, number>;
  explanation_metadata?: Record<string, unknown> | null;
  related_url?: string | null;
  due_at?: string | null;
  detected_at: string;
  assigned_user_id?: number | null;
  assigned_user?: { id: number; name: string; email: string } | null;
}

export interface AnomalyResult {
  id: string;
  category: string;
  source_module: string;
  metric: string;
  method: string;
  observed_value: number;
  expected_value: number;
  deviation_value: number;
  deviation_bps?: number | null;
  threshold_bps: number;
  sample_size: number;
  window_start: string;
  window_end: string;
  status: string;
  explanation: string;
}

export interface IntelligenceForecast {
  id: string;
  metric: string;
  source_module: string;
  method: string;
  horizon_days: number;
  status: string;
  source_data: Record<string, unknown>;
  assumptions: Record<string, unknown>;
  projection_points: Array<Record<string, unknown>>;
  confidence_bps?: number | null;
  limitations?: string | null;
  generated_at: string;
}

export interface IntelligenceScenario {
  id: string;
  name: string;
  scenario_type: string;
  status: string;
  assumptions: Record<string, number>;
  baseline: Record<string, number | string | null>;
  scenario: Record<string, number | string | null>;
  delta: Record<string, number>;
  calculated_at: string;
}

export interface IntelligenceBriefing {
  id: string;
  period: "TODAY" | "THIS_WEEK" | "THIS_MONTH";
  status: string;
  structured_data: {
    period: string;
    from: string;
    to: string;
    generated_from: string;
    top_priorities: OperationalPrioritySignal[];
    sections: Array<{ category: string; count: number; signals: OperationalPrioritySignal[] }>;
  };
  narrative?: string | null;
  provider?: string | null;
  model?: string | null;
  enrichment_error_code?: string | null;
  enrichment_attempted_at?: string | null;
  generated_at: string;
}

export interface IntelligenceObservability {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_minor: number;
  average_latency_ms?: number | null;
  failures: number;
  retrieval_count: number;
  citation_count: number;
  proposal_count: number;
  by_provider: Array<Record<string, unknown>>;
  by_model: Array<Record<string, unknown>>;
  by_operation: Array<Record<string, unknown>>;
  errors: Array<{ category: string; count: number }>;
  tools: { runs: number; failed: number; by_name: Array<Record<string, unknown>> };
  vector_store: { driver: string; available: boolean; production_external: boolean };
}

export interface ProviderReconciliation {
  id: string;
  provider: string;
  period_start: string;
  period_end: string;
  internal_cost_minor: number;
  provider_cost_minor?: number | null;
  difference_minor?: number | null;
  status: string;
  provider_reference?: string | null;
}

export interface IntelligenceEvaluationDashboard {
  runs: AiEvaluationRun[];
  summary: {
    total: number;
    completed: number;
    average_score_bps?: number | null;
    checks: Array<{ name: string; runs: number; passed: number; pass_rate_bps: number }>;
  };
}

export interface CalendarCapability {
  available: boolean;
  provider: string | null;
  status: string;
  message: string;
}
