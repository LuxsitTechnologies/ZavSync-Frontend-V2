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

setPageMeta("Deductions", "Statutory and voluntary deduction components used in payroll runs.");
const company = useCompanyStore();
const deductionTypes = ["DEDUCTIONS", "EMPLOYEE_CONTRIBUTIONS", "EMPLOYER_CONTRIBUTIONS", "TAX"];
const state = useAsyncData(async () => (await payrollRepository.components(company.activeCompanyId)).filter((item) => deductionTypes.includes(item.type)), { watch: [() => company.activeCompanyId] });
const open = ref(false);
const form = ref({ code: "", name: "", type: "DEDUCTIONS", calculation_method: "fixed", value: "", rate_bps: "", calculation_base: "basic", effective_from: "", rule_version: "", rule_type: "INCOME_TAX" });
const mutation = useMutation(async () => {
  const component = await payrollRepository.createComponent(company.activeCompanyId, {
    code: form.value.code, name: form.value.name, type: form.value.type, calculation_method: form.value.calculation_method,
    fixed_amount: form.value.calculation_method === "fixed" ? parseMoneyInput(form.value.value) : null,
    rate_bps: form.value.calculation_method === "basis_points" ? Number(form.value.rate_bps) : null,
    calculation_base: form.value.calculation_base, is_taxable: false, is_active: true, effective_from: form.value.effective_from || null,
  });
  if (form.value.calculation_method === "statutory") {
    await payrollRepository.createStatutoryRule(company.activeCompanyId, { payroll_component_id: component.id, jurisdiction: "PK", rule_type: form.value.rule_type, version: form.value.rule_version, effective_from: form.value.effective_from, threshold_from: 0, threshold_to: null, rate_bps: Number(form.value.rate_bps), fixed_amount: 0, minimum_amount: null, maximum_amount: null, is_active: true });
  }
  return component;
});
const deactivateMutation = useMutation((id: string) => payrollRepository.deactivateComponent(company.activeCompanyId, id));
const columns: Column[] = [{ key: "code", header: "Code", class: "num" }, { key: "name", header: "Deduction" }, { key: "basis", header: "Basis" }, { key: "value", header: "Value", class: "num" }, { key: "type", header: "Liability type" }, { key: "status", header: "Status" }, { key: "actions", header: "", align: "right" }];
function displayValue(row: PayrollComponent) { return row.fixed_amount !== null ? formatMoney(row.fixed_amount) : row.rate_bps !== null ? `${row.rate_bps} bps` : row.calculation_method === "statutory" ? "Effective-dated rule" : "Manual"; }
async function save() { const result = await mutation.run(); if (result) { open.value = false; await state.refresh(); } }
async function deactivate(row: PayrollComponent) { if (await deactivateMutation.run(row.id)) await state.refresh(); }
</script>

<template>
  <AppShell>
    <PageHeader title="Deductions" description="Statutory contributions, tax and recoveries"><template #actions><ZButton @click="open = true"><Plus class="size-4" /> New deduction</ZButton></template></PageHeader>
    <Panel><AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="state.isEmpty.value" empty-title="No deduction components" empty-message="Create a deduction, tax or contribution component." @retry="state.refresh"><DataTable :columns="columns" :rows="state.data.value ?? []" :min-width="960">
      <template #code="{ row }: { row: PayrollComponent }">{{ row.code }}</template><template #name="{ row }: { row: PayrollComponent }"><span class="font-medium text-content">{{ row.name }}</span></template><template #basis="{ row }: { row: PayrollComponent }">{{ row.calculation_method }} · {{ row.calculation_base ?? "basic" }}</template><template #value="{ row }: { row: PayrollComponent }">{{ displayValue(row) }}</template><template #type="{ row }: { row: PayrollComponent }">{{ row.type.replaceAll("_", " ").toLowerCase() }}</template><template #status="{ row }: { row: PayrollComponent }"><span :class="`zs-badge ${row.is_active ? 'badge-success' : 'badge-neutral'}`">{{ row.is_active ? "Active" : "Inactive" }}</span></template><template #actions="{ row }: { row: PayrollComponent }"><ZButton v-if="row.is_active" variant="ghost" @click="deactivate(row)">Deactivate</ZButton></template><template #footer><span>{{ state.data.value?.length ?? 0 }} components</span></template>
    </DataTable></AsyncSection></Panel>
    <SidePanel :open="open" title="New deduction" description="Configure a voluntary or effective-dated statutory payroll component." @close="open = false"><form class="space-y-4" @submit.prevent="save"><div class="grid gap-3 sm:grid-cols-2"><label class="block"><span class="label-caps">Code</span><input v-model="form.code" class="field mt-1.5 w-full" required /></label><label class="block"><span class="label-caps">Name</span><input v-model="form.name" class="field mt-1.5 w-full" required /></label></div><label class="block"><span class="label-caps">Type</span><select v-model="form.type" class="field mt-1.5 w-full"><option value="DEDUCTIONS">Other deduction</option><option value="EMPLOYEE_CONTRIBUTIONS">Employee contribution</option><option value="EMPLOYER_CONTRIBUTIONS">Employer contribution</option><option value="TAX">Tax</option></select></label><label class="block"><span class="label-caps">Calculation</span><select v-model="form.calculation_method" class="field mt-1.5 w-full"><option value="fixed">Fixed amount</option><option value="basis_points">Basis points</option><option value="statutory">Effective-dated statutory rule</option><option value="manual">Manual adjustment</option></select></label><label v-if="form.calculation_method === 'fixed'" class="block"><span class="label-caps">Amount (PKR)</span><input v-model="form.value" class="field mt-1.5 w-full" inputmode="decimal" required /></label><label v-if="['basis_points','statutory'].includes(form.calculation_method)" class="block"><span class="label-caps">Rate (basis points)</span><input v-model="form.rate_bps" type="number" min="0" max="10000" class="field mt-1.5 w-full" required /></label><label class="block"><span class="label-caps">Calculation base</span><select v-model="form.calculation_base" class="field mt-1.5 w-full"><option value="basic">Basic salary</option><option value="gross">Gross earnings</option><option value="taxable">Taxable earnings</option></select></label><div v-if="form.calculation_method === 'statutory'" class="space-y-3 rounded-md bg-surface-sunken p-3"><label class="block"><span class="label-caps">Rule type</span><input v-model="form.rule_type" class="field mt-1 w-full" required /></label><label class="block"><span class="label-caps">Rule version</span><input v-model="form.rule_version" class="field mt-1 w-full" placeholder="e.g. 2026-company-policy" required /></label></div><label class="block"><span class="label-caps">Effective from</span><input v-model="form.effective_from" type="date" class="field mt-1.5 w-full" :required="form.calculation_method === 'statutory'" /></label><p v-if="mutation.error.value" class="text-xs text-danger">{{ mutation.error.value.message }}</p><ZButton type="submit" :disabled="mutation.saving.value">Create deduction</ZButton></form></SidePanel>
  </AppShell>
</template>
