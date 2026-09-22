<script setup lang="ts">
/**
 * A1 — Chart of Accounts. Company-scoped account tree with balances and
 * hierarchy, sourced entirely from the accounts repository.
 */
import { computed, reactive, ref, watch } from "vue";
import { Plus } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import Toolbar from "@/components/zs/Toolbar.vue";
import SearchInput from "@/components/zs/SearchInput.vue";
import StatCard from "@/components/zs/StatCard.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import ZButton from "@/components/zs/ZButton.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import Field from "@/components/zs/Field.vue";
import AccountSelect from "@/components/accounting/AccountSelect.vue";
import MoneyInput from "@/components/accounting/MoneyInput.vue";
import AuditMeta from "@/components/accounting/AuditMeta.vue";

import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { accountsRepository, type AccountQuery } from "@/services/accounting/accounts.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, formatMoneyOrDash, sumBy } from "@/lib/money";
import { shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import { ACCOUNT_TYPES, type AccountInput, type AccountNode, type AccountType } from "@/types/accounting";

setPageMeta("Chart of Accounts", "Company-scoped chart of accounts with balances and hierarchy.");

const company = useCompanyStore();

const search = ref("");
const typeFilter = ref<AccountType | "all">("all");
const statusFilter = ref<"all" | "active" | "inactive">("all");

const query = computed<AccountQuery>(() => ({
  search: search.value,
  type: typeFilter.value,
  status: statusFilter.value,
}));

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => accountsRepository.list(company.activeCompanyId, query.value),
  { watch: [() => company.activeCompanyId, () => search.value, () => typeFilter.value, () => statusFilter.value] },
);

const nodes = computed<AccountNode[]>(() => data.value ?? []);

const roots = computed(() => nodes.value.filter((n) => n.depth === 0));
function totalByType(type: AccountType): number {
  return sumBy(
    roots.value.filter((n) => n.type === type),
    (n) => n.balance,
  );
}

const TYPE_CLASS: Record<AccountType, string> = {
  asset: "badge-info",
  liability: "badge-warning",
  equity: "badge-brand",
  revenue: "badge-success",
  expense: "badge-danger",
};

