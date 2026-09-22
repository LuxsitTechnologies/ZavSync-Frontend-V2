<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus, TriangleAlert } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import { inventory } from "@/lib/mock-modules";
import { money } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Inventory", "Stock on hand by warehouse with reorder levels and valuation.");

const query = ref("");
const warehouse = ref("all");

const warehouses = Array.from(new Set(inventory.map((i) => i.warehouse)));

const rows = computed(() =>
  inventory.filter((i) => {
    const q = query.value.trim().toLowerCase();
    return (
      (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)) &&
      (warehouse.value === "all" || i.warehouse === warehouse.value)
    );
  }),
);

const value = inventory.reduce((s, i) => s + i.on_hand * i.unit_cost, 0);
const low = inventory.filter((i) => i.on_hand < i.reorder_level);

const columns: Column[] = [
  { key: "sku", header: "SKU", class: "num" },
  { key: "name", header: "Item" },
  { key: "category", header: "Category" },
  { key: "warehouse", header: "Warehouse" },
  { key: "onhand", header: "On hand", align: "right", class: "num" },
  { key: "reorder", header: "Reorder at", align: "right", class: "num" },
  { key: "cost", header: "Unit cost", align: "right", class: "num" },
  { key: "status", header: "Status" },
];

function onWarehouseChange(event: Event) {
  warehouse.value = (event.target as HTMLSelectElement).value;
}
</script>

<template>
  <AppShell>
    <PageHeader title="Inventory" description="Consumables, uniforms and technical spares">
      <template #actions>
        <ZButton>
          <Plus class="size-4" /> New item
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="SKUs tracked" :value="String(inventory.length)" tone="brand" />
      <StatCard label="Stock value" :value="money(value)" hint="At last unit cost" />
      <StatCard label="Below reorder" :value="String(low.length)" hint="Raise purchase orders" tone="danger" />
      <StatCard label="Warehouses" :value="String(warehouses.length)" />
    </div>

    <div
      v-if="low.length > 0"
      class="mb-4 flex items-start gap-2 rounded-md border border-danger-subtle bg-danger-subtle p-3 text-sm text-danger-strong"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" />
      <p>{{ low.length }} items are below their reorder level: {{ low.map((i) => i.name).join(", ") }}.</p>
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search item or SKU" />
        <select
          :value="warehouse"
          class="field w-48"
          aria-label="Filter by warehouse"
          @change="onWarehouseChange"
        >
          <option value="all">All warehouses</option>
          <option v-for="w in warehouses" :key="w">{{ w }}</option>
        </select>
      </Toolbar>
      <DataTable :columns="columns" :rows="rows" :min-width="1080">
        <template #sku="{ row }">{{ row.sku }}</template>
        <template #name="{ row }"><span class="font-medium text-content">{{ row.name }}</span></template>
        <template #category="{ row }">{{ row.category }}</template>
        <template #warehouse="{ row }">{{ row.warehouse }}</template>
        <template #onhand="{ row }">{{ row.on_hand }}</template>
        <template #reorder="{ row }">{{ row.reorder_level }}</template>
        <template #cost="{ row }">{{ money(row.unit_cost) }}</template>
        <template #status="{ row }">
          <span :class="`zs-badge ${row.on_hand < row.reorder_level ? 'badge-danger' : 'badge-success'}`">
            {{ row.on_hand < row.reorder_level ? "Low stock" : "In stock" }}
          </span>
        </template>
        <template #footer><span>{{ rows.length }} items</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
