<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import { services, type ServiceItem } from "@/lib/mock-modules";
import { money } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Services", "Billable service catalogue with rates, tax treatment and HS codes.");

const query = ref("");
const category = ref("all");

const categories = computed(() => Array.from(new Set(services.map((s) => s.category))));

const rows = computed(() =>
  services.filter((s) => {
    const q = query.value.trim().toLowerCase();
    return (
      (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) &&
      (category.value === "all" || s.category === category.value)
    );
  }),
);

const columns: Column[] = [
  { key: "code", header: "Code", class: "num" },
  { key: "name", header: "Service" },
  { key: "category", header: "Category" },
  { key: "unit", header: "Unit" },
  { key: "rate", header: "Rate", align: "right", class: "num" },
  { key: "tax", header: "Tax", align: "right", class: "num" },
  { key: "hs", header: "HS code", class: "num" },
  { key: "active", header: "Status" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Services" description="Catalogue used by invoices and FBR line items">
      <template #actions>
        <ZButton>
          <Plus class="size-4" /> New service
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active services" :value="String(services.filter((s) => s.active).length)" tone="success" />
      <StatCard label="Categories" :value="String(categories.length)" tone="brand" />
      <StatCard label="Avg. tax rate" value="15.3%" hint="Weighted by revenue" />
      <StatCard label="Missing HS code" value="0" hint="FBR ready" tone="success" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search service or code" />
        <select v-model="category" class="field w-40" aria-label="Filter by category">
          <option value="all">All categories</option>
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>
      </Toolbar>
      <DataTable :columns="columns" :rows="rows" :min-width="1040">
        <template #code="{ row }: { row: ServiceItem }">{{ row.code }}</template>
        <template #name="{ row }: { row: ServiceItem }">
          <span class="font-medium text-content">{{ row.name }}</span>
        </template>
        <template #category="{ row }: { row: ServiceItem }">{{ row.category }}</template>
        <template #unit="{ row }: { row: ServiceItem }">{{ row.unit }}</template>
        <template #rate="{ row }: { row: ServiceItem }">{{ money(row.rate) }}</template>
        <template #tax="{ row }: { row: ServiceItem }">{{ row.tax_rate }}%</template>
        <template #hs="{ row }: { row: ServiceItem }">{{ row.hs_code }}</template>
        <template #active="{ row }: { row: ServiceItem }">
          <span :class="`zs-badge ${row.active ? 'badge-success' : 'badge-neutral'}`">
            {{ row.active ? "Active" : "Archived" }}
          </span>
        </template>
        <template #footer><span>{{ rows.length }} services</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
