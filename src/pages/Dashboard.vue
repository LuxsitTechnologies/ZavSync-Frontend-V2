<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import AreaChart from "@/components/zs/AreaChart.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { dashboard } from "@/lib/mock-data";
import { shortDate } from "@/lib/format";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { invoicesRepository } from "@/services/accounting/invoices.repository";
import { receivablesRepository } from "@/services/accounting/receivables.repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta(
  "Dashboard",
  "ZavSync operations dashboard: revenue, receivables, attendance and pending approvals in one view.",
);

const TONE_BG: Record<string, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
};

function formatKpi(value: number, format: "money" | "number" | "percent") {
  if (format === "money") return formatMoneyCompact(value);
  if (format === "percent") return `${value}%`;
  return new Intl.NumberFormat("en-PK").format(value);
}

const attendanceTotal = computed(() =>
  dashboard.attendanceSplit.reduce((sum, s) => sum + s.value, 0),
);
const company = useCompanyStore();
const invoiceState = useAsyncData(() => invoicesRepository.list(company.activeCompanyId), {
  watch: [() => company.activeCompanyId],
});
const paymentState = useAsyncData(() => receivablesRepository.payments(company.activeCompanyId), {
  watch: [() => company.activeCompanyId],
});
const invoices = computed(() => invoiceState.data.value ?? []);
const recent = computed(() => (invoiceState.data.value ?? []).slice(0, 5));
const postedInvoices = computed(() =>
  invoices.value.filter(
    (invoice) => invoice.accounting_status !== "draft" && invoice.accounting_status !== "void",
  ),
);

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthAtOffset(offset: number): Date {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return date;
}

const currentMonth = monthKey(monthAtOffset(0));
const previousMonth = monthKey(monthAtOffset(-1));
const currentRevenue = computed(() =>
  postedInvoices.value
    .filter((invoice) => invoice.invoice_date.startsWith(currentMonth))
    .reduce((sum, invoice) => sum + invoice.taxable_amount, 0),
);
const previousRevenue = computed(() =>
  postedInvoices.value
    .filter((invoice) => invoice.invoice_date.startsWith(previousMonth))
    .reduce((sum, invoice) => sum + invoice.taxable_amount, 0),
);
const revenueDelta = computed(() =>
  previousRevenue.value === 0
    ? null
    : Math.round(((currentRevenue.value - previousRevenue.value) * 1000) / previousRevenue.value) / 10,
);
const liveKpis = computed(() => [
  {
    key: "revenue",
    label: "Revenue (MTD)",
    value: currentRevenue.value,
    format: "money" as const,
    delta: revenueDelta.value,
    note: revenueDelta.value === null ? "No prior-month baseline" : "vs last month",
  },
  {
    key: "outstanding",
    label: "Outstanding",
    value: postedInvoices.value.reduce((sum, invoice) => sum + invoice.balance_due, 0),
    format: "money" as const,
    delta: null,
    note: "Live posted balance",
  },
  ...dashboard.kpis.map((kpi) => ({ ...kpi, note: "vs last month" })),
]);
const revenueSeries = computed(() =>
  Array.from({ length: 6 }, (_, index) => monthAtOffset(index - 5)).map((date) => {
    const key = monthKey(date);
    return {
      month: date.toLocaleDateString("en-GB", { month: "short" }),
      invoiced:
        postedInvoices.value
          .filter((invoice) => invoice.invoice_date.startsWith(key))
          .reduce((sum, invoice) => sum + invoice.total, 0) /
        100 /
        1_000_000,
      collected:
        (paymentState.data.value ?? [])
          .filter((payment) => payment.payment_date.startsWith(key))
          .reduce((sum, payment) => sum + payment.amount, 0) /
        100 /
        1_000_000,
    };
  }),
);
const pendingApprovals = computed(() =>
  [
    ...invoices.value
    .filter((invoice) => ["failed", "rejected"].includes(invoice.fbr_status))
    .map((invoice) => ({
      id: `fbr-${invoice.id}`,
      type: "FBR resubmission",
      subject: `${invoice.invoice_number} · ${invoice.customer_name}`,
      meta: `${invoice.fbr_status === "rejected" ? "Rejected" : "Failed"} — review submission details`,
    })),
    ...dashboard.approvals,
  ].slice(0, 4),
);

const series = [
  { key: "invoiced", color: "var(--chart-1)", id: "gInvoiced" },
  { key: "collected", color: "var(--chart-2)", id: "gCollected" },
];
</script>

