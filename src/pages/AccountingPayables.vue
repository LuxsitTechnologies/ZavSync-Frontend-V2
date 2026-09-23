<script setup lang="ts">
/** A4 — Accounts Payable: supplier bill register with due-date tracking. */
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { Plus } from "lucide-vue-next";

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
import SidePanel from "@/components/zs/SidePanel.vue";
import Field from "@/components/zs/Field.vue";
import MoneyInput from "@/components/accounting/MoneyInput.vue";
import AccountSelect from "@/components/accounting/AccountSelect.vue";

import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { payablesRepository, type BillQuery } from "@/services/accounting/payables.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, formatMoneyOrDash, sumBy } from "@/lib/money";
import { shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { BillStatus, Money, PaymentInput, Supplier, SupplierBill } from "@/types/accounting";

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
const paymentIdempotencyKey = ref("");
const postMutation = useMutation(payablesRepository.postBill);
const createMutation = useMutation(payablesRepository.createBill);
const billFormOpen = ref(false);
const billSupplierId = ref("");
const supplierReference = ref("");
const billDate = ref("");
const dueDate = ref("");
const billDescription = ref("");
const quantity = ref("1");
const unitPrice = ref<Money>(0);
const taxRate = ref("0");
const withholdingRate = ref("0");
const expenseAccountId = ref<string | null>(null);

function openPay(bill: SupplierBill) {
  payingBill.value = bill;
  paymentIdempotencyKey.value = `supplier-payment:${bill.id}:${crypto.randomUUID()}`;
  paymentMutation.reset();
  payDialogOpen.value = true;
}

async function submitPayment(input: PaymentInput) {
  if (!payingBill.value) return;
  const result = await paymentMutation.run(company.activeCompanyId, payingBill.value.id, input, paymentIdempotencyKey.value);
  if (result) {
    payDialogOpen.value = false;
    await refresh();
  }
}

function openCreateBill() {
  const today = new Date();
  const due = new Date();
  due.setDate(due.getDate() + 30);
  billSupplierId.value = suppliers.value[0]?.id ?? "";
  supplierReference.value = "";
  billDate.value = today.toISOString().slice(0, 10);
  dueDate.value = due.toISOString().slice(0, 10);
  billDescription.value = "";
  quantity.value = "1";
  unitPrice.value = 0;
  taxRate.value = "0";
  withholdingRate.value = "0";
  expenseAccountId.value = suppliers.value[0]?.default_expense_account_id ?? null;
  createMutation.reset();
  billFormOpen.value = true;
}

async function createBill() {
  if (!expenseAccountId.value) return;
  const result = await createMutation.run(company.activeCompanyId, {
    supplier_id: billSupplierId.value,
    supplier_invoice_number: supplierReference.value,
    bill_date: billDate.value,
    posting_date: billDate.value,
    due_date: dueDate.value,
    currency: "PKR",
    lines: [{
      description: billDescription.value,
      procurement_type: "service",
      quantity_milli: Math.round(Number(quantity.value) * 1000),
      unit: "unit",
      unit_price: unitPrice.value,
      discount: 0,
      tax_rate_bps: Math.round(Number(taxRate.value) * 100),
      withholding_rate_bps: Math.round(Number(withholdingRate.value) * 100),
      expense_account_id: expenseAccountId.value,
    }],
  });
  if (result) {
    billFormOpen.value = false;
    await refresh();
  }
}

async function postBill(bill: SupplierBill) {
  const result = await postMutation.run(company.activeCompanyId, bill.id);
  if (result) await refresh();
}
</script>

<template>
  <AppShell>
    <PageHeader title="Accounts Payable" description="Supplier bills, due dates and payment capture.">
      <template #actions>
        <RouterLink to="/accounting/payables/suppliers"><ZButton variant="outline">Suppliers</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/aging"><ZButton variant="outline">Aging</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/statements"><ZButton variant="outline">Statements</ZButton></RouterLink>
        <ZButton @click="openCreateBill"><Plus class="size-4" /> New bill</ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total payable outstanding" :value="formatMoney(stats.outstanding)" tone="brand" />
      <StatCard label="Overdue" :value="formatMoney(stats.overdue)" tone="danger" />
      <StatCard label="Due in next 7 days" :value="formatMoney(stats.dueSoon)" tone="warning" />
      <StatCard label="Drafts awaiting approval" :value="String(stats.drafts)" tone="neutral" />
    </div>

    <Panel>
      <div class="px-4 pt-3"><ValidationMessage :message="postMutation.error.value?.message ?? null" /></div>
      <Toolbar>
        <SearchInput v-model="search" placeholder="Search bill number, supplier or reference" />
        <select v-model="status" class="field w-36" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="void">Void</option>
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
            <span v-else-if="row.status === 'void'" class="text-2xs text-content-muted">Voided</span>
            <ZButton v-else-if="row.status === 'draft'" variant="ghost" :disabled="postMutation.saving.value" @click="postBill(row)">Post bill</ZButton>
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

    <SidePanel :open="billFormOpen" title="New supplier bill" description="The bill remains outside the ledger until posted." width="lg" @close="billFormOpen = false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="createBill">
        <ValidationMessage class="sm:col-span-2" :message="createMutation.error.value?.message ?? postMutation.error.value?.message ?? null" />
        <label class="block"><span class="label-caps">Supplier</span><select v-model="billSupplierId" class="field mt-1.5" required><option value="" disabled>Select supplier</option><option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option></select></label>
        <Field v-model="supplierReference" label="Supplier invoice / reference" required />
        <label class="block"><span class="label-caps">Bill date</span><input v-model="billDate" type="date" class="field mt-1.5" required /></label>
        <label class="block"><span class="label-caps">Due date</span><input v-model="dueDate" type="date" class="field mt-1.5" required /></label>
        <Field v-model="billDescription" label="Description" required />
        <Field v-model="quantity" label="Quantity" type="number" required />
        <MoneyInput v-model="unitPrice" label="Unit price" />
        <Field v-model="taxRate" label="Purchase tax rate (%)" type="number" />
        <Field v-model="withholdingRate" label="Withholding rate (%)" type="number" />
        <AccountSelect v-model="expenseAccountId" label="Expense / asset account" :types="['expense', 'asset']" :error="createMutation.fieldErrors.value['lines.0.expense_account_id'] ?? null" />
      </form>
      <template #footer><ZButton variant="outline" @click="billFormOpen = false">Cancel</ZButton><ZButton :disabled="createMutation.saving.value" @click="createBill">{{ createMutation.saving.value ? "Saving…" : "Save draft" }}</ZButton></template>
    </SidePanel>

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
