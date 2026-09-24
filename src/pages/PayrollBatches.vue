<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus } from "lucide-vue-next";
import { useRouter } from "vue-router";

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
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { payrollRepository } from "@/services/payroll/payroll.repository";
import { useCompanyStore } from "@/stores/company";
import type { PayrollBatch } from "@/types/payroll";

setPageMeta("Payroll Batches", "Payroll batches per period with controlled lifecycle actions.");

const company = useCompanyStore();
const router = useRouter();
const batchState = useAsyncData(() => payrollRepository.batches(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const periodState = useAsyncData(() => payrollRepository.periods(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const query = ref("");
const status = ref("all");
const createOpen = ref(false);
const periodId = ref("");
const createPeriodMode = ref(false);
const periodForm = ref({ name: "", period_start: "", period_end: "", pay_date: "" });
const mutation = useMutation(async (action: string, id: string) => {
  if (action === "calculate") return payrollRepository.calculate(company.activeCompanyId, id);
  if (action === "recalculate") return payrollRepository.recalculate(company.activeCompanyId, id);
  if (action === "review") return payrollRepository.review(company.activeCompanyId, id);
  return payrollRepository.approve(company.activeCompanyId, id);
});
const createMutation = useMutation(async () => {
  let selectedPeriod = periodId.value;
  if (createPeriodMode.value) {
    const period = await payrollRepository.createPeriod(company.activeCompanyId, { ...periodForm.value, frequency: "monthly" });
    selectedPeriod = period.id;
  }
  return payrollRepository.createBatch(company.activeCompanyId, selectedPeriod);
});

const rows = computed(() => (batchState.data.value ?? []).filter((batch) => {
  const q = query.value.trim().toLowerCase();
  return (!q || batch.number.toLowerCase().includes(q) || batch.period?.name.toLowerCase().includes(q)) && (status.value === "all" || batch.status === status.value);
}));
const totals = computed(() => ({
  open: (batchState.data.value ?? []).filter((batch) => !["PAID", "CANCELLED"].includes(batch.status)).length,
  approval: (batchState.data.value ?? []).filter((batch) => batch.status === "REVIEWED").length,
  paid: (batchState.data.value ?? []).filter((batch) => batch.status === "PAID").length,
  net: (batchState.data.value ?? []).reduce((sum, batch) => sum + batch.net_pay, 0),
}));

const columns: Column[] = [
  { key: "ref", header: "Batch", class: "num font-medium" }, { key: "period", header: "Period" },
  { key: "emp", header: "Employees", align: "right", class: "num" }, { key: "gross", header: "Gross", align: "right", class: "num" },
  { key: "ded", header: "Deductions", align: "right", class: "num" }, { key: "net", header: "Net", align: "right", class: "num font-medium" },
  { key: "status", header: "Status" }, { key: "actions", header: "", align: "right" },
];

async function runAction(action: string, batch: PayrollBatch) {
  const result = await mutation.run(action, batch.id);
  if (result) await batchState.refresh();
}

async function createBatch() {
  const result = await createMutation.run();
  if (!result) return;
  createOpen.value = false;
  createPeriodMode.value = false;
  periodId.value = "";
  await Promise.all([batchState.refresh(), periodState.refresh()]);
}

function availableAction(batch: PayrollBatch): { key: string; label: string } | null {
  if (batch.status === "DRAFT") return { key: "calculate", label: "Calculate" };
  if (batch.status === "CALCULATED") return { key: "review", label: "Review" };
  if (batch.status === "REVIEWED") return { key: "approve", label: "Approve" };
  if (batch.status === "APPROVED") return { key: "post", label: "Post" };
  return null;
}

function takeAction(batch: PayrollBatch) {
  const action = availableAction(batch);
  if (!action) return;
  if (action.key === "post") void router.push("/payroll/posting");
  else void runAction(action.key, batch);
}
</script>

<template>
  <AppShell>
    <PageHeader title="Payroll Batches" description="Grouped payroll runs for the active company and payroll period">
      <template #actions><ZButton @click="createOpen = true"><Plus class="size-4" /> New batch</ZButton></template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Open batches" :value="String(totals.open)" tone="brand" />
      <StatCard label="Awaiting approval" :value="String(totals.approval)" tone="warning" />
      <StatCard label="Paid batches" :value="String(totals.paid)" tone="success" />
      <StatCard label="Net across batches" :value="formatMoney(totals.net)" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search batch or period" />
        <select v-model="status" class="field w-44" aria-label="Filter by status">
          <option value="all">All statuses</option><option value="DRAFT">Draft</option><option value="CALCULATED">Calculated</option><option value="REVIEWED">Reviewed</option><option value="APPROVED">Approved</option><option value="POSTED">Posted</option><option value="PARTIALLY_PAID">Partially paid</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option>
        </select>
      </Toolbar>
      <AsyncSection :loading="batchState.loading.value" :error="batchState.error.value" :empty="batchState.isEmpty.value" empty-title="No payroll batches" empty-message="Create a batch for an open payroll period." @retry="batchState.refresh">
        <DataTable :columns="columns" :rows="rows" :min-width="1080">
          <template #ref="{ row }: { row: PayrollBatch }">{{ row.number }}</template>
          <template #period="{ row }: { row: PayrollBatch }">{{ row.period?.name ?? row.accounting_date }}</template>
          <template #emp="{ row }: { row: PayrollBatch }">{{ row.employee_count }}</template>
          <template #gross="{ row }: { row: PayrollBatch }">{{ formatMoney(row.gross_earnings) }}</template>
          <template #ded="{ row }: { row: PayrollBatch }">{{ formatMoney(row.employee_deductions + row.employee_contributions + row.tax_amount) }}</template>
          <template #net="{ row }: { row: PayrollBatch }">{{ formatMoney(row.net_pay) }}</template>
          <template #status="{ row }: { row: PayrollBatch }"><StatusBadge :status="row.status.toLowerCase()" /></template>
          <template #actions="{ row }: { row: PayrollBatch }"><ZButton v-if="availableAction(row)" variant="outline" :disabled="mutation.saving.value" @click="takeAction(row)">{{ availableAction(row)?.label }}</ZButton></template>
          <template #footer><span>{{ rows.length }} batches</span><span v-if="mutation.error.value" class="text-danger">{{ mutation.error.value.message }}</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <SidePanel :open="createOpen" title="New payroll batch" description="Choose an existing open period or create the next monthly period." @close="createOpen = false">
      <form class="space-y-4" @submit.prevent="createBatch">
        <label class="block"><span class="label-caps">Payroll period</span><select v-model="periodId" class="field mt-1.5 w-full" :disabled="createPeriodMode" required><option value="">Select period</option><option v-for="period in periodState.data.value ?? []" :key="period.id" :value="period.id" :disabled="period.status !== 'open'">{{ period.name }} · {{ period.status }}</option></select></label>
        <button type="button" class="text-xs text-content-brand hover:underline" @click="createPeriodMode = !createPeriodMode">{{ createPeriodMode ? "Use an existing period" : "Create a new monthly period" }}</button>
        <div v-if="createPeriodMode" class="space-y-3 rounded-md bg-surface-sunken p-3">
          <label class="block"><span class="label-caps">Period name</span><input v-model="periodForm.name" class="field mt-1 w-full" required /></label>
          <div class="grid gap-3 sm:grid-cols-2"><label class="block"><span class="label-caps">Start</span><input v-model="periodForm.period_start" type="date" class="field mt-1 w-full" required /></label><label class="block"><span class="label-caps">End</span><input v-model="periodForm.period_end" type="date" class="field mt-1 w-full" required /></label></div>
          <label class="block"><span class="label-caps">Pay date</span><input v-model="periodForm.pay_date" type="date" class="field mt-1 w-full" required /></label>
        </div>
        <p v-if="createMutation.error.value" class="text-xs text-danger">{{ createMutation.error.value.message }}</p>
        <ZButton type="submit" :disabled="createMutation.saving.value || (!createPeriodMode && !periodId)">Create batch</ZButton>
      </form>
    </SidePanel>
  </AppShell>
</template>
