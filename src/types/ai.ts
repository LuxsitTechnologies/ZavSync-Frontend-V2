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
