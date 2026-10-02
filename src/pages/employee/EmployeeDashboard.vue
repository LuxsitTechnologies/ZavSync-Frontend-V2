<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Bell, CalendarCheck, CalendarOff, FolderOpen, ListChecks, Wallet } from "lucide-vue-next";

import PortalShell from "@/components/employee/PortalShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { setPageMeta } from "@/lib/page-meta";
import { useCompanyStore } from "@/stores/company";
import { useEmployeePortalStore } from "@/stores/employeePortal";

setPageMeta("Employee Portal", "Your company and employee workspace.");
const company = useCompanyStore();
const portal = useEmployeePortalStore();
const identity = computed(() => portal.employee?.employee);
const unavailable = [
  { label: "Today's Attendance", icon: CalendarCheck, description: "Attendance is not connected yet." },
  { label: "Working Hours", icon: CalendarCheck, description: "Working-hours data is not available yet." },
  { label: "Leave Balance", icon: CalendarOff, description: "Leave balances are not available yet." },
  { label: "Pending Tasks", icon: ListChecks, description: "Employee tasks are not available yet." },
  { label: "Documents", icon: FolderOpen, description: "Employee documents are not available yet." },
] as const;
</script>

<template>
  <PortalShell>
    <PageHeader title="Dashboard" :description="company.activeCompany ? `Your workspace at ${company.activeCompany.name}.` : 'Select a company to open your workspace.'">
      <template #actions><RouterLink to="/employee/profile"><ZButton variant="outline">View profile</ZButton></RouterLink></template>
    </PageHeader>

    <p v-if="company.switching" role="status" class="panel p-5">Switching company…</p>
    <p v-else-if="!company.activeCompanyId" class="panel p-5" role="status">No active company is selected.</p>
    <p v-else-if="!portal.canViewEmployee" class="panel p-5" role="status">Employee self-service is unavailable in this company. Your account has not been granted employee.self.view.</p>
    <p v-else-if="portal.employeeLoading" class="panel p-5" role="status">Loading your employee profile…</p>
    <p v-else-if="portal.employee && !portal.employee.linked" class="panel p-5" role="status">No employee profile linked. Please contact your company administrator. We will not search for or infer an employee record.</p>
    <template v-else-if="identity">
      <Panel title="Your employee identity" description="Read-only information from your active company" body-class="p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div><p class="text-lg font-semibold text-content">{{ identity.full_name }}</p><p class="text-sm text-content-secondary">{{ identity.designation ?? 'Designation not on file' }} · {{ identity.department ?? 'Department not on file' }}</p><p class="num mt-1 text-xs text-content-muted">{{ identity.employee_code }}</p></div>
          <StatusBadge :status="identity.status" />
        </div>
        <p v-if="['terminated', 'resigned'].includes(identity.status.toLowerCase())" class="mt-3 text-sm text-content-secondary">This employment record remains readable. Your account and other company memberships are separate.</p>
      </Panel>
    </template>

    <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Attendance" value="Unavailable" hint="Future self-service" />
      <StatCard label="Hours" value="Unavailable" hint="Future self-service" />
      <StatCard label="Leave" value="Unavailable" hint="Future self-service" />
      <StatCard label="Pay" :value="company.hasPermission('employee.payroll.view') && company.hasModule('payroll') ? 'View' : 'Unavailable'" :hint="company.hasPermission('employee.payroll.view') && company.hasModule('payroll') ? 'Released payslips in My Payroll' : 'Self-service not granted'" />
      <StatCard label="Tasks" value="Unavailable" hint="Future self-service" />
      <StatCard label="Notifications" :value="portal.inbox ? String(portal.inbox.unread_count) : '—'" :hint="portal.inbox ? 'Unread in this company' : 'No verified count available'" tone="brand" />
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel title="Notifications" description="Company-scoped messages addressed to you" class="xl:col-span-1">
        <template #actions><RouterLink to="/employee/notifications" class="text-xs font-medium text-content-brand hover:underline">View all</RouterLink></template>
        <p v-if="portal.notificationsLoading" class="p-4 text-sm text-content-muted" role="status">Loading notifications…</p>
        <div v-else-if="portal.notificationsError" class="p-4 text-sm text-danger" role="alert">{{ portal.notificationsError.message }} <button type="button" class="underline" @click="portal.loadNotifications">Retry</button></div>
        <ul v-else-if="portal.inbox?.notifications.data.length" class="divide-y divide-line">
          <li v-for="item in portal.inbox.notifications.data.slice(0, 3)" :key="item.id" class="p-4"><p class="text-sm font-medium text-content">{{ item.title }}</p><p class="mt-1 line-clamp-2 text-xs text-content-secondary">{{ item.message }}</p></li>
        </ul>
        <p v-else class="p-4 text-sm text-content-muted">No notifications for this company.</p>
      </Panel>
      <Panel title="Your day" description="Attendance and leave will appear after their self-service contracts are available" class="xl:col-span-1">
        <div class="space-y-3 p-4"><div v-for="item in unavailable.slice(0, 2)" :key="item.label" class="flex gap-3 rounded-md bg-surface-sunken p-3"><component :is="item.icon" class="size-4 shrink-0 text-content-muted" /><div><p class="text-sm font-medium text-content">{{ item.label }}</p><p class="text-xs text-content-muted">{{ item.description }}</p></div></div></div>
      </Panel>
      <Panel title="Work & resources" description="Additional portal modules will be connected in later stages" class="xl:col-span-1">
        <div class="space-y-3 p-4"><RouterLink v-if="company.hasPermission('employee.payroll.view') && company.hasModule('payroll')" to="/employee/payroll" class="flex gap-3 rounded-md bg-surface-sunken p-3 hover:bg-surface-hover"><Wallet class="size-4 shrink-0 text-content-brand" /><div><p class="text-sm font-medium text-content">My Payroll</p><p class="text-xs text-content-muted">View payslips released to you.</p></div></RouterLink><div v-for="item in unavailable.slice(2)" :key="item.label" class="flex gap-3 rounded-md bg-surface-sunken p-3"><component :is="item.icon" class="size-4 shrink-0 text-content-muted" /><div><p class="text-sm font-medium text-content">{{ item.label }}</p><p class="text-xs text-content-muted">{{ item.description }}</p></div></div></div>
      </Panel>
    </div>
  </PortalShell>
</template>
