export type NavigationReason = "PLATFORM_INACTIVE" | "NOT_ENTITLED" | "NOT_AUTHORIZED" | "HIDDEN_BY_COMPANY";
export interface NavigationItem {
  key: string; label: string; group: string; order: number; module_key: string;
  required_permission: string; platform_active: boolean; entitled: boolean; authorized: boolean;
  visibility_override: boolean | null; presentation_visible: boolean; effective_visible: boolean;
  unavailable_reason: NavigationReason | null;
}
export interface EffectiveNavigation {
  catalog: { key: string; name: string; is_active: boolean; entitled: boolean }[];
  items: NavigationItem[];
  visible_keys: string[];
}
export const visibilityLabel = (value: boolean | null) => value === null ? "Default (inherited)" : value ? "Visible (explicit show)" : "Hidden (explicit hide)";
export const navigationReasonLabels: Record<NavigationReason, string> = {
  PLATFORM_INACTIVE: "Unavailable: platform inactive",
  NOT_ENTITLED: "Not entitled",
  NOT_AUTHORIZED: "Not authorized",
  HIDDEN_BY_COMPANY: "Hidden by company",
};
