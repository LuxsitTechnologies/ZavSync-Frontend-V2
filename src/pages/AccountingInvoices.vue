<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Download, Plus, Search, Trash2 } from "lucide-vue-next";
import { useRouter } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import MoneyInput from "@/components/accounting/MoneyInput.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { invoicesRepository } from "@/services/accounting/invoices.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney } from "@/lib/money";
import { labelize, shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { InvoiceDetail, InvoiceInput, InvoiceLineInput, Money, ReceivableStatus } from "@/types/accounting";

setPageMeta("Invoices", "Track invoices, receivables and FBR submission status across clients in one register.");

interface EditableLine {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: Money;
  discount: Money;
  taxRate: string;
  salesType: string;
}

const STATUSES: (ReceivableStatus | "all")[] = ["all", "paid", "partial", "unpaid", "overdue", "draft", "void"];
const company = useCompanyStore();
const router = useRouter();
const query = ref("");
const status = ref<ReceivableStatus | "all">("all");
const invoiceQuery = computed(() => ({ search: query.value || undefined, status: status.value }));
const list = useAsyncData(() => invoicesRepository.list(company.activeCompanyId, invoiceQuery.value), {
  watch: [() => company.activeCompanyId, () => query.value, () => status.value],
});
const customersState = useAsyncData(() => invoicesRepository.customers(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const rows = computed<InvoiceDetail[]>(() => list.data.value ?? []);
const customers = computed(() => customersState.data.value ?? []);
const totals = computed(() => rows.value.reduce((sum, invoice) => ({ total: sum.total + invoice.total, paid: sum.paid + invoice.amount_paid, balance: sum.balance + invoice.balance }), { total: 0, paid: 0, balance: 0 }));
const cards = computed(() => [{ label: "Invoiced", value: totals.value.total }, { label: "Collected", value: totals.value.paid }, { label: "Outstanding", value: totals.value.balance }]);

const panelOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ customerId: "", invoiceDate: new Date().toISOString().slice(0, 10), dueDate: "", currency: "PKR", notes: "", terms: "", lines: [] as EditableLine[] });
const saveMutation = useMutation(async (submitToFbr: boolean) => {
  const input = formInput();
  const invoice = editingId.value
    ? await invoicesRepository.update(company.activeCompanyId, editingId.value, input)
    : await invoicesRepository.create(company.activeCompanyId, input);
  return submitToFbr ? invoicesRepository.submitFbr(company.activeCompanyId, invoice.id) : invoice;
});

function newLine(): EditableLine {
  return { description: "", quantity: "1.000", unit: "unit", unitPrice: 0, discount: 0, taxRate: "18.00", salesType: "Standardized Goods" };
}

function resetForm() {
  editingId.value = null;
  form.customerId = "";
  form.invoiceDate = new Date().toISOString().slice(0, 10);
  form.dueDate = form.invoiceDate;
  form.currency = "PKR";
  form.notes = "";
  form.terms = "";
  form.lines = [newLine()];
  saveMutation.reset();
}

function openNew() {
  resetForm();
  panelOpen.value = true;
}

async function openEdit(invoice: InvoiceDetail) {
  const detail = await invoicesRepository.get(company.activeCompanyId, invoice.id);
  editingId.value = detail.id;
  form.customerId = detail.customer_id;
  form.invoiceDate = detail.invoice_date;
  form.dueDate = detail.due_date;
  form.currency = detail.currency;
  form.notes = detail.notes ?? "";
  form.terms = detail.terms ?? "";
  form.lines = (detail.lines ?? []).map((line) => ({ description: line.description, quantity: scaledToDecimal(line.quantity_milli, 3), unit: line.unit, unitPrice: line.unit_price, discount: line.discount, taxRate: scaledToDecimal(line.tax_rate_bps, 2), salesType: line.sales_type }));
  panelOpen.value = true;
}

function decimalToScaled(raw: string, decimals: number): number | null {
  const match = raw.trim().match(new RegExp(`^(\\d+)(?:\\.(\\d{0,${decimals}}))?$`));
  if (!match) return null;
  const factor = 10 ** decimals;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(decimals, "0"));
  const result = whole * factor + fraction;
  return Number.isSafeInteger(result) ? result : null;
}

function scaledToDecimal(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  return `${Math.floor(value / factor)}.${String(value % factor).padStart(decimals, "0")}`;
}

