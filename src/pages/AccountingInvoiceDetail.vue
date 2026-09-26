<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Landmark, Printer, Send, Trash2, Undo2 } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { invoicesRepository } from "@/services/accounting/invoices.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, formatQuantity } from "@/lib/money";
import { localDateInput, shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";

setPageMeta("Invoice Review", "Authoritative invoice, FBR, payment and accounting status.");

const route = useRoute();
const router = useRouter();
const company = useCompanyStore();
const invoiceId = computed(() => String(route.params["id"] ?? ""));
const state = useAsyncData(() => invoicesRepository.get(company.activeCompanyId, invoiceId.value), { watch: [() => company.activeCompanyId, () => invoiceId.value] });
const invoice = computed(() => state.data.value);
const postMutation = useMutation(() => invoicesRepository.post(company.activeCompanyId, invoiceId.value));
const fbrMutation = useMutation(() => invoicesRepository.submitFbr(company.activeCompanyId, invoiceId.value));
const deleteMutation = useMutation(() => invoicesRepository.remove(company.activeCompanyId, invoiceId.value));
const voidMutation = useMutation((reason: string) => invoicesRepository.void(company.activeCompanyId, invoiceId.value, localDateInput(), reason));
const actionError = computed(() => postMutation.error.value ?? fbrMutation.error.value ?? deleteMutation.error.value ?? voidMutation.error.value);

async function postInvoice() {
  if (await postMutation.run()) await state.refresh();
}

async function submitFbr() {
  if (await fbrMutation.run()) await state.refresh();
}

async function deleteDraft() {
  if (!window.confirm("Delete this draft invoice?")) return;
  if ((await deleteMutation.run()) === undefined && !deleteMutation.error.value) await router.push("/accounting/invoices");
}

async function voidInvoice() {
  const reason = window.prompt("Reason for voiding and reversing this invoice:");
  if (!reason?.trim()) return;
  if (await voidMutation.run(reason.trim())) await state.refresh();
}

function printInvoice() {
  window.print();
}
</script>

<template>
  <AppShell>
    <PageHeader :title="invoice?.invoice_number ?? 'Invoice'" description="Invoice review, print, FBR and accounting finalization">
      <template #actions>
        <ZButton variant="outline" :disabled="!invoice" @click="printInvoice"><Printer class="size-4" /> Print / Save PDF</ZButton>
        <ZButton v-if="invoice?.accounting_status === 'draft'" variant="outline" :disabled="fbrMutation.saving.value" @click="submitFbr"><Landmark class="size-4" /> {{ fbrMutation.saving.value ? "Submitting…" : "Save to FBR" }}</ZButton>
        <ZButton v-if="invoice?.accounting_status === 'draft'" :disabled="postMutation.saving.value" @click="postInvoice"><Send class="size-4" /> {{ postMutation.saving.value ? "Posting…" : "Finalize & post" }}</ZButton>
        <ZButton v-if="invoice?.accounting_status === 'draft'" variant="ghost" :disabled="deleteMutation.saving.value" @click="deleteDraft"><Trash2 class="size-4" /> Delete draft</ZButton>
        <ZButton v-if="invoice && ['unpaid', 'partial'].includes(invoice.accounting_status)" variant="outline" :disabled="voidMutation.saving.value" @click="voidInvoice"><Undo2 class="size-4" /> Void / reverse</ZButton>
      </template>
    </PageHeader>

    <ValidationMessage :message="actionError?.message ?? null" />
    <Panel>
      <AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="!state.loading.value && !invoice" @retry="state.refresh">
        <div v-if="invoice" class="space-y-6 p-5">
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div><p class="label-caps">From</p><p class="mt-1 text-lg font-semibold text-content">{{ invoice.company?.name }}</p><p class="mt-1 text-xs text-content-muted">{{ invoice.company?.currency }}</p></div>
            <div class="text-right"><div class="flex justify-end gap-2"><StatusBadge :status="invoice.payment_status" /><StatusBadge :status="invoice.fbr_status" /></div><p class="num mt-3 text-sm text-content-secondary">Issued {{ shortDate(invoice.invoice_date) }}</p><p class="num text-sm text-content-secondary">Due {{ shortDate(invoice.due_date) }}</p></div>
          </div>
          <div><p class="label-caps">Bill to</p><p class="mt-1 font-semibold text-content">{{ invoice.customer?.legal_name || invoice.customer_name }}</p><p class="mt-1 text-xs text-content-secondary">{{ invoice.customer?.billing_address }}</p><p class="text-xs text-content-muted">NTN/CNIC: {{ invoice.customer?.tax_number || "—" }}</p></div>
          <div class="overflow-x-auto"><table class="w-full min-w-[760px]"><thead><tr class="table-head"><th class="px-3 py-2 text-left">Description</th><th class="px-3 py-2 text-right">Quantity</th><th class="px-3 py-2 text-right">Unit price</th><th class="px-3 py-2 text-right">Discount</th><th class="px-3 py-2 text-right">Tax</th><th class="px-3 py-2 text-right">Total</th></tr></thead><tbody><tr v-for="line in invoice.lines ?? []" :key="line.id" class="table-row-zs"><td class="px-3"><p class="font-medium text-content">{{ line.description }}</p><p class="text-2xs text-content-muted">{{ line.sales_type }} · {{ line.unit }}</p></td><td class="num px-3 text-right">{{ formatQuantity(line.quantity_milli / 1000) }}</td><td class="num px-3 text-right">{{ formatMoney(line.unit_price) }}</td><td class="num px-3 text-right">{{ formatMoney(line.discount) }}</td><td class="num px-3 text-right">{{ formatMoney(line.tax_amount) }}</td><td class="num px-3 text-right font-medium text-content">{{ formatMoney(line.total) }}</td></tr></tbody></table></div>
          <div class="ml-auto grid max-w-md grid-cols-2 gap-x-6 gap-y-2 text-sm"><span class="text-content-secondary">Subtotal</span><span class="num text-right">{{ formatMoney(invoice.subtotal) }}</span><span class="text-content-secondary">Discount</span><span class="num text-right">{{ formatMoney(invoice.discount) }}</span><span class="text-content-secondary">Sales tax</span><span class="num text-right">{{ formatMoney(invoice.sales_tax) }}</span><span class="font-semibold text-content">Invoice total</span><span class="num text-right font-semibold text-content">{{ formatMoney(invoice.total) }}</span><span class="text-content-secondary">Paid</span><span class="num text-right">{{ formatMoney(invoice.amount_paid) }}</span><span class="font-semibold text-content-brand">Balance due</span><span class="num text-right font-semibold text-content-brand">{{ formatMoney(invoice.balance_due) }}</span></div>
          <div class="grid gap-4 sm:grid-cols-2"><div><p class="label-caps">Notes</p><p class="mt-1 whitespace-pre-wrap text-xs text-content-secondary">{{ invoice.notes || "—" }}</p></div><div><p class="label-caps">Terms</p><p class="mt-1 whitespace-pre-wrap text-xs text-content-secondary">{{ invoice.terms || "—" }}</p></div></div>
          <div class="rounded-md bg-surface-sunken p-3 text-xs text-content-secondary"><p><span class="font-medium text-content">FBR reference:</span> {{ invoice.fbr_reference_number || "Not issued" }}</p><p class="mt-1"><span class="font-medium text-content">Journal:</span> {{ invoice.journal_id || "Draft — no accounting effect" }}</p></div>
        </div>
      </AsyncSection>
    </Panel>
  </AppShell>
</template>
