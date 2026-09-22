/** A2 — accounting period management and period-lock checks. */
import { ApiError, apiRequest, isApiConfigured, previewDelay } from "@/services/api/client";
import { periods as db, USER } from "@/services/mock/accounting-db";
import type { AccountingPeriod } from "@/types/accounting";

export const periodsRepository = {
  async list(companyId: string): Promise<AccountingPeriod[]> {
    if (isApiConfigured()) return apiRequest<AccountingPeriod[]>("/accounting/periods", { companyId });
    return previewDelay(
      db.filter((p) => p.company_id === companyId).sort((a, b) => b.start_date.localeCompare(a.start_date)),
    );
  },

  async setStatus(companyId: string, id: string, status: AccountingPeriod["status"]): Promise<AccountingPeriod> {
    if (isApiConfigured()) {
      return apiRequest<AccountingPeriod>(`/accounting/periods/${id}`, {
        companyId,
        method: "PATCH",
        body: { status },
      });
    }
    const period = db.find((p) => p.id === id && p.company_id === companyId);
    if (!period) throw new ApiError("That period does not exist in this company.", "not_found");
    period.status = status;
    period.closed_by = status === "closed" ? USER : null;
    period.closed_at = status === "closed" ? new Date().toISOString() : null;
    return previewDelay(period, 300);
  },

  /** The period a date falls in, if any. */
  async periodFor(companyId: string, date: string): Promise<AccountingPeriod | null> {
    const list = await this.list(companyId);
    return list.find((p) => date >= p.start_date && date <= p.end_date) ?? null;
  },

  /** Throws when a posting date lands in a locked period. */
  async assertOpen(companyId: string, date: string): Promise<void> {
    const period = await this.periodFor(companyId, date);
    if (period && period.status === "closed") {
      throw new ApiError(
        `${period.name} is a closed accounting period. Reopen the period or choose a date in an open period.`,
        "conflict",
        { posting_date: `${period.name} is locked.` },
      );
    }
  },
};
