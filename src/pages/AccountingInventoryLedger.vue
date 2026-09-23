<script setup lang="ts">
/**
 * A5 — Inventory ledger, FIFO cost layers and COGS postings.
 *
 * FIFO valuation and COGS are calculated by the ZavSync accounting backend.
 * This screen only displays the figures the repository returns; it never
 * recomputes valuation or cost of goods sold client-side.
 */
import { computed, ref, watch } from "vue";
import { Info } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import StatCard from "@/components/zs/StatCard.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import DateRangeFilter from "@/components/accounting/DateRangeFilter.vue";

import { useAsyncData } from "@/composables/useAsyncData";
import { useCompanyStore } from "@/stores/company";
import { inventoryRepository } from "@/services/accounting/inventory.repository";
import { formatMoney, formatMoneyOrDash, formatQuantity } from "@/lib/money";
import { shortDate, labelize } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { CogsPosting, InventoryLedgerEntry } from "@/types/accounting";

setPageMeta(
  "Inventory Ledger & Valuation",
  "FIFO valuation, cost layers and COGS postings for stock movements.",
);

const company = useCompanyStore();

const itemFilter = ref<string>("all");
const from = ref("");
const to = ref("");
const search = ref("");
const expandedCogsId = ref<string | null>(null);

const itemsState = useAsyncData(
  () => inventoryRepository.masterItems(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const valuationState = useAsyncData(
  () => inventoryRepository.valuation(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const reconciliationState = useAsyncData(
  () => inventoryRepository.reconciliation(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const ledgerState = useAsyncData(
  () =>
    inventoryRepository.ledger(company.activeCompanyId, {
      item_id: itemFilter.value,
      from: from.value || undefined,
      to: to.value || undefined,
      search: search.value || undefined,
    }),
  { watch: [() => company.activeCompanyId, itemFilter, from, to, search] },
);

const layersState = useAsyncData(
  () =>
    itemFilter.value === "all"
      ? Promise.resolve([])
      : inventoryRepository.layers(company.activeCompanyId, itemFilter.value),
  { watch: [() => company.activeCompanyId, itemFilter] },
);

const cogsAllState = useAsyncData(
  () => inventoryRepository.cogs(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const cogsItemState = useAsyncData(
  () =>
    itemFilter.value === "all"
      ? Promise.resolve([])
      : inventoryRepository.cogs(company.activeCompanyId, itemFilter.value),
  { watch: [() => company.activeCompanyId, itemFilter] },
);

watch(itemFilter, () => {
  expandedCogsId.value = null;
});

const totalValue = computed(() => (valuationState.data.value ?? []).reduce((s, i) => s + i.inventory_value, 0));
const itemsTracked = computed(() => (itemsState.data.value ?? []).length);
const movementsInRange = computed(() => (ledgerState.data.value ?? []).length);
const cogsCount = computed(() => (cogsAllState.data.value ?? []).length);

const ledgerColumns: Column[] = [
  { key: "item", header: "Item" },
  { key: "date", header: "Date", class: "num" },
  { key: "type", header: "Type" },
  { key: "reference", header: "Reference" },
  { key: "qty_in", header: "Qty in", align: "right", class: "num" },
  { key: "qty_out", header: "Qty out", align: "right", class: "num" },
  { key: "unit_cost", header: "Unit cost", align: "right", class: "num" },
  { key: "value", header: "Movement value", align: "right", class: "num" },
  { key: "run_qty", header: "Running qty", align: "right", class: "num" },
  { key: "run_value", header: "Running value", align: "right", class: "num font-medium" },
];

const layerColumns: Column[] = [
  { key: "received", header: "Received" },
  { key: "reference", header: "Reference" },
  { key: "original", header: "Original qty", align: "right", class: "num" },
  { key: "remaining", header: "Remaining qty", align: "right", class: "num" },
  { key: "unit_cost", header: "Unit cost", align: "right", class: "num" },
  { key: "value", header: "Remaining value", align: "right", class: "num font-medium" },
];

const cogsColumns: Column[] = [
  { key: "date", header: "Date", class: "num" },
  { key: "reference", header: "Reference" },
  { key: "quantity", header: "Quantity", align: "right", class: "num" },
  { key: "amount", header: "COGS amount", align: "right", class: "num font-medium" },
  { key: "status", header: "Status" },
  { key: "journal", header: "Journal" },
];

const layerTotals = computed(() => {
  const rows = layersState.data.value ?? [];
  return {
    remaining: rows.reduce((s, l) => s + l.remaining_quantity, 0),
    value: rows.reduce((s, l) => s + l.remaining_value, 0),
  };
});

const selectedItemLabel = computed(() => {
  const item = (itemsState.data.value ?? []).find((i) => i.id === itemFilter.value);
  return item ? `${item.sku} · ${item.name}` : "";
});

const expandedCogs = computed<CogsPosting | null>(() =>
  (cogsItemState.data.value ?? []).find((c) => c.id === expandedCogsId.value) ?? null,
);

function toggleExpand(row: CogsPosting) {
  expandedCogsId.value = expandedCogsId.value === row.id ? null : row.id;
}

function referenceLabel(row: InventoryLedgerEntry) {
  return `${row.reference} · ${labelize(row.reference_type)}`;
}

function formatMilliQuantity(value: number) {
  return formatQuantity(value / 1000);
}
</script>

<template>
  <AppShell>
    <PageHeader
      title="Inventory Ledger & Valuation"
      description="Stock movements, FIFO cost layers and cost-of-goods-sold postings."
    />

    <div class="mb-4 flex items-start gap-2 rounded-md border border-line bg-surface-sunken p-3 text-xs text-content-secondary">
      <Info class="mt-0.5 size-3.5 shrink-0 text-content-muted" />
      <p>
        FIFO valuation and COGS are calculated by the ZavSync accounting backend. This screen displays the
        returned figures and never recomputes them.
      </p>
    </div>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total FIFO inventory value" :value="formatMoney(totalValue)" tone="brand" />
      <StatCard label="Items tracked" :value="String(itemsTracked)" />
      <StatCard label="Movements in range" :value="String(movementsInRange)" />
      <StatCard label="COGS postings" :value="String(cogsCount)" />
      <StatCard
        label="Inventory / GL"
        :value="reconciliationState.data.value?.status === 'reconciled' ? 'Reconciled' : formatMoney(reconciliationState.data.value?.difference ?? 0)"
        :tone="reconciliationState.data.value?.status === 'reconciled' ? 'neutral' : 'warning'"
      />
    </div>

    <Panel title="Ledger" description="All inventory movements for the selected item and date range.">
      <Toolbar>
        <select v-model="itemFilter" class="field w-64" aria-label="Filter by item">
          <option value="all">All items</option>
          <option v-for="item in itemsState.data.value ?? []" :key="item.id" :value="item.id">
            {{ item.sku }} · {{ item.name }}
          </option>
        </select>
        <DateRangeFilter v-model:from="from" v-model:to="to" />
        <SearchInput v-model="search" placeholder="Search reference, item or SKU" />
      </Toolbar>

      <AsyncSection
        :loading="ledgerState.loading.value"
        :error="ledgerState.error.value"
        :empty="ledgerState.isEmpty.value"
        empty-title="No movements found"
        empty-message="No inventory movements match this filter for the selected company."
        @retry="ledgerState.refresh"
      >
        <DataTable :columns="ledgerColumns" :rows="ledgerState.data.value ?? []" :min-width="1200">
          <template #item="{ row }: { row: InventoryLedgerEntry }">
            <div class="leading-tight">
              <p class="font-medium text-content">{{ row.item_name }}</p>
              <p class="num text-2xs text-content-muted">{{ row.item_sku }}</p>
            </div>
          </template>
          <template #date="{ row }: { row: InventoryLedgerEntry }">{{ shortDate(row.date) }}</template>
          <template #type="{ row }: { row: InventoryLedgerEntry }"><StatusBadge :status="row.type" /></template>
          <template #reference="{ row }: { row: InventoryLedgerEntry }">{{ referenceLabel(row) }}</template>
          <template #qty_in="{ row }: { row: InventoryLedgerEntry }">{{ row.quantity_in ? formatMilliQuantity(row.quantity_in) : "—" }}</template>
          <template #qty_out="{ row }: { row: InventoryLedgerEntry }">{{ row.quantity_out ? formatMilliQuantity(row.quantity_out) : "—" }}</template>
          <template #unit_cost="{ row }: { row: InventoryLedgerEntry }">{{ row.unit_cost === null ? "—" : formatMoneyOrDash(row.unit_cost) }}</template>
          <template #value="{ row }: { row: InventoryLedgerEntry }">{{ formatMoneyOrDash(row.value) }}</template>
          <template #run_qty="{ row }: { row: InventoryLedgerEntry }">{{ formatMilliQuantity(row.running_quantity) }}</template>
          <template #run_value="{ row }: { row: InventoryLedgerEntry }">{{ formatMoney(row.running_value) }}</template>
          <template #footer><span>{{ (ledgerState.data.value ?? []).length }} movements</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <template v-if="itemFilter !== 'all'">
      <Panel
        class="mt-4"
        title="Open FIFO cost layers"
        :description="selectedItemLabel ? `Remaining layers for ${selectedItemLabel}` : 'Remaining layers for the selected item'"
      >
        <AsyncSection
          :loading="layersState.loading.value"
          :error="layersState.error.value"
          :empty="layersState.isEmpty.value"
          empty-title="No open layers"
          empty-message="This item has no remaining FIFO cost layers."
          @retry="layersState.refresh"
        >
          <DataTable :columns="layerColumns" :rows="layersState.data.value ?? []" :min-width="900">
            <template #received="{ row }">{{ shortDate(row.received_date) }}</template>
            <template #reference="{ row }">{{ row.reference }}</template>
            <template #original="{ row }">{{ formatMilliQuantity(row.original_quantity) }}</template>
            <template #remaining="{ row }">{{ formatMilliQuantity(row.remaining_quantity) }}</template>
            <template #unit_cost="{ row }">{{ formatMoney(row.unit_cost) }}</template>
            <template #value="{ row }">{{ formatMoney(row.remaining_value) }}</template>
            <template #footer>
              <span>{{ (layersState.data.value ?? []).length }} layers</span>
              <span class="num font-medium text-content">
                Remaining: {{ formatMilliQuantity(layerTotals.remaining) }} · {{ formatMoney(layerTotals.value) }}
              </span>
            </template>
          </DataTable>
        </AsyncSection>
      </Panel>

      <Panel
        class="mt-4"
        title="COGS postings"
        :description="selectedItemLabel ? `Cost of goods sold for ${selectedItemLabel}` : 'Cost of goods sold for the selected item'"
      >
        <AsyncSection
          :loading="cogsItemState.loading.value"
          :error="cogsItemState.error.value"
          :empty="cogsItemState.isEmpty.value"
          empty-title="No COGS postings"
          empty-message="No cost-of-goods-sold movements exist for this item yet."
          @retry="cogsItemState.refresh"
        >
          <DataTable :columns="cogsColumns" :rows="cogsItemState.data.value ?? []" :min-width="1000">
            <template #date="{ row }: { row: CogsPosting }">{{ shortDate(row.date) }}</template>
            <template #reference="{ row }: { row: CogsPosting }">
              <button type="button" class="text-content-brand underline-offset-2 hover:underline" @click="toggleExpand(row)">
                {{ row.reference }}
              </button>
            </template>
            <template #quantity="{ row }: { row: CogsPosting }">{{ formatMilliQuantity(row.quantity) }}</template>
            <template #amount="{ row }: { row: CogsPosting }">{{ formatMoney(row.cogs_amount) }}</template>
            <template #status="{ row }: { row: CogsPosting }">
              <span :class="`zs-badge ${row.posted ? 'badge-success' : 'badge-warning'}`">
                {{ row.posted ? "Posted" : "Not posted" }}
              </span>
            </template>
            <template #journal="{ row }: { row: CogsPosting }">
              <RouterLink v-if="row.journal_id" :to="`/accounting/journals/${row.journal_id}`" class="text-content-brand hover:underline">
                View journal
              </RouterLink>
              <span v-else class="text-content-muted">—</span>
            </template>
            <template #footer><span>{{ (cogsItemState.data.value ?? []).length }} postings</span></template>
          </DataTable>
        </AsyncSection>

        <div v-if="expandedCogs" class="border-t border-line p-4">
          <p class="label-caps mb-2">FIFO consumption for {{ expandedCogs.reference }}</p>
          <table class="w-full text-sm">
            <thead>
              <tr class="table-head">
                <th class="px-3 py-2 text-left">Layer received</th>
                <th class="px-3 py-2 text-right">Quantity</th>
                <th class="px-3 py-2 text-right">Unit cost</th>
                <th class="px-3 py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in expandedCogs.consumption" :key="line.layer_id" class="table-row-zs">
                <td class="px-3 py-2 num text-content-secondary">{{ shortDate(line.received_date) }}</td>
                <td class="px-3 py-2 num text-right text-content-secondary">{{ formatMilliQuantity(line.quantity) }}</td>
                <td class="px-3 py-2 num text-right text-content-secondary">{{ formatMoney(line.unit_cost) }}</td>
                <td class="px-3 py-2 num text-right font-medium text-content">{{ formatMoney(line.value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </template>

  </AppShell>
</template>
