/** A4 — Accounts Payable: suppliers, bills, payments, aging, statements. */
import { ApiError, apiRequest, isApiConfigured, previewDelay, validationError } from "@/services/api/client";
import { accounts, supplierBills, supplierPayments, suppliers, USER } from "@/services/mock/accounting-db";
import type {
  AgingRow,
  BillStatus,
  Money,
  Payment,
  PaymentInput,
  Statement,
  StatementLine,
  Supplier,
  SupplierBill,
  SupplierInput,
} from "@/types/accounting";

const TODAY = "2026-09-21";

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}

function bucketKey(days: number): keyof Omit<AgingRow, "party_id" | "party_name" | "total"> {
  if (days <= 0) return "current";
  if (days <= 30) return "d1_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
}

export interface BillQuery {
  search?: string;
  status?: BillStatus | "all";
  supplier_id?: string | "all";
  from?: string;
  to?: string;
  due_within_days?: number | null;
}

export const payablesRepository = {
  async suppliers(companyId: string, search = ""): Promise<Supplier[]> {
    if (isApiConfigured()) {
      return apiRequest<Supplier[]>("/accounting/payables/suppliers", { companyId, query: { search } });
    }
    const q = search.trim().toLowerCase();
    return previewDelay(
      suppliers
        .filter((s) => s.company_id === companyId)
        .filter((s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)),
    );
  },

  async saveSupplier(companyId: string, input: SupplierInput, id?: string): Promise<Supplier> {
    if (isApiConfigured()) {
      return apiRequest<Supplier>(id ? `/accounting/payables/suppliers/${id}` : "/accounting/payables/suppliers", {
        companyId,
        method: id ? "PATCH" : "POST",
        body: input,
      });
    }
    const errors: Record<string, string> = {};
    if (!input.name.trim()) errors["name"] = "Supplier name is required.";
    if (input.payment_terms_days < 0) errors["payment_terms_days"] = "Payment terms cannot be negative.";
    if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) errors["email"] = "Enter a valid email address.";
    for (const key of ["default_expense_account_id", "default_payable_account_id"] as const) {
      const value = input[key];
      if (value && !accounts.some((a) => a.id === value && a.company_id === companyId))
        errors[key] = "Choose an account from this company.";
    }
    if (Object.keys(errors).length) throw validationError("Please correct the highlighted fields.", errors);

    if (id) {
      const supplier = suppliers.find((s) => s.id === id && s.company_id === companyId);
      if (!supplier) throw new ApiError("That supplier does not exist in this company.", "not_found");
      Object.assign(supplier, input, { updated_by: USER, updated_at: new Date().toISOString() });
      return previewDelay(supplier, 320);
    }
    const supplier: Supplier = {
      id: `sup-new-${Date.now().toString(36)}`,
      company_id: companyId,
      code: `SUP-${String(suppliers.filter((s) => s.company_id === companyId).length + 1).padStart(3, "0")}`,
      outstanding: 0,
      created_by: USER,
      created_at: new Date().toISOString(),
      updated_by: null,
      updated_at: null,
      ...input,
    };
    suppliers.push(supplier);
    return previewDelay(supplier, 320);
  },

  async bills(companyId: string, query: BillQuery = {}): Promise<SupplierBill[]> {
    if (isApiConfigured()) {
      return apiRequest<SupplierBill[]>("/accounting/payables/bills", { companyId, query: { ...query } });
    }
    const q = (query.search ?? "").trim().toLowerCase();
    return previewDelay(
      supplierBills
        .filter((b) => b.company_id === companyId)
        .filter((b) => {
          const matchesSearch =
            !q || b.bill_number.toLowerCase().includes(q) || b.supplier_name.toLowerCase().includes(q) ||
            b.reference.toLowerCase().includes(q);
          const matchesStatus = !query.status || query.status === "all" || b.status === query.status;
          const matchesSupplier =
            !query.supplier_id || query.supplier_id === "all" || b.supplier_id === query.supplier_id;
          const matchesFrom = !query.from || b.bill_date >= query.from;
          const matchesTo = !query.to || b.bill_date <= query.to;
          const matchesDue =
            query.due_within_days === null ||
            query.due_within_days === undefined ||
            (b.outstanding > 0 && daysBetween(TODAY, b.due_date) <= query.due_within_days);
          return matchesSearch && matchesStatus && matchesSupplier && matchesFrom && matchesTo && matchesDue;
        })
        .sort((a, b) => b.bill_date.localeCompare(a.bill_date)),
    );
  },

  async payments(companyId: string, billId?: string): Promise<Payment[]> {
    if (isApiConfigured()) {
      return apiRequest<Payment[]>("/accounting/payables/payments", { companyId, query: { bill_id: billId ?? "" } });
    }
    return previewDelay(
      supplierPayments.filter((p) => p.company_id === companyId && (!billId || p.document_id === billId)),
    );
  },

  /** Backend posts Dr Accounts Payable / Cr Bank and returns the updated bill. */
  async recordPayment(companyId: string, billId: string, input: PaymentInput): Promise<SupplierBill> {
    if (isApiConfigured()) {
      return apiRequest<SupplierBill>(`/accounting/payables/bills/${billId}/payments`, {
        companyId,
        method: "POST",
        body: input,
      });
    }
    const bill = supplierBills.find((b) => b.id === billId && b.company_id === companyId);
    if (!bill) throw new ApiError("That bill does not exist in this company.", "not_found");
    if (bill.status === "draft")
      throw new ApiError("Approve the draft bill before recording a payment against it.", "conflict");
    const errors: Record<string, string> = {};
    if (input.amount <= 0) errors["amount"] = "Enter an amount greater than zero.";
    if (input.amount > bill.outstanding) errors["amount"] = "Payment cannot exceed the outstanding balance.";
    if (!input.payment_date) errors["payment_date"] = "Payment date is required.";
    if (!input.bank_account_id) errors["bank_account_id"] = "Select the account the payment was made from.";
    if (Object.keys(errors).length) throw validationError("This payment cannot be recorded yet.", errors);

    bill.paid_amount += input.amount;
    bill.outstanding = bill.total - bill.paid_amount;
    const overdue = bill.outstanding > 0 ? Math.max(0, daysBetween(bill.due_date, TODAY)) : 0;
    bill.status = bill.outstanding <= 0 ? "paid" : overdue > 0 ? "overdue" : "partial";
    bill.days_overdue = overdue;
    const supplier = suppliers.find((s) => s.id === bill.supplier_id);
    if (supplier) supplier.outstanding = Math.max(0, supplier.outstanding - input.amount);
    supplierPayments.push({
      id: `pay-${Date.now().toString(36)}`,
      company_id: companyId,
      number: `PAY-${Date.now().toString().slice(-4)}`,
      party_id: bill.supplier_id,
      party_name: bill.supplier_name,
      document_id: bill.id,
      document_number: bill.bill_number,
      payment_date: input.payment_date,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      journal_id: null,
    });
    return previewDelay(bill, 420);
  },

  async aging(companyId: string): Promise<AgingRow[]> {
    if (isApiConfigured()) return apiRequest<AgingRow[]>("/accounting/payables/aging", { companyId });
    const rows = new Map<string, AgingRow>();
    for (const bill of supplierBills.filter(
      (b) => b.company_id === companyId && b.outstanding > 0 && b.status !== "draft",
    )) {
      const row =
        rows.get(bill.supplier_id) ??
        ({
          party_id: bill.supplier_id,
          party_name: bill.supplier_name,
          current: 0,
          d1_30: 0,
          d31_60: 0,
          d61_90: 0,
          d90_plus: 0,
          total: 0,
        } satisfies AgingRow);
      row[bucketKey(daysBetween(bill.due_date, TODAY))] += bill.outstanding;
      row.total += bill.outstanding;
      rows.set(bill.supplier_id, row);
    }
    return previewDelay([...rows.values()].sort((a, b) => b.total - a.total));
  },

  async statement(companyId: string, supplierId: string, from: string, to: string): Promise<Statement> {
    if (isApiConfigured()) {
      return apiRequest<Statement>(`/accounting/payables/suppliers/${supplierId}/statement`, {
        companyId,
        query: { from, to },
      });
    }
    const supplier = suppliers.find((s) => s.id === supplierId && s.company_id === companyId);
    if (!supplier) throw new ApiError("That supplier does not exist in this company.", "not_found");

    const events: Omit<StatementLine, "balance">[] = [];
    let opening: Money = 0;
    for (const bill of supplierBills.filter(
      (b) => b.company_id === companyId && b.supplier_id === supplierId && b.status !== "draft",
    )) {
      if (bill.bill_date < from) opening += bill.total;
      else if (bill.bill_date <= to)
        events.push({
          id: bill.id,
          date: bill.bill_date,
          type: "bill",
          reference: bill.bill_number,
          description: "Supplier bill",
          debit: 0,
          credit: bill.total,
        });
    }
    for (const payment of supplierPayments.filter(
      (p) => p.company_id === companyId && p.party_id === supplierId,
    )) {
      if (payment.payment_date < from) opening -= payment.amount;
      else if (payment.payment_date <= to)
        events.push({
          id: payment.id,
          date: payment.payment_date,
          type: "payment",
          reference: payment.number,
          description: `Payment against ${payment.document_number}`,
          debit: payment.amount,
          credit: 0,
        });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    let balance = opening;
    const lines: StatementLine[] = events.map((event) => {
      balance += event.credit - event.debit;
      return { ...event, balance };
    });

    return previewDelay({
      party_id: supplier.id,
      party_name: supplier.name,
      from,
      to,
      opening_balance: opening,
      closing_balance: balance,
      lines,
    });
  },

  async exportStatement(companyId: string, supplierId: string, from: string, to: string): Promise<{ url: string }> {
    if (isApiConfigured()) {
      return apiRequest<{ url: string }>(`/accounting/payables/suppliers/${supplierId}/statement/export`, {
        companyId,
        method: "POST",
        body: { from, to, format: "pdf" },
      });
    }
    throw new ApiError(
      "Supplier statement PDFs are generated by the ZavSync reporting service, which is not connected in this preview build.",
      "network",
    );
  },
};
