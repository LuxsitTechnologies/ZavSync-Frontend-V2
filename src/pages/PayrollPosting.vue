<script setup lang="ts">
import { computed, ref } from "vue";
import { Lock, TriangleAlert } from "lucide-vue-next";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import StatCard from "@/components/zs/StatCard.vue";
import ZButton from "@/components/zs/ZButton.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import SidePanel from "@/components/zs/SidePanel.vue";
import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { localDateInput, shortDate } from "@/lib/format";
import { formatMoney, formatMoneyOrDash, parseMoneyInput, toMoneyInput } from "@/lib/money";
import { setPageMeta } from "@/lib/page-meta";
import { accountMappingsRepository } from "@/services/accounting/account-mappings.repository";
import { accountsRepository } from "@/services/accounting/accounts.repository";
import { payrollRepository } from "@/services/payroll/payroll.repository";
import { useCompanyStore } from "@/stores/company";
import type { AccountMappingKey } from "@/types/accounting";
import type { PayrollBatch, PayrollLiabilityRow, PayrollPostingLine, PayrollReconciliation } from "@/types/payroll";

setPageMeta("Payroll Posting", "Post approved payroll, settle liabilities and reconcile payroll to the general ledger.");

const company = useCompanyStore();
const listState = useAsyncData(() => payrollRepository.batches(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const mappingsState = useAsyncData(() => accountMappingsRepository.list(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const accountState = useAsyncData(() => accountsRepository.selectable(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const financialAccountState = useAsyncData(() => payrollRepository.financialAccounts(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const liabilityState = useAsyncData(() => payrollRepository.liabilities(company.activeCompanyId), { watch: [() => company.activeCompanyId] });

const requiredPayrollMappings = new Set<AccountMappingKey>(["salary_expense", "payroll_net_payable"]);
const missingMappings = computed(() => (mappingsState.data.value ?? []).filter((mapping) => requiredPayrollMappings.has(mapping.key) && !mapping.account_id));
const pendingBatches = computed(() => (listState.data.value ?? []).filter((batch) => !["POSTED", "PARTIALLY_PAID", "PAID", "CANCELLED"].includes(batch.status)));
const postedBatches = computed(() => (listState.data.value ?? []).filter((batch) => ["POSTED", "PARTIALLY_PAID", "PAID"].includes(batch.status)));
const totalPostedExpense = computed(() => postedBatches.value.reduce((sum, batch) => sum + batch.employer_total_cost, 0));
const totalOutstanding = computed(() => liabilityState.data.value?.outstanding_total ?? 0);

const columns: Column[] = [
  { key: "run", header: "Run" }, { key: "period", header: "Period" }, { key: "pay_date", header: "Pay date", class: "num" },
  { key: "employees", header: "Employees", align: "right", class: "num" }, { key: "gross", header: "Gross", align: "right", class: "num" },
  { key: "deductions", header: "Deductions", align: "right", class: "num" }, { key: "employer", header: "Employer contrib.", align: "right", class: "num" },
  { key: "net", header: "Net pay", align: "right", class: "num font-medium" }, { key: "status", header: "Status" },
  { key: "posting_date", header: "Posting date", class: "num" }, { key: "journal", header: "Journal" }, { key: "actions", header: "", align: "right" },
];

function statusClass(status: PayrollBatch["status"]): string {
  if (["POSTED", "PAID"].includes(status)) return "badge-success";
  if (status === "PARTIALLY_PAID") return "badge-warning";
  if (status === "CANCELLED") return "badge-neutral";
  return "badge-info";
}

function liabilitiesFor(batchId: string, type?: PayrollLiabilityRow["liability_type"]): PayrollLiabilityRow[] {
  return (liabilityState.data.value?.rows ?? []).filter((row) => row.batch_id === batchId && (!type || row.liability_type === type));
}

function liabilityOutstanding(batchId: string, type?: PayrollLiabilityRow["liability_type"]): number {
  return liabilitiesFor(batchId, type).reduce((sum, row) => sum + row.outstanding_amount, 0);
}

function accountLabel(accountId: string): string {
  const account = (accountState.data.value ?? []).find((item) => item.id === accountId);
  return account ? `${account.code} · ${account.name}` : accountId;
}

async function refreshOperationalData(): Promise<void> {
  await Promise.all([listState.refresh(), liabilityState.refresh()]);
}

const reviewOpen = ref(false);
const reviewBatch = ref<PayrollBatch | null>(null);
const preview = ref<PayrollPostingLine[]>([]);
const previewMutation = useMutation((id: string) => payrollRepository.postingPreview(company.activeCompanyId, id));
const postMutation = useMutation((id: string) => payrollRepository.post(company.activeCompanyId, id));
const postDialogOpen = ref(false);

async function openReview(batch: PayrollBatch): Promise<void> {
  reviewBatch.value = batch;
  preview.value = [];
  postMutation.reset();
  previewMutation.reset();
  reviewOpen.value = true;
  const result = await previewMutation.run(batch.id);
  if (result) preview.value = result;
}

const previewTotals = computed(() => ({
  debit: preview.value.reduce((sum, line) => sum + line.debit, 0),
  credit: preview.value.reduce((sum, line) => sum + line.credit, 0),
}));
const previewBalanced = computed(() => preview.value.length > 0 && previewTotals.value.debit === previewTotals.value.credit);
const canPost = computed(() => reviewBatch.value?.status === "APPROVED" && previewBalanced.value && missingMappings.value.length === 0);

async function confirmPost(): Promise<void> {
  if (!reviewBatch.value || !canPost.value) return;
  if (await postMutation.run(reviewBatch.value.id)) {
    postDialogOpen.value = false;
    reviewOpen.value = false;
    await refreshOperationalData();
  }
}

const payOpen = ref(false);
const payBatch = ref<PayrollBatch | null>(null);
const payment = ref({ financial_account_id: "", payment_date: localDateInput(), amount: "", reference: "" });
const payMutation = useMutation((id: string, amount: number) => payrollRepository.payBatch(company.activeCompanyId, id, { ...payment.value, amount }));

function openPayment(batch: PayrollBatch): void {
  payBatch.value = batch;
  payment.value = { financial_account_id: "", payment_date: localDateInput(), amount: toMoneyInput(liabilityOutstanding(batch.id, "NET_PAY")), reference: "" };
  payMutation.reset();
  payOpen.value = true;
}

async function savePayment(): Promise<void> {
  if (!payBatch.value) return;
  const amount = parseMoneyInput(payment.value.amount);
  if (!amount) return;
  if (await payMutation.run(payBatch.value.id, amount)) {
    payOpen.value = false;
    await refreshOperationalData();
  }
}

type SettleableLiability = Exclude<PayrollLiabilityRow["liability_type"], "NET_PAY">;
const settleOpen = ref(false);
const settleBatch = ref<PayrollBatch | null>(null);
const settlement = ref<{ liability_type: SettleableLiability | ""; financial_account_id: string; payment_date: string; amount: string; reference: string }>({ liability_type: "", financial_account_id: "", payment_date: localDateInput(), amount: "", reference: "" });
const settlementMutation = useMutation((batchId: string, liabilityType: SettleableLiability, amount: number) => payrollRepository.settleLiability(company.activeCompanyId, { payroll_batch_id: batchId, liability_type: liabilityType, financial_account_id: settlement.value.financial_account_id, payment_date: settlement.value.payment_date, amount, reference: settlement.value.reference }));
const settleableTypes = computed(() => {
  if (!settleBatch.value) return [] as SettleableLiability[];
  return [...new Set(liabilitiesFor(settleBatch.value.id).filter((row) => row.liability_type !== "NET_PAY" && row.outstanding_amount > 0).map((row) => row.liability_type as SettleableLiability))];
});

function selectSettlementType(type: SettleableLiability | ""): void {
  settlement.value.liability_type = type;
  settlement.value.amount = type && settleBatch.value ? toMoneyInput(liabilityOutstanding(settleBatch.value.id, type)) : "";
}

function openSettlement(batch: PayrollBatch): void {
  settleBatch.value = batch;
  settlementMutation.reset();
  const types = [...new Set(liabilitiesFor(batch.id).filter((row) => row.liability_type !== "NET_PAY" && row.outstanding_amount > 0).map((row) => row.liability_type as SettleableLiability))];
  settlement.value = { liability_type: "", financial_account_id: "", payment_date: localDateInput(), amount: "", reference: "" };
  selectSettlementType(types[0] ?? "");
  settleOpen.value = true;
}

async function saveSettlement(): Promise<void> {
  if (!settleBatch.value || !settlement.value.liability_type) return;
  const amount = parseMoneyInput(settlement.value.amount);
  if (!amount) return;
  if (await settlementMutation.run(settleBatch.value.id, settlement.value.liability_type, amount)) {
    settleOpen.value = false;
    await liabilityState.refresh();
  }
}

const reconciliationOpen = ref(false);
const reconciliation = ref<PayrollReconciliation | null>(null);
const reconciliationMutation = useMutation((id: string) => payrollRepository.reconciliation(company.activeCompanyId, id));
async function openReconciliation(batch: PayrollBatch): Promise<void> {
  reconciliation.value = null;
  reconciliationMutation.reset();
  reconciliationOpen.value = true;
  const result = await reconciliationMutation.run(batch.id);
  if (result) reconciliation.value = result;
}

const reverseOpen = ref(false);
const reverseBatch = ref<PayrollBatch | null>(null);
const reverseDate = ref("");
const reverseReason = ref("");
const reverseMutation = useMutation((id: string, date: string, reason: string) => payrollRepository.reverse(company.activeCompanyId, id, date, reason));
function openReverse(batch: PayrollBatch): void {
  reverseBatch.value = batch;
  reverseDate.value = localDateInput();
  reverseReason.value = "";
  reverseMutation.reset();
  reverseOpen.value = true;
}
async function confirmReverse(): Promise<void> {
  if (!reverseBatch.value || !reverseDate.value || !reverseReason.value.trim()) return;
  if (await reverseMutation.run(reverseBatch.value.id, reverseDate.value, reverseReason.value.trim())) {
    reverseOpen.value = false;
    await refreshOperationalData();
  }
}
</script>

<template>
  <AppShell>
    <PageHeader title="Payroll Posting" description="Post approved payroll, pay employees, settle statutory liabilities and reconcile to the ledger." />

    <div v-if="missingMappings.length" class="mb-4 flex items-start gap-2 rounded-md border border-warning-subtle bg-warning-subtle p-3 text-sm text-warning-strong">
      <TriangleAlert class="mt-0.5 size-4 shrink-0" />
      <p>Required payroll mappings are missing: {{ missingMappings.map((mapping) => mapping.label).join(", ") }}. <RouterLink to="/accounting/setup" class="underline">Configure account mappings</RouterLink> before posting.</p>
    </div>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Runs awaiting posting" :value="String(pendingBatches.length)" tone="warning" />
      <StatCard label="Posted runs" :value="String(postedBatches.length)" tone="success" />
      <StatCard label="Posted employer cost" :value="formatMoney(totalPostedExpense)" />
      <StatCard label="Payroll liabilities outstanding" :value="formatMoney(totalOutstanding)" tone="brand" />
    </div>

    <Panel title="Payroll runs">
      <AsyncSection :loading="listState.loading.value" :error="listState.error.value" :empty="listState.isEmpty.value" empty-title="No payroll runs" empty-message="Create and approve a payroll batch before posting it." @retry="listState.refresh">
        <DataTable :columns="columns" :rows="listState.data.value ?? []" :min-width="1420">
          <template #run="{ row }: { row: PayrollBatch }"><div class="leading-tight"><p class="font-medium text-content">{{ row.number }}</p><p class="num text-2xs text-content-muted">{{ row.id }}</p></div></template>
          <template #period="{ row }: { row: PayrollBatch }">{{ row.period?.name ?? "—" }}</template>
          <template #pay_date="{ row }: { row: PayrollBatch }">{{ row.period?.pay_date ? shortDate(row.period.pay_date) : "—" }}</template>
          <template #employees="{ row }: { row: PayrollBatch }">{{ row.employee_count }}</template>
          <template #gross="{ row }: { row: PayrollBatch }">{{ formatMoney(row.gross_earnings) }}</template>
          <template #deductions="{ row }: { row: PayrollBatch }">{{ formatMoneyOrDash(row.employee_deductions + row.employee_contributions + row.tax_amount) }}</template>
          <template #employer="{ row }: { row: PayrollBatch }">{{ formatMoneyOrDash(row.employer_contributions) }}</template>
          <template #net="{ row }: { row: PayrollBatch }">{{ formatMoney(row.net_pay) }}</template>
          <template #status="{ row }: { row: PayrollBatch }"><span class="inline-flex items-center gap-1.5"><span :class="`zs-badge ${statusClass(row.status)}`">{{ row.status.replaceAll("_", " ") }}</span><Lock v-if="['POSTED','PARTIALLY_PAID','PAID'].includes(row.status)" class="size-3.5 text-content-muted" aria-label="Locked against financial changes" /></span></template>
          <template #posting_date="{ row }: { row: PayrollBatch }">{{ shortDate(row.accounting_date) }}</template>
          <template #journal="{ row }: { row: PayrollBatch }"><RouterLink v-if="row.journal_id" :to="`/accounting/journals/${row.journal_id}`" class="text-content-brand hover:underline">View journal</RouterLink><span v-else class="text-content-muted">—</span></template>
          <template #actions="{ row }: { row: PayrollBatch }">
            <div class="flex justify-end gap-1">
              <ZButton v-if="row.status === 'APPROVED'" variant="outline" @click="openReview(row)">Review &amp; post</ZButton>
              <ZButton v-if="['POSTED','PARTIALLY_PAID'].includes(row.status) && liabilityOutstanding(row.id, 'NET_PAY') > 0" variant="outline" @click="openPayment(row)">Pay salaries</ZButton>
              <ZButton v-if="['POSTED','PARTIALLY_PAID','PAID'].includes(row.status) && liabilityOutstanding(row.id) - liabilityOutstanding(row.id, 'NET_PAY') > 0" variant="ghost" @click="openSettlement(row)">Settle liabilities</ZButton>
              <ZButton v-if="['POSTED','PARTIALLY_PAID','PAID'].includes(row.status)" variant="ghost" @click="openReconciliation(row)">Reconcile</ZButton>
              <ZButton v-if="row.status === 'POSTED'" variant="ghost" @click="openReverse(row)">Reverse</ZButton>
            </div>
          </template>
          <template #footer><span>{{ (listState.data.value ?? []).length }} runs</span><span>Operational liabilities are reconciled to the authoritative GL.</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <Panel title="Outstanding liabilities" class="mt-4">
      <AsyncSection :loading="liabilityState.loading.value" :error="liabilityState.error.value" :empty="(liabilityState.data.value?.totals.length ?? 0) === 0" empty-title="No payroll liabilities" empty-message="Liabilities appear after a payroll batch is posted." @retry="liabilityState.refresh">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard v-for="total in liabilityState.data.value?.totals ?? []" :key="total.liability_type" :label="total.liability_type.replaceAll('_', ' ')" :value="formatMoney(total.outstanding_amount)" :hint="`${formatMoney(total.settled_amount)} settled`" />
        </div>
      </AsyncSection>
    </Panel>

    <SidePanel :open="reviewOpen" title="Review &amp; post payroll run" :description="reviewBatch ? `${reviewBatch.number} · ${reviewBatch.period?.name ?? reviewBatch.accounting_date}` : undefined" width="lg" @close="reviewOpen = false">
      <template v-if="reviewBatch">
        <div class="mb-4 rounded-md border border-line bg-surface-subtle p-3 text-sm"><p class="label-caps">Authoritative posting date</p><p class="mt-1 font-medium text-content">{{ shortDate(reviewBatch.accounting_date) }}</p><p class="mt-1 text-xs text-content-muted">The approved batch accounting date is used by the backend and cannot be changed here.</p></div>
        <p v-if="previewMutation.saving.value" class="text-sm text-content-muted">Preparing journal preview…</p>
        <p v-else-if="previewMutation.error.value" class="rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{{ previewMutation.error.value.message }}</p>
        <template v-else-if="preview.length">
          <p class="label-caps mb-2">Journal preview</p>
          <div class="max-w-full overflow-x-auto"><table class="w-full min-w-[620px] text-sm"><thead><tr class="table-head"><th class="px-3 py-2 text-left">Description</th><th class="px-3 py-2 text-left">Account</th><th class="px-3 py-2 text-right">Debit</th><th class="px-3 py-2 text-right">Credit</th></tr></thead><tbody><tr v-for="(line, index) in preview" :key="`${line.related_id}-${index}`" class="table-row-zs"><td class="px-3 py-2 text-content-secondary">{{ line.description }}</td><td class="px-3 py-2 text-content-secondary">{{ accountLabel(line.account_id) }}</td><td class="px-3 py-2 num text-right">{{ formatMoneyOrDash(line.debit) }}</td><td class="px-3 py-2 num text-right">{{ formatMoneyOrDash(line.credit) }}</td></tr></tbody><tfoot><tr class="border-t border-line font-medium text-content"><td class="px-3 py-2" colspan="2">Total</td><td class="px-3 py-2 num text-right">{{ formatMoney(previewTotals.debit) }}</td><td class="px-3 py-2 num text-right">{{ formatMoney(previewTotals.credit) }}</td></tr></tfoot></table></div>
          <p class="mt-2 text-xs" :class="previewBalanced ? 'text-success' : 'text-danger'">{{ previewBalanced ? "Balanced — debit equals credit." : "Unbalanced — this payroll cannot be posted." }}</p>
        </template>
        <p v-if="postMutation.error.value" class="mt-3 text-xs text-danger">{{ postMutation.error.value.message }}</p>
      </template>
      <template #footer><ZButton variant="outline" @click="reviewOpen = false">Cancel</ZButton><ZButton :disabled="!canPost" @click="postDialogOpen = true">Post to ledger</ZButton></template>
    </SidePanel>

    <ConfirmDialog :open="postDialogOpen" title="Post payroll run" :message="`Posting locks ${reviewBatch?.number ?? 'this run'} against financial modification and creates its authoritative journal.`" confirm-label="Post run" :busy="postMutation.saving.value" @confirm="confirmPost" @cancel="postDialogOpen = false" />

    <SidePanel :open="payOpen" title="Pay salaries" :description="payBatch?.number" @close="payOpen = false">
      <form class="space-y-4" @submit.prevent="savePayment"><p class="rounded-md bg-surface-subtle p-3 text-xs text-content-secondary">Outstanding employee net pay: <strong class="text-content">{{ formatMoney(payBatch ? liabilityOutstanding(payBatch.id, 'NET_PAY') : 0) }}</strong>. Enter the full amount or a smaller amount for a partial payment.</p><label class="block"><span class="label-caps">Financial account</span><select v-model="payment.financial_account_id" class="field mt-1.5 w-full" required><option value="">Select bank or cash</option><option v-for="account in (financialAccountState.data.value ?? []).filter((item) => item.is_active)" :key="account.id" :value="account.id">{{ account.name }} · {{ account.currency }}</option></select></label><label class="block"><span class="label-caps">Payment date</span><input v-model="payment.payment_date" type="date" class="field mt-1.5 w-full" required /></label><label class="block"><span class="label-caps">Amount (PKR)</span><input v-model="payment.amount" class="field mt-1.5 w-full" inputmode="decimal" required /></label><label class="block"><span class="label-caps">Reference</span><input v-model="payment.reference" class="field mt-1.5 w-full" /></label><p v-if="payMutation.error.value" class="text-xs text-danger">{{ payMutation.error.value.message }}</p><ZButton type="submit" :disabled="payMutation.saving.value">Record salary payment</ZButton></form>
    </SidePanel>

    <SidePanel :open="settleOpen" title="Settle payroll liability" :description="settleBatch?.number" @close="settleOpen = false">
      <form class="space-y-4" @submit.prevent="saveSettlement"><label class="block"><span class="label-caps">Liability</span><select :value="settlement.liability_type" class="field mt-1.5 w-full" required @change="selectSettlementType(($event.target as HTMLSelectElement).value as SettleableLiability)"><option value="">Select liability</option><option v-for="type in settleableTypes" :key="type" :value="type">{{ type.replaceAll('_', ' ') }} · {{ formatMoney(settleBatch ? liabilityOutstanding(settleBatch.id, type) : 0) }}</option></select></label><label class="block"><span class="label-caps">Financial account</span><select v-model="settlement.financial_account_id" class="field mt-1.5 w-full" required><option value="">Select bank or cash</option><option v-for="account in (financialAccountState.data.value ?? []).filter((item) => item.is_active)" :key="account.id" :value="account.id">{{ account.name }} · {{ account.currency }}</option></select></label><label class="block"><span class="label-caps">Payment date</span><input v-model="settlement.payment_date" type="date" class="field mt-1.5 w-full" required /></label><label class="block"><span class="label-caps">Amount (PKR)</span><input v-model="settlement.amount" class="field mt-1.5 w-full" inputmode="decimal" required /></label><label class="block"><span class="label-caps">Reference</span><input v-model="settlement.reference" class="field mt-1.5 w-full" /></label><p v-if="settlementMutation.error.value" class="text-xs text-danger">{{ settlementMutation.error.value.message }}</p><ZButton type="submit" :disabled="settlementMutation.saving.value">Record settlement</ZButton></form>
    </SidePanel>

    <SidePanel :open="reconciliationOpen" title="Payroll / GL reconciliation" :description="reconciliation?.batch_number" @close="reconciliationOpen = false">
      <p v-if="reconciliationMutation.saving.value" class="text-sm text-content-muted">Reconciling operational payroll liabilities to the general ledger…</p><p v-else-if="reconciliationMutation.error.value" class="text-sm text-danger">{{ reconciliationMutation.error.value.message }}</p><div v-else-if="reconciliation" class="space-y-4"><div class="grid gap-3 sm:grid-cols-2"><StatCard label="Operational outstanding" :value="formatMoney(reconciliation.operational_outstanding)" /><StatCard label="GL liability balance" :value="formatMoney(reconciliation.liability_gl_balance)" /><StatCard label="Liability difference" :value="formatMoney(reconciliation.liability_difference)" :tone="reconciliation.liabilities_reconciled ? 'success' : 'danger'" /><StatCard label="Journal difference" :value="formatMoney(reconciliation.difference)" :tone="reconciliation.balanced ? 'success' : 'danger'" /></div><p class="rounded-md border border-line p-3 text-sm" :class="reconciliation.liabilities_reconciled && reconciliation.balanced ? 'text-success' : 'text-danger'">{{ reconciliation.liabilities_reconciled && reconciliation.balanced ? "Payroll operational liabilities reconcile to the authoritative general ledger." : "Payroll does not currently reconcile. Review the journal and settlement records before continuing." }}</p></div>
    </SidePanel>

    <ConfirmDialog :open="reverseOpen" title="Reverse posting" :message="`This creates a reversing journal for ${reverseBatch?.number ?? 'this run'}. The original journal is retained.`" confirm-label="Reverse" tone="danger" :busy="reverseMutation.saving.value" @confirm="confirmReverse" @cancel="reverseOpen = false"><div class="space-y-3"><label class="block"><span class="label-caps">Reversal date</span><input v-model="reverseDate" type="date" class="field mt-1 w-full" required /></label><label class="block"><span class="label-caps">Reason</span><textarea v-model="reverseReason" rows="3" class="field mt-1 w-full" required /></label><p v-if="reverseMutation.error.value" class="text-xs text-danger">{{ reverseMutation.error.value.message }}</p></div></ConfirmDialog>
  </AppShell>
</template>