function formInput(): InvoiceInput {
  const lines: InvoiceLineInput[] = form.lines.map((line, index) => {
    const quantity = decimalToScaled(line.quantity, 3);
    const taxRate = decimalToScaled(line.taxRate, 2);
    if (quantity === null || quantity <= 0) throw new Error(`Line ${index + 1} has an invalid quantity.`);
    if (taxRate === null || taxRate > 10000) throw new Error(`Line ${index + 1} has an invalid tax rate.`);
    return { description: line.description, quantity_milli: quantity, unit: line.unit, unit_price: line.unitPrice, discount: line.discount, tax_rate_bps: taxRate, other_tax_rate_bps: 0, advance_tax_rate_bps: 0, withholding_tax_rate_bps: 0, sales_type: line.salesType };
  });
  return { customer_id: form.customerId, invoice_date: form.invoiceDate, due_date: form.dueDate, currency: form.currency, notes: form.notes || null, terms: form.terms || null, lines };
}

function lineTotal(line: EditableLine): Money {
  const quantity = decimalToScaled(line.quantity, 3) ?? 0;
  const taxRate = decimalToScaled(line.taxRate, 2) ?? 0;
  const product = line.unitPrice * quantity;
  if (!Number.isSafeInteger(product)) return 0;
  const subtotal = Math.floor((product + 500) / 1000);
  const taxable = Math.max(0, subtotal - line.discount);
  const taxProduct = taxable * taxRate;
  if (!Number.isSafeInteger(taxProduct)) return 0;
  return taxable + Math.floor((taxProduct + 5000) / 10000);
}

const previewTotal = computed(() => form.lines.reduce((sum, line) => sum + lineTotal(line), 0));

async function save(submitToFbr = false) {
  const result = await saveMutation.run(submitToFbr);
  if (!result) return;
  panelOpen.value = false;
  await list.refresh();
  if (submitToFbr) await router.push(`/accounting/invoices/${result.id}`);
}

function printRegister() {
  window.print();
}
</script>

