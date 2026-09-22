<script setup lang="ts">
import { ArrowRight, PlayCircle } from "lucide-vue-next";
import { RouterLink } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import AreaChart from "@/components/zs/AreaChart.vue";
import { payrollBatches } from "@/lib/mock-modules";
import { compactMoney, money } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Payroll Dashboard", "Payroll cost, headcount and batch status across every company.");

const trend = [
  { month: "Mar", gross: 58.2, net: 51.1 },
  { month: "Apr", gross: 59.4, net: 52.0 },
  { month: "May", gross: 61.0, net: 53.4 },
  { month: "Jun", gross: 62.8, net: 54.9 },
  { month: "Jul", gross: 64.8, net: 56.7 },
  { month: "Aug", gross: 65.8, net: 57.3 },
];

const trendSeries = [
  { key: "gross", color: "var(--chart-1)", id: "gPayrollGross" },
  { key: "net", color: "var(--chart-2)", id: "gPayrollNet" },
];

const gross = payrollBatches
  .filter((b) => b.period === "August 2026")
  .reduce((s, b) => s + b.gross, 0);
const net = payrollBatches
  .filter((b) => b.period === "August 2026")
  .reduce((s, b) => s + b.net, 0);
const staff = payrollBatches
  .filter((b) => b.period === "August 2026")
  .reduce((s, b) => s + b.employees, 0);

const cycleBatches = payrollBatches.filter((b) => b.period === "August 2026");
</script>

<template>
  <AppShell>
    <PageHeader title="Payroll Dashboard" description="August 2026 cycle · 3 companies">
      <template #actions>
        <ZButton>
          <PlayCircle class="size-4" /> Start payroll run
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Gross cost" :value="money(gross)" hint="Before deductions" tone="brand" />
      <StatCard label="Net payable" :value="money(net)" hint="To disburse 28 Aug" tone="success" />
      <StatCard label="Employees paid" :value="String(staff)" hint="Across all batches" />
      <StatCard label="Statutory dues" :value="money(8498000)" hint="EOBI, PESSI, tax" tone="warning" />
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <Panel
        class="xl:col-span-2"
        title="Payroll cost trend"
        description="Gross vs net, PKR millions"
        body-class="p-4"
      >
        <div class="h-64">
          <AreaChart :data="trend" x-key="month" :series="trendSeries" :height="256" />
        </div>
      </Panel>

      <Panel title="Batches this cycle" description="Approve before disbursement">
        <template #actions>
          <RouterLink to="/payroll/batches" class="text-xs text-content-brand hover:underline">
            View all
          </RouterLink>
        </template>
        <ul class="divide-y divide-line">
          <li v-for="b in cycleBatches" :key="b.id" class="px-4 py-3">
            <div class="flex items-center justify-between gap-2">
              <p class="num text-sm font-medium text-content">{{ b.reference }}</p>
              <StatusBadge :status="b.status" />
            </div>
            <p class="mt-1 text-xs text-content-muted">
              {{ b.company }} · {{ b.employees }} staff · {{ compactMoney(b.net) }} net
            </p>
          </li>
        </ul>
        <div class="border-t border-line p-3">
          <RouterLink
            to="/payroll/runs"
            class="inline-flex items-center gap-1 text-xs text-content-brand hover:underline"
          >
            Open payslip register <ArrowRight class="size-3" />
          </RouterLink>
        </div>
      </Panel>
    </div>
  </AppShell>
</template>
