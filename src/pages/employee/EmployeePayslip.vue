<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, Printer } from "lucide-vue-next";

import PortalShell from "@/components/employee/PortalShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { shortDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { useCompanyStore } from "@/stores/company";
import { useEmployeePayrollStore } from "@/stores/employeePayroll";

setPageMeta("Payslip", "Your released payroll detail.");
const route = useRoute();
const company = useCompanyStore();
const payroll = useEmployeePayrollStore();
const entryId = computed(() => String(route.params.entry ?? ""));
const canRead = computed(() => company.hasPermission("employee.payroll.view") && company.hasModule("payroll"));
function printPayslip(): void { window.print(); }
watch(() => [company.switching, company.activeCompanyId, company.contextVersion, canRead.value, entryId.value] as const, () => {
  if (!company.switching && company.activeCompanyId && canRead.value && entryId.value) void payroll.loadDetail(entryId.value);
}, { immediate: true, flush: "sync" });
</script>

<template>
  <PortalShell>
    <PageHeader :title="payroll.detail ? `Payslip · ${payroll.detail.payroll.period.name}` : 'Payslip'" description="Detailed breakdown of a released payroll entry.">
      <template #actions><RouterLink to="/employee/payroll" class="inline-flex items-center gap-1.5 text-sm text-content-secondary hover:text-content"><ArrowLeft class="size-4" />Back to Payroll</RouterLink></template>
    </PageHeader>
    <p v-if="company.switching" class="panel p-5" role="status">Switching company…</p>
    <p v-else-if="!canRead" class="panel p-5" role="status">Employee payroll is unavailable in this company.</p>
    <p v-else-if="payroll.detailLoading" class="panel p-6 text-sm text-content-muted" role="status">Loading payslip…</p>
    <div v-else-if="payroll.detailError" class="panel p-6 text-sm text-danger" role="alert"><p>{{ payroll.detailError.kind === 'not_found' ? 'This payslip is not available to you.' : payroll.detailError.message }}</p><button type="button" class="mt-2 underline" @click="payroll.loadDetail(entryId)">Retry</button></div>
    <Panel v-else-if="payroll.detail" class="mx-auto max-w-3xl" body-class="p-6 sm:p-8">
      <div class="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5"><div><p class="text-lg font-semibold tracking-tight text-content">{{ payroll.detail.company.name }}</p><p class="mt-1 text-xs text-content-muted">Payslip for {{ payroll.detail.payroll.period.name }}</p></div><div class="text-right"><p class="label-caps">Payroll Batch</p><p class="num text-sm font-medium text-content">{{ payroll.detail.payroll.batch_number }}</p><div class="mt-1.5"><StatusBadge :status="payroll.detail.payment_status.toLowerCase()" /></div></div></div>
      <div class="grid grid-cols-1 gap-6 border-b border-line py-5 sm:grid-cols-2"><div><p class="label-caps mb-2">Employee Information</p><dl class="space-y-1.5 text-sm"><div class="flex justify-between gap-3"><dt class="text-content-muted">Name</dt><dd class="text-content">{{ payroll.detail.employee.full_name }}</dd></div><div class="flex justify-between gap-3"><dt class="text-content-muted">Employee ID</dt><dd class="text-content">{{ payroll.detail.employee.employee_code }}</dd></div><div class="flex justify-between gap-3"><dt class="text-content-muted">Designation</dt><dd class="text-content">{{ payroll.detail.employee.designation ?? '—' }}</dd></div><div class="flex justify-between gap-3"><dt class="text-content-muted">Department</dt><dd class="text-content">{{ payroll.detail.employee.department ?? '—' }}</dd></div></dl></div><div><p class="label-caps mb-2">Salary Period</p><dl class="space-y-1.5 text-sm"><div class="flex justify-between gap-3"><dt class="text-content-muted">Pay period</dt><dd class="text-content">{{ shortDate(payroll.detail.payroll.period.period_start) }} – {{ shortDate(payroll.detail.payroll.period.period_end) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-content-muted">Scheduled pay date</dt><dd class="text-content">{{ shortDate(payroll.detail.payroll.period.pay_date) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-content-muted">Released on</dt><dd class="text-content">{{ shortDate(payroll.detail.released_at) }}</dd></div></dl></div></div>
      <div class="grid grid-cols-1 gap-6 py-5 sm:grid-cols-2"><div><p class="label-caps mb-2">Earnings</p><ul class="divide-y divide-line text-sm"><li v-for="(line, index) in payroll.detail.earnings_lines" :key="`${line.component_code}-${index}`" class="flex justify-between gap-3 py-1.5"><span class="text-content-secondary">{{ line.component_name }}</span><span class="num text-content">{{ formatMoney(line.amount, payroll.detail.currency) }}</span></li><li v-if="!payroll.detail.earnings_lines.length" class="py-1.5 text-content-muted">No earnings lines supplied.</li></ul><div class="mt-2 flex justify-between border-t border-line pt-2 text-sm font-semibold"><span>Gross Pay</span><span class="num">{{ formatMoney(payroll.detail.gross_earnings, payroll.detail.currency) }}</span></div></div><div><p class="label-caps mb-2">Deductions</p><ul class="divide-y divide-line text-sm"><li v-for="(line, index) in payroll.detail.deduction_lines" :key="`${line.component_code}-${index}`" class="flex justify-between gap-3 py-1.5"><span class="text-content-secondary">{{ line.component_name }}</span><span class="num text-content">{{ formatMoney(line.amount, payroll.detail.currency) }}</span></li><li v-if="!payroll.detail.deduction_lines.length" class="py-1.5 text-content-muted">No deduction lines supplied.</li></ul><dl class="mt-2 space-y-1 border-t border-line pt-2 text-xs"><div class="flex justify-between"><dt>Employee deductions</dt><dd class="num">{{ formatMoney(payroll.detail.employee_deductions, payroll.detail.currency) }}</dd></div><div class="flex justify-between"><dt>Employee contributions</dt><dd class="num">{{ formatMoney(payroll.detail.employee_contributions, payroll.detail.currency) }}</dd></div><div class="flex justify-between"><dt>Income tax</dt><dd class="num">{{ formatMoney(payroll.detail.tax_amount, payroll.detail.currency) }}</dd></div></dl></div></div>
      <div class="flex items-center justify-between rounded-md bg-primary-subtle px-4 py-3"><span class="text-sm font-semibold text-primary-subtle-fg">Net Salary</span><span class="num text-lg font-bold text-primary-subtle-fg">{{ formatMoney(payroll.detail.net_pay, payroll.detail.currency) }}</span></div>
      <div class="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p>Payment status: <strong>{{ payroll.detail.payment_status.replaceAll('_', ' ') }}</strong></p><p>Paid: <strong>{{ formatMoney(payroll.detail.paid_amount, payroll.detail.currency) }}</strong></p><p>Outstanding: <strong>{{ formatMoney(payroll.detail.outstanding_amount, payroll.detail.currency) }}</strong></p><p v-if="payroll.detail.payroll.batch_status === 'CANCELLED'" class="text-danger">This payroll batch was reversed after release.</p></div>
      <div class="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5"><ZButton variant="outline" @click="printPayslip"><Printer class="size-3.5" />Print this view</ZButton><span class="text-xs text-content-muted">Browser print only; not a certified payroll document.</span><RouterLink to="/employee/payroll" class="ml-auto text-sm text-content-secondary hover:text-content">Back to Payroll</RouterLink></div>
    </Panel>
  </PortalShell>
</template>
