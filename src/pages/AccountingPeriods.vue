<script setup lang="ts">
/** A2 — accounting period management and locking. */
import { computed, ref } from "vue";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import StatCard from "@/components/zs/StatCard.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import ZButton from "@/components/zs/ZButton.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";

import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { periodsRepository } from "@/services/accounting/periods.repository";
import { useCompanyStore } from "@/stores/company";
import { shortDate } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import type { AccountingPeriod } from "@/types/accounting";
import type { PeriodReadiness } from "@/types/planning";

setPageMeta("Accounting Periods", "Open and close accounting periods to lock postings against them.");

const company = useCompanyStore();

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => periodsRepository.list(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const periods = computed<AccountingPeriod[]>(() => data.value ?? []);
const history = useAsyncData(() => periodsRepository.history(company.activeCompanyId), { watch: [() => company.activeCompanyId] });
const openCount = computed(() => periods.value.filter((p) => p.status === "open").length);
const closedCount = computed(() => periods.value.filter((p) => p.status === "closed").length);
const currentPeriod = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return periods.value.find((p) => today >= p.start_date && today <= p.end_date) ?? null;
});

const columns: Column[] = [
  { key: "name", header: "Period" },
  { key: "start_date", header: "Start", class: "num" },
  { key: "end_date", header: "End", class: "num" },
  { key: "status", header: "Status" },
  { key: "closed_by", header: "Closed by" },
  { key: "closed_at", header: "Closed at", class: "num" },
  { key: "actions", header: "" },
];

const target = ref<AccountingPeriod | null>(null);
const nextStatus = ref<"open" | "closed">("closed");
const readiness = ref<PeriodReadiness | null>(null);
const reopenReason = ref("");
const readinessMutation = useMutation(periodsRepository.readiness);
const closeMutation = useMutation(periodsRepository.close);
const reopenMutation = useMutation(periodsRepository.reopen);

async function requestChange(period: AccountingPeriod, status: "open" | "closed") {
  nextStatus.value = status;
  readiness.value = null;
  closeMutation.reset();
  reopenMutation.reset();
  if (status === "closed") {
    const result = await readinessMutation.run(company.activeCompanyId, period.id);
    readiness.value = result;
    if (!result?.ready) return;
  }
  target.value = period;
}

async function confirm() {
  if (!target.value) return;
  const result = nextStatus.value === "closed"
    ? await closeMutation.run(company.activeCompanyId, target.value.id)
    : await reopenMutation.run(company.activeCompanyId, target.value.id, reopenReason.value);
  if (result) {
    target.value = null;
    reopenReason.value = "";
    await refresh();
    await history.refresh();
  }
}
</script>

<template>
  <AppShell>
    <PageHeader
      title="Accounting Periods"
      description="Close periods to prevent postings and edits landing in finalised books."
    />

    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <StatCard label="Open periods" :value="String(openCount)" tone="success" />
      <StatCard label="Closed periods" :value="String(closedCount)" tone="warning" />
      <StatCard label="Current period" :value="currentPeriod?.name ?? '—'" tone="brand" />
    </div>

    <Panel>
      <div v-if="readiness && !readiness.ready" class="border-b border-line bg-danger/5 p-4">
        <p class="text-sm font-semibold text-danger">Period close is blocked</p>
        <ul class="mt-2 grid gap-2 text-xs text-content-secondary">
          <li v-for="check in readiness.checks.filter(x=>!x.passed)" :key="check.key"><strong>{{check.label}}:</strong> {{check.message}}</li>
        </ul>
      </div>
      <AsyncSection
        :loading="loading"
        :error="error"
        :empty="isEmpty"
        empty-title="No periods yet"
        empty-message="Accounting periods will appear here once configured for this company."
        @retry="refresh"
      >
        <DataTable :columns="columns" :rows="periods" :min-width="900">
          <template #name="{ row }: { row: AccountingPeriod }">
            <span class="font-medium text-content">{{ row.name }}</span>
          </template>
          <template #start_date="{ row }: { row: AccountingPeriod }">{{ shortDate(row.start_date) }}</template>
          <template #end_date="{ row }: { row: AccountingPeriod }">{{ shortDate(row.end_date) }}</template>
          <template #status="{ row }: { row: AccountingPeriod }">
            <span :class="row.status === 'open' ? 'zs-badge badge-success' : 'zs-badge badge-neutral'">
              {{ row.status === "open" ? "Open" : "Closed" }}
            </span>
          </template>
          <template #closed_by="{ row }: { row: AccountingPeriod }">{{ row.closed_by ?? "—" }}</template>
          <template #closed_at="{ row }: { row: AccountingPeriod }">
            {{ row.closed_at ? shortDate(row.closed_at) : "—" }}
          </template>
          <template #actions="{ row }: { row: AccountingPeriod }">
            <span class="flex justify-end">
              <ZButton
                v-if="row.status === 'open'"
                variant="ghost"
                @click="requestChange(row, 'closed')"
              >
                Close period
              </ZButton>
              <ZButton v-else variant="ghost" @click="requestChange(row, 'open')">Reopen period</ZButton>
            </span>
          </template>
          <template #footer><span>{{ periods.length }} periods</span></template>
        </DataTable>
      </AsyncSection>
    </Panel>

    <Panel class="mt-4" title="Close history" description="Original close and reopen activity is retained for audit.">
      <div v-if="history.data.value?.length" class="divide-y divide-line">
        <div v-for="record in history.data.value" :key="record.id" class="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"><span>{{ record.close_type === 'period' ? 'Period close' : 'Fiscal-year close' }} · {{ record.status }}</span><span class="text-content-secondary">{{ record.reopened_at ? `Reopened ${shortDate(record.reopened_at)}` : record.closed_at ? `Closed ${shortDate(record.closed_at)}` : '—' }}</span></div>
      </div>
      <p v-else class="p-5 text-sm text-content-muted">No close history yet.</p>
    </Panel>

    <ConfirmDialog
      :open="Boolean(target)"
      :title="nextStatus === 'closed' ? 'Close period' : 'Reopen period'"
      :message="
        nextStatus === 'closed'
          ? `Closing ${target?.name} will reject any new postings or modifications dated within it. Journals must be reversed, not edited, once closed.`
          : `Reopening ${target?.name} allows new postings and modifications dated within it again.`
      "
      :confirm-label="nextStatus === 'closed' ? 'Close period' : 'Reopen period'"
      :tone="nextStatus === 'closed' ? 'danger' : 'brand'"
      :busy="closeMutation.saving.value || reopenMutation.saving.value"
      @confirm="confirm"
      @cancel="target = null"
    >
      <div v-if="nextStatus==='open'" class="grid gap-2"><label class="text-xs font-medium text-content">Reopen reason</label><textarea v-model="reopenReason" class="field min-h-20" placeholder="Explain the approved correction" /></div>
      <ValidationMessage :message="closeMutation.error.value?.message ?? reopenMutation.error.value?.message ?? null" />
    </ConfirmDialog>
  </AppShell>
</template>
