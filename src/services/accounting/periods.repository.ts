/** A2 — accounting period management and period-lock checks. */
import { ApiError, apiRequest } from "@/services/api/client";
import type { AccountingPeriod } from "@/types/accounting";
import type { AccountingCloseRecord, PeriodReadiness } from "@/types/planning";

export const periodsRepository = {
  list:(companyId:string)=>apiRequest<AccountingPeriod[]>("/accounting/periods",{companyId}),

  readiness:(companyId:string,id:string)=>apiRequest<PeriodReadiness>(`/accounting/periods/${id}/readiness`,{companyId}),
  close:(companyId:string,id:string)=>apiRequest<AccountingCloseRecord>(`/accounting/periods/${id}/close`,{method:"POST",companyId,body:{idempotency_key:crypto.randomUUID()}}),
  reopen:(companyId:string,id:string,reason:string)=>apiRequest<AccountingCloseRecord>(`/accounting/periods/${id}/reopen`,{method:"POST",companyId,body:{reason}}),
  history:(companyId:string)=>apiRequest<AccountingCloseRecord[]>("/accounting/close/history",{companyId}),

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
