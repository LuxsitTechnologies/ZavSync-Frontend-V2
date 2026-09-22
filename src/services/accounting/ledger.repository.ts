/** A2 — General Ledger reads, derived from posted journals only. */
import { apiRequest, isApiConfigured, previewDelay } from "@/services/api/client";
import { accounts, journals } from "@/services/mock/accounting-db";
import type { LedgerEntry, LedgerQuery, LedgerResult, Money } from "@/types/accounting";

export const ledgerRepository = {
  async entries(companyId: string, query: LedgerQuery): Promise<LedgerResult> {
    if (isApiConfigured()) {
      return apiRequest<LedgerResult>("/accounting/ledger", {
        companyId,
        query: {
          account_id: query.account_id ?? "",
          from: query.from ?? "",
          to: query.to ?? "",
          reference_type: query.reference_type === "all" ? "" : (query.reference_type ?? ""),
          reference: query.reference ?? "",
          search: query.search ?? "",
        },
      });
    }

    const account = accounts.find((a) => a.id === query.account_id && a.company_id === companyId);
    const q = (query.search ?? "").trim().toLowerCase();

    const rows: (Omit<LedgerEntry, "running_balance"> & { running_balance: Money })[] = [];
    const posted = journals
      .filter((j) => j.company_id === companyId && j.status !== "draft")
      .sort((a, b) => a.posting_date.localeCompare(b.posting_date));

    let opening: Money = account ? account.opening_balance : 0;
    for (const journal of posted) {
      for (const line of journal.lines) {
        if (account && line.account_id !== account.id) continue;
        const beforeRange = query.from ? journal.posting_date < query.from : false;
        if (beforeRange) {
          opening += line.debit - line.credit;
          continue;
        }
        if (query.to && journal.posting_date > query.to) continue;
        if (query.reference_type && query.reference_type !== "all" && journal.reference_type !== query.reference_type)
          continue;
        if (query.reference && !journal.reference.toLowerCase().includes(query.reference.toLowerCase())) continue;
        if (
          q &&
          !`${journal.number} ${journal.reference} ${journal.description} ${line.description} ${line.account_name}`
            .toLowerCase()
            .includes(q)
        )
          continue;
        rows.push({
          id: line.id,
          company_id: companyId,
          posting_date: journal.posting_date,
          journal_id: journal.id,
          journal_number: journal.number,
          account_id: line.account_id,
          account_code: line.account_code,
          account_name: line.account_name,
          reference_type: journal.reference_type,
          reference: journal.reference,
          description: line.description || journal.description,
          debit: line.debit,
          credit: line.credit,
          running_balance: 0,
        });
      }
    }

    let running = opening;
    for (const row of rows) {
      running += row.debit - row.credit;
      row.running_balance = running;
    }

    return previewDelay({
      opening_balance: opening,
      closing_balance: running,
      total_debit: rows.reduce((s, r) => s + r.debit, 0),
      total_credit: rows.reduce((s, r) => s + r.credit, 0),
      entries: rows,
    });
  },

  /** Trial-balance style totals for the GL summary cards. */
  async trialBalance(companyId: string): Promise<{ debit: Money; credit: Money; balanced: boolean }> {
    if (isApiConfigured()) {
      return apiRequest("/accounting/ledger/trial-balance", { companyId });
    }
    const posted = journals.filter((j) => j.company_id === companyId && j.status === "posted");
    const debit = posted.reduce((s, j) => s + j.total_debit, 0);
    const credit = posted.reduce((s, j) => s + j.total_credit, 0);
    return previewDelay({ debit, credit, balanced: debit === credit });
  },
};