function typeLabel(type: AccountType): string {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

function parentName(node: AccountNode): string {
  if (!node.parent_id) return "—";
  const parent = nodes.value.find((n) => n.id === node.parent_id);
  return parent ? `${parent.code} · ${parent.name}` : "—";
}

const columns: Column[] = [
  { key: "code", header: "Code", class: "num" },
  { key: "name", header: "Account" },
  { key: "type", header: "Type" },
  { key: "parent", header: "Parent" },
  { key: "opening_balance", header: "Opening", align: "right", class: "num" },
  { key: "balance", header: "Balance", align: "right", class: "num" },
  { key: "status", header: "Status" },
  { key: "actions", header: "" },
];

/* ---------------- View / Edit / Create side panel ---------------- */

const viewPanelOpen = ref(false);
const viewing = ref<AccountNode | null>(null);

function openView(node: AccountNode) {
  viewing.value = node;
  viewPanelOpen.value = true;
}

const formOpen = ref(false);
const editing = ref<AccountNode | null>(null);
const form = reactive<AccountInput>({
  code: "",
  name: "",
  type: "asset",
  parent_id: null,
  is_active: true,
  description: "",
  opening_balance: 0,
  opening_balance_date: null,
});

function resetForm() {
  form.code = "";
  form.name = "";
  form.type = "asset";
  form.parent_id = null;
  form.is_active = true;
  form.description = "";
  form.opening_balance = 0;
  form.opening_balance_date = null;
}

function openCreate() {
  editing.value = null;
  resetForm();
  createMutation.reset();
  updateMutation.reset();
  formOpen.value = true;
}

function openEdit(node: AccountNode) {
  editing.value = node;
  form.code = node.code;
  form.name = node.name;
  form.type = node.type;
  form.parent_id = node.parent_id;
  form.is_active = node.is_active;
  form.description = node.description ?? "";
  form.opening_balance = node.opening_balance;
  form.opening_balance_date = node.opening_balance_date;
  createMutation.reset();
  updateMutation.reset();
  formOpen.value = true;
}

const openingLocked = computed(() => Boolean(editing.value && editing.value.transaction_count > 0));

// Watch: when the chosen type changes, drop a parent that no longer matches.
watch(
  () => form.type,
  () => {
    const parent = nodes.value.find((n) => n.id === form.parent_id);
    if (parent && parent.type !== form.type) form.parent_id = null;
  },
);

const createMutation = useMutation(accountsRepository.create);
const updateMutation = useMutation(accountsRepository.update);

const saving = computed(() => createMutation.saving.value || updateMutation.saving.value);
const formError = computed(() => (editing.value ? updateMutation.error.value : createMutation.error.value));
const fieldErrors = computed(() => (editing.value ? updateMutation.fieldErrors.value : createMutation.fieldErrors.value));

async function submitForm() {
  const payload: AccountInput = { ...form, description: form.description?.trim() || undefined };
  const result = editing.value
    ? await updateMutation.run(company.activeCompanyId, editing.value.id, payload)
    : await createMutation.run(company.activeCompanyId, payload);
  if (result) {
    formOpen.value = false;
    await refresh();
  }
}

/* ---------------- Activate / deactivate ---------------- */

const confirmTarget = ref<AccountNode | null>(null);
const statusMutation = useMutation(accountsRepository.setActive);

function requestToggle(node: AccountNode) {
  confirmTarget.value = node;
  statusMutation.reset();
}

async function confirmToggle() {
  if (!confirmTarget.value) return;
  const target = confirmTarget.value;
  const result = await statusMutation.run(company.activeCompanyId, target.id, !target.is_active);
  if (result) {
    confirmTarget.value = null;
    await refresh();
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Chart of Accounts" description="Company account tree with types, parents and running balances.">
      <template #actions>
        <ZButton @click="openCreate">
          <Plus class="size-4" /> New account
        </ZButton>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total assets" :value="formatMoney(totalByType('asset'))" tone="brand" />
      <StatCard label="Total liabilities" :value="formatMoney(totalByType('liability'))" tone="warning" />
      <StatCard label="Revenue" :value="formatMoney(totalByType('revenue'))" tone="success" />
      <StatCard label="Expenses" :value="formatMoney(totalByType('expense'))" tone="danger" />
    </div>

    <Panel>
      <Toolbar>
        <SearchInput v-model="search" placeholder="Search account name or code" />
        <select v-model="typeFilter" class="field w-40" aria-label="Filter by account type">
          <option value="all">All types</option>
          <option v-for="t in ACCOUNT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <select v-model="statusFilter" class="field w-36" aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Toolbar>

      <AsyncSection
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-title="No accounts yet"
        empty-message="Accounts will appear here once created for this company."
        @retry="refresh"
      >
        <DataTable :columns="columns" :rows="nodes" :min-width="1080">
          <template #code="{ row }: { row: AccountNode }">{{ row.code }}</template>
          <template #name="{ row }: { row: AccountNode }">
            <span
              :style="{ paddingLeft: `${row.depth * 16}px` }"
              :class="row.has_children ? 'font-semibold text-content' : 'text-content-secondary'"
            >
              {{ row.name }}
            </span>
          </template>
          <template #type="{ row }: { row: AccountNode }">
            <span :class="`zs-badge ${TYPE_CLASS[row.type]}`">{{ typeLabel(row.type) }}</span>
          </template>
          <template #parent="{ row }: { row: AccountNode }">{{ parentName(row) }}</template>
          <template #opening_balance="{ row }: { row: AccountNode }">{{ formatMoneyOrDash(row.opening_balance) }}</template>
          <template #balance="{ row }: { row: AccountNode }">{{ formatMoney(row.balance) }}</template>
          <template #status="{ row }: { row: AccountNode }">
            <span class="flex flex-wrap items-center gap-1">
              <span :class="row.is_active ? 'zs-badge badge-success' : 'zs-badge badge-neutral'">
                {{ row.is_active ? "Active" : "Inactive" }}
              </span>
              <span v-if="row.is_system" class="zs-badge badge-info">System</span>
            </span>
          </template>
          <template #actions="{ row }: { row: AccountNode }">
            <span class="flex justify-end gap-1">
              <ZButton variant="ghost" @click="openView(row)">View</ZButton>
              <ZButton variant="ghost" @click="openEdit(row)">Edit</ZButton>
              <ZButton variant="ghost" @click="requestToggle(row)">
                {{ row.is_active ? "Deactivate" : "Activate" }}
              </ZButton>
            </span>
          </template>
          <template #footer><span>{{ nodes.length }} accounts</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <!-- View panel -->
    <SidePanel
      :open="viewPanelOpen"
      title="Account details"
      :description="viewing ? `${viewing.code} · ${viewing.name}` : undefined"
      @close="viewPanelOpen = false"
    >
      <div v-if="viewing" class="space-y-4 text-sm">
        <dl class="grid grid-cols-2 gap-3">
          <div>
            <dt class="label-caps">Type</dt>
            <dd class="mt-1"><span :class="`zs-badge ${TYPE_CLASS[viewing.type]}`">{{ typeLabel(viewing.type) }}</span></dd>
          </div>
          <div>
            <dt class="label-caps">Status</dt>
            <dd class="mt-1 flex gap-1">
              <span :class="viewing.is_active ? 'zs-badge badge-success' : 'zs-badge badge-neutral'">
                {{ viewing.is_active ? "Active" : "Inactive" }}
              </span>
              <span v-if="viewing.is_system" class="zs-badge badge-info">System</span>
            </dd>
          </div>
          <div>
            <dt class="label-caps">Parent</dt>
            <dd class="mt-1 text-content-secondary">{{ parentName(viewing) }}</dd>
          </div>
          <div>
            <dt class="label-caps">Currency</dt>
            <dd class="mt-1 text-content-secondary">{{ viewing.currency }}</dd>
          </div>
          <div>
            <dt class="label-caps">Opening balance</dt>
            <dd class="num mt-1 text-content-secondary">{{ formatMoneyOrDash(viewing.opening_balance) }}</dd>
          </div>
          <div>
            <dt class="label-caps">Opening balance date</dt>
            <dd class="num mt-1 text-content-secondary">
              {{ viewing.opening_balance_date ? shortDate(viewing.opening_balance_date) : "—" }}
            </dd>
          </div>
          <div>
            <dt class="label-caps">Closing balance</dt>
            <dd class="num mt-1 font-semibold text-content">{{ formatMoney(viewing.balance) }}</dd>
          </div>
          <div>
            <dt class="label-caps">Posted transactions</dt>
            <dd class="num mt-1 text-content-secondary">{{ viewing.transaction_count }}</dd>
          </div>
        </dl>
        <div v-if="viewing.description">
          <p class="label-caps">Description</p>
          <p class="mt-1 text-content-secondary">{{ viewing.description }}</p>
        </div>
        <p
          v-if="viewing.transaction_count > 0 || viewing.is_system"
          class="rounded-md border border-line bg-surface-sunken p-2.5 text-2xs text-content-muted"
        >
          <template v-if="viewing.is_system">
            This is a system account required by the posting engine. It cannot be deactivated.
          </template>
          <template v-else>
            This account is referenced by {{ viewing.transaction_count }} posted transaction(s) and can only be
            deactivated, never deleted.
          </template>
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
      :title="editing ? 'Edit account' : 'New account'"
      :description="editing ? `${editing.code} · ${editing.name}` : 'Add an account to the chart of accounts.'"
      width="lg"
      @close="formOpen = false"
    >
      <form class="space-y-4" @submit.prevent="submitForm">
        <ValidationMessage :message="formError?.message ?? null" />
        <div class="grid gap-3 sm:grid-cols-2">
          <Field v-model="form.code" label="Code" placeholder="e.g. 1020" />
          <ValidationMessage v-if="fieldErrors['code']" :message="fieldErrors['code']" />
          <Field v-model="form.name" label="Name" />
          <ValidationMessage v-if="fieldErrors['name']" :message="fieldErrors['name']" />
        </div>
        <label class="block">
          <span class="label-caps">Type</span>
          <select v-model="form.type" class="field mt-1.5" :disabled="editing?.is_system">
            <option v-for="t in ACCOUNT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </label>
        <AccountSelect
          v-model="form.parent_id"
          label="Parent account (optional)"
          :types="[form.type]"
          :postable-only="false"
          :error="fieldErrors['parent_id'] ?? null"
          placeholder="No parent — top-level account"
        />
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="form.is_active" class="size-4" />
          <span class="text-sm text-content">Active</span>
        </label>
        <div class="grid gap-3 sm:grid-cols-2">
          <MoneyInput
            v-model="form.opening_balance"
            label="Opening balance"
            :disabled="openingLocked"
            :error="fieldErrors['opening_balance'] ?? null"
          />
          <label class="block">
            <span class="label-caps">Opening balance date</span>
            <input
              type="date"
              class="field mt-1.5"
              :disabled="openingLocked"
              :value="form.opening_balance_date ?? ''"
              @input="form.opening_balance_date = ($event.target as HTMLInputElement).value || null"
            />
            <ValidationMessage :message="fieldErrors['opening_balance_date'] ?? null" />
          </label>
        </div>
        <p v-if="openingLocked" class="text-2xs text-content-muted">
          Opening balance is locked because this account already has posted transactions.
        </p>
        <label class="block">
          <span class="label-caps">Description</span>
          <textarea v-model="form.description" rows="3" class="field mt-1.5" />
        </label>
      </form>
      <template #footer>
        <ZButton variant="outline" @click="formOpen = false">Cancel</ZButton>
        <ZButton :disabled="saving" @click="submitForm">
          {{ saving ? "Saving…" : editing ? "Save changes" : "Create account" }}
        </ZButton>
      </template>
    </SidePanel>

    <ConfirmDialog
      :open="Boolean(confirmTarget)"
      :title="confirmTarget?.is_active ? 'Deactivate account' : 'Activate account'"
      :message="
        confirmTarget?.is_active
          ? `Deactivating ${confirmTarget?.code} · ${confirmTarget?.name} hides it from new postings. It is never deleted.`
          : `Reactivate ${confirmTarget?.code} · ${confirmTarget?.name} for use in new postings.`
      "
      :confirm-label="confirmTarget?.is_active ? 'Deactivate' : 'Activate'"
      :tone="confirmTarget?.is_active ? 'danger' : 'brand'"
      :busy="statusMutation.saving.value"
      @confirm="confirmToggle"
      @cancel="confirmTarget = null"
    >
      <ValidationMessage :message="statusMutation.error.value?.message ?? null" />
    </ConfirmDialog>
  </AppShell>
</template>
