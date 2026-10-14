import { apiRequest, ensureCsrfCookie } from "@/services/api/client";
import type { CompanyProfile, CompanyProfileInput, CompanyProfilePage, NewCompanyInput, OnboardingPlans } from "@/types/companyProfile";

export const companyRepository = {
  onboardingPlans: () => apiRequest<OnboardingPlans>("/auth/onboarding/plans", {}),
  register: async (name: string, email: string, password: string, password_confirmation: string) => { await ensureCsrfCookie(); return apiRequest<{ message: string }>("/auth/register", { method: "POST", body: { name, email, password, password_confirmation } }); },
  verifyEmail: (id: string, hash: string, query: Record<string, string>) => apiRequest<{ message: string }>(`/auth/verify-email/${encodeURIComponent(id)}/${encodeURIComponent(hash)}`, { query }),
  resendVerification: () => apiRequest<{ message: string }>("/auth/verification/resend", { method: "POST", body: {} }),
  create: (input: NewCompanyInput, idempotencyKey: string) => apiRequest<{ company: { id: string }; trial_ends_at: string | null }>("/platform/companies", { method: "POST", idempotencyKey, body: input }),
  ownProfile: (companyId: string) => apiRequest<CompanyProfile>("/platform/company-profile", { companyId }),
  updateOwnProfile: (companyId: string, profile_version: number, input: CompanyProfileInput) => apiRequest<CompanyProfile>("/platform/company-profile", { method: "PATCH", companyId, body: { ...input, profile_version } }),
  pendingProfile: (id: string) => apiRequest<CompanyProfile>(`/platform/companies/${encodeURIComponent(id)}/pending-profile`, {}),
  updatePendingProfile: (id: string, profile_version: number, input: CompanyProfileInput) => apiRequest<CompanyProfile>(`/platform/companies/${encodeURIComponent(id)}/pending-profile`, { method: "PATCH", body: { ...input, profile_version } }),
  adminList: (companyId: string, search = "", page = 1) => apiRequest<CompanyProfilePage>("/platform/admin/companies", { companyId, query: { search, page, per_page: 10 } }),
  adminDetail: (companyId: string, target: string) => apiRequest<CompanyProfile>(`/platform/admin/companies/${encodeURIComponent(target)}`, { companyId }),
  adminUpdate: (companyId: string, target: string, profile_version: number, input: CompanyProfileInput) => apiRequest<CompanyProfile>(`/platform/admin/companies/${encodeURIComponent(target)}`, { method: "PATCH", companyId, body: { ...input, profile_version } }),
  approve: (companyId: string, target: string, profile_version: number, approval_status: "APPROVED" | "REJECTED") => apiRequest<CompanyProfile>(`/platform/admin/companies/${encodeURIComponent(target)}/approval`, { method: "POST", companyId, body: { profile_version, approval_status } }),
  activity: (companyId: string, target: string, profile_version: number, is_active: boolean) => apiRequest<CompanyProfile>(`/platform/admin/companies/${encodeURIComponent(target)}/activity`, { method: "PATCH", companyId, body: { profile_version, is_active } }),
};
