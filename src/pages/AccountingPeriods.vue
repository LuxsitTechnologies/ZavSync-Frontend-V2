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

setPageMeta("Accounting Periods", "Open and close accounting periods to lock postings against them.");

const company = useCompanyStore();

const { data, loading, error, isEmpty, refresh } = useAsyncData(
  () => periodsRepository.list(company.activeCompanyId),
  { watch: [() => company.activeCompanyId] },
);

const periods = computed<AccountingPeriod[]>(() => data.value ?? []);
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
const mutation = useMutation(periodsRepository.setStatus);

function requestChange(period: AccountingPeriod, status: "open" | "closed") {
  target.value = period;
  nextStatus.value = status;
  mutation.reset();
}

async function confirm() {
  if (!target.value) return;
  const result = await mutation.run(company.activeCompanyId, target.value.id, nextStatus.value);
  if (result) {
    target.value = null;
    await refresh();
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
      :busy="mutation.saving.value"
      @confirm="confirm"
      @cancel="target = null"
    >
      <ValidationMessage :message="mutation.error.value?.message ?? null" />
    </ConfirmDialog>
  </AppShell>
</template>
