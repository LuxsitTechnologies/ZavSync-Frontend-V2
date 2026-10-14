import type { Paginated } from "@/types/platform";

export interface OnboardingPlan { id: number; code: "starter" | "professional" | "enterprise"; name: string }
export interface OnboardingPlans { plans: OnboardingPlan[]; trial_days_after_approval: number; checkout_available: boolean; catalogue_approved: boolean; pricing_certified: boolean }
export interface CompanyProfile {
  id: string; name: string; company_size: string | null; province_code: string | null;
  currency: string; timezone: string; approval_status: "PENDING" | "APPROVED" | "REJECTED";
  is_active: boolean; profile_version: number; email: string | null; phone: string | null;
  address: string | null; tax_identifier: string | null; fbr_credential_configured: boolean;
  created_at: string | null;
}
export interface CompanyProfileInput {
  name: string; company_size: string | null; province_code: string | null;
  email: string | null; phone: string | null; address: string | null; tax_identifier: string | null;
}
export interface NewCompanyInput extends CompanyProfileInput {
  currency: string; timezone: string; country_code: string; plan_id: number;
  fbr_token?: string;
  fbr_environment?: "SANDBOX" | "PRODUCTION";
}
export type CompanyProfilePage = Paginated<CompanyProfile>;
