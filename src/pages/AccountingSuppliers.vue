<script setup lang="ts">
/** A4 — Supplier profiles: contact details, terms and default account mappings. */
import { computed, reactive, ref } from "vue";
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
import SidePanel from "@/components/zs/SidePanel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import Field from "@/components/zs/Field.vue";
import AccountSelect from "@/components/accounting/AccountSelect.vue";
import AuditMeta from "@/components/accounting/AuditMeta.vue";

import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { payablesRepository } from "@/services/accounting/payables.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, sumBy } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import type { Supplier, SupplierInput } from "@/types/accounting";

setPageMeta("Suppliers", "Supplier profiles, payment terms and default account mappings.");

const company = useCompanyStore();

const search = ref("");

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => payablesRepository.suppliers(company.activeCompanyId, search.value),
  { watch: [() => company.activeCompanyId, () => search.value] },
);

const suppliers = computed<Supplier[]>(() => data.value ?? []);

const stats = computed(() => {
  const active = suppliers.value.filter((s) => s.status === "active").length;
  const outstanding = sumBy(suppliers.value, (s) => s.outstanding);
  const missingMapping = suppliers.value.filter(
    (s) => !s.default_expense_account_id || !s.default_payable_account_id,
  ).length;
  return { active, outstanding, missingMapping };
});

const columns: Column[] = [
  { key: "name", header: "Name" },
  { key: "code", header: "Code", class: "num" },
  { key: "tax_number", header: "Tax/Reg. number" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "payment_terms_days", header: "Terms", align: "right", class: "num" },
  { key: "default_expense_account_id", header: "Default expense account" },
  { key: "default_payable_account_id", header: "Default payable account" },
  { key: "status", header: "Status" },
  { key: "outstanding", header: "Outstanding", align: "right", class: "num" },
  { key: "actions", header: "" },
];

/* ---------------- View / Create / Edit ---------------- */

const viewPanelOpen = ref(false);
const viewing = ref<Supplier | null>(null);
function openView(supplier: Supplier) {
  viewing.value = supplier;
  viewPanelOpen.value = true;
}

const formOpen = ref(false);
const editing = ref<Supplier | null>(null);
const form = reactive<SupplierInput>({
  name: "",
  tax_number: "",
  email: "",
  phone: "",
  address: "",
  payment_terms_days: 30,
  default_expense_account_id: null,
  default_payable_account_id: null,
  status: "active",
});

function resetForm() {
  form.name = "";
  form.tax_number = "";
  form.email = "";
  form.phone = "";
  form.address = "";
  form.payment_terms_days = 30;
  form.default_expense_account_id = null;
  form.default_payable_account_id = null;
  form.status = "active";
}

const saveMutation = useMutation(payablesRepository.saveSupplier);

function openCreate() {
  editing.value = null;
  resetForm();
  saveMutation.reset();
  formOpen.value = true;
}

function openEdit(supplier: Supplier) {
  editing.value = supplier;
  form.name = supplier.name;
  form.tax_number = supplier.tax_number;
  form.email = supplier.email;
  form.phone = supplier.phone;
  form.address = supplier.address;
  form.payment_terms_days = supplier.payment_terms_days;
  form.default_expense_account_id = supplier.default_expense_account_id;
  form.default_payable_account_id = supplier.default_payable_account_id;
  form.status = supplier.status;
  saveMutation.reset();
  formOpen.value = true;
}

