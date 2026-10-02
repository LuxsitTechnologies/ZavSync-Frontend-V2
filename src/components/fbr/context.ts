import { onBeforeUnmount } from "vue";
import { useCompanyStore } from "@/stores/company";
export function useFbrContext() {
  const company = useCompanyStore();
  const companyId = company.activeCompanyId;
  const version = company.contextVersion;
  let mounted = true;
  onBeforeUnmount(() => { mounted = false; });
  return { company, companyId, current: () => mounted && company.activeCompanyId === companyId && company.contextVersion === version && !company.switching };
}
