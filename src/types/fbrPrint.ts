export interface FbrPrintData {
  document_type: string; snapshot_version: number; snapshot_status?: string; watermark?: string;
  invoice_id: string; invoice_number: string; invoice_date: string; due_date: string | null;
  invoice_type: string; sale_type: string; currency: string;
  seller: { business_name?: string | null; tax_identifier?: string | null; province?: string | null; address?: string | null; email?: string | null; phone?: string | null } | null;
  buyer: { name: string; registration_number?: string | null; type: string; province: string; address?: string | null; email?: string | null; phone?: string | null };
  lines: Array<{ position: number; description: string; hs_code: string; unit: string; quantity_milli: number; unit_price: number; taxable_amount: number; tax_rate_bps: number; tax_amount: number; other_tax_amount: number; advance_tax_amount: number; withholding_tax_amount: number; sro_schedule_id?: string | null; sro_item_id?: string | null; total: number; sales_type: string }>;
  subtotal: number; discount: number; taxable_amount: number; sales_tax: number; extra_tax: number; further_tax: number; st_withheld: number; total: number;
  notes: string | null;
  portal: { logo_document_id: string | null; footer: string | null; declaration: string | null; number_prefix_display: string | null; show_seller_email: boolean; show_seller_phone: boolean; show_seller_address: boolean } | null;
  verification: { fbr_status: string; fbr_reference_number: string | null; qr_content: string | null };
  buyer_verification: { status: string; provider: string | null };
}