async function submitForm() {
  const result = await saveMutation.run(company.activeCompanyId, { ...form }, editing.value?.id);
  if (result) {
    formOpen.value = false;
    await refresh();
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Suppliers" description="Supplier master data, payment terms and default account mappings.">
      <template #actions>
        <RouterLink to="/accounting/payables"><ZButton variant="outline">Bills</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/aging"><ZButton variant="outline">Aging</ZButton></RouterLink>
        <RouterLink to="/accounting/payables/statements"><ZButton variant="outline">Statements</ZButton></RouterLink>
        <ZButton @click="openCreate"><Plus class="size-4" /> New supplier</ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <StatCard label="Active suppliers" :value="String(stats.active)" tone="success" />
      <StatCard label="Total payable outstanding" :value="formatMoney(stats.outstanding)" tone="brand" />
      <StatCard label="Missing default mapping" :value="String(stats.missingMapping)" tone="warning" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="search" placeholder="Search supplier name or code" />
      </Toolbar>

      <AsyncSection
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-title="No suppliers yet"
        empty-message="Suppliers will appear here once created for this company."
        @retry="refresh"
      >
        <DataTable :columns="columns" :rows="suppliers" :min-width="1280">
          <template #name="{ row }: { row: Supplier }">{{ row.name }}</template>
          <template #code="{ row }: { row: Supplier }">{{ row.code }}</template>
          <template #tax_number="{ row }: { row: Supplier }">{{ row.tax_number || "—" }}</template>
          <template #email="{ row }: { row: Supplier }">{{ row.email || "—" }}</template>
          <template #phone="{ row }: { row: Supplier }">{{ row.phone || "—" }}</template>
          <template #payment_terms_days="{ row }: { row: Supplier }">{{ row.payment_terms_days }} days</template>
          <template #default_expense_account_id="{ row }: { row: Supplier }">
            <span v-if="!row.default_expense_account_id" class="text-warning">Not set</span>
            <span v-else class="text-content-secondary">Set</span>
          </template>
          <template #default_payable_account_id="{ row }: { row: Supplier }">
            <span v-if="!row.default_payable_account_id" class="text-warning">Not set</span>
            <span v-else class="text-content-secondary">Set</span>
          </template>
          <template #status="{ row }: { row: Supplier }">
            <span :class="row.status === 'active' ? 'zs-badge badge-success' : 'zs-badge badge-neutral'">
              {{ row.status === "active" ? "Active" : "Inactive" }}
            </span>
          </template>
          <template #outstanding="{ row }: { row: Supplier }">{{ formatMoney(row.outstanding) }}</template>
          <template #actions="{ row }: { row: Supplier }">
            <span class="flex justify-end gap-1">
              <ZButton variant="ghost" @click="openView(row)">View</ZButton>
              <ZButton variant="ghost" @click="openEdit(row)">Edit</ZButton>
            </span>
          </template>
          <template #footer><span>{{ suppliers.length }} suppliers</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <!-- View panel -->
    <SidePanel
      :open="viewPanelOpen"
      title="Supplier details"
      :description="viewing ? `${viewing.code} · ${viewing.name}` : undefined"
      @close="viewPanelOpen = false"
    >
      <div v-if="viewing" class="space-y-4 text-sm">
        <dl class="grid grid-cols-2 gap-3">
          <div>
            <dt class="label-caps">Status</dt>
            <dd class="mt-1">
              <span :class="viewing.status === 'active' ? 'zs-badge badge-success' : 'zs-badge badge-neutral'">
                {{ viewing.status === "active" ? "Active" : "Inactive" }}
              </span>
            </dd>
          </div>
          <div>
            <dt class="label-caps">Payment terms</dt>
            <dd class="num mt-1 text-content-secondary">{{ viewing.payment_terms_days }} days</dd>
          </div>
          <div>
            <dt class="label-caps">Tax/Reg. number</dt>
            <dd class="mt-1 text-content-secondary">{{ viewing.tax_number || "—" }}</dd>
          </div>
          <div>
            <dt class="label-caps">Outstanding</dt>
            <dd class="num mt-1 font-semibold text-content">{{ formatMoney(viewing.outstanding) }}</dd>
          </div>
          <div>
            <dt class="label-caps">Email</dt>
            <dd class="mt-1 text-content-secondary">{{ viewing.email || "—" }}</dd>
          </div>
          <div>
            <dt class="label-caps">Phone</dt>
            <dd class="mt-1 text-content-secondary">{{ viewing.phone || "—" }}</dd>
          </div>
        </dl>
        <div>
          <p class="label-caps">Address</p>
          <p class="mt-1 text-content-secondary">{{ viewing.address || "—" }}</p>
        </div>
        <p
          v-if="!viewing.default_expense_account_id || !viewing.default_payable_account_id"
          class="rounded-md border border-line bg-surface-sunken p-2.5 text-2xs text-warning"
        >
          This supplier is missing a default account mapping — set both the expense and payable accounts so
          future bills post automatically.
        </p>
        <AuditMeta
          :created-by="viewing.created_by"
          :created-at="viewing.created_at"
          :updated-by="viewing.updated_by"
          :updated-at="viewing.updated_at"
        />
      </div>
      <template #footer>
        <ZButton variant="outline" @click="viewPanelOpen = false">Close</ZButton>
        <ZButton v-if="viewing" @click="openEdit(viewing); viewPanelOpen = false">Edit</ZButton>
      </template>
    </SidePanel>

    <!-- Create / edit panel -->
    <SidePanel
      :open="formOpen"
      :title="editing ? 'Edit supplier' : 'New supplier'"
      :description="editing ? `${editing.code} · ${editing.name}` : 'Add a supplier to this company.'"
      width="lg"
      @close="formOpen = false"
    >
      <form class="space-y-4" @submit.prevent="submitForm">
        <ValidationMessage :message="saveMutation.error.value?.message ?? null" />
        <Field v-model="form.name" label="Name" />
        <ValidationMessage :message="saveMutation.fieldErrors.value['name'] ?? null" />
        <div class="grid gap-3 sm:grid-cols-2">
          <Field v-model="form.tax_number" label="Tax number" />
          <Field v-model="form.email" label="Email" type="email" />
        </div>
        <ValidationMessage :message="saveMutation.fieldErrors.value['email'] ?? null" />
        <Field v-model="form.phone" label="Phone" />
        <label class="block">
          <span class="label-caps">Address</span>
          <textarea v-model="form.address" rows="3" class="field mt-1.5" />
        </label>
        <label class="block">
          <span class="label-caps">Payment terms (days)</span>
          <input
            type="number"
            min="0"
            class="field num mt-1.5"
            :value="form.payment_terms_days"
            @input="form.payment_terms_days = Number(($event.target as HTMLInputElement).value)"
          />
          <ValidationMessage :message="saveMutation.fieldErrors.value['payment_terms_days'] ?? null" />
        </label>
        <AccountSelect
          v-model="form.default_expense_account_id"
          label="Default expense account"
          :types="['expense', 'asset']"
          :error="saveMutation.fieldErrors.value['default_expense_account_id'] ?? null"
        />
        <AccountSelect
          v-model="form.default_payable_account_id"
          label="Default payable account"
          :types="['liability']"
          :error="saveMutation.fieldErrors.value['default_payable_account_id'] ?? null"
        />
        <label class="block">
          <span class="label-caps">Status</span>
          <select v-model="form.status" class="field mt-1.5">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </form>
      <template #footer>
        <ZButton variant="outline" @click="formOpen = false">Cancel</ZButton>
        <ZButton :disabled="saveMutation.saving.value" @click="submitForm">
          {{ saveMutation.saving.value ? "Saving…" : editing ? "Save changes" : "Create supplier" }}
        </ZButton>
      </template>
    </SidePanel>
  </AppShell>
</template>
