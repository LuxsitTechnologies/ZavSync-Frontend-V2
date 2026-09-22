<script setup lang="ts">
/** A4 — Supplier statements: running balance over a date range, exportable as PDF. */
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import StatCard from "@/components/zs/StatCard.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import DateRangeFilter from "@/components/accounting/DateRangeFilter.vue";

import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { payablesRepository } from "@/services/accounting/payables.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney } from "@/lib/money";
import { shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { StatementLine, Supplier } from "@/types/accounting";

setPageMeta("Supplier Statements", "Running-balance statement of account for a single supplier.");

const company = useCompanyStore();

const supplierId = ref<string>("");
const from = ref("2026-01-01");
const to = ref("2026-09-21");

const { data: supplierData } = useAsyncData(() => payablesRepository.suppliers(company.activeCompanyId), {
  watch: [() => company.activeCompanyId],
});
const suppliers = computed<Supplier[]>(() => supplierData.value ?? []);

watch(suppliers, (list) => {
  if (!supplierId.value && list.length) supplierId.value = list[0]?.id ?? "";
});

const canLoad = computed(() => Boolean(supplierId.value));

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  async () => {
    if (!supplierId.value) return null;
    return payablesRepository.statement(company.activeCompanyId, supplierId.value, from.value, to.value);
  },
  {
    watch: [() => company.activeCompanyId, () => supplierId.value, () => from.value, () => to.value],
    isEmpty: (result) => result === null || result.lines.length === 0,
  },
);

const columns: Column[] = [
  { key: "date", header: "Date", class: "num" },
  { key: "type", header: "Type" },
  { key: "reference", header: "Reference" },
  { key: "description", header: "Description" },
  { key: "debit", header: "Debit", align: "right", class: "num" },
  { key: "credit", header: "Credit", align: "right", class: "num" },
  { key: "balance", header: "Balance", align: "right", class: "num" },
];

const rows = computed<(StatementLine & { id: string })[]>(() => data.value?.lines ?? []);

const exportMutation = useMutation(payablesRepository.exportStatement);

async function exportPdf() {
  if (!supplierId.value) return;
  const result = await exportMutation.run(company.activeCompanyId, supplierId.value, from.value, to.value);
  if (result) window.open(result.url, "_blank");
}
</script>

<template>
  <AppShell>
    <PageHeader title="Supplier Statements" description="Opening balance, movements and closing balance for a supplier.">
      <template #actions>
        <RouterLink to="/accounting/payables"><ZButton variant="outline">Bills</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/suppliers"><ZButton variant="outline">Suppliers</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/aging"><ZButton variant="outline">Aging</ZButton></RouterLink>
      </template>
    </PageHeader>

    <Panel>
      <Toolbar>
        <select v-model="supplierId" class="field w-56" aria-label="Choose a supplier">
          <option value="" disabled>Select a supplier</option>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <DateRangeFilter v-model:from="from" v-model:to="to" />
        <ZButton variant="outline" :disabled="!canLoad || exportMutation.saving.value" @click="exportPdf">
          {{ exportMutation.saving.value ? "Exporting…" : "Export PDF" }}
        </ZButton>
      </Toolbar>

      <div class="px-4 pt-3">
        <ValidationMessage :message="exportMutation.error.value?.message ?? null" />
      </div>

      <template v-if="!canLoad">
        <div class="p-10 text-center text-sm text-content-muted">
          Choose a supplier to load their statement.
        </div>
      </template>
      <template v-else>
        <div v-if="data" class="grid gap-3 border-b border-line p-4 sm:grid-cols-2">
          <StatCard label="Opening balance" :value="formatMoney(data.opening_balance)" tone="neutral" />
          <StatCard label="Closing balance" :value="formatMoney(data.closing_balance)" tone="brand" />
        </div>
        <AsyncSection
          :loading="loading"
          :error="error"
          :empty="isEmpty"
          empty-title="No activity in this range"
          empty-message="There were no bills or payments for this supplier between the selected dates."
          @retry="refresh"
        >
          <DataTable :columns="columns" :rows="rows.map((r) => ({ ...r }))" :min-width="900">
            <template #date="{ row }: { row: StatementLine }">{{ shortDate(row.date) }}</template>
            <template #type="{ row }: { row: StatementLine }"><StatusBadge :status="row.type" /></template>
            <template #reference="{ row }: { row: StatementLine }">{{ row.reference || "—" }}</template>
            <template #description="{ row }: { row: StatementLine }">{{ row.description }}</template>
            <template #debit="{ row }: { row: StatementLine }">{{ row.debit ? formatMoney(row.debit) : "—" }}</template>
            <template #credit="{ row }: { row: StatementLine }">{{ row.credit ? formatMoney(row.credit) : "—" }}</template>
            <template #balance="{ row }: { row: StatementLine }">{{ formatMoney(row.balance) }}</template>
          </DataTable>
        </AsyncSection>
      </template>
    </Panel>
  </AppShell>
</template>
