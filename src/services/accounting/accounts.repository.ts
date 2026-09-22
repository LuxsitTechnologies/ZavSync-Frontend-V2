/**
 * A1 — Chart of Accounts repository.
 * Pages never touch storage directly; swap the preview branch for `apiRequest`
 * once `/api/accounting/accounts` exists on the ZavSync backend.
 */
import { apiRequest, isApiConfigured, previewDelay, validationError, ApiError } from "@/services/api/client";
import { accounts as db, USER } from "@/services/mock/accounting-db";
import type { Account, AccountInput, AccountNode, AccountType } from "@/types/accounting";

export interface AccountQuery {
  search?: string;
  type?: AccountType | "all";
  status?: "all" | "active" | "inactive";
}

function scoped(companyId: string): Account[] {
  return db.filter((a) => a.company_id === companyId);
}

/** Depth-first ordering by code, so parents always precede their children. */
export function buildTree(list: Account[]): AccountNode[] {
  const out: AccountNode[] = [];
  const byParent = new Map<string | null, Account[]>();
  for (const account of list) {
    const key = account.parent_id;
    byParent.set(key, [...(byParent.get(key) ?? []), account]);
  }
  const roots = [...list.filter((a) => !a.parent_id || !list.some((p) => p.id === a.parent_id))];
  const walk = (nodes: Account[], depth: number) => {
    for (const node of nodes.sort((a, b) => a.code.localeCompare(b.code))) {
      const children = byParent.get(node.id) ?? [];
      out.push({ ...node, depth, has_children: children.length > 0 });
      walk(children, depth + 1);
    }
  };
  walk(roots, 0);
  return out;
}

export const accountsRepository = {
  async list(companyId: string, query: AccountQuery = {}): Promise<AccountNode[]> {
    if (isApiConfigured()) {
      return apiRequest<AccountNode[]>("/accounting/accounts", { companyId, query: { ...query } });
    }
    const q = (query.search ?? "").trim().toLowerCase();
    const filtered = scoped(companyId).filter((a) => {
      const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.code.includes(q);
      const matchesType = !query.type || query.type === "all" || a.type === query.type;
      const matchesStatus =
        !query.status ||
        query.status === "all" ||
        (query.status === "active" ? a.is_active : !a.is_active);
      return matchesSearch && matchesType && matchesStatus;
    });
    // Keep ancestors visible so the hierarchy still reads correctly while filtering.
    const ids = new Set(filtered.map((a) => a.id));
    const all = scoped(companyId);
    for (const account of filtered) {
      let parent = all.find((p) => p.id === account.parent_id);
      while (parent) {
        ids.add(parent.id);
        parent = all.find((p) => p.id === parent!.parent_id);
      }
    }
    return previewDelay(buildTree(all.filter((a) => ids.has(a.id))));
  },

  /** Flat, active-first list for account selectors across GL, AR, AP, inventory and payroll. */
  async selectable(companyId: string): Promise<AccountNode[]> {
    if (isApiConfigured()) {
      return apiRequest<AccountNode[]>("/accounting/accounts/selectable", { companyId });
    }
    return previewDelay(buildTree(scoped(companyId)), 120);
  },

  async get(companyId: string, id: string): Promise<Account> {
    if (isApiConfigured()) return apiRequest<Account>(`/accounting/accounts/${id}`, { companyId });
    const account = scoped(companyId).find((a) => a.id === id);
    if (!account) throw new ApiError("That account does not exist in this company.", "not_found");
    return previewDelay(account);
  },

  async create(companyId: string, input: AccountInput): Promise<Account> {
    if (isApiConfigured()) {
      return apiRequest<Account>("/accounting/accounts", { companyId, method: "POST", body: input });
    }
    const errors = validateAccount(companyId, input, null);
    if (Object.keys(errors).length) throw validationError("Please correct the highlighted fields.", errors);
    const account: Account = {
      id: `acc-new-${Date.now().toString(36)}`,
      company_id: companyId,
      code: input.code.trim(),
      name: input.name.trim(),
      type: input.type,
      parent_id: input.parent_id,
      is_active: input.is_active,
      is_system: false,
      description: input.description,
      currency: "PKR",
      opening_balance: input.opening_balance,
      opening_balance_date: input.opening_balance_date,
      balance: input.opening_balance,
      transaction_count: 0,
      created_by: USER,
      created_at: new Date().toISOString(),
      updated_by: null,
      updated_at: null,
    };
    db.push(account);
    return previewDelay(account, 320);
  },

  async update(companyId: string, id: string, input: AccountInput): Promise<Account> {
    if (isApiConfigured()) {
      return apiRequest<Account>(`/accounting/accounts/${id}`, { companyId, method: "PATCH", body: input });
    }
    const account = db.find((a) => a.id === id && a.company_id === companyId);
    if (!account) throw new ApiError("That account does not exist in this company.", "not_found");
    const errors = validateAccount(companyId, input, id);
    if (Object.keys(errors).length) throw validationError("Please correct the highlighted fields.", errors);
    Object.assign(account, {
      code: input.code.trim(),
      name: input.name.trim(),
      type: account.is_system ? account.type : input.type,
      parent_id: input.parent_id,
      is_active: input.is_active,
      description: input.description,
      opening_balance: account.transaction_count > 0 ? account.opening_balance : input.opening_balance,
      opening_balance_date:
        account.transaction_count > 0 ? account.opening_balance_date : input.opening_balance_date,
      updated_by: USER,
      updated_at: new Date().toISOString(),
    });
    return previewDelay(account, 320);
  },

  /** Deactivation replaces deletion — accounts with history are never removed. */
  async setActive(companyId: string, id: string, isActive: boolean): Promise<Account> {
    if (isApiConfigured()) {
      return apiRequest<Account>(`/accounting/accounts/${id}/status`, {
        companyId,
        method: "PATCH",
        body: { is_active: isActive },
      });
    }
    const account = db.find((a) => a.id === id && a.company_id === companyId);
    if (!account) throw new ApiError("That account does not exist in this company.", "not_found");
    if (account.is_system && !isActive) {
      throw new ApiError("System accounts are required by the posting engine and cannot be deactivated.", "conflict");
    }
    account.is_active = isActive;
    account.updated_by = USER;
    account.updated_at = new Date().toISOString();
    return previewDelay(account, 260);
  },
};

export function validateAccount(
  companyId: string,
  input: AccountInput,
  currentId: string | null,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.code.trim()) errors["code"] = "Account code is required.";
  else if (!/^\d{3,8}$/.test(input.code.trim())) errors["code"] = "Use 3–8 digits, e.g. 1020.";
  else if (
    db.some((a) => a.company_id === companyId && a.code === input.code.trim() && a.id !== currentId)
  )
    errors["code"] = "This code is already used in this company.";
  if (!input.name.trim()) errors["name"] = "Account name is required.";
  if (input.parent_id && input.parent_id === currentId) errors["parent_id"] = "An account cannot be its own parent.";
  if (input.parent_id) {
    const parent = db.find((a) => a.id === input.parent_id && a.company_id === companyId);
    if (!parent) errors["parent_id"] = "Choose a parent account from this company.";
    else if (parent.type !== input.type) errors["parent_id"] = "Parent account must have the same account type.";
  }
  if (input.opening_balance < 0) errors["opening_balance"] = "Opening balance cannot be negative.";
  if (input.opening_balance > 0 && !input.opening_balance_date)
    errors["opening_balance_date"] = "An opening balance needs an opening balance date.";
  return errors;
}
