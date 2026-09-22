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
import { journalEntries, type JournalEntry } from "@/lib/mock-modules";
import { money, shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Journal Entries", "Manual, payroll and system journal vouchers with posting status.");

const query = ref("");
const status = ref("all");

const rows = computed(() =>
  journalEntries.filter((j) => {
    const q = query.value.trim().toLowerCase();
    return (
      (!q || j.narration.toLowerCase().includes(q) || j.number.toLowerCase().includes(q)) &&
      (status.value === "all" || j.status === status.value)
    );
  }),
);

const columns: Column[] = [
  { key: "number", header: "Voucher", class: "num font-medium" },
  { key: "date", header: "Date", class: "num" },
  { key: "type", header: "Type" },
  { key: "narration", header: "Narration" },
  { key: "amount", header: "Amount", align: "right", class: "num" },
  { key: "by", header: "Created by" },
  { key: "status", header: "Status" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Journal Entries" description="August 2026 posting period">
      <template #actions>
        <ZButton>
          <Plus class="size-4" /> New voucher
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Posted" value="2" hint="Locked to the ledger" tone="success" />
      <StatCard label="Draft" value="2" hint="Editable" />
      <StatCard label="Awaiting approval" value="1" tone="warning" />
      <StatCard label="Period total" :value="money(journalEntries.reduce((s, j) => s + j.amount, 0))" tone="brand" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search voucher or narration" />
        <select v-model="status" class="field w-40" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="posted">Posted</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
        </select>
      </Toolbar>
      <DataTable :columns="columns" :rows="rows" :min-width="980">
        <template #number="{ row }: { row: JournalEntry }">{{ row.number }}</template>
        <template #date="{ row }: { row: JournalEntry }">{{ shortDate(row.date) }}</template>
        <template #type="{ row }: { row: JournalEntry }">{{ row.type }}</template>
        <template #narration="{ row }: { row: JournalEntry }">
          <span class="text-content">{{ row.narration }}</span>
        </template>
        <template #amount="{ row }: { row: JournalEntry }">{{ money(row.amount) }}</template>
        <template #by="{ row }: { row: JournalEntry }">{{ row.created_by }}</template>
        <template #status="{ row }: { row: JournalEntry }"><StatusBadge :status="row.status" /></template>
        <template #footer><span>{{ rows.length }} vouchers</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
