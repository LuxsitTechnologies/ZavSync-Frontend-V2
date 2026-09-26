<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus } from "lucide-vue-next";
import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import StatCard from "@/components/zs/StatCard.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import Field from "@/components/zs/Field.vue";
import ZButton from "@/components/zs/ZButton.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import { useAsyncData } from "@/composables/useAsyncData";
import { operationsRepository } from "@/services/operations/repository";
import { accountsRepository } from "@/services/accounting/accounts.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney, parseMoneyInput } from "@/lib/money";
import { showToast } from "@/composables/useToast";
import { setPageMeta } from "@/lib/page-meta";
import { localDateInput } from "@/lib/format";
import type { Settlement } from "@/types/operations";

setPageMeta("Payment Settlements", "Map merchant gross receipts, fees and net deposits.");
const company = useCompanyStore();
const state = useAsyncData(() => operationsRepository.settlements(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const bankState = useAsyncData(() => operationsRepository.bankAccounts(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const accountState = useAsyncData(() => accountsRepository.selectable(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const rows = computed(() => state.data.value ?? []);
const open = ref(false), provider = ref("JazzCash"), reference = ref(""), date = ref(localDateInput()), gross = ref(""), fees = ref(""), adjustments = ref("0"), destination = ref(""), clearing = ref(""), feeAccount = ref(""), saving = ref(false);
const net = computed(() => (parseMoneyInput(gross.value) ?? 0) - (parseMoneyInput(fees.value) ?? 0) + (parseMoneyInput(adjustments.value, { allowNegative: true }) ?? 0));
const assetAccounts = computed(() => (accountState.data.value ?? []).filter((account) => account.type === "asset" && account.is_active));
const feeAccounts = computed(() => (accountState.data.value ?? []).filter((account) => (account.type === "expense" || account.type === "revenue") && account.is_active));
const columns: Column[] = [{ key: "provider", header: "Provider" }, { key: "reference", header: "Settlement" }, { key: "date", header: "Date" }, { key: "gross", header: "Gross", align: "right", class: "num" }, { key: "fees", header: "Fees", align: "right", class: "num" }, { key: "net", header: "Net deposit", align: "right", class: "num" }, { key: "bank", header: "Bank account" }, { key: "status", header: "Status" }];

async function save() {
  const grossAmount = parseMoneyInput(gross.value), feeAmount = parseMoneyInput(fees.value), adjustmentAmount = parseMoneyInput(adjustments.value, { allowNegative: true });
  if (!reference.value || grossAmount === null || feeAmount === null || adjustmentAmount === null || !destination.value || !clearing.value || !feeAccount.value || net.value <= 0) {
    showToast("Complete settlement details", "Gross, fee, bank, clearing and fee accounts are required.", "danger"); return;
  }
  saving.value = true;
  try {
    await operationsRepository.createSettlement(company.activeCompanyId, { provider: provider.value, settlement_reference: reference.value, settlement_date: date.value, gross_amount: grossAmount, fee_amount: feeAmount, adjustment_amount: adjustmentAmount, net_amount: net.value, destination_financial_account_id: destination.value, clearing_account_id: clearing.value, fee_account_id: feeAccount.value });
    open.value = false; reference.value = ""; gross.value = ""; fees.value = ""; adjustments.value = "0";
    await state.refresh(); showToast("Settlement posted", "Net bank, gateway fee and clearing entries were posted as one accounting event.");
  } finally { saving.value = false; }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Payment Settlements" description="JazzCash, Easypaisa, Stripe and terminal deposit mapping"><template #actions><ZButton @click="open = true"><Plus class="size-4" />New settlement</ZButton></template></PageHeader>
    <div class="mb-4 grid gap-3 sm:grid-cols-3"><StatCard label="Gross collected" :value="formatMoney(rows.reduce((sum, item) => sum + item.gross, 0))" tone="brand" /><StatCard label="Processing fees" :value="formatMoney(rows.reduce((sum, item) => sum + item.fees, 0))" tone="warning" /><StatCard label="Net deposits" :value="formatMoney(rows.reduce((sum, item) => sum + item.net, 0))" tone="success" /></div>
    <Panel><AsyncSection :loading="state.loading.value" :error="state.error.value" :empty="state.isEmpty.value" @retry="state.refresh"><DataTable :columns="columns" :rows="rows" :min-width="1050"><template #provider="{ row }: { row: Settlement }"><span class="font-medium text-content">{{ row.provider }}</span></template><template #reference="{ row }">{{ row.reference }}</template><template #date="{ row }">{{ row.date }}</template><template #gross="{ row }">{{ formatMoney(row.gross) }}</template><template #fees="{ row }">{{ formatMoney(row.fees) }}</template><template #net="{ row }">{{ formatMoney(row.net) }}</template><template #bank="{ row }">{{ row.bank_account }}</template><template #status="{ row }"><StatusBadge :status="row.status" /></template></DataTable></AsyncSection></Panel>
    <SidePanel :open="open" title="New gateway settlement" description="Gross less fees plus adjustments must equal the net bank payout." @close="open = false"><form class="space-y-4" @submit.prevent="save"><label class="block"><span class="label-caps">Provider</span><select v-model="provider" class="field mt-1.5 w-full"><option>JazzCash</option><option>Easypaisa</option><option>Stripe</option><option>Card terminal</option></select></label><Field v-model="reference" label="Settlement reference" required /><Field v-model="date" label="Settlement date" type="date" required /><div class="grid grid-cols-2 gap-3"><Field v-model="gross" label="Gross amount" required /><Field v-model="fees" label="Fees" required /></div><Field v-model="adjustments" label="Adjustments" /><p class="rounded-md bg-surface-sunken p-3 text-sm text-content-secondary">Net payout <span class="num float-right font-semibold text-content">{{ formatMoney(net) }}</span></p><label class="block"><span class="label-caps">Destination bank</span><select v-model="destination" class="field mt-1.5 w-full" required><option value="">Select bank</option><option v-for="account in (bankState.data.value ?? []).filter((item) => item.type === 'bank')" :key="account.id" :value="account.id">{{ account.name }}</option></select></label><label class="block"><span class="label-caps">Gateway clearing account</span><select v-model="clearing" class="field mt-1.5 w-full" required><option value="">Select asset account</option><option v-for="account in assetAccounts" :key="account.id" :value="account.id">{{ account.code }} · {{ account.name }}</option></select></label><label class="block"><span class="label-caps">Gateway fee account</span><select v-model="feeAccount" class="field mt-1.5 w-full" required><option value="">Select fee account</option><option v-for="account in feeAccounts" :key="account.id" :value="account.id">{{ account.code }} · {{ account.name }}</option></select></label><ZButton type="submit" :disabled="saving">{{ saving ? "Posting…" : "Post settlement" }}</ZButton></form></SidePanel>
  </AppShell>
</template>
