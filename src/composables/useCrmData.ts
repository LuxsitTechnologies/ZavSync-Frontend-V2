import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useCompanyStore } from "@/stores/company";
import { useAsyncData } from "@/composables/useAsyncData";
import { crmRepository } from "@/services/crm/repository";

export function useCrmData() {
  const company = useCompanyStore();
  const { activeCompanyId } = storeToRefs(company);
  const watch = [activeCompanyId];
  const companies = useAsyncData(() => crmRepository.companies(activeCompanyId.value), { watch, isEmpty: (rows) => rows.length === 0 });
  const contacts = useAsyncData(() => crmRepository.contacts(activeCompanyId.value), { watch, isEmpty: (rows) => rows.length === 0 });
  const leads = useAsyncData(() => crmRepository.leads(activeCompanyId.value), { watch, isEmpty: (rows) => rows.length === 0 });
  const deals = useAsyncData(() => crmRepository.deals(activeCompanyId.value), { watch, isEmpty: (rows) => rows.length === 0 });
  const pipelines = useAsyncData(() => crmRepository.pipelines(activeCompanyId.value), { watch, isEmpty: (rows) => rows.length === 0 });
  const activities = useAsyncData(() => crmRepository.activities(activeCompanyId.value), { watch, isEmpty: (rows) => rows.length === 0 });
  const owners = useAsyncData(() => crmRepository.owners(activeCompanyId.value), { watch });
  const dashboard = useAsyncData(() => crmRepository.dashboard(activeCompanyId.value), { watch });
  const tasks = useAsyncData(async () => (activities.data.value ?? []).filter((item) => item.type === "Task"), { watch: [activities.data] });
  const loading = computed(() => companies.loading.value || contacts.loading.value || leads.loading.value || deals.loading.value || pipelines.loading.value);
  const refresh = () => Promise.all([companies.refresh(), contacts.refresh(), leads.refresh(), deals.refresh(), pipelines.refresh(), activities.refresh(), dashboard.refresh()]);
  return { activeCompanyId, companies, contacts, leads, deals, pipelines, activities, owners, dashboard, tasks, loading, refresh };
}
