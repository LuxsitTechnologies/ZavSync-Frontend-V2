<script setup lang="ts">
/**
 * A7 — Payroll ↔ accounting posting integration.
 *
 * Account mappings come entirely from the company's accounting configuration
 * (`payrollPostingRepository.mappings`) — nothing here hard-codes jurisdiction
 * accounts. Posted runs are immutable; the only way to reopen one for
 * financial changes is an explicit reversal.
 */
import { computed, ref, watch } from "vue";
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
import { useCompanyStore } from "@/stores/company";
import { payrollPostingRepository } from "@/services/accounting/payroll-posting.repository";
import { periodsRepository } from "@/services/accounting/periods.repository";
import { formatMoney, formatMoneyOrDash } from "@/lib/money";
import { shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { PayrollPosting } from "@/types/accounting";

setPageMeta("Payroll Posting", "Review and post payroll runs to the general ledger.");

const company = useCompanyStore();

const listState = useAsyncData(
  () => payrollPostingRepository.list(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);
const mappingsState = useAsyncData(
  () => payrollPostingRepository.mappings(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const missingMappings = computed(() =>
  (mappingsState.data.value ?? []).filter((m) => m.required && !m.account_id),
);

const runsNotPosted = computed(() => (listState.data.value ?? []).filter((r) => r.accounting_status === "not_posted"));
const runsPosted = computed(() => (listState.data.value ?? []).filter((r) => r.accounting_status === "posted"));
const totalPostedExpense = computed(() => runsPosted.value.reduce((s, r) => s + r.gross, 0));
const totalPayableOutstanding = computed(() => runsPosted.value.reduce((s, r) => s + r.net_pay, 0));

const columns: Column[] = [
  { key: "run", header: "Run" },
  { key: "period", header: "Period" },
  { key: "pay_date", header: "Pay date", class: "num" },
  { key: "employees", header: "Employees", align: "right", class: "num" },
  { key: "gross", header: "Gross", align: "right", class: "num" },
  { key: "deductions", header: "Deductions", align: "right", class: "num" },
  { key: "employer", header: "Employer contrib.", align: "right", class: "num" },
  { key: "net", header: "Net pay", align: "right", class: "num font-medium" },
  { key: "status", header: "Status" },
  { key: "posting_date", header: "Posting date", class: "num" },
  { key: "journal", header: "Journal" },
  { key: "actions", header: "", align: "right" },
];

/* ---------------- Review & post side panel ---------------- */

const reviewOpen = ref(false);
const reviewRun = ref<PayrollPosting | null>(null);
const postingDate = ref("");
const periodClosedName = ref<string | null>(null);

function openReview(run: PayrollPosting) {
  reviewRun.value = run;
  postingDate.value = run.pay_date;
  postMutation.reset();
  reviewOpen.value = true;
}

watch(postingDate, async (date) => {
  periodClosedName.value = null;
  if (!date) return;
  const period = await periodsRepository.periodFor(company.activeCompanyId, date);
  if (period && period.status === "closed") periodClosedName.value = period.name;
});

const previewTotals = computed(() => {
  const lines = reviewRun.value?.preview ?? [];
  return {
    debit: lines.reduce((s, l) => s + l.debit, 0),
    credit: lines.reduce((s, l) => s + l.credit, 0),
  };
});
const previewBalanced = computed(() => previewTotals.value.debit === previewTotals.value.credit);
const previewMissingMapping = computed(() =>
  (reviewRun.value?.preview ?? []).some((l) => !l.account_id && (l.debit > 0 || l.credit > 0)),
);

const canPost = computed(
  () =>
    !!reviewRun.value &&
    !!postingDate.value &&
    !periodClosedName.value &&
    !previewMissingMapping.value &&
    previewBalanced.value,
);

const postDialogOpen = ref(false);
const postMutation = useMutation((id: string, date: string) =>
  payrollPostingRepository.post(company.activeCompanyId, id, date),
);

function requestPost() {
  if (!canPost.value) return;
  postMutation.reset();
  postDialogOpen.value = true;
}

async function confirmPost() {
  if (!reviewRun.value) return;
  const result = await postMutation.run(reviewRun.value.id, postingDate.value);
  if (result) {
    postDialogOpen.value = false;
    reviewOpen.value = false;
    reviewRun.value = null;
    await listState.refresh();
  }
}

/* ---------------- Reverse posting ---------------- */

const reverseOpen = ref(false);
const reverseRun = ref<PayrollPosting | null>(null);
const reverseDate = ref("");
const reverseReason = ref("");
const reverseMutation = useMutation((id: string, date: string, reason: string) =>
  payrollPostingRepository.reverse(company.activeCompanyId, id, date, reason),
);

function openReverse(run: PayrollPosting) {
  reverseRun.value = run;
  reverseDate.value = new Date().toISOString().slice(0, 10);
  reverseReason.value = "";
  reverseMutation.reset();
  reverseOpen.value = true;
}

const canReverse = computed(() => !!reverseDate.value && reverseReason.value.trim().length > 0);

async function confirmReverse() {
  if (!reverseRun.value || !canReverse.value) return;
  const result = await reverseMutation.run(reverseRun.value.id, reverseDate.value, reverseReason.value.trim());
  if (result) {
    reverseOpen.value = false;
    reverseRun.value = null;
    await listState.refresh();
  }
}
</script>

<template>
  <AppShell>
    <PageHeader
      title="Payroll Posting"
      description="Post payroll runs to the general ledger and manage reversals."
    />

    <div
      v-if="missingMappings.length > 0"
      class="mb-4 flex items-start gap-2 rounded-md border border-warning-subtle bg-warning-subtle p-3 text-sm text-warning-strong"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0" />
      <p>
        Required account mappings are missing: {{ missingMappings.map((m) => m.label).join(", ") }}.
        <RouterLink to="/accounting/setup" class="underline">Configure account mappings</RouterLink>
        before posting. Mappings come from company accounting configuration, never hard-coded accounts.
      </p>
    </div>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Runs not posted" :value="String(runsNotPosted.length)" tone="warning" />
      <StatCard label="Runs posted" :value="String(runsPosted.length)" tone="success" />
      <StatCard label="Posted salary expense" :value="formatMoney(totalPostedExpense)" />
      <StatCard label="Salary payable outstanding" :value="formatMoney(totalPayableOutstanding)" tone="brand" />
    </div>

    <Panel title="Payroll runs">
      <AsyncSection
        :loading="listState.loading.value"
        :error="listState.error.value"
        :empty="listState.isEmpty.value"
        empty-title="No payroll runs"
        empty-message="Payroll runs will appear here once they exist for this company."
        @retry="listState.refresh"
      >
        <DataTable :columns="columns" :rows="listState.data.value ?? []" :min-width="1300">
          <template #run="{ row }: { row: PayrollPosting }">
            <div class="leading-tight">
              <p class="font-medium text-content">{{ row.run_label }}</p>
              <p class="num text-2xs text-content-muted">{{ row.run_id }}</p>
            </div>
          </template>
          <template #period="{ row }: { row: PayrollPosting }">{{ row.period }}</template>
          <template #pay_date="{ row }: { row: PayrollPosting }">{{ shortDate(row.pay_date) }}</template>
          <template #employees="{ row }: { row: PayrollPosting }">{{ row.employees }}</template>
          <template #gross="{ row }: { row: PayrollPosting }">{{ formatMoney(row.gross) }}</template>
          <template #deductions="{ row }: { row: PayrollPosting }">{{ formatMoneyOrDash(row.deductions) }}</template>
          <template #employer="{ row }: { row: PayrollPosting }">{{ formatMoneyOrDash(row.employer_contributions) }}</template>
          <template #net="{ row }: { row: PayrollPosting }">{{ formatMoney(row.net_pay) }}</template>
          <template #status="{ row }: { row: PayrollPosting }">
            <span class="inline-flex items-center gap-1.5">
              <span
                :class="`zs-badge ${
                  row.accounting_status === 'posted'
                    ? 'badge-success'
                    : row.accounting_status === 'reversed'
                      ? 'badge-neutral'
                      : 'badge-warning'
                }`"
              >
                {{ row.accounting_status === "posted" ? "Posted" : row.accounting_status === "reversed" ? "Reversed" : "Not Posted" }}
              </span>
              <Lock v-if="row.locked" class="size-3.5 text-content-muted" aria-label="Locked against changes" />
            </span>
          </template>
          <template #posting_date="{ row }: { row: PayrollPosting }">{{ row.posting_date ? shortDate(row.posting_date) : "—" }}</template>
          <template #journal="{ row }: { row: PayrollPosting }">
            <RouterLink v-if="row.journal_id" :to="`/accounting/journals/${row.journal_id}`" class="text-content-brand hover:underline">
              {{ row.journal_number ?? "View journal" }}
            </RouterLink>
            <span v-else class="text-content-muted">—</span>
          </template>
          <template #actions="{ row }: { row: PayrollPosting }">
            <ZButton v-if="row.accounting_status === 'not_posted'" variant="outline" @click="openReview(row)">
              Review &amp; post
            </ZButton>
            <ZButton v-else-if="row.accounting_status === 'posted'" variant="outline" @click="openReverse(row)">
              Reverse posting
            </ZButton>
          </template>
          <template #footer><span>{{ (listState.data.value ?? []).length }} runs</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <!-- Review & post -->
    <SidePanel
      :open="reviewOpen"
      title="Review &amp; post payroll run"
      :description="reviewRun ? `${reviewRun.run_label} · ${reviewRun.period}` : undefined"
      width="lg"
      @close="reviewOpen = false"
    >
      <template v-if="reviewRun">
        <div class="field mb-4">
          <label class="label-caps" for="posting-date">Posting date</label>
          <input id="posting-date" v-model="postingDate" type="date" class="field mt-1 w-48" />
          <p v-if="periodClosedName" class="mt-1 text-xs text-danger">
            {{ periodClosedName }} is a closed accounting period. Choose a date in an open period.
          </p>
        </div>

        <p v-if="previewMissingMapping" class="mb-3 flex items-start gap-2 rounded-md border border-warning-subtle bg-warning-subtle p-2 text-xs text-warning-strong">
          <TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
          Some journal lines have no mapped account.
          <RouterLink to="/accounting/setup" class="underline">Fix account mappings</RouterLink>.
        </p>

        <p class="label-caps mb-2">Journal preview</p>
        <table class="w-full text-sm">
          <thead>
            <tr class="table-head">
              <th class="px-3 py-2 text-left">Label</th>
              <th class="px-3 py-2 text-left">Account</th>
              <th class="px-3 py-2 text-right">Debit</th>
              <th class="px-3 py-2 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in reviewRun.preview" :key="index" class="table-row-zs">
              <td class="px-3 py-2 text-content-secondary">{{ line.label }}</td>
              <td class="px-3 py-2 text-content-secondary">
                <span v-if="line.account_id">{{ line.account_code }} · {{ line.account_name }}</span>
                <span v-else class="text-danger">Not mapped</span>
              </td>
              <td class="px-3 py-2 num text-right">{{ formatMoneyOrDash(line.debit) }}</td>
              <td class="px-3 py-2 num text-right">{{ formatMoneyOrDash(line.credit) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-line font-medium text-content">
              <td class="px-3 py-2" colspan="2">Total</td>
              <td class="px-3 py-2 num text-right">{{ formatMoney(previewTotals.debit) }}</td>
              <td class="px-3 py-2 num text-right">{{ formatMoney(previewTotals.credit) }}</td>
            </tr>
          </tfoot>
        </table>
        <p class="mt-2 text-xs" :class="previewBalanced ? 'text-success' : 'text-danger'">
          {{ previewBalanced ? "Balanced — debit equals credit." : "Unbalanced — this journal cannot be posted." }}
        </p>

        <p v-if="postMutation.error.value" class="mt-3 text-xs text-danger">{{ postMutation.error.value.message }}</p>
      </template>

      <template #footer>
        <ZButton variant="outline" @click="reviewOpen = false">Cancel</ZButton>
        <ZButton :disabled="!canPost" @click="requestPost">Post to ledger</ZButton>
      </template>
    </SidePanel>

    <ConfirmDialog
      :open="postDialogOpen"
      title="Post payroll run"
      :message="`Posting locks ${reviewRun?.run_label ?? 'this run'} against further financial modification. Reversal is the only way to reopen it for changes.`"
      confirm-label="Post run"
      :busy="postMutation.saving.value"
      @confirm="confirmPost"
      @cancel="postDialogOpen = false"
    />

    <!-- Reverse posting -->
    <ConfirmDialog
      :open="reverseOpen"
      title="Reverse posting"
      :message="`This creates a reversing journal for ${reverseRun?.run_label ?? 'this run'} and reopens it for financial changes. It does not edit or delete the original entry.`"
      confirm-label="Reverse"
      tone="danger"
      :busy="reverseMutation.saving.value"
      @confirm="confirmReverse"
      @cancel="reverseOpen = false"
    >
      <div class="space-y-3">
        <div class="field">
          <label class="label-caps" for="reverse-date">Reversal date</label>
          <input id="reverse-date" v-model="reverseDate" type="date" class="field mt-1 w-48" />
        </div>
        <div class="field">
          <label class="label-caps" for="reverse-reason">Reason (required)</label>
          <textarea
            id="reverse-reason"
            v-model="reverseReason"
            rows="3"
            class="field mt-1 w-full"
            placeholder="Explain why this posting is being reversed"
          />
        </div>
        <p v-if="reverseMutation.error.value" class="text-xs text-danger">{{ reverseMutation.error.value.message }}</p>
        <p v-if="!canReverse" class="text-xs text-content-muted">A date and reason are required to reverse a posting.</p>
      </div>
    </ConfirmDialog>
  </AppShell>
</template>
