<script setup lang="ts">
import { computed, ref } from "vue";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import AreaChart from "@/components/zs/AreaChart.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { useAsyncData } from "@/composables/useAsyncData";
import { useCompanyStore } from "@/stores/company";
import { operationsRepository } from "@/services/operations/repository";

setPageMeta("Cash Flow Forecast", "Projected inflows, outflows and closing cash for the active company.");
const company = useCompanyStore();
const range = ref<7 | 30 | 60 | 90>(90);
const state = useAsyncData(() => operationsRepository.cashForecast(company.activeCompanyId, range.value), { watch: [() => company.activeCompanyId, range] });
const forecast = computed(() => state.data.value);
const series = computed(() => forecast.value ? [
  { month: "Current", inflow: 0, outflow: 0, balance: forecast.value.current_cash / 100 },
  { month: `${range.value} days`, inflow: forecast.value.expected_inflows / 100, outflow: forecast.value.expected_outflows / 100, balance: forecast.value.projected_cash / 100 },
] : []);
const events = computed(() => forecast.value ? [
  ...forecast.value.inflows.map((item) => ({ id: `in-${item.id}`, date: item.due_date, event: `${item.number} · ${item.party}`, type: "Inflow", amount: item.amount, confidence: "Due" })),
  ...forecast.value.outflows.map((item) => ({ id: `out-${item.id}`, date: item.due_date, event: `${item.number} · ${item.party}`, type: "Outflow", amount: item.amount, confidence: "Due" })),
].sort((a, b) => a.date.localeCompare(b.date)) : []);
const columns: Column[] = [{ key: "date", header: "Date" }, { key: "event", header: "Cash event" }, { key: "type", header: "Direction" }, { key: "amount", header: "Amount", align: "right", class: "num" }, { key: "confidence", header: "Confidence" }];
</script>

<template>
  <AppShell>
    <PageHeader title="Cash Flow Forecast" description="Forward view based on posted books and scheduled company commitments">
      <template #actions>
        <select v-model="range" class="field w-36">
          <option :value="7">7 days</option><option :value="30">30 days</option><option :value="60">60 days</option><option :value="90">90 days</option>
        </select>
      </template>
    </PageHeader>
    <AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="!forecast" @retry="state.refresh">
      <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current cash" :value="formatMoney(forecast?.current_cash ?? 0)" tone="brand" />
        <StatCard label="Projected inflows" :value="formatMoney(forecast?.expected_inflows ?? 0)" tone="success" />
        <StatCard label="Projected outflows" :value="formatMoney(forecast?.expected_outflows ?? 0)" tone="warning" />
        <StatCard :label="`${range}-day closing`" :value="formatMoney(forecast?.projected_cash ?? 0)" />
      </div>
      <div class="grid gap-4 xl:grid-cols-[1fr_25rem]">
        <Panel title="Cash position" description="Solid line is projected closing cash"><div class="p-4"><AreaChart :data="series" x-key="month" :series="[{ key: 'balance', color: 'var(--chart-1)', id: 'cash-balance' }, { key: 'inflow', color: 'var(--chart-2)', id: 'cash-in' }]" :height="280" /></div></Panel>
        <Panel title="Upcoming pressure points"><DataTable :columns="columns" :rows="events" :min-width="520"><template #date="{ row }">{{ row.date }}</template><template #event="{ row }">{{ row.event }}</template><template #type="{ row }"><span :class="row.type === 'Inflow' ? 'text-success' : 'text-warning-strong'">{{ row.type }}</span></template><template #amount="{ row }">{{ formatMoney(row.amount) }}</template><template #confidence="{ row }">{{ row.confidence }}</template></DataTable></Panel>
      </div>
    </AsyncSection>
  </AppShell>
</template>
