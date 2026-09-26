<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Plus } from "lucide-vue-next";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import AccountSelect from "@/components/accounting/AccountSelect.vue";
import MoneyInput from "@/components/accounting/MoneyInput.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { procurementRepository } from "@/services/accounting/procurement.repository";
import { payablesRepository } from "@/services/accounting/payables.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, parseQuantityInput } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { localDateInput } from "@/lib/format";
import { showToast } from "@/composables/useToast";
import type { Money, Supplier } from "@/types/accounting";
import type { PurchaseOrder } from "@/types/operations";

setPageMeta("Purchase Orders", "Purchase approval, receiving and bill-conversion workflow.");
const company = useCompanyStore();
const router = useRouter();
const query = useAsyncData(() => procurementRepository.list(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const supplierQuery = useAsyncData(() => payablesRepository.suppliers(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const suppliers = computed<Supplier[]>(() => supplierQuery.data.value ?? []);
const search = ref("");
const status = ref("all");
const open = ref(false);
const supplierId = ref("");
const description = ref("");
const quantity = ref("1");
const unitPrice = ref<Money>(0);
const expenseAccountId = ref<string | null>(null);
const createMutation = useMutation(procurementRepository.create);
const rows = computed(() => (query.data.value ?? []).filter((row) => (status.value === "all" || row.status === status.value) && `${row.number} ${row.supplier}`.toLowerCase().includes(search.value.toLowerCase())));
const total = computed(() => rows.value.reduce((sum, row) => sum + row.total, 0));
const columns: Column[] = [
  { key: "number", header: "PO number" }, { key: "supplier", header: "Supplier" }, { key: "date", header: "Order date" },
  { key: "expected", header: "Expected" }, { key: "owner", header: "Owner" }, { key: "total", header: "Total", align: "right", class: "num" },
  { key: "received", header: "Received" }, { key: "status", header: "Status" }, { key: "actions", header: "" },
];

async function create() {
  const quantityMilli = parseQuantityInput(quantity.value);
  if (quantityMilli === null || quantityMilli <= 0) {
    showToast("Invalid quantity", "Enter a positive quantity with no more than three decimal places.", "danger");
    return;
  }
  const result = await createMutation.run(company.activeCompanyId, {
    supplier_id: supplierId.value,
    order_date: localDateInput(),
    currency: "PKR",
    lines: [{
      description: description.value,
      procurement_type: "service",
      quantity_milli: quantityMilli,
      unit: "unit",
      unit_price: unitPrice.value,
      discount: 0,
      tax_rate_bps: 0,
      expense_account_id: expenseAccountId.value,
    }],
  });
  if (result) {
    open.value = false;
    await query.refresh();
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Purchase Orders" description="Controlled purchasing from request through receipt and supplier bill">
      <template #actions><ZButton @click="open = true"><Plus class="size-4" />New purchase order</ZButton></template>
    </PageHeader>
    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <StatCard label="Open commitments" :value="formatMoney(total)" tone="brand" />
      <StatCard label="Awaiting approval" :value="String(rows.filter((row) => row.status === 'pending').length)" tone="warning" />
      <StatCard label="Received" :value="String(rows.filter((row) => row.status === 'received').length)" tone="success" />
    </div>
    <Panel>
      <Toolbar>
        <SearchInput v-model="search" placeholder="Search PO or supplier" />
        <select v-model="status" class="field w-44">
          <option value="all">All statuses</option><option value="draft">Draft</option><option value="pending">Pending</option>
          <option value="approved">Approved</option><option value="partially_received">Partially received</option><option value="received">Received</option>
        </select>
      </Toolbar>
      <AsyncSection :loading="query.loading.value" :error="query.error.value" :empty="query.isEmpty.value" empty-title="No purchase orders" empty-message="Create a purchase order to begin procurement." @retry="query.refresh">
        <DataTable :columns="columns" :rows="rows" :min-width="1100">
          <template #number="{ row }: { row: PurchaseOrder }"><button class="num font-medium text-content-brand hover:underline" @click="router.push(`/purchases/${row.id}`)">{{ row.number }}</button></template>
          <template #supplier="{ row }: { row: PurchaseOrder }">{{ row.supplier }}</template>
          <template #date="{ row }: { row: PurchaseOrder }">{{ row.date }}</template>
          <template #expected="{ row }: { row: PurchaseOrder }">{{ row.expected_date || "—" }}</template>
          <template #owner="{ row }: { row: PurchaseOrder }">{{ row.created_by }}</template>
          <template #total="{ row }: { row: PurchaseOrder }">{{ formatMoney(row.total) }}</template>
          <template #received="{ row }: { row: PurchaseOrder }"><div class="w-28"><div class="h-1.5 rounded-full bg-surface-sunken"><div class="h-full rounded-full bg-primary" :style="{ width: `${row.received}%` }" /></div><span class="num text-2xs text-content-muted">{{ row.received }}%</span></div></template>
          <template #status="{ row }: { row: PurchaseOrder }"><StatusBadge :status="row.status" /></template>
          <template #actions="{ row }: { row: PurchaseOrder }"><ZButton variant="ghost" @click="router.push(`/purchases/${row.id}`)">Review</ZButton></template>
        </DataTable>
      </AsyncSection>
    </Panel>
    <SidePanel :open="open" title="New purchase order" description="Draft values remain editable until approval." width="lg" @close="open = false">
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="create">
        <ValidationMessage class="sm:col-span-2" :message="createMutation.error.value?.message ?? null" />
        <label class="block"><span class="label-caps">Supplier</span><select v-model="supplierId" class="field mt-1.5" required><option value="" disabled>Select supplier</option><option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option></select></label>
        <Field v-model="description" label="Description" required />
        <Field v-model="quantity" label="Quantity" type="number" required />
        <MoneyInput v-model="unitPrice" label="Unit cost" />
        <AccountSelect v-model="expenseAccountId" label="Expense / asset account" :types="['expense', 'asset']" />
      </form>
      <template #footer><ZButton variant="outline" @click="open = false">Cancel</ZButton><ZButton :disabled="createMutation.saving.value" @click="create">{{ createMutation.saving.value ? "Saving…" : "Save draft" }}</ZButton></template>
    </SidePanel>
  </AppShell>
</template>
