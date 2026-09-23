/** Stage 3 revenue-to-cash API contracts. Monetary inputs are integer minor units. */
import { apiRequest } from "@/services/api/client";
import type { Customer, CustomerInput, InvoiceDetail, InvoiceInput } from "@/types/accounting";

export interface InvoiceQuery {
  search?: string;
  status?: string;
  customer_id?: string;
  fbr_status?: string;
  from?: string;
  to?: string;
}

function compactHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export const invoicesRepository = {
  list(companyId: string, query: InvoiceQuery = {}): Promise<InvoiceDetail[]> {
    return apiRequest<InvoiceDetail[]>("/accounting/invoices", { companyId, query: { ...query } });
  },

  get(companyId: string, invoiceId: string): Promise<InvoiceDetail> {
    return apiRequest<InvoiceDetail>(`/accounting/invoices/${invoiceId}`, { companyId });
  },

  create(companyId: string, input: InvoiceInput, idempotencyKey?: string): Promise<InvoiceDetail> {
    const key = idempotencyKey ?? `invoice:${input.customer_id}:${input.invoice_date}:${compactHash(JSON.stringify(input))}`;
    return apiRequest<InvoiceDetail>("/accounting/invoices", { companyId, method: "POST", body: input, idempotencyKey: key });
  },

  update(companyId: string, invoiceId: string, input: InvoiceInput): Promise<InvoiceDetail> {
    return apiRequest<InvoiceDetail>(`/accounting/invoices/${invoiceId}`, { companyId, method: "PATCH", body: input });
  },

  remove(companyId: string, invoiceId: string): Promise<void> {
    return apiRequest<void>(`/accounting/invoices/${invoiceId}`, { companyId, method: "DELETE" });
  },

  post(companyId: string, invoiceId: string): Promise<InvoiceDetail> {
    return apiRequest<InvoiceDetail>(`/accounting/invoices/${invoiceId}/post`, { companyId, method: "POST" });
  },

  void(companyId: string, invoiceId: string, postingDate: string, reason: string): Promise<InvoiceDetail> {
    return apiRequest<InvoiceDetail>(`/accounting/invoices/${invoiceId}/void`, { companyId, method: "POST", body: { posting_date: postingDate, reason } });
  },

  submitFbr(companyId: string, invoiceId: string): Promise<InvoiceDetail> {
    return apiRequest<InvoiceDetail>(`/accounting/fbr/invoices/${invoiceId}/submit`, { companyId, method: "POST", idempotencyKey: `fbr:${invoiceId}` });
  },

  fbrList(companyId: string, query: InvoiceQuery = {}): Promise<InvoiceDetail[]> {
    return apiRequest<InvoiceDetail[]>("/accounting/fbr/invoices", { companyId, query: { ...query } });
  },

  customers(companyId: string): Promise<Customer[]> {
    return apiRequest<Customer[]>("/accounting/customers", { companyId });
  },

  createCustomer(companyId: string, input: CustomerInput): Promise<Customer> {
    return apiRequest<Customer>("/accounting/customers", { companyId, method: "POST", body: input });
  },

  updateCustomer(companyId: string, customerId: string, input: CustomerInput): Promise<Customer> {
    return apiRequest<Customer>(`/accounting/customers/${customerId}`, { companyId, method: "PATCH", body: input });
  },
};