<template>
  <AppShell>
    <PageHeader
      title="Dashboard"
      description="Company-wide snapshot for Zavtech Solutions · August 2026"
    >
      <template #actions>
        <ZButton variant="outline">Export</ZButton>
        <ZButton>
          <Plus class="size-4" />
          New invoice
        </ZButton>
      </template>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="kpi in liveKpis" :key="kpi.key" class="panel p-4">
        <p class="label-caps">{{ kpi.label }}</p>
        <p class="num mt-2 text-2xl font-semibold text-content">
          {{ formatKpi(kpi.value, kpi.format) }}
        </p>
        <p
          v-if="kpi.delta !== null"
          class="mt-1.5 inline-flex items-center gap-1 text-xs font-medium"
          :class="kpi.delta >= 0 ? 'text-success-strong' : 'text-danger-strong'"
        >
          <ArrowUpRight v-if="kpi.delta >= 0" class="size-3.5" />
          <ArrowDownRight v-else class="size-3.5" />
          {{ Math.abs(kpi.delta) }}% {{ kpi.note }}
        </p>
        <p v-else class="mt-1.5 text-xs text-content-muted">{{ kpi.note }}</p>
      </div>
    </div>

    <div class="mt-4 grid gap-4 xl:grid-cols-3">
      <div class="panel p-4 xl:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-md font-semibold text-content">Invoiced vs collected</h2>
            <p class="text-xs text-content-muted">Last 6 months, PKR millions</p>
          </div>
          <div class="flex items-center gap-3 text-xs text-content-secondary">
            <span class="flex items-center gap-1.5">
              <span class="size-2 rounded-full bg-chart-1" /> Invoiced
            </span>
            <span class="flex items-center gap-1.5">
              <span class="size-2 rounded-full bg-chart-2" /> Collected
            </span>
          </div>
        </div>
        <div class="mt-4">
          <AreaChart :data="revenueSeries" x-key="month" :series="series" :height="256" />
        </div>
      </div>

      <div class="panel p-4">
        <h2 class="text-md font-semibold text-content">Attendance today</h2>
        <p class="text-xs text-content-muted">{{ attendanceTotal }} employees scheduled</p>
        <div class="mt-4 space-y-3">
          <div v-for="slice in dashboard.attendanceSplit" :key="slice.label">
            <div class="flex items-center justify-between text-sm">
              <span class="text-content-secondary">{{ slice.label }}</span>
              <span class="num font-medium text-content">{{ slice.value }}</span>
            </div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                class="h-full rounded-full"
                :class="TONE_BG[slice.tone]"
                :style="{ width: `${(slice.value / attendanceTotal) * 100}%` }"
              />
            </div>
          </div>
        </div>

        <h3 class="label-caps mt-6">Recent activity</h3>
        <ul class="mt-2 space-y-2.5">
          <li v-for="item in dashboard.activity" :key="item.id" class="text-sm">
            <span class="font-medium text-content">{{ item.who }}</span>
            <span class="text-content-secondary"> {{ item.what }}</span>
            <span class="block text-2xs text-content-muted">{{ item.when }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-4 grid gap-4 xl:grid-cols-3">
      <div class="panel overflow-hidden xl:col-span-2">
        <div class="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 class="text-md font-semibold text-content">Recent invoices</h2>
          <RouterLink
            to="/accounting/invoices"
            class="text-sm font-medium text-content-brand hover:underline"
          >
            View all
          </RouterLink>
        </div>
        <table class="w-full">
          <thead>
            <tr class="table-head">
              <th class="px-4 py-2.5 text-left">Invoice</th>
              <th class="px-4 py-2.5 text-left">Client</th>
              <th class="px-4 py-2.5 text-left">Issued</th>
              <th class="px-4 py-2.5 text-right">Total</th>
              <th class="px-4 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="invoiceState.loading.value">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-content-muted">Loading invoices…</td>
            </tr>
            <tr v-else-if="invoiceState.error.value">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-danger-strong">
                {{ invoiceState.error.value.message }}
              </td>
            </tr>
            <tr v-else-if="recent.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-content-muted">No invoices yet.</td>
            </tr>
            <tr v-for="inv in recent" :key="inv.id" class="table-row-zs">
              <td class="num px-4 font-medium text-content">{{ inv.invoice_number }}</td>
              <td class="px-4 text-content-secondary">{{ inv.customer_name }}</td>
              <td class="num px-4 text-content-muted">{{ shortDate(inv.invoice_date) }}</td>
              <td class="num px-4 text-right text-content">{{ formatMoney(inv.total) }}</td>
              <td class="px-4"><StatusBadge :status="inv.payment_status" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="panel p-4">
        <h2 class="text-md font-semibold text-content">Pending approvals</h2>
        <ul class="mt-3 space-y-2">
          <li
            v-for="item in pendingApprovals"
            :key="item.id"
            class="rounded-md border border-line p-3 transition-colors hover:bg-surface-hover"
          >
            <p class="label-caps">{{ item.type }}</p>
            <p class="mt-1 text-sm font-medium text-content">{{ item.subject }}</p>
            <p class="text-2xs text-content-muted">{{ item.meta }}</p>
          </li>
        </ul>
      </div>
    </div>
  </AppShell>
</template>
