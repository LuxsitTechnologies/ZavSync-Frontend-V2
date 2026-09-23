import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { companies as previewCompanies, currentUser as previewUser } from "@/lib/mock-data";
import { isApiConfigured } from "@/services/api/client";
import type { AuthPayload } from "@/services/auth.repository";

const STORAGE_KEY = "zavsync.active_company";

export interface CompanyOption {
  id: string;
  name: string;
  code?: string;
  currency?: string;
  timezone?: string;
}

export const useCompanyStore = defineStore("company", () => {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const companies = ref<CompanyOption[]>(isApiConfigured() ? [] : previewCompanies);
  const currentUser = ref<{ id?: number; name: string; email: string; role?: string }>(previewUser);
  const activeCompanyId = ref<string>(stored && companies.value.some((company) => company.id === stored) ? stored : (companies.value[0]?.id ?? ""));
  const activeCompany = computed(() => companies.value.find((company) => company.id === activeCompanyId.value));

  function hydrate(payload: AuthPayload) {
    companies.value = payload.companies;
    currentUser.value = payload.user;
    activeCompanyId.value = stored && companies.value.some((company) => company.id === stored) ? stored : (companies.value[0]?.id ?? "");
  }

  function setCompany(id: string) {
    if (companies.value.some((company) => company.id === id)) activeCompanyId.value = id;
  }

  watch(activeCompanyId, (id) => {
    if (typeof localStorage !== "undefined" && id) localStorage.setItem(STORAGE_KEY, id);
  });

  return { companies, currentUser, activeCompanyId, activeCompany, hydrate, setCompany };
});
