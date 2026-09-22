<script setup lang="ts">
/** A4 — Accounts Payable: supplier bill register with due-date tracking. */
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
import { payablesRepository, type BillQuery } from "@/services/accounting/payables.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, formatMoneyOrDash, sumBy } from "@/lib/money";
import { shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { BillStatus, PaymentInput, Supplier, SupplierBill } from "@/types/accounting";

setPageMeta("Accounts Payable", "Supplier bill register with due-date tracking and payment capture.");

const company = useCompanyStore();

const search = ref("");
const status = ref<BillStatus | "all">("all");
const supplierId = ref<string | "all">("all");
const from = ref("");
const to = ref("");
const dueSoonOnly = ref(false);

const query = computed<BillQuery>(() => ({
  search: search.value || undefined,
  status: status.value,
  supplier_id: supplierId.value,
  from: from.value || undefined,
  to: to.value || undefined,
  due_within_days: dueSoonOnly.value ? 7 : null,
}));

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => payablesRepository.bills(company.activeCompanyId, query.value),
  {
    watch: [
      () => company.activeCompanyId,
      () => search.value,
      () => status.value,
      () => supplierId.value,
      () => from.value,
      () => to.value,
      () => dueSoonOnly.value,
    ],
  },
);

const bills = computed<SupplierBill[]>(() => data.value ?? []);

const { data: supplierData } = useAsyncData(() => payablesRepository.suppliers(company.activeCompanyId), {
  watch: [() => company.activeCompanyId],
});
const suppliers = computed<Supplier[]>(() => supplierData.value ?? []);

const stats = computed(() => {
  const outstanding = sumBy(bills.value, (b) => b.outstanding);
  const overdue = sumBy(
    bills.value.filter((b) => b.status === "overdue"),
    (b) => b.outstanding,
  );
  const dueSoon = sumBy(
    bills.value.filter((b) => b.outstanding > 0 && b.status !== "draft" && b.days_overdue <= 0),
    (b) => b.outstanding,
  );
  const drafts = bills.value.filter((b) => b.status === "draft").length;
  return { outstanding, overdue, dueSoon, drafts };
});

const columns: Column[] = [
  { key: "bill_number", header: "Bill", class: "num" },
  { key: "supplier_name", header: "Supplier" },
  { key: "bill_date", header: "Bill date", class: "num" },
  { key: "due_date", header: "Due date", class: "num" },
  { key: "reference", header: "Reference" },
  { key: "expense_account_name", header: "Expense/Inventory account" },
  { key: "subtotal", header: "Subtotal", align: "right", class: "num" },
  { key: "tax", header: "Tax", align: "right", class: "num" },
  { key: "total", header: "Total", align: "right", class: "num" },
  { key: "paid_amount", header: "Paid", align: "right", class: "num" },
  { key: "outstanding", header: "Outstanding", align: "right", class: "num" },
  { key: "status", header: "Status" },
  { key: "actions", header: "" },
];

/* ---------------- Record payment ---------------- */

const payDialogOpen = ref(false);
const payingBill = ref<SupplierBill | null>(null);
const paymentMutation = useMutation(payablesRepository.recordPayment);

function openPay(bill: SupplierBill) {
  payingBill.value = bill;
  paymentMutation.reset();
  payDialogOpen.value = true;
}

