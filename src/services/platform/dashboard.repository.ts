import { apiRequest } from "@/services/api/client";
import type { DashboardLayout, DashboardWidgetKey } from "@/types/dashboardLayout";

export const dashboardRepository = {
  get: (companyId: string) => apiRequest<DashboardLayout>("/platform/dashboard-layout", { companyId }),
  save: (companyId: string, layoutVersion: number, columns: number, widgets: Array<{ key: DashboardWidgetKey; visible: boolean }>) =>
    apiRequest<DashboardLayout>("/platform/dashboard-layout", { method: "PUT", companyId, body: { layout_version: layoutVersion, columns, widgets } }),
  reset: (companyId: string, layoutVersion: number) =>
    apiRequest<DashboardLayout>("/platform/dashboard-layout", { method: "DELETE", companyId, body: { layout_version: layoutVersion } }),
};
