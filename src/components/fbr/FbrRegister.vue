<script setup lang="ts">
import { ref, watch } from "vue";
import type { FbrListFilters } from "@/types/fbr";
import { useAsyncData } from "@/composables/useAsyncData";
import { fbrRepository } from "@/services/fbr/repository";
import { money } from "./form";
import { useFbrContext } from "./context";
import Panel from "@/components/zs/Panel.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import DataTable from "@/components/zs/DataTable.vue";
import Pagination from "@/components/zs/Pagination.vue";
import ZButton from "@/components/zs/ZButton.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
const { company, companyId } = useFbrContext();
const page = ref(1), perPage = ref(25), historical = ref("");
const search = ref(""), status = ref(""), documentState = ref(""), dateFrom = ref(""), dateTo = ref("");
const sortBy = ref<FbrListFilters["sort_by"]>("invoice_date"), sortOrder = ref<"asc" | "desc">("desc");
const filters = ref<FbrListFilters>({});
watch([perPage, historical], () => { page.value = 1; }, { flush: "sync" });
const { data, loading, error, refresh } = useAsyncData(() => fbrRepository.list(companyId, page.value, perPage.value, historical.value, filters.value), { watch: [page, perPage, historical, filters] });
function applyFilters(): void {
  page.value = 1;
  filters.value = { search: search.value.trim() || undefined, fbr_status: status.value || undefined,
    document_state: documentState.value || undefined, date_from: dateFrom.value || undefined,
    date_to: dateTo.value || undefined, sort_by: sortBy.value, sort_order: sortOrder.value };
}
const columns = [{ key: "number", header: "Invoice" }, { key: "buyer", header: "Buyer" }, { key: "date", header: "Date" }, { key: "total", header: "Total", class: "num" }, { key: "state", header: "Document Status" }, { key: "fbr", header: "FBR Status" }, { key: "reference", header: "FBR reference" }];
const statusLabel = (value: string) => value.toLowerCase().split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
</script>
<template>
  <Panel title="Invoice Register">
    <template #actions><RouterLink v-if="company.hasPermission('pakistan_fbr.manage')" to="/fbr-invoicing/new" class="text-sm text-content-brand">Create Invoice</RouterLink></template>
    <p class="px-4 pt-4 text-sm text-content-secondary">Find drafts, submitted invoices and historical records.</p>
    <form class="flex flex-wrap items-end gap-3 p-4" @submit.prevent="applyFilters">
      <label><span class="label-caps">Records</span><select v-model="historical" class="field mt-1"><option value="">All invoices</option><option value="0">New V2 invoices</option><option value="1">Historical V1 invoices</option></select></label>
      <label><span class="label-caps">Per page</span><select v-model.number="perPage" class="field mt-1"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option></select></label>
      <label><span class="label-caps">Search invoice or buyer</span><input v-model="search" class="field mt-1" maxlength="120" /></label>
      <label><span class="label-caps">FBR status</span><select v-model="status" class="field mt-1"><option value="">Any status</option><option v-for="item in ['not_submitted','pending','uncertain','submitted','accepted','rejected','failed']" :key="item" :value="item">{{ statusLabel(item) }}</option></select></label>
      <label><span class="label-caps">Document state</span><select v-model="documentState" class="field mt-1"><option value="">Any state</option><option value="DRAFT">Draft</option><option value="ISSUED">Issued</option></select></label>
      <label><span class="label-caps">From date</span><input v-model="dateFrom" class="field mt-1" type="date" /></label>
      <label><span class="label-caps">To date</span><input v-model="dateTo" class="field mt-1" type="date" :min="dateFrom" /></label>
      <label><span class="label-caps">Sort by</span><select v-model="sortBy" class="field mt-1"><option value="invoice_date">Invoice date</option><option value="created_at">Created</option><option value="invoice_number">Invoice number</option><option value="total">Total</option><option value="fbr_status">FBR status</option></select></label>
      <label><span class="label-caps">Order</span><select v-model="sortOrder" class="field mt-1"><option value="desc">Newest / high first</option><option value="asc">Oldest / low first</option></select></label>
      <ZButton type="submit" :disabled="loading">Apply Filters</ZButton>
      <ZButton variant="outline" :disabled="loading" @click="refresh">Refresh</ZButton>
    </form>
    <AsyncSection :loading="loading" :error="error" :empty="data?.data.length === 0" empty-title="No FBR invoices" empty-message="No invoices match this record selection." @retry="refresh">
      <DataTable :rows="data?.data ?? []" :columns="columns">
        <template #number="{ row }"><RouterLink :to="`/fbr-invoicing/${row.id}`" class="text-content-brand">{{ row.invoice_number }}</RouterLink><span v-if="row.is_historical" class="block text-xs">Historical · read-only</span></template>
        <template #buyer="{ row }">{{ row.buyer_snapshot.name }}</template><template #date="{ row }">{{ row.invoice_date }}</template>
        <template #total="{ row }">{{ money(row.total) }}</template><template #state="{ row }"><StatusBadge :status="row.document_state" :label="statusLabel(row.document_state)" /></template><template #fbr="{ row }"><StatusBadge :status="row.fbr_status" :label="statusLabel(row.fbr_status)" /></template>
        <template #reference="{ row }">{{ row.fbr_reference_number ?? '—' }}</template>
      </DataTable>
      <div v-if="data" class="p-4"><Pagination :page="data.meta.current_page" :pages="data.meta.last_page" :total="data.meta.total" @change="page = $event" /></div>
    </AsyncSection>
  </Panel>
</template>