async function submitPayment(input: PaymentInput) {
  if (!payingBill.value) return;
  const result = await paymentMutation.run(company.activeCompanyId, payingBill.value.id, input);
  if (result) {
    payDialogOpen.value = false;
    await refresh();
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Accounts Payable" description="Supplier bills, due dates and payment capture.">
      <template #actions>
        <RouterLink to="/accounting/payables/suppliers"><ZButton variant="outline">Suppliers</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/aging"><ZButton variant="outline">Aging</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/statements"><ZButton variant="outline">Statements</ZButton></RouterLink>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total payable outstanding" :value="formatMoney(stats.outstanding)" tone="brand" />
      <StatCard label="Overdue" :value="formatMoney(stats.overdue)" tone="danger" />
      <StatCard label="Due in next 7 days" :value="formatMoney(stats.dueSoon)" tone="warning" />
      <StatCard label="Drafts awaiting approval" :value="String(stats.drafts)" tone="neutral" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="search" placeholder="Search bill number, supplier or reference" />
        <select v-model="status" class="field w-36" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <select v-model="supplierId" class="field w-48" aria-label="Filter by supplier">
          <option value="all">All suppliers</option>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <DateRangeFilter v-model:from="from" v-model:to="to" />
        <label class="flex items-center gap-2 text-xs text-content-secondary">
          <input type="checkbox" v-model="dueSoonOnly" class="size-4" />
          Due within 7 days
        </label>
      </Toolbar>

      <AsyncSection
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-title="No bills yet"
        empty-message="Supplier bills will appear here once recorded for this company."
        @retry="refresh"
      >
        <DataTable :columns="columns" :rows="bills" :min-width="1280">
          <template #bill_number="{ row }: { row: SupplierBill }">
            <RouterLink
              v-if="row.journal_id"
              :to="`/accounting/journals/${row.journal_id}`"
              class="text-content-brand hover:underline"
            >
              {{ row.bill_number }}
            </RouterLink>
            <span v-else>{{ row.bill_number }}</span>
          </template>
          <template #supplier_name="{ row }: { row: SupplierBill }">{{ row.supplier_name }}</template>
          <template #bill_date="{ row }: { row: SupplierBill }">{{ shortDate(row.bill_date) }}</template>
          <template #due_date="{ row }: { row: SupplierBill }">
            <span>{{ shortDate(row.due_date) }}</span>
            <span v-if="row.days_overdue > 0" class="block text-2xs text-danger">
              {{ row.days_overdue }} day{{ row.days_overdue === 1 ? "" : "s" }} overdue
            </span>
          </template>
          <template #reference="{ row }: { row: SupplierBill }">{{ row.reference || "—" }}</template>
          <template #expense_account_name="{ row }: { row: SupplierBill }">{{ row.expense_account_name }}</template>
          <template #subtotal="{ row }: { row: SupplierBill }">{{ formatMoney(row.subtotal) }}</template>
          <template #tax="{ row }: { row: SupplierBill }">{{ formatMoneyOrDash(row.tax) }}</template>
          <template #total="{ row }: { row: SupplierBill }">{{ formatMoney(row.total) }}</template>
          <template #paid_amount="{ row }: { row: SupplierBill }">{{ formatMoneyOrDash(row.paid_amount) }}</template>
          <template #outstanding="{ row }: { row: SupplierBill }">
            <span :class="row.outstanding > 0 ? 'text-danger' : ''">{{ formatMoneyOrDash(row.outstanding) }}</span>
          </template>
          <template #status="{ row }: { row: SupplierBill }"><StatusBadge :status="row.status" /></template>
          <template #actions="{ row }: { row: SupplierBill }">
            <span v-if="row.status === 'paid'" class="text-2xs text-content-muted">Settled</span>
            <span v-else-if="row.status === 'draft'" class="text-2xs text-content-muted" title="Approve the draft bill before recording a payment against it.">
              Approve to pay
            </span>
            <ZButton v-else variant="ghost" @click="openPay(row)">Record payment</ZButton>
          </template>
          <template #footer>
            <span>{{ bills.length }} bills</span>
            <span class="text-2xs text-content-muted">
              Posting: Dr Expense/Inventory · Cr Accounts Payable — payment: Dr Accounts Payable · Cr Bank
            </span>
          </template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <PaymentDialog
      v-if="payingBill"
      :open="payDialogOpen"
      mode="payment"
      :document-number="payingBill.bill_number"
      :party-name="payingBill.supplier_name"
      :total="payingBill.total"
      :paid="payingBill.paid_amount"
      :outstanding="payingBill.outstanding"
      :saving="paymentMutation.saving.value"
      :server-error="paymentMutation.error.value?.message ?? null"
      :field-errors="paymentMutation.fieldErrors.value"
      @close="payDialogOpen = false"
      @submit="submitPayment"
    />
    <ValidationMessage v-if="paymentMutation.error.value && !payDialogOpen" :message="paymentMutation.error.value.message" />
  </AppShell>
</template>
