/**
 * A6 — central journal & posting engine.
 *
 * Every module (AR, AP, inventory, payroll, manual entry) posts through this
 * repository so there is exactly one journal/posting path in the application.
 */
import { ApiError, apiRequest, isApiConfigured, previewDelay, validationError } from "@/services/api/client";
import { accounts, journals as db, USER } from "@/services/mock/accounting-db";
import { periodsRepository } from "./periods.repository";
import type {
  Journal,
  JournalInput,
  JournalLine,
  JournalLineInput,
  JournalStatus,
  Money,
  ReferenceType,
} from "@/types/accounting";

export interface JournalQuery {
  search?: string;
  status?: JournalStatus | "all";
  reference_type?: ReferenceType | "all";
  from?: string;
  to?: string;
}

export interface JournalTotals {
  debit: Money;
  credit: Money;
  difference: Money;
  balanced: boolean;
  postable: boolean;
}

/** Pure, integer-only totals used by the manual journal editor. */
export function journalTotals(lines: { debit: Money; credit: Money }[]): JournalTotals {
  const debit = lines.reduce((s, l) => s + Math.trunc(l.debit || 0), 0);
  const credit = lines.reduce((s, l) => s + Math.trunc(l.credit || 0), 0);
  const balanced = debit === credit;
  return { debit, credit, difference: debit - credit, balanced, postable: balanced && debit > 0 };
}

export function validateJournal(input: JournalInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.posting_date) errors["posting_date"] = "Posting date is required.";
  if (!input.description.trim()) errors["description"] = "Add a description for the journal.";
  const usable = input.lines.filter((l) => l.account_id || l.debit || l.credit);
  if (usable.length < 2) errors["lines"] = "A journal needs at least two lines.";
  usable.forEach((line, index) => {
    if (!line.account_id) errors[`lines.${index}.account_id`] = "Select an account.";
    if (line.debit < 0 || line.credit < 0) errors[`lines.${index}.amount`] = "Amounts cannot be negative.";
    if (line.debit > 0 && line.credit > 0)
      errors[`lines.${index}.amount`] = "A line carries either a debit or a credit, not both.";
    if (!line.debit && !line.credit) errors[`lines.${index}.amount`] = "Enter a debit or a credit.";
  });
  const totals = journalTotals(usable);
  if (!totals.balanced) errors["balance"] = "Total debit must equal total credit before posting.";
  else if (!totals.postable) errors["balance"] = "A journal must move a non-zero amount.";
  return errors;
}

function toLines(companyId: string, inputs: JournalLineInput[]): JournalLine[] {
  return inputs
    .filter((l) => l.account_id)
    .map((l) => {
      const account = accounts.find((a) => a.id === l.account_id && a.company_id === companyId);
      if (!account) throw new ApiError("A selected account does not belong to this company.", "permission");
      return {
        id: l.id,
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        description: l.description,
        debit: Math.trunc(l.debit),
        credit: Math.trunc(l.credit),
      };
    });
}

function nextNumber(companyId: string): string {
  const count = db.filter((j) => j.company_id === companyId).length + 1;
  return `JV-2026-${String(count + 90).padStart(4, "0")}`;
}

