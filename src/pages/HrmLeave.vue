<script setup lang="ts">
import { computed, ref } from "vue";
import { Check, Plus, X } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { leaveRequests } from "@/lib/mock-modules";
import { shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Leave", "Leave requests, balances and approval workflow across every company.");

const query = ref("");
const status = ref("all");

const rows = computed(() =>
  leaveRequests.filter((r) => {
    const q = query.value.trim().toLowerCase();
    return (
      (!q || r.employee.toLowerCase().includes(q)) &&
      (status.value === "all" || r.status === status.value)
    );
  }),
);

const pending = leaveRequests.filter((r) => r.status === "pending");

const columns: Column[] = [
  { key: "employee", header: "Employee" },
  { key: "type", header: "Type" },
  { key: "from", header: "From", class: "num" },
  { key: "to", header: "To", class: "num" },
  { key: "days", header: "Days", align: "right", class: "num" },
  { key: "balance", header: "Balance left", align: "right", class: "num" },
  { key: "approver", header: "Approver" },
  { key: "status", header: "Status" },
  { key: "actions", header: "", align: "right" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Leave" :description="`${pending.length} requests awaiting approval`">
      <template #actions>
        <ZButton>
          <Plus class="size-4" /> New request
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Pending" :value="String(pending.length)" hint="Needs a decision" tone="warning" />
      <StatCard label="Approved this month" value="14" hint="Across all companies" tone="success" />
      <StatCard label="On leave today" value="3" hint="Reflected in attendance" tone="brand" />
      <StatCard label="Avg. balance" value="7.4 days" hint="Annual entitlement" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search employee" />
        <select v-model="status" class="field w-40" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </Toolbar>
      <DataTable :columns="columns" :rows="rows" :min-width="1000">
        <template #employee="{ row }"><span class="font-medium text-content">{{ row.employee }}</span></template>
        <template #type="{ row }">{{ row.type }}</template>
        <template #from="{ row }">{{ shortDate(row.from) }}</template>
        <template #to="{ row }">{{ shortDate(row.to) }}</template>
        <template #days="{ row }">{{ row.days }}</template>
        <template #balance="{ row }">{{ row.balance }}</template>
        <template #approver="{ row }">{{ row.approver }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #actions="{ row }">
          <div v-if="row.status === 'pending'" class="flex justify-end gap-1">
            <button
              type="button"
              :aria-label="`Approve leave for ${row.employee}`"
              class="grid size-7 place-items-center rounded-md text-success hover:bg-surface-hover"
            >
              <Check class="size-4" />
            </button>
            <button
              type="button"
              :aria-label="`Reject leave for ${row.employee}`"
              class="grid size-7 place-items-center rounded-md text-danger hover:bg-surface-hover"
            >
              <X class="size-4" />
            </button>
          </div>
        </template>
        <template #footer><span>{{ rows.length }} requests</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
