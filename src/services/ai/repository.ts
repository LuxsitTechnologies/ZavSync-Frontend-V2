import { apiRequest } from "@/services/api/client";
import type {
  AiActionExecution,
  AiActionProposal,
  AiConversation,
  AiEvaluationCase,
  AiEvaluationRun,
  AiMessage,
  AiProviderConfiguration,
  AiUsageRecord,
  AiUsageSummary,
  KnowledgeIngestionRun,
  KnowledgeSource,
  Paginated,
} from "@/types/ai";

export const aiRepository = {
  conversations: (companyId: string) =>
    apiRequest<Paginated<AiConversation>>("/ai/conversations", { companyId }),
  conversation: (companyId: string, id: string) =>
    apiRequest<AiConversation>(`/ai/conversations/${id}`, { companyId }),
  createConversation: (companyId: string, title = "New conversation") =>
    apiRequest<AiConversation>("/ai/conversations", { method: "POST", companyId, body: { title } }),
  archiveConversation: (companyId: string, id: string) =>
    apiRequest<{ message: string }>(`/ai/conversations/${id}/archive`, { method: "POST", companyId, body: {} }),
  sendMessage: (companyId: string, conversationId: string, content: string, idempotencyKey: string) =>
    apiRequest<AiMessage>(`/ai/conversations/${conversationId}/messages`, {
      method: "POST",
      companyId,
      idempotencyKey,
      body: { content },
    }),
  tools: (companyId: string) =>
    apiRequest<{ data: Array<{ name: string; description: string; input_schema: Record<string, unknown> }> }>("/ai/tools", { companyId }),

  knowledgeSources: (companyId: string) =>
    apiRequest<Paginated<KnowledgeSource>>("/ai/knowledge-sources", { companyId }),
  knowledgeSource: (companyId: string, id: string) =>
    apiRequest<KnowledgeSource>(`/ai/knowledge-sources/${id}`, { companyId }),
  createKnowledgeSource: (companyId: string, input: Record<string, unknown>, idempotencyKey: string) =>
    apiRequest<{ source: KnowledgeSource; ingestion_run: KnowledgeIngestionRun }>("/ai/knowledge-sources", {
      method: "POST",
      companyId,
      idempotencyKey,
      body: input,
    }),
  updateKnowledgeSource: (companyId: string, id: string, input: Record<string, unknown>, idempotencyKey: string) =>
    apiRequest<{ source: KnowledgeSource; ingestion_run: KnowledgeIngestionRun }>(`/ai/knowledge-sources/${id}`, {
      method: "PUT",
      companyId,
      idempotencyKey,
      body: input,
    }),
  reindexKnowledgeSource: (companyId: string, id: string, idempotencyKey: string) =>
    apiRequest<KnowledgeIngestionRun>(`/ai/knowledge-sources/${id}/ingestions`, {
      method: "POST",
      companyId,
      idempotencyKey,
      body: {},
    }),
  removeKnowledgeSource: (companyId: string, id: string) =>
    apiRequest<{ message: string }>(`/ai/knowledge-sources/${id}`, { method: "DELETE", companyId }),

  actionProposals: (companyId: string) =>
    apiRequest<Paginated<AiActionProposal>>("/ai/action-proposals", { companyId }),
  actionProposal: (companyId: string, id: string) =>
    apiRequest<AiActionProposal>(`/ai/action-proposals/${id}`, { companyId }),
  approveAction: (companyId: string, id: string) =>
    apiRequest<AiActionProposal>(`/ai/action-proposals/${id}/approve`, { method: "POST", companyId, body: {} }),
  rejectAction: (companyId: string, id: string, reason: string) =>
    apiRequest<AiActionProposal>(`/ai/action-proposals/${id}/reject`, { method: "POST", companyId, body: { reason } }),
  executeAction: (companyId: string, id: string, idempotencyKey: string) =>
    apiRequest<AiActionExecution>(`/ai/action-proposals/${id}/execute`, { method: "POST", companyId, idempotencyKey, body: {} }),

  providerConfiguration: (companyId: string) =>
    apiRequest<{ configuration: AiProviderConfiguration | null; has_api_key: boolean }>("/ai/provider-configuration", { companyId }),
  updateProviderConfiguration: (companyId: string, input: Record<string, unknown>) =>
    apiRequest<{ configuration: AiProviderConfiguration; has_api_key: boolean }>("/ai/provider-configuration", { method: "PUT", companyId, body: input }),
  usage: (companyId: string) =>
    apiRequest<{ summary: AiUsageSummary; limits: Record<string, number>; records: Paginated<AiUsageRecord> }>("/ai/usage", { companyId }),
  evaluations: (companyId: string) =>
    apiRequest<{ cases: AiEvaluationCase[]; runs: AiEvaluationRun[] }>("/ai/evaluations", { companyId }),
  runEvaluation: (companyId: string, id: string) =>
    apiRequest<AiEvaluationRun>(`/ai/evaluations/${id}/runs`, { method: "POST", companyId, body: {} }),
};
