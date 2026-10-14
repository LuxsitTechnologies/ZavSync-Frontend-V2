export type DashboardWidgetKey = "revenue" | "outstanding" | "collected" | "overdue" | "invoiced_collected" | "pending_attention" | "recent_invoices";
export interface DashboardWidget {
  key: DashboardWidgetKey;
  visible: boolean;
  effective_visible: boolean;
}
export interface DashboardLayout {
  catalog: Array<{ key: DashboardWidgetKey; label: string; module: string; permission: string; authorized: boolean; entitled: boolean }>;
  widgets: DashboardWidget[];
  columns: number;
  layout_version: number;
}
