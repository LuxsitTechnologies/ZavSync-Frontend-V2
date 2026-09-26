import { apiRequest } from "@/services/api/client";
import type { LedgerQuery, LedgerResult, Money } from "@/types/accounting";

export const ledgerRepository = {
  entries(companyId: string, query: LedgerQuery): Promise<LedgerResult> {
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
  },

  trialBalance(companyId: string): Promise<{ debit: Money; credit: Money; balanced: boolean }> {
    return apiRequest("/accounting/ledger/trial-balance", { companyId });
  },
};
