<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Download, PlayCircle } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { formatMoney, parseMoneyInput, toMoneyInput } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { localDateInput } from "@/lib/format";
import { payrollRepository } from "@/services/payroll/payroll.repository";
import { payrollReleaseRepository } from "@/services/employeePayroll.repository";
import { useCompanyStore } from "@/stores/company";
import type { PayrollEntry, Payslip } from "@/types/payroll";

setPageMeta("Payroll Runs", "Authoritative employee payroll register, adjustments, payslips and salary payments.");

const company = useCompanyStore();
const batchState = useAsyncData(() => payrollRepository.batches(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const componentState = useAsyncData(() => payrollRepository.components(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const accountState = useAsyncData(() => payrollRepository.financialAccounts(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const selectedBatchId = ref("");
watch(() => batchState.data.value, (batches) => {
  if (!selectedBatchId.value && batches?.[0]) selectedBatchId.value = batches[0].id;
}, { immediate: true });
const entryState = useAsyncData(() => selectedBatchId.value ? payrollRepository.entries(company.activeCompanyId, selectedBatchId.value) : Promise.resolve([]), { watch: [() => company.activeCompanyId, selectedBatchId] });
const selectedBatch = computed(() => (batchState.data.value ?? []).find((batch) => batch.id === selectedBatchId.value));

const query = ref("");
const status = ref("all");
const rows = computed(() => (entryState.data.value ?? []).filter((entry) => {
  const q = query.value.trim().toLowerCase();
  return (!q || entry.employee_name.toLowerCase().includes(q) || entry.employee_code.toLowerCase().includes(q)) && (status.value === "all" || entry.payment_status === status.value);
}));
const columns: Column[] = [
  { key: "emp", header: "Employee" }, { key: "basic", header: "Basic", align: "right", class: "num" }, { key: "allow", header: "Earnings", align: "right", class: "num" },
  { key: "ded", header: "Deductions", align: "right", class: "num" }, { key: "tax", header: "Income tax", align: "right", class: "num" }, { key: "net", header: "Net pay", align: "right", class: "num font-medium" },
  { key: "status", header: "Status" }, { key: "visibility", header: "Employee visibility" }, { key: "actions", header: "", align: "right" },
];

const releaseTarget = ref<PayrollEntry | null>(null);
const releaseOpen = ref(false);
const releaseMutation = useMutation((companyId: string, entryId: string) => payrollReleaseRepository.release(companyId, entryId));
watch(() => [company.switching, company.contextVersion] as const, () => { releaseOpen.value = false; releaseTarget.value = null; releaseMutation.reset(); }, { flush: "sync" });
function openRelease(entry: PayrollEntry): void {
  if (!company.hasPermission("payroll.release") || !selectedBatch.value || !["POSTED", "PARTIALLY_PAID", "PAID"].includes(selectedBatch.value.status) || entry.released_at || releaseMutation.saving.value) return;
  releaseMutation.reset();
  releaseTarget.value = entry;
  releaseOpen.value = true;
}
async function confirmRelease(): Promise<void> {
  if (!releaseOpen.value || !releaseTarget.value || releaseMutation.saving.value || !company.hasPermission("payroll.release")) return;
  const entryId = releaseTarget.value.id;
  const companyId = company.activeCompanyId;
  const version = company.contextVersion;
  const released = await releaseMutation.run(companyId, entryId);
  if (!released || company.switching || company.activeCompanyId !== companyId || company.contextVersion !== version) return;
  if (entryState.data.value) entryState.data.value = entryState.data.value.map(entry => entry.id === released.entry_id ? { ...entry, released_at: released.released_at, released_by: released.released_by } : entry);
  releaseOpen.value = false;
  releaseTarget.value = null;
}

const payslipOpen = ref(false);
const payslip = ref<Payslip | null>(null);
const payslipMutation = useMutation((id: string) => payrollRepository.payslip(company.activeCompanyId, id));
async function openPayslip(entry: PayrollEntry) {
  const result = await payslipMutation.run(entry.id);
  if (result) { payslip.value = result; payslipOpen.value = true; }
}

const adjustOpen = ref(false);
const targetEntry = ref<PayrollEntry | null>(null);
const adjustment = ref({ payroll_component_id: "", amount: "", reason: "" });
const adjustMutation = useMutation((entryId: string, componentId: string, amount: number, reason: string) => payrollRepository.addAdjustment(company.activeCompanyId, entryId, { payroll_component_id: componentId, amount, reason }));
function openAdjust(entry: PayrollEntry) { targetEntry.value = entry; adjustment.value = { payroll_component_id: "", amount: "", reason: "" }; adjustMutation.reset(); adjustOpen.value = true; }
async function saveAdjustment() {
  if (!targetEntry.value) return;
  const amount = parseMoneyInput(adjustment.value.amount);
  if (!amount) return;
  const result = await adjustMutation.run(targetEntry.value.id, adjustment.value.payroll_component_id, amount, adjustment.value.reason.trim());
  if (result) { adjustOpen.value = false; await Promise.all([entryState.refresh(), batchState.refresh()]); }
}

const payOpen = ref(false);
const payment = ref({ financial_account_id: "", payment_date: localDateInput(), amount: "", reference: "" });
const payMutation = useMutation((entryId: string, amount: number) => payrollRepository.payEmployee(company.activeCompanyId, entryId, { ...payment.value, amount }));
function openPay(entry: PayrollEntry) { targetEntry.value = entry; payment.value = { financial_account_id: "", payment_date: localDateInput(), amount: toMoneyInput(entry.outstanding_amount), reference: "" }; payMutation.reset(); payOpen.value = true; }
async function savePayment() {
  if (!targetEntry.value) return;
  const amount = parseMoneyInput(payment.value.amount);
  if (!amount) return;
  const result = await payMutation.run(targetEntry.value.id, amount);
  if (result) { payOpen.value = false; await Promise.all([entryState.refresh(), batchState.refresh()]); }
}

const recalculateMutation = useMutation((id: string) => payrollRepository.recalculate(company.activeCompanyId, id));
async function recalculate() { if (!selectedBatch.value) return; if (await recalculateMutation.run(selectedBatch.value.id)) await Promise.all([entryState.refresh(), batchState.refresh()]); }
</script>

<template>
  <AppShell>
    <PageHeader title="Payroll Runs" :description="selectedBatch ? `${selectedBatch.number} · ${selectedBatch.period?.name ?? selectedBatch.accounting_date}` : 'Select a payroll batch'">
      <template #actions>
        <ZButton variant="outline" :disabled="!rows[0]" @click="rows[0] && openPayslip(rows[0])"><Download class="size-4" /> Payslips</ZButton>
        <ZButton :disabled="!selectedBatch || !['DRAFT','CALCULATED'].includes(selectedBatch.status) || recalculateMutation.saving.value" @click="recalculate"><PlayCircle class="size-4" /> Recalculate</ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Payslips" :value="String(rows.length)" tone="brand" />
      <StatCard label="Net payable" :value="formatMoney(rows.reduce((sum, row) => sum + row.outstanding_amount, 0))" tone="success" />
      <StatCard label="Tax withheld" :value="formatMoney(rows.reduce((sum, row) => sum + row.tax_amount, 0))" tone="warning" />
      <StatCard label="Paid" :value="String(rows.filter((row) => row.payment_status === 'PAID').length)" hint="Derived from allocations" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search employee or code" />
        <select v-model="selectedBatchId" class="field min-w-52" aria-label="Payroll batch"><option value="">Select batch</option><option v-for="batch in batchState.data.value ?? []" :key="batch.id" :value="batch.id">{{ batch.number }} · {{ batch.status }}</option></select>
        <select v-model="status" class="field w-44" aria-label="Filter by payment status"><option value="all">All statuses</option><option value="UNPAID">Unpaid</option><option value="PARTIALLY_PAID">Partially paid</option><option value="PAID">Paid</option></select>
      </Toolbar>
      <AsyncSection :loading="entryState.loading.value" :error="entryState.error.value" :empty="entryState.isEmpty.value" empty-title="No employee entries" empty-message="Calculate a payroll batch to populate the register." @retry="entryState.refresh">
        <DataTable :columns="columns" :rows="rows" :min-width="1180">
          <template #emp="{ row }: { row: PayrollEntry }"><div class="leading-tight"><p class="font-medium text-content">{{ row.employee_name }}</p><p class="num text-2xs text-content-muted">{{ row.employee_code }}</p></div></template>
          <template #basic="{ row }: { row: PayrollEntry }">{{ formatMoney(row.base_salary) }}</template>
          <template #allow="{ row }: { row: PayrollEntry }">{{ formatMoney(row.gross_earnings - row.base_salary + row.reimbursements) }}</template>
          <template #ded="{ row }: { row: PayrollEntry }">{{ formatMoney(row.employee_deductions + row.employee_contributions) }}</template>
          <template #tax="{ row }: { row: PayrollEntry }">{{ formatMoney(row.tax_amount) }}</template>
          <template #net="{ row }: { row: PayrollEntry }">{{ formatMoney(row.net_pay) }}</template>
          <template #status="{ row }: { row: PayrollEntry }"><StatusBadge :status="row.payment_status.toLowerCase()" /></template>
          <template #visibility="{ row }: { row: PayrollEntry }"><span :class="row.released_at ? 'zs-badge badge-success' : 'zs-badge badge-neutral'">{{ row.released_at ? 'Released to employee' : 'Not released' }}</span></template>
          <template #actions="{ row }: { row: PayrollEntry }"><div class="flex justify-end gap-1"><ZButton variant="ghost" @click="openPayslip(row)">Payslip</ZButton><ZButton v-if="selectedBatch && ['DRAFT','CALCULATED'].includes(selectedBatch.status)" variant="ghost" @click="openAdjust(row)">Adjust</ZButton><ZButton v-if="selectedBatch && ['POSTED','PARTIALLY_PAID'].includes(selectedBatch.status) && row.outstanding_amount > 0" variant="outline" @click="openPay(row)">Pay</ZButton><ZButton v-if="company.hasPermission('payroll.release') && selectedBatch && ['POSTED','PARTIALLY_PAID','PAID'].includes(selectedBatch.status) && !row.released_at" variant="outline" :disabled="releaseMutation.saving.value" @click="openRelease(row)">Release to employee</ZButton></div></template>
          <template #footer><span>{{ rows.length }} payslips</span><span v-if="recalculateMutation.error.value" class="text-danger">{{ recalculateMutation.error.value.message }}</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <ConfirmDialog :open="releaseOpen" title="Release payslip to employee" :message="`Make ${releaseTarget?.employee_name ?? 'this employee'}'s posted payslip visible in self-service? This does not post or pay payroll.`" confirm-label="Release payslip" :busy="releaseMutation.saving.value" @confirm="confirmRelease" @cancel="releaseOpen = false" />
    <p v-if="releaseMutation.error.value" class="mt-3 text-sm text-danger" role="alert">{{ releaseMutation.error.value.message }}</p>

    <SidePanel :open="payslipOpen" title="Payslip" :description="payslip ? `${payslip.employee.full_name} · ${payslip.payroll_period.name}` : undefined" width="lg" @close="payslipOpen = false">
      <div v-if="payslip" class="space-y-5"><div class="grid gap-3 sm:grid-cols-3"><StatCard label="Gross" :value="formatMoney(payslip.gross_earnings)"/><StatCard label="Deductions & tax" :value="formatMoney(payslip.employee_deductions + payslip.employee_contributions + payslip.tax_amount)"/><StatCard label="Net pay" :value="formatMoney(payslip.net_pay)" tone="success"/></div><div class="divide-y divide-line rounded-md border border-line"><div v-for="line in payslip.lines ?? []" :key="line.id" class="flex items-center justify-between px-3 py-2 text-sm"><span>{{ line.component_name }}</span><span class="num">{{ formatMoney(line.amount) }}</span></div></div><p class="text-xs text-content-muted">Generated from the stored payroll and statutory snapshots; later master-data changes do not alter this payslip.</p></div>
    </SidePanel>

    <SidePanel :open="adjustOpen" title="Payroll adjustment" :description="targetEntry?.employee_name" @close="adjustOpen = false"><form class="space-y-4" @submit.prevent="saveAdjustment"><label class="block"><span class="label-caps">Component</span><select v-model="adjustment.payroll_component_id" class="field mt-1.5 w-full" required><option value="">Select component</option><option v-for="component in (componentState.data.value ?? []).filter((item) => item.is_active)" :key="component.id" :value="component.id">{{ component.code }} · {{ component.name }}</option></select></label><label class="block"><span class="label-caps">Amount (PKR)</span><input v-model="adjustment.amount" class="field mt-1.5 w-full" inputmode="decimal" required /></label><label class="block"><span class="label-caps">Reason</span><textarea v-model="adjustment.reason" class="field mt-1.5 min-h-24 w-full" required /></label><p v-if="adjustMutation.error.value" class="text-xs text-danger">{{ adjustMutation.error.value.message }}</p><ZButton type="submit" :disabled="adjustMutation.saving.value">Save adjustment</ZButton></form></SidePanel>

    <SidePanel :open="payOpen" title="Pay employee" :description="targetEntry?.employee_name" @close="payOpen = false"><form class="space-y-4" @submit.prevent="savePayment"><label class="block"><span class="label-caps">Financial account</span><select v-model="payment.financial_account_id" class="field mt-1.5 w-full" required><option value="">Select bank or cash</option><option v-for="account in (accountState.data.value ?? []).filter((item) => item.is_active)" :key="account.id" :value="account.id">{{ account.name }} · {{ account.currency }}</option></select></label><label class="block"><span class="label-caps">Payment date</span><input v-model="payment.payment_date" type="date" class="field mt-1.5 w-full" required /></label><label class="block"><span class="label-caps">Amount (PKR)</span><input v-model="payment.amount" class="field mt-1.5 w-full" inputmode="decimal" required /></label><label class="block"><span class="label-caps">Reference</span><input v-model="payment.reference" class="field mt-1.5 w-full" /></label><p v-if="payMutation.error.value" class="text-xs text-danger">{{ payMutation.error.value.message }}</p><ZButton type="submit" :disabled="payMutation.saving.value">Record payment</ZButton></form></SidePanel>
  </AppShell>
</template>
