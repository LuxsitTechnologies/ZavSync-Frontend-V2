<script setup lang="ts">
/**
 * A2 — General Ledger. Read-only view of posted-journal ledger entries plus a
 * trial-balance summary, all sourced from the ledger repository.
 */
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import AccountSelect from "@/components/accounting/AccountSelect.vue";
import DateRangeFilter from "@/components/accounting/DateRangeFilter.vue";

import { useAsyncData } from "@/composables/useAsyncData";
import { ledgerRepository } from "@/services/accounting/ledger.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, formatMoneyOrDash } from "@/lib/money";
import { shortDate, labelize } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import { REFERENCE_TYPES, type LedgerEntry, type LedgerQuery, type ReferenceType } from "@/types/accounting";

setPageMeta("General Ledger", "Posted-journal ledger entries with running balances, filterable by account and date.");

const company = useCompanyStore();

const accountId = ref<string | null>(null);
const from = ref("");
const to = ref("");
const referenceType = ref<ReferenceType | "all">("all");
const reference = ref("");
const search = ref("");

const query = computed<LedgerQuery>(() => ({
  account_id: accountId.value,
  from: from.value || undefined,
  to: to.value || undefined,
  reference_type: referenceType.value,
  reference: reference.value || undefined,
  search: search.value || undefined,
}));

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => ledgerRepository.entries(company.activeCompanyId, query.value),
  {
    watch: [
      () => company.activeCompanyId,
      () => accountId.value,
      () => from.value,
      () => to.value,
      () => referenceType.value,
      () => reference.value,
      () => search.value,
    ],
    isEmpty: (result) => result.entries.length === 0,
  },
);

const { data: trialBalance, loading: tbLoading, error: tbError, refresh: refreshTb } = useAsyncData(
  () => ledgerRepository.trialBalance(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const entries = computed<LedgerEntry[]>(() => data.value?.entries ?? []);

const columns = computed<Column[]>(() => {
  const cols: Column[] = [
    { key: "posting_date", header: "Date", class: "num" },
    { key: "journal_number", header: "Journal" },
    { key: "reference_type", header: "Type" },
    { key: "reference", header: "Reference" },
    { key: "description", header: "Description" },
  ];
  if (!accountId.value) cols.push({ key: "account", header: "Account" });
  cols.push(
    { key: "debit", header: "Debit", align: "right", class: "num" },
    { key: "credit", header: "Credit", align: "right", class: "num" },
    { key: "running_balance", header: "Balance", align: "right", class: "num" },
  );
  return cols;
});

function referenceLabel(type: ReferenceType): string {
  return REFERENCE_TYPES.find((r) => r.value === type)?.label ?? labelize(type);
}

async function retry() {
  await Promise.all([refresh(), refreshTb()]);
}
</script>

<template>
  <AppShell>
    <PageHeader title="General Ledger" description="Every posted journal line, with running balances by account." />

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Opening balance" :value="data ? formatMoney(data.opening_balance) : '—'" />
      <StatCard label="Total debit" :value="data ? formatMoney(data.total_debit) : '—'" tone="brand" />
      <StatCard label="Total credit" :value="data ? formatMoney(data.total_credit) : '—'" tone="brand" />
      <StatCard label="Closing balance" :value="data ? formatMoney(data.closing_balance) : '—'" tone="success" />
      <StatCard
        label="Trial balance"
        :value="tbLoading ? '…' : tbError ? '—' : trialBalance?.balanced ? 'Balanced' : 'Out of balance'"
        :tone="tbLoading ? 'neutral' : tbError ? 'danger' : trialBalance?.balanced ? 'success' : 'danger'"
        :hint="trialBalance ? `Debit ${formatMoney(trialBalance.debit)} · Credit ${formatMoney(trialBalance.credit)}` : undefined"
      />
    </div>

    <Panel>
      <Toolbar>
        <AccountSelect v-model="accountId" placeholder="All accounts" :postable-only="true" />
        <DateRangeFilter v-model:from="from" v-model:to="to" />
        <select v-model="referenceType" class="field w-44" aria-label="Filter by reference type">
          <option value="all">All reference types</option>
          <option v-for="r in REFERENCE_TYPES" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
        <input v-model="reference" class="field w-40" placeholder="Reference number" aria-label="Filter by reference number" />
        <SearchInput v-model="search" placeholder="Search description, journal or account" />
      </Toolbar>

      <AsyncSection
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-title="No ledger entries"
        empty-message="No posted journal lines match these filters."
        @retry="retry"
      >
        <DataTable :columns="columns" :rows="entries" :min-width="1180">
          <template #posting_date="{ row }: { row: LedgerEntry }">{{ shortDate(row.posting_date) }}</template>
          <template #journal_number="{ row }: { row: LedgerEntry }">
            <RouterLink :to="`/accounting/journals/${row.journal_id}`" class="num font-medium text-content-brand hover:underline">
              {{ row.journal_number }}
            </RouterLink>
          </template>
          <template #reference_type="{ row }: { row: LedgerEntry }">
            <span class="zs-badge badge-info">{{ referenceLabel(row.reference_type) }}</span>
          </template>
          <template #reference="{ row }: { row: LedgerEntry }">{{ row.reference || "—" }}</template>
          <template #description="{ row }: { row: LedgerEntry }">{{ row.description || "—" }}</template>
          <template #account="{ row }: { row: LedgerEntry }">{{ row.account_code }} · {{ row.account_name }}</template>
          <template #debit="{ row }: { row: LedgerEntry }">{{ formatMoneyOrDash(row.debit) }}</template>
          <template #credit="{ row }: { row: LedgerEntry }">{{ formatMoneyOrDash(row.credit) }}</template>
          <template #running_balance="{ row }: { row: LedgerEntry }">{{ formatMoney(row.running_balance) }}</template>
          <template #footer>
            <span>{{ entries.length }} entries</span>
            <span v-if="!accountId">Select a single account to see a meaningful running balance.</span>
          </template>
        </DataTable>
      </AsyncSection>
    </Panel>
  </AppShell>
</template>
