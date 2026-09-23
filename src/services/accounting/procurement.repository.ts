/** Stage 4 purchase-order, approval, receipt and bill-conversion API contracts. */
import { apiRequest } from "@/services/api/client";
import type { SupplierBill, SupplierBillInput } from "@/types/accounting";
import type { PurchaseOrder, PurchaseOrderInput } from "@/types/operations";

function compactHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export const procurementRepository = {
  list(companyId: string): Promise<PurchaseOrder[]> {
    return apiRequest<PurchaseOrder[]>("/purchases/orders", { companyId });
  },

  get(companyId: string, orderId: string): Promise<PurchaseOrder> {
    return apiRequest<PurchaseOrder>(`/purchases/orders/${orderId}`, { companyId });
  },

  create(companyId: string, input: PurchaseOrderInput): Promise<PurchaseOrder> {
    const key = `purchase-order:${input.supplier_id}:${input.order_date}:${compactHash(JSON.stringify(input))}`;
    return apiRequest<PurchaseOrder>("/purchases/orders", { companyId, method: "POST", body: input, idempotencyKey: key });
  },

  submit(companyId: string, orderId: string): Promise<PurchaseOrder> {
    return apiRequest<PurchaseOrder>(`/purchases/orders/${orderId}/submit`, { companyId, method: "POST" });
  },

  approve(companyId: string, orderId: string): Promise<PurchaseOrder> {
    return apiRequest<PurchaseOrder>(`/purchases/orders/${orderId}/approve`, { companyId, method: "POST" });
  },

  receiveRemaining(companyId: string, order: PurchaseOrder): Promise<unknown> {
    const lines = order.lines
      .map((line) => ({
        purchase_order_line_id: line.id,
        quantity_received_milli: line.quantity_milli - line.received_quantity_milli,
      }))
      .filter((line) => line.quantity_received_milli > 0);
    const input = { receipt_date: new Date().toISOString().slice(0, 10), lines };
    return apiRequest(`/purchases/orders/${order.id}/receipts`, {
      companyId,
      method: "POST",
      body: input,
      idempotencyKey: `receipt:${order.id}:${compactHash(JSON.stringify(input))}`,
    });
  },

  convertToBill(companyId: string, order: PurchaseOrder): Promise<SupplierBill> {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const input: SupplierBillInput = {
      supplier_id: order.supplier_id,
      purchase_order_id: order.id,
      supplier_invoice_number: `PO-${order.number}-${today}`,
      bill_date: today,
      posting_date: today,
      due_date: due.toISOString().slice(0, 10),
      currency: "PKR",
      lines: order.lines
        .map((line) => ({
          purchase_order_line_id: line.id,
          description: line.description,
          procurement_type: line.procurement_type,
          quantity_milli: line.received_quantity_milli - line.billed_quantity_milli,
          unit: line.unit,
          unit_price: line.unit_price,
          discount: 0,
          tax_rate_bps: line.tax_rate_bps,
          withholding_rate_bps: 0,
          expense_account_id: line.expense_account_id ?? "",
        }))
        .filter((line) => line.quantity_milli > 0),
    };
    return apiRequest<SupplierBill>(`/purchases/orders/${order.id}/convert-to-bill`, {
      companyId,
      method: "POST",
      body: input,
      idempotencyKey: `po-bill:${order.id}:${compactHash(JSON.stringify(input))}`,
    });
  },
};
