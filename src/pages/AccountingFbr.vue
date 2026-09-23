<script setup lang="ts">
import { computed, ref } from "vue";
import { Landmark, RefreshCw } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { invoicesRepository } from "@/services/accounting/invoices.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney } from "@/lib/money";
import { shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { InvoiceDetail } from "@/types/accounting";

setPageMeta("FBR Invoices", "Digital invoicing status against FBR IRIS — submitted, queued and rejected documents.");

const company = useCompanyStore();
const query = ref("");
const status = ref("all");
const state = useAsyncData(() => invoicesRepository.fbrList(company.activeCompanyId, { search: query.value || undefined, status: status.value }), { watch: [() => company.activeCompanyId, () => query.value, () => status.value] });
const rows = computed<InvoiceDetail[]>(() => state.data.value ?? []);
const accepted = computed(() => rows.value.filter((invoice) => ["accepted", "submitted"].includes(invoice.fbr_status)).length);
const pending = computed(() => rows.value.filter((invoice) => ["not_submitted", "pending", "failed"].includes(invoice.fbr_status)).length);
const rejected = computed(() => rows.value.filter((invoice) => invoice.fbr_status === "rejected").length);
const tax = computed(() => rows.value.reduce((sum, invoice) => sum + invoice.sales_tax, 0));
const submitMutation = useMutation((invoiceId: string) => invoicesRepository.submitFbr(company.activeCompanyId, invoiceId));
const columns: Column[] = [{ key: "inv", header: "Invoice" }, { key: "client", header: "Buyer" }, { key: "taxable", header: "Taxable value", align: "right", class: "num" }, { key: "tax", header: "Sales tax", align: "right", class: "num" }, { key: "submitted", header: "Submitted", class: "num" }, { key: "status", header: "IRIS status" }, { key: "note", header: "Note" }, { key: "actions", header: "" }];

async function submit(invoice: InvoiceDetail) {
  if (await submitMutation.run(invoice.id)) await state.refresh();
}

async function submitQueued() {
  for (const invoice of rows.value.filter((item) => ["not_submitted", "failed"].includes(item.fbr_status))) {
    const result = await submitMutation.run(invoice.id);
    if (!result) break;
  }
  await state.refresh();
}
</script>

<template>
  <AppShell>
    <PageHeader title="FBR Invoices" description="Digital invoicing sync with FBR IRIS">
      <template #actions><ZButton variant="outline" @click="state.refresh"><RefreshCw class="size-4" /> Resync</ZButton><ZButton :disabled="submitMutation.saving.value || pending === 0" @click="submitQueued"><Landmark class="size-4" /> {{ submitMutation.saving.value ? "Submitting…" : "Submit queued" }}</ZButton></template>
    </PageHeader>
    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Accepted" :value="String(accepted)" hint="IRN issued" tone="success" /><StatCard label="Queued" :value="String(pending)" hint="Ready or retryable" tone="warning" /><StatCard label="Rejected" :value="String(rejected)" hint="Needs correction" tone="danger" /><StatCard label="Sales tax reported" :value="formatMoney(tax)" hint="Current result set" tone="brand" /></div>
    <Panel>
      <Toolbar><SearchInput v-model="query" placeholder="Search invoice or buyer" /><select v-model="status" class="field w-40" aria-label="Filter by IRIS status"><option value="all">All statuses</option><option value="not_submitted">Not submitted</option><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="failed">Failed</option></select></Toolbar>
      <ValidationMessage :message="submitMutation.error.value?.message ?? null" />
      <AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="state.isEmpty.value" empty-title="No invoices" empty-message="Invoices created for this company will appear here." @retry="state.refresh">
        <DataTable :columns="columns" :rows="rows" :min-width="1120">
          <template #inv="{ row }: { row: InvoiceDetail }"><div class="leading-tight"><RouterLink :to="`/accounting/invoices/${row.id}`" class="num font-medium text-content-brand hover:underline">{{ row.invoice_number }}</RouterLink><p class="num text-2xs text-content-muted">{{ row.fbr_reference_number || "No IRN" }}</p></div></template>
          <template #client="{ row }: { row: InvoiceDetail }">{{ row.customer_name }}</template><template #taxable="{ row }: { row: InvoiceDetail }">{{ formatMoney(row.taxable_amount) }}</template><template #tax="{ row }: { row: InvoiceDetail }">{{ formatMoney(row.sales_tax) }}</template><template #submitted="{ row }: { row: InvoiceDetail }">{{ row.updated_at ? shortDate(row.updated_at) : "—" }}</template><template #status="{ row }: { row: InvoiceDetail }"><StatusBadge :status="row.fbr_status" /></template><template #note="{ row }: { row: InvoiceDetail }"><span class="text-xs">{{ row.fbr_status === "rejected" ? "Review FBR validation details" : row.fbr_status === "failed" ? "Safe to retry" : "—" }}</span></template><template #actions="{ row }: { row: InvoiceDetail }"><ZButton v-if="['not_submitted', 'failed', 'rejected'].includes(row.fbr_status)" variant="ghost" :disabled="submitMutation.saving.value" @click="submit(row)">Submit</ZButton></template><template #footer><span>{{ rows.length }} documents</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>
  </AppShell>
</template>
