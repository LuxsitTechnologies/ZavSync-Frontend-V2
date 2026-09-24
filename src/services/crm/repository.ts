import { apiRequest } from "@/services/api/client";
import type { CrmActivity, CrmCompany, CrmContact, CrmDashboard, CrmDeal, CrmImport, CrmLead, CrmPipeline, CrmScoreRule, CustomerMatch, Owner, PageResult, Paginated } from "@/types/crm";

type DataPayload<T> = { data: T };
type ListResponse<T> = T[] | Paginated<T>;
type Query = Record<string, string | number | boolean | null | undefined>;
async function list<T>(path: string, companyId: string, query: Query = {}): Promise<T[]> {
  const response = await apiRequest<ListResponse<T>>(path, { companyId, query: { per_page: 100, ...query } });
  return Array.isArray(response) ? response : response.data;
}
async function page<T>(path: string, companyId: string, query: Query = {}): Promise<PageResult<T>> {
  const response = await apiRequest<Paginated<T>>(path, { companyId, query });
  const meta = response.meta;
  return { data: response.data, currentPage: meta?.current_page ?? response.current_page ?? 1, lastPage: meta?.last_page ?? response.last_page ?? 1, perPage: meta?.per_page ?? response.per_page ?? 25, total: meta?.total ?? response.total ?? response.data.length };
}
const idempotencyKey = () => crypto.randomUUID();
const normalizeLead = (lead: CrmLead): CrmLead => ({ ...lead, industry: lead.industry ?? "", size: lead.size ?? "", enrichment: lead.enrichment ?? { state: "not_enriched", summary: "", industry: "", size: "", profile: "", painPoints: [], opportunities: [], valueProposition: "", sources: [] } });

