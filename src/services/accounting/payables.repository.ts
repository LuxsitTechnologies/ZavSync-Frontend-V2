/** Stage 4 procure-to-pay API contracts. Monetary inputs are integer minor units. */
import { apiRequest } from "@/services/api/client";
import type {
  AgingRow,
  BillStatus,
  Payment,
  PaymentInput,
  Statement,
  Supplier,
  SupplierBill,
  SupplierBillInput,
  SupplierInput,
} from "@/types/accounting";

export interface BillQuery {
  search?: string;
  status?: BillStatus | "all";
  supplier_id?: string | "all";
  from?: string;
  to?: string;
  due_within_days?: number | null;
}

function compactHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export const payablesRepository = {
  suppliers(companyId: string, search = ""): Promise<Supplier[]> {
    return apiRequest<Supplier[]>("/accounting/payables/suppliers", { companyId, query: { search } });
  },

  saveSupplier(companyId: string, input: SupplierInput, id?: string): Promise<Supplier> {
    return apiRequest<Supplier>(id ? `/accounting/payables/suppliers/${id}` : "/accounting/payables/suppliers", {
      companyId,
      method: id ? "PATCH" : "POST",
      body: input,
    });
  },

  bills(companyId: string, query: BillQuery = {}): Promise<SupplierBill[]> {
    return apiRequest<SupplierBill[]>("/accounting/payables/bills", { companyId, query: { ...query } });
  },

  createBill(companyId: string, input: SupplierBillInput, idempotencyKey?: string): Promise<SupplierBill> {
    const key = idempotencyKey ?? `supplier-bill:${input.supplier_id}:${input.supplier_invoice_number}:${compactHash(JSON.stringify(input))}`;
    return apiRequest<SupplierBill>("/accounting/payables/bills", { companyId, method: "POST", body: input, idempotencyKey: key });
  },

  postBill(companyId: string, billId: string): Promise<SupplierBill> {
    return apiRequest<SupplierBill>(`/accounting/payables/bills/${billId}/post`, { companyId, method: "POST" });
  },

  payments(companyId: string, supplierId?: string): Promise<Payment[]> {
    return apiRequest<Payment[]>("/accounting/payables/payments", { companyId, query: { supplier_id: supplierId ?? "" } });
  },

  recordPayment(companyId: string, billId: string, input: PaymentInput, idempotencyKey?: string): Promise<SupplierBill> {
    const key = idempotencyKey ?? `supplier-payment:${billId}:${compactHash(JSON.stringify(input))}`;
    return apiRequest<SupplierBill>(`/accounting/payables/bills/${billId}/payments`, {
      companyId,
      method: "POST",
      body: input,
      idempotencyKey: key,
    });
  },

  aging(companyId: string, asOf?: string): Promise<AgingRow[]> {
    return apiRequest<AgingRow[]>("/accounting/payables/aging", { companyId, query: { as_of: asOf } });
  },

  statement(companyId: string, supplierId: string, from: string, to: string): Promise<Statement> {
    return apiRequest<Statement>(`/accounting/payables/suppliers/${supplierId}/statement`, {
      companyId,
      query: { from, to },
    });
  },
};
