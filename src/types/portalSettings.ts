export interface PortalSettingsPresentation {
  version: number;
  logo_document_id: string | null;
  footer: string | null;
  declaration: string | null;
  default_notes: string | null;
  number_prefix_display: string | null;
  show_seller_email: boolean;
  show_seller_phone: boolean;
  show_seller_address: boolean;
}
export interface PortalSettings {
  company_id: string;
  presentation: PortalSettingsPresentation;
  fbr_configuration: { configured: boolean; credential_configured: boolean; environment: string | null; connection_state: string | null };
}
export type PortalSettingsInput = Omit<PortalSettingsPresentation, "version" | "logo_document_id">;
