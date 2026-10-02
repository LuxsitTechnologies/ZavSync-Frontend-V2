import { apiRequest, ApiError, type RequestOptions } from "@/services/api/client";
import type { FbrAttempt, FbrConfiguration, FbrConfigurationInput, FbrDraft, FbrEvidence, FbrException, FbrInvoice, FbrMigration, FbrPage, FbrReference } from "@/types/fbr";

// Deliberately closed over one domain: callers cannot supply an API prefix.
async function request<T>(companyId: string, path: string, options: RequestOptions = {}): Promise<T> {
  if (!companyId) throw new ApiError("Select a company to use FBR Invoicing.", "permission");
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
  list: (company: string, page: number, perPage: number, historical: string) => request<FbrPage>(company, "/invoices", { query: { page, per_page: perPage, historical: historical || undefined } }),
  detail: (company: string, invoice: string) => request<FbrInvoice>(company, `/invoices/${id(invoice)}`),
  create: (company: string, body: FbrDraft, key: string) => request<FbrInvoice>(company, "/invoices", { method: "POST", body, idempotencyKey: key }),
  update: (company: string, invoice: string, body: FbrDraft) => request<FbrInvoice>(company, `/invoices/${id(invoice)}`, { method: "PATCH", body }),
  submit: (company: string, invoice: string, key: string) => request<FbrInvoice>(company, `/invoices/${id(invoice)}/submit`, { method: "POST", idempotencyKey: key }),
  retry: (company: string, invoice: string) => request<FbrInvoice>(company, `/invoices/${id(invoice)}/retry`, { method: "POST" }),
  attempts: (company: string, invoice: string) => request<FbrAttempt[]>(company, `/invoices/${id(invoice)}/attempts`),
  evidence: (company: string, invoice: string) => request<FbrEvidence[]>(company, `/historical-invoices/${id(invoice)}/evidence`),
  references: (company: string, effectiveOn?: string) => request<FbrReference[]>(company, "/reference-data", { query: { effective_on: effectiveOn } }),
  configuration: (company: string) => request<FbrConfiguration>(company, "/configuration"),
  saveConfiguration: (company: string, body: FbrConfigurationInput) => request<FbrConfiguration>(company, "/configuration", { method: "PUT", body }),
  migrations: (company: string) => request<FbrMigration[]>(company, "/migrations"),
  migration: (company: string, run: string) => request<FbrMigration>(company, `/migrations/${id(run)}`),
  exceptions: (company: string, run: string) => request<FbrException[]>(company, `/migrations/${id(run)}/exceptions`),
  resolve: (company: string, exception: string, resolution_state: "RESOLVED" | "IGNORED", resolution_note: string) => request<FbrException>(company, `/migration-exceptions/${id(exception)}`, { method: "PATCH", body: { resolution_state, resolution_note } }),
};
