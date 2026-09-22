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
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { payrollBatches } from "@/lib/mock-modules";
import { money } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Payroll Batches", "Payroll batches per company and period with gross, deductions and net.");

const query = ref("");
const status = ref("all");

const rows = computed(() =>
  payrollBatches.filter((b) => {
    const q = query.value.trim().toLowerCase();
    return (
      (!q || b.reference.toLowerCase().includes(q) || b.company.toLowerCase().includes(q)) &&
      (status.value === "all" || b.status === status.value)
    );
  }),
);

const columns: Column[] = [
  { key: "ref", header: "Batch", class: "num font-medium" },
  { key: "period", header: "Period" },
  { key: "company", header: "Company" },
  { key: "emp", header: "Employees", align: "right", class: "num" },
  { key: "gross", header: "Gross", align: "right", class: "num" },
  { key: "ded", header: "Deductions", align: "right", class: "num" },
  { key: "net", header: "Net", align: "right", class: "num font-medium" },
  { key: "status", header: "Status" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Payroll Batches" description="Grouped payroll runs per company and period">
      <template #actions>
        <ZButton>
          <Plus class="size-4" /> New batch
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Open batches" value="3" hint="August 2026" tone="brand" />
      <StatCard label="Awaiting approval" value="1" tone="warning" />
      <StatCard label="Paid batches" value="2" tone="success" />
      <StatCard label="Net across batches" :value="money(payrollBatches.reduce((s, b) => s + b.net, 0))" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search batch or company" />
        <select v-model="status" class="field w-40" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
      </Toolbar>
      <DataTable :columns="columns" :rows="rows" :min-width="1040">
        <template #ref="{ row }">{{ row.reference }}</template>
        <template #period="{ row }">{{ row.period }}</template>
        <template #company="{ row }">{{ row.company }}</template>
        <template #emp="{ row }">{{ row.employees }}</template>
        <template #gross="{ row }">{{ money(row.gross) }}</template>
        <template #ded="{ row }">{{ money(row.deductions) }}</template>
        <template #net="{ row }">{{ money(row.net) }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #footer><span>{{ rows.length }} batches</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
