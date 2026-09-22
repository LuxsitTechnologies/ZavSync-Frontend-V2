<script setup lang="ts">
import { computed, ref } from "vue";
import { Download, PlayCircle } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { payrollRuns } from "@/lib/mock-modules";
import { money } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Payroll Runs", "Payslip-level register showing basic, allowances, deductions and net pay.");

const query = ref("");
const status = ref("all");

const rows = computed(() =>
  payrollRuns.filter((r) => {
    const q = query.value.trim().toLowerCase();
    return (
      (!q || r.employee.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)) &&
      (status.value === "all" || r.status === status.value)
    );
  }),
);

const columns: Column[] = [
  { key: "emp", header: "Employee" },
  { key: "basic", header: "Basic", align: "right", class: "num" },
  { key: "allow", header: "Allowances", align: "right", class: "num" },
  { key: "ded", header: "Deductions", align: "right", class: "num" },
  { key: "tax", header: "Income tax", align: "right", class: "num" },
  { key: "net", header: "Net pay", align: "right", class: "num font-medium" },
  { key: "status", header: "Status" },
];
</script>

<template>
  <AppShell>
    <PageHeader title="Payroll Runs" description="PB-2026-08-A · Zavtech Solutions · August 2026">
      <template #actions>
        <ZButton variant="outline">
          <Download class="size-4" /> Payslips
        </ZButton>
        <ZButton>
          <PlayCircle class="size-4" /> Recalculate
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Payslips" :value="String(payrollRuns.length)" tone="brand" />
      <StatCard label="Net payable" :value="money(payrollRuns.reduce((s, r) => s + r.net, 0))" tone="success" />
      <StatCard label="Tax withheld" :value="money(payrollRuns.reduce((s, r) => s + r.tax, 0))" tone="warning" />
      <StatCard label="On hold" value="1" hint="Pending clearance" tone="danger" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="query" placeholder="Search employee or code" />
        <select v-model="status" class="field w-40" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="hold">Hold</option>
        </select>
      </Toolbar>
      <DataTable :columns="columns" :rows="rows" :min-width="1040">
        <template #emp="{ row }">
          <div class="leading-tight">
            <p class="font-medium text-content">{{ row.employee }}</p>
            <p class="num text-2xs text-content-muted">{{ row.code }}</p>
          </div>
        </template>
        <template #basic="{ row }">{{ money(row.basic) }}</template>
        <template #allow="{ row }">{{ money(row.allowances) }}</template>
        <template #ded="{ row }">{{ money(row.deductions) }}</template>
        <template #tax="{ row }">{{ money(row.tax) }}</template>
        <template #net="{ row }">{{ money(row.net) }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #footer><span>{{ rows.length }} payslips</span></template>
      </DataTable>
    </Panel>
  </AppShell>
</template>
