<script setup lang="ts">
import { computed, watch } from "vue";
import { Eye, Wallet } from "lucide-vue-next";

import PortalShell from "@/components/employee/PortalShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { shortDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { useCompanyStore } from "@/stores/company";
import { useEmployeePayrollStore } from "@/stores/employeePayroll";

setPageMeta("My Payroll", "Your released payroll and payslips.");
const company = useCompanyStore();
const payroll = useEmployeePayrollStore();
const latest = computed(() => payroll.history?.data[0] ?? null);
const canRead = computed(() => company.hasPermission("employee.payroll.view") && company.hasModule("payroll"));
watch(() => [company.switching, company.activeCompanyId, company.contextVersion, canRead.value] as const, () => {
  if (!company.switching && company.activeCompanyId && canRead.value) void payroll.loadHistory();
}, { immediate: true, flush: "sync" });
</script>

<template>
  <PortalShell>
    <PageHeader title="My Payroll" description="Review your released payslips and payment status." />
    <p v-if="company.switching" class="panel p-5" role="status">Switching company…</p>
    <p v-else-if="!company.activeCompanyId" class="panel p-5" role="status">Select a company to view payroll.</p>
    <p v-else-if="!canRead" class="panel p-5" role="status">Employee payroll is unavailable in this company. Access requires employee.payroll.view and the payroll module.</p>
    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Basic Salary" :value="latest ? formatMoney(latest.base_salary, latest.currency) : '—'" tone="neutral" />
        <StatCard label="Gross Pay" :value="latest ? formatMoney(latest.gross_earnings, latest.currency) : '—'" tone="brand" />
        <StatCard label="Employee Deductions" :value="latest ? formatMoney(latest.employee_deductions, latest.currency) : '—'" tone="warning" />
        <StatCard label="Net Pay" :value="latest ? formatMoney(latest.net_pay, latest.currency) : '—'" hint="Latest released payslip on this page" tone="success" />
      </div>

      <Panel title="Payslips" description="Only payslips explicitly released to you appear here." class="mt-4">
        <p v-if="payroll.historyLoading" class="p-6 text-sm text-content-muted" role="status">Loading your payroll…</p>
        <div v-else-if="payroll.historyError" class="p-6 text-sm text-danger" role="alert">
          <p v-if="payroll.historyError.errorCode === 'EMPLOYEE_IDENTITY_NOT_LINKED'">No employee identity is linked to this company membership. Contact your administrator.</p>
          <p v-else>{{ payroll.historyError.message }}</p>
          <button type="button" class="mt-2 underline" @click="payroll.loadHistory()">Retry</button>
        </div>
        <div v-else-if="!payroll.history?.data.length" class="flex flex-col items-center gap-2 p-12 text-center text-sm text-content-muted">
          <Wallet class="size-6" /><p>No payslips have been released to you in this company.</p>
        </div>
        <ul v-else class="divide-y divide-line">
          <li v-for="slip in payroll.history.data" :key="slip.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div><p class="text-sm font-medium text-content">{{ slip.payroll.period.name }}</p><p class="mt-0.5 text-xs text-content-muted">Released {{ shortDate(slip.released_at) }}</p></div>
            <div class="flex flex-wrap items-center gap-4 text-sm sm:gap-6">
              <div class="text-right"><p class="label-caps">Gross</p><p class="num text-content">{{ formatMoney(slip.gross_earnings, slip.currency) }}</p></div>
              <div class="text-right"><p class="label-caps">Deductions</p><p class="num text-content">{{ formatMoney(slip.employee_deductions, slip.currency) }}</p></div>
              <div class="text-right"><p class="label-caps">Net</p><p class="num font-semibold text-content">{{ formatMoney(slip.net_pay, slip.currency) }}</p></div>
              <StatusBadge :status="slip.payment_status.toLowerCase()" />
            </div>
            <RouterLink :to="`/employee/payroll/${slip.id}`" class="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-content hover:bg-surface-hover"><Eye class="size-3.5" />View payslip</RouterLink>
          </li>
        </ul>
        <div v-if="payroll.history && payroll.history.meta.last_page > 1" class="flex items-center justify-between gap-3 border-t border-line p-4 text-sm">
          <span>Page {{ payroll.history.meta.current_page }} of {{ payroll.history.meta.last_page }} · {{ payroll.history.meta.total }} released payslips</span>
          <div class="flex gap-2"><ZButton variant="outline" :disabled="payroll.historyLoading || payroll.history.meta.current_page <= 1" @click="payroll.loadHistory(payroll.history.meta.current_page - 1)">Previous</ZButton><ZButton variant="outline" :disabled="payroll.historyLoading || payroll.history.meta.current_page >= payroll.history.meta.last_page" @click="payroll.loadHistory(payroll.history.meta.current_page + 1)">Next</ZButton></div>
        </div>
      </Panel>
    </template>
  </PortalShell>
</template>
