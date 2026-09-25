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
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const companies = ref<CompanyOption[]>([]);
  const currentUser = ref<{ id?: number; name: string; email: string; role?: string; is_platform_admin?: boolean }>({name:"",email:"",is_platform_admin:false});
  const activeCompanyId = ref<string>(stored && companies.value.some((company) => company.id === stored) ? stored : (companies.value[0]?.id ?? ""));
  const activeCompany = computed(() => companies.value.find((company) => company.id === activeCompanyId.value));
  const activePermissions = computed(()=>activeCompany.value?.permissions??[]);
  const activeModules = computed(()=>activeCompany.value?.modules??[]);
  const isPlatformAdmin = computed(()=>currentUser.value.is_platform_admin===true);

  function hydrate(payload: AuthPayload) {
    companies.value = payload.companies;
    currentUser.value = payload.user;
    activeCompanyId.value = stored && companies.value.some((company) => company.id === stored) ? stored : (companies.value[0]?.id ?? "");
    currentUser.value.role=companies.value.find(x=>x.id===activeCompanyId.value)?.roles?.join(", ")??"";
  }

  async function setCompany(id: string) {
    if (!companies.value.some((company) => company.id === id)||id===activeCompanyId.value)return;
    const previous=activeCompanyId.value;
    activeCompanyId.value=id;
    try{
      const {company}=await authRepository.switchCompany(id);
      companies.value=companies.value.map(x=>x.id===id?company:x);
      currentUser.value.role=company.roles?.join(", ")??"";
    }catch(error){activeCompanyId.value=previous;throw error}
  }

  const hasPermission=(permission:string)=>activePermissions.value.includes("*")||activePermissions.value.includes(permission);
  const hasModule=(module:string)=>activeModules.value.includes(module);

  watch(activeCompanyId, (id) => {
    if (typeof localStorage !== "undefined" && id) localStorage.setItem(STORAGE_KEY, id);
  });

  return { companies, currentUser, activeCompanyId, activeCompany, activePermissions, activeModules, isPlatformAdmin, hasPermission, hasModule, hydrate, setCompany };
});