<template>
  <AppShell>
    <PageHeader title="Invoices" description="Receivables register with FBR digital invoicing status">
      <template #actions>
        <ZButton variant="outline" @click="printRegister"><Download class="size-4" /> Print register</ZButton>
        <ZButton @click="openNew"><Plus class="size-4" /> New invoice</ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-4 sm:grid-cols-3">
      <div v-for="card in cards" :key="card.label" class="panel p-4"><p class="label-caps">{{ card.label }}</p><p class="num mt-2 text-2xl font-semibold text-content">{{ formatMoney(card.value) }}</p></div>
    </div>

    <div class="panel overflow-hidden">
      <div class="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div class="relative min-w-56 flex-1"><Search class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-content-muted" /><input v-model="query" placeholder="Search invoice number or client" class="field pl-8" aria-label="Search invoices" /></div>
        <select v-model="status" class="field w-40" aria-label="Filter by payment status"><option v-for="state in STATUSES" :key="state" :value="state">{{ state === "all" ? "All statuses" : labelize(state) }}</option></select>
      </div>
      <AsyncSection :loading="list.loading.value" :error="list.error.value" :empty="list.isEmpty.value" empty-title="No invoices found" empty-message="Create a draft invoice to begin the revenue workflow." @retry="list.refresh">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1050px]">
            <thead><tr class="table-head"><th class="px-4 py-2.5 text-left">Invoice</th><th class="px-4 py-2.5 text-left">Client</th><th class="px-4 py-2.5 text-left">Issued</th><th class="px-4 py-2.5 text-left">Due</th><th class="px-4 py-2.5 text-right">Total</th><th class="px-4 py-2.5 text-right">Balance</th><th class="px-4 py-2.5 text-left">Payment</th><th class="px-4 py-2.5 text-left">FBR</th><th class="px-4 py-2.5"></th></tr></thead>
            <tbody>
              <tr v-for="invoice in rows" :key="invoice.id" class="table-row-zs cursor-pointer" @click="router.push(`/accounting/invoices/${invoice.id}`)">
                <td class="num px-4 font-medium text-content">{{ invoice.invoice_number }}</td><td class="px-4 text-content-secondary">{{ invoice.customer_name }}</td><td class="num px-4 text-content-muted">{{ shortDate(invoice.invoice_date) }}</td><td class="num px-4 text-content-muted">{{ shortDate(invoice.due_date) }}</td><td class="num px-4 text-right text-content">{{ formatMoney(invoice.total) }}</td><td class="num px-4 text-right" :class="invoice.balance > 0 ? 'text-danger-strong' : 'text-content-muted'">{{ formatMoney(invoice.balance) }}</td><td class="px-4"><StatusBadge :status="invoice.payment_status" /></td><td class="px-4"><StatusBadge :status="invoice.fbr_status" /></td>
                <td class="px-4 text-right"><ZButton v-if="invoice.accounting_status === 'draft'" variant="ghost" @click.stop="openEdit(invoice)">Edit</ZButton><ZButton v-else variant="ghost" @click.stop="router.push(`/accounting/invoices/${invoice.id}`)">Review</ZButton></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-content-muted"><span>{{ rows.length }} invoices</span></div>
      </AsyncSection>
    </div>

    <SidePanel :open="panelOpen" :title="editingId ? 'Edit draft invoice' : 'New invoice'" description="Drafts do not affect the general ledger or accounts receivable." width="lg" @close="panelOpen = false">
      <div class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block sm:col-span-2"><span class="label-caps">Customer</span><select v-model="form.customerId" class="field mt-1.5"><option value="">Select customer…</option><option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.name }}</option></select><ValidationMessage :message="saveMutation.fieldErrors.value['customer_id'] ?? null" /></label>
          <label><span class="label-caps">Invoice date</span><input v-model="form.invoiceDate" type="date" class="field mt-1.5" /></label><label><span class="label-caps">Due date</span><input v-model="form.dueDate" type="date" class="field mt-1.5" /></label>
        </div>
        <div class="space-y-3">
          <div v-for="(line, index) in form.lines" :key="index" class="panel space-y-3 p-3">
            <div class="flex items-center justify-between"><p class="text-xs font-semibold text-content">Line {{ index + 1 }}</p><ZButton v-if="form.lines.length > 1" variant="ghost" @click="form.lines.splice(index, 1)"><Trash2 class="size-3.5" /> Remove</ZButton></div>
            <label class="block"><span class="label-caps">Description</span><input v-model="line.description" class="field mt-1.5" /></label>
            <div class="grid gap-3 sm:grid-cols-3"><label><span class="label-caps">Quantity</span><input v-model="line.quantity" inputmode="decimal" class="field num mt-1.5" /></label><label><span class="label-caps">Unit</span><input v-model="line.unit" class="field mt-1.5" /></label><label><span class="label-caps">Sales type</span><input v-model="line.salesType" class="field mt-1.5" /></label></div>
            <div class="grid gap-3 sm:grid-cols-3"><MoneyInput v-model="line.unitPrice" label="Unit price" /><MoneyInput v-model="line.discount" label="Discount" /><label><span class="label-caps">Sales tax %</span><input v-model="line.taxRate" inputmode="decimal" class="field num mt-1.5 text-right" /></label></div>
            <p class="text-right text-xs text-content-secondary">Preview line total: <span class="num font-semibold text-content">{{ formatMoney(lineTotal(line)) }}</span></p>
          </div>
          <ZButton variant="outline" @click="form.lines.push(newLine())"><Plus class="size-4" /> Add line</ZButton>
        </div>
        <div class="grid gap-3 sm:grid-cols-2"><label><span class="label-caps">Notes</span><textarea v-model="form.notes" class="field mt-1.5 min-h-20" /></label><label><span class="label-caps">Terms</span><textarea v-model="form.terms" class="field mt-1.5 min-h-20" /></label></div>
        <div class="rounded-md bg-surface-sunken p-3 text-right"><p class="label-caps">Frontend preview</p><p class="num mt-1 text-lg font-semibold text-content">{{ formatMoney(previewTotal) }}</p><p class="text-2xs text-content-muted">The backend recalculates every amount before saving.</p></div>
        <ValidationMessage :message="saveMutation.error.value?.message ?? null" />
      </div>
      <template #footer><ZButton variant="outline" :disabled="saveMutation.saving.value" @click="save(false)">{{ saveMutation.saving.value ? "Saving…" : "Save draft" }}</ZButton><ZButton :disabled="saveMutation.saving.value" @click="save(true)">Save to FBR</ZButton></template>
    </SidePanel>
  </AppShell>
</template>
