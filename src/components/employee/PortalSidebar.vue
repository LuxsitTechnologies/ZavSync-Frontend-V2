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
    { label: "Requests", to: "/employee/requests", icon: ListChecks },
    { label: "My Profile", to: "/employee/profile", icon: UserRound, permission: "employee.self.view", navigation: "employee.profile" },
  ] },
  { label: "Time & Pay", items: [
    { label: "Attendance", to: "/employee/attendance", icon: CalendarCheck, permission: "employee.attendance.view" },
    { label: "Leaves", to: "/employee/leaves", icon: CalendarOff, permission: "employee.leave.view" },
    { label: "Calendar", to: "/employee/calendar", icon: CalendarCheck },
    { label: "My Payroll", to: "/employee/payroll", icon: Wallet, permission: "employee.payroll.view" },
  ] },
  { label: "Work", items: [{ label: "My Tasks", to: "/employee/tasks", icon: ListChecks, permission: "employee.tasks.view", navigation: "employee.tasks" }, { label: "My Tickets", to: "/employee/tickets", icon: ListChecks, permission: "employee.tickets.view", navigation: "employee.tickets" }] },
  { label: "Resources", items: [
    { label: "Documents", to: "/employee/documents", icon: FolderOpen, permission: "employee.documents.view", navigation: "employee.documents" },
    { label: "Announcements", to: "/employee/announcements", icon: FolderOpen, permission: "employee.announcements.view", navigation: "employee.announcements" },
    { label: "Directory", to: "/employee/directory", icon: FolderOpen, permission: "employee.directory.view", navigation: "employee.directory" },
    { label: "My Team", to: "/employee/teams", icon: FolderOpen, permission: "employee.teams.view", navigation: "employee.teams" },
    { label: "Published schedule", to: "/employee/schedule", icon: FolderOpen, permission: "employee.schedule.view", navigation: "employee.schedule" },
    { label: "Shift swaps", to: "/employee/shift-swaps", icon: FolderOpen, permission: "employee.schedule.view", navigation: "employee.shift_swaps" },
    { label: "Equipment requests", to: "/employee/assets", icon: FolderOpen, permission: "employee.assets.view", navigation: "employee.assets" },
    { label: "Expense claims", to: "/employee/expenses", icon: FolderOpen, permission: "employee.expenses.view", navigation: "employee.expenses" }
  ] },
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
          <RouterLink v-if="(!('navigation' in item) || company.activeCompany?.effective_navigation?.visible_keys.includes(item.navigation)) && 'to' in item && (!('permission' in item) || (company.hasPermission(item.permission!) && company.hasModule('payroll')))" :to="item.to!" class="nav-item" active-class="bg-sidebar-accent text-sidebar-accent-foreground" @click="$emit('navigate')">
            <component :is="item.icon" class="size-4 shrink-0" :stroke-width="1.75" />
            <span class="truncate">{{ item.label }}</span>
            <span v-if="item.label === 'Notifications' && unread" class="zs-badge badge-brand ml-auto">{{ unread }}</span>
          </RouterLink>

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
