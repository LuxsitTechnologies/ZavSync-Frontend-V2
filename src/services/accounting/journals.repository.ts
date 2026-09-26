import { apiRequest } from "@/services/api/client";
import type { Journal, JournalInput, JournalStatus, Money, ReferenceType } from "@/types/accounting";

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

/** Presentation-only totals; the backend independently validates and posts journals. */
export function journalTotals(lines: { debit: Money; credit: Money }[]): JournalTotals {
  const debit = lines.reduce((sum, line) => sum + Math.trunc(line.debit || 0), 0);
  const credit = lines.reduce((sum, line) => sum + Math.trunc(line.credit || 0), 0);
  const balanced = debit === credit;
  return { debit, credit, difference: debit - credit, balanced, postable: balanced && debit > 0 };
}

export const journalsRepository = {
  list(companyId: string, query: JournalQuery = {}): Promise<Journal[]> {
    return apiRequest<Journal[]>("/accounting/journals", { companyId, query: { ...query } });
  },

  get(companyId: string, id: string): Promise<Journal> {
    return apiRequest<Journal>(`/accounting/journals/${id}`, { companyId });
  },

  saveDraft(companyId: string, input: JournalInput, id?: string): Promise<Journal> {
    return apiRequest<Journal>(id ? `/accounting/journals/${id}` : "/accounting/journals", {
      companyId,
      method: id ? "PATCH" : "POST",
      body: { ...input, status: "draft" },
    });
  },

  post(companyId: string, input: JournalInput, id?: string): Promise<Journal> {
    return apiRequest<Journal>(id ? `/accounting/journals/${id}/post` : "/accounting/journals/post", {
      companyId,
      method: "POST",
      body: input,
      idempotencyKey: id ? undefined : crypto.randomUUID(),
    });
  },

  reverse(companyId: string, id: string, postingDate: string, reason: string): Promise<Journal> {
    return apiRequest<Journal>(`/accounting/journals/${id}/reverse`, {
      companyId,
      method: "POST",
      body: { posting_date: postingDate, reason },
      idempotencyKey: crypto.randomUUID(),
    });
  },
};
