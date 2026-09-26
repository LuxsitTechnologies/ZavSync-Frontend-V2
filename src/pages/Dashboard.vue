<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import AreaChart from "@/components/zs/AreaChart.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { shortDate } from "@/lib/format";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { invoicesRepository } from "@/services/accounting/invoices.repository";
import { receivablesRepository } from "@/services/accounting/receivables.repository";
import { useCompanyStore } from "@/stores/company";

setPageMeta("Dashboard", "Live operational and financial summary for the active company.");

const company = useCompanyStore();
const canViewAccounting = computed(
  () =>
    company.activeCompanyId.length > 0 &&
    company.hasPermission("accounting.view") &&
    company.hasModule("invoicing"),
);
const canCreateInvoice = computed(
  () => canViewAccounting.value && company.hasPermission("accounting.create"),
);

const invoiceState = useAsyncData(
  () =>
    canViewAccounting.value
      ? invoicesRepository.list(company.activeCompanyId)
      : Promise.resolve([]),
  { watch: [() => company.contextVersion] },
);
const paymentState = useAsyncData(
  () =>
    canViewAccounting.value && company.hasModule("receivables")
      ? receivablesRepository.payments(company.activeCompanyId)
      : Promise.resolve([]),
  { watch: [() => company.contextVersion] },
);

const invoices = computed(() => invoiceState.data.value ?? []);
const recent = computed(() => invoices.value.slice(0, 5));
const postedInvoices = computed(() =>
  invoices.value.filter(
    (invoice) => invoice.accounting_status !== "draft" && invoice.accounting_status !== "void",
  ),
);
const currency = computed(() => company.activeCompany?.currency ?? "PKR");

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthAtOffset(offset: number): Date {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return date;
}

const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
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
const outstanding = computed(() =>
  postedInvoices.value.reduce((sum, invoice) => sum + invoice.balance_due, 0),
);
const collected = computed(() =>
  (paymentState.data.value ?? [])
    .filter((payment) => payment.payment_date.startsWith(currentMonth))
    .reduce((sum, payment) => sum + payment.amount, 0),
);
const overdueCount = computed(
  () =>
    postedInvoices.value.filter(
      (invoice) => invoice.balance_due > 0 && invoice.due_date < todayKey,
    ).length,
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
    value: outstanding.value,
    format: "money" as const,
    delta: null,
    note: "Posted receivables",
  },
  {
    key: "collected",
    label: "Collected (MTD)",
    value: collected.value,
    format: "money" as const,
    delta: null,
    note: "Recorded customer payments",
  },
  {
    key: "overdue",
    label: "Overdue invoices",
    value: overdueCount.value,
    format: "number" as const,
    delta: null,
    note: "Open past due date",
  },
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
  invoices.value
    .filter((invoice) => ["failed", "rejected"].includes(invoice.fbr_status))
    .map((invoice) => ({
      id: `fbr-${invoice.id}`,
      type: "FBR resubmission",
      subject: `${invoice.invoice_number} · ${invoice.customer_name}`,
      meta: `${invoice.fbr_status === "rejected" ? "Rejected" : "Failed"} — review submission details`,
    }))
    .slice(0, 4),
);

const series = [
  { key: "invoiced", color: "var(--chart-1)", id: "gInvoiced" },
  { key: "collected", color: "var(--chart-2)", id: "gCollected" },
];

function formatKpi(value: number, format: "money" | "number"): string {
  return format === "money"
    ? formatMoneyCompact(value, currency.value)
    : new Intl.NumberFormat("en-PK").format(value);
}
</script>

<template>
  <AppShell>
    <PageHeader
      title="Dashboard"
      :description="company.activeCompany ? `Live workspace for ${company.activeCompany.name}` : 'No company workspace is available'"
    >
      <template v-if="canCreateInvoice" #actions>
        <RouterLink
          to="/accounting/invoices"
          class="inline-flex h-control items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus class="size-4" />
          New invoice
        </RouterLink>
      </template>
    </PageHeader>

    <div v-if="!company.activeCompany" class="panel p-8 text-center">
      <h2 class="text-base font-semibold text-content">No company membership</h2>
      <p class="mt-2 text-sm text-content-secondary">
        Ask a workspace administrator to invite you to a company before using company data.
      </p>
    </div>

    <div v-else-if="!canViewAccounting" class="panel p-8 text-center">
      <h2 class="text-base font-semibold text-content">Dashboard data is restricted</h2>
      <p class="mt-2 text-sm text-content-secondary">
        Your current company role does not include access to accounting and receivables data.
      </p>
    </div>

    <template v-else>
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
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-md font-semibold text-content">Invoiced vs collected</h2>
              <p class="text-xs text-content-muted">Last 6 months, {{ currency }} millions</p>
            </div>
            <div class="flex items-center gap-3 text-xs text-content-secondary">
              <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-chart-1" /> Invoiced</span>
              <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-chart-2" /> Collected</span>
            </div>
          </div>
          <div class="mt-4">
            <AreaChart :data="revenueSeries" x-key="month" :series="series" :height="256" />
          </div>
        </div>

        <div class="panel p-4">
          <h2 class="text-md font-semibold text-content">Pending attention</h2>
          <p v-if="pendingApprovals.length === 0" class="mt-3 text-sm text-content-muted">
            No failed or rejected FBR submissions.
          </p>
          <ul v-else class="mt-3 space-y-2">
            <li
              v-for="item in pendingApprovals"
              :key="item.id"
              class="rounded-md border border-line p-3"
            >
              <p class="label-caps">{{ item.type }}</p>
              <p class="mt-1 text-sm font-medium text-content">{{ item.subject }}</p>
              <p class="text-2xs text-content-muted">{{ item.meta }}</p>
            </li>
          </ul>
        </div>
      </div>

      <div class="panel mt-4 overflow-x-auto">
        <div class="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 class="text-md font-semibold text-content">Recent invoices</h2>
          <RouterLink to="/accounting/invoices" class="text-sm font-medium text-content-brand hover:underline">
            View all
          </RouterLink>
        </div>
        <table class="w-full min-w-[720px]">
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
            <tr v-for="invoice in recent" :key="invoice.id" class="table-row-zs">
              <td class="num px-4 font-medium text-content">{{ invoice.invoice_number }}</td>
              <td class="px-4 text-content-secondary">{{ invoice.customer_name }}</td>
              <td class="num px-4 text-content-muted">{{ shortDate(invoice.invoice_date) }}</td>
              <td class="num px-4 text-right text-content">{{ formatMoney(invoice.total, currency) }}</td>
              <td class="px-4"><StatusBadge :status="invoice.payment_status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </AppShell>
</template>
