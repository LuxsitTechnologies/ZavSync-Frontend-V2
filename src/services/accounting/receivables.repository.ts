/** A3 — Accounts Receivable: customer ledger, payments, aging, statements. */
import { ApiError, apiRequest, isApiConfigured, previewDelay, validationError } from "@/services/api/client";
import { customerPayments, customers, receivableInvoices } from "@/services/mock/accounting-db";
import type {
  AgingRow,
  Customer,
  Money,
  Payment,
  PaymentInput,
  ReceivableInvoice,
  ReceivableStatus,
  Statement,
  StatementLine,
} from "@/types/accounting";

const TODAY = "2026-09-21";

export interface ReceivableQuery {
  search?: string;
  status?: ReceivableStatus | "all";
  customer_id?: string | "all";
  from?: string;
  to?: string;
  overdue_only?: boolean;
}

function bucketKey(days: number): keyof Omit<AgingRow, "party_id" | "party_name" | "total"> {
  if (days <= 0) return "current";
  if (days <= 30) return "d1_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}

export const receivablesRepository = {
  async customers(companyId: string): Promise<Customer[]> {
    if (isApiConfigured()) return apiRequest<Customer[]>("/accounting/receivables/customers", { companyId });
    return previewDelay(customers.filter((c) => c.company_id === companyId));
  },

  async invoices(companyId: string, query: ReceivableQuery = {}): Promise<ReceivableInvoice[]> {
    if (isApiConfigured()) {
      return apiRequest<ReceivableInvoice[]>("/accounting/receivables/invoices", { companyId, query: { ...query } });
    }
    const q = (query.search ?? "").trim().toLowerCase();
    return previewDelay(
      receivableInvoices
        .filter((i) => i.company_id === companyId)
        .filter((i) => {
          const matchesSearch =
            !q || i.invoice_number.toLowerCase().includes(q) || i.customer_name.toLowerCase().includes(q);
          const matchesStatus = !query.status || query.status === "all" || i.status === query.status;
          const matchesCustomer =
            !query.customer_id || query.customer_id === "all" || i.customer_id === query.customer_id;
          const matchesFrom = !query.from || i.invoice_date >= query.from;
          const matchesTo = !query.to || i.invoice_date <= query.to;
          const matchesOverdue = !query.overdue_only || i.status === "overdue";
          return matchesSearch && matchesStatus && matchesCustomer && matchesFrom && matchesTo && matchesOverdue;
        })
        .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)),
    );
  },

  async payments(companyId: string, invoiceId?: string): Promise<Payment[]> {
    if (isApiConfigured()) {
      return apiRequest<Payment[]>("/accounting/receivables/payments", {
        companyId,
        query: { invoice_id: invoiceId ?? "" },
      });
    }
    return previewDelay(
      customerPayments.filter(
        (p) => p.company_id === companyId && (!invoiceId || p.document_id === invoiceId),
      ),
    );
  },

  /**
   * Records a receipt. The backend owns the journal (Dr Bank / Cr AR) — the UI
   * only sends the intent and re-reads the resulting balances.
   */
  async recordPayment(companyId: string, invoiceId: string, input: PaymentInput): Promise<ReceivableInvoice> {
    if (isApiConfigured()) {
      return apiRequest<ReceivableInvoice>(`/accounting/receivables/invoices/${invoiceId}/payments`, {
        companyId,
        method: "POST",
        body: input,
      });
    }
    const invoice = receivableInvoices.find((i) => i.id === invoiceId && i.company_id === companyId);
    if (!invoice) throw new ApiError("That invoice does not exist in this company.", "not_found");
    const errors: Record<string, string> = {};
    if (input.amount <= 0) errors["amount"] = "Enter an amount greater than zero.";
    if (input.amount > invoice.outstanding)
      errors["amount"] = "Payment cannot exceed the outstanding balance on this invoice.";
    if (!input.payment_date) errors["payment_date"] = "Payment date is required.";
    if (!input.bank_account_id) errors["bank_account_id"] = "Select the account the money was received into.";
    if (Object.keys(errors).length) throw validationError("This payment cannot be recorded yet.", errors);

    invoice.paid_amount += input.amount;
    invoice.outstanding = invoice.total - invoice.paid_amount;
    const overdue = invoice.outstanding > 0 ? Math.max(0, daysBetween(invoice.due_date, TODAY)) : 0;
    invoice.status = invoice.outstanding <= 0 ? "paid" : overdue > 0 ? "overdue" : "partial";
    invoice.days_overdue = overdue;
    const customer = customers.find((c) => c.id === invoice.customer_id);
    if (customer) customer.outstanding = Math.max(0, customer.outstanding - input.amount);
    customerPayments.push({
      id: `rcpt-${Date.now().toString(36)}`,
      company_id: companyId,
      number: `RCPT-${Date.now().toString().slice(-4)}`,
      party_id: invoice.customer_id,
      party_name: invoice.customer_name,
      document_id: invoice.id,
      document_number: invoice.invoice_number,
      payment_date: input.payment_date,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      journal_id: null,
    });
    return previewDelay(invoice, 420);
  },

  async aging(companyId: string): Promise<AgingRow[]> {
    if (isApiConfigured()) return apiRequest<AgingRow[]>("/accounting/receivables/aging", { companyId });
    const rows = new Map<string, AgingRow>();
    for (const invoice of receivableInvoices.filter(
      (i) => i.company_id === companyId && i.outstanding > 0,
    )) {
      const row =
        rows.get(invoice.customer_id) ??
        ({
          party_id: invoice.customer_id,
          party_name: invoice.customer_name,
          current: 0,
          d1_30: 0,
          d31_60: 0,
          d61_90: 0,
          d90_plus: 0,
          total: 0,
        } satisfies AgingRow);
      row[bucketKey(daysBetween(invoice.due_date, TODAY))] += invoice.outstanding;
      row.total += invoice.outstanding;
      rows.set(invoice.customer_id, row);
    }
    return previewDelay([...rows.values()].sort((a, b) => b.total - a.total));
  },

  async statement(companyId: string, customerId: string, from: string, to: string): Promise<Statement> {
    if (isApiConfigured()) {
      return apiRequest<Statement>(`/accounting/receivables/customers/${customerId}/statement`, {
        companyId,
        query: { from, to },
      });
    }
    const customer = customers.find((c) => c.id === customerId && c.company_id === companyId);
    if (!customer) throw new ApiError("That customer does not exist in this company.", "not_found");

    const events: Omit<StatementLine, "balance">[] = [];
    let opening: Money = 0;
    for (const invoice of receivableInvoices.filter(
      (i) => i.company_id === companyId && i.customer_id === customerId,
    )) {
      if (invoice.invoice_date < from) opening += invoice.total;
      else if (invoice.invoice_date <= to)
        events.push({
          id: invoice.id,
          date: invoice.invoice_date,
          type: "invoice",
          reference: invoice.invoice_number,
          description: "Sales invoice",
          debit: invoice.total,
          credit: 0,
        });
    }
    for (const payment of customerPayments.filter(
      (p) => p.company_id === companyId && p.party_id === customerId,
    )) {
      if (payment.payment_date < from) opening -= payment.amount;
      else if (payment.payment_date <= to)
        events.push({
          id: payment.id,
          date: payment.payment_date,
          type: "payment",
          reference: payment.number,
          description: `Receipt against ${payment.document_number}`,
          debit: 0,
          credit: payment.amount,
        });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    let balance = opening;
    const lines: StatementLine[] = events.map((event) => {
      balance += event.debit - event.credit;
      return { ...event, balance };
    });

    return previewDelay({
      party_id: customer.id,
      party_name: customer.name,
      from,
      to,
      opening_balance: opening,
      closing_balance: balance,
      lines,
    });
  },

  /**
   * Statement documents are produced by the backend reporting service. Until it
   * is connected this reports the gap instead of faking a PDF in the browser.
   */
  async exportStatement(companyId: string, customerId: string, from: string, to: string): Promise<{ url: string }> {
    if (isApiConfigured()) {
      return apiRequest<{ url: string }>(`/accounting/receivables/customers/${customerId}/statement/export`, {
        companyId,
        method: "POST",
        body: { from, to, format: "pdf" },
      });
    }
    throw new ApiError(
      "Statement PDFs are generated by the ZavSync reporting service, which is not connected in this preview build.",
      "network",
    );
  },
};
