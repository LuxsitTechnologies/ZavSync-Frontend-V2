<script setup lang="ts">
import { ref, watch } from "vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { fbrRepository } from "@/services/fbr/repository";
import { money } from "./form";
import { useFbrContext } from "./context";
import Panel from "@/components/zs/Panel.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import DataTable from "@/components/zs/DataTable.vue";
import Pagination from "@/components/zs/Pagination.vue";
import ZButton from "@/components/zs/ZButton.vue";
const { company, companyId } = useFbrContext();
const page = ref(1), perPage = ref(25), historical = ref("");
watch([perPage, historical], () => { page.value = 1; }, { flush: "sync" });
const { data, loading, error, refresh } = useAsyncData(() => fbrRepository.list(companyId, page.value, perPage.value, historical.value), { watch: [page, perPage, historical] });
const columns = [{ key: "number", header: "Invoice" }, { key: "buyer", header: "Buyer" }, { key: "date", header: "Date" }, { key: "total", header: "Total", class: "num" }, { key: "state", header: "Document / FBR status" }, { key: "reference", header: "FBR reference" }];
</script>
<template>
  <Panel title="Invoice register">
    <template #actions><RouterLink v-if="company.hasPermission('pakistan_fbr.manage')" to="/fbr-invoicing/new" class="text-sm text-content-brand">Create draft</RouterLink></template>
    <div class="flex flex-wrap items-end gap-3 p-4">
      <label><span class="label-caps">Records</span><select v-model="historical" class="field mt-1"><option value="">All invoices</option><option value="0">New V2 invoices</option><option value="1">Historical V1 invoices</option></select></label>
      <label><span class="label-caps">Per page</span><select v-model.number="perPage" class="field mt-1"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option></select></label>
      <ZButton variant="outline" :disabled="loading" @click="refresh">Refresh</ZButton>
    </div>
    <p class="px-4 pb-3 text-xs text-content-muted">Search, status and date filters are not yet available.</p>
    <AsyncSection :loading="loading" :error="error" :empty="data?.data.length === 0" empty-title="No FBR invoices" empty-message="No invoices match this record selection." @retry="refresh">
      <DataTable :rows="data?.data ?? []" :columns="columns">
        <template #number="{ row }"><RouterLink :to="`/fbr-invoicing/${row.id}`" class="text-content-brand">{{ row.invoice_number }}</RouterLink><span v-if="row.is_historical" class="block text-xs">Historical · read-only</span></template>
        <template #buyer="{ row }">{{ row.buyer_snapshot.name }}</template><template #date="{ row }">{{ row.invoice_date }}</template>
        <template #total="{ row }">{{ money(row.total) }}</template><template #state="{ row }">{{ row.document_state }} / {{ row.fbr_status }}</template>
        <template #reference="{ row }">{{ row.fbr_reference_number ?? '—' }}</template>
      </DataTable>
      <div v-if="data" class="p-4"><Pagination :page="data.meta.current_page" :pages="data.meta.last_page" :total="data.meta.total" @change="page = $event" /></div>
    </AsyncSection>
  </Panel>
</template>
