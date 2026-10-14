import type { Paginated } from "@/types/platform";

export type BillingPlan = "starter" | "professional" | "enterprise";
export type BillingInterval = "monthly" | "annual";
export type BillingComponentKind = "addon" | "seat";

export interface BillingPrice {
  kind: "plan" | BillingComponentKind;
  code: string;
  currency: string;
  billing_interval: BillingInterval;
  version: number;
  unit_amount_minor: number | null;
  is_purchasable: boolean;
  provider_price_configured: boolean;
  checkout_available: boolean;
}
export interface BillingCatalogue {
  country_code: string | null;
  billing_currency: string | null;
  country_confirmation_required: boolean;
  provider_ready: boolean;
  prices: BillingPrice[];
  included_limits: Record<BillingPlan, { users: number; employees: number; storage_mb: number }>;
  additional_storage_available: false;
  prices_exclude_tax: boolean;
}
export interface BillingSummary {
  commercial: { state: string; subscription_id: string | null; trial_ends_at: string | null; grace_ends_at: string | null; paid_period_ends_at: string | null };
  country_code: string | null;
  billing_currency: string | null;
  subscription: { id: string; plan: string | null; status: string; billing_interval: string; renews_at: string | null; cancel_at_period_end_at: string | null } | null;
  latest_checkout: { id: string; status: string; created_at: string | null } | null;
  components: Array<{ id: string; kind: BillingComponentKind; code: string; quantity: number; scheduled_quantity: number | null; billing_interval: string; status: string; paid_through_at: string; cancel_at_period_end_at: string | null }>;
  plan_changes: Array<{ id: string; operation: string; source_plan: string | null; target_plan: string; target_billing_interval: string; status: string; effective_at: string | null }>;
  provider_ready: boolean;
  capabilities: { manage: boolean };
}
export interface BillingUsage {
  managed_billing: boolean;
  users: { active: number; pending_invitations: number; reserved_total: number; included: number | null; paid_overage: number; capacity: number | null; over_limit: boolean | null };
  employees: { active: number; included: number | null; paid_overage: number; capacity: number | null; over_limit: boolean | null };
  storage: { used_bytes: number; included_bytes: number | null; over_limit: boolean | null; additional_storage_available: false };
  ai: { period: string; used_tokens: number; reserved_tokens: number; included_tokens: number | null; remaining_tokens: number | null; paid_overage_available: false };
}
export interface BillingQuote {
  country_code: string; currency: string; plan: BillingPlan; billing_interval: BillingInterval;
  lines: Array<{ kind: string; code: string; quantity: number; unit_amount_minor: number; total_minor: number }>;
  subtotal_minor: number; discount_minor: number; tax_minor: number | null; total_minor: number; tax_status: string;
}
export interface BillingDocument {
  id: string; document_type: string; provider_status: string; currency: string;
  subtotal_minor: number; discount_minor: number; tax_minor: number | null; total_minor: number; paid_minor: number;
  issued_at: string | null; paid_at: string | null;
}
export interface BillingHistory {
  documents: Paginated<BillingDocument>;
  subscriptions: Array<{ id: string; plan: string | null; status: string; billing_interval: string; starts_at: string | null; renews_at: string | null; ends_at: string | null; cancel_at_period_end_at: string | null }>;
  plan_changes: Paginated<Record<string, unknown>>;
  components: Paginated<Record<string, unknown>>;
  seat_changes: Paginated<Record<string, unknown>>;
}
export interface BillingCheckoutResult { attempt_id: string; status: string; checkout_url: string | null; subscription_id?: string | null }
export interface BillingPlanChangeResult { change_id: string; operation: string; status: string; effective_at: string | null }
