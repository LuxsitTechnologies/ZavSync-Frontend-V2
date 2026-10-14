import { apiRequest, ApiError, type RequestOptions } from "@/services/api/client";
import type { FbrAttempt, FbrConfiguration, FbrConfigurationInput, FbrDraft, FbrEvidence, FbrException, FbrInvoice, FbrListFilters, FbrMigration, FbrPage, FbrReference } from "@/types/fbr";
import type { PortalSettings, PortalSettingsInput } from "@/types/portalSettings";
import type { FbrPrintData } from "@/types/fbrPrint";

// Deliberately closed over one domain: callers cannot supply an API prefix.
async function request<T>(companyId: string, path: string, options: RequestOptions = {}): Promise<T> {
  if (!companyId) throw new ApiError("Select a company to use FBR Invoice.", "permission");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await apiRequest<T>(`/pakistan-fbr${path}`, { ...options, companyId, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
const id = (value: string) => encodeURIComponent(value);
export const fbrRepository = {
  list: (company: string, page: number, perPage: number, historical: string, filters: FbrListFilters = {}) => request<FbrPage>(company, "/invoices", { query: { page, per_page: perPage, historical: historical || undefined, ...filters } }),
  detail: (company: string, invoice: string) => request<FbrInvoice>(company, `/invoices/${id(invoice)}`),
  deleteDraft: (company: string, invoice: string) => request<{ message: string }>(company, `/invoices/${id(invoice)}`, { method: "DELETE" }),
  printData: (company: string, invoice: string) => request<FbrPrintData>(company, `/invoices/${id(invoice)}/print-data`),
  reconcile: (company: string, invoice: string) => request<FbrInvoice>(company, `/invoices/${id(invoice)}/reconcile`, { method: "POST" }),
  resolveUncertain: (company: string, invoice: string, body: { outcome: "ACCEPTED" | "REJECTED"; evidence_note: string; fbr_reference_number: string | null }, key: string) => request<FbrInvoice>(company, `/invoices/${id(invoice)}/resolve`, { method: "POST", body, idempotencyKey: key }),
  creditNotes: (company: string, invoice: string) => request<{ invoice_id: string; eligible: boolean; full_reversal_total: number | null; data: import("@/types/fbr").FbrCreditNote[] }>(company, `/invoices/${id(invoice)}/credit-notes`),
  createCreditNote: (company: string, invoice: string, reason: string, key: string) => request<import("@/types/fbr").FbrCreditNote>(company, `/invoices/${id(invoice)}/credit-notes`, { method: "POST", body: { reason }, idempotencyKey: key }),
  updateCreditNote: (company: string, invoice: string, credit: string, reason: string) => request<import("@/types/fbr").FbrCreditNote>(company, `/invoices/${id(invoice)}/credit-notes/${id(credit)}`, { method: "PATCH", body: { reason } }),
  deleteCreditNote: (company: string, invoice: string, credit: string) => request<{ deleted: boolean }>(company, `/invoices/${id(invoice)}/credit-notes/${id(credit)}`, { method: "DELETE" }),
  submitCreditNote: (company: string, invoice: string, credit: string, key: string) => request<import("@/types/fbr").FbrCreditNote>(company, `/invoices/${id(invoice)}/credit-notes/${id(credit)}/submit`, { method: "POST", idempotencyKey: key }),
  reconcileCreditNote: (company: string, invoice: string, credit: string, body: { outcome: "ACCEPTED" | "REJECTED"; evidence_note: string; fbr_reference_number: string | null }, key: string) => request<import("@/types/fbr").FbrCreditNote>(company, `/invoices/${id(invoice)}/credit-notes/${id(credit)}/reconcile`, { method: "POST", body, idempotencyKey: key }),
  creditAttempts: (company: string, invoice: string, credit: string) => request<{ data: Array<{ id: string; status: string; reference_number: string | null; error_message: string | null; completed_at: string | null }> }>(company, `/invoices/${id(invoice)}/credit-notes/${id(credit)}/attempts`),
  creditPrintData: (company: string, invoice: string, credit: string) => request<Record<string, unknown>>(company, `/invoices/${id(invoice)}/credit-notes/${id(credit)}/print-data`),
  create: (company: string, body: FbrDraft, key: string) => request<FbrInvoice>(company, "/invoices", { method: "POST", body, idempotencyKey: key }),
  update: (company: string, invoice: string, body: FbrDraft) => request<FbrInvoice>(company, `/invoices/${id(invoice)}`, { method: "PATCH", body }),
  submit: (company: string, invoice: string, key: string) => request<FbrInvoice>(company, `/invoices/${id(invoice)}/submit`, { method: "POST", idempotencyKey: key }),
  retry: (company: string, invoice: string) => request<FbrInvoice>(company, `/invoices/${id(invoice)}/retry`, { method: "POST" }),
  attempts: (company: string, invoice: string) => request<FbrAttempt[]>(company, `/invoices/${id(invoice)}/attempts`),
  evidence: (company: string, invoice: string) => request<FbrEvidence[]>(company, `/historical-invoices/${id(invoice)}/evidence`),
  references: (company: string, effectiveOn?: string) => request<FbrReference[]>(company, "/reference-data", { query: { effective_on: effectiveOn } }),
  searchReferences: (company: string, category: string, search: string, page = 1) => request<{ data: FbrReference[]; meta: { current_page: number; last_page: number; total: number } }>(company, "/reference-data/search", { query: { category, search, page, per_page: 25 } }),
  configuration: (company: string) => request<FbrConfiguration>(company, "/configuration"),
  portalSettings: (company: string) => request<PortalSettings>(company, "/portal-settings"),
  savePortalSettings: (company: string, version: number, body: PortalSettingsInput) => request<PortalSettings>(company, "/portal-settings", { method: "PUT", body: { version, ...body } }),
  resetPortalSettings: (company: string, version: number) => request<PortalSettings>(company, "/portal-settings/reset", { method: "POST", body: { version } }),
  uploadPortalLogo: (company: string, version: number, logo: File) => { const body = new FormData(); body.set("version", String(version)); body.set("logo", logo); return request<PortalSettings>(company, "/portal-settings/logo", { method: "POST", body }); },
  replacePortalCredential: (company: string, version: number, credential: string) => request<PortalSettings>(company, "/portal-settings/credential", { method: "PUT", body: { version, credential } }),
  removePortalCredential: (company: string, version: number) => request<PortalSettings>(company, "/portal-settings/credential", { method: "DELETE", body: { version } }),
  saveConfiguration: (company: string, body: FbrConfigurationInput) => request<FbrConfiguration>(company, "/configuration", { method: "PUT", body }),
  migrations: (company: string) => request<FbrMigration[]>(company, "/migrations"),
  migration: (company: string, run: string) => request<FbrMigration>(company, `/migrations/${id(run)}`),
  exceptions: (company: string, run: string) => request<FbrException[]>(company, `/migrations/${id(run)}/exceptions`),
  resolve: (company: string, exception: string, resolution_state: "RESOLVED" | "IGNORED", resolution_note: string) => request<FbrException>(company, `/migration-exceptions/${id(exception)}`, { method: "PATCH", body: { resolution_state, resolution_note } }),
};
