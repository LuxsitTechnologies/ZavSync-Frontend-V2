<script setup lang="ts">
import { ref } from "vue";
import { Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import ZButton from "@/components/zs/ZButton.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import Panel from "@/components/zs/Panel.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { formatMoney, parseMoneyInput } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { payrollRepository } from "@/services/payroll/payroll.repository";
import { useCompanyStore } from "@/stores/company";
import type { PayrollComponent } from "@/types/payroll";

setPageMeta("Allowances", "Allowance components, calculation basis and taxability rules.");
const company = useCompanyStore();
const state = useAsyncData(async () => (await payrollRepository.components(company.activeCompanyId)).filter((item) => ["EARNINGS", "REIMBURSEMENTS"].includes(item.type)), { watch: [() => company.activeCompanyId] });
const open = ref(false);
const form = ref({ code: "", name: "", type: "EARNINGS", calculation_method: "fixed", value: "", rate_bps: "", calculation_base: "basic", is_taxable: true, effective_from: "" });
const mutation = useMutation(async () => payrollRepository.createComponent(company.activeCompanyId, {
  code: form.value.code, name: form.value.name, type: form.value.type, calculation_method: form.value.calculation_method,
  fixed_amount: form.value.calculation_method === "fixed" ? parseMoneyInput(form.value.value) : null,
  rate_bps: form.value.calculation_method === "basis_points" ? Number(form.value.rate_bps) : null,
  calculation_base: form.value.calculation_base, is_taxable: form.value.is_taxable, is_active: true,
  effective_from: form.value.effective_from || null,
}));
const deactivateMutation = useMutation((id: string) => payrollRepository.deactivateComponent(company.activeCompanyId, id));
const columns: Column[] = [{ key: "code", header: "Code", class: "num" }, { key: "name", header: "Allowance" }, { key: "basis", header: "Basis" }, { key: "value", header: "Value", class: "num" }, { key: "taxable", header: "Taxable" }, { key: "applies", header: "Status" }, { key: "actions", header: "", align: "right" }];
function displayValue(row: PayrollComponent) { return row.fixed_amount !== null ? formatMoney(row.fixed_amount) : row.rate_bps !== null ? `${row.rate_bps} bps` : "Configured by rule"; }
async function save() { const result = await mutation.run(); if (result) { open.value = false; await state.refresh(); } }
async function deactivate(row: PayrollComponent) { if (await deactivateMutation.run(row.id)) await state.refresh(); }
</script>

<template>
  <AppShell>
    <PageHeader title="Allowances" description="Earning components applied during payroll calculation"><template #actions><ZButton @click="open = true"><Plus class="size-4" /> New allowance</ZButton></template></PageHeader>
    <Panel><AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="state.isEmpty.value" empty-title="No allowance components" empty-message="Create the first earning or reimbursement component." @retry="state.refresh"><DataTable :columns="columns" :rows="state.data.value ?? []" :min-width="940">
      <template #code="{ row }: { row: PayrollComponent }">{{ row.code }}</template><template #name="{ row }: { row: PayrollComponent }"><span class="font-medium text-content">{{ row.name }}</span></template><template #basis="{ row }: { row: PayrollComponent }">{{ row.calculation_method }} · {{ row.calculation_base ?? "basic" }}</template><template #value="{ row }: { row: PayrollComponent }">{{ displayValue(row) }}</template><template #taxable="{ row }: { row: PayrollComponent }"><span :class="`zs-badge ${row.is_taxable ? 'badge-warning' : 'badge-neutral'}`">{{ row.is_taxable ? "Taxable" : "Exempt" }}</span></template><template #applies="{ row }: { row: PayrollComponent }"><span :class="`zs-badge ${row.is_active ? 'badge-success' : 'badge-neutral'}`">{{ row.is_active ? "Active" : "Inactive" }}</span></template><template #actions="{ row }: { row: PayrollComponent }"><ZButton v-if="row.is_active" variant="ghost" @click="deactivate(row)">Deactivate</ZButton></template><template #footer><span>{{ state.data.value?.length ?? 0 }} components</span></template>
    </DataTable></AsyncSection></Panel>
    <SidePanel :open="open" title="New allowance" description="Configure an effective-dated payroll earning without hard-coded calculations." @close="open = false"><form class="space-y-4" @submit.prevent="save"><div class="grid gap-3 sm:grid-cols-2"><label class="block"><span class="label-caps">Code</span><input v-model="form.code" class="field mt-1.5 w-full" required /></label><label class="block"><span class="label-caps">Name</span><input v-model="form.name" class="field mt-1.5 w-full" required /></label></div><label class="block"><span class="label-caps">Type</span><select v-model="form.type" class="field mt-1.5 w-full"><option value="EARNINGS">Earnings</option><option value="REIMBURSEMENTS">Reimbursement</option></select></label><div class="grid gap-3 sm:grid-cols-2"><label class="block"><span class="label-caps">Calculation</span><select v-model="form.calculation_method" class="field mt-1.5 w-full"><option value="fixed">Fixed amount</option><option value="basis_points">Basis points</option><option value="manual">Manual adjustment</option></select></label><label v-if="form.calculation_method === 'fixed'" class="block"><span class="label-caps">Amount (PKR)</span><input v-model="form.value" class="field mt-1.5 w-full" inputmode="decimal" required /></label><label v-else-if="form.calculation_method === 'basis_points'" class="block"><span class="label-caps">Rate (basis points)</span><input v-model="form.rate_bps" type="number" min="0" max="10000" class="field mt-1.5 w-full" required /></label></div><label class="block"><span class="label-caps">Calculation base</span><select v-model="form.calculation_base" class="field mt-1.5 w-full"><option value="basic">Basic salary</option><option value="gross">Gross earnings</option><option value="taxable">Taxable earnings</option></select></label><label class="flex items-center gap-2 text-sm"><input v-model="form.is_taxable" type="checkbox" /> Taxable earning</label><label class="block"><span class="label-caps">Effective from</span><input v-model="form.effective_from" type="date" class="field mt-1.5 w-full" /></label><p v-if="mutation.error.value" class="text-xs text-danger">{{ mutation.error.value.message }}</p><ZButton type="submit" :disabled="mutation.saving.value">Create allowance</ZButton></form></SidePanel>
  </AppShell>
</template>
