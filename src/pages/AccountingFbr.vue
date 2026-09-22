<script setup lang="ts">
import { computed, ref } from "vue";
import { Landmark, RefreshCw } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { fbrInvoices, type FbrInvoice } from "@/lib/mock-modules";
import { money } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta(
  "FBR Invoices",
  "Digital invoicing status against FBR IRIS — submitted, queued and rejected documents.",
);

const query = ref("");
const status = ref("all");

const rows = computed(() =>
  fbrInvoices.filter((r) => {
    const q = query.value.trim().toLowerCase();
    return (
      (!q || r.client.toLowerCase().includes(q) || r.invoice_number.toLowerCase().includes(q)) &&
      (status.value === "all" || r.status === status.value)
    );
  }),
);

const tax = fbrInvoices.reduce((s, r) => s + r.sales_tax, 0);

const columns: Column[] = [
  { key: "inv", header: "Invoice" },
  { key: "client", header: "Buyer" },
  { key: "taxable", header: "Taxable value", align: "right", class: "num" },
  { key: "tax", header: "Sales tax", align: "right", class: "num" },
  { key: "submitted", header: "Submitted", class: "num" },
  { key: "status", header: "IRIS status" },
  { key: "note", header: "Note" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="FBR Invoices" description="Digital invoicing sync with FBR IRIS">
      <template #actions>
        <ZButton variant="outline">
          <RefreshCw class="size-4" /> Resync
        </ZButton>
        <ZButton>
          <Landmark class="size-4" /> Submit queued
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Accepted" value="3" hint="IRN issued" tone="success" />
      <StatCard label="Queued" value="2" hint="Next batch 23:00 PKT" tone="warning" />
      <StatCard label="Rejected" value="1" hint="Needs correction" tone="danger" />
      <StatCard label="Sales tax reported" :value="money(tax)" hint="Current period" tone="brand" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search invoice or buyer" />
        <select v-model="status" class="field w-40" aria-label="Filter by IRIS status">
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </Toolbar>
      <DataTable :columns="columns" :rows="rows" :min-width="1080">
        <template #inv="{ row }: { row: FbrInvoice }">
          <div class="leading-tight">
            <p class="num font-medium text-content">{{ row.invoice_number }}</p>
            <p class="num text-2xs text-content-muted">{{ row.irn }}</p>
          </div>
        </template>
        <template #client="{ row }: { row: FbrInvoice }">{{ row.client }}</template>
        <template #taxable="{ row }: { row: FbrInvoice }">{{ money(row.taxable) }}</template>
        <template #tax="{ row }: { row: FbrInvoice }">{{ money(row.sales_tax) }}</template>
        <template #submitted="{ row }: { row: FbrInvoice }">{{ row.submitted_at }}</template>
        <template #status="{ row }: { row: FbrInvoice }"><StatusBadge :status="row.status" /></template>
        <template #note="{ row }: { row: FbrInvoice }"><span class="text-xs">{{ row.note }}</span></template>
        <template #footer><span>{{ rows.length }} documents</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
