import { apiRequest } from "@/services/api/client";
import type { Account, AccountInput, AccountNode, AccountType } from "@/types/accounting";

export interface AccountQuery {
  search?: string;
  type?: AccountType | "all";
  status?: "all" | "active" | "inactive";
}

export const accountsRepository = {
  list(companyId: string, query: AccountQuery = {}): Promise<AccountNode[]> {
    return apiRequest<AccountNode[]>("/accounting/accounts", { companyId, query: { ...query } });
  },

  selectable(companyId: string): Promise<AccountNode[]> {
    return apiRequest<AccountNode[]>("/accounting/accounts/selectable", { companyId });
  },

  get(companyId: string, id: string): Promise<Account> {
    return apiRequest<Account>(`/accounting/accounts/${id}`, { companyId });
  },

  create(companyId: string, input: AccountInput): Promise<Account> {
    return apiRequest<Account>("/accounting/accounts", { companyId, method: "POST", body: input });
  },

  update(companyId: string, id: string, input: AccountInput): Promise<Account> {
    return apiRequest<Account>(`/accounting/accounts/${id}`, {
      companyId,
      method: "PATCH",
      body: input,
    });
  },

  setActive(companyId: string, id: string, isActive: boolean): Promise<Account> {
    return apiRequest<Account>(`/accounting/accounts/${id}/status`, {
      companyId,
      method: "PATCH",
      body: { is_active: isActive },
    });
  },
};
