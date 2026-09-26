<script setup lang="ts">
/**
 * A3 — Accounts Receivable: customer ledger / invoice register with
 * receipt capture. Balances and postings are owned by the backend; this
 * screen only requests, displays and re-reads them.
 */
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ZButton from "@/components/zs/ZButton.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import DateRangeFilter from "@/components/accounting/DateRangeFilter.vue";
import PaymentDialog from "@/components/accounting/PaymentDialog.vue";

import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { receivablesRepository, type ReceivableQuery } from "@/services/accounting/receivables.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, sumBy } from "@/lib/money";
import { localDateInput, shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { PaymentInput, ReceivableInvoice, ReceivableStatus } from "@/types/accounting";

setPageMeta("Accounts Receivable", "Customer invoice register with outstanding balances, aging and receipts.");

const company = useCompanyStore();

const search = ref("");
const status = ref<ReceivableStatus | "all">("all");
const customerId = ref<string | "all">("all");
const from = ref("");
const to = ref("");
const overdueOnly = ref(false);

const query = computed<ReceivableQuery>(() => ({
  search: search.value || undefined,
  status: status.value,
  customer_id: customerId.value,
  from: from.value || undefined,
  to: to.value || undefined,
  overdue_only: overdueOnly.value,
}));

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => receivablesRepository.invoices(company.activeCompanyId, query.value),
  {
    watch: [
      () => company.activeCompanyId,
      () => search.value,
      () => status.value,
      () => customerId.value,
      () => from.value,
      () => to.value,
      () => overdueOnly.value,
    ],
  },
);

const invoices = computed<ReceivableInvoice[]>(() => data.value ?? []);

const { data: customersData } = useAsyncData(() => receivablesRepository.customers(company.activeCompanyId), {
  watch: [() => company.activeCompanyId],
});
const customers = computed(() => customersData.value ?? []);

/* -------------------- Summary cards (display aggregation only) -------------------- */

const THIS_MONTH_PREFIX = localDateInput().slice(0, 7);

const stats = computed(() => {
  const rows = invoices.value;
  const totalOutstanding = sumBy(rows, (r) => r.outstanding);
  const overdueOutstanding = sumBy(
    rows.filter((r) => r.status === "overdue"),
    (r) => r.outstanding,
  );
  const dueThisMonth = rows.filter((r) => r.due_date.startsWith(THIS_MONTH_PREFIX) && r.outstanding > 0).length;
  const paidThisPeriod = sumBy(
    rows.filter((r) => r.status === "paid" || r.paid_amount > 0),
    (r) => r.paid_amount,
  );
  return { totalOutstanding, overdueOutstanding, dueThisMonth, paidThisPeriod };
});

const columns: Column[] = [
  { key: "invoice_number", header: "Invoice", class: "num" },
  { key: "customer_name", header: "Customer" },
  { key: "invoice_date", header: "Invoice date", class: "num" },
  { key: "due_date", header: "Due date", class: "num" },
  { key: "total", header: "Original", align: "right", class: "num" },
  { key: "paid_amount", header: "Paid", align: "right", class: "num" },
  { key: "outstanding", header: "Outstanding", align: "right", class: "num" },
  { key: "status", header: "Status" },
  { key: "journal", header: "Journal" },
  { key: "actions", header: "" },
];

/* -------------------- Record payment -------------------- */

const payTarget = ref<ReceivableInvoice | null>(null);
const paymentMutation = useMutation(receivablesRepository.recordPayment);

function openPayment(invoice: ReceivableInvoice) {
  payTarget.value = invoice;
  paymentMutation.reset();
}

