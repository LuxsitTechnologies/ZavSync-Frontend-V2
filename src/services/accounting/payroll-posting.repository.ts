/** A7 — payroll ↔ accounting posting integration. */
import { ApiError, apiRequest, isApiConfigured, previewDelay } from "@/services/api/client";
import { accountMappings, journals, payrollPostings, USER } from "@/services/mock/accounting-db";
import { periodsRepository } from "./periods.repository";
import type { AccountMapping, Journal, PayrollPosting } from "@/types/accounting";

export const payrollPostingRepository = {
  async list(companyId: string): Promise<PayrollPosting[]> {
    if (isApiConfigured()) return apiRequest<PayrollPosting[]>("/accounting/payroll/postings", { companyId });
    return previewDelay(
      payrollPostings
        .filter((p) => p.company_id === companyId)
        .sort((a, b) => b.pay_date.localeCompare(a.pay_date)),
    );
  },

  async get(companyId: string, id: string): Promise<PayrollPosting> {
    if (isApiConfigured()) return apiRequest<PayrollPosting>(`/accounting/payroll/postings/${id}`, { companyId });
    const posting = payrollPostings.find((p) => p.id === id && p.company_id === companyId);
    if (!posting) throw new ApiError("That payroll run does not exist in this company.", "not_found");
    return previewDelay(posting);
  },

  /** Posts the run through the central journal engine and locks it. */
  async post(companyId: string, id: string, postingDate: string): Promise<PayrollPosting> {
    await periodsRepository.assertOpen(companyId, postingDate);
    if (isApiConfigured()) {
      return apiRequest<PayrollPosting>(`/accounting/payroll/postings/${id}/post`, {
        companyId,
        method: "POST",
        body: { posting_date: postingDate },
      });
    }
    const posting = payrollPostings.find((p) => p.id === id && p.company_id === companyId);
    if (!posting) throw new ApiError("That payroll run does not exist in this company.", "not_found");
    if (posting.accounting_status === "posted")
      throw new ApiError("This payroll run is already posted. Reverse it to make financial changes.", "conflict");
    const missing = posting.preview.filter((l) => !l.account_id && (l.debit > 0 || l.credit > 0));
    if (missing.length) {
      throw new ApiError(
        `Payroll account mapping is incomplete: ${missing.map((m) => m.label).join(", ")}. Configure it in accounting settings.`,
        "validation",
      );
    }
    const debit = posting.preview.reduce((s, l) => s + l.debit, 0);
    const credit = posting.preview.reduce((s, l) => s + l.credit, 0);
    if (debit !== credit)
      throw new ApiError("The payroll journal is unbalanced and was not posted.", "conflict");

    const journal: Journal = {
      id: `jr-pr-${Date.now().toString(36)}`,
      company_id: companyId,
      number: `JV-2026-${String(journals.filter((j) => j.company_id === companyId).length + 91).padStart(4, "0")}`,
      posting_date: postingDate,
      reference: posting.run_id,
      reference_type: "payroll",
      source_label: `Payroll run ${posting.run_id}`,
      source_route: "/payroll/posting",
      description: `Payroll posting — ${posting.period}`,
      status: "posted",
      lines: posting.preview
        .filter((l) => l.debit > 0 || l.credit > 0)
        .map((l, index) => ({
          id: `${posting.id}-l${index}`,
          account_id: l.account_id ?? "",
          account_code: l.account_code ?? "",
          account_name: l.account_name ?? l.label,
          description: l.label,
          debit: l.debit,
          credit: l.credit,
        })),
      total_debit: debit,
      total_credit: credit,
      created_by: USER,
      created_at: new Date().toISOString(),
      updated_by: null,
      updated_at: null,
      posted_by: USER,
      posted_at: new Date().toISOString(),
      reverses_journal_id: null,
      reversed_by_journal_id: null,
    };
    journals.push(journal);
    posting.accounting_status = "posted";
    posting.posting_date = postingDate;
    posting.journal_id = journal.id;
    posting.journal_number = journal.number;
    posting.locked = true;
    return previewDelay(posting, 460);
  },

  /** Explicit reversal is the only way to reopen a posted run for changes. */
  async reverse(companyId: string, id: string, postingDate: string, reason: string): Promise<PayrollPosting> {
    await periodsRepository.assertOpen(companyId, postingDate);
    if (isApiConfigured()) {
      return apiRequest<PayrollPosting>(`/accounting/payroll/postings/${id}/reverse`, {
        companyId,
        method: "POST",
        body: { posting_date: postingDate, reason },
      });
    }
    const posting = payrollPostings.find((p) => p.id === id && p.company_id === companyId);
    if (!posting) throw new ApiError("That payroll run does not exist in this company.", "not_found");
    if (posting.accounting_status !== "posted")
      throw new ApiError("Only a posted payroll run can be reversed.", "conflict");
    const original = journals.find((j) => j.id === posting.journal_id);
    if (original) {
      const reversal: Journal = {
        ...structuredClone(original),
        id: `jr-prrev-${Date.now().toString(36)}`,
        number: `${original.number}-R`,
        posting_date: postingDate,
        description: `Reversal of ${original.number} — ${reason}`,
        lines: original.lines.map((l) => ({ ...l, id: `${l.id}-rev`, debit: l.credit, credit: l.debit })),
        reverses_journal_id: original.id,
        posted_at: new Date().toISOString(),
      };
      original.status = "reversed";
      original.reversed_by_journal_id = reversal.id;
      journals.push(reversal);
    }
    posting.accounting_status = "reversed";
    posting.locked = false;
    return previewDelay(posting, 460);
  },

  async mappings(companyId: string): Promise<AccountMapping[]> {
    if (isApiConfigured()) return apiRequest<AccountMapping[]>("/accounting/settings/account-mappings", { companyId });
    return previewDelay(accountMappings.filter((m) => m.company_id === companyId));
  },

  async saveMapping(companyId: string, key: string, accountId: string | null): Promise<AccountMapping> {
    if (isApiConfigured()) {
      return apiRequest<AccountMapping>(`/accounting/settings/account-mappings/${key}`, {
        companyId,
        method: "PATCH",
        body: { account_id: accountId },
      });
    }
    const mapping = accountMappings.find((m) => m.company_id === companyId && m.key === key);
    if (!mapping) throw new ApiError("Unknown account mapping.", "not_found");
    mapping.account_id = accountId;
    return previewDelay(mapping, 260);
  },
};
