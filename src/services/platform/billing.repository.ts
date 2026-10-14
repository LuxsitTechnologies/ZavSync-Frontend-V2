import { apiRequest } from "@/services/api/client";
import type { BillingCatalogue, BillingCheckoutResult, BillingComponentKind, BillingHistory, BillingInterval, BillingPlan, BillingPlanChangeResult, BillingQuote, BillingSummary, BillingUsage } from "@/types/billing";

const root = "/platform/billing";
export const billingRepository = {
  catalogue: (companyId: string) => apiRequest<BillingCatalogue>(`${root}/catalogue`, { companyId }),
  summary: (companyId: string) => apiRequest<BillingSummary>(`${root}/summary`, { companyId }),
  usage: (companyId: string) => apiRequest<BillingUsage>(`${root}/usage`, { companyId }),
  history: (companyId: string, page = 1) => apiRequest<BillingHistory>(`${root}/history`, { companyId, query: { page, per_page: 25 } }),
  quote: (companyId: string, plan: BillingPlan, billing_interval: BillingInterval) => apiRequest<BillingQuote>(`${root}/quote`, { method: "POST", companyId, body: { plan, billing_interval } }),
  confirmCountry: (companyId: string, country_code: string) => apiRequest<{ country_code: string; billing_currency: string; confirmed_at: string }>(`${root}/country`, { method: "PUT", companyId, body: { country_code } }),
  checkout: (companyId: string, plan: BillingPlan, billing_interval: BillingInterval, idempotencyKey: string) => apiRequest<BillingCheckoutResult>(`${root}/checkout`, { method: "POST", companyId, idempotencyKey, body: { plan, billing_interval } }),
  reconcileCheckout: (companyId: string, attempt: string) => apiRequest<BillingCheckoutResult>(`${root}/checkout/${encodeURIComponent(attempt)}/reconcile`, { method: "POST", companyId, body: {} }),
  componentCheckout: (companyId: string, kind: BillingComponentKind, code: string, quantity: number, idempotencyKey: string) => apiRequest<BillingCheckoutResult>(`${root}/components/checkout`, { method: "POST", companyId, idempotencyKey, body: { kind, code, quantity } }),
  cancelComponent: (companyId: string, id: string) => apiRequest<{ component_id: string; status: string }>(`${root}/components/${encodeURIComponent(id)}/cancel`, { method: "POST", companyId, body: {} }),
  reduceSeats: (companyId: string, id: string, target_quantity: number, idempotencyKey: string) => apiRequest<{ component_id: string; status: string }>(`${root}/components/${encodeURIComponent(id)}/reduce-seats`, { method: "POST", companyId, idempotencyKey, body: { target_quantity } }),
  changePlan: (companyId: string, plan: BillingPlan, billing_interval: BillingInterval, idempotencyKey: string) => apiRequest<BillingPlanChangeResult>(`${root}/plan-change`, { method: "POST", companyId, idempotencyKey, body: { plan, billing_interval } }),
  reconcilePlanChange: (companyId: string, id: string) => apiRequest<BillingPlanChangeResult>(`${root}/plan-change/${encodeURIComponent(id)}/reconcile`, { method: "POST", companyId, body: {} }),
  cancel: (companyId: string) => apiRequest<{ subscription_id: string; status: string; cancel_at_period_end_at: string | null }>(`${root}/cancel`, { method: "POST", companyId, body: {} }),
  documentAccess: (companyId: string, id: string) => apiRequest<{ id: string; hosted_invoice_url: string | null; pdf_url: string | null }>(`${root}/documents/${encodeURIComponent(id)}/access`, { companyId }),
  paymentMethodPortal: (companyId: string) => apiRequest<{ url: string }>(`${root}/payment-method-portal`, { method: "POST", companyId, body: {} }),
};
