import { apiRequest } from "@/services/api/client";
import type { AccountProfile, EmployeeSelf, EmployeeLink, EmployeeOptions, PasswordChange } from "@/types/identity";
const linkPath = (membership: string) => `/platform/users/${encodeURIComponent(membership)}/employee-link`;
export const identityRepository = {
  profile: (signal?: AbortSignal) => apiRequest<AccountProfile>("/auth/profile", { signal }),
  saveName: (name: string, signal?: AbortSignal) => apiRequest<AccountProfile>("/auth/profile", { method: "PATCH", body: { name }, signal }),
  password: (body: PasswordChange, signal?: AbortSignal) => apiRequest<AccountProfile>("/auth/change-password", { method: "POST", body, signal }),
  employee: (companyId: string, signal?: AbortSignal) => apiRequest<EmployeeSelf>("/employee/me", { companyId, signal }),
  link: (companyId: string, membership: string, signal?: AbortSignal) => apiRequest<EmployeeLink>(linkPath(membership), { companyId, signal }),
  setLink: (companyId: string, membership: string, employee_id: string, signal?: AbortSignal) => apiRequest<EmployeeLink>(linkPath(membership), { companyId, method: "PUT", body: { employee_id }, signal }),
  unlink: (companyId: string, membership: string, signal?: AbortSignal) => apiRequest<EmployeeLink>(linkPath(membership), { companyId, method: "DELETE", signal }),
  options: (companyId: string, search: string, page: number, per_page: number, signal?: AbortSignal) => apiRequest<EmployeeOptions>("/platform/employee-link-options", { companyId, query: { search: search || undefined, page, per_page }, signal }),
};
