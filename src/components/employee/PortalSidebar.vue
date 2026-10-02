<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Bell, CalendarCheck, CalendarOff, FolderOpen, LayoutDashboard, ListChecks, UserRound, Wallet } from "lucide-vue-next";

import Logo from "@/components/zs/Logo.vue";
import { useCompanyStore } from "@/stores/company";
import { useEmployeePortalStore } from "@/stores/employeePortal";
import { cn } from "@/lib/utils";

withDefaults(defineProps<{ class?: string }>(), { class: "" });
defineEmits<{ navigate: [] }>();
const company = useCompanyStore();
const portal = useEmployeePortalStore();
const unread = computed(() => portal.inbox?.unread_count ?? 0);
const groups = [
  { label: "Overview", items: [
    { label: "Dashboard", to: "/employee", icon: LayoutDashboard },
    { label: "My Profile", to: "/employee/profile", icon: UserRound },
  ] },
  { label: "Time & Pay", items: [
    { label: "Attendance", icon: CalendarCheck },
    { label: "Leaves", icon: CalendarOff },
    { label: "My Payroll", to: "/employee/payroll", icon: Wallet, permission: "employee.payroll.view" },
  ] },
  { label: "Work", items: [{ label: "My Tasks", icon: ListChecks }] },
  { label: "Resources", items: [{ label: "Documents", icon: FolderOpen }] },
  { label: "Account", items: [{ label: "Notifications", to: "/employee/notifications", icon: Bell }] },
] as const;
</script>

<template>
  <aside :class="cn('flex h-full w-sidebar shrink-0 flex-col border-r border-sidebar-border bg-sidebar', $props.class)">
    <div class="flex h-header shrink-0 items-center justify-center border-b border-sidebar-border px-4">
      <RouterLink to="/employee" aria-label="Employee Portal home" class="flex items-center" @click="$emit('navigate')"><Logo class="h-5" /></RouterLink>
    </div>
    <nav aria-label="Employee Portal" class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      <div v-for="group in groups" :key="group.label" class="space-y-0.5">
        <p class="label-caps px-2.5 pb-1.5 text-sidebar-label">{{ group.label }}</p>
        <template v-for="item in group.items" :key="item.label">
          <RouterLink v-if="'to' in item && (!('permission' in item) || (company.hasPermission(item.permission!) && company.hasModule('payroll')))" :to="item.to!" class="nav-item" active-class="bg-sidebar-accent text-sidebar-accent-foreground" @click="$emit('navigate')">
            <component :is="item.icon" class="size-4 shrink-0" :stroke-width="1.75" />
            <span class="truncate">{{ item.label }}</span>
            <span v-if="item.label === 'Notifications' && unread" class="zs-badge badge-brand ml-auto">{{ unread }}</span>
          </RouterLink>
          <span v-else-if="!('permission' in item)" class="nav-item opacity-55" :aria-label="`${item.label} — unavailable`" :title="`${item.label} is not available yet`">
            <component :is="item.icon" class="size-4 shrink-0" :stroke-width="1.75" />
            <span class="truncate">{{ item.label }}</span><span class="ml-auto text-2xs">Soon</span>
          </span>
        </template>
      </div>
    </nav>
    <div class="border-t border-sidebar-border p-3">
      <div class="rounded-md bg-surface-sunken p-3">
        <p class="text-xs font-semibold text-content">Employee Portal</p>
        <p class="mt-1 text-xs text-content-muted">{{ company.activeCompany?.name ?? 'Select a company' }}</p>
        <p v-if="portal.employee?.employee" class="mt-1 truncate text-xs text-content-muted">{{ portal.employee.employee.full_name }} · {{ portal.employee.employee.employee_code }}</p>
      </div>
    </div>
  </aside>
</template>
