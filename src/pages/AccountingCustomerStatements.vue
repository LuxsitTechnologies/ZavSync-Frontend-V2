<script setup lang="ts">
/** A3 — Customer statement: opening/closing balances and movement lines. */
import { computed, ref } from "vue";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import StatCard from "@/components/zs/StatCard.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import DateRangeFilter from "@/components/accounting/DateRangeFilter.vue";

import { useAsyncData } from "@/composables/useAsyncData";
import { receivablesRepository } from "@/services/accounting/receivables.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, formatMoneyOrDash } from "@/lib/money";
import { localDateInput, shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { StatementLine } from "@/types/accounting";

setPageMeta("Customer Statements", "Statement of account for a single customer over a date range.");

const company = useCompanyStore();

const { data: customersData } = useAsyncData(() => receivablesRepository.customers(company.activeCompanyId), {
  watch: [() => company.activeCompanyId],
});
const customers = computed(() => customersData.value ?? []);

const customerId = ref<string>("");
const today = localDateInput();
const from = ref(`${today.slice(0, 4)}-01-01`);
const to = ref(today);

const hasSelection = computed(() => Boolean(customerId.value));

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  async () => {
    if (!customerId.value) return null;
    return receivablesRepository.statement(company.activeCompanyId, customerId.value, from.value, to.value);
  },
  {
    watch: [() => company.activeCompanyId, () => customerId.value, () => from.value, () => to.value],
    isEmpty: (statement) => statement === null || statement.lines.length === 0,
  },
);

const statement = computed(() => data.value ?? null);

const columns: Column[] = [
  { key: "date", header: "Date", class: "num" },
  { key: "type", header: "Type" },
  { key: "reference", header: "Reference" },
  { key: "description", header: "Description" },
  { key: "debit", header: "Debit", align: "right", class: "num" },
  { key: "credit", header: "Credit", align: "right", class: "num" },
  { key: "balance", header: "Balance", align: "right", class: "num" },
];

function printStatement() {
  if (statement.value) window.print();
}
</script>

<template>
  <AppShell>
    <PageHeader title="Customer Statements" description="Statement of account with running balance for a chosen customer.">
      <template #actions>
        <ZButton variant="outline" :disabled="!statement" @click="printStatement">
          Print / Save PDF
        </ZButton>
      </template>
    </PageHeader>

    <Panel>
      <div class="p-4">
        <Toolbar>
          <label class="block min-w-56 flex-1">
            <span class="label-caps">Customer</span>
            <select v-model="customerId" class="field mt-1.5" aria-label="Select customer">
              <option value="">Select a customer…</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </label>
          <DateRangeFilter v-model:from="from" v-model:to="to" />
        </Toolbar>

        <div v-if="!hasSelection" class="p-10 text-center">
          <p class="text-sm font-semibold text-content">Choose a customer</p>
          <p class="mx-auto mt-1 max-w-md text-xs text-content-secondary">
            Select a customer above to load their statement of account for the chosen date range.
          </p>
        </div>

        <template v-else>
          <div v-if="statement" class="mb-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Opening balance" :value="formatMoney(statement.opening_balance)" tone="neutral" />
            <StatCard label="Closing balance" :value="formatMoney(statement.closing_balance)" tone="brand" />
            <StatCard
              label="Net movement"
              :value="formatMoney(statement.closing_balance - statement.opening_balance)"
              tone="warning"
            />
          </div>

          <AsyncSection
            :loading="loading"
            :error="error"
            :empty="isEmpty"
            empty-title="No activity in this range"
            empty-message="This customer had no invoices or receipts in the selected date range."
            @retry="refresh"
          >
            <DataTable v-if="statement" :columns="columns" :rows="statement.lines" :min-width="960">
              <template #date="{ row }: { row: StatementLine }">{{ shortDate(row.date) }}</template>
              <template #type="{ row }: { row: StatementLine }"><StatusBadge :status="row.type" /></template>
              <template #reference="{ row }: { row: StatementLine }">{{ row.reference }}</template>
              <template #description="{ row }: { row: StatementLine }">{{ row.description }}</template>
              <template #debit="{ row }: { row: StatementLine }">{{ formatMoneyOrDash(row.debit) }}</template>
              <template #credit="{ row }: { row: StatementLine }">{{ formatMoneyOrDash(row.credit) }}</template>
              <template #balance="{ row }: { row: StatementLine }">
                <span class="font-semibold text-content">{{ formatMoney(row.balance) }}</span>
              </template>
              <template #footer><span>{{ statement.lines.length }} lines</span></template>
            </DataTable>
          </AsyncSection>
        </template>
      </div>
    </Panel>
  </AppShell>
</template>
