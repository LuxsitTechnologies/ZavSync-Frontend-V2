<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus, Landmark } from "lucide-vue-next";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { useCompanyStore } from "@/stores/company";
import { operationsRepository } from "@/services/operations/repository";
import { accountsRepository } from "@/services/accounting/accounts.repository";
import { formatMoney } from "@/lib/money";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import type { BankAccount } from "@/types/operations";

setPageMeta("Bank & Cash Accounts", "Manage company bank and cash accounts.");
const company = useCompanyStore();
const state = useAsyncData(() => operationsRepository.bankAccounts(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const accountState = useAsyncData(() => accountsRepository.selectable(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const open = ref(false), editingId = ref<string | null>(null), name = ref(""), institution = ref(""), type = ref<"bank" | "cash">("bank"), glAccountId = ref(""), isDefault = ref(false), saving = ref(false);
const rows = computed(() => state.data.value ?? []);
const assetAccounts = computed(() => (accountState.data.value ?? []).filter((account) => account.type === "asset" && account.is_active));
const balance = computed(() => rows.value.reduce((sum, item) => sum + item.balance, 0));
const columns: Column[] = [{ key: "account", header: "Account" }, { key: "type", header: "Type" }, { key: "currency", header: "Currency" }, { key: "balance", header: "Book balance", align: "right", class: "num" }, { key: "statement", header: "Statement balance", align: "right", class: "num" }, { key: "status", header: "Status" }, { key: "actions", header: "" }];

function startCreate() { editingId.value = null; name.value = ""; institution.value = ""; type.value = "bank"; glAccountId.value = ""; isDefault.value = rows.value.every((item) => item.type !== "bank"); open.value = true; }
function startEdit(account: BankAccount) { editingId.value = account.id; name.value = account.name; institution.value = account.institution === "Cash account" ? "" : account.institution; type.value = account.type; glAccountId.value = account.gl_account_id; isDefault.value = account.is_default; open.value = true; }
async function deactivate(account: BankAccount) { await operationsRepository.updateBankAccount(company.activeCompanyId, account.id, { name: account.name, type: account.type, bank_name: account.type === "bank" ? account.institution : null, currency: account.currency, gl_account_id: account.gl_account_id, is_default: false, is_active: false }); await state.refresh(); showToast("Account deactivated", "Historical evidence and balances remain intact."); }

async function save() {
  if (!name.value.trim() || !glAccountId.value || (type.value === "bank" && !institution.value.trim())) {
    showToast("Complete required fields", "Select a linked asset account and provide the account details.", "danger");
    return;
  }
  saving.value = true;
  try {
    const input = { name: name.value.trim(), type: type.value, bank_name: type.value === "bank" ? institution.value.trim() : null, currency: "PKR", gl_account_id: glAccountId.value, is_default: isDefault.value, is_active: true };
    if (editingId.value) await operationsRepository.updateBankAccount(company.activeCompanyId, editingId.value, input); else await operationsRepository.createBankAccount(company.activeCompanyId, input);
    open.value = false; name.value = ""; institution.value = ""; glAccountId.value = "";
    await state.refresh();
    showToast(editingId.value ? "Account updated" : "Account created", "The linked GL account supplies the authoritative book balance.");
  } finally { saving.value = false; }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Bank & Cash Accounts" description="Balances and account connections scoped to the active company"><template #actions><ZButton @click="startCreate"><Plus class="size-4" />Add account</ZButton></template></PageHeader>
    <div class="mb-4 grid gap-3 sm:grid-cols-3"><StatCard label="Total book balance" :value="formatMoney(balance)" tone="brand" /><StatCard label="Statement funds" :value="formatMoney(rows.reduce((sum, item) => sum + (item.statement_balance ?? 0), 0))" tone="success" /><StatCard label="Active accounts" :value="String(rows.filter((item) => item.status === 'active').length)" /></div>
    <Panel><AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="state.isEmpty.value" @retry="state.refresh"><DataTable :columns="columns" :rows="rows" :min-width="950"><template #account="{ row }: { row: BankAccount }"><div class="flex items-center gap-2"><span class="grid size-8 place-items-center rounded-md bg-primary-subtle text-primary-subtle-fg"><Landmark class="size-4" /></span><div><p class="font-medium text-content">{{ row.name }}</p><p class="text-2xs text-content-muted">{{ row.institution }} · {{ row.masked_number }} <span v-if="row.is_default">· Default</span></p></div></div></template><template #type="{ row }"><span class="capitalize">{{ row.type }}</span></template><template #currency="{ row }">{{ row.currency }}</template><template #balance="{ row }">{{ formatMoney(row.balance) }}</template><template #statement="{ row }">{{ row.statement_balance === null ? "—" : formatMoney(row.statement_balance) }}</template><template #status="{ row }"><StatusBadge :status="row.status" /></template><template #actions="{ row }: { row: BankAccount }"><div class="flex justify-end gap-1"><ZButton variant="ghost" @click="startEdit(row)">Edit</ZButton><ZButton v-if="row.status === 'active'" variant="ghost" @click="deactivate(row)">Deactivate</ZButton></div></template></DataTable></AsyncSection></Panel>
    <SidePanel :open="open" :title="editingId ? 'Edit financial account' : 'Add bank or cash account'" description="Link the financial account to its authoritative company-owned GL asset account." @close="open = false"><form class="space-y-4" @submit.prevent="save"><Field v-model="name" label="Account name" required /><Field v-if="type === 'bank'" v-model="institution" label="Institution" required /><label class="block"><span class="label-caps">Account type</span><select v-model="type" class="field mt-1.5 w-full"><option value="bank">Bank</option><option value="cash">Cash</option></select></label><label class="block"><span class="label-caps">Linked GL account</span><select v-model="glAccountId" class="field mt-1.5 w-full" required><option value="">Select asset account</option><option v-for="account in assetAccounts" :key="account.id" :value="account.id">{{ account.code }} · {{ account.name }}</option></select></label><label class="flex items-center gap-2 text-sm text-content-secondary"><input v-model="isDefault" type="checkbox" />Default {{ type }} account</label><ZButton type="submit" :disabled="saving">{{ saving ? "Saving…" : editingId ? "Save changes" : "Save account" }}</ZButton></form></SidePanel>
  </AppShell>
</template>
