export interface FbrBuyer {
  name: string;
  registration_number: string | null;
  type: "Registered" | "Unregistered";
  province: string;
  address: string | null;
}
export interface FbrLineInput {
  description: string;
  hs_code: string;
  unit: string;
  quantity_milli: number;
  unit_price: number;
  discount: number;
  tax_rate_bps: number;
  fbr_rate_id: string;
  sales_tax: number | null;
  extra_tax: number;
  further_tax: number;
  st_withheld: number;
  sro_schedule_id: string | null;
  sro_item_id: string | null;
}
export interface FbrDraft {
  invoice_date: string;
  due_date: string | null;
  invoice_type: string;
  sale_type: string;
  origin_province: string;
  destination_province: string;
  buyer_snapshot: FbrBuyer;
  notes: string | null;
  lines: FbrLineInput[];
}
export interface FbrLine extends FbrLineInput {
  id: string;
  position: number;
  subtotal: number;
  taxable_amount: number;
  total: number;
  sales_type: string;
}
export interface FbrInvoice extends Omit<FbrDraft, "lines"> {
  id: string;
  company_id: string;
  invoice_number: string;
  domain: "pakistan_fbr";
  is_historical: boolean;
  editable: boolean;
  submission_blocked: boolean;
  document_state: string;
  fbr_status: string;
  fbr_reference_number: string | null;
  scenario_id: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  taxable_amount: number;
  sales_tax: number;
  extra_tax: number;
  further_tax: number;
  withholding_tax: number;
  total: number;
  historical_amount_paid: number | null;
  capabilities: { retry_recovery: boolean; provider_submission_enabled: boolean; regulatory_print_status: string };
  historical?: { legacy_status: string; accounting_state: string; reconciliation_state: string };
  migration_metadata?: Record<string, unknown>;
  lines?: FbrLine[];
  created_at: string;
  updated_at: string;
}
export interface FbrPage { data: FbrInvoice[]; meta: { current_page: number; last_page: number; total: number } }
export interface FbrAttempt {
  id: string; status: string; reference_number: string | null; error_message: string | null;
  response_metadata: unknown; created_at: string; completed_at: string | null;
}
export interface FbrEvidence {
  id: string; original_status: string; normalized_status: string; fbr_reference_number: string | null;
  retry_count: number; last_attempt_at: string | null; source_created_at: string | null;
  source_updated_at: string | null; sanitized_response: unknown; requires_review: boolean; submission_blocked: boolean;
}
export interface FbrReference {
  id: string; category: string; code: string; label: string; parent_code: string | null;
  metadata: unknown; source: string; source_version: string; is_active: boolean;
  valid_from: string | null; valid_until: string | null;
}
export interface FbrConfigurationInput {
  seller_tax_identifier: string; seller_business_name: string; seller_province: string;
  seller_address: string; environment: "SANDBOX" | "PRODUCTION"; credential?: string;
}
export interface FbrConfiguration extends FbrConfigurationInput {
  company_id: string; connection_state: string; credential_configured: boolean;
  last_verified_at: string | null; last_error: string | null;
}
export interface FbrMigration {
  id: string; source_system: string; source_company_id: string; status: string; mode: string;
  source_filename: string; source_manifest: unknown; progress: unknown; reconciliation: unknown;
  failure_message: string | null; started_at: string | null; completed_at: string | null;
}
export interface FbrException {
  id: string; source_entity_type: string; source_id: string; target_id: string | null;
  exception_code: string; severity: string; safe_metadata: unknown;
  resolution_state: string; resolution_note: string | null; resolved_at: string | null;
}
