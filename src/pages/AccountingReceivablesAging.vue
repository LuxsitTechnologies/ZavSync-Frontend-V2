<script setup lang="ts">
/** A3 — Receivables aging report: Current, 1–30, 31–60, 61–90, 90+. */
import { computed } from "vue";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import AgingTable from "@/components/accounting/AgingTable.vue";

import { useAsyncData } from "@/composables/useAsyncData";
import { receivablesRepository } from "@/services/accounting/receivables.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, sumBy } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { AGING_BUCKETS, type AgingBucketKey, type AgingRow } from "@/types/accounting";

setPageMeta("Receivables Aging", "Customer outstanding balances broken down by age bucket.");

const company = useCompanyStore();

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => receivablesRepository.aging(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const rows = computed<AgingRow[]>(() => data.value ?? []);

function bucketTotal(key: AgingBucketKey): number {
  return sumBy(rows.value, (r) => r[key]);
}

const overallOutstanding = computed(() => sumBy(rows.value, (r) => r.total));
</script>

<template>
  <AppShell>
    <PageHeader title="Receivables Aging" description="Outstanding customer balances grouped by age bucket." />

    <div class="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <StatCard
        v-for="bucket in AGING_BUCKETS"
        :key="bucket.key"
        :label="bucket.label"
        :value="formatMoney(bucketTotal(bucket.key))"
        :tone="bucket.key === 'current' ? 'success' : bucket.key === 'd90_plus' ? 'danger' : 'warning'"
      />
      <StatCard label="Overall outstanding" :value="formatMoney(overallOutstanding)" tone="brand" />
    </div>

    <Panel>
      <AsyncSection
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-title="No outstanding balances"
        empty-message="No outstanding customer balances in this company."
        @retry="refresh"
      >
        <AgingTable :rows="rows" party-label="Customer" />
      </AsyncSection>
    </Panel>
  </AppShell>
</template>
