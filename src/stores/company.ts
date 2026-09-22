import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { companies, type Company } from "@/lib/mock-data";

const STORAGE_KEY = "zavsync.active_company";

/**
 * Active company for the whole application. Every accounting request is scoped
 * to `activeCompanyId`; the repository layer rejects records from any other
 * company, so switching companies fully re-scopes the accounting screens.
 */
export const useCompanyStore = defineStore("company", () => {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const known = companies.some((c) => c.id === stored);
  const activeCompanyId = ref<string>(known && stored ? stored : (companies[0]?.id ?? ""));

  const activeCompany = computed<Company | undefined>(() =>
    companies.find((c) => c.id === activeCompanyId.value),
  );

  function setCompany(id: string) {
    if (!companies.some((c) => c.id === id)) return;
    activeCompanyId.value = id;
  }

  watch(activeCompanyId, (id) => {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  });

  return { companies, activeCompanyId, activeCompany, setCompany };
});
