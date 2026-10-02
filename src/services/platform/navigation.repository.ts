import { apiRequest } from "@/services/api/client";
import type { EffectiveNavigation } from "@/types/navigation";
const path = "/platform/navigation";
export const navigationRepository = {
  get: (companyId: string) => apiRequest<EffectiveNavigation>(path, { companyId }),
  set: (companyId: string, key: string, is_visible: boolean) => apiRequest<EffectiveNavigation>(`${path}/${encodeURIComponent(key)}`, { companyId, method: "PUT", body: { is_visible } }),
  reset: (companyId: string, key: string) => apiRequest<EffectiveNavigation>(`${path}/${encodeURIComponent(key)}`, { companyId, method: "DELETE" }),
};
