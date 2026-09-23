/** A3 — backend-authoritative customer ledger, payments, aging, and statements. */
import { apiRequest } from "@/services/api/client";
import type { AgingRow, Customer, Payment, PaymentInput, ReceivableInvoice, ReceivableStatus, Statement } from "@/types/accounting";

export interface ReceivableQuery {
  search?: string;
  status?: ReceivableStatus | "all";
  customer_id?: string | "all";
  from?: string;
  to?: string;
  overdue_only?: boolean;
}

function compactHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export const receivablesRepository = {
  customers(companyId: string): Promise<Customer[]> {
    return apiRequest<Customer[]>("/accounting/receivables/customers", { companyId });
  },

  invoices(companyId: string, query: ReceivableQuery = {}): Promise<ReceivableInvoice[]> {
    return apiRequest<ReceivableInvoice[]>("/accounting/receivables/invoices", { companyId, query: { ...query } });
  },

  payments(companyId: string, invoiceId?: string): Promise<Payment[]> {
    return apiRequest<Payment[]>("/accounting/receivables/payments", { companyId, query: { invoice_id: invoiceId } });
  },

  recordPayment(companyId: string, invoiceId: string, input: PaymentInput): Promise<ReceivableInvoice> {
    const key = `payment:${invoiceId}:${input.payment_date}:${input.amount}:${compactHash(input.reference)}`;
    return apiRequest<ReceivableInvoice>(`/accounting/receivables/invoices/${invoiceId}/payments`, {
      companyId,
      method: "POST",
      body: input,
      idempotencyKey: key,
    });
  },

  aging(companyId: string, asOf?: string, customerId?: string): Promise<AgingRow[]> {
    return apiRequest<AgingRow[]>("/accounting/receivables/aging", { companyId, query: { as_of: asOf, customer_id: customerId } });
  },

  statement(companyId: string, customerId: string, from: string, to: string): Promise<Statement> {
    return apiRequest<Statement>(`/accounting/receivables/customers/${customerId}/statement`, { companyId, query: { from, to } });
  },
};
