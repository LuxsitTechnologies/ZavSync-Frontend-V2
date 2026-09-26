import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { authRepository } from "@/services/auth.repository";
import type { AuthPayload } from "@/services/auth.repository";

const STORAGE_KEY = "zavsync.active_company";

export interface CompanyOption {
  id: string;
  name: string;
  code?: string;
  currency?: string;
  timezone?: string;
  roles?: string[];
  permissions?: string[];
  modules?: string[];
}

export const useCompanyStore = defineStore("company", () => {
  const companies = ref<CompanyOption[]>([]);
  const currentUser = ref<{
    id?: number;
    name: string;
    email: string;
    role?: string;
    is_platform_admin?: boolean;
  }>({ name: "", email: "", is_platform_admin: false });
  const activeCompanyId = ref("");
  const initialized = ref(false);
  const switching = ref(false);
  const contextVersion = ref(0);
  const activeCompany = computed(() => companies.value.find((company) => company.id === activeCompanyId.value));
  const activePermissions = computed(() => activeCompany.value?.permissions ?? []);
  const activeModules = computed(() => activeCompany.value?.modules ?? []);
  const isPlatformAdmin = computed(() => currentUser.value.is_platform_admin === true);
  const authenticated = computed(() => currentUser.value.id !== undefined);

  function hydrate(payload: AuthPayload) {
    companies.value = payload.companies;
    currentUser.value = payload.user;
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    activeCompanyId.value = stored && companies.value.some((company) => company.id === stored) ? stored : (companies.value[0]?.id ?? "");
    currentUser.value.role = companies.value.find((company) => company.id === activeCompanyId.value)?.roles?.join(", ") ?? "";
    contextVersion.value += 1;
    initialized.value = true;
  }

  function clear() {
    companies.value = [];
    currentUser.value = { name: "", email: "", is_platform_admin: false };
    activeCompanyId.value = "";
    switching.value = false;
    contextVersion.value += 1;
    initialized.value = true;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function setCompany(id: string) {
    if (!companies.value.some((company) => company.id === id) || id === activeCompanyId.value || switching.value) {
      return;
    }
    switching.value = true;
    try {
      const { company } = await authRepository.switchCompany(id);
      companies.value = companies.value.map((candidate) => candidate.id === id ? company : candidate);
      activeCompanyId.value = id;
      currentUser.value.role = company.roles?.join(", ") ?? "";
      contextVersion.value += 1;
    } finally {
      switching.value = false;
    }
  }

  const hasPermission = (permission: string) => activePermissions.value.includes("*") || activePermissions.value.includes(permission);
  const hasModule = (module: string) => activeModules.value.includes(module);

  watch(activeCompanyId, (id) => {
    if (typeof localStorage !== "undefined" && id) localStorage.setItem(STORAGE_KEY, id);
  });

  return {
    companies,
    currentUser,
    activeCompanyId,
    activeCompany,
    activePermissions,
    activeModules,
    authenticated,
    initialized,
    switching,
    contextVersion,
    isPlatformAdmin,
    hasPermission,
    hasModule,
    hydrate,
    clear,
    setCompany,
  };
});
