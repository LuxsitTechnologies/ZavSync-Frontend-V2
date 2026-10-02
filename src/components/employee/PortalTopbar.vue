<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Bell, ChevronRight, Menu, Moon, Sun } from "lucide-vue-next";

import { initials } from "@/lib/format";
import { useCompanyStore } from "@/stores/company";
import { useEmployeePortalStore } from "@/stores/employeePortal";

defineEmits<{ openNav: [] }>();
const company = useCompanyStore();
const portal = useEmployeePortalStore();
const route = useRoute();
const menuButton = ref<HTMLButtonElement | null>(null);
const dark = ref(document.documentElement.classList.contains("dark"));
const name = computed(() => portal.employee?.employee?.full_name ?? company.currentUser.name);
const breadcrumb = computed(() => route.path === "/employee/profile" ? "My Profile" : route.path === "/employee/notifications" ? "Notifications" : route.path.startsWith("/employee/payroll/") ? "Payslip" : route.path === "/employee/payroll" ? "My Payroll" : "Dashboard");
const unread = computed(() => portal.inbox?.unread_count ?? 0);
const switchError = ref("");

function focusMenu(): void { menuButton.value?.focus(); }
defineExpose({ focusMenu });
function toggleTheme(): void {
  dark.value = !dark.value;
  document.documentElement.classList.toggle("dark", dark.value);
}
async function switchCompany(id: string): Promise<void> {
  switchError.value = "";
  try { await company.setCompany(id); }
  catch { switchError.value = "Company switch failed. Your previous company remains active."; }
}
</script>

<template>
  <header class="sticky top-0 z-20 flex h-header shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
    <button ref="menuButton" type="button" class="grid size-8 place-items-center rounded-md text-content-secondary hover:bg-surface-hover lg:hidden" aria-label="Open navigation" @click="$emit('openNav')"><Menu class="size-4" /></button>
    <nav aria-label="Breadcrumb" class="hidden items-center gap-1.5 text-sm sm:flex">
      <RouterLink to="/employee" class="text-content hover:text-content-brand">Employee Portal</RouterLink>
      <ChevronRight class="size-3.5 text-content-muted" />
      <span class="text-content-muted">{{ breadcrumb }}</span>
    </nav>
    <div class="ml-auto flex min-w-0 items-center gap-2">
      <select :value="company.activeCompanyId" class="field w-28 min-w-0 sm:w-44" aria-label="Active company" :disabled="company.switching" @change="switchCompany(($event.target as HTMLSelectElement).value)">
        <option v-for="item in company.companies" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
      <button type="button" class="grid size-8 shrink-0 place-items-center rounded-md text-content-secondary hover:bg-surface-hover" aria-label="Toggle theme" @click="toggleTheme"><Sun v-if="dark" class="size-4" /><Moon v-else class="size-4" /></button>
      <RouterLink to="/employee/notifications" class="relative grid size-8 shrink-0 place-items-center rounded-md text-content-secondary hover:bg-surface-hover" aria-label="Notifications">
        <Bell class="size-4" /><span v-if="unread" class="absolute -right-1 -top-1 min-w-4 rounded-full bg-danger px-1 text-center text-2xs text-white">{{ unread > 9 ? '9+' : unread }}</span>
      </RouterLink>
      <RouterLink to="/employee/profile" class="flex min-w-0 items-center gap-2 border-l border-line pl-3" aria-label="Your profile">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary-subtle text-2xs font-semibold text-primary-subtle-fg">{{ initials(name) }}</span>
        <span class="hidden min-w-0 leading-tight lg:block"><span class="block truncate text-xs font-semibold text-content">{{ name }}</span><span class="block truncate text-2xs text-content-muted">{{ portal.employee?.employee?.designation ?? company.activeCompany?.name }}</span></span>
      </RouterLink>
    </div>
    <p v-if="switchError" class="absolute right-3 top-full z-30 max-w-sm rounded-md border border-danger/30 bg-surface p-3 text-sm text-danger shadow-lg" role="alert">{{ switchError }}</p>
  </header>
</template>
