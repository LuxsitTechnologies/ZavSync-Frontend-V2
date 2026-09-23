<script setup lang="ts">
/** A4 — Accounts Payable aging: Current, 1-30, 31-60, 61-90, 90+ by supplier. */
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ZButton from "@/components/zs/ZButton.vue";
import AgingTable from "@/components/accounting/AgingTable.vue";
import Toolbar from "@/components/zs/Toolbar.vue";

import { useAsyncData } from "@/composables/useAsyncData";
import { payablesRepository } from "@/services/accounting/payables.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, sumBy } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { AGING_BUCKETS } from "@/types/accounting";

setPageMeta("Payables Aging", "Outstanding supplier bills grouped by how overdue they are.");

const company = useCompanyStore();
const asOf = ref(new Date().toISOString().slice(0, 10));

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => payablesRepository.aging(company.activeCompanyId, asOf.value),
  { watch: [() => company.activeCompanyId, () => asOf.value] },
);

const rows = computed(() => data.value ?? []);
const total = computed(() => sumBy(rows.value, (r) => r.total));
</script>

<template>
  <AppShell>
    <PageHeader title="Payables Aging" description="Outstanding supplier balances by aging bucket.">
      <template #actions>
        <RouterLink to="/accounting/payables"><ZButton variant="outline">Bills</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/suppliers"><ZButton variant="outline">Suppliers</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/statements"><ZButton variant="outline">Statements</ZButton></RouterLink>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        v-for="bucket in AGING_BUCKETS"
        :key="bucket.key"
        :label="bucket.label"
        :value="formatMoney(sumBy(rows, (r) => r[bucket.key]))"
        :tone="bucket.key === 'current' ? 'success' : bucket.key === 'd90_plus' ? 'danger' : 'warning'"
      />
      <StatCard label="Total outstanding" :value="formatMoney(total)" tone="brand" />
    </div>

    <Panel>
      <Toolbar><label class="flex items-center gap-2 text-xs text-content-secondary">As of <input v-model="asOf" type="date" class="field w-40" /></label></Toolbar>
      <AsyncSection
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-title="Nothing outstanding"
        empty-message="Every approved supplier bill in this company is fully settled."
        @retry="refresh"
      >
        <AgingTable :rows="rows" party-label="Supplier" />
      </AsyncSection>
    </Panel>
  </AppShell>
</template>