async function submitPayment(input: PaymentInput) {
  if (!payTarget.value) return;
  const result = await paymentMutation.run(company.activeCompanyId, payTarget.value.id, input);
  if (result) {
    payTarget.value = null;
    await refresh();
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Accounts Receivable" description="Invoice register, outstanding balances and customer receipts.">
      <template #actions>
        <RouterLink to="/accounting/receivables/aging">
          <ZButton as="span" variant="outline">Aging report</ZButton>
        </RouterLink>
        <RouterLink to="/accounting/receivables/statements">
          <ZButton as="span" variant="outline">Customer statements</ZButton>
        </RouterLink>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total outstanding" :value="formatMoney(stats.totalOutstanding)" tone="brand" />
      <StatCard label="Overdue outstanding" :value="formatMoney(stats.overdueOutstanding)" tone="danger" />
      <StatCard label="Due this month" :value="String(stats.dueThisMonth)" tone="warning" />
      <StatCard label="Paid this period" :value="formatMoney(stats.paidThisPeriod)" tone="success" />
    </div>

    <Panel
      title="Invoice posting & receipts"
      description="Invoice posting is Dr Accounts Receivable / Cr Revenue (+ tax). Receipts are Dr Bank / Cr Accounts Receivable — both produced by the central posting engine."
    >
      <div class="p-4">
        <Toolbar>
          <SearchInput v-model="search" placeholder="Search invoice number or customer" />
          <select v-model="status" class="field w-36" aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <select v-model="customerId" class="field w-48" aria-label="Filter by customer">
            <option value="all">All customers</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <DateRangeFilter v-model:from="from" v-model:to="to" />
          <ZButton
            :variant="overdueOnly ? 'primary' : 'outline'"
            @click="overdueOnly = !overdueOnly"
          >
            Overdue only
          </ZButton>
        </Toolbar>

        <AsyncSection
          :loading="loading"
          :error="error"
          :empty="isEmpty"
          empty-title="No invoices found"
          empty-message="Invoices will appear here once raised for this company."
          @retry="refresh"
        >
          <DataTable :columns="columns" :rows="invoices" :min-width="1320">
            <template #invoice_number="{ row }: { row: ReceivableInvoice }">{{ row.invoice_number }}</template>
            <template #customer_name="{ row }: { row: ReceivableInvoice }">{{ row.customer_name }}</template>
            <template #invoice_date="{ row }: { row: ReceivableInvoice }">{{ shortDate(row.invoice_date) }}</template>
            <template #due_date="{ row }: { row: ReceivableInvoice }">
              <div>
                {{ shortDate(row.due_date) }}
                <div v-if="row.days_overdue > 0" class="text-2xs text-danger">
                  {{ row.days_overdue }} day{{ row.days_overdue === 1 ? "" : "s" }} overdue
                </div>
              </div>
            </template>
            <template #total="{ row }: { row: ReceivableInvoice }">{{ formatMoney(row.total) }}</template>
            <template #paid_amount="{ row }: { row: ReceivableInvoice }">{{ formatMoney(row.paid_amount) }}</template>
            <template #outstanding="{ row }: { row: ReceivableInvoice }">
              <span :class="row.outstanding > 0 ? 'font-semibold text-content' : 'text-content-muted'">
                {{ formatMoney(row.outstanding) }}
              </span>
            </template>
            <template #status="{ row }: { row: ReceivableInvoice }"><StatusBadge :status="row.status" /></template>
            <template #journal="{ row }: { row: ReceivableInvoice }">
              <RouterLink
                v-if="row.journal_id"
                :to="`/accounting/journals/${row.journal_id}`"
                class="text-xs font-medium text-content-brand hover:underline"
              >
                View journal
              </RouterLink>
              <span v-else class="text-content-muted">—</span>
            </template>
            <template #actions="{ row }: { row: ReceivableInvoice }">
              <ZButton v-if="row.status !== 'paid'" variant="ghost" @click="openPayment(row)">
                Record payment
              </ZButton>
            </template>
            <template #footer><span>{{ invoices.length }} invoices</span></template>
          </DataTable>
        </AsyncSection>
      </div>
    </Panel>

    <PaymentDialog
      v-if="payTarget"
      :open="Boolean(payTarget)"
      mode="receipt"
      :document-number="payTarget.invoice_number"
      :party-name="payTarget.customer_name"
      :total="payTarget.total"
      :paid="payTarget.paid_amount"
      :outstanding="payTarget.outstanding"
      :saving="paymentMutation.saving.value"
      :server-error="paymentMutation.error.value?.message ?? null"
      :field-errors="paymentMutation.fieldErrors.value"
      @close="payTarget = null"
      @submit="submitPayment"
    />
  </AppShell>
</template>
