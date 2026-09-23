<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import ZButton from "@/components/zs/ZButton.vue";
import MoneyInput from "@/components/accounting/MoneyInput.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { invoicesRepository } from "@/services/accounting/invoices.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import type { Customer, CustomerInput, Money } from "@/types/accounting";

setPageMeta("Customers", "Company-scoped customer, tax and payment-term master data.");

const company = useCompanyStore();
const query = ref("");
const state = useAsyncData(() => invoicesRepository.customers(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const rows = computed(() => (state.data.value ?? []).filter((customer) => `${customer.name} ${customer.code} ${customer.tax_number}`.toLowerCase().includes(query.value.toLowerCase())));
const columns: Column[] = [{ key: "code", header: "Code" }, { key: "name", header: "Customer" }, { key: "tax", header: "NTN / CNIC" }, { key: "contact", header: "Contact" }, { key: "terms", header: "Terms", align: "right" }, { key: "outstanding", header: "Outstanding", align: "right", class: "num" }, { key: "status", header: "Status" }, { key: "actions", header: "" }];
const panelOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ name: "", legalName: "", type: "business" as CustomerInput["type"], ntn: "", cnic: "", strn: "", email: "", phone: "", billingAddress: "", city: "", province: "", country: "PK", postalCode: "", contactPerson: "", paymentTermsDays: 30, creditLimit: 0 as Money, currency: "PKR", active: true, notes: "" });
const saveMutation = useMutation(async () => editingId.value ? invoicesRepository.updateCustomer(company.activeCompanyId, editingId.value, input()) : invoicesRepository.createCustomer(company.activeCompanyId, input()));

function reset() {
  editingId.value = null;
  Object.assign(form, { name: "", legalName: "", type: "business", ntn: "", cnic: "", strn: "", email: "", phone: "", billingAddress: "", city: "", province: "", country: "PK", postalCode: "", contactPerson: "", paymentTermsDays: 30, creditLimit: 0, currency: "PKR", active: true, notes: "" });
  saveMutation.reset();
}

function openNew() {
  reset();
  panelOpen.value = true;
}

function openEdit(customer: Customer) {
  editingId.value = customer.id;
  Object.assign(form, { name: customer.name, legalName: customer.legal_name ?? "", type: customer.type ?? "business", ntn: customer.ntn ?? "", cnic: customer.cnic ?? "", strn: customer.strn ?? "", email: customer.email, phone: customer.phone, billingAddress: customer.billing_address ?? "", city: customer.city ?? "", province: customer.province ?? "", country: customer.country ?? "PK", postalCode: customer.postal_code ?? "", contactPerson: customer.contact_person ?? "", paymentTermsDays: customer.payment_terms_days, creditLimit: customer.credit_limit ?? 0, currency: customer.currency ?? "PKR", active: customer.is_active, notes: customer.notes ?? "" });
  saveMutation.reset();
  panelOpen.value = true;
}

function input(): CustomerInput {
  return { name: form.name, legal_name: form.legalName || null, type: form.type, ntn: form.ntn || null, cnic: form.cnic || null, strn: form.strn || null, email: form.email || null, phone: form.phone || null, billing_address: form.billingAddress || null, city: form.city || null, province: form.province || null, country: form.country, postal_code: form.postalCode || null, contact_person: form.contactPerson || null, payment_terms_days: form.paymentTermsDays, credit_limit: form.creditLimit || null, currency: form.currency, is_active: form.active, notes: form.notes || null };
}

async function save() {
  if (!await saveMutation.run()) return;
  panelOpen.value = false;
  await state.refresh();
}
</script>

