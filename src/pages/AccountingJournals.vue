<script setup lang="ts">
/** A6 — Journal register. Every posted, draft or reversed journal in one place. */
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import DateRangeFilter from "@/components/accounting/DateRangeFilter.vue";

import { useAsyncData } from "@/composables/useAsyncData";
import { journalsRepository, type JournalQuery } from "@/services/accounting/journals.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, sumBy } from "@/lib/money";
import { shortDate, labelize } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import { REFERENCE_TYPES, type Journal, type JournalStatus, type ReferenceType } from "@/types/accounting";

setPageMeta("Journals", "Central journal register for every posting across the company, manual or system-generated.");

const company = useCompanyStore();

const search = ref("");
const status = ref<JournalStatus | "all">("all");
const referenceType = ref<ReferenceType | "all">("all");
const from = ref("");
const to = ref("");

const query = computed<JournalQuery>(() => ({
  search: search.value || undefined,
  status: status.value,
  reference_type: referenceType.value,
  from: from.value || undefined,
  to: to.value || undefined,
}));

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => journalsRepository.list(company.activeCompanyId, query.value),
  {
    watch: [
      () => company.activeCompanyId,
      () => search.value,
      () => status.value,
      () => referenceType.value,
      () => from.value,
      () => to.value,
    ],
  },
);

const journals = computed<Journal[]>(() => data.value ?? []);

const stats = computed(() => {
  const posted = journals.value.filter((j) => j.status === "posted");
  const draft = journals.value.filter((j) => j.status === "draft");
  const reversed = journals.value.filter((j) => j.status === "reversed");
  return {
    posted: posted.length,
    draft: draft.length,
    reversed: reversed.length,
    postedValue: sumBy(posted, (j) => j.total_debit),
  };
});

function sourceLabel(journal: Journal): string {
  return journal.source_label ?? REFERENCE_TYPES.find((r) => r.value === journal.reference_type)?.label ?? labelize(journal.reference_type);
}

const columns: Column[] = [
  { key: "number", header: "Number", class: "num" },
  { key: "posting_date", header: "Posting date", class: "num" },
  { key: "source", header: "Source" },
  { key: "reference", header: "Reference" },
  { key: "description", header: "Description" },
  { key: "total_debit", header: "Debit", align: "right", class: "num" },
  { key: "total_credit", header: "Credit", align: "right", class: "num" },
  { key: "balance", header: "Balance" },
  { key: "status", header: "Status" },
  { key: "actions", header: "" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Journals" description="Central posting register — every journal, from any module, in one ledger.">
      <template #actions>
        <RouterLink to="/accounting/journals/new">
          <ZButton><Plus class="size-4" /> New manual journal</ZButton>
        </RouterLink>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Posted" :value="String(stats.posted)" tone="success" />
      <StatCard label="Draft" :value="String(stats.draft)" tone="neutral" />
      <StatCard label="Reversed" :value="String(stats.reversed)" tone="warning" />
      <StatCard label="Posted value" :value="formatMoney(stats.postedValue)" tone="brand" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="search" placeholder="Search number, reference or description" />
        <select v-model="status" class="field w-36" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
          <option value="reversed">Reversed</option>
        </select>
        <select v-model="referenceType" class="field w-44" aria-label="Filter by reference type">
          <option value="all">All reference types</option>
          <option v-for="r in REFERENCE_TYPES" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
        <DateRangeFilter v-model:from="from" v-model:to="to" />
      </Toolbar>

      <AsyncSection
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-title="No journals yet"
        empty-message="Journals will appear here once posted from any module or created manually."
        @retry="refresh"
      >
        <DataTable :columns="columns" :rows="journals" :min-width="1240">
          <template #number="{ row }: { row: Journal }">{{ row.number }}</template>
          <template #posting_date="{ row }: { row: Journal }">{{ shortDate(row.posting_date) }}</template>
          <template #source="{ row }: { row: Journal }">{{ sourceLabel(row) }}</template>
          <template #reference="{ row }: { row: Journal }">{{ row.reference || "—" }}</template>
          <template #description="{ row }: { row: Journal }">{{ row.description || "—" }}</template>
          <template #total_debit="{ row }: { row: Journal }">{{ formatMoney(row.total_debit) }}</template>
          <template #total_credit="{ row }: { row: Journal }">{{ formatMoney(row.total_credit) }}</template>
          <template #balance="{ row }: { row: Journal }">
            <span :class="row.total_debit === row.total_credit ? 'zs-badge badge-success' : 'zs-badge badge-danger'">
              {{ row.total_debit === row.total_credit ? "Balanced" : "Unbalanced" }}
            </span>
          </template>
          <template #status="{ row }: { row: Journal }"><StatusBadge :status="row.status" /></template>
          <template #actions="{ row }: { row: Journal }">
            <RouterLink :to="`/accounting/journals/${row.id}`" class="text-xs font-medium text-content-brand hover:underline">
              View
            </RouterLink>
          </template>
          <template #footer><span>{{ journals.length }} journals</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>
  </AppShell>
</template>
