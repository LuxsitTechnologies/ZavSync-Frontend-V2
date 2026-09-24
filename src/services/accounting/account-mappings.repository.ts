import { apiRequest } from "@/services/api/client";
import type { AccountMapping } from "@/types/accounting";

export const accountMappingsRepository = {
  list: (companyId: string) => apiRequest<AccountMapping[]>("/accounting/settings/account-mappings", { companyId }),
  save: (companyId: string, key: string, accountId: string | null) => apiRequest<AccountMapping>(`/accounting/settings/account-mappings/${key}`, { companyId, method: "PATCH", body: { account_id: accountId } }),
};