export const journalsRepository = {
  async list(companyId: string, query: JournalQuery = {}): Promise<Journal[]> {
    if (isApiConfigured()) return apiRequest<Journal[]>("/accounting/journals", { companyId, query: { ...query } });
    const q = (query.search ?? "").trim().toLowerCase();
    return previewDelay(
      db
        .filter((j) => j.company_id === companyId)
        .filter((j) => {
          const matchesSearch =
            !q ||
            j.number.toLowerCase().includes(q) ||
            j.reference.toLowerCase().includes(q) ||
            j.description.toLowerCase().includes(q);
          const matchesStatus = !query.status || query.status === "all" || j.status === query.status;
          const matchesType =
            !query.reference_type || query.reference_type === "all" || j.reference_type === query.reference_type;
          const matchesFrom = !query.from || j.posting_date >= query.from;
          const matchesTo = !query.to || j.posting_date <= query.to;
          return matchesSearch && matchesStatus && matchesType && matchesFrom && matchesTo;
        })
        .sort((a, b) => b.posting_date.localeCompare(a.posting_date)),
    );
  },

  async get(companyId: string, id: string): Promise<Journal> {
    if (isApiConfigured()) return apiRequest<Journal>(`/accounting/journals/${id}`, { companyId });
    const journal = db.find((j) => j.id === id && j.company_id === companyId);
    if (!journal) throw new ApiError("That journal does not exist in this company.", "not_found");
    return previewDelay(journal);
  },

  async saveDraft(companyId: string, input: JournalInput, id?: string): Promise<Journal> {
    if (isApiConfigured()) {
      return apiRequest<Journal>(id ? `/accounting/journals/${id}` : "/accounting/journals", {
        companyId,
        method: id ? "PATCH" : "POST",
        body: { ...input, status: "draft" },
      });
    }
    const errors = validateJournal(input);
    delete errors["balance"]; // a draft may be unbalanced; posting may not.
    if (Object.keys(errors).length) throw validationError("Please correct the highlighted fields.", errors);
    return previewDelay(upsertPreview(companyId, input, "draft", id), 320);
  },

  async post(companyId: string, input: JournalInput, id?: string): Promise<Journal> {
    await periodsRepository.assertOpen(companyId, input.posting_date);
    if (isApiConfigured()) {
      return apiRequest<Journal>(id ? `/accounting/journals/${id}/post` : "/accounting/journals/post", {
        companyId,
        method: "POST",
        body: input,
        idempotencyKey: id ? undefined : `manual-journal:${input.lines.map((line) => line.id).join(":")}`,
      });
    }
    const errors = validateJournal(input);
    if (Object.keys(errors).length) throw validationError("This journal cannot be posted yet.", errors);
    return previewDelay(upsertPreview(companyId, input, "posted", id), 420);
  },

  /** Posted journals are immutable — corrections create a reversing journal. */
  async reverse(companyId: string, id: string, postingDate: string, reason: string): Promise<Journal> {
    await periodsRepository.assertOpen(companyId, postingDate);
    if (isApiConfigured()) {
      return apiRequest<Journal>(`/accounting/journals/${id}/reverse`, {
        companyId,
        method: "POST",
        body: { posting_date: postingDate, reason },
        idempotencyKey: `journal-reversal:${id}`,
      });
    }
    const original = db.find((j) => j.id === id && j.company_id === companyId);
    if (!original) throw new ApiError("That journal does not exist in this company.", "not_found");
    if (original.status !== "posted")
      throw new ApiError("Only a posted journal can be reversed.", "conflict");
    const reversal: Journal = {
      ...structuredClone(original),
      id: `jr-rev-${Date.now().toString(36)}`,
      number: nextNumber(companyId),
      posting_date: postingDate,
      description: `Reversal of ${original.number} — ${reason}`,
      status: "posted",
      lines: original.lines.map((l) => ({ ...l, id: `${l.id}-rev`, debit: l.credit, credit: l.debit })),
      created_by: USER,
      created_at: new Date().toISOString(),
      posted_by: USER,
      posted_at: new Date().toISOString(),
      reverses_journal_id: original.id,
      reversed_by_journal_id: null,
    };
    original.status = "reversed";
    original.reversed_by_journal_id = reversal.id;
    db.push(reversal);
    return previewDelay(reversal, 420);
  },
};

function upsertPreview(
  companyId: string,
  input: JournalInput,
  status: JournalStatus,
  id?: string,
): Journal {
  const lines = toLines(companyId, input.lines);
  const totals = journalTotals(lines);
  const existing = id ? db.find((j) => j.id === id && j.company_id === companyId) : undefined;
  if (existing) {
    if (existing.status !== "draft")
      throw new ApiError("A posted journal cannot be edited. Post a reversing entry instead.", "conflict");
    Object.assign(existing, {
      posting_date: input.posting_date,
      reference: input.reference,
      description: input.description,
      lines,
      total_debit: totals.debit,
      total_credit: totals.credit,
      status,
      updated_by: USER,
      updated_at: new Date().toISOString(),
      posted_by: status === "posted" ? USER : null,
      posted_at: status === "posted" ? new Date().toISOString() : null,
    });
    return existing;
  }
  const journal: Journal = {
    id: `jr-new-${Date.now().toString(36)}`,
    company_id: companyId,
    number: nextNumber(companyId),
    posting_date: input.posting_date,
    reference: input.reference,
    reference_type: "manual_journal",
    source_label: null,
    source_route: null,
    description: input.description,
    status,
    lines,
    total_debit: totals.debit,
    total_credit: totals.credit,
    created_by: USER,
    created_at: new Date().toISOString(),
    updated_by: null,
    updated_at: null,
    posted_by: status === "posted" ? USER : null,
    posted_at: status === "posted" ? new Date().toISOString() : null,
    reverses_journal_id: null,
    reversed_by_journal_id: null,
  };
  db.push(journal);
  return journal;
}
