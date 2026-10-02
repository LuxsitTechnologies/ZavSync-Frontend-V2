import { onBeforeUnmount } from "vue";
import { useCompanyStore } from "@/stores/company";
export function useIdentityContext() {
  const company = useCompanyStore();
  const companyId = company.activeCompanyId, version = company.contextVersion, userId = company.currentUser.id;
  const controller = new AbortController();
  let mounted = true;
  onBeforeUnmount(() => { mounted = false; controller.abort(); });
  return { company, companyId, signal: controller.signal, current: () => mounted && !company.switching && company.activeCompanyId === companyId && company.contextVersion === version && company.currentUser.id === userId };
}
