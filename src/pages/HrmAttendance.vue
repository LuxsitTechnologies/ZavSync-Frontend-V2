<script setup lang="ts">
import { computed, ref } from "vue";
import { CalendarCheck, Download } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { attendance } from "@/lib/mock-modules";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta(
  "Attendance",
  "Daily attendance register with clock-in, clock-out, overtime and exception tracking.",
);

const query = ref("");
const status = ref("all");

const rows = computed(() =>
  attendance.filter((r) => {
    const q = query.value.trim().toLowerCase();
    return (
      (!q || r.employee.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)) &&
      (status.value === "all" || r.status === status.value)
    );
  }),
);

const present = attendance.filter((r) => r.status === "present").length;
const late = attendance.filter((r) => r.status === "late").length;
const overtime = attendance.reduce((s, r) => s + r.overtime, 0);

const columns: Column[] = [
  { key: "employee", header: "Employee" },
  { key: "department", header: "Department" },
  { key: "in", header: "Clock in", class: "num" },
  { key: "out", header: "Clock out", class: "num" },
  { key: "hours", header: "Hours", align: "right", class: "num" },
  { key: "ot", header: "Overtime", align: "right", class: "num" },
  { key: "device", header: "Source" },
  { key: "status", header: "Status" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Attendance" description="Monday, 24 August 2026 · all sites">
      <template #actions>
        <ZButton variant="outline">
          <Download class="size-4" /> Export
        </ZButton>
        <ZButton>
          <CalendarCheck class="size-4" /> Mark attendance
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Present" :value="String(present)" hint="Checked in on time" tone="success" />
      <StatCard label="Late arrivals" :value="String(late)" hint="After 09:15 grace" tone="warning" />
      <StatCard label="Absent" value="1" hint="No check-in recorded" tone="danger" />
      <StatCard label="Overtime hours" :value="overtime.toFixed(1)" hint="Payable this cycle" tone="brand" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search employee or code" />
        <select v-model="status" class="field w-40" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="half_day">Half day</option>
          <option value="on_leave">On leave</option>
          <option value="absent">Absent</option>
        </select>
      </Toolbar>
      <DataTable :columns="columns" :rows="rows" :min-width="980">
        <template #employee="{ row }">
          <div class="leading-tight">
            <p class="font-medium text-content">{{ row.employee }}</p>
            <p class="num text-2xs text-content-muted">{{ row.code }}</p>
          </div>
        </template>
        <template #department="{ row }">{{ row.department }}</template>
        <template #in="{ row }">{{ row.clock_in }}</template>
        <template #out="{ row }">{{ row.clock_out }}</template>
        <template #hours="{ row }">{{ row.hours.toFixed(1) }}</template>
        <template #ot="{ row }">{{ row.overtime ? `+${row.overtime.toFixed(1)}` : "—" }}</template>
        <template #device="{ row }"><span class="text-xs">{{ row.device }}</span></template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #footer><span>{{ rows.length }} records</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