export const crmRepository = {
  companies: (companyId: string, query: Query = {}) => list<CrmCompany>("/crm/accounts", companyId, query),
  companiesPage: (companyId: string, query: Query = {}) => page<CrmCompany>("/crm/accounts", companyId, query),
  company: (companyId: string, id: string) => apiRequest<CrmCompany>(`/crm/accounts/${id}`, { companyId }),
  createCompany: (companyId: string, input: Record<string, unknown>) => apiRequest<CrmCompany>("/crm/accounts", { method: "POST", companyId, body: input }),
  updateCompany: (companyId: string, id: string, input: Record<string, unknown>) => apiRequest<CrmCompany>(`/crm/accounts/${id}`, { method: "PATCH", companyId, body: input }),
  archiveCompany: (companyId: string, id: string) => apiRequest<void>(`/crm/accounts/${id}`, { method: "DELETE", companyId }),
  customerMatches: (companyId: string, accountId: string) => list<CustomerMatch>(`/crm/accounts/${accountId}/customer-matches`, companyId),
  handoffAccount: (companyId: string, accountId: string, input: Record<string, unknown>) => apiRequest<CustomerMatch>(`/crm/accounts/${accountId}/customer-handoff`, { method: "POST", companyId, body: { ...input, idempotency_key: idempotencyKey() } }),
  contacts: (companyId: string, query: Query = {}) => list<CrmContact>("/crm/contacts", companyId, query),
  contactsPage: (companyId: string, query: Query = {}) => page<CrmContact>("/crm/contacts", companyId, query),
  contact: (companyId: string, id: string) => apiRequest<CrmContact>(`/crm/contacts/${id}`, { companyId }),
  createContact: (companyId: string, input: Record<string, unknown>) => apiRequest<CrmContact>("/crm/contacts", { method: "POST", companyId, body: input }),
  updateContact: (companyId: string, id: string, input: Record<string, unknown>) => apiRequest<CrmContact>(`/crm/contacts/${id}`, { method: "PATCH", companyId, body: input }),
  deleteContact: (companyId: string, id: string) => apiRequest<void>(`/crm/contacts/${id}`, { method: "DELETE", companyId }),
  leads: async (companyId: string, query: Query = {}) => (await list<CrmLead>("/crm/leads", companyId, query)).map(normalizeLead),
  leadsPage: async (companyId: string, query: Query = {}) => { const result = await page<CrmLead>("/crm/leads", companyId, query); return { ...result, data: result.data.map(normalizeLead) }; },
  lead: async (companyId: string, id: string) => normalizeLead(await apiRequest<CrmLead>(`/crm/leads/${id}`, { companyId })),
  createLead: async (companyId: string, input: Record<string, unknown>) => normalizeLead(await apiRequest<CrmLead>("/crm/leads", { method: "POST", companyId, body: input })),
  updateLead: async (companyId: string, id: string, input: Record<string, unknown>) => normalizeLead(await apiRequest<CrmLead>(`/crm/leads/${id}`, { method: "PATCH", companyId, body: input })),
  deleteLead: (companyId: string, id: string) => apiRequest<void>(`/crm/leads/${id}`, { method: "DELETE", companyId }),
  transitionLead: async (companyId: string, id: string, status: string, qualificationNotes?: string) => normalizeLead(await apiRequest<CrmLead>(`/crm/leads/${id}/transition`, { method: "POST", companyId, body: { status, qualification_notes: qualificationNotes } })),
  convertLead: async (companyId: string, id: string, input: Record<string, unknown>) => normalizeLead(await apiRequest<CrmLead>(`/crm/leads/${id}/convert`, { method: "POST", companyId, body: { ...input, idempotency_key: idempotencyKey() } })),
  pipelines: (companyId: string) => list<CrmPipeline>("/crm/pipelines", companyId),
  pipeline: (companyId: string, id: string) => apiRequest<CrmPipeline>(`/crm/pipelines/${id}`, { companyId }),
  createPipeline: (companyId: string, input: Record<string, unknown>) => apiRequest<CrmPipeline>("/crm/pipelines", { method: "POST", companyId, body: input }),
  updatePipeline: (companyId: string, id: string, input: Record<string, unknown>) => apiRequest<CrmPipeline>(`/crm/pipelines/${id}`, { method: "PATCH", companyId, body: input }),
  deletePipeline: (companyId: string, id: string) => apiRequest<void>(`/crm/pipelines/${id}`, { method: "DELETE", companyId }),
  deals: (companyId: string, query: Query = {}) => list<CrmDeal>("/crm/deals", companyId, query),
  dealsPage: (companyId: string, query: Query = {}) => page<CrmDeal>("/crm/deals", companyId, query),
  deal: (companyId: string, id: string) => apiRequest<CrmDeal>(`/crm/deals/${id}`, { companyId }),
  createDeal: (companyId: string, input: Record<string, unknown>) => apiRequest<CrmDeal>("/crm/deals", { method: "POST", companyId, body: input }),
  updateDeal: (companyId: string, id: string, input: Record<string, unknown>) => apiRequest<CrmDeal>(`/crm/deals/${id}`, { method: "PATCH", companyId, body: input }),
  deleteDeal: (companyId: string, id: string) => apiRequest<void>(`/crm/deals/${id}`, { method: "DELETE", companyId }),
  transitionDeal: (companyId: string, id: string, pipelineStageId: string, lossReason?: string) => apiRequest<CrmDeal>(`/crm/deals/${id}/transition`, { method: "POST", companyId, body: { pipeline_stage_id: pipelineStageId, loss_reason: lossReason } }),
  handoffDeal: (companyId: string, id: string, input: Record<string, unknown>) => apiRequest<CustomerMatch>(`/crm/deals/${id}/customer-handoff`, { method: "POST", companyId, body: { ...input, idempotency_key: idempotencyKey() } }),
  activities: (companyId: string, query: Query = {}) => list<CrmActivity>("/crm/activities", companyId, query),
  activitiesPage: (companyId: string, query: Query = {}) => page<CrmActivity>("/crm/activities", companyId, query),
  createActivity: (companyId: string, input: Record<string, unknown>) => apiRequest<CrmActivity>("/crm/activities", { method: "POST", companyId, body: input }),
  updateActivity: (companyId: string, id: string, input: Record<string, unknown>) => apiRequest<CrmActivity>(`/crm/activities/${id}`, { method: "PATCH", companyId, body: input }),
  transitionActivity: (companyId: string, id: string, status: "PENDING" | "COMPLETED", outcome?: string) => apiRequest<CrmActivity>(`/crm/activities/${id}/transition`, { method: "POST", companyId, body: { status, outcome } }),
  deleteActivity: (companyId: string, id: string) => apiRequest<void>(`/crm/activities/${id}`, { method: "DELETE", companyId }),
  owners: async (companyId: string) => (await apiRequest<DataPayload<Owner[]>>("/crm/owners", { companyId })).data,
  dashboard: async (companyId: string) => (await apiRequest<DataPayload<CrmDashboard>>("/crm/dashboard", { companyId })).data,
  pipelineReport: async (companyId: string) => (await apiRequest<DataPayload<Record<string, unknown>>>("/crm/reports/pipeline", { companyId })).data,
  activityReport: async (companyId: string) => (await apiRequest<DataPayload<Record<string, unknown>>>("/crm/reports/activities", { companyId })).data,
  scoreRules: (companyId: string) => list<CrmScoreRule>("/crm/score-rules", companyId),
  createScoreRule: (companyId: string, input: Record<string, unknown>) => apiRequest<CrmScoreRule>("/crm/score-rules", { method: "POST", companyId, body: input }),
  updateScoreRule: (companyId: string, id: string, input: Record<string, unknown>) => apiRequest<CrmScoreRule>(`/crm/score-rules/${id}`, { method: "PUT", companyId, body: input }),
  deleteScoreRule: (companyId: string, id: string) => apiRequest<void>(`/crm/score-rules/${id}`, { method: "DELETE", companyId }),
  recalculateScore: (companyId: string, type: "lead" | "deal", id: string) => apiRequest<CrmLead | CrmDeal>(`/crm/scores/${type}/${id}/recalculate`, { method: "POST", companyId, body: {} }),
  imports: (companyId: string) => list<CrmImport>("/crm/imports", companyId),
  previewImport: (companyId: string, input: { entity_type: string; filename: string; csv: string; mapping: Record<string, string> }) => apiRequest<CrmImport>("/crm/imports/preview", { method: "POST", companyId, body: input }),
  confirmImport: (companyId: string, id: string, decisions: Record<string, "CREATE" | "SKIP"> = {}) => apiRequest<CrmImport>(`/crm/imports/${id}/confirm`, { method: "POST", companyId, body: { idempotency_key: idempotencyKey(), decisions } }),
};