<template>
  <AppShell>
    <PageHeader title="Customers" description="Customer profiles, Pakistan tax identifiers and credit terms"><template #actions><ZButton @click="openNew"><Plus class="size-4" /> New customer</ZButton></template></PageHeader>
    <Panel><Toolbar><SearchInput v-model="query" placeholder="Search customer, code or tax number" /></Toolbar><AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="state.isEmpty.value" empty-title="No customers" empty-message="Add the first customer for this company." @retry="state.refresh"><DataTable :columns="columns" :rows="rows" :min-width="1050"><template #code="{ row }: { row: Customer }"><span class="num font-medium text-content">{{ row.code }}</span></template><template #name="{ row }: { row: Customer }"><div><p class="font-medium text-content">{{ row.name }}</p><p class="text-2xs text-content-muted">{{ row.legal_name }}</p></div></template><template #tax="{ row }: { row: Customer }">{{ row.tax_number || "—" }}</template><template #contact="{ row }: { row: Customer }"><div><p>{{ row.email || "—" }}</p><p class="text-2xs text-content-muted">{{ row.phone }}</p></div></template><template #terms="{ row }: { row: Customer }">{{ row.payment_terms_days }} days</template><template #outstanding="{ row }: { row: Customer }">{{ formatMoney(row.outstanding) }}</template><template #status="{ row }: { row: Customer }"><StatusBadge :status="row.is_active ? 'active' : 'inactive'" /></template><template #actions="{ row }: { row: Customer }"><ZButton variant="ghost" @click="openEdit(row)">Edit</ZButton></template><template #footer><span>{{ rows.length }} customers</span></template></DataTable></AsyncSection></Panel>
    <SidePanel :open="panelOpen" :title="editingId ? 'Edit customer' : 'New customer'" description="Identifiers are normalized and validated by the backend." width="lg" @close="panelOpen = false"><div class="grid gap-4 sm:grid-cols-2"><label><span class="label-caps">Customer name</span><input v-model="form.name" class="field mt-1.5" /><ValidationMessage :message="saveMutation.fieldErrors.value['name'] ?? null" /></label><label><span class="label-caps">Legal name</span><input v-model="form.legalName" class="field mt-1.5" /></label><label><span class="label-caps">Customer type</span><select v-model="form.type" class="field mt-1.5"><option value="business">Business</option><option value="individual">Individual</option><option value="government">Government</option></select></label><label><span class="label-caps">Contact person</span><input v-model="form.contactPerson" class="field mt-1.5" /></label><label><span class="label-caps">NTN (7 digits)</span><input v-model="form.ntn" inputmode="numeric" class="field mt-1.5" /><ValidationMessage :message="saveMutation.fieldErrors.value['ntn'] ?? null" /></label><label><span class="label-caps">CNIC (13 digits)</span><input v-model="form.cnic" inputmode="numeric" class="field mt-1.5" /><ValidationMessage :message="saveMutation.fieldErrors.value['cnic'] ?? null" /></label><label><span class="label-caps">STRN</span><input v-model="form.strn" class="field mt-1.5" /></label><label><span class="label-caps">Email</span><input v-model="form.email" type="email" class="field mt-1.5" /></label><label><span class="label-caps">Phone</span><input v-model="form.phone" class="field mt-1.5" /></label><label><span class="label-caps">Payment terms (days)</span><input v-model.number="form.paymentTermsDays" type="number" min="0" class="field num mt-1.5" /></label><label class="sm:col-span-2"><span class="label-caps">Billing address</span><textarea v-model="form.billingAddress" class="field mt-1.5 min-h-20" /></label><label><span class="label-caps">City</span><input v-model="form.city" class="field mt-1.5" /></label><label><span class="label-caps">Province</span><input v-model="form.province" class="field mt-1.5" /></label><MoneyInput v-model="form.creditLimit" label="Credit limit" /><label class="flex items-end gap-2 pb-2"><input v-model="form.active" type="checkbox" class="size-4" /><span class="text-sm text-content">Active customer</span></label><label class="sm:col-span-2"><span class="label-caps">Notes</span><textarea v-model="form.notes" class="field mt-1.5 min-h-20" /></label><ValidationMessage class="sm:col-span-2" :message="saveMutation.error.value?.message ?? null" /></div><template #footer><ZButton variant="outline" @click="panelOpen = false">Cancel</ZButton><ZButton :disabled="saveMutation.saving.value" @click="save">{{ saveMutation.saving.value ? "Saving…" : "Save customer" }}</ZButton></template></SidePanel>
  </AppShell>
</template>
