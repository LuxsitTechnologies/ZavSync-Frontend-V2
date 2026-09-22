<script setup lang="ts">
/** A6 — journal detail: view lines, post a draft, or reverse a posted journal. */
import { computed, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

import AppShell from "@/components/zs/AppShell.vue";
import PageHeader from "@/components/zs/PageHeader.vue";
import Panel from "@/components/zs/Panel.vue";
import ZButton from "@/components/zs/ZButton.vue";
import StatusBadge from "@/components/zs/StatusBadge.vue";
import AsyncSection from "@/components/zs/AsyncSection.vue";
import ConfirmDialog from "@/components/zs/ConfirmDialog.vue";
import ValidationMessage from "@/components/zs/ValidationMessage.vue";
import DataTable, { type Column } from "@/components/zs/DataTable.vue";
import AuditMeta from "@/components/accounting/AuditMeta.vue";

import { useAsyncData, useMutation } from "@/composables/useAsyncData";
import { journalsRepository } from "@/services/accounting/journals.repository";
import { useCompanyStore } from "@/stores/company";
import { formatMoney } from "@/lib/money";
import { shortDate, labelize } from "@/lib/format";
import { setPageMeta } from "@/lib/page-meta";
import { REFERENCE_TYPES, type JournalLine, type JournalInput } from "@/types/accounting";

const route = useRoute();
const company = useCompanyStore();
const journalId = computed(() => String(route.params.id ?? ""));

setPageMeta("Journal", "Journal detail — lines, audit trail and posting actions.");

const { data: journal, loading, error, refresh } = useAsyncData(
  () => journalsRepository.get(company.activeCompanyId, journalId.value),
  { watch: [() => company.activeCompanyId, journalId] },
);

function referenceLabel(type: string): string {
  return REFERENCE_TYPES.find((r) => r.value === type)?.label ?? labelize(type);
}

const columns: Column[] = [
  { key: "account", header: "Account" },
  { key: "description", header: "Description" },
  { key: "debit", header: "Debit", align: "right", class: "num" },
  { key: "credit", header: "Credit", align: "right", class: "num" },
];

function toInput(): JournalInput | null {
  if (!journal.value) return null;
  return {
    posting_date: journal.value.posting_date,
    reference: journal.value.reference,
    description: journal.value.description,
    lines: journal.value.lines.map((l) => ({
      id: l.id,
      account_id: l.account_id,
      description: l.description,
      debit: l.debit,
      credit: l.credit,
    })),
  };
}

/* ---- post draft ---- */
const postConfirmOpen = ref(false);
const postMutation = useMutation(journalsRepository.post);

async function confirmPost() {
  const input = toInput();
  if (!input || !journal.value) return;
  const result = await postMutation.run(company.activeCompanyId, input, journal.value.id);
  if (result) {
    postConfirmOpen.value = false;
    await refresh();
  }
}

/* ---- reverse posted ---- */
const reverseConfirmOpen = ref(false);
const reversalDate = ref("2026-09-21");
const reversalReason = ref("");
const reverseMutation = useMutation(journalsRepository.reverse);

async function confirmReverse() {
  if (!journal.value) return;
  const result = await reverseMutation.run(company.activeCompanyId, journal.value.id, reversalDate.value, reversalReason.value);
  if (result) {
    reverseConfirmOpen.value = false;
    await refresh();
  }
}

function openReverse() {
  reversalReason.value = "";
  reverseMutation.reset();
  reverseConfirmOpen.value = true;
}
</script>

<template>
  <AppShell>
    <PageHeader :title="journal ? `Journal ${journal.number}` : 'Journal'" description="Every posting is auditable and, once posted, immutable.">
      <template #actions>
        <RouterLink to="/accounting/journals" class="text-xs font-medium text-content-brand hover:underline">
          Back to journals
        </RouterLink>
      </template>
    </PageHeader>

    <AsyncSection
      :loading="loading"
      :error="error"
      empty-title="Journal not found"
      @retry="refresh"
    >
      <template v-if="journal">
        <Panel title="Header" body-class="p-4">
          <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt class="label-caps">Status</dt>
              <dd class="mt-1"><StatusBadge :status="journal.status" /></dd>
            </div>
            <div>
              <dt class="label-caps">Posting date</dt>
              <dd class="num mt-1 text-content">{{ shortDate(journal.posting_date) }}</dd>
            </div>
            <div>
              <dt class="label-caps">Reference</dt>
              <dd class="mt-1 text-content-secondary">{{ journal.reference || "—" }}</dd>
            </div>
            <div>
              <dt class="label-caps">Reference type</dt>
              <dd class="mt-1"><span class="zs-badge badge-info">{{ referenceLabel(journal.reference_type) }}</span></dd>
            </div>
            <div class="sm:col-span-2 lg:col-span-2">
              <dt class="label-caps">Description</dt>
              <dd class="mt-1 text-content-secondary">{{ journal.description || "—" }}</dd>
            </div>
            <div>
              <dt class="label-caps">Source</dt>
              <dd class="mt-1">
                <RouterLink v-if="journal.source_route" :to="journal.source_route" class="text-content-brand hover:underline">
                  {{ journal.source_label ?? "View source" }}
                </RouterLink>
                <span v-else class="text-content-secondary">{{ journal.source_label ?? "Manual entry" }}</span>
              </dd>
            </div>
          </dl>

          <div class="mt-5">
            <AuditMeta
              :created-by="journal.created_by"
              :created-at="journal.created_at"
              :updated-by="journal.updated_by"
              :updated-at="journal.updated_at"
              :posted-by="journal.posted_by"
              :posted-at="journal.posted_at"
              :source="journal.source_label"
              :reference="journal.reference"
            />
          </div>
        </Panel>

        <Panel title="Lines" class="mt-4">
          <DataTable :columns="columns" :rows="journal.lines" :min-width="720">
            <template #account="{ row }: { row: JournalLine }">{{ row.account_code }} · {{ row.account_name }}</template>
            <template #description="{ row }: { row: JournalLine }">{{ row.description || "—" }}</template>
            <template #debit="{ row }: { row: JournalLine }">{{ formatMoney(row.debit) }}</template>
            <template #credit="{ row }: { row: JournalLine }">{{ formatMoney(row.credit) }}</template>
            <template #footer>
              <span>{{ journal.lines.length }} lines</span>
              <span class="flex items-center gap-3">
                <span class="num">Debit {{ formatMoney(journal.total_debit) }}</span>
                <span class="num">Credit {{ formatMoney(journal.total_credit) }}</span>
                <span :class="journal.total_debit === journal.total_credit ? 'zs-badge badge-success' : 'zs-badge badge-danger'">
                  {{ journal.total_debit === journal.total_credit ? "Balanced" : "Unbalanced" }}
                </span>
              </span>
            </template>
          </DataTable>
        </Panel>

        <Panel title="Actions" class="mt-4" body-class="p-4 space-y-3">
          <template v-if="journal.status === 'draft'">
            <p class="text-xs text-content-secondary">
              This journal is a draft. Posting it is permanent — corrections after posting require a reversing entry.
            </p>
            <ZButton @click="postConfirmOpen = true">Post journal</ZButton>
          </template>
          <template v-else-if="journal.status === 'posted'">
            <p class="text-xs text-content-secondary">
              Posted journals cannot be edited or deleted. To correct this journal, post a reversal instead.
            </p>
            <ZButton variant="outline" @click="openReverse">Reverse journal</ZButton>
          </template>
          <template v-else>
            <p class="text-xs text-content-secondary">
              This journal has been reversed. No further changes are possible.
            </p>
            <div class="flex flex-wrap gap-3 text-xs">
              <RouterLink
                v-if="journal.reverses_journal_id"
                :to="`/accounting/journals/${journal.reverses_journal_id}`"
                class="text-content-brand hover:underline"
              >
                View the journal this reverses
              </RouterLink>
              <RouterLink
                v-if="journal.reversed_by_journal_id"
                :to="`/accounting/journals/${journal.reversed_by_journal_id}`"
                class="text-content-brand hover:underline"
              >
                View the reversing journal
              </RouterLink>
            </div>
          </template>
        </Panel>
      </template>
    </AsyncSection>

    <ConfirmDialog
      :open="postConfirmOpen"
      title="Post this journal?"
      message="Posting is permanent. Posted journals cannot be edited or deleted — corrections require a reversing journal."
      confirm-label="Post journal"
      :busy="postMutation.saving.value"
      @confirm="confirmPost"
      @cancel="postConfirmOpen = false"
    >
      <ValidationMessage :message="postMutation.error.value?.message ?? null" />
    </ConfirmDialog>

    <ConfirmDialog
      :open="reverseConfirmOpen"
      title="Reverse this journal?"
      message="This posts a new, opposite journal against the same accounts. The original stays on record and cannot be deleted."
      confirm-label="Reverse journal"
      tone="danger"
      :busy="reverseMutation.saving.value"
      @confirm="confirmReverse"
      @cancel="reverseConfirmOpen = false"
    >
      <div class="space-y-3">
        <label class="block">
          <span class="label-caps">Reversal date</span>
          <input v-model="reversalDate" type="date" class="field mt-1.5" />
        </label>
        <label class="block">
          <span class="label-caps">Reason</span>
          <textarea v-model="reversalReason" rows="2" class="field mt-1.5" placeholder="Required — explain why this journal is being reversed" />
        </label>
        <ValidationMessage :message="reverseMutation.error.value?.message ?? null" />
      </div>
    </ConfirmDialog>
  </AppShell>
</template>
