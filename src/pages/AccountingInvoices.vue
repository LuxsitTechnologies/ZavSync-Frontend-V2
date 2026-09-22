<script setup lang="ts">
import { computed, ref } from "vue";
import { Download, Plus, Search } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import { invoices, type PaymentStatus } from "@/lib/mock-data";
import { labelize, money, shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta(
  "Invoices",
  "Track invoices, receivables and FBR submission status across clients in one register.",
);

const STATUSES: (PaymentStatus | "all")[] = [
  "all",
  "paid",
  "partial",
  "unpaid",
  "overdue",
  "draft",
];

const query = ref("");
const status = ref<PaymentStatus | "all">("all");

const rows = computed(() =>
  invoices.filter((inv) => {
    const q = query.value.trim().toLowerCase();
    const matchesQuery =
      !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.client_name.toLowerCase().includes(q);
    return matchesQuery && (status.value === "all" || inv.payment_status === status.value);
  }),
);

const totals = computed(() =>
  rows.value.reduce(
    (acc, inv) => ({
      total: acc.total + inv.total,
      paid: acc.paid + inv.amount_paid,
      balance: acc.balance + inv.balance,
    }),
    { total: 0, paid: 0, balance: 0 },
  ),
);

const cards = computed(() => [
  { label: "Invoiced", value: totals.value.total },
  { label: "Collected", value: totals.value.paid },
  { label: "Outstanding", value: totals.value.balance },
]);
</script>

<template>
  <AppShell>
    <PageHeader title="Invoices" description="Receivables register with FBR digital invoicing status">
      <template #actions>
        <ZButton variant="outline">
          <Download class="size-4" /> Export
        </ZButton>
        <ZButton>
          <Plus class="size-4" /> New invoice
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-4 sm:grid-cols-3">
      <div v-for="card in cards" :key="card.label" class="panel p-4">
        <p class="label-caps">{{ card.label }}</p>
        <p class="num mt-2 text-2xl font-semibold text-content">
          {{ money(card.value) }}
        </p>
      </div>
    </div>

    <div class="panel overflow-hidden">
      <div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div class="relative min-w-56 flex-1">
          <Search class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-content-muted" />
          <input
            v-model="query"
            placeholder="Search invoice number or client"
            class="field pl-8"
            aria-label="Search invoices"
          />
        </div>
        <select v-model="status" class="field w-40" aria-label="Filter by payment status">
          <option v-for="s in STATUSES" :key="s" :value="s">
            {{ s === "all" ? "All statuses" : labelize(s) }}
          </option>
        </select>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[980px]">
          <thead>
            <tr class="table-head">
              <th class="px-4 py-2.5 text-left">Invoice</th>
              <th class="px-4 py-2.5 text-left">Client</th>
              <th class="px-4 py-2.5 text-left">Issued</th>
              <th class="px-4 py-2.5 text-left">Due</th>
              <th class="px-4 py-2.5 text-right">Total</th>
              <th class="px-4 py-2.5 text-right">Balance</th>
              <th class="px-4 py-2.5 text-left">Payment</th>
              <th class="px-4 py-2.5 text-left">FBR</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in rows" :key="inv.id" class="table-row-zs cursor-pointer">
              <td class="num px-4 font-medium text-content">{{ inv.invoice_number }}</td>
              <td class="px-4 text-content-secondary">{{ inv.client_name }}</td>
              <td class="num px-4 text-content-muted">{{ shortDate(inv.issue_date) }}</td>
              <td class="num px-4 text-content-muted">{{ shortDate(inv.due_date) }}</td>
              <td class="num px-4 text-right text-content">{{ money(inv.total) }}</td>
              <td
                :class="['num px-4 text-right', inv.balance > 0 ? 'text-danger-strong' : 'text-content-muted']"
              >
                {{ money(inv.balance) }}
              </td>
              <td class="px-4">
                <StatusBadge :status="inv.payment_status" />
              </td>
              <td class="px-4">
                <StatusBadge :status="inv.fbr_status" />
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="8" class="p-10 text-center text-sm text-content-muted">
                No invoices match these filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-content-muted">
        <span>
          Showing {{ rows.length }} of {{ invoices.length }} invoices
        </span>
        <div class="flex items-center gap-1">
          <ZButton variant="outline" disabled>
            Previous
          </ZButton>
          <ZButton variant="outline" disabled>
            Next
          </ZButton>
        </div>
      </div>
    </div>
  </AppShell>
</template>
